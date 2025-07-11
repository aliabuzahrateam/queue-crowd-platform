import { PrismaClient } from '@prisma/client';
import { PasswordService } from '../utils/password';
import { JWTService, JWTPayload } from '../utils/jwt';

const prisma = new PrismaClient();

export interface UpdateProfileData {
  username?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface TwoFactorData {
  secret: string;
  code: string;
}

export class UserService {
  // Get user profile
  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        is_active: true,
        is_2fa_enabled: true,
        last_login_at: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // Update user profile
  static async updateProfile(userId: string, data: UpdateProfileData) {
    // Check if username or email already exists (if being updated)
    if (data.username || data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(data.username ? [{ username: data.username }] : []),
            ...(data.email ? [{ email: data.email }] : [])
          ],
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        throw new Error('Username or email already exists');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.username && { username: data.username }),
        ...(data.email && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        updated_at: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        is_active: true,
        is_2fa_enabled: true,
        last_login_at: true,
        created_at: true,
        updated_at: true
      }
    });

    return updatedUser;
  }

  // Change password
  static async changePassword(userId: string, data: ChangePasswordData) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordService.verifyPassword(
      data.currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = PasswordService.validatePasswordStrength(data.newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash new password
    const hashedPassword = await PasswordService.hashPassword(data.newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: hashedPassword,
        updated_at: new Date()
      }
    });

    return { message: 'Password changed successfully' };
  }

  // Generate 2FA secret
  static async generateTwoFactorSecret(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.is_2fa_enabled) {
      throw new Error('2FA is already enabled');
    }

    // Generate a random secret (in production, use a proper TOTP library)
    const secret = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);

    return {
      secret,
      qrCode: `otpauth://totp/${user.email}?secret=${secret}&issuer=QueueCrowd`
    };
  }

  // Enable 2FA
  static async enableTwoFactor(userId: string, data: TwoFactorData) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.is_2fa_enabled) {
      throw new Error('2FA is already enabled');
    }

    // Verify the 2FA code (simplified - in production use proper TOTP verification)
    if (data.code !== '123456') { // This is a simplified check
      throw new Error('Invalid 2FA code');
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        is_2fa_enabled: true,
        two_fa_secret: data.secret,
        updated_at: new Date()
      }
    });

    return { message: '2FA enabled successfully' };
  }

  // Disable 2FA
  static async disableTwoFactor(userId: string, data: TwoFactorData) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.is_2fa_enabled) {
      throw new Error('2FA is not enabled');
    }

    // Verify the 2FA code
    if (data.code !== '123456') { // This is a simplified check
      throw new Error('Invalid 2FA code');
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        is_2fa_enabled: false,
        two_fa_secret: null,
        updated_at: new Date()
      }
    });

    return { message: '2FA disabled successfully' };
  }

  // Verify 2FA code
  static async verifyTwoFactorCode(userId: string, code: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.is_2fa_enabled) {
      throw new Error('2FA is not enabled');
    }

    // Verify the 2FA code (simplified - in production use proper TOTP verification)
    if (code !== '123456') { // This is a simplified check
      throw new Error('Invalid 2FA code');
    }

    return { message: '2FA code verified successfully' };
  }

  // Get user sessions
  static async getUserSessions(userId: string) {
    const sessions = await prisma.session.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        user_agent: true,
        ip_address: true,
        expires_at: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    return sessions;
  }

  // Revoke session
  static async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        user_id: userId
      }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    await prisma.session.delete({
      where: { id: sessionId }
    });

    return { message: 'Session revoked successfully' };
  }

  // Revoke all sessions except current
  static async revokeAllSessions(userId: string, currentSessionId: string) {
    await prisma.session.deleteMany({
      where: {
        user_id: userId,
        NOT: { id: currentSessionId }
      }
    });

    return { message: 'All other sessions revoked successfully' };
  }
} 