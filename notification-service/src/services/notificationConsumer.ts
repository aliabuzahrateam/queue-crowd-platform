import { rabbitMQService } from '../config/rabbitmq';
import { notificationProcessor } from './notificationProcessor';
import logger from '../config/winston';

export class NotificationConsumer {
  async startConsumers(): Promise<void> {
    try {
      // Start email consumer
      await rabbitMQService.startEmailConsumer(async (data) => {
        try {
          await this.processEmailNotification(data);
        } catch (error) {
          logger.error('Failed to process email notification from queue', {
            error: error instanceof Error ? error.message : String(error),
            data
          });
        }
      });

      // Start SMS consumer
      await rabbitMQService.startSMSConsumer(async (data) => {
        try {
          await this.processSMSNotification(data);
        } catch (error) {
          logger.error('Failed to process SMS notification from queue', {
            error: error instanceof Error ? error.message : String(error),
            data
          });
        }
      });

      // Start push consumer
      await rabbitMQService.startPushConsumer(async (data) => {
        try {
          await this.processPushNotification(data);
        } catch (error) {
          logger.error('Failed to process push notification from queue', {
            error: error instanceof Error ? error.message : String(error),
            data
          });
        }
      });

      // Start event consumer
      await rabbitMQService.startEventConsumer(async (data) => {
        try {
          await this.processNotificationEvent(data);
        } catch (error) {
          logger.error('Failed to process notification event from queue', {
            error: error instanceof Error ? error.message : String(error),
            data
          });
        }
      });

      logger.info('All notification consumers started successfully');
    } catch (error) {
      logger.error('Failed to start notification consumers', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async processEmailNotification(data: any): Promise<void> {
    const { to, subject, template, templateData } = data;

    // Process based on template type
    switch (template) {
      case 'queue_update':
        await this.processQueueUpdateEmail(to, templateData);
        break;
      case 'crowd_alert':
        await this.processCrowdAlertEmail(to, templateData);
        break;
      case 'feedback_response':
        await this.processFeedbackResponseEmail(to, templateData);
        break;
      case 'system_alert':
        await this.processSystemAlertEmail(to, templateData);
        break;
      default:
        await this.processGenericEmail(to, subject, templateData);
    }
  }

  private async processSMSNotification(data: any): Promise<void> {
    const { to, message, template, templateData } = data;

    // Process based on template type
    switch (template) {
      case 'queue_update':
        await this.processQueueUpdateSMS(to, templateData);
        break;
      case 'crowd_alert':
        await this.processCrowdAlertSMS(to, templateData);
        break;
      case 'system_alert':
        await this.processSystemAlertSMS(to, templateData);
        break;
      case 'reminder':
        await this.processReminderSMS(to, templateData);
        break;
      default:
        await this.processGenericSMS(to, message);
    }
  }

  private async processPushNotification(data: any): Promise<void> {
    const { tokens, title, body, data: pushData } = data;

    // Process push notification
    await this.processGenericPush(tokens, title, body, pushData);
  }

  private async processNotificationEvent(data: any): Promise<void> {
    const { type, userId, notificationId, eventData } = data;

    // Process based on event type
    switch (type) {
      case 'queue_update':
        await this.processQueueUpdateEvent(userId, eventData);
        break;
      case 'crowd_alert':
        await this.processCrowdAlertEvent(userId, eventData);
        break;
      case 'feedback_submitted':
        await this.processFeedbackSubmittedEvent(userId, eventData);
        break;
      case 'system_maintenance':
        await this.processSystemMaintenanceEvent(userId, eventData);
        break;
      default:
        logger.info('Unknown notification event type', { type, userId, notificationId });
    }
  }

  // Email template processors
  private async processQueueUpdateEmail(to: string, data: any): Promise<void> {
    const { emailService } = await import('../config/email');
    await emailService.sendQueueUpdateEmail(to, data);
  }

  private async processCrowdAlertEmail(to: string, data: any): Promise<void> {
    const { emailService } = await import('../config/email');
    await emailService.sendCrowdAlertEmail(to, data);
  }

  private async processFeedbackResponseEmail(to: string, data: any): Promise<void> {
    const { emailService } = await import('../config/email');
    await emailService.sendFeedbackResponseEmail(to, data);
  }

  private async processSystemAlertEmail(to: string, data: any): Promise<void> {
    const { emailService } = await import('../config/email');
    await emailService.sendSystemAlertEmail(to, data);
  }

  private async processGenericEmail(to: string, subject: string, data: any): Promise<void> {
    const { emailService } = await import('../config/email');
    await emailService.sendEmail(to, {
      subject,
      html: `<div>${data.message || subject}</div>`,
      text: data.message || subject
    });
  }

  // SMS template processors
  private async processQueueUpdateSMS(to: string, data: any): Promise<void> {
    const { smsService } = await import('../config/sms');
    await smsService.sendQueueUpdateSMS(to, data);
  }

  private async processCrowdAlertSMS(to: string, data: any): Promise<void> {
    const { smsService } = await import('../config/sms');
    await smsService.sendCrowdAlertSMS(to, data);
  }

  private async processSystemAlertSMS(to: string, data: any): Promise<void> {
    const { smsService } = await import('../config/sms');
    await smsService.sendSystemAlertSMS(to, data);
  }

  private async processReminderSMS(to: string, data: any): Promise<void> {
    const { smsService } = await import('../config/sms');
    await smsService.sendReminderSMS(to, data);
  }

  private async processGenericSMS(to: string, message: string): Promise<void> {
    const { smsService } = await import('../config/sms');
    await smsService.sendSMS(to, message);
  }

  // Push notification processors
  private async processGenericPush(tokens: string[], title: string, body: string, data: any): Promise<void> {
    const { pushNotificationService } = await import('../config/push');
    await pushNotificationService.sendToMultipleTokens(tokens, {
      title,
      body,
      data
    });
  }

  // Event processors
  private async processQueueUpdateEvent(userId: string, data: any): Promise<void> {
    // Determine notification channels based on user preferences and event priority
    const channels = await this.determineNotificationChannels(userId, data.priority);
    
    if (channels.email) {
      await rabbitMQService.publishEmailNotification({
        to: data.userEmail,
        subject: `Queue Update - Ticket ${data.ticketNumber}`,
        template: 'queue_update',
        templateData: data
      });
    }

    if (channels.sms) {
      await rabbitMQService.publishSMSNotification({
        to: data.userPhone,
        message: `Queue Update: ${data.status} | Wait: ${data.estimatedWait} min`,
        template: 'queue_update',
        templateData: data
      });
    }

    if (channels.push) {
      await rabbitMQService.publishPushNotification({
        tokens: data.pushTokens,
        title: `Queue Update - Ticket ${data.ticketNumber}`,
        body: `Status: ${data.status} | Wait: ${data.estimatedWait} min`,
        data: { type: 'queue_update', ticketNumber: data.ticketNumber }
      });
    }
  }

  private async processCrowdAlertEvent(userId: string, data: any): Promise<void> {
    const channels = await this.determineNotificationChannels(userId, 'high');
    
    if (channels.email) {
      await rabbitMQService.publishEmailNotification({
        to: data.userEmail,
        subject: `Crowd Alert - ${data.branchName}`,
        template: 'crowd_alert',
        templateData: data
      });
    }

    if (channels.sms) {
      await rabbitMQService.publishSMSNotification({
        to: data.userPhone,
        message: `Crowd Alert: ${data.alertType} at ${data.branchName}`,
        template: 'crowd_alert',
        templateData: data
      });
    }

    if (channels.push) {
      await rabbitMQService.publishPushNotification({
        tokens: data.pushTokens,
        title: `Crowd Alert - ${data.branchName}`,
        body: `${data.alertType}: ${data.currentCapacity}/${data.maxCapacity}`,
        data: { type: 'crowd_alert', branchName: data.branchName }
      });
    }
  }

  private async processFeedbackSubmittedEvent(userId: string, data: any): Promise<void> {
    // Notify staff about new feedback
    const channels = await this.determineNotificationChannels(userId, 'medium');
    
    if (channels.email) {
      await rabbitMQService.publishEmailNotification({
        to: data.staffEmail,
        subject: `New Feedback - ${data.branchName}`,
        template: 'feedback_notification',
        templateData: data
      });
    }
  }

  private async processSystemMaintenanceEvent(userId: string, data: any): Promise<void> {
    const channels = await this.determineNotificationChannels(userId, 'urgent');
    
    if (channels.email) {
      await rabbitMQService.publishEmailNotification({
        to: data.userEmail,
        subject: `System Maintenance - ${data.title}`,
        template: 'system_alert',
        templateData: data
      });
    }

    if (channels.sms) {
      await rabbitMQService.publishSMSNotification({
        to: data.userPhone,
        message: `System Alert: ${data.message}`,
        template: 'system_alert',
        templateData: data
      });
    }

    if (channels.push) {
      await rabbitMQService.publishPushNotification({
        tokens: data.pushTokens,
        title: `System Alert - ${data.title}`,
        body: data.message,
        data: { type: 'system_alert', priority: data.priority }
      });
    }
  }

  private async determineNotificationChannels(userId: string, priority: string): Promise<{
    email: boolean;
    sms: boolean;
    push: boolean;
  }> {
    const { redisService } = await import('../config/redis');
    const preferences = await redisService.getNotificationPreferences(userId);
    
    if (!preferences) {
      return { email: true, sms: true, push: true };
    }

    // For urgent notifications, override quiet hours
    if (priority === 'urgent') {
      return {
        email: preferences.email,
        sms: preferences.sms,
        push: preferences.push
      };
    }

    // Check quiet hours for non-urgent notifications
    if (preferences.quietHours?.enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startHour, startMinute] = preferences.quietHours.start.split(':').map(Number);
      const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
      
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      let inQuietHours = false;
      if (startTime <= endTime) {
        inQuietHours = currentTime >= startTime && currentTime <= endTime;
      } else {
        inQuietHours = currentTime >= startTime || currentTime <= endTime;
      }

      if (inQuietHours) {
        return { email: false, sms: false, push: false };
      }
    }

    return {
      email: preferences.email,
      sms: preferences.sms,
      push: preferences.push
    };
  }
}

export const notificationConsumer = new NotificationConsumer(); 