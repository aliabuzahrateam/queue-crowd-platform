import { notificationProcessor } from '../../services/notificationProcessor';
import { PrismaClient } from '@prisma/client';
import { redisService } from '../../config/redis';
import { emailService } from '../../config/email';
import { smsService } from '../../config/sms';
import { pushNotificationService } from '../../config/push';

// Mock external dependencies
jest.mock('@prisma/client');
jest.mock('../../config/redis');
jest.mock('../../config/email');
jest.mock('../../config/sms');
jest.mock('../../config/push');

const mockPrisma = PrismaClient as jest.MockedClass<typeof PrismaClient>;
const mockRedisService = redisService as jest.Mocked<typeof redisService>;
const mockEmailService = emailService as jest.Mocked<typeof emailService>;
const mockSmsService = smsService as jest.Mocked<typeof smsService>;
const mockPushNotificationService = pushNotificationService as jest.Mocked<typeof pushNotificationService>;

describe('NotificationProcessor', () => {
  let mockPrismaInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrismaInstance = {
      notification: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn()
      },
      user: {
        findUnique: jest.fn()
      },
      notificationPreference: {
        findUnique: jest.fn()
      }
    };

    (mockPrisma as any).mockImplementation(() => mockPrismaInstance);
  });

  describe('processNotification', () => {
    const mockRequest = {
      userId: 'user-123',
      type: 'email' as const,
      title: 'Test Notification',
      message: 'This is a test notification',
      priority: 'medium' as const,
      data: { test: 'data' }
    };

    const mockPreferences = {
      email: true,
      sms: true,
      push: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      phone: '+1234567890'
    };

    beforeEach(() => {
      mockRedisService.getNotificationPreferences.mockResolvedValue(mockPreferences);
      mockPrismaInstance.notification.create.mockResolvedValue({
        id: 'notification-123',
        userId: 'user-123',
        type: 'email',
        title: 'Test Notification',
        message: 'This is a test notification',
        status: 'pending'
      });
      mockPrismaInstance.user.findUnique.mockResolvedValue(mockUser);
      mockEmailService.sendEmail.mockResolvedValue(true);
    });

    it('should process email notification successfully', async () => {
      const result = await notificationProcessor.processNotification(mockRequest);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('notification-123');
      expect(mockPrismaInstance.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'email',
          title: 'Test Notification',
          message: 'This is a test notification'
        })
      });
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          subject: 'Test Notification',
          html: expect.stringContaining('Test Notification'),
          text: 'This is a test notification'
        })
      );
    });

    it('should skip notification during quiet hours', async () => {
      const quietHoursPreferences = {
        ...mockPreferences,
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00'
        }
      };

      mockRedisService.getNotificationPreferences.mockResolvedValue(quietHoursPreferences);

      const result = await notificationProcessor.processNotification(mockRequest);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeUndefined();
      expect(mockPrismaInstance.notification.create).not.toHaveBeenCalled();
    });

    it('should handle email service failure', async () => {
      mockEmailService.sendEmail.mockResolvedValue(false);

      const result = await notificationProcessor.processNotification(mockRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Email failed: Email service returned false');
    });

    it('should handle missing user email', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue({ ...mockUser, email: null });

      const result = await notificationProcessor.processNotification(mockRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Email failed: User email not found');
    });

    it('should process all notification types', async () => {
      const allTypesRequest = {
        ...mockRequest,
        type: 'all' as const
      };

      mockSmsService.sendSMS.mockResolvedValue(true);
      mockPushNotificationService.sendToMultipleTokens.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        failedTokens: []
      });
      mockRedisService.getUserTokens.mockResolvedValue(['token-123']);

      const result = await notificationProcessor.processNotification(allTypesRequest);

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      expect(mockSmsService.sendSMS).toHaveBeenCalled();
      expect(mockPushNotificationService.sendToMultipleTokens).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockPrismaInstance.notification.create.mockRejectedValue(new Error('Database error'));

      const result = await notificationProcessor.processNotification(mockRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Database error');
    });
  });

  describe('processScheduledNotifications', () => {
    it('should process scheduled notifications', async () => {
      const scheduledNotifications = [
        {
          id: 'notification-1',
          userId: 'user-1',
          type: 'email',
          title: 'Scheduled Notification',
          message: 'This is scheduled',
          status: 'pending'
        }
      ];

      mockPrismaInstance.notification.findMany.mockResolvedValue(scheduledNotifications);
      mockRedisService.getNotificationPreferences.mockResolvedValue({
        email: true,
        sms: true,
        push: true,
        quietHours: { enabled: false, start: '22:00', end: '08:00' }
      });
      mockPrismaInstance.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user1@example.com'
      });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await notificationProcessor.processScheduledNotifications();

      expect(mockPrismaInstance.notification.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'pending',
          scheduledAt: expect.any(Object),
          expiresAt: expect.any(Object)
        })
      });
    });
  });

  describe('cleanupExpiredNotifications', () => {
    it('should cleanup expired notifications', async () => {
      await notificationProcessor.cleanupExpiredNotifications();

      expect(mockPrismaInstance.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      });
    });
  });
}); 