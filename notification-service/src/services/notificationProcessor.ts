import { emailService } from '../config/email';
import { smsService } from '../config/sms';
import { pushNotificationService } from '../config/push';
import { redisService } from '../config/redis';
import { rabbitMQService } from '../config/rabbitmq';
import logger, { logNotification } from '../config/winston';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NotificationRequest {
  userId: string;
  type: 'email' | 'sms' | 'push' | 'all';
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export class NotificationProcessor {
  async processNotification(request: NotificationRequest): Promise<{
    success: boolean;
    notificationId?: string;
    errors?: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(request.userId);
      
      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        logger.info('Notification skipped due to quiet hours', {
          userId: request.userId,
          type: request.type
        });
        return { success: true, notificationId: undefined };
      }

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          userId: request.userId,
          type: request.type,
          title: request.title,
          message: request.message,
          data: request.data,
          priority: request.priority || 'medium',
          scheduledAt: request.scheduledAt,
          expiresAt: request.expiresAt,
          status: 'pending'
        }
      });

      // Process based on type
      const results = await Promise.allSettled([
        this.processEmailNotification(notification, preferences),
        this.processSMSNotification(notification, preferences),
        this.processPushNotification(notification, preferences)
      ]);

      // Check results
      const emailResult = results[0];
      const smsResult = results[1];
      const pushResult = results[2];

      if (emailResult.status === 'rejected') {
        errors.push(`Email failed: ${emailResult.reason}`);
      }
      if (smsResult.status === 'rejected') {
        errors.push(`SMS failed: ${smsResult.reason}`);
      }
      if (pushResult.status === 'rejected') {
        errors.push(`Push failed: ${pushResult.reason}`);
      }

      // Update notification status
      const success = errors.length === 0;
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: success ? 'delivered' : 'failed',
          deliveredAt: success ? new Date() : null,
          errorMessage: errors.length > 0 ? errors.join('; ') : null
        }
      });

      // Log performance
      const duration = Date.now() - startTime;
      logNotification.performance({
        operation: 'process_notification',
        duration,
        success
      });

      // Publish event
      await rabbitMQService.publishNotificationEvent({
        type: success ? 'notification_delivered' : 'notification_failed',
        userId: request.userId,
        notificationId: notification.id,
        data: { errors, duration }
      });

      return {
        success,
        notificationId: notification.id,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      logger.error('Failed to process notification', {
        userId: request.userId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  private async processEmailNotification(notification: any, preferences: NotificationPreferences): Promise<void> {
    if (!preferences.email) return;

    try {
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true }
      });

      if (!user?.email) {
        throw new Error('User email not found');
      }

      const success = await emailService.sendEmail(user.email, {
        subject: notification.title,
        html: this.generateEmailHTML(notification),
        text: notification.message
      });

      if (success) {
        logNotification.emailSent({
          userId: notification.userId,
          notificationId: notification.id,
          to: user.email,
          subject: notification.title
        });
      } else {
        throw new Error('Email service returned false');
      }
    } catch (error) {
      logNotification.emailFailed({
        userId: notification.userId,
        notificationId: notification.id,
        to: 'unknown',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async processSMSNotification(notification: any, preferences: NotificationPreferences): Promise<void> {
    if (!preferences.sms) return;

    try {
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { phone: true }
      });

      if (!user?.phone) {
        throw new Error('User phone not found');
      }

      const success = await smsService.sendSMS(user.phone, notification.message);

      if (success) {
        logNotification.smsSent({
          userId: notification.userId,
          notificationId: notification.id,
          to: user.phone,
          message: notification.message
        });
      } else {
        throw new Error('SMS service returned false');
      }
    } catch (error) {
      logNotification.smsFailed({
        userId: notification.userId,
        notificationId: notification.id,
        to: 'unknown',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async processPushNotification(notification: any, preferences: NotificationPreferences): Promise<void> {
    if (!preferences.push) return;

    try {
      const tokens = await redisService.getUserTokens(notification.userId);
      
      if (tokens.length === 0) {
        throw new Error('No push tokens found for user');
      }

      const result = await pushNotificationService.sendToMultipleTokens(tokens, {
        title: notification.title,
        body: notification.message,
        data: notification.data
      });

      if (result.successCount > 0) {
        logNotification.pushSent({
          userId: notification.userId,
          notificationId: notification.id,
          tokens,
          title: notification.title
        });
      } else {
        throw new Error('All push notifications failed');
      }
    } catch (error) {
      logNotification.pushFailed({
        userId: notification.userId,
        notificationId: notification.id,
        tokens: [],
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // Try to get from cache first
    const cached = await redisService.getNotificationPreferences(userId);
    if (cached) {
      return cached;
    }

    // Get from database
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    const defaultPreferences: NotificationPreferences = {
      email: true,
      sms: true,
      push: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };

    const userPreferences: NotificationPreferences = {
      email: preferences?.email ?? defaultPreferences.email,
      sms: preferences?.sms ?? defaultPreferences.sms,
      push: preferences?.push ?? defaultPreferences.push,
      quietHours: {
        enabled: preferences?.quietHoursEnabled ?? defaultPreferences.quietHours.enabled,
        start: preferences?.quietHoursStart ?? defaultPreferences.quietHours.start,
        end: preferences?.quietHoursEnd ?? defaultPreferences.quietHours.end
      }
    };

    // Cache preferences
    await redisService.cacheNotificationPreferences(userId, userPreferences);

    return userPreferences;
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Handles overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private generateEmailHTML(notification: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${notification.title}</h2>
        <p>${notification.message}</p>
        ${notification.data ? `<div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <pre style="margin: 0;">${JSON.stringify(notification.data, null, 2)}</pre>
        </div>` : ''}
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated notification from Queue Crowd Platform.
        </p>
      </div>
    `;
  }

  async processScheduledNotifications(): Promise<void> {
    try {
      const scheduledNotifications = await prisma.notification.findMany({
        where: {
          status: 'pending',
          scheduledAt: {
            lte: new Date()
          },
          expiresAt: {
            gte: new Date()
          }
        }
      });

      for (const notification of scheduledNotifications) {
        await this.processNotification({
          userId: notification.userId,
          type: notification.type as any,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority as any
        });
      }
    } catch (error) {
      logger.error('Failed to process scheduled notifications', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async cleanupExpiredNotifications(): Promise<void> {
    try {
      await prisma.notification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
    } catch (error) {
      logger.error('Failed to cleanup expired notifications', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export const notificationProcessor = new NotificationProcessor(); 