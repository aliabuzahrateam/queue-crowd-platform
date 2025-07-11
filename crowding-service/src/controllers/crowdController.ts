import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const recordCrowdData = async (req: Request, res: Response) => {
  try {
    const { branch_id, people_count, source, notes } = req.body;

    // Validate required fields
    if (!branch_id || people_count === undefined) {
      return res.status(400).json({ success: false, error: 'Branch ID and people count are required' });
    }

    // Validate people count
    if (people_count < 0) {
      return res.status(400).json({ success: false, error: 'People count cannot be negative' });
    }

    // Check if branch exists
    const branch = await prisma.branchCrowd.findUnique({
      where: { id: branch_id }
    });

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    // Record crowd data
    const crowdData = await prisma.branchCrowd.create({
      data: {
        branch_id,
        people_count,
        source: source || 'manual',
        notes
      }
    });

    // Remove all code that tries to update or read 'current_capacity' or 'max_capacity'
    // Only use the fields available in BranchCrowd: people_count, timestamp, branch_id, source, notes
    // Remove all code that references 'branch.max_capacity' since the BranchCrowd model doesn't have this field
    // Remove or comment out the alert checking logic that depends on max_capacity
    // Check for alerts
    // if (people_count > branch.max_capacity) {
    //   await prisma.crowdAlert.create({
    //     data: {
    //       branch_id,
    //       alert_type: 'OVER_CAPACITY',
    //       message: `Branch is over capacity: ${people_count}/${branch.max_capacity}`,
    //       triggered_at: new Date()
    //     }
    //   });
    // }

    return res.status(201).json({ success: true, data: crowdData });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to record crowd data' });
  }
};

export const getCurrentCrowd = async (req: Request, res: Response) => {
  try {
    const { branch_id } = req.params;

    const currentCrowd = await prisma.branchCrowd.findFirst({
      where: { branch_id },
      orderBy: { timestamp: 'desc' }
    });

    if (!currentCrowd) {
      return res.status(404).json({ success: false, error: 'No crowd data found for this branch' });
    }

    return res.json({ success: true, data: currentCrowd });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch current crowd data' });
  }
};

export const getCrowdHistory = async (req: Request, res: Response) => {
  try {
    const { branch_id } = req.params;
    const { start_date, end_date, limit = 100 } = req.query;

    const where: any = { branch_id };

    if (start_date && end_date) {
      where.timestamp = {
        gte: new Date(start_date as string),
        lte: new Date(end_date as string)
      };
    }

    const history = await prisma.branchCrowd.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Number(limit)
    });

    return res.json({ success: true, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch crowd history' });
  }
};

export const getCrowdAnalytics = async (req: Request, res: Response) => {
  try {
    const { branch_id } = req.params;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const crowdData = await prisma.branchCrowd.findMany({
      where: {
        branch_id,
        timestamp: {
          gte: startDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (crowdData.length === 0) {
      return res.json({ success: true, data: { message: 'No crowd data available' } });
    }

    const analytics = {
      total_records: crowdData.length,
      average_people: Math.round(crowdData.reduce((sum, record) => sum + record.people_count, 0) / crowdData.length),
      max_people: Math.max(...crowdData.map(record => record.people_count)),
      min_people: Math.min(...crowdData.map(record => record.people_count)),
      peak_hours: crowdData.reduce((acc, record) => {
        const hour = new Date(record.timestamp).getHours();
        acc[hour] = (acc[hour] || 0) + record.people_count;
        return acc;
      }, {} as Record<number, number>)
    };

    return res.json({ success: true, data: analytics });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch crowd analytics' });
  }
};

export const getActiveAlerts = async (req: Request, res: Response) => {
  try {
    const { branch_id } = req.query;

    const where: any = { resolved_at: null };
    
    if (branch_id) {
      where.branch_id = branch_id;
    }

    const alerts = await prisma.crowdAlert.findMany({
      where,
      orderBy: { triggered_at: 'desc' }
    });

    return res.json({ success: true, data: alerts });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch active alerts' });
  }
};

export const resolveAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolved_by, resolution_notes } = req.body;

    const alert = await prisma.crowdAlert.findUnique({
      where: { id }
    });

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    if (alert.resolved_at) {
      return res.status(400).json({ success: false, error: 'Alert is already resolved' });
    }

    const updatedAlert = await prisma.crowdAlert.update({
      where: { id },
      data: {
        resolved_at: new Date(),
        resolved_by,
        message: resolution_notes ? `${alert.message} - Resolution: ${resolution_notes}` : alert.message
      }
    });

    return res.json({ success: true, data: updatedAlert });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to resolve alert' });
  }
}; 