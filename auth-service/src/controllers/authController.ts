import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { JWTService, JWTPayload } from '../utils/jwt';
import { PasswordService } from '../utils/password';
import { emailService } from '../utils/email';

const prisma = new PrismaClient();

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: existingUser.username === username ? 'Username already taken' : 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await PasswordService.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password_hash: hashedPassword,
        role,
        is_active: true
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
        user_agent: req.get('User-Agent') || 'unknown',
        ip_address: req.ip || req.connection.remoteAddress || 'unknown',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Send welcome email
    const welcomeTemplate = emailService.generateWelcomeTemplate(user.username);
    const emailSent = await emailService.sendEmail({
      to: user.email,
      subject: welcomeTemplate.subject,
      html: welcomeTemplate.html,
      text: welcomeTemplate.text
    });

    if (!emailSent) {
      console.error(`Failed to send welcome email to ${user.email}`);
    }

    // Remove password from response
    const { password_hash, ...userResponse } = user;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        tokens
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: 'Failed to register user'
    });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.'
      });
    }

    // Verify password
    const isValidPassword = await PasswordService.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
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
        user_agent: req.get('User-Agent') || 'unknown',
        ip_address: req.ip || req.connection.remoteAddress || 'unknown',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Remove password from response
    const { password_hash, ...userResponse } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        tokens
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: 'Failed to authenticate user'
    });
  }
};

// Logout user
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Invalidate refresh token
      await prisma.session.deleteMany({
        where: { refresh_token: refreshToken }
      });
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: 'Failed to logout user'
    });
  }
};

// Refresh access token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    JWTService.verifyToken(refreshToken);

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { refresh_token: refreshToken },
      include: { user: true }
    });

    if (!session || session.expires_at < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired'
      });
    }

    // Check if user is still active
    if (!session.user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
    }

    // Generate new tokens
    const newPayload: JWTPayload = {
      userId: session.user.id,
      username: session.user.username,
      email: session.user.email,
      role: session.user.role
    };

    const tokens = JWTService.generateTokenPair(newPayload);

    // Update session with new refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refresh_token: tokens.refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Token refresh failed',
      message: 'Invalid refresh token'
    });
  }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create password reset record
    await prisma.passwordReset.create({
      data: {
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt
      }
    });

    // Send password reset email
    const emailTemplate = emailService.generatePasswordResetTemplate(resetToken, user.username);
    const emailSent = await emailService.sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });

    if (!emailSent) {
      console.error(`Failed to send password reset email to ${email}`);
      // Still return success to prevent email enumeration
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request',
      message: 'Please try again later'
    });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    // Find password reset record
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token',
        message: 'Password reset token is invalid'
      });
    }

    if (resetRecord.used) {
      return res.status(400).json({
        success: false,
        error: 'Token already used',
        message: 'This password reset token has already been used'
      });
    }

    if (resetRecord.expires_at < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Token expired',
        message: 'Password reset token has expired'
      });
    }

    // Hash new password
    const hashedPassword = await PasswordService.hashPassword(password);

    // Update user password
    await prisma.user.update({
      where: { id: resetRecord.user_id },
      data: { password_hash: hashedPassword }
    });

    // Mark reset token as used
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true }
    });

    // Invalidate all user sessions
    await prisma.session.deleteMany({
      where: { user_id: resetRecord.user_id }
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
      message: 'Please try again later'
    });
  }
};

// Change password (authenticated user)
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to change your password'
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await PasswordService.verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Invalid current password',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await PasswordService.hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: hashedPassword }
    });

    // Invalidate all user sessions (force re-login)
    await prisma.session.deleteMany({
      where: { user_id: userId }
    });

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      message: 'Please try again later'
    });
  }
};

// Get user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to view your profile'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Remove password from response
    const { password_hash, ...userResponse } = user;

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      message: 'Please try again later'
    });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { username, email, phone } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to update your profile'
      });
    }

    // Check if username or email already exists (if being updated)
    if (username || email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : [])
          ],
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
          message: existingUser.username === username ? 'Username already taken' : 'Email already registered'
        });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...(phone && { phone })
      }
    });

    // Remove password from response
    const { password_hash, ...userResponse } = updatedUser;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: 'Please try again later'
    });
  }
};

// Verify email (placeholder for email verification)
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    // TODO: Implement email verification logic with database verification
    // For now, just return success
    res.json({
      success: true,
      message: 'Email verification endpoint ready - database integration pending'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify email',
      message: 'Please try again later'
    });
  }
};

// Resend verification email
export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a verification email has been sent'
      });
    }

    // Generate verification token (placeholder - would need database storage)
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    
    // Send verification email
    const emailTemplate = emailService.generateEmailVerificationTemplate(verificationToken, user.username);
    const emailSent = await emailService.sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });

    if (!emailSent) {
      console.error(`Failed to send verification email to ${email}`);
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a verification email has been sent'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification',
      message: 'Please try again later'
    });
  }
}; 