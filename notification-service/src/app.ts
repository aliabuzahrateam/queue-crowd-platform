import express from 'express';
import cors from 'cors';
import { notificationController } from './controllers/notificationController';
import { notificationPreferencesController } from './controllers/notificationPreferencesController';
import { notificationTemplateController } from './controllers/notificationTemplateController';
import { notificationMetricsController } from './controllers/notificationMetricsController';
import { validateNotification } from './middleware/validation';
import { rateLimitMiddleware } from './middleware/rateLimiter';
import { securityMiddleware } from './middleware/security';
import { redisService } from './config/redis';
import { rabbitMQService } from './config/rabbitmq';
import { elasticsearchService } from './config/elasticsearch';
import { notificationConsumer } from './services/notificationConsumer';
import logger from './config/winston';

const app = express();

// Security middleware
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.compression);
app.use(securityMiddleware.cors);
app.use(securityMiddleware.requestLogger);
app.use(securityMiddleware.securityHeaders);
app.use(securityMiddleware.sanitizeInput);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/notifications', rateLimitMiddleware.api);
app.use('/api/notifications/send', rateLimitMiddleware.notification);
app.use('/api/notifications/email', rateLimitMiddleware.email);
app.use('/api/notifications/sms', rateLimitMiddleware.sms);
app.use('/api/notifications/push', rateLimitMiddleware.push);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    const redisHealth = await redisService.client.ping();
    
    // Check RabbitMQ connection
    const rabbitMQHealth = rabbitMQService.connection ? 'connected' : 'disconnected';
    
    // Check Elasticsearch connection
    const elasticsearchHealth = await elasticsearchService.client.ping().then(() => 'connected').catch(() => 'disconnected');

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisHealth === 'PONG' ? 'healthy' : 'unhealthy',
        rabbitmq: rabbitMQHealth === 'connected' ? 'healthy' : 'unhealthy',
        elasticsearch: elasticsearchHealth === 'connected' ? 'healthy' : 'unhealthy'
      }
    };

    const isHealthy = Object.values(healthStatus.services).every(status => status === 'healthy');
    
    res.status(isHealthy ? 200 : 503).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// API routes
app.use('/api/notifications', notificationController);
app.use('/api/notification-preferences', notificationPreferencesController);
app.use('/api/notification-templates', notificationTemplateController);
app.use('/api/notification-metrics', notificationMetricsController);

// Error handling middleware
app.use(securityMiddleware.errorLogger);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Initialize external services
async function initializeServices() {
  try {
    // Initialize Redis
    await redisService.connect();
    logger.info('Redis connected successfully');

    // Initialize RabbitMQ
    await rabbitMQService.connect();
    logger.info('RabbitMQ connected successfully');

    // Initialize Elasticsearch
    await elasticsearchService.connect();
    await elasticsearchService.createIndexIfNotExists();
    logger.info('Elasticsearch connected successfully');

    // Start notification consumers
    await notificationConsumer.startConsumers();
    logger.info('Notification consumers started successfully');

  } catch (error) {
    logger.error('Failed to initialize services', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await redisService.disconnect();
    await rabbitMQService.disconnect();
    logger.info('Services disconnected successfully');
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    await redisService.disconnect();
    await rabbitMQService.disconnect();
    logger.info('Services disconnected successfully');
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  process.exit(0);
});

// Initialize services when app starts
initializeServices().catch((error) => {
  logger.error('Failed to initialize application', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});

export default app; 