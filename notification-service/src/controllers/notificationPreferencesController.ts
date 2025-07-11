import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { redisService } from '../config/redis';
import logger from '../config/winston';

const prisma = new PrismaClient();

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export const notificationPreferencesController = {
  // Get user preferences
  async getUserPreferences(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      // Try to get from cache first
      const cached = await redisService.getNotificationPreferences(userId);
      if (cached) {
        return res.json({
          success: true,
          data: cached
        });
      }

      // Get from database
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId }
      });

      const defaultPreferences: NotificationPreferences = {
        email: true,
        sms: true,
        push: true,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        }
      };

      const userPreferences: NotificationPreferences = {
        email: preferences?.email ?? defaultPreferences.email,
        sms: preferences?.sms ?? defaultPreferences.sms,
        push: preferences?.push ?? defaultPreferences.push,
        quietHours: {
          enabled: preferences?.quietHoursEnabled ?? defaultPreferences.quietHours.enabled,
          start: preferences?.quietHoursStart ?? defaultPreferences.quietHours.start,
          end: preferences?.quietHoursEnd ?? defaultPreferences.quietHours.end
        }
      };

      // Cache preferences
      await redisService.cacheNotificationPreferences(userId, userPreferences);

      res.json({
        success: true,
        data: userPreferences
      });
    } catch (error) {
      logger.error('Failed to get user preferences', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get user preferences'
      });
    }
  },

  // Update user preferences
  async updateUserPreferences(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { email, sms, push, quietHours } = req.body;

      // Validate quiet hours if provided
      if (quietHours) {
        if (quietHours.enabled && (!quietHours.start || !quietHours.end)) {
          return res.status(400).json({
            success: false,
            error: 'Start and end times are required when quiet hours are enabled'
          });
        }

        if (quietHours.start && quietHours.end) {
          const startTime = new Date(`2000-01-01T${quietHours.start}`);
          const endTime = new Date(`2000-01-01T${quietHours.end}`);
          
          if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            return res.status(400).json({
              success: false,
              error: 'Invalid time format. Use HH:MM format'
            });
          }
        }
      }

      // Update or create preferences
      const preferences = await prisma.notificationPreference.upsert({
        where: { userId },
        update: {
          email: email !== undefined ? email : undefined,
          sms: sms !== undefined ? sms : undefined,
          push: push !== undefined ? push : undefined,
          quietHoursEnabled: quietHours?.enabled !== undefined ? quietHours.enabled : undefined,
          quietHoursStart: quietHours?.start || undefined,
          quietHoursEnd: quietHours?.end || undefined,
          updatedAt: new Date()
        },
        create: {
          userId,
          email: email !== undefined ? email : true,
          sms: sms !== undefined ? sms : true,
          push: push !== undefined ? push : true,
          quietHoursEnabled: quietHours?.enabled || false,
          quietHoursStart: quietHours?.start || '22:00',
          quietHoursEnd: quietHours?.end || '08:00'
        }
      });

      // Clear cache
      await redisService.del(`notification_preferences:${userId}`);

      logger.info('User preferences updated', {
        userId,
        email: preferences.email,
        sms: preferences.sms,
        push: preferences.push,
        quietHoursEnabled: preferences.quietHoursEnabled
      });

      res.json({
        success: true,
        data: {
          email: preferences.email,
          sms: preferences.sms,
          push: preferences.push,
          quietHours: {
            enabled: preferences.quietHoursEnabled,
            start: preferences.quietHoursStart,
            end: preferences.quietHoursEnd
          }
        }
      });
    } catch (error) {
      logger.error('Failed to update user preferences', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update user preferences'
      });
    }
  },

  // Delete user preferences (reset to defaults)
  async deleteUserPreferences(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      await prisma.notificationPreference.delete({
        where: { userId }
      });

      // Clear cache
      await redisService.del(`notification_preferences:${userId}`);

      logger.info('User preferences deleted', {
        userId
      });

      res.json({
        success: true,
        message: 'User preferences deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete user preferences', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to delete user preferences'
      });
    }
  },

  // Get all user preferences (admin only)
  async getAllUserPreferences(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, email, sms, push } = req.query;
      
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const where: any = {};
      if (email !== undefined) where.email = email === 'true';
      if (sms !== undefined) where.sms = sms === 'true';
      if (push !== undefined) where.push = push === 'true';

      const [preferences, total] = await Promise.all([
        prisma.notificationPreference.findMany({
          where,
          skip,
          take: parseInt(limit as string),
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.notificationPreference.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          preferences,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            pages: Math.ceil(total / parseInt(limit as string))
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get all user preferences', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get all user preferences'
      });
    }
  },

  // Bulk update preferences (admin only)
  async bulkUpdatePreferences(req: Request, res: Response) {
    try {
      const { userIds, preferences } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'User IDs array is required'
        });
      }

      if (!preferences || typeof preferences !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Preferences object is required'
        });
      }

      const updates = userIds.map(userId => 
        prisma.notificationPreference.upsert({
          where: { userId },
          update: {
            email: preferences.email !== undefined ? preferences.email : undefined,
            sms: preferences.sms !== undefined ? preferences.sms : undefined,
            push: preferences.push !== undefined ? preferences.push : undefined,
            quietHoursEnabled: preferences.quietHours?.enabled !== undefined ? preferences.quietHours.enabled : undefined,
            quietHoursStart: preferences.quietHours?.start || undefined,
            quietHoursEnd: preferences.quietHours?.end || undefined,
            updatedAt: new Date()
          },
          create: {
            userId,
            email: preferences.email !== undefined ? preferences.email : true,
            sms: preferences.sms !== undefined ? preferences.sms : true,
            push: preferences.push !== undefined ? preferences.push : true,
            quietHoursEnabled: preferences.quietHours?.enabled || false,
            quietHoursStart: preferences.quietHours?.start || '22:00',
            quietHoursEnd: preferences.quietHours?.end || '08:00'
          }
        })
      );

      await prisma.$transaction(updates);

      // Clear cache for all updated users
      await Promise.all(
        userIds.map(userId => redisService.del(`notification_preferences:${userId}`))
      );

      logger.info('Bulk preferences updated', {
        userIds,
        preferences
      });

      res.json({
        success: true,
        message: `Updated preferences for ${userIds.length} users`
      });
    } catch (error) {
      logger.error('Failed to bulk update preferences', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to bulk update preferences'
      });
    }
  }
}; 