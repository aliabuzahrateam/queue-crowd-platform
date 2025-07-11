import { Router } from 'express';
import {
  sendNotification,
  getNotificationsByRecipient,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationStats,
  sendBulkNotification
} from '../controllers/notificationController';
import { 
  validateNotificationData, 
  validateNotificationPreferences, 
  validateBulkNotification 
} from '../middleware/validation';

const router = Router();

// POST /api/notifications/send
router.post('/send', validateNotificationData, sendNotification);

// POST /api/notifications/bulk
router.post('/bulk', validateBulkNotification, sendBulkNotification);

// GET /api/notifications/:recipient_type/:recipient_id
router.get('/:recipient_type/:recipient_id', getNotificationsByRecipient);

// PUT /api/notifications/:id/read
router.put('/:id/read', markNotificationAsRead);

// PUT /api/notifications/:recipient_type/:recipient_id/read-all
router.put('/:recipient_type/:recipient_id/read-all', markAllNotificationsAsRead);

// DELETE /api/notifications/:id
router.delete('/:id', deleteNotification);

// GET /api/notifications/:recipient_type/:recipient_id/preferences
router.get('/:recipient_type/:recipient_id/preferences', getNotificationPreferences);

// PUT /api/notifications/:recipient_type/:recipient_id/preferences
router.put('/:recipient_type/:recipient_id/preferences', validateNotificationPreferences, updateNotificationPreferences);

// GET /api/notifications/:recipient_type/:recipient_id/stats
router.get('/:recipient_type/:recipient_id/stats', getNotificationStats);

export default router; 