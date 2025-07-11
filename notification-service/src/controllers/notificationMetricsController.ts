import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { elasticsearchService } from '../config/elasticsearch';
import { redisService } from '../config/redis';
import logger from '../config/winston';

const prisma = new PrismaClient();

export const notificationMetricsController = {
  // Get overall notification metrics
  async getOverallMetrics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get metrics from Elasticsearch
      const metrics = await elasticsearchService.getNotificationMetrics({ startDate: start, endDate: end });

      // Get additional metrics from database
      const totalNotifications = await prisma.notification.count({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        }
      });

      const deliveredNotifications = await prisma.notification.count({
        where: {
          status: 'delivered',
          createdAt: {
            gte: start,
            lte: end
          }
        }
      });

      const failedNotifications = await prisma.notification.count({
        where: {
          status: 'failed',
          createdAt: {
            gte: start,
            lte: end
          }
        }
      });

      const pendingNotifications = await prisma.notification.count({
        where: {
          status: 'pending',
          createdAt: {
            gte: start,
            lte: end
          }
        }
      });

      res.json({
        success: true,
        data: {
          timeRange: { start, end },
          overall: {
            total: totalNotifications,
            delivered: deliveredNotifications,
            failed: failedNotifications,
            pending: pendingNotifications,
            successRate: totalNotifications > 0 ? (deliveredNotifications / totalNotifications) * 100 : 0
          },
          external: metrics
        }
      });
    } catch (error) {
      logger.error('Failed to get overall metrics', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get metrics'
      });
    }
  },

  // Get metrics by notification type
  async getMetricsByType(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const metrics = await prisma.notification.groupBy({
        by: ['type', 'status'],
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        _count: {
          id: true
        }
      });

      const result = metrics.reduce((acc, metric) => {
        if (!acc[metric.type]) {
          acc[metric.type] = { total: 0, delivered: 0, failed: 0, pending: 0 };
        }
        
        acc[metric.type][metric.status] = metric._count.id;
        acc[metric.type].total += metric._count.id;
        
        return acc;
      }, {} as Record<string, any>);

      // Calculate success rates
      Object.keys(result).forEach(type => {
        const data = result[type];
        data.successRate = data.total > 0 ? (data.delivered / data.total) * 100 : 0;
      });

      res.json({
        success: true,
        data: {
          timeRange: { start, end },
          byType: result
        }
      });
    } catch (error) {
      logger.error('Failed to get metrics by type', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get metrics by type'
      });
    }
  },

  // Get user-specific metrics
  async getUserMetrics(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          createdAt: {
            gte: start,
            lte: end
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const metrics = {
        total: notifications.length,
        delivered: notifications.filter(n => n.status === 'delivered').length,
        failed: notifications.filter(n => n.status === 'failed').length,
        pending: notifications.filter(n => n.status === 'pending').length,
        byType: notifications.reduce((acc, notification) => {
          if (!acc[notification.type]) {
            acc[notification.type] = { total: 0, delivered: 0, failed: 0, pending: 0 };
          }
          
          acc[notification.type][notification.status]++;
          acc[notification.type].total++;
          
          return acc;
        }, {} as Record<string, any>)
      };

      // Calculate success rates
      metrics.byType = Object.keys(metrics.byType).reduce((acc, type) => {
        const data = metrics.byType[type];
        acc[type] = {
          ...data,
          successRate: data.total > 0 ? (data.delivered / data.total) * 100 : 0
        };
        return acc;
      }, {} as Record<string, any>);

      res.json({
        success: true,
        data: {
          userId,
          timeRange: { start, end },
          metrics
        }
      });
    } catch (error) {
      logger.error('Failed to get user metrics', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get user metrics'
      });
    }
  },

  // Get delivery performance metrics
  async getDeliveryPerformance(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get delivery times from notifications with deliveredAt timestamp
      const deliveredNotifications = await prisma.notification.findMany({
        where: {
          status: 'delivered',
          deliveredAt: {
            not: null
          },
          createdAt: {
            gte: start,
            lte: end
          }
        },
        select: {
          id: true,
          type: true,
          createdAt: true,
          deliveredAt: true
        }
      });

      const deliveryTimes = deliveredNotifications.map(notification => {
        const deliveryTime = notification.deliveredAt!.getTime() - notification.createdAt.getTime();
        return {
          type: notification.type,
          deliveryTime
        };
      });

      const performanceMetrics = {
        averageDeliveryTime: deliveryTimes.length > 0 
          ? deliveryTimes.reduce((sum, item) => sum + item.deliveryTime, 0) / deliveryTimes.length 
          : 0,
        byType: deliveryTimes.reduce((acc, item) => {
          if (!acc[item.type]) {
            acc[item.type] = { count: 0, totalTime: 0, averageTime: 0 };
          }
          
          acc[item.type].count++;
          acc[item.type].totalTime += item.deliveryTime;
          acc[item.type].averageTime = acc[item.type].totalTime / acc[item.type].count;
          
          return acc;
        }, {} as Record<string, any>),
        percentiles: {
          p50: calculatePercentile(deliveryTimes.map(d => d.deliveryTime), 50),
          p90: calculatePercentile(deliveryTimes.map(d => d.deliveryTime), 90),
          p95: calculatePercentile(deliveryTimes.map(d => d.deliveryTime), 95),
          p99: calculatePercentile(deliveryTimes.map(d => d.deliveryTime), 99)
        }
      };

      res.json({
        success: true,
        data: {
          timeRange: { start, end },
          performance: performanceMetrics
        }
      });
    } catch (error) {
      logger.error('Failed to get delivery performance', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get delivery performance'
      });
    }
  },

  // Get error logs
  async getErrorLogs(req: Request, res: Response) {
    try {
      const { startDate, endDate, limit = 100 } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const errorLogs = await elasticsearchService.getErrorLogs({ startDate: start, endDate: end });

      res.json({
        success: true,
        data: {
          timeRange: { start, end },
          errors: errorLogs.slice(0, parseInt(limit as string))
        }
      });
    } catch (error) {
      logger.error('Failed to get error logs', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get error logs'
      });
    }
  },

  // Get service health metrics
  async getServiceHealth(req: Request, res: Response) {
    try {
      const healthChecks = await Promise.allSettled([
        redisService.client.ping(),
        elasticsearchService.client.ping(),
        rabbitMQService.connection ? Promise.resolve('connected') : Promise.reject('disconnected')
      ]);

      const healthStatus = {
        redis: healthChecks[0].status === 'fulfilled' && healthChecks[0].value === 'PONG' ? 'healthy' : 'unhealthy',
        elasticsearch: healthChecks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        rabbitmq: healthChecks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy'
      };

      const isHealthy = Object.values(healthStatus).every(status => status === 'healthy');

      res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          overall: isHealthy ? 'healthy' : 'unhealthy',
          services: healthStatus
        }
      });
    } catch (error) {
      logger.error('Failed to get service health', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get service health'
      });
    }
  }
};

// Helper function to calculate percentile
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
} 