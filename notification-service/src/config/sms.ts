import twilio from 'twilio';

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface SMSTemplate {
  message: string;
  to: string;
}

export class SMSService {
  private client: twilio.Twilio;
  private config: SMSConfig;

  constructor() {
    this.config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
    };

    this.client = twilio(this.config.accountSid, this.config.authToken);
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      await this.client.messages.create({
        body: message,
        from: this.config.phoneNumber,
        to
      });
      return true;
    } catch (error) {
      console.error('SMS sending failed:', error);
      return false;
    }
  }

  async sendQueueUpdateSMS(to: string, data: {
    ticketNumber: string;
    status: string;
    estimatedWait: number;
    branchName: string;
  }): Promise<boolean> {
    const message = `Queue Update - Ticket ${data.ticketNumber}
Status: ${data.status}
Branch: ${data.branchName}
Estimated Wait: ${data.estimatedWait} minutes

Thank you for using our service!`;

    return this.sendSMS(to, message);
  }

  async sendCrowdAlertSMS(to: string, data: {
    branchName: string;
    currentCapacity: number;
    maxCapacity: number;
    alertType: string;
  }): Promise<boolean> {
    const message = `Crowd Alert - ${data.branchName}
Alert Type: ${data.alertType}
Current Capacity: ${data.currentCapacity}/${data.maxCapacity}
Utilization: ${Math.round((data.currentCapacity / data.maxCapacity) * 100)}%

Please take appropriate action.`;

    return this.sendSMS(to, message);
  }

  async sendSystemAlertSMS(to: string, data: {
    title: string;
    message: string;
    priority: string;
  }): Promise<boolean> {
    const message = `System Alert - ${data.title}
Priority: ${data.priority}
Message: ${data.message}

Please review and take action if necessary.`;

    return this.sendSMS(to, message);
  }

  async sendReminderSMS(to: string, data: {
    reminderType: string;
    message: string;
    actionRequired: boolean;
  }): Promise<boolean> {
    const message = `Reminder - ${data.reminderType}
${data.message}
${data.actionRequired ? 'Action required.' : 'No action needed.'}`;

    return this.sendSMS(to, message);
  }
}

export const smsService = new SMSService(); 