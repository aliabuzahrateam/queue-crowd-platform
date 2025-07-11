import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisService } from '../config/redis';
import logger from '../config/winston';

// Rate limiter for API endpoints
const apiLimiter = new RateLimiterRedis({
  storeClient: redisService.client,
  keyPrefix: 'api_rate_limit',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60 * 15, // Block for 15 minutes
});

// Rate limiter for notification sending
const notificationLimiter = new RateLimiterRedis({
  storeClient: redisService.client,
  keyPrefix: 'notification_rate_limit',
  points: 10, // Number of notifications
  duration: 60, // Per 60 seconds
  blockDuration: 60 * 30, // Block for 30 minutes
});

// Rate limiter for email sending
const emailLimiter = new RateLimiterRedis({
  storeClient: redisService.client,
  keyPrefix: 'email_rate_limit',
  points: 50, // Number of emails
  duration: 60, // Per 60 seconds
  blockDuration: 60 * 60, // Block for 1 hour
});

// Rate limiter for SMS sending
const smsLimiter = new RateLimiterRedis({
  storeClient: redisService.client,
  keyPrefix: 'sms_rate_limit',
  points: 20, // Number of SMS
  duration: 60, // Per 60 seconds
  blockDuration: 60 * 60, // Block for 1 hour
});

// Rate limiter for push notifications
const pushLimiter = new RateLimiterRedis({
  storeClient: redisService.client,
  keyPrefix: 'push_rate_limit',
  points: 100, // Number of push notifications
  duration: 60, // Per 60 seconds
  blockDuration: 60 * 30, // Block for 30 minutes
});

export const rateLimitMiddleware = {
  // General API rate limiting
  api: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.ip || 'unknown';
      await apiLimiter.consume(key);
      next();
    } catch (error: any) {
      logger.warn('API rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });

      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: error.msBeforeNext / 1000
      });
    }
  },

  // Notification sending rate limiting
  notification: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.body.userId || req.params.userId || 'anonymous';
      const key = `user:${userId}`;
      await notificationLimiter.consume(key);
      next();
    } catch (error: any) {
      logger.warn('Notification rate limit exceeded', {
        userId: req.body.userId || req.params.userId,
        ip: req.ip
      });

      res.status(429).json({
        error: 'Too many notifications',
        message: 'Notification rate limit exceeded. Please try again later.',
        retryAfter: error.msBeforeNext / 1000
      });
    }
  },

  // Email sending rate limiting
  email: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.ip || 'unknown';
      await emailLimiter.consume(key);
      next();
    } catch (error: any) {
      logger.warn('Email rate limit exceeded', {
        ip: req.ip,
        to: req.body.to
      });

      res.status(429).json({
        error: 'Too many email requests',
        message: 'Email rate limit exceeded. Please try again later.',
        retryAfter: error.msBeforeNext / 1000
      });
    }
  },

  // SMS sending rate limiting
  sms: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.ip || 'unknown';
      await smsLimiter.consume(key);
      next();
    } catch (error: any) {
      logger.warn('SMS rate limit exceeded', {
        ip: req.ip,
        to: req.body.to
      });

      res.status(429).json({
        error: 'Too many SMS requests',
        message: 'SMS rate limit exceeded. Please try again later.',
        retryAfter: error.msBeforeNext / 1000
      });
    }
  },

  // Push notification rate limiting
  push: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.ip || 'unknown';
      await pushLimiter.consume(key);
      next();
    } catch (error: any) {
      logger.warn('Push notification rate limit exceeded', {
        ip: req.ip,
        tokens: req.body.tokens?.length
      });

      res.status(429).json({
        error: 'Too many push notification requests',
        message: 'Push notification rate limit exceeded. Please try again later.',
        retryAfter: error.msBeforeNext / 1000
      });
    }
  },

  // User-specific rate limiting
  userSpecific: (limit: number, windowMs: number) => {
    const userLimiter = new RateLimiterRedis({
      storeClient: redisService.client,
      keyPrefix: 'user_specific_limit',
      points: limit,
      duration: windowMs / 1000,
      blockDuration: windowMs / 1000 * 2,
    });

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.body.userId || req.params.userId || req.user?.id || 'anonymous';
        const key = `user:${userId}`;
        await userLimiter.consume(key);
        next();
      } catch (error: any) {
        logger.warn('User-specific rate limit exceeded', {
          userId: req.body.userId || req.params.userId || req.user?.id,
          ip: req.ip
        });

        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests for this user. Please try again later.',
          retryAfter: error.msBeforeNext / 1000
        });
      }
    };
  },

  // IP-based rate limiting
  ipBased: (limit: number, windowMs: number) => {
    const ipLimiter = new RateLimiterRedis({
      storeClient: redisService.client,
      keyPrefix: 'ip_based_limit',
      points: limit,
      duration: windowMs / 1000,
      blockDuration: windowMs / 1000 * 2,
    });

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = req.ip || 'unknown';
        await ipLimiter.consume(key);
        next();
      } catch (error: any) {
        logger.warn('IP-based rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests from this IP. Please try again later.',
          retryAfter: error.msBeforeNext / 1000
        });
      }
    };
  }
};

// Helper function to get rate limit info
export const getRateLimitInfo = async (key: string, limiter: RateLimiterRedis) => {
  try {
    const res = await limiter.get(key);
    return {
      remaining: res.remainingPoints,
      resetTime: res.msBeforeNext,
      consumed: res.consumedPoints
    };
  } catch (error) {
    return null;
  }
};

// Middleware to add rate limit headers
export const addRateLimitHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', '99'); // This would be dynamic in practice
  res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + 60);
  next();
}; 