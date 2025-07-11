import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CrowdData {
  branch_id: string;
  people_count: number;
  source?: string;
  notes?: string;
}

export interface CrowdAnalytics {
  total_records: number;
  average_people: number;
  max_people: number;
  min_people: number;
  peak_hours: Record<number, number>;
  trends: {
    hourly: Record<number, number>;
    daily: Record<string, number>;
  };
}

export class CrowdService {
  static async recordCrowdData(data: CrowdData) {
    try {
      // Validate required fields
      if (!data.branch_id || data.people_count === undefined) {
        throw new Error('Branch ID and people count are required');
      }

      // Validate people count
      if (data.people_count < 0) {
        throw new Error('People count cannot be negative');
      }

      // Record crowd data
      const crowdData = await prisma.branchCrowd.create({
        data: {
          branch_id: data.branch_id,
          people_count: data.people_count,
          source: data.source || 'manual',
          notes: data.notes
        }
      });

      // Check for alerts
      await this.checkAndCreateAlerts(data.branch_id, data.people_count);

      return { success: true, data: crowdData };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to record crowd data' };
    }
  }

  static async getCurrentCrowd(branchId: string) {
    try {
      const currentCrowd = await prisma.branchCrowd.findFirst({
        where: { branch_id: branchId },
        orderBy: { timestamp: 'desc' }
      });

      if (!currentCrowd) {
        throw new Error('No crowd data found for this branch');
      }

      return { success: true, data: currentCrowd };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch current crowd data' };
    }
  }

  static async getCrowdHistory(branchId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    try {
      const where: any = { branch_id: branchId };

      if (options?.startDate && options?.endDate) {
        where.timestamp = {
          gte: options.startDate,
          lte: options.endDate
        };
      }

      const history = await prisma.branchCrowd.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options?.limit || 100
      });

      return { success: true, data: history };
    } catch (error) {
      return { success: false, error: 'Failed to fetch crowd history' };
    }
  }

  static async getCrowdAnalytics(branchId: string, days: number = 7): Promise<{ success: boolean; data?: CrowdAnalytics; error?: string }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const crowdData = await prisma.branchCrowd.findMany({
        where: {
          branch_id: branchId,
          timestamp: {
            gte: startDate
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      if (crowdData.length === 0) {
        return { success: true, data: { 
          total_records: 0,
          average_people: 0,
          max_people: 0,
          min_people: 0,
          peak_hours: {},
          trends: { hourly: {}, daily: {} }
        }};
      }

      const hourlyTrends: Record<number, number> = {};
      const dailyTrends: Record<string, number> = {};

      crowdData.forEach(record => {
        const date = new Date(record.timestamp);
        const hour = date.getHours();
        const dayKey = date.toISOString().split('T')[0];

        if (hour !== undefined) {
          hourlyTrends[hour] = (hourlyTrends[hour] || 0) + record.people_count;
        }
        if (dayKey !== undefined) {
          dailyTrends[dayKey] = (dailyTrends[dayKey] || 0) + record.people_count;
        }
      });

      const analytics: CrowdAnalytics = {
        total_records: crowdData.length,
        average_people: Math.round(crowdData.reduce((sum, record) => sum + record.people_count, 0) / crowdData.length),
        max_people: Math.max(...crowdData.map(record => record.people_count)),
        min_people: Math.min(...crowdData.map(record => record.people_count)),
        peak_hours: hourlyTrends,
        trends: {
          hourly: hourlyTrends,
          daily: dailyTrends
        }
      };

      return { success: true, data: analytics };
    } catch (error) {
      return { success: false, error: 'Failed to fetch crowd analytics' };
    }
  }

  static async checkAndCreateAlerts(branchId: string, peopleCount: number) {
    try {
      // Check for unusual patterns (e.g., sudden drop or spike)
      const recentData = await prisma.branchCrowd.findMany({
        where: {
          branch_id: branchId,
          timestamp: {
            gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 3
      });

      if (recentData.length >= 2) {
        const current = recentData[0]?.people_count;
        const previous = recentData[1]?.people_count;
        
        if (current !== undefined && previous !== undefined) {
          const change = Math.abs(current - previous);
          const changePercent = (change / previous) * 100;

          // Alert if there's a significant change (>50% in 30 minutes)
          if (changePercent > 50 && previous > 0) {
            const existingAlert = await prisma.crowdAlert.findFirst({
              where: {
                branch_id: branchId,
                alert_type: 'UNUSUAL_PATTERN',
                resolved_at: null
              }
            });

            if (!existingAlert) {
              await prisma.crowdAlert.create({
                data: {
                  branch_id: branchId,
                  alert_type: 'UNUSUAL_PATTERN',
                  message: `Unusual crowd pattern detected: ${previous} → ${current} (${changePercent.toFixed(1)}% change)`,
                  triggered_at: new Date()
                }
              });
            }
          }
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to check and create alerts' };
    }
  }

  static async getActiveAlerts(branchId?: string) {
    try {
      const where: any = { resolved_at: null };
      
      if (branchId) {
        where.branch_id = branchId;
      }

      const alerts = await prisma.crowdAlert.findMany({
        where,
        orderBy: { triggered_at: 'desc' }
      });

      return { success: true, data: alerts };
    } catch (error) {
      return { success: false, error: 'Failed to fetch active alerts' };
    }
  }

  static async resolveAlert(alertId: string, resolvedBy?: string, resolutionNotes?: string) {
    try {
      const alert = await prisma.crowdAlert.findUnique({
        where: { id: alertId }
      });

      if (!alert) {
        throw new Error('Alert not found');
      }

      if (alert.resolved_at) {
        throw new Error('Alert is already resolved');
      }

      const updatedAlert = await prisma.crowdAlert.update({
        where: { id: alertId },
        data: {
          resolved_at: new Date(),
          resolved_by: resolvedBy,
          message: resolutionNotes ? `${alert.message} - Resolution: ${resolutionNotes}` : alert.message
        }
      });

      return { success: true, data: updatedAlert };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to resolve alert' };
    }
  }
} 