import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { 
      recipient_id, 
      recipient_type, 
      notification_type, 
      title, 
      message, 
      data,
      priority = 'normal',
      scheduled_for 
    } = req.body;

    // Validate required fields
    if (!recipient_id || !recipient_type || !notification_type || !title || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient ID, recipient type, notification type, title, and message are required' 
      });
    }

    // Validate recipient type
    if (!['user', 'staff', 'branch'].includes(recipient_type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient type must be user, staff, or branch' 
      });
    }

    // Validate notification type
    if (!['queue_update', 'crowd_alert', 'feedback_response', 'system_alert', 'reminder'].includes(notification_type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid notification type' 
      });
    }

    // Validate priority
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Priority must be low, normal, high, or urgent' 
      });
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        recipient_id,
        recipient_type,
        notification_type,
        title,
        message,
        data: data || {},
        priority,
        scheduled_for: scheduled_for ? new Date(scheduled_for) : null
      }
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
};

export const getNotificationsByRecipient = async (req: Request, res: Response) => {
  try {
    const { recipient_id, recipient_type } = req.params;
    const { status, notification_type, limit = 50, offset = 0 } = req.query;

    const where: any = { 
      recipient_id, 
      recipient_type 
    };

    if (status) {
      where.status = status;
    }

    if (notification_type) {
      where.notification_type = notification_type;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        status: 'read',
        read_at: new Date()
      }
    });

    res.json({ success: true, data: updatedNotification });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const { recipient_id, recipient_type } = req.params;

    const result = await prisma.notification.updateMany({
      where: {
        recipient_id,
        recipient_type,
        status: 'unread'
      },
      data: {
        status: 'read',
        read_at: new Date()
      }
    });

    res.json({ success: true, data: { updated_count: result.count } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    await prisma.notification.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
};

export const getNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const { recipient_id, recipient_type } = req.params;

    const preferences = await prisma.notificationPreference.findFirst({
      where: {
        recipient_id,
        recipient_type
      }
    });

    if (!preferences) {
      return res.status(404).json({ success: false, error: 'Notification preferences not found' });
    }

    res.json({ success: true, data: preferences });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch notification preferences' });
  }
};

export const updateNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const { recipient_id, recipient_type } = req.params;
    const { 
      email_enabled, 
      sms_enabled, 
      push_enabled, 
      queue_updates, 
      crowd_alerts, 
      feedback_responses, 
      system_alerts,
      quiet_hours_start,
      quiet_hours_end
    } = req.body;

    // Validate quiet hours if provided
    if (quiet_hours_start && quiet_hours_end) {
      const start = new Date(`2000-01-01T${quiet_hours_start}`);
      const end = new Date(`2000-01-01T${quiet_hours_end}`);
      
      if (start >= end) {
        return res.status(400).json({ 
          success: false, 
          error: 'Quiet hours start must be before end time' 
        });
      }
    }

    const preferences = await prisma.notificationPreference.upsert({
      where: {
        recipient_id_recipient_type: {
          recipient_id,
          recipient_type
        }
      },
      update: {
        email_enabled,
        sms_enabled,
        push_enabled,
        queue_updates,
        crowd_alerts,
        feedback_responses,
        system_alerts,
        quiet_hours_start,
        quiet_hours_end
      },
      create: {
        recipient_id,
        recipient_type,
        email_enabled: email_enabled ?? true,
        sms_enabled: sms_enabled ?? false,
        push_enabled: push_enabled ?? true,
        queue_updates: queue_updates ?? true,
        crowd_alerts: crowd_alerts ?? true,
        feedback_responses: feedback_responses ?? true,
        system_alerts: system_alerts ?? true,
        quiet_hours_start,
        quiet_hours_end
      }
    });

    res.json({ success: true, data: preferences });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update notification preferences' });
  }
};

export const getNotificationStats = async (req: Request, res: Response) => {
  try {
    const { recipient_id, recipient_type } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const notifications = await prisma.notification.findMany({
      where: {
        recipient_id,
        recipient_type,
        created_at: {
          gte: startDate
        }
      }
    });

    const stats = {
      total_notifications: notifications.length,
      unread_count: notifications.filter(n => n.status === 'unread').length,
      read_count: notifications.filter(n => n.status === 'read').length,
      by_type: notifications.reduce((acc, n) => {
        acc[n.notification_type] = (acc[n.notification_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_priority: notifications.reduce((acc, n) => {
        acc[n.priority] = (acc[n.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      daily_trends: notifications.reduce((acc, n) => {
        const date = n.created_at.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch notification stats' });
  }
};

export const sendBulkNotification = async (req: Request, res: Response) => {
  try {
    const { 
      recipient_ids, 
      recipient_type, 
      notification_type, 
      title, 
      message, 
      data,
      priority = 'normal',
      scheduled_for 
    } = req.body;

    // Validate required fields
    if (!recipient_ids || !Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient IDs array is required and must not be empty' 
      });
    }

    if (!recipient_type || !notification_type || !title || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient type, notification type, title, and message are required' 
      });
    }

    // Create notifications for all recipients
    const notifications = await Promise.all(
      recipient_ids.map(recipient_id =>
        prisma.notification.create({
          data: {
            recipient_id,
            recipient_type,
            notification_type,
            title,
            message,
            data: data || {},
            priority,
            scheduled_for: scheduled_for ? new Date(scheduled_for) : null
          }
        })
      )
    );

    res.status(201).json({ 
      success: true, 
      data: { 
        notifications,
        total_sent: notifications.length 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send bulk notifications' });
  }
}; 