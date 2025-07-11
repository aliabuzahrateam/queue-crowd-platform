import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NotificationData {
  recipient_id: string;
  recipient_type: 'user' | 'staff' | 'branch';
  notification_type: 'queue_update' | 'crowd_alert' | 'feedback_response' | 'system_alert' | 'reminder';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduled_for?: Date;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  queue_updates: boolean;
  crowd_alerts: boolean;
  feedback_responses: boolean;
  system_alerts: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export class NotificationService {
  static async sendNotification(data: NotificationData) {
    try {
      // Validate required fields
      if (!data.recipient_id || !data.recipient_type || !data.notification_type || !data.title || !data.message) {
        throw new Error('Recipient ID, recipient type, notification type, title, and message are required');
      }

      // Validate recipient type
      if (!['user', 'staff', 'branch'].includes(data.recipient_type)) {
        throw new Error('Recipient type must be user, staff, or branch');
      }

      // Validate notification type
      if (!['queue_update', 'crowd_alert', 'feedback_response', 'system_alert', 'reminder'].includes(data.notification_type)) {
        throw new Error('Invalid notification type');
      }

      // Validate priority
      if (data.priority && !['low', 'normal', 'high', 'urgent'].includes(data.priority)) {
        throw new Error('Priority must be low, normal, high, or urgent');
      }

      // Check notification preferences
      const preferences = await this.getNotificationPreferences(data.recipient_id, data.recipient_type);
      
      if (preferences && !this.shouldSendNotification(preferences, data.notification_type)) {
        return { success: false, error: 'Notification blocked by preferences' };
      }

      // Check quiet hours
      if (preferences && this.isInQuietHours(preferences)) {
        return { success: false, error: 'Notification blocked by quiet hours' };
      }

      // Create notification
      const notification = await prisma.notification.create({
        data: {
          recipient_id: data.recipient_id,
          recipient_type: data.recipient_type,
          notification_type: data.notification_type,
          title: data.title,
          message: data.message,
          data: data.data || {},
          priority: data.priority || 'normal',
          scheduled_for: data.scheduled_for
        }
      });

      // Send through different channels based on preferences
      if (preferences) {
        await this.deliverNotification(notification, preferences);
      }

      return { success: true, data: notification };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send notification' };
    }
  }

  static async getNotificationsByRecipient(recipientId: string, recipientType: string, options?: {
    status?: string;
    notificationType?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = { 
        recipient_id: recipientId, 
        recipient_type: recipientType 
      };

      if (options?.status) {
        where.status = options.status;
      }

      if (options?.notificationType) {
        where.notification_type = options.notificationType;
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0
      });

      return { success: true, data: notifications };
    } catch (error) {
      return { success: false, error: 'Failed to fetch notifications' };
    }
  }

  static async markNotificationAsRead(notificationId: string) {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'read',
          read_at: new Date()
        }
      });

      return { success: true, data: updatedNotification };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to mark notification as read' };
    }
  }

  static async markAllNotificationsAsRead(recipientId: string, recipientType: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          recipient_id: recipientId,
          recipient_type: recipientType,
          status: 'unread'
        },
        data: {
          status: 'read',
          read_at: new Date()
        }
      });

      return { success: true, data: { updated_count: result.count } };
    } catch (error) {
      return { success: false, error: 'Failed to mark notifications as read' };
    }
  }

  static async deleteNotification(notificationId: string) {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      await prisma.notification.delete({
        where: { id: notificationId }
      });

      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete notification' };
    }
  }

  static async getNotificationPreferences(recipientId: string, recipientType: string) {
    try {
      const preferences = await prisma.notificationPreference.findFirst({
        where: {
          recipient_id: recipientId,
          recipient_type: recipientType
        }
      });

      return preferences;
    } catch (error) {
      return null;
    }
  }

  static async updateNotificationPreferences(
    recipientId: string, 
    recipientType: string, 
    preferences: Partial<NotificationPreferences>
  ) {
    try {
      const updatedPreferences = await prisma.notificationPreference.upsert({
        where: {
          recipient_id_recipient_type: {
            recipient_id: recipientId,
            recipient_type: recipientType
          }
        },
        update: preferences,
        create: {
          recipient_id: recipientId,
          recipient_type: recipientType,
          email_enabled: preferences.email_enabled ?? true,
          sms_enabled: preferences.sms_enabled ?? false,
          push_enabled: preferences.push_enabled ?? true,
          queue_updates: preferences.queue_updates ?? true,
          crowd_alerts: preferences.crowd_alerts ?? true,
          feedback_responses: preferences.feedback_responses ?? true,
          system_alerts: preferences.system_alerts ?? true,
          quiet_hours_start: preferences.quiet_hours_start,
          quiet_hours_end: preferences.quiet_hours_end
        }
      });

      return { success: true, data: updatedPreferences };
    } catch (error) {
      return { success: false, error: 'Failed to update notification preferences' };
    }
  }

  static async getNotificationStats(recipientId: string, recipientType: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const notifications = await prisma.notification.findMany({
        where: {
          recipient_id: recipientId,
          recipient_type: recipientType,
          created_at: {
            gte: startDate
          }
        }
      });

      const stats = {
        total_notifications: notifications.length,
        unread_count: notifications.filter(n => n.status === 'unread').length,
        read_count: notifications.filter(n => n.status === 'read').length,
        by_type: notifications.reduce((acc, n) => {
          acc[n.notification_type] = (acc[n.notification_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        by_priority: notifications.reduce((acc, n) => {
          acc[n.priority] = (acc[n.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        daily_trends: notifications.reduce((acc, n) => {
          const date = n.created_at.toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: 'Failed to fetch notification stats' };
    }
  }

  static async sendBulkNotification(recipientIds: string[], data: Omit<NotificationData, 'recipient_id'>) {
    try {
      if (!recipientIds || recipientIds.length === 0) {
        throw new Error('Recipient IDs array is required and must not be empty');
      }

      const notifications = await Promise.all(
        recipientIds.map(recipientId =>
          this.sendNotification({
            ...data,
            recipient_id: recipientId
          })
        )
      );

      const successful = notifications.filter(n => n.success);
      const failed = notifications.filter(n => !n.success);

      return { 
        success: true, 
        data: { 
          total_sent: successful.length,
          total_failed: failed.length,
          successful,
          failed
        } 
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send bulk notifications' };
    }
  }

  private static shouldSendNotification(preferences: any, notificationType: string): boolean {
    switch (notificationType) {
      case 'queue_update':
        return preferences.queue_updates;
      case 'crowd_alert':
        return preferences.crowd_alerts;
      case 'feedback_response':
        return preferences.feedback_responses;
      case 'system_alert':
        return preferences.system_alerts;
      default:
        return true;
    }
  }

  private static isInQuietHours(preferences: any): boolean {
    if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const startTime = this.parseTimeString(preferences.quiet_hours_start);
    const endTime = this.parseTimeString(preferences.quiet_hours_end);

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private static parseTimeString(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private static async deliverNotification(notification: any, preferences: any) {
    // This is a placeholder for actual delivery logic
    // In a real implementation, you would integrate with email, SMS, and push notification services
    
    const deliveryPromises = [];

    if (preferences.email_enabled) {
      deliveryPromises.push(this.sendEmailNotification(notification));
    }

    if (preferences.sms_enabled) {
      deliveryPromises.push(this.sendSMSNotification(notification));
    }

    if (preferences.push_enabled) {
      deliveryPromises.push(this.sendPushNotification(notification));
    }

    await Promise.allSettled(deliveryPromises);
  }

  private static async sendEmailNotification(notification: any) {
    // Placeholder for email delivery
    console.log(`Sending email notification: ${notification.title}`);
  }

  private static async sendSMSNotification(notification: any) {
    // Placeholder for SMS delivery
    console.log(`Sending SMS notification: ${notification.title}`);
  }

  private static async sendPushNotification(notification: any) {
    // Placeholder for push notification delivery
    console.log(`Sending push notification: ${notification.title}`);
  }

  static async processScheduledNotifications() {
    try {
      const now = new Date();
      
      const scheduledNotifications = await prisma.notification.findMany({
        where: {
          scheduled_for: {
            lte: now
          },
          status: 'pending'
        }
      });

      const results = await Promise.allSettled(
        scheduledNotifications.map(async (notification) => {
          // Update status to sent
          await prisma.notification.update({
            where: { id: notification.id },
            data: { status: 'sent' }
          });

          // Deliver the notification
          const preferences = await this.getNotificationPreferences(
            notification.recipient_id, 
            notification.recipient_type
          );

          if (preferences) {
            await this.deliverNotification(notification, preferences);
          }
        })
      );

      return { 
        success: true, 
        data: { 
          processed: scheduledNotifications.length,
          results 
        } 
      };
    } catch (error) {
      return { success: false, error: 'Failed to process scheduled notifications' };
    }
  }
} 