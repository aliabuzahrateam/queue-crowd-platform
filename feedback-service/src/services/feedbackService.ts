import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FeedbackData {
  branch_id: string;
  service_type_id?: string;
  rating: number;
  category: string;
  comment?: string;
  customer_name?: string;
  customer_email?: string;
  queue_ticket_id?: string;
}

export interface FeedbackAnalytics {
  total_feedback: number;
  average_rating: number;
  rating_distribution: Record<number, number>;
  category_distribution: Record<string, number>;
  service_type_distribution: Record<string, number>;
  daily_trends: Record<string, number>;
  sentiment_analysis?: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export class FeedbackService {
  static async submitFeedback(data: FeedbackData) {
    try {
      // Validate required fields
      if (!data.branch_id || !data.rating || !data.category) {
        throw new Error('Branch ID, rating, and category are required');
      }

      // Validate rating
      if (data.rating < 1 || data.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Check if branch exists
      const branch = await prisma.branch.findUnique({
        where: { id: data.branch_id }
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      // Check if service type exists (if provided)
      if (data.service_type_id) {
        const serviceType = await prisma.serviceType.findUnique({
          where: { id: data.service_type_id }
        });

        if (!serviceType) {
          throw new Error('Service type not found');
        }
      }

      // Check if queue ticket exists (if provided)
      if (data.queue_ticket_id) {
        const queueTicket = await prisma.queueTicket.findUnique({
          where: { id: data.queue_ticket_id }
        });

        if (!queueTicket) {
          throw new Error('Queue ticket not found');
        }
      }

      // Create feedback
      const feedback = await prisma.feedback.create({
        data: {
          branch_id: data.branch_id,
          service_type_id: data.service_type_id,
          rating: data.rating,
          category: data.category,
          comment: data.comment,
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          queue_ticket_id: data.queue_ticket_id
        }
      });

      return { success: true, data: feedback };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to submit feedback' };
    }
  }

  static async getFeedbackByBranch(branchId: string, options?: {
    category?: string;
    rating?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    try {
      const where: any = { branch_id: branchId };

      if (options?.category) {
        where.category = options.category;
      }

      if (options?.rating) {
        where.rating = options.rating;
      }

      if (options?.startDate && options?.endDate) {
        where.created_at = {
          gte: options.startDate,
          lte: options.endDate
        };
      }

      const feedback = await prisma.feedback.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: options?.limit || 50,
        include: {
          serviceType: true,
          queueTicket: true
        }
      });

      return { success: true, data: feedback };
    } catch (error) {
      return { success: false, error: 'Failed to fetch feedback' };
    }
  }

  static async getFeedbackByServiceType(serviceTypeId: string, options?: {
    branchId?: string;
    rating?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    try {
      const where: any = { service_type_id: serviceTypeId };

      if (options?.branchId) {
        where.branch_id = options.branchId;
      }

      if (options?.rating) {
        where.rating = options.rating;
      }

      if (options?.startDate && options?.endDate) {
        where.created_at = {
          gte: options.startDate,
          lte: options.endDate
        };
      }

      const feedback = await prisma.feedback.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: options?.limit || 50,
        include: {
          branch: true,
          queueTicket: true
        }
      });

      return { success: true, data: feedback };
    } catch (error) {
      return { success: false, error: 'Failed to fetch feedback' };
    }
  }

  static async getFeedbackAnalytics(branchId: string, days: number = 30): Promise<{ success: boolean; data?: FeedbackAnalytics; error?: string }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const feedback = await prisma.feedback.findMany({
        where: {
          branch_id: branchId,
          created_at: {
            gte: startDate
          }
        }
      });

      if (feedback.length === 0) {
        return { success: true, data: {
          total_feedback: 0,
          average_rating: 0,
          rating_distribution: {},
          category_distribution: {},
          service_type_distribution: {},
          daily_trends: {}
        }};
      }

      const analytics: FeedbackAnalytics = {
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

      // Add sentiment analysis based on ratings
      const positive = feedback.filter(f => f.rating >= 4).length;
      const neutral = feedback.filter(f => f.rating === 3).length;
      const negative = feedback.filter(f => f.rating <= 2).length;

      analytics.sentiment_analysis = {
        positive,
        neutral,
        negative
      };

      return { success: true, data: analytics };
    } catch (error) {
      return { success: false, error: 'Failed to fetch feedback analytics' };
    }
  }

  static async respondToFeedback(feedbackId: string, response: string, respondedBy?: string) {
    try {
      if (!response) {
        throw new Error('Response is required');
      }

      const feedback = await prisma.feedback.findUnique({
        where: { id: feedbackId }
      });

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      if (feedback.response) {
        throw new Error('Feedback already has a response');
      }

      const updatedFeedback = await prisma.feedback.update({
        where: { id: feedbackId },
        data: {
          response,
          responded_by: respondedBy,
          responded_at: new Date()
        }
      });

      return { success: true, data: updatedFeedback };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to respond to feedback' };
    }
  }

  static async getFeedbackById(feedbackId: string) {
    try {
      const feedback = await prisma.feedback.findUnique({
        where: { id: feedbackId },
        include: {
          branch: true,
          serviceType: true,
          queueTicket: true
        }
      });

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      return { success: true, data: feedback };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch feedback' };
    }
  }

  static async deleteFeedback(feedbackId: string) {
    try {
      const feedback = await prisma.feedback.findUnique({
        where: { id: feedbackId }
      });

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      await prisma.feedback.delete({
        where: { id: feedbackId }
      });

      return { success: true, message: 'Feedback deleted successfully' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete feedback' };
    }
  }

  static async getFeedbackTrends(branchId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const feedback = await prisma.feedback.findMany({
        where: {
          branch_id: branchId,
          created_at: {
            gte: startDate
          }
        },
        orderBy: { created_at: 'asc' }
      });

      const trends = {
        daily_average_rating: {} as Record<string, number>,
        daily_feedback_count: {} as Record<string, number>,
        category_trends: {} as Record<string, Record<string, number>>
      };

      feedback.forEach(f => {
        const date = f.created_at.toISOString().split('T')[0];
        
        // Daily average rating
        if (!trends.daily_average_rating[date]) {
          trends.daily_average_rating[date] = 0;
        }
        trends.daily_average_rating[date] += f.rating;

        // Daily feedback count
        trends.daily_feedback_count[date] = (trends.daily_feedback_count[date] || 0) + 1;

        // Category trends
        if (!trends.category_trends[f.category]) {
          trends.category_trends[f.category] = {};
        }
        trends.category_trends[f.category][date] = (trends.category_trends[f.category][date] || 0) + 1;
      });

      // Calculate average ratings
      Object.keys(trends.daily_average_rating).forEach(date => {
        const count = trends.daily_feedback_count[date];
        trends.daily_average_rating[date] = Number((trends.daily_average_rating[date] / count).toFixed(2));
      });

      return { success: true, data: trends };
    } catch (error) {
      return { success: false, error: 'Failed to fetch feedback trends' };
    }
  }
} 