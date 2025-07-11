import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all password reset requests (admin only)
export const getAllPasswordResets = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, used } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (used !== undefined) where.used = used === 'true';

    const passwordResets = await prisma.passwordReset.findMany({
      where,
      skip,
      take: Number(limit),
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const total = await prisma.passwordReset.count({ where });

    res.json({
      success: true,
      data: {
        passwordResets,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get all password resets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get password resets',
      message: 'Please try again later'
    });
  }
};

// Get password reset by ID (admin only)
export const getPasswordResetById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const passwordReset = await prisma.passwordReset.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    if (!passwordReset) {
      return res.status(404).json({
        success: false,
        error: 'Password reset not found',
        message: 'Password reset not found'
      });
    }

    res.json({
      success: true,
      data: passwordReset
    });
  } catch (error) {
    console.error('Get password reset by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get password reset',
      message: 'Please try again later'
    });
  }
};

// Delete password reset (admin only)
export const deletePasswordReset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const passwordReset = await prisma.passwordReset.findUnique({
      where: { id }
    });

    if (!passwordReset) {
      return res.status(404).json({
        success: false,
        error: 'Password reset not found',
        message: 'Password reset not found'
      });
    }

    await prisma.passwordReset.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Password reset deleted successfully'
    });
  } catch (error) {
    console.error('Delete password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete password reset',
      message: 'Please try again later'
    });
  }
};

// Clean up expired password resets (admin only)
export const cleanupExpiredPasswordResets = async (req: Request, res: Response) => {
  try {
    const result = await prisma.passwordReset.deleteMany({
      where: {
        OR: [
          { expires_at: { lt: new Date() } },
          { used: true }
        ]
      }
    });

    res.json({
      success: true,
      message: `Cleaned up ${result.count} expired password resets`,
      data: { deletedCount: result.count }
    });
  } catch (error) {
    console.error('Cleanup expired password resets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup expired password resets',
      message: 'Please try again later'
    });
  }
};

// Get password reset statistics (admin only)
export const getPasswordResetStats = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const totalResets = await prisma.passwordReset.count({
      where: {
        created_at: { gte: startDate }
      }
    });

    const usedResets = await prisma.passwordReset.count({
      where: {
        created_at: { gte: startDate },
        used: true
      }
    });

    const expiredResets = await prisma.passwordReset.count({
      where: {
        created_at: { gte: startDate },
        expires_at: { lt: new Date() },
        used: false
      }
    });

    const activeResets = await prisma.passwordReset.count({
      where: {
        created_at: { gte: startDate },
        expires_at: { gte: new Date() },
        used: false
      }
    });

    // Get daily statistics
    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN used = true THEN 1 END) as used,
        COUNT(CASE WHEN expires_at < NOW() AND used = false THEN 1 END) as expired
      FROM password_reset 
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    res.json({
      success: true,
      data: {
        period: {
          start: startDate,
          end: new Date(),
          days: Number(days)
        },
        summary: {
          total: totalResets,
          used: usedResets,
          expired: expiredResets,
          active: activeResets,
          successRate: totalResets > 0 ? Math.round((usedResets / totalResets) * 100) : 0
        },
        dailyStats
      }
    });
  } catch (error) {
    console.error('Get password reset stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get password reset statistics',
      message: 'Please try again later'
    });
  }
};

// Validate password reset token (public)
export const validatePasswordResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const passwordReset = await prisma.passwordReset.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    if (!passwordReset) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token',
        message: 'Password reset token is invalid'
      });
    }

    if (passwordReset.used) {
      return res.status(400).json({
        success: false,
        error: 'Token already used',
        message: 'This password reset token has already been used'
      });
    }

    if (passwordReset.expires_at < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Token expired',
        message: 'Password reset token has expired'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: passwordReset.user,
        expiresAt: passwordReset.expires_at
      }
    });
  } catch (error) {
    console.error('Validate password reset token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate token',
      message: 'Please try again later'
    });
  }
}; 