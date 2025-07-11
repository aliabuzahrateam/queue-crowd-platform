import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createQueueTicket = async (req: Request, res: Response) => {
  try {
    const { 
      branch_id, 
      service_type_id, 
      customer_name, 
      customer_phone, 
      customer_email,
      estimated_wait_time,
      priority,
      notes 
    } = req.body;

    // Check if branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branch_id }
    });

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    // Check if service type exists
    const serviceType = await prisma.serviceType.findUnique({
      where: { id: service_type_id }
    });

    if (!serviceType) {
      return res.status(404).json({ success: false, error: 'Service type not found' });
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber(branch_id);

    const queueTicket = await prisma.queueTicket.create({
      data: {
        branch_id,
        service_type_id,
        ticket_number: ticketNumber,
        customer_name,
        customer_phone,
        customer_email,
        estimated_wait_time: estimated_wait_time || 30,
        priority: priority || 'normal',
        status: 'waiting',
        notes
      }
    });

    // Create queue event
    await prisma.queueEvent.create({
      data: {
        queue_ticket_id: queueTicket.id,
        event_type: 'ticket_created',
        description: `Ticket ${ticketNumber} created`,
        data: { ticket_number: ticketNumber }
      }
    });

    res.status(201).json({ success: true, data: queueTicket });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create queue ticket' });
  }
};

export const getQueueTicketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const queueTicket = await prisma.queueTicket.findUnique({
      where: { id },
      include: {
        branch: true,
        serviceType: true,
        events: {
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!queueTicket) {
      return res.status(404).json({ success: false, error: 'Queue ticket not found' });
    }

    res.json({ success: true, data: queueTicket });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch queue ticket' });
  }
};

export const updateQueueTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const queueTicket = await prisma.queueTicket.findUnique({
      where: { id }
    });

    if (!queueTicket) {
      return res.status(404).json({ success: false, error: 'Queue ticket not found' });
    }

    const updatedTicket = await prisma.queueTicket.update({
      where: { id },
      data: updateData
    });

    // Create event for status change
    if (updateData.status && updateData.status !== queueTicket.status) {
      await prisma.queueEvent.create({
        data: {
          queue_ticket_id: id,
          event_type: 'status_changed',
          description: `Status changed from ${queueTicket.status} to ${updateData.status}`,
          data: { 
            old_status: queueTicket.status, 
            new_status: updateData.status 
          }
        }
      });
    }

    res.json({ success: true, data: updatedTicket });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update queue ticket' });
  }
};

export const deleteQueueTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const queueTicket = await prisma.queueTicket.findUnique({
      where: { id }
    });

    if (!queueTicket) {
      return res.status(404).json({ success: false, error: 'Queue ticket not found' });
    }

    // Delete associated events first
    await prisma.queueEvent.deleteMany({
      where: { queue_ticket_id: id }
    });

    // Delete the ticket
    await prisma.queueTicket.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Queue ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete queue ticket' });
  }
};

export const getQueueTicketsByBranch = async (req: Request, res: Response) => {
  try {
    const { branch_id } = req.params;
    const { status, priority, limit = 50, offset = 0 } = req.query;

    const where: any = { branch_id };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    const queueTickets = await prisma.queueTicket.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        serviceType: true,
        events: {
          orderBy: { created_at: 'desc' },
          take: 5
        }
      }
    });

    const total = await prisma.queueTicket.count({ where });

    res.json({ 
      success: true, 
      data: queueTickets,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch queue tickets' });
  }
};

export const getQueueTicketsByServiceType = async (req: Request, res: Response) => {
  try {
    const { service_type_id } = req.params;
    const { branch_id, status, limit = 50, offset = 0 } = req.query;

    const where: any = { service_type_id };

    if (branch_id) {
      where.branch_id = branch_id;
    }

    if (status) {
      where.status = status;
    }

    const queueTickets = await prisma.queueTicket.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        branch: true,
        events: {
          orderBy: { created_at: 'desc' },
          take: 5
        }
      }
    });

    const total = await prisma.queueTicket.count({ where });

    res.json({ 
      success: true, 
      data: queueTickets,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch queue tickets' });
  }
};

export const getQueueAnalytics = async (req: Request, res: Response) => {
  try {
    const { branch_id } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const queueTickets = await prisma.queueTicket.findMany({
      where: {
        branch_id,
        created_at: { gte: startDate }
      }
    });

    if (queueTickets.length === 0) {
      return res.json({ success: true, data: { message: 'No queue data available' } });
    }

    const analytics = {
      total_tickets: queueTickets.length,
      by_status: queueTickets.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_priority: queueTickets.reduce((acc, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      average_wait_time: Math.round(
        queueTickets.reduce((sum, ticket) => sum + (ticket.estimated_wait_time || 0), 0) / queueTickets.length
      ),
      daily_trends: queueTickets.reduce((acc, ticket) => {
        const date = ticket.created_at.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch queue analytics' });
  }
};

export const getQueueEvents = async (req: Request, res: Response) => {
  try {
    const { queue_ticket_id, event_type, limit = 100, offset = 0 } = req.query;

    const where: any = {};

    if (queue_ticket_id) {
      where.queue_ticket_id = queue_ticket_id;
    }

    if (event_type) {
      where.event_type = event_type;
    }

    const events = await prisma.queueEvent.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        queueTicket: {
          include: {
            branch: true,
            serviceType: true
          }
        }
      }
    });

    const total = await prisma.queueEvent.count({ where });

    res.json({ 
      success: true, 
      data: events,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch queue events' });
  }
};

export const createQueueEvent = async (req: Request, res: Response) => {
  try {
    const { queue_ticket_id, event_type, description, data } = req.body;

    const queueTicket = await prisma.queueTicket.findUnique({
      where: { id: queue_ticket_id }
    });

    if (!queueTicket) {
      return res.status(404).json({ success: false, error: 'Queue ticket not found' });
    }

    const event = await prisma.queueEvent.create({
      data: {
        queue_ticket_id,
        event_type,
        description,
        data: data || {}
      }
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create queue event' });
  }
};

export const updateQueueEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const event = await prisma.queueEvent.findUnique({
      where: { id }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Queue event not found' });
    }

    const updatedEvent = await prisma.queueEvent.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, data: updatedEvent });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update queue event' });
  }
};

export const deleteQueueEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.queueEvent.findUnique({
      where: { id }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Queue event not found' });
    }

    await prisma.queueEvent.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Queue event deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete queue event' });
  }
};

// Helper function to generate unique ticket number
async function generateTicketNumber(branchId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get count of tickets for this branch today
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  
  const ticketCount = await prisma.queueTicket.count({
    where: {
      branch_id: branchId,
      created_at: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });

  const sequenceNumber = (ticketCount + 1).toString().padStart(3, '0');
  return `${dateStr}-${sequenceNumber}`;
} 