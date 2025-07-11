import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/app';

const prisma = new PrismaClient();

describe('User Management Endpoints', () => {
  let accessToken: string;
  let _userId: string;

  beforeEach(async () => {
    // Clean up before each test
    await prisma.session.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.user.deleteMany();

    // Create a test user
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPass123!'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    accessToken = registerResponse.body.data.tokens.accessToken;
    _userId = registerResponse.body.data.user.id;
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.session.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Profile retrieved successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('username');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('role');
      expect(response.body.data).toHaveProperty('twoFactorEnabled');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.error).toBe('No authorization header');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        username: 'updateduser',
        phone: '+1234567890'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.data.username).toBe(updateData.username);
      expect(response.body.data.phone).toBe(updateData.phone);
    });

    it('should reject invalid phone number format', async () => {
      const updateData = {
        phone: 'invalid-phone'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject duplicate username', async () => {
      // Create another user
      const anotherUser = {
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'TestPass123!'
      };

      await request(app)
        .post('/api/auth/register')
        .send(anotherUser);

      // Try to update with duplicate username
      const updateData = {
        username: 'anotheruser'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Profile update failed');
    });
  });

  describe('PUT /api/users/password', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'TestPass123!',
        newPassword: 'NewPass123!'
      };

      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should reject with incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPass123!'
      };

      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBe('Password change failed');
    });

    it('should reject weak new password', async () => {
      const passwordData = {
        currentPassword: 'TestPass123!',
        newPassword: 'weak'
      };

      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/users/2fa/enable', () => {
    it('should enable 2FA successfully', async () => {
      const response = await request(app)
        .post('/api/users/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('2FA setup initiated');
      expect(response.body.data).toHaveProperty('secret');
      expect(response.body.data).toHaveProperty('qrCode');
    });

    it('should reject if 2FA already enabled', async () => {
      // Enable 2FA first
      await request(app)
        .post('/api/users/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`);

      // Try to enable again
      const response = await request(app)
        .post('/api/users/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.error).toBe('2FA already enabled');
    });
  });

  describe('POST /api/users/2fa/verify', () => {
    let _secret: string;

    beforeEach(async () => {
      // Enable 2FA first
      const enableResponse = await request(app)
        .post('/api/users/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`);

      _secret = enableResponse.body.data.secret;
    });

    it('should verify 2FA token successfully', async () => {
      // Note: In a real test, you'd use a proper TOTP library
      // For this test, we'll use a mock token
      const verifyData = {
        token: '123456' // Mock token
      };

      const response = await request(app)
        .post('/api/users/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(verifyData)
        .expect(200);

      expect(response.body.message).toBe('2FA verified successfully');
    });

    it('should reject invalid 2FA token', async () => {
      const verifyData = {
        token: '000000' // Invalid token
      };

      const response = await request(app)
        .post('/api/users/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(verifyData)
        .expect(400);

      expect(response.body.error).toBe('2FA verification failed');
    });
  });

  describe('DELETE /api/users/2fa/disable', () => {
    beforeEach(async () => {
      // Enable 2FA first
      await request(app)
        .post('/api/users/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`);
    });

    it('should disable 2FA successfully', async () => {
      const response = await request(app)
        .delete('/api/users/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('2FA disabled successfully');
    });
  });

  describe('GET /api/users/sessions', () => {
    it('should get user sessions successfully', async () => {
      const response = await request(app)
        .get('/api/users/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Sessions retrieved successfully');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/users/sessions/:sessionId', () => {
    it('should revoke session successfully', async () => {
      // Get sessions first
      const sessionsResponse = await request(app)
        .get('/api/users/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      const sessionId = sessionsResponse.body.data[0].id;

      const response = await request(app)
        .delete(`/api/users/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Session revoked successfully');
    });

    it('should reject invalid session ID', async () => {
      const response = await request(app)
        .delete('/api/users/sessions/invalid-session-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error).toBe('Session not found');
    });
  });
}); 