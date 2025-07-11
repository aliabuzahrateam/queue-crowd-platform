import winston from 'winston';
import { elasticsearchService } from './elasticsearch';

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message, service, userId, notificationId, ...meta }) => {
    let log = `${timestamp} [${level}] ${service || 'notification-service'}: ${message}`;
    
    if (userId) log += ` | User: ${userId}`;
    if (notificationId) log += ` | Notification: ${notificationId}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` | ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: structuredFormat,
  defaultMeta: {
    service: 'notification-service'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Custom transport for Elasticsearch
class ElasticsearchTransport extends winston.Transport {
  constructor(opts: any) {
    super(opts);
  }

  async log(info: any, callback: () => void) {
    try {
      await elasticsearchService.log({
        timestamp: new Date(info.timestamp),
        level: info.level,
        service: info.service || 'notification-service',
        message: info.message,
        data: info,
        userId: info.userId,
        notificationId: info.notificationId
      });
    } catch (error) {
      console.error('Failed to log to Elasticsearch:', error);
    }
    
    callback();
  }
}

// Add Elasticsearch transport if enabled
if (process.env.ELASTICSEARCH_ENABLED === 'true') {
  logger.add(new ElasticsearchTransport({
    level: 'info'
  }));
}

// Helper methods for common logging scenarios
export const logNotification = {
  emailSent: (data: { userId?: string; notificationId?: string; to: string; subject: string }) => {
    logger.info('Email notification sent', {
      type: 'email_sent',
      ...data
    });
  },

  emailFailed: (data: { userId?: string; notificationId?: string; to: string; error: string }) => {
    logger.error('Email notification failed', {
      type: 'email_failed',
      ...data
    });
  },

  smsSent: (data: { userId?: string; notificationId?: string; to: string; message: string }) => {
    logger.info('SMS notification sent', {
      type: 'sms_sent',
      ...data
    });
  },

  smsFailed: (data: { userId?: string; notificationId?: string; to: string; error: string }) => {
    logger.error('SMS notification failed', {
      type: 'sms_failed',
      ...data
    });
  },

  pushSent: (data: { userId?: string; notificationId?: string; tokens: string[]; title: string }) => {
    logger.info('Push notification sent', {
      type: 'push_sent',
      ...data
    });
  },

  pushFailed: (data: { userId?: string; notificationId?: string; tokens: string[]; error: string }) => {
    logger.error('Push notification failed', {
      type: 'push_failed',
      ...data
    });
  },

  notificationCreated: (data: { userId: string; notificationId: string; type: string; channel: string }) => {
    logger.info('Notification created', {
      type: 'notification_created',
      ...data
    });
  },

  notificationDelivered: (data: { userId: string; notificationId: string; channel: string; deliveryTime: number }) => {
    logger.info('Notification delivered', {
      type: 'notification_delivered',
      ...data
    });
  },

  serviceError: (data: { error: string; context: string; userId?: string; notificationId?: string }) => {
    logger.error('Service error', {
      type: 'service_error',
      ...data
    });
  },

  externalServiceError: (data: { service: string; error: string; context: string }) => {
    logger.error('External service error', {
      type: 'external_service_error',
      ...data
    });
  },

  performance: (data: { operation: string; duration: number; success: boolean }) => {
    logger.info('Performance metric', {
      type: 'performance',
      ...data
    });
  }
};

export default logger; 