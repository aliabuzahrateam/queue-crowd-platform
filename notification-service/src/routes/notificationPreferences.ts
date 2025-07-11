import { Router } from 'express';
import { notificationPreferencesController } from '../controllers/notificationPreferencesController';
import { securityMiddleware } from '../middleware/security';
import { rateLimitMiddleware } from '../middleware/rateLimiter';
import { validateNotificationPreferences } from '../middleware/validation';

const router = Router();

// Apply authentication to all preference routes
router.use(securityMiddleware.authenticate);

// Get user preferences
router.get('/user/:userId', 
  rateLimitMiddleware.api,
  notificationPreferencesController.getUserPreferences
);

// Update user preferences
router.put('/user/:userId', 
  rateLimitMiddleware.api,
  validateNotificationPreferences,
  notificationPreferencesController.updateUserPreferences
);

// Delete user preferences (reset to defaults)
router.delete('/user/:userId', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['delete:preferences']),
  notificationPreferencesController.deleteUserPreferences
);

// Get all user preferences (admin only)
router.get('/all', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['read:all_preferences']),
  notificationPreferencesController.getAllUserPreferences
);

// Bulk update preferences (admin only)
router.put('/bulk', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['update:all_preferences']),
  notificationPreferencesController.bulkUpdatePreferences
);

export default router; 