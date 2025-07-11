import { Router } from 'express';
import { notificationMetricsController } from '../controllers/notificationMetricsController';
import { securityMiddleware } from '../middleware/security';
import { rateLimitMiddleware } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication to all metrics routes
router.use(securityMiddleware.authenticate);

// Get overall notification metrics
router.get('/overall', 
  rateLimitMiddleware.api,
  notificationMetricsController.getOverallMetrics
);

// Get metrics by notification type
router.get('/by-type', 
  rateLimitMiddleware.api,
  notificationMetricsController.getMetricsByType
);

// Get user-specific metrics
router.get('/user/:userId', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['read:metrics']),
  notificationMetricsController.getUserMetrics
);

// Get delivery performance metrics
router.get('/performance', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['read:metrics']),
  notificationMetricsController.getDeliveryPerformance
);

// Get error logs
router.get('/errors', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['read:logs']),
  notificationMetricsController.getErrorLogs
);

// Get service health metrics
router.get('/health', 
  rateLimitMiddleware.api,
  notificationMetricsController.getServiceHealth
);

export default router; 