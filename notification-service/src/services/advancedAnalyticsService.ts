import { PrismaClient } from '@prisma/client';
import { elasticsearchService } from '../config/elasticsearch';
import { redisService } from '../config/redis';
import logger from '../config/winston';

const prisma = new PrismaClient();

export interface AnalyticsTimeframe {
  startDate: Date;
  endDate: Date;
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface PredictiveMetrics {
  predictedDeliveryRate: number;
  predictedFailureRate: number;
  confidenceLevel: number;
  factors: string[];
}

export interface PerformanceOptimization {
  recommendations: string[];
  estimatedImprovement: number;
  priority: 'high' | 'medium' | 'low';
}

export class AdvancedAnalyticsService {
  
  // Get delivery trends over time
  async getDeliveryTrends(timeframe: AnalyticsTimeframe): Promise<TrendData[]> {
    try {
      const { startDate, endDate } = timeframe;
      
      // Get daily delivery rates
      const dailyMetrics = await prisma.notification.groupBy({
        by: ['createdAt', 'status'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        }
      });

      // Group by date and calculate daily success rates
      const dailyData = dailyMetrics.reduce((acc, metric) => {
        const date = metric.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { delivered: 0, total: 0 };
        }
        
        acc[date].total += metric._count.id;
        if (metric.status === 'delivered') {
          acc[date].delivered += metric._count.id;
        }
        
        return acc;
      }, {} as Record<string, { delivered: number; total: number }>);

      // Convert to trend data
      const trendData: TrendData[] = Object.keys(dailyData)
        .sort()
        .map((date, index, dates) => {
          const data = dailyData[date];
          const successRate = data.total > 0 ? (data.delivered / data.total) * 100 : 0;
          
          let change = 0;
          let changePercent = 0;
          
          if (index > 0) {
            const prevDate = dates[index - 1];
            const prevData = dailyData[prevDate];
            const prevRate = prevData.total > 0 ? (prevData.delivered / prevData.total) * 100 : 0;
            change = successRate - prevRate;
            changePercent = prevRate > 0 ? (change / prevRate) * 100 : 0;
          }
          
          return {
            period: date,
            value: successRate,
            change,
            changePercent
          };
        });

      return trendData;
    } catch (error) {
      logger.error('Failed to get delivery trends', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Get predictive analytics for delivery rates
  async getPredictiveMetrics(timeframe: AnalyticsTimeframe): Promise<PredictiveMetrics> {
    try {
      const { startDate, endDate } = timeframe;
      
      // Get historical data for analysis
      const historicalData = await prisma.notification.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          status: true,
          type: true,
          createdAt: true,
          deliveryTime: true
        }
      });

      // Calculate baseline metrics
      const total = historicalData.length;
      const delivered = historicalData.filter(n => n.status === 'delivered').length;
      const failed = historicalData.filter(n => n.status === 'failed').length;
      
      const baselineDeliveryRate = total > 0 ? delivered / total : 0;
      const baselineFailureRate = total > 0 ? failed / total : 0;

      // Simple linear regression for prediction (in production, use more sophisticated ML)
      const recentData = historicalData.slice(-30); // Last 30 records
      const recentDeliveryRate = recentData.length > 0 
        ? recentData.filter(n => n.status === 'delivered').length / recentData.length 
        : baselineDeliveryRate;

      // Calculate trend
      const trend = recentDeliveryRate - baselineDeliveryRate;
      
      // Predict next period (simple extrapolation)
      const predictedDeliveryRate = Math.max(0, Math.min(100, baselineDeliveryRate + trend));
      const predictedFailureRate = Math.max(0, Math.min(100, 1 - predictedDeliveryRate));
      
      // Calculate confidence based on data consistency
      const variance = this.calculateVariance(historicalData.map(n => n.status === 'delivered' ? 1 : 0));
      const confidenceLevel = Math.max(0.5, Math.min(0.95, 1 - variance));

      // Identify factors affecting delivery
      const factors = this.identifyDeliveryFactors(historicalData);

      return {
        predictedDeliveryRate: predictedDeliveryRate * 100,
        predictedFailureRate: predictedFailureRate * 100,
        confidenceLevel,
        factors
      };
    } catch (error) {
      logger.error('Failed to get predictive metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Get performance optimization recommendations
  async getPerformanceOptimization(): Promise<PerformanceOptimization> {
    try {
      const recommendations: string[] = [];
      let estimatedImprovement = 0;

      // Analyze recent failures
      const recentFailures = await prisma.notification.findMany({
        where: {
          status: 'failed',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: {
          type: true,
          errorMessage: true,
          createdAt: true
        }
      });

      // Analyze delivery times
      const deliveryTimes = await prisma.notification.findMany({
        where: {
          status: 'delivered',
          deliveryTime: {
            not: null
          },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last week
          }
        },
        select: {
          deliveryTime: true,
          type: true
        }
      });

      // Check for common failure patterns
      const failurePatterns = this.analyzeFailurePatterns(recentFailures);
      if (failurePatterns.email > 0.1) { // More than 10% email failures
        recommendations.push('Email service experiencing high failure rate - check SMTP configuration');
        estimatedImprovement += 5;
      }

      if (failurePatterns.sms > 0.1) {
        recommendations.push('SMS service experiencing high failure rate - check SMS provider configuration');
        estimatedImprovement += 5;
      }

      // Check for slow delivery times
      const avgDeliveryTime = deliveryTimes.reduce((sum, n) => sum + (n.deliveryTime || 0), 0) / deliveryTimes.length;
      if (avgDeliveryTime > 5000) { // More than 5 seconds
        recommendations.push('Average delivery time is high - consider optimizing notification processing');
        estimatedImprovement += 3;
      }

      // Check for queue bottlenecks
      const pendingCount = await prisma.notification.count({
        where: {
          status: 'pending',
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        }
      });

      if (pendingCount > 100) {
        recommendations.push('High number of pending notifications - consider scaling notification workers');
        estimatedImprovement += 8;
      }

      // Check for type-specific issues
      const typeAnalysis = await this.analyzeTypePerformance();
      Object.entries(typeAnalysis).forEach(([type, data]) => {
        if (data.failureRate > 0.15) { // More than 15% failure rate
          recommendations.push(`${type.toUpperCase()} notifications have high failure rate - investigate ${type} service`);
          estimatedImprovement += 4;
        }
      });

      // Determine priority
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (estimatedImprovement > 10) priority = 'high';
      else if (estimatedImprovement > 5) priority = 'medium';

      return {
        recommendations,
        estimatedImprovement,
        priority
      };
    } catch (error) {
      logger.error('Failed to get performance optimization', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Get real-time analytics dashboard data
  async getRealTimeDashboard() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get recent activity
      const recentNotifications = await prisma.notification.count({
        where: {
          createdAt: {
            gte: oneHourAgo
          }
        }
      });

      const recentDelivered = await prisma.notification.count({
        where: {
          status: 'delivered',
          createdAt: {
            gte: oneHourAgo
          }
        }
      });

      const recentFailed = await prisma.notification.count({
        where: {
          status: 'failed',
          createdAt: {
            gte: oneHourAgo
          }
        }
      });

      // Get hourly breakdown
      const hourlyData = await this.getHourlyBreakdown(oneDayAgo, now);

      // Get top performing channels
      const channelPerformance = await this.getChannelPerformance(oneDayAgo, now);

      // Get error summary
      const errorSummary = await this.getErrorSummary(oneDayAgo, now);

      return {
        realTime: {
          notificationsLastHour: recentNotifications,
          deliveredLastHour: recentDelivered,
          failedLastHour: recentFailed,
          successRateLastHour: recentNotifications > 0 ? (recentDelivered / recentNotifications) * 100 : 0
        },
        hourly: hourlyData,
        channels: channelPerformance,
        errors: errorSummary
      };
    } catch (error) {
      logger.error('Failed to get real-time dashboard', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Private helper methods
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return variance;
  }

  private identifyDeliveryFactors(data: any[]): string[] {
    const factors: string[] = [];
    
    // Check for time-based patterns
    const hourCounts = data.reduce((acc, notification) => {
      const hour = notification.createdAt.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakHour = Object.entries(hourCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    if (parseInt(peakHour) >= 9 && parseInt(peakHour) <= 17) {
      factors.push('Business hours show higher delivery rates');
    }

    // Check for type-based patterns
    const typeCounts = data.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (typeCounts.email > typeCounts.sms) {
      factors.push('Email notifications have higher volume');
    }

    return factors;
  }

  private analyzeFailurePatterns(failures: any[]): Record<string, number> {
    const patterns: Record<string, number> = {};
    
    failures.forEach(failure => {
      patterns[failure.type] = (patterns[failure.type] || 0) + 1;
    });

    const total = failures.length;
    Object.keys(patterns).forEach(type => {
      patterns[type] = patterns[type] / total;
    });

    return patterns;
  }

  private async analyzeTypePerformance(): Promise<Record<string, any>> {
    const typeMetrics = await prisma.notification.groupBy({
      by: ['type', 'status'],
      _count: {
        id: true
      }
    });

    const result: Record<string, any> = {};
    
    typeMetrics.forEach(metric => {
      if (!result[metric.type]) {
        result[metric.type] = { total: 0, delivered: 0, failed: 0, pending: 0 };
      }
      
      result[metric.type][metric.status] = metric._count.id;
      result[metric.type].total += metric._count.id;
    });

    // Calculate failure rates
    Object.keys(result).forEach(type => {
      const data = result[type];
      data.failureRate = data.total > 0 ? data.failed / data.total : 0;
    });

    return result;
  }

  private async getHourlyBreakdown(startDate: Date, endDate: Date) {
    const notifications = await prisma.notification.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        createdAt: true,
        status: true
      }
    });

    const hourlyData: Record<number, { total: number; delivered: number; failed: number }> = {};
    
    notifications.forEach(notification => {
      const hour = notification.createdAt.getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { total: 0, delivered: 0, failed: 0 };
      }
      
      hourlyData[hour].total++;
      if (notification.status === 'delivered') {
        hourlyData[hour].delivered++;
      } else if (notification.status === 'failed') {
        hourlyData[hour].failed++;
      }
    });

    return hourlyData;
  }

  private async getChannelPerformance(startDate: Date, endDate: Date) {
    const channelMetrics = await prisma.notification.groupBy({
      by: ['type', 'status'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      }
    });

    const result: Record<string, any> = {};
    
    channelMetrics.forEach(metric => {
      if (!result[metric.type]) {
        result[metric.type] = { total: 0, delivered: 0, failed: 0, successRate: 0 };
      }
      
      result[metric.type][metric.status] = metric._count.id;
      result[metric.type].total += metric._count.id;
    });

    // Calculate success rates
    Object.keys(result).forEach(type => {
      const data = result[type];
      data.successRate = data.total > 0 ? (data.delivered / data.total) * 100 : 0;
    });

    return result;
  }

  private async getErrorSummary(startDate: Date, endDate: Date) {
    const errors = await prisma.notification.findMany({
      where: {
        status: 'failed',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        errorMessage: true,
        type: true
      }
    });

    const errorCounts: Record<string, number> = {};
    
    errors.forEach(error => {
      const errorType = error.errorMessage || 'Unknown error';
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    });

    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // Top 10 errors
      .map(([error, count]) => ({ error, count }));
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService(); 