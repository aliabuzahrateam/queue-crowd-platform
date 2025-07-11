import * as admin from 'firebase-admin';

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  clickAction?: string;
}

export interface DeviceToken {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: Date;
}

export class PushNotificationService {
  private app: admin.app.App;

  constructor() {
    if (!admin.apps.length) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        }),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    } else {
      this.app = admin.app();
    }
  }

  async sendPushNotification(token: string, data: PushNotificationData): Promise<boolean> {
    try {
      const message = {
        token,
        notification: {
          title: data.title,
          body: data.body,
          imageUrl: data.imageUrl
        },
        data: data.data || {},
        android: {
          notification: {
            clickAction: data.clickAction || 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              badge: 1
            }
          }
        }
      };

      await this.app.messaging().send(message);
      return true;
    } catch (error) {
      console.error('Push notification sending failed:', error);
      return false;
    }
  }

  async sendQueueUpdatePush(token: string, data: {
    ticketNumber: string;
    status: string;
    estimatedWait: number;
    branchName: string;
  }): Promise<boolean> {
    const pushData: PushNotificationData = {
      title: `Queue Update - Ticket ${data.ticketNumber}`,
      body: `Status: ${data.status} | Wait: ${data.estimatedWait} min | ${data.branchName}`,
      data: {
        type: 'queue_update',
        ticketNumber: data.ticketNumber,
        status: data.status,
        branchName: data.branchName
      },
      clickAction: 'QUEUE_UPDATE'
    };

    return this.sendPushNotification(token, pushData);
  }

  async sendCrowdAlertPush(token: string, data: {
    branchName: string;
    currentCapacity: number;
    maxCapacity: number;
    alertType: string;
  }): Promise<boolean> {
    const pushData: PushNotificationData = {
      title: `Crowd Alert - ${data.branchName}`,
      body: `${data.alertType}: ${data.currentCapacity}/${data.maxCapacity} (${Math.round((data.currentCapacity / data.maxCapacity) * 100)}%)`,
      data: {
        type: 'crowd_alert',
        branchName: data.branchName,
        alertType: data.alertType,
        utilization: Math.round((data.currentCapacity / data.maxCapacity) * 100).toString()
      },
      clickAction: 'CROWD_ALERT'
    };

    return this.sendPushNotification(token, pushData);
  }

  async sendFeedbackResponsePush(token: string, data: {
    feedbackId: string;
    response: string;
    branchName: string;
  }): Promise<boolean> {
    const pushData: PushNotificationData = {
      title: `Feedback Response - ${data.branchName}`,
      body: `We've responded to your feedback`,
      data: {
        type: 'feedback_response',
        feedbackId: data.feedbackId,
        branchName: data.branchName
      },
      clickAction: 'FEEDBACK_RESPONSE'
    };

    return this.sendPushNotification(token, pushData);
  }

  async sendSystemAlertPush(token: string, data: {
    title: string;
    message: string;
    priority: string;
  }): Promise<boolean> {
    const pushData: PushNotificationData = {
      title: `System Alert - ${data.title}`,
      body: data.message,
      data: {
        type: 'system_alert',
        priority: data.priority
      },
      clickAction: 'SYSTEM_ALERT'
    };

    return this.sendPushNotification(token, pushData);
  }

  async sendReminderPush(token: string, data: {
    reminderType: string;
    message: string;
    actionRequired: boolean;
  }): Promise<boolean> {
    const pushData: PushNotificationData = {
      title: `Reminder - ${data.reminderType}`,
      body: data.message,
      data: {
        type: 'reminder',
        actionRequired: data.actionRequired.toString()
      },
      clickAction: 'REMINDER'
    };

    return this.sendPushNotification(token, pushData);
  }

  async sendToMultipleTokens(tokens: string[], data: PushNotificationData): Promise<{
    successCount: number;
    failureCount: number;
    failedTokens: string[];
  }> {
    const results = await Promise.allSettled(
      tokens.map(token => this.sendPushNotification(token, data))
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failureCount = results.length - successCount;
    const failedTokens = tokens.filter((_, index) => 
      results[index].status === 'rejected' || 
      (results[index].status === 'fulfilled' && !results[index].value)
    );

    return {
      successCount,
      failureCount,
      failedTokens
    };
  }
}

export const pushNotificationService = new PushNotificationService(); 