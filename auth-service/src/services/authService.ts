import { PrismaClient } from '@prisma/client';
import { JWTService, JWTPayload, TokenPair } from '../utils/jwt';
import { PasswordService } from '../utils/password';

const prisma = new PrismaClient();

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    is_2fa_enabled: boolean;
  };
  tokens: TokenPair;
}

export class AuthService {
  // Register a new user
  static async register(data: RegisterData): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username }
        ]
      }
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Validate password strength
    const passwordValidation = PasswordService.validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash password
    const hashedPassword = await PasswordService.hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password_hash: hashedPassword,
        phone: data.phone,
        role: data.role || 'user',
        is_active: true,
        is_2fa_enabled: false
      }
    });

    // Generate tokens
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const tokens = JWTService.generateTokenPair(payload);

    // Create session
    await prisma.session.create({
      data: {
        user_id: user.id,
        refresh_token: tokens.refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        user_agent: 'auth-service',
        ip_address: '127.0.0.1'
      }
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        is_2fa_enabled: user.is_2fa_enabled
      },
      tokens
    };
  }

  // Login user
  static async login(data: LoginData): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await PasswordService.verifyPassword(data.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() }
    });

    // Generate tokens
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const tokens = JWTService.generateTokenPair(payload);

    // Create session
    await prisma.session.create({
      data: {
        user_id: user.id,
        refresh_token: tokens.refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        user_agent: 'auth-service',
        ip_address: '127.0.0.1'
      }
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        is_2fa_enabled: user.is_2fa_enabled
      },
      tokens
    };
  }

  // Logout user
  static async logout(refreshToken: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { refresh_token: refreshToken }
    });
  }

  // Refresh access token
  static async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const payload = JWTService.verifyToken(refreshToken);

    // Check if session exists
    const session = await prisma.session.findFirst({
      where: {
        refresh_token: refreshToken,
        expires_at: { gt: new Date() }
      }
    });

    if (!session) {
      throw new Error('Invalid refresh token');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    // Generate new tokens
    const newPayload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const newTokens = JWTService.generateTokenPair(newPayload);

    // Update session
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refresh_token: newTokens.refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    return newTokens;
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<any | null> {
    return prisma.user.findUnique({
      where: { id: userId }
    });
  }

  // Validate access token
  static async validateAccessToken(token: string): Promise<JWTPayload> {
    return JWTService.verifyToken(token);
  }
} 