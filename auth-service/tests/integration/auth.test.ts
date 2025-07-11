import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/app';

const prisma = new PrismaClient();

describe('Auth Endpoints', () => {
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

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Registration failed');
    });
  });

  describe('POST /api/auth/login', () => {
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

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Login failed');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Login failed');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create a test user and get refresh token
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      refreshToken = registerResponse.body.data.tokens.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error).toBe('Token refresh failed');
    });
  });

  describe('GET /api/auth/validate', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create a test user and get access token
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      accessToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should validate token successfully', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Token is valid');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('username');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('role');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .expect(401);

      expect(response.body.error).toBe('No authorization header');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Token validation failed');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body.service).toBe('auth-service');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
}); 