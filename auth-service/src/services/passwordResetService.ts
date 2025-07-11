import { PrismaClient } from '@prisma/client';
import { PasswordService } from '../utils/password';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface PasswordResetData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export class PasswordResetService {
  // Request password reset
  static async requestPasswordReset(data: PasswordResetData): Promise<void> {
    const { email } = data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return;
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create or update password reset record
    await prisma.passwordReset.upsert({
      where: { user_id: user.id },
      update: {
        token,
        expires_at: expiresAt,
        used: false
      },
      create: {
        user_id: user.id,
        token,
        expires_at: expiresAt,
        used: false
      }
    });

    // In a real application, you would send an email here
    // For now, we'll just log the reset link
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    console.log(`Password reset link for ${email}: ${resetLink}`);

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(user.email, resetLink);
  }

  // Reset password using token
  static async resetPassword(data: ResetPasswordData): Promise<void> {
    const { token, newPassword } = data;

    // Find password reset record
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token,
        used: false,
        expires_at: { gt: new Date() }
      },
      include: {
        user: true
      }
    });

    if (!resetRecord) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate new password strength
    const passwordValidation = PasswordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash new password
    const hashedPassword = await PasswordService.hashPassword(newPassword);

    // Update user password
    await prisma.user.update({
      where: { id: resetRecord.user_id },
      data: {
        password_hash: hashedPassword,
        updated_at: new Date()
      }
    });

    // Mark reset token as used
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true }
    });

    // Revoke all existing sessions for security
    await prisma.session.deleteMany({
      where: { user_id: resetRecord.user_id }
    });
  }

  // Validate reset token
  static async validateResetToken(token: string): Promise<boolean> {
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token,
        used: false,
        expires_at: { gt: new Date() }
      }
    });

    return !!resetRecord;
  }

  // Get reset token info (for frontend validation)
  static async getResetTokenInfo(token: string) {
    const resetRecord = await prisma.passwordReset.findFirst({
      where: { token },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!resetRecord) {
      throw new Error('Invalid reset token');
    }

    return {
      email: resetRecord.user.email,
      expiresAt: resetRecord.expires_at,
      used: resetRecord.used
    };
  }

  // Clean up expired reset tokens (can be run as a cron job)
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.passwordReset.deleteMany({
      where: {
        expires_at: { lt: new Date() }
      }
    });

    return result.count;
  }

  // Check if user has pending reset request
  static async hasPendingReset(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return false;
    }

    const pendingReset = await prisma.passwordReset.findFirst({
      where: {
        user_id: user.id,
        used: false,
        expires_at: { gt: new Date() }
      }
    });

    return !!pendingReset;
  }
} 