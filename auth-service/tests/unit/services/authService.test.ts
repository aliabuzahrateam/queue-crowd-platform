import { PrismaClient } from '@prisma/client';
import { AuthService } from '../../../src/services/authService';
import { PasswordService } from '../../../src/utils/password';

// Mock Prisma
jest.mock('@prisma/client');

const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
  },
};

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any);

// Mock PasswordService
jest.mock('../../../src/utils/password', () => ({
  PasswordService: {
    validatePasswordStrength: jest.fn(),
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
  }
}));

// Mock JWTService
jest.mock('../../../src/utils/jwt', () => ({
  JWTService: {
    generateTokenPair: jest.fn(),
    verifyToken: jest.fn(),
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        role: 'user'
      };

      const mockUser = {
        id: '1',
        username: userData.username,
        email: userData.email,
        role: userData.role,
        is_active: true,
        is_2fa_enabled: false,
        password_hash: 'hashed-password',
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      // Mock PasswordService
      (PasswordService.validatePasswordStrength as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (PasswordService.hashPassword as jest.Mock).mockResolvedValue('hashed-password');

      // Mock JWTService
      const { JWTService } = require('../../../src/utils/jwt');
      JWTService.generateTokenPair.mockReturnValue(mockTokens);

      // Mock Prisma
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.session.create.mockResolvedValue({ id: '1' });

      const result = await AuthService.register(userData);

      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
        is_active: mockUser.is_active,
        is_2fa_enabled: mockUser.is_2fa_enabled
      });
      expect(result.tokens).toEqual(mockTokens);
    });

    it('should fail when user already exists', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      mockPrisma.user.findFirst.mockResolvedValue({ id: '1' });

      await expect(AuthService.register(userData)).rejects.toThrow('User with this email or username already exists');
    });

    it('should fail with weak password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak'
      };

      (PasswordService.validatePasswordStrength as jest.Mock).mockReturnValue({ 
        isValid: false, 
        errors: ['Password must be at least 8 characters long'] 
      });

      await expect(AuthService.register(userData)).rejects.toThrow('Password validation failed: Password must be at least 8 characters long');
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      const mockUser = {
        id: '1',
        username: 'testuser',
        email: loginData.email,
        password_hash: 'hashed-password',
        role: 'user',
        is_active: true,
        is_2fa_enabled: false
      };

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      // Mock PasswordService
      (PasswordService.verifyPassword as jest.Mock).mockResolvedValue(true);

      // Mock JWTService
      const { JWTService } = require('../../../src/utils/jwt');
      JWTService.generateTokenPair.mockReturnValue(mockTokens);

      // Mock Prisma
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.session.create.mockResolvedValue({ id: '1' });

      const result = await AuthService.login(loginData);

      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
        is_active: mockUser.is_active,
        is_2fa_enabled: mockUser.is_2fa_enabled
      });
      expect(result.tokens).toEqual(mockTokens);
    });

    it('should fail with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPass123!'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid email or password');
    });

    it('should fail with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const mockUser = {
        id: '1',
        username: 'testuser',
        email: loginData.email,
        password_hash: 'hashed-password',
        role: 'user',
        is_active: true,
        is_2fa_enabled: false
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (PasswordService.verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid email or password');
    });

    it('should fail with inactive account', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      const mockUser = {
        id: '1',
        username: 'testuser',
        email: loginData.email,
        password_hash: 'hashed-password',
        role: 'user',
        is_active: false,
        is_2fa_enabled: false
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(AuthService.login(loginData)).rejects.toThrow('Account is deactivated');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const refreshToken = 'valid-refresh-token';

      mockPrisma.session.deleteMany.mockResolvedValue({ count: 1 });

      await expect(AuthService.logout(refreshToken)).resolves.toBeUndefined();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        is_active: true
      };

      const mockSession = {
        id: '1',
        user_id: '1',
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date
        created_at: new Date()
      };

      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      // Mock JWTService
      const { JWTService } = require('../../../src/utils/jwt');
      JWTService.verifyToken.mockReturnValue({ userId: '1', username: 'testuser', email: 'test@example.com', role: 'user' });
      JWTService.generateTokenPair.mockReturnValue(mockTokens);

      mockPrisma.session.findFirst.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await AuthService.refreshToken(refreshToken);

      expect(result).toEqual(mockTokens);
    });

    it('should fail with invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      const { JWTService } = require('../../../src/utils/jwt');
      JWTService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(AuthService.refreshToken(refreshToken)).rejects.toThrow('Invalid token');
    });

    it('should fail with expired session', async () => {
      const refreshToken = 'expired-refresh-token';
      
      const { JWTService } = require('../../../src/utils/jwt');
      JWTService.verifyToken.mockReturnValue({ userId: '1', username: 'testuser', email: 'test@example.com', role: 'user' });

      mockPrisma.session.findFirst.mockResolvedValue(null);

      await expect(AuthService.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });
}); 