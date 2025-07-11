import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PasswordService } from '../utils/password';

const prisma = new PrismaClient();

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, role, is_active } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (role) where.role = role;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const users = await prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
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
      },
      orderBy: { created_at: 'desc' }
    });

    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
      message: 'Please try again later'
    });
  }
};

// Get user by ID (admin only)
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
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
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: 'Please try again later'
    });
  }
};

// Update user (admin only)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, phone, role, is_active } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Check if username or email already exists (if being updated)
    if (username || email) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : [])
          ],
          NOT: { id }
        }
      });

      if (duplicateUser) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
          message: duplicateUser.username === username ? 'Username already taken' : 'Email already registered'
        });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(role && { role }),
        ...(is_active !== undefined && { is_active })
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

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: 'Please try again later'
    });
  }
};

// Delete user (admin only)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Delete user sessions
    await prisma.session.deleteMany({
      where: { user_id: id }
    });

    // Delete password resets
    await prisma.passwordReset.deleteMany({
      where: { user_id: id }
    });

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      message: 'Please try again later'
    });
  }
};

// Deactivate user (admin only)
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Deactivate user
    await prisma.user.update({
      where: { id },
      data: { is_active: false }
    });

    // Invalidate all user sessions
    await prisma.session.deleteMany({
      where: { user_id: id }
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate user',
      message: 'Please try again later'
    });
  }
};

// Activate user (admin only)
export const activateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Activate user
    await prisma.user.update({
      where: { id },
      data: { is_active: true }
    });

    res.json({
      success: true,
      message: 'User activated successfully'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate user',
      message: 'Please try again later'
    });
  }
};

// Reset user password (admin only)
export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password required',
        message: 'New password is required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Hash new password
    const hashedPassword = await PasswordService.hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { password_hash: hashedPassword }
    });

    // Invalidate all user sessions
    await prisma.session.deleteMany({
      where: { user_id: id }
    });

    res.json({
      success: true,
      message: 'User password reset successfully'
    });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset user password',
      message: 'Please try again later'
    });
  }
};

// Get user sessions (admin only)
export const getUserSessions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sessions = await prisma.session.findMany({
      where: { user_id: id },
      orderBy: { created_at: 'desc' }
    });

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user sessions',
      message: 'Please try again later'
    });
  }
};

// Revoke user session (admin only)
export const revokeUserSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Session not found'
      });
    }

    await prisma.session.delete({
      where: { id: sessionId }
    });

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Revoke user session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke session',
      message: 'Please try again later'
    });
  }
}; 