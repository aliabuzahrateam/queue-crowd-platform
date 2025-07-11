import { Router } from 'express';
import notificationRoutes from './notifications';
import notificationPreferencesRoutes from './notificationPreferences';
import notificationTemplatesRoutes from './notificationTemplates';
import notificationMetricsRoutes from './notificationMetrics';
import advancedAnalyticsRoutes from './advancedAnalytics';

const router = Router();

// Mount all notification service routes
router.use('/notifications', notificationRoutes);
router.use('/notification-preferences', notificationPreferencesRoutes);
router.use('/notification-templates', notificationTemplatesRoutes);
router.use('/notification-metrics', notificationMetricsRoutes);
router.use('/analytics', advancedAnalyticsRoutes);

export default router; 