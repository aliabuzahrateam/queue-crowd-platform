import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create transporter - in production, use real SMTP settings
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
      }
    });
  }

  // Send email
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@queuecrowd.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Generate password reset email template
  generatePasswordResetTemplate(token: string, username: string): EmailTemplate {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    return {
      subject: 'Password Reset Request - Queue Crowd Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${username},</p>
          <p>You have requested to reset your password for the Queue Crowd Platform.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email from the Queue Crowd Platform. 
            Please do not reply to this email.
          </p>
        </div>
      `,
      text: `
        Password Reset Request - Queue Crowd Platform
        
        Hello ${username},
        
        You have requested to reset your password for the Queue Crowd Platform.
        
        Click the following link to reset your password:
        ${resetUrl}
        
        This link will expire in 1 hour.
        
        If you didn't request this password reset, please ignore this email.
        
        Best regards,
        Queue Crowd Platform Team
      `
    };
  }

  // Generate email verification template
  generateEmailVerificationTemplate(token: string, username: string): EmailTemplate {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    return {
      subject: 'Verify Your Email - Queue Crowd Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email Address</h2>
          <p>Hello ${username},</p>
          <p>Thank you for registering with the Queue Crowd Platform!</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background-color: #28a745; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email from the Queue Crowd Platform. 
            Please do not reply to this email.
          </p>
        </div>
      `,
      text: `
        Verify Your Email - Queue Crowd Platform
        
        Hello ${username},
        
        Thank you for registering with the Queue Crowd Platform!
        
        Please verify your email address by clicking the following link:
        ${verifyUrl}
        
        This link will expire in 24 hours.
        
        Best regards,
        Queue Crowd Platform Team
      `
    };
  }

  // Generate welcome email template
  generateWelcomeTemplate(username: string): EmailTemplate {
    return {
      subject: 'Welcome to Queue Crowd Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Queue Crowd Platform!</h2>
          <p>Hello ${username},</p>
          <p>Welcome to the Queue Crowd Platform! Your account has been successfully created.</p>
          <p>You can now:</p>
          <ul>
            <li>Access queue management features</li>
            <li>Track crowd levels in real-time</li>
            <li>Receive notifications about queue updates</li>
            <li>Provide feedback on services</li>
          </ul>
          <p>If you have any questions or need support, please contact our team.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email from the Queue Crowd Platform. 
            Please do not reply to this email.
          </p>
        </div>
      `,
      text: `
        Welcome to Queue Crowd Platform!
        
        Hello ${username},
        
        Welcome to the Queue Crowd Platform! Your account has been successfully created.
        
        You can now:
        - Access queue management features
        - Track crowd levels in real-time
        - Receive notifications about queue updates
        - Provide feedback on services
        
        If you have any questions or need support, please contact our team.
        
        Best regards,
        Queue Crowd Platform Team
      `
    };
  }

  // Generate account deactivated email template
  generateAccountDeactivatedTemplate(username: string, reason?: string): EmailTemplate {
    return {
      subject: 'Account Deactivated - Queue Crowd Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Account Deactivated</h2>
          <p>Hello ${username},</p>
          <p>Your account has been deactivated by an administrator.</p>
          ${reason ? `<p>Reason: ${reason}</p>` : ''}
          <p>If you believe this is an error, please contact our support team.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email from the Queue Crowd Platform. 
            Please do not reply to this email.
          </p>
        </div>
      `,
      text: `
        Account Deactivated - Queue Crowd Platform
        
        Hello ${username},
        
        Your account has been deactivated by an administrator.
        ${reason ? `Reason: ${reason}` : ''}
        
        If you believe this is an error, please contact our support team.
        
        Best regards,
        Queue Crowd Platform Team
      `
    };
  }
}

// Export singleton instance
export const emailService = new EmailService(); 