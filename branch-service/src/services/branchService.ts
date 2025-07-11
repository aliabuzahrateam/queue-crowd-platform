import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BranchData {
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  email?: string;
  max_capacity?: number;
  operating_hours?: Record<string, any>;
}

export interface BranchUpdateData {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  max_capacity?: number;
  operating_hours?: Record<string, any>;
  is_active?: boolean;
}

export interface BranchStats {
  branch_info: {
    name: string;
    current_capacity: number;
    max_capacity: number;
    utilization_rate: number;
  };
  queue_stats: Record<string, number>;
  crowd_stats: {
    current_people: number;
    last_updated: Date;
  } | null;
  staff_count: number;
  service_types_count: number;
}

export class BranchService {
  static async createBranch(data: BranchData) {
    try {
      // Validate required fields
      if (!data.name || !data.address || !data.city || !data.state || !data.postal_code || !data.country) {
        throw new Error('Name, address, city, state, postal code, and country are required');
      }

      // Check if branch with same name and address already exists
      const existingBranch = await prisma.branch.findFirst({
        where: {
          name: data.name,
          address: data.address,
          city: data.city
        }
      });

      if (existingBranch) {
        throw new Error('Branch with this name and address already exists');
      }

      const branch = await prisma.branch.create({
        data: {
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          postal_code: data.postal_code,
          country: data.country,
          phone: data.phone,
          email: data.email,
          max_capacity: data.max_capacity || 100,
          operating_hours: data.operating_hours || {},
          current_capacity: 0,
          is_active: true
        }
      });

      return { success: true, data: branch };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create branch' };
    }
  }

  static async getAllBranches(options?: {
    isActive?: boolean;
    city?: string;
    state?: string;
    country?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = {};

      if (options?.isActive !== undefined) {
        where.is_active = options.isActive;
      }

      if (options?.city) {
        where.city = { contains: options.city, mode: 'insensitive' };
      }

      if (options?.state) {
        where.state = { contains: options.state, mode: 'insensitive' };
      }

      if (options?.country) {
        where.country = { contains: options.country, mode: 'insensitive' };
      }

      const branches = await prisma.branch.findMany({
        where,
        orderBy: { name: 'asc' },
        take: options?.limit || 50,
        skip: options?.offset || 0
      });

      const total = await prisma.branch.count({ where });

      return { 
        success: true, 
        data: branches,
        pagination: {
          total,
          limit: options?.limit || 50,
          offset: options?.offset || 0,
          hasMore: (options?.offset || 0) + (options?.limit || 50) < total
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to fetch branches' };
    }
  }

  static async getBranchById(branchId: string) {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: {
          staff: true,
          service_types: true,
          operating_hours: true,
          queues: true
        }
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      return { success: true, data: branch };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch branch' };
    }
  }

  static async updateBranch(branchId: string, data: BranchUpdateData) {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      // Validate max capacity if provided
      if (data.max_capacity !== undefined && data.max_capacity < branch.current_capacity) {
        throw new Error('Max capacity cannot be less than current capacity');
      }

      const updatedBranch = await prisma.branch.update({
        where: { id: branchId },
        data
      });

      return { success: true, data: updatedBranch };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update branch' };
    }
  }

  static async deleteBranch(branchId: string) {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      // Check if branch has active queues
      const activeQueues = await prisma.queue.count({
        where: { branch_id: branchId, status: { in: ['WAITING', 'CALLED'] } }
      });

      if (activeQueues > 0) {
        throw new Error('Cannot delete branch with active queue tickets');
      }

      // Check if branch has active staff
      const activeStaff = await prisma.staff.count({
        where: { branch_id: branchId, is_active: true }
      });

      if (activeStaff > 0) {
        throw new Error('Cannot delete branch with active staff');
      }

      await prisma.branch.delete({
        where: { id: branchId }
      });

      return { success: true, message: 'Branch deleted successfully' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete branch' };
    }
  }

  static async getBranchesByLocation(location: string, limit: number = 20) {
    try {
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
        take: limit
      });

      return { success: true, data: branches };
    } catch (error) {
      return { success: false, error: 'Failed to fetch branches by location' };
    }
  }

  static async getBranchStats(branchId: string, days: number = 30): Promise<{ success: boolean; data?: BranchStats; error?: string }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get branch info
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      // Get queue statistics
      const queueStats = await prisma.queue.groupBy({
        by: ['status'],
        where: {
          branch_id: branchId,
          created_at: { gte: startDate }
        },
        _count: { status: true }
      });

      // Get crowd statistics
      // const crowdStats = await prisma.branchCrowd.findMany({
      //   where: {
      //     branch_id: branchId,
      //     timestamp: { gte: startDate }
      //   },
      //   orderBy: { timestamp: 'desc' },
      //   take: 1
      // });

      // Get staff statistics
      const staffCount = await prisma.staff.count({
        where: { branch_id: branchId, is_active: true }
      });

      // Get service type statistics
      const serviceTypeCount = await prisma.serviceType.count({
        where: { branch_id: branchId, is_active: true }
      });

      const stats: BranchStats = {
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
        crowd_stats: null, // Remove or comment out any code using 'prisma.branchCrowd'
        staff_count: staffCount,
        service_types_count: serviceTypeCount
      };

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch branch statistics' };
    }
  }

  static async updateBranchCapacity(branchId: string, currentCapacity: number) {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      if (currentCapacity < 0) {
        throw new Error('Current capacity cannot be negative');
      }

      if (currentCapacity > branch.max_capacity) {
        throw new Error('Current capacity cannot exceed max capacity');
      }

      const updatedBranch = await prisma.branch.update({
        where: { id: branchId },
        data: { current_capacity: currentCapacity }
      });

      return { success: true, data: updatedBranch };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update branch capacity' };
    }
  }
} 