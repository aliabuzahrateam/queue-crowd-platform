import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Request interface to include session
declare global {
  namespace Express {
    interface Request {
      session?: {
        lastCrowdRequest?: {
          timestamp: number;
          count: number;
        };
      };
    }
  }
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

interface IPBlockConfig {
  blockedIPs: Set<string>;
  suspiciousPatterns: RegExp[];
}

export class SecurityMiddleware {
  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  private static ipBlockConfig: IPBlockConfig = {
    blockedIPs: new Set(),
    suspiciousPatterns: [
      /^192\.168\./, // Private network
      /^10\./, // Private network
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
      /^127\./, // Localhost
      /^0\.0\.0\.0$/, // Invalid IP
      /^255\.255\.255\.255$/ // Broadcast IP
    ]
  };

  // Enhanced rate limiting with different tiers
  static rateLimit(config: RateLimitConfig) {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
      const now = Date.now();
      const key = `${ip}:${req.path}`;

      const userRequests = SecurityMiddleware.rateLimitStore.get(key);
      
      if (!userRequests || now > userRequests.resetTime) {
        SecurityMiddleware.rateLimitStore.set(key, { 
          count: 1, 
          resetTime: now + config.windowMs 
        });
      } else {
        userRequests.count++;
        
        if (userRequests.count > config.maxRequests) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            message: config.message
          });
        }
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - (userRequests?.count || 1)));
      res.setHeader('X-RateLimit-Reset', new Date(now + config.windowMs).toISOString());

      return next();
    };
  }

  // IP blocking middleware
  static ipBlock() {
    return (req: Request, res: Response, next: NextFunction) => {
      const forwardedFor = req.headers['x-forwarded-for'];
      const ip = req.ip || 
                 req.connection.remoteAddress || 
                 (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || 
                 'unknown';
      
      // Check if IP is in blocked list
      if (SecurityMiddleware.ipBlockConfig.blockedIPs.has(ip)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Your IP address has been blocked'
        });
      }

      // Check for suspicious patterns
      for (const pattern of SecurityMiddleware.ipBlockConfig.suspiciousPatterns) {
        if (pattern.test(ip)) {
          console.warn(`Suspicious IP detected: ${ip}`);
          // Log but don't block for now - could be legitimate in some cases
        }
      }

      return next();
    };
  }

  // Abuse detection middleware
  static abuseDetection() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const forwardedFor = req.headers['x-forwarded-for'];
      const ip = req.ip || 
                 req.connection.remoteAddress || 
                 (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || 
                 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      const timestamp = new Date();

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /bot|crawler|spider/i, // Bot user agents
        /curl|wget|python/i, // Script user agents
        /^$/, // Empty user agent
        /^(Mozilla|Chrome|Safari|Firefox|Edge)/i // Missing proper user agent
      ];

      let suspiciousScore = 0;

      // Check user agent
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(userAgent)) {
          suspiciousScore += 1;
        }
      }

      // Check request frequency (basic implementation)
      // Remove all usage of 'prisma.branchCrowd' in this file
      // The security middleware should not depend on Prisma models
      // For now, we'll use crowd data as a proxy
      // const recentRequests = await prisma.branchCrowd.findMany({
      //   where: {
      //     // This would need a proper request log table
      //     // For now, we'll use crowd data as a proxy
      //     timestamp: {
      //       gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      //     }
      //   }
      // });

      // if (recentRequests.length > 100) { // Arbitrary threshold
      //   suspiciousScore += 2;
      // }

      // Block if suspicious score is too high
      // if (suspiciousScore >= 3) {
      //   console.warn(`Abuse detected from IP: ${ip}, Score: ${suspiciousScore}`);
      //   return res.status(403).json({
      //     success: false,
      //     error: 'Access denied',
      //     message: 'Suspicious activity detected'
      //   });
      // }

      return next();
    };
  }

  // Data validation middleware for crowd data
  static validateCrowdData() {
    return (req: Request, res: Response, next: NextFunction) => {
      const { people_count, branch_id } = req.body;

      // Check for unrealistic values
      if (people_count > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Invalid data',
          message: 'People count exceeds reasonable limit'
        });
      }

      // Check for rapid changes (could indicate abuse)
      const lastRequest = req.session?.lastCrowdRequest;
      if (lastRequest) {
        const timeDiff = Date.now() - lastRequest.timestamp;
        const countDiff = Math.abs(people_count - lastRequest.count);
        
        if (timeDiff < 1000 && countDiff > 100) { // Large change in short time
          console.warn(`Suspicious crowd data change: ${countDiff} in ${timeDiff}ms`);
        }
      }

      // Store for next request
      if (req.session) {
        req.session.lastCrowdRequest = {
          timestamp: Date.now(),
          count: people_count
        };
      }

      return next();
    };
  }

  // Admin methods for managing blocked IPs
  static addBlockedIP(ip: string) {
    SecurityMiddleware.ipBlockConfig.blockedIPs.add(ip);
    console.log(`IP blocked: ${ip}`);
  }

  static removeBlockedIP(ip: string) {
    SecurityMiddleware.ipBlockConfig.blockedIPs.delete(ip);
    console.log(`IP unblocked: ${ip}`);
  }

  static getBlockedIPs(): string[] {
    return Array.from(SecurityMiddleware.ipBlockConfig.blockedIPs);
  }

  // Clear rate limit store (useful for testing)
  static clearRateLimitStore() {
    SecurityMiddleware.rateLimitStore.clear();
  }
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // Strict rate limit for crowd data submission
  crowdData: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many crowd data submissions. Please wait before submitting again.'
  },
  
  // Moderate rate limit for analytics queries
  analytics: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 50,
    message: 'Too many analytics requests. Please wait before querying again.'
  },
  
  // Loose rate limit for general API access
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests. Please wait before trying again.'
  }
}; 