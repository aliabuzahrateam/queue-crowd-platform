# Notification Service

A microservice for managing notifications across the Queue Crowd Platform. This service handles email, SMS, and push notifications with support for templates, user preferences, and delivery tracking.

## Features

- **Multi-channel notifications**: Email, SMS, and push notifications
- **Template management**: Create and manage reusable notification templates
- **User preferences**: Allow users to customize notification settings
- **Quiet hours**: Support for user-defined quiet hours
- **Delivery tracking**: Monitor notification delivery status and performance
- **Rate limiting**: Protect against abuse with configurable rate limits
- **External integrations**: Redis, RabbitMQ, Elasticsearch, Firebase, Twilio, SMTP
- **Comprehensive logging**: Structured logging with Elasticsearch integration

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database for notifications and preferences
- **Redis**: Caching and pub/sub functionality
- **RabbitMQ**: Message queuing for async processing
- **Elasticsearch**: Logging and analytics

### External APIs
- **SMTP Server**: Email delivery (Gmail, SendGrid, etc.)
- **Twilio**: SMS delivery
- **Firebase**: Push notifications

## Environment Variables

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/queue_crowd_platform?schema=notification"

# Server Configuration
PORT=3006
NODE_ENV=development

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=admin
RABBITMQ_PASSWORD=admin123

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
ELASTICSEARCH_INDEX=notification-logs
ELASTICSEARCH_ENABLED=true

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@queuecrowd.com

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications (Firebase)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003

# Notification Settings
MAX_NOTIFICATIONS_PER_USER=100
NOTIFICATION_RETENTION_DAYS=30
QUIET_HOURS_ENABLED=true
QUIET_HOURS_START=22:00
QUIET_HOURS_END=08:00
```

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

4. **Start the service**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## API Endpoints

### Notifications

#### Send Notification
```http
POST /api/notifications/send
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "user-123",
  "type": "email",
  "title": "Queue Update",
  "message": "Your ticket status has changed",
  "priority": "medium",
  "data": {
    "ticketNumber": "T123",
    "status": "processing"
  }
}
```

#### Get User Notifications
```http
GET /api/notifications/user/:userId
Authorization: Bearer <token>
```

#### Get Notification by ID
```http
GET /api/notifications/:id
Authorization: Bearer <token>
```

### Notification Preferences

#### Get User Preferences
```http
GET /api/notification-preferences/user/:userId
Authorization: Bearer <token>
```

#### Update User Preferences
```http
PUT /api/notification-preferences/user/:userId
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": true,
  "sms": false,
  "push": true,
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00"
  }
}
```

### Notification Templates

#### Create Template
```http
POST /api/notification-templates
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "queue_update_email",
  "type": "email",
  "subject": "Queue Update - {{ticketNumber}}",
  "content": "Your ticket {{ticketNumber}} status is {{status}}",
  "variables": ["ticketNumber", "status"],
  "isActive": true
}
```

#### Get All Templates
```http
GET /api/notification-templates
Authorization: Bearer <token>
```

#### Preview Template
```http
POST /api/notification-templates/:id/preview
Content-Type: application/json
Authorization: Bearer <token>

{
  "variables": {
    "ticketNumber": "T123",
    "status": "processing"
  }
}
```

### Notification Metrics

#### Get Overall Metrics
```http
GET /api/notification-metrics/overall?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

#### Get User Metrics
```http
GET /api/notification-metrics/user/:userId
Authorization: Bearer <token>
```

#### Get Delivery Performance
```http
GET /api/notification-metrics/performance
Authorization: Bearer <token>
```

## Database Schema

### Notifications
- `id`: Unique identifier
- `userId`: User who should receive the notification
- `type`: Notification type (email, sms, push, all)
- `title`: Notification title
- `message`: Notification content
- `data`: Additional data (JSON)
- `priority`: Priority level (low, medium, high, urgent)
- `status`: Delivery status (pending, delivered, failed)
- `scheduledAt`: When to send the notification
- `expiresAt`: When the notification expires
- `deliveredAt`: When the notification was delivered
- `errorMessage`: Error message if delivery failed

### Notification Preferences
- `userId`: User identifier
- `email`: Email notifications enabled
- `sms`: SMS notifications enabled
- `push`: Push notifications enabled
- `quietHoursEnabled`: Quiet hours enabled
- `quietHoursStart`: Quiet hours start time
- `quietHoursEnd`: Quiet hours end time

### Notification Templates
- `name`: Template name
- `type`: Template type (email, sms, push)
- `subject`: Email subject (for email templates)
- `content`: Template content
- `variables`: Template variables (JSON array)
- `isActive`: Template active status

### Device Tokens
- `userId`: User identifier
- `token`: Device token
- `platform`: Platform (ios, android, web)

## External Service Integration

### Redis
- Caching user preferences
- Pub/sub for real-time notifications
- Rate limiting storage

### RabbitMQ
- Email notification queue
- SMS notification queue
- Push notification queue
- Event processing queue

### Elasticsearch
- Structured logging
- Performance metrics
- Error tracking
- Analytics

### SMTP (Email)
- Gmail, SendGrid, AWS SES
- HTML and text email support
- Template rendering

### Twilio (SMS)
- SMS delivery
- Message templates
- Delivery status tracking

### Firebase (Push)
- iOS push notifications
- Android push notifications
- Web push notifications
- Token management

## Monitoring and Health Checks

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "redis": "healthy",
    "rabbitmq": "healthy",
    "elasticsearch": "healthy"
  }
}
```

### Metrics
- Notification delivery rates
- Average delivery times
- Error rates by channel
- User engagement metrics
- Service performance metrics

## Security

- JWT authentication
- Role-based authorization
- Rate limiting
- Input validation and sanitization
- CORS configuration
- Security headers (Helmet)

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run unit tests
npm run test:unit
```

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3006
CMD ["npm", "start"]
```

### Environment Setup
1. Set up PostgreSQL database
2. Configure Redis instance
3. Set up RabbitMQ cluster
4. Configure Elasticsearch
5. Set up external service credentials
6. Configure environment variables

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check DATABASE_URL
   - Ensure PostgreSQL is running
   - Verify database exists

2. **Redis connection failed**
   - Check Redis configuration
   - Ensure Redis is running
   - Verify Redis credentials

3. **Email delivery failed**
   - Check SMTP configuration
   - Verify email credentials
   - Check firewall settings

4. **SMS delivery failed**
   - Verify Twilio credentials
   - Check phone number format
   - Ensure sufficient Twilio credits

5. **Push notifications failed**
   - Verify Firebase configuration
   - Check device token validity
   - Ensure Firebase project is active

### Logs
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Elasticsearch logs: Check Elasticsearch cluster
- External service logs: Check respective service dashboards

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all external services are properly configured
5. Test with real external service credentials

## License

ISC 