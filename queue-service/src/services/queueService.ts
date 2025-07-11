import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTicketData {
  branch_id: string;
  service_type: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  priority?: number;
}

export interface UpdateTicketStatusData {
  status: 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  staff_id?: string;
  notes?: string;
}

export class QueueService {
  static async createTicket(data: CreateTicketData) {
    try {
      // Validate required fields
      if (!data.branch_id || !data.service_type) {
        throw new Error('Branch ID and service type are required');
      }

      // Check if branch exists and is operational
      const branch = await prisma.branch.findUnique({
        where: { id: data.branch_id }
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      if (!branch.is_operational) {
        throw new Error('Branch is not operational');
      }

      // Check if branch is at capacity
      if (branch.current_capacity >= branch.max_capacity) {
        throw new Error('Branch is at maximum capacity');
      }

      // Create ticket
      const ticket = await prisma.queueTicket.create({
        data: {
          branch_id: data.branch_id,
          service_type: data.service_type,
          customer_id: data.customer_id,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email,
          priority: data.priority || 1,
          status: 'WAITING'
        }
      });

      // Create initial event
      await prisma.queueEvent.create({
        data: {
          ticket_id: ticket.id,
          event_type: 'CREATED',
          event_time: new Date(),
          notes: 'Ticket created'
        }
      });

      // Update branch capacity
      await prisma.branch.update({
        where: { id: data.branch_id },
        data: { current_capacity: { increment: 1 } }
      });

      return { success: true, data: ticket };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create ticket' };
    }
  }

  static async updateTicketStatus(ticketId: string, data: UpdateTicketStatusData) {
    try {
      const ticket = await prisma.queueTicket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        'WAITING': ['CALLED', 'CANCELLED'],
        'CALLED': ['SERVING', 'NO_SHOW'],
        'SERVING': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': [],
        'NO_SHOW': []
      };

      const allowedTransitions = validTransitions[ticket.status];
      if (!allowedTransitions.includes(data.status)) {
        throw new Error(`Invalid status transition from ${ticket.status} to ${data.status}`);
      }

      // Update ticket
      const updatedTicket = await prisma.queueTicket.update({
        where: { id: ticketId },
        data: {
          status: data.status,
          ...(data.status === 'CALLED' && { called_at: new Date() }),
          ...(data.status === 'SERVING' && { served_at: new Date() }),
          ...(data.status === 'COMPLETED' && { completed_at: new Date() }),
          ...(data.status === 'CANCELLED' && { cancelled_at: new Date() }),
          ...(data.status === 'NO_SHOW' && { no_show_at: new Date() })
        }
      });

      // Create event
      await prisma.queueEvent.create({
        data: {
          ticket_id: ticketId,
          event_type: data.status as any,
          event_time: new Date(),
          staff_id: data.staff_id,
          notes: data.notes
        }
      });

      // Update branch capacity if ticket is completed or cancelled
      if (data.status === 'COMPLETED' || data.status === 'CANCELLED' || data.status === 'NO_SHOW') {
        await prisma.branch.update({
          where: { id: ticket.branch_id },
          data: { current_capacity: { decrement: 1 } }
        });
      }

      return { success: true, data: updatedTicket };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update ticket status' };
    }
  }

  static async getBranchQueue(branchId: string, filters?: { status?: string; service_type?: string }) {
    try {
      const where: any = { branch_id: branchId };
      
      if (filters?.status) {
        where.status = filters.status;
      }
      
      if (filters?.service_type) {
        where.service_type = filters.service_type;
      }

      const tickets = await prisma.queueTicket.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { issued_at: 'asc' }
        ],
        include: {
          events: {
            orderBy: { event_time: 'desc' },
            take: 1
          }
        }
      });

      return { success: true, data: tickets };
    } catch (error) {
      return { success: false, error: 'Failed to fetch branch queue' };
    }
  }

  static async getTicketAnalytics(branchId: string, dateRange?: { start: Date; end: Date }) {
    try {
      const where: any = { branch_id: branchId };
      
      if (dateRange) {
        where.issued_at = {
          gte: dateRange.start,
          lte: dateRange.end
        };
      }

      const tickets = await prisma.queueTicket.findMany({
        where,
        include: {
          events: true
        }
      });

      const analytics = {
        total_tickets: tickets.length,
        by_status: {
          waiting: tickets.filter(t => t.status === 'WAITING').length,
          called: tickets.filter(t => t.status === 'CALLED').length,
          serving: tickets.filter(t => t.status === 'SERVING').length,
          completed: tickets.filter(t => t.status === 'COMPLETED').length,
          cancelled: tickets.filter(t => t.status === 'CANCELLED').length,
          no_show: tickets.filter(t => t.status === 'NO_SHOW').length
        },
        by_service_type: tickets.reduce((acc, ticket) => {
          acc[ticket.service_type] = (acc[ticket.service_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        average_wait_time: 0, // Calculate from events
        average_service_time: 0 // Calculate from events
      };

      return { success: true, data: analytics };
    } catch (error) {
      return { success: false, error: 'Failed to fetch ticket analytics' };
    }
  }

  static async getNextTicket(branchId: string, serviceType?: string) {
    try {
      const where: any = { 
        branch_id: branchId,
        status: 'WAITING'
      };
      
      if (serviceType) {
        where.service_type = serviceType;
      }

      const nextTicket = await prisma.queueTicket.findFirst({
        where,
        orderBy: [
          { priority: 'desc' },
          { issued_at: 'asc' }
        ]
      });

      return { success: true, data: nextTicket };
    } catch (error) {
      return { success: false, error: 'Failed to get next ticket' };
    }
  }
} 