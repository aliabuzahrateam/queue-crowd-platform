import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { 
      branch_id, 
      service_type_id, 
      rating, 
      category, 
      comment, 
      customer_name, 
      customer_email,
      queue_ticket_id 
    } = req.body;

    // Validate required fields
    if (!branch_id || !rating || !category) {
      return res.status(400).json({ success: false, error: 'Branch ID, rating, and category are required' });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    // Check if branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branch_id }
    });

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    // Check if service type exists (if provided)
    if (service_type_id) {
      const serviceType = await prisma.serviceType.findUnique({
        where: { id: service_type_id }
      });

      if (!serviceType) {
        return res.status(404).json({ success: false, error: 'Service type not found' });
      }
    }

    // Check if queue ticket exists (if provided)
    if (queue_ticket_id) {
      const queueTicket = await prisma.queueTicket.findUnique({
        where: { id: queue_ticket_id }
      });

      if (!queueTicket) {
        return res.status(404).json({ success: false, error: 'Queue ticket not found' });
      }
    }

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        branch_id,
        service_type_id,
        rating,
        category,
        comment,
        customer_name,
        customer_email,
        queue_ticket_id
      }
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to submit feedback' });
  }
};

export const getFeedbackByBranch = async (req: Request, res: Response) => {
  try {
    const { branch_id } = req.params;
    const { category, rating, start_date, end_date, limit = 50 } = req.query;

    const where: any = { branch_id };

    if (category) {
      where.category = category;
    }

    if (rating) {
      where.rating = Number(rating);
    }

    if (start_date && end_date) {
      where.created_at = {
        gte: new Date(start_date as string),
        lte: new Date(end_date as string)
      };
    }

    const feedback = await prisma.feedback.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Number(limit),
      include: {
        serviceType: true,
        queueTicket: true
      }
    });

    res.json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
  }
};

export const getFeedbackByServiceType = async (req: Request, res: Response) => {
  try {
    const { service_type_id } = req.params;
    const { branch_id, rating, start_date, end_date, limit = 50 } = req.query;

    const where: any = { service_type_id };

    if (branch_id) {
      where.branch_id = branch_id;
    }

    if (rating) {
      where.rating = Number(rating);
    }

    if (start_date && end_date) {
      where.created_at = {
        gte: new Date(start_date as string),
        lte: new Date(end_date as string)
      };
    }

    const feedback = await prisma.feedback.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Number(limit),
      include: {
        branch: true,
        queueTicket: true
      }
    });

    res.json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
  }
};

export const getFeedbackAnalytics = async (req: Request, res: Response) => {
  try {
    const { branch_id } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const feedback = await prisma.feedback.findMany({
      where: {
        branch_id,
        created_at: {
          gte: startDate
        }
      }
    });

    if (feedback.length === 0) {
      return res.json({ success: true, data: { message: 'No feedback data available' } });
    }

    const analytics = {
      total_feedback: feedback.length,
      average_rating: Number((feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(2)),
      rating_distribution: feedback.reduce((acc, f) => {
        acc[f.rating] = (acc[f.rating] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
      category_distribution: feedback.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      service_type_distribution: feedback.reduce((acc, f) => {
        if (f.service_type_id) {
          acc[f.service_type_id] = (acc[f.service_type_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      daily_trends: feedback.reduce((acc, f) => {
        const date = f.created_at.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch feedback analytics' });
  }
};

export const respondToFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { response, responded_by } = req.body;

    if (!response) {
      return res.status(400).json({ success: false, error: 'Response is required' });
    }

    const feedback = await prisma.feedback.findUnique({
      where: { id }
    });

    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }

    if (feedback.response) {
      return res.status(400).json({ success: false, error: 'Feedback already has a response' });
    }

    const updatedFeedback = await prisma.feedback.update({
      where: { id },
      data: {
        response,
        responded_by,
        responded_at: new Date()
      }
    });

    res.json({ success: true, data: updatedFeedback });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to respond to feedback' });
  }
};

export const getFeedbackById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        branch: true,
        serviceType: true,
        queueTicket: true
      }
    });

    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }

    res.json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
  }
};

export const deleteFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const feedback = await prisma.feedback.findUnique({
      where: { id }
    });

    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }

    await prisma.feedback.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete feedback' });
  }
}; 