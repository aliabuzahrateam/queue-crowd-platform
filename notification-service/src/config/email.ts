import nodemailer from 'nodemailer';

import { createTransport } from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      from: process.env.EMAIL_FROM || 'noreply@queuecrowd.com'
    };

    this.transporter = createTransport(this.config);
  }

  async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.config.from,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendQueueUpdateEmail(to: string, data: {
    ticketNumber: string;
    status: string;
    estimatedWait: number;
    branchName: string;
  }): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Queue Update - Ticket ${data.ticketNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Queue Update</h2>
          <p>Hello,</p>
          <p>Your queue ticket has been updated:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
            <p><strong>Status:</strong> ${data.status}</p>
            <p><strong>Branch:</strong> ${data.branchName}</p>
            <p><strong>Estimated Wait:</strong> ${data.estimatedWait} minutes</p>
          </div>
          <p>Thank you for using our service!</p>
        </div>
      `,
      text: `
        Queue Update - Ticket ${data.ticketNumber}
        
        Status: ${data.status}
        Branch: ${data.branchName}
        Estimated Wait: ${data.estimatedWait} minutes
        
        Thank you for using our service!
      `
    };

    return this.sendEmail(to, template);
  }

  async sendCrowdAlertEmail(to: string, data: {
    branchName: string;
    currentCapacity: number;
    maxCapacity: number;
    alertType: string;
  }): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Crowd Alert - ${data.branchName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff4444;">Crowd Alert</h2>
          <p>Hello,</p>
          <p>A crowd alert has been triggered at ${data.branchName}:</p>
          <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p><strong>Alert Type:</strong> ${data.alertType}</p>
            <p><strong>Current Capacity:</strong> ${data.currentCapacity}</p>
            <p><strong>Max Capacity:</strong> ${data.maxCapacity}</p>
            <p><strong>Utilization:</strong> ${Math.round((data.currentCapacity / data.maxCapacity) * 100)}%</p>
          </div>
          <p>Please take appropriate action.</p>
        </div>
      `,
      text: `
        Crowd Alert - ${data.branchName}
        
        Alert Type: ${data.alertType}
        Current Capacity: ${data.currentCapacity}
        Max Capacity: ${data.maxCapacity}
        Utilization: ${Math.round((data.currentCapacity / data.maxCapacity) * 100)}%
        
        Please take appropriate action.
      `
    };

    return this.sendEmail(to, template);
  }

  async sendFeedbackResponseEmail(to: string, data: {
    feedbackId: string;
    response: string;
    branchName: string;
  }): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Feedback Response - ${data.branchName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Feedback Response</h2>
          <p>Hello,</p>
          <p>We have responded to your feedback:</p>
          <div style="background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p><strong>Feedback ID:</strong> ${data.feedbackId}</p>
            <p><strong>Branch:</strong> ${data.branchName}</p>
            <p><strong>Response:</strong></p>
            <p style="margin-left: 20px;">${data.response}</p>
          </div>
          <p>Thank you for your feedback!</p>
        </div>
      `,
      text: `
        Feedback Response - ${data.branchName}
        
        Feedback ID: ${data.feedbackId}
        Response: ${data.response}
        
        Thank you for your feedback!
      `
    };

    return this.sendEmail(to, template);
  }

  async sendSystemAlertEmail(to: string, data: {
    title: string;
    message: string;
    priority: string;
  }): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `System Alert - ${data.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">System Alert</h2>
          <p>Hello,</p>
          <p>A system alert has been triggered:</p>
          <div style="background: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <p><strong>Title:</strong> ${data.title}</p>
            <p><strong>Priority:</strong> ${data.priority}</p>
            <p><strong>Message:</strong></p>
            <p style="margin-left: 20px;">${data.message}</p>
          </div>
          <p>Please review and take action if necessary.</p>
        </div>
      `,
      text: `
        System Alert - ${data.title}
        
        Priority: ${data.priority}
        Message: ${data.message}
        
        Please review and take action if necessary.
      `
    };

    return this.sendEmail(to, template);
  }
}

export const emailService = new EmailService(); 