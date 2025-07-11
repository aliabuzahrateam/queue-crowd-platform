import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createBranch = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      address, 
      city, 
      state, 
      postal_code, 
      country, 
      phone, 
      email, 
      max_capacity,
      operating_hours 
    } = req.body;

    const branch = await prisma.branch.create({
      data: {
        name,
        address,
        city,
        state,
        postal_code,
        country,
        phone,
        email,
        max_capacity: max_capacity || 100,
        operating_hours: operating_hours || {},
        current_capacity: 0,
        is_active: true
      }
    });

    res.status(201).json({ success: true, data: branch });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create branch' });
  }
};

export const getAllBranches = async (req: Request, res: Response) => {
  try {
    const { 
      is_active, 
      city, 
      state, 
      country, 
      limit = 50, 
      offset = 0 
    } = req.query;

    const where: any = {};

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    if (city) {
      where.city = { contains: city as string, mode: 'insensitive' };
    }

    if (state) {
      where.state = { contains: state as string, mode: 'insensitive' };
    }

    if (country) {
      where.country = { contains: country as string, mode: 'insensitive' };
    }

    const branches = await prisma.branch.findMany({
      where,
      orderBy: { name: 'asc' },
      take: Number(limit),
      skip: Number(offset)
    });

    const total = await prisma.branch.count({ where });

    res.json({ 
      success: true, 
      data: branches,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch branches' });
  }
};

export const getBranchById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        service_types: true,
        staff: true,
        operating_hours: true,
        queues: true
      }
    });

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }
    return res.json({ success: true, data: branch });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateBranch = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const branch = await prisma.branch.findUnique({
      where: { id }
    });

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: updateData
    });

    return res.json({ success: true, data: updatedBranch });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update branch' });
  }
};

export const deleteBranch = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id }
    });

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    // Check if branch has active queues or staff
    const activeQueues = await prisma.queue.count({
      where: { branch_id: id, status: { in: ['WAITING', 'CALLED'] } }
    });

    const activeStaff = await prisma.staff.count({
      where: { branch_id: id, is_active: true }
    });

    if (activeQueues > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete branch with active queue tickets' 
      });
    }

    if (activeStaff > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete branch with active staff' 
      });
    }

    await prisma.branch.delete({
      where: { id }
    });

    return res.json({ success: true, message: 'Branch deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete branch' });
  }
};

export const getBranchesByLocation = async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    const { limit = 20 } = req.query;

    const branches = await prisma.branch.findMany({
      where: {
        OR: [
          { city: { contains: location, mode: 'insensitive' } },
          { state: { contains: location, mode: 'insensitive' } },
          { country: { contains: location, mode: 'insensitive' } }
        ],
        is_active: true
      },
      orderBy: { name: 'asc' },
      take: Number(limit)
    });

    res.json({ success: true, data: branches });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch branches by location' });
  }
};

export const getBranchStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    // Get branch info
    const branch = await prisma.branch.findUnique({
      where: { id }
    });

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    // Get queue statistics
    const queueStats = await prisma.queue.groupBy({
      by: ['status'],
      where: {
        branch_id: id,
        created_at: { gte: startDate }
      },
      _count: { status: true }
    });

    // Get staff statistics
    const staffStats = await prisma.staff.count({
      where: { branch_id: id, is_active: true }
    });

    // Get service type statistics
    const serviceTypeStats = await prisma.serviceType.count({
      where: { branch_id: id, is_active: true }
    });

    const stats = {
      branch_info: {
        name: branch.name,
        current_capacity: branch.current_capacity,
        max_capacity: branch.max_capacity,
        utilization_rate: branch.max_capacity > 0 ? 
          Math.round((branch.current_capacity / branch.max_capacity) * 100) : 0
      },
      queue_stats: queueStats.reduce((acc: any, stat: any) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>),
      staff_count: staffStats,
      service_types_count: serviceTypeStats
    };

    return res.json({ success: true, data: stats });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch branch statistics' });
  }
}; 