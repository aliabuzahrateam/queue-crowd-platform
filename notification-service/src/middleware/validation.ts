import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export const validateNotificationData = (req: Request, res: Response, next: NextFunction) => {
  const { 
    recipient_id, 
    recipient_type, 
    notification_type, 
    title, 
    message, 
    data,
    priority,
    scheduled_for 
  } = req.body;

  const errors: string[] = [];

  // Validate recipient_id
  if (!recipient_id) {
    errors.push('Recipient ID is required');
  } else if (typeof recipient_id !== 'string') {
    errors.push('Recipient ID must be a string');
  }

  // Validate recipient_type
  if (!recipient_type) {
    errors.push('Recipient type is required');
  } else if (typeof recipient_type !== 'string') {
    errors.push('Recipient type must be a string');
  } else {
    const validRecipientTypes = ['user', 'staff', 'branch'];
    if (!validRecipientTypes.includes(recipient_type)) {
      errors.push('Recipient type must be one of: user, staff, branch');
    }
  }

  // Validate notification_type
  if (!notification_type) {
    errors.push('Notification type is required');
  } else if (typeof notification_type !== 'string') {
    errors.push('Notification type must be a string');
  } else {
    const validNotificationTypes = ['queue_update', 'crowd_alert', 'feedback_response', 'system_alert', 'reminder'];
    if (!validNotificationTypes.includes(notification_type)) {
      errors.push('Notification type must be one of: queue_update, crowd_alert, feedback_response, system_alert, reminder');
    }
  }

  // Validate title
  if (!title) {
    errors.push('Title is required');
  } else if (typeof title !== 'string') {
    errors.push('Title must be a string');
  } else if (title.length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }

  // Validate message
  if (!message) {
    errors.push('Message is required');
  } else if (typeof message !== 'string') {
    errors.push('Message must be a string');
  } else if (message.length > 1000) {
    errors.push('Message cannot exceed 1000 characters');
  }

  // Validate data (optional)
  if (data && typeof data !== 'object') {
    errors.push('Data must be an object');
  }

  // Validate priority (optional)
  if (priority && typeof priority !== 'string') {
    errors.push('Priority must be a string');
  } else if (priority) {
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      errors.push('Priority must be one of: low, normal, high, urgent');
    }
  }

  // Validate scheduled_for (optional)
  if (scheduled_for && typeof scheduled_for === 'string') {
    const scheduledDate = new Date(scheduled_for);
    if (isNaN(scheduledDate.getTime())) {
      errors.push('Scheduled for must be a valid date');
    } else if (scheduledDate <= new Date()) {
      errors.push('Scheduled for must be in the future');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

export const validateBulkNotification = (req: Request, res: Response, next: NextFunction) => {
  const { 
    recipient_ids, 
    recipient_type, 
    notification_type, 
    title, 
    message, 
    data,
    priority,
    scheduled_for 
  } = req.body;

  const errors: string[] = [];

  // Validate recipient_ids
  if (!recipient_ids) {
    errors.push('Recipient IDs is required');
  } else if (!Array.isArray(recipient_ids)) {
    errors.push('Recipient IDs must be an array');
  } else if (recipient_ids.length === 0) {
    errors.push('Recipient IDs array cannot be empty');
  } else if (recipient_ids.length > 1000) {
    errors.push('Recipient IDs array cannot exceed 1000 items');
  } else {
    recipient_ids.forEach((id, index) => {
      if (typeof id !== 'string') {
        errors.push(`Recipient ID at index ${index} must be a string`);
      }
    });
  }

  // Validate recipient_type
  if (!recipient_type) {
    errors.push('Recipient type is required');
  } else if (typeof recipient_type !== 'string') {
    errors.push('Recipient type must be a string');
  } else {
    const validRecipientTypes = ['user', 'staff', 'branch'];
    if (!validRecipientTypes.includes(recipient_type)) {
      errors.push('Recipient type must be one of: user, staff, branch');
    }
  }

  // Validate notification_type
  if (!notification_type) {
    errors.push('Notification type is required');
  } else if (typeof notification_type !== 'string') {
    errors.push('Notification type must be a string');
  } else {
    const validNotificationTypes = ['queue_update', 'crowd_alert', 'feedback_response', 'system_alert', 'reminder'];
    if (!validNotificationTypes.includes(notification_type)) {
      errors.push('Notification type must be one of: queue_update, crowd_alert, feedback_response, system_alert, reminder');
    }
  }

  // Validate title
  if (!title) {
    errors.push('Title is required');
  } else if (typeof title !== 'string') {
    errors.push('Title must be a string');
  } else if (title.length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }

  // Validate message
  if (!message) {
    errors.push('Message is required');
  } else if (typeof message !== 'string') {
    errors.push('Message must be a string');
  } else if (message.length > 1000) {
    errors.push('Message cannot exceed 1000 characters');
  }

  // Validate data (optional)
  if (data && typeof data !== 'object') {
    errors.push('Data must be an object');
  }

  // Validate priority (optional)
  if (priority && typeof priority !== 'string') {
    errors.push('Priority must be a string');
  } else if (priority) {
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      errors.push('Priority must be one of: low, normal, high, urgent');
    }
  }

  // Validate scheduled_for (optional)
  if (scheduled_for && typeof scheduled_for === 'string') {
    const scheduledDate = new Date(scheduled_for);
    if (isNaN(scheduledDate.getTime())) {
      errors.push('Scheduled for must be a valid date');
    } else if (scheduledDate <= new Date()) {
      errors.push('Scheduled for must be in the future');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Validation for notification templates
export const validateNotificationTemplate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Template name is required and must be between 1 and 100 characters'),
  
  body('type')
    .isIn(['email', 'sms', 'push'])
    .withMessage('Type must be email, sms, or push'),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subject must be less than 200 characters'),
  
  body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content is required and must be between 1 and 10000 characters'),
  
  body('variables')
    .optional()
    .isArray()
    .withMessage('Variables must be an array'),
  
  body('variables.*')
    .optional()
    .isString()
    .withMessage('Each variable must be a string'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Validation for notification preferences
export const validateNotificationPreferences = [
  body('email')
    .optional()
    .isBoolean()
    .withMessage('Email preference must be a boolean'),
  
  body('sms')
    .optional()
    .isBoolean()
    .withMessage('SMS preference must be a boolean'),
  
  body('push')
    .optional()
    .isBoolean()
    .withMessage('Push preference must be a boolean'),
  
  body('quietHours.enabled')
    .optional()
    .isBoolean()
    .withMessage('Quiet hours enabled must be a boolean'),
  
  body('quietHours.start')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Quiet hours start must be in HH:MM format'),
  
  body('quietHours.end')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Quiet hours end must be in HH:MM format'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Validation for notification sending
export const validateNotificationSend = [
  body('userId')
    .trim()
    .isLength({ min: 1 })
    .withMessage('User ID is required'),
  
  body('type')
    .isIn(['email', 'sms', 'push', 'all'])
    .withMessage('Type must be email, sms, push, or all'),
  
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be between 1 and 200 characters'),
  
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message is required and must be between 1 and 1000 characters'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expires date must be a valid ISO 8601 date'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Validation for device token registration
export const validateDeviceToken = [
  body('userId')
    .trim()
    .isLength({ min: 1 })
    .withMessage('User ID is required'),
  
  body('token')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Device token is required and must be less than 500 characters'),
  
  body('platform')
    .isIn(['ios', 'android', 'web'])
    .withMessage('Platform must be ios, android, or web'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Validation for metrics queries
export const validateMetricsQuery = [
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Helper function to parse time string
function parseTimeString(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
} 