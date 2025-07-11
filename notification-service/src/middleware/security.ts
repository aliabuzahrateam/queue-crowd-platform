import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import logger from '../config/winston';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export const securityMiddleware = {
  // Basic security headers
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }),

  // Compression middleware
  compression: compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6
  }),

  // CORS configuration
  cors: (req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  },

  // Request logging
  requestLogger: (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: res.get('Content-Length')
      });
    });

    next();
  },

  // Error logging
  errorLogger: (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next(err);
  },

  // Authentication middleware
  authenticate: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header'
        });
      }

      const token = authHeader.substring(7);
      
      // In a real implementation, you would verify the JWT token here
      // For now, we'll simulate token verification
      const decoded = await verifyToken(token);
      
      if (!decoded) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token'
        });
      }

      req.user = decoded;
      next();
    } catch (error) {
      logger.error('Authentication failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: req.ip
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication failed'
      });
    }
  },

  // Authorization middleware
  authorize: (requiredPermissions: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const hasPermission = requiredPermissions.every(permission =>
        req.user!.permissions.includes(permission)
      );

      if (!hasPermission) {
        logger.warn('Authorization failed', {
          userId: req.user.id,
          requiredPermissions,
          userPermissions: req.user.permissions,
          ip: req.ip
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  },

  // Role-based authorization
  requireRole: (requiredRole: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      if (req.user.role !== requiredRole) {
        logger.warn('Role authorization failed', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRole,
          ip: req.ip
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: `Role '${requiredRole}' required`
        });
      }

      next();
    };
  },

  // Input sanitization
  sanitizeInput: (req: Request, res: Response, next: NextFunction) => {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  },

  // Content type validation
  validateContentType: (allowedTypes: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentType = req.get('Content-Type');
      
      if (!contentType) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Content-Type header is required'
        });
      }

      const isValidType = allowedTypes.some(type => 
        contentType.includes(type)
      );

      if (!isValidType) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`
        });
      }

      next();
    };
  },

  // Request size limiting
  limitRequestSize: (maxSize: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(req.get('Content-Length') || '0');
      const maxBytes = parseSize(maxSize);

      if (contentLength > maxBytes) {
        return res.status(413).json({
          error: 'Payload Too Large',
          message: `Request body size exceeds ${maxSize}`
        });
      }

      next();
    };
  },

  // Security headers
  securityHeaders: (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  }
};

// Helper functions
async function verifyToken(token: string): Promise<any> {
  // In a real implementation, you would verify the JWT token
  // For now, we'll return a mock user
  return {
    id: 'user-123',
    email: 'user@example.com',
    role: 'user',
    permissions: ['read:notifications', 'create:notifications']
  };
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = value
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .trim();
    } else {
      sanitized[key] = sanitizeObject(value);
    }
  }

  return sanitized;
}

function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };

  const match = size.match(/^(\d+)([A-Z]+)$/);
  if (!match) {
    return 1024 * 1024; // Default to 1MB
  }

  const [, value, unit] = match;
  return parseInt(value) * (units[unit] || 1);
} 