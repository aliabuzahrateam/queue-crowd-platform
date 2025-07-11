import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Notification Controller Integration Tests', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.notification.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.notificationTemplate.deleteMany();
    await prisma.deviceToken.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/notifications/send', () => {
    it('should send email notification successfully', async () => {
      const notificationData = {
        userId: 'test-user-123',
        type: 'email',
        title: 'Test Email Notification',
        message: 'This is a test email notification',
        priority: 'medium',
        data: {
          ticketNumber: 'T123',
          status: 'processing'
        }
      };

      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', 'Bearer test-token')
        .send(notificationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.userId).toBe('test-user-123');
      expect(response.body.data.type).toBe('email');
    });

    it('should send SMS notification successfully', async () => {
      const notificationData = {
        userId: 'test-user-456',
        type: 'sms',
        title: 'Test SMS Notification',
        message: 'This is a test SMS notification',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', 'Bearer test-token')
        .send(notificationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('sms');
    });

    it('should send push notification successfully', async () => {
      const notificationData = {
        userId: 'test-user-789',
        type: 'push',
        title: 'Test Push Notification',
        message: 'This is a test push notification',
        priority: 'low'
      };

      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', 'Bearer test-token')
        .send(notificationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('push');
    });

    it('should return 400 for invalid notification type', async () => {
      const notificationData = {
        userId: 'test-user-123',
        type: 'invalid',
        title: 'Test Notification',
        message: 'This is a test notification'
      };

      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', 'Bearer test-token')
        .send(notificationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for missing required fields', async () => {
      const notificationData = {
        userId: 'test-user-123',
        type: 'email'
        // Missing title and message
      };

      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', 'Bearer test-token')
        .send(notificationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/notifications/user/:userId', () => {
    beforeEach(async () => {
      // Create test notifications
      await prisma.notification.createMany({
        data: [
          {
            userId: 'test-user-123',
            type: 'email',
            title: 'Test Email 1',
            message: 'Test message 1',
            status: 'delivered'
          },
          {
            userId: 'test-user-123',
            type: 'sms',
            title: 'Test SMS 1',
            message: 'Test message 2',
            status: 'delivered'
          },
          {
            userId: 'test-user-456',
            type: 'push',
            title: 'Test Push 1',
            message: 'Test message 3',
            status: 'pending'
          }
        ]
      });
    });

    it('should get user notifications successfully', async () => {
      const response = await request(app)
        .get('/api/notifications/user/test-user-123')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notifications');
      expect(response.body.data.notifications).toHaveLength(2);
      expect(response.body.data.notifications[0].userId).toBe('test-user-123');
    });

    it('should return empty array for user with no notifications', async () => {
      const response = await request(app)
        .get('/api/notifications/user/nonexistent-user')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toHaveLength(0);
    });
  });

  describe('GET /api/notifications/:id', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await prisma.notification.create({
        data: {
          userId: 'test-user-123',
          type: 'email',
          title: 'Test Notification',
          message: 'Test message',
          status: 'delivered'
        }
      });
      notificationId = notification.id;
    });

    it('should get notification by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/notifications/${notificationId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(notificationId);
      expect(response.body.data.title).toBe('Test Notification');
    });

    it('should return 404 for non-existent notification', async () => {
      const response = await request(app)
        .get('/api/notifications/nonexistent-id')
        .set('Authorization', 'Bearer test-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Notification not found');
    });
  });

  describe('PUT /api/notifications/:id/status', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await prisma.notification.create({
        data: {
          userId: 'test-user-123',
          type: 'email',
          title: 'Test Notification',
          message: 'Test message',
          status: 'pending'
        }
      });
      notificationId = notification.id;
    });

    it('should update notification status successfully', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/status`)
        .set('Authorization', 'Bearer test-token')
        .send({ status: 'delivered' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('delivered');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/status`)
        .set('Authorization', 'Bearer test-token')
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid status');
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await prisma.notification.create({
        data: {
          userId: 'test-user-123',
          type: 'email',
          title: 'Test Notification',
          message: 'Test message',
          status: 'delivered'
        }
      });
      notificationId = notification.id;
    });

    it('should delete notification successfully', async () => {
      const response = await request(app)
        .delete(`/api/notifications/${notificationId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification deleted successfully');

      // Verify notification is deleted
      const deletedNotification = await prisma.notification.findUnique({
        where: { id: notificationId }
      });
      expect(deletedNotification).toBeNull();
    });

    it('should return 404 for non-existent notification', async () => {
      const response = await request(app)
        .delete('/api/notifications/nonexistent-id')
        .set('Authorization', 'Bearer test-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Notification not found');
    });
  });

  describe('GET /api/notifications/analytics/overview', () => {
    beforeEach(async () => {
      // Create test notifications for analytics
      await prisma.notification.createMany({
        data: [
          {
            userId: 'test-user-1',
            type: 'email',
            title: 'Test Email',
            message: 'Test message',
            status: 'delivered',
            deliveredAt: new Date()
          },
          {
            userId: 'test-user-2',
            type: 'sms',
            title: 'Test SMS',
            message: 'Test message',
            status: 'delivered',
            deliveredAt: new Date()
          },
          {
            userId: 'test-user-3',
            type: 'push',
            title: 'Test Push',
            message: 'Test message',
            status: 'failed'
          }
        ]
      });
    });

    it('should get analytics overview successfully', async () => {
      const response = await request(app)
        .get('/api/notifications/analytics/overview')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalNotifications');
      expect(response.body.data).toHaveProperty('deliveredNotifications');
      expect(response.body.data).toHaveProperty('failedNotifications');
      expect(response.body.data).toHaveProperty('successRate');
    });
  });
}); 