import { Request, Response, NextFunction } from 'express';
import { JWTService, JWTPayload } from '../utils/jwt';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export interface AuthOptions {
  required?: boolean;
  roles?: string[];
}

export class AuthMiddleware {
  // Main authentication middleware
  static authenticate(options: AuthOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
          if (options.required !== false) {
            return res.status(401).json({
              error: 'No authorization header',
              message: 'Authorization header is required'
            });
          }
          return next();
        }

        const token = JWTService.extractTokenFromHeader(authHeader);
        const payload = JWTService.verifyToken(token);

        // Check role requirements
        if (options.roles && options.roles.length > 0) {
          if (!options.roles.includes(payload.role)) {
            return res.status(403).json({
              error: 'Insufficient permissions',
              message: `Required roles: ${options.roles.join(', ')}`
            });
          }
        }

        // Attach user to request
        req.user = payload;
        next();
      } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({
          error: 'Authentication failed',
          message: error instanceof Error ? error.message : 'Invalid token'
        });
      }
    };
  }

  // Simple authentication middleware for routes
  static authenticateToken(req: Request, res: Response, next: NextFunction) {
    return AuthMiddleware.authenticate({ required: true })(req, res, next);
  }

  // Require authentication
  static requireAuth() {
    return AuthMiddleware.authenticate({ required: true });
  }

  // Optional authentication (for routes that work with or without auth)
  static optionalAuth() {
    return AuthMiddleware.authenticate({ required: false });
  }

  // Require specific roles
  static requireRole(roles: string | string[]) {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return AuthMiddleware.authenticate({ required: true, roles: roleArray });
  }

  // Require admin role
  static requireAdmin() {
    return AuthMiddleware.requireRole('admin');
  }

  // Require staff or admin role
  static requireStaff() {
    return AuthMiddleware.requireRole(['staff', 'admin']);
  }

  // Rate limiting middleware (basic implementation)
  static rateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();

      const userRequests = requests.get(ip);
      
      if (!userRequests || now > userRequests.resetTime) {
        requests.set(ip, { count: 1, resetTime: now + windowMs });
      } else {
        userRequests.count++;
        
        if (userRequests.count > maxRequests) {
          return res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.'
          });
        }
      }

      next();
    };
  }

  // Logging middleware for authentication attempts
  static logAuthAttempts() {
    return (req: Request, _res: Response, next: NextFunction) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      const timestamp = new Date().toISOString();

      console.log(`[${timestamp}] Auth attempt from ${ip} - User-Agent: ${userAgent}`);
      next();
    };
  }
} 