import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { advancedAnalyticsService } from '../services/advancedAnalyticsService';
import logger from '../config/winston';

const prisma = new PrismaClient();

const router = Router();

// GET /api/analytics/trends
router.get('/trends', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate ? new Date(endDate as string) : new Date();

    const trends = await advancedAnalyticsService.getDeliveryTrends({
      startDate: start,
      endDate: end
    });

    res.json({
      success: true,
      data: {
        timeRange: { start, end },
        trends
      }
    });
  } catch (error) {
    logger.error('Failed to get delivery trends', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get delivery trends'
    });
  }
});

// GET /api/analytics/predictive
router.get('/predictive', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const end = endDate ? new Date(endDate as string) : new Date();

    const predictiveMetrics = await advancedAnalyticsService.getPredictiveMetrics({
      startDate: start,
      endDate: end
    });

    res.json({
      success: true,
      data: {
        timeRange: { start, end },
        predictive: predictiveMetrics
      }
    });
  } catch (error) {
    logger.error('Failed to get predictive metrics', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get predictive metrics'
    });
  }
});

// GET /api/analytics/optimization
router.get('/optimization', async (req, res) => {
  try {
    const optimization = await advancedAnalyticsService.getPerformanceOptimization();

    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    logger.error('Failed to get performance optimization', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get performance optimization'
    });
  }
});

// GET /api/analytics/realtime
router.get('/realtime', async (req, res) => {
  try {
    const dashboard = await advancedAnalyticsService.getRealTimeDashboard();

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Failed to get real-time dashboard', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get real-time dashboard'
    });
  }
});

// GET /api/analytics/health
router.get('/health', async (req, res) => {
  try {
    // Get basic health metrics
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentNotifications = await prisma.notification.count({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      }
    });

    const recentFailures = await prisma.notification.count({
      where: {
        status: 'failed',
        createdAt: {
          gte: oneHourAgo
        }
      }
    });

    const failureRate = recentNotifications > 0 ? (recentFailures / recentNotifications) * 100 : 0;

    const health = {
      status: failureRate < 5 ? 'healthy' : failureRate < 10 ? 'warning' : 'critical',
      metrics: {
        notificationsLastHour: recentNotifications,
        failuresLastHour: recentFailures,
        failureRate,
        timestamp: now
      }
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Failed to get health metrics', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get health metrics'
    });
  }
});

export default router; 