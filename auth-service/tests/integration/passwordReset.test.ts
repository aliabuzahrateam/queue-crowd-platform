import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/app';

const prisma = new PrismaClient();

describe('Password Reset Endpoints', () => {
  beforeEach(async () => {
    // Clean up before each test
    await prisma.session.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.session.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/password-reset/request', () => {
    beforeEach(async () => {
      // Create a test user
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should request password reset successfully', async () => {
      const requestData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/password-reset/request')
        .send(requestData)
        .expect(200);

      expect(response.body.message).toBe('Password reset email sent');
    });

    it('should return same response for non-existent email (security)', async () => {
      const requestData = {
        email: 'nonexistent@example.com'
      };

      const response = await request(app)
        .post('/api/password-reset/request')
        .send(requestData)
        .expect(200);

      expect(response.body.message).toBe('Password reset email sent');
    });

    it('should reject invalid email format', async () => {
      const requestData = {
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/password-reset/request')
        .send(requestData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should prevent multiple requests for same email', async () => {
      const requestData = {
        email: 'test@example.com'
      };

      // First request
      await request(app)
        .post('/api/password-reset/request')
        .send(requestData)
        .expect(200);

      // Second request should be rate limited
      const response = await request(app)
        .post('/api/password-reset/request')
        .send(requestData)
        .expect(429);

      expect(response.body.error).toBe('Too many requests');
    });
  });

  describe('POST /api/password-reset/validate', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Create a test user
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Request password reset
      await request(app)
        .post('/api/password-reset/request')
        .send({ email: 'test@example.com' });

      // Get the reset token from database
      const resetRecord = await prisma.passwordReset.findFirst({
        where: { email: 'test@example.com' }
      });
      resetToken = resetRecord?.token || '';
    });

    it('should validate reset token successfully', async () => {
      const validateData = {
        token: resetToken
      };

      const response = await request(app)
        .post('/api/password-reset/validate')
        .send(validateData)
        .expect(200);

      expect(response.body.message).toBe('Token is valid');
    });

    it('should reject invalid token', async () => {
      const validateData = {
        token: 'invalid-token'
      };

      const response = await request(app)
        .post('/api/password-reset/validate')
        .send(validateData)
        .expect(400);

      expect(response.body.error).toBe('Token validation failed');
    });

    it('should reject expired token', async () => {
      // Manually expire the token
      await prisma.passwordReset.updateMany({
        where: { email: 'test@example.com' },
        data: { expiresAt: new Date(Date.now() - 1000) }
      });

      const validateData = {
        token: resetToken
      };

      const response = await request(app)
        .post('/api/password-reset/validate')
        .send(validateData)
        .expect(400);

      expect(response.body.error).toBe('Token validation failed');
    });
  });

  describe('POST /api/password-reset/reset', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Create a test user
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Request password reset
      await request(app)
        .post('/api/password-reset/request')
        .send({ email: 'test@example.com' });

      // Get the reset token from database
      const resetRecord = await prisma.passwordReset.findFirst({
        where: { email: 'test@example.com' }
      });
      resetToken = resetRecord?.token || '';
    });

    it('should reset password successfully', async () => {
      const resetData = {
        token: resetToken,
        newPassword: 'NewPass123!'
      };

      const response = await request(app)
        .post('/api/password-reset/reset')
        .send(resetData)
        .expect(200);

      expect(response.body.message).toBe('Password reset successfully');
    });

    it('should reject weak password', async () => {
      const resetData = {
        token: resetToken,
        newPassword: 'weak'
      };

      const response = await request(app)
        .post('/api/password-reset/reset')
        .send(resetData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid token', async () => {
      const resetData = {
        token: 'invalid-token',
        newPassword: 'NewPass123!'
      };

      const response = await request(app)
        .post('/api/password-reset/reset')
        .send(resetData)
        .expect(400);

      expect(response.body.error).toBe('Password reset failed');
    });

    it('should revoke all user sessions after password reset', async () => {
      const resetData = {
        token: resetToken,
        newPassword: 'NewPass123!'
      };

      await request(app)
        .post('/api/password-reset/reset')
        .send(resetData)
        .expect(200);

      // Try to use the old session token
      const loginData = {
        email: 'test@example.com',
        password: 'NewPass123!'
      };

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      const newAccessToken = loginResponse.body.data.tokens.accessToken;

      // Verify the new token works
      const validateResponse = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(validateResponse.body.message).toBe('Token is valid');
    });
  });
}); 