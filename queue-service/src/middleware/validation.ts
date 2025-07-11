import { Request, Response, NextFunction } from 'express';

export const validateQueueTicket = (req: Request, res: Response, next: NextFunction) => {
  const { 
    branch_id, 
    service_type_id, 
    customer_name, 
    customer_phone, 
    customer_email,
    estimated_wait_time,
    priority,
    notes 
  } = req.body;

  const errors: string[] = [];

  // Validate branch_id
  if (!branch_id) {
    errors.push('Branch ID is required');
  } else if (typeof branch_id !== 'string') {
    errors.push('Branch ID must be a string');
  }

  // Validate service_type_id
  if (!service_type_id) {
    errors.push('Service type ID is required');
  } else if (typeof service_type_id !== 'string') {
    errors.push('Service type ID must be a string');
  }

  // Validate customer_name
  if (!customer_name) {
    errors.push('Customer name is required');
  } else if (typeof customer_name !== 'string') {
    errors.push('Customer name must be a string');
  } else if (customer_name.length < 2 || customer_name.length > 100) {
    errors.push('Customer name must be between 2 and 100 characters');
  }

  // Validate customer_phone (optional)
  if (customer_phone && typeof customer_phone !== 'string') {
    errors.push('Customer phone must be a string');
  } else if (customer_phone && !/^\+?[\d\s\-\(\)]+$/.test(customer_phone)) {
    errors.push('Customer phone must be a valid phone number');
  }

  // Validate customer_email (optional)
  if (customer_email && typeof customer_email !== 'string') {
    errors.push('Customer email must be a string');
  } else if (customer_email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      errors.push('Customer email must be a valid email address');
    }
  }

  // Validate estimated_wait_time (optional)
  if (estimated_wait_time !== undefined && estimated_wait_time !== null) {
    if (typeof estimated_wait_time !== 'number') {
      errors.push('Estimated wait time must be a number');
    } else if (estimated_wait_time < 0 || estimated_wait_time > 1440) {
      errors.push('Estimated wait time must be between 0 and 1440 minutes');
    }
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

  // Validate notes (optional)
  if (notes && typeof notes !== 'string') {
    errors.push('Notes must be a string');
  } else if (notes && notes.length > 500) {
    errors.push('Notes cannot exceed 500 characters');
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

export const validateQueueEvent = (req: Request, res: Response, next: NextFunction) => {
  const { 
    queue_ticket_id, 
    event_type, 
    description, 
    data 
  } = req.body;

  const errors: string[] = [];

  // Validate queue_ticket_id
  if (!queue_ticket_id) {
    errors.push('Queue ticket ID is required');
  } else if (typeof queue_ticket_id !== 'string') {
    errors.push('Queue ticket ID must be a string');
  }

  // Validate event_type
  if (!event_type) {
    errors.push('Event type is required');
  } else if (typeof event_type !== 'string') {
    errors.push('Event type must be a string');
  } else {
    const validEventTypes = [
      'ticket_created',
      'ticket_called',
      'ticket_served',
      'ticket_cancelled',
      'ticket_no_show',
      'wait_time_updated',
      'priority_changed',
      'service_started',
      'service_completed'
    ];
    if (!validEventTypes.includes(event_type)) {
      errors.push('Event type must be one of the valid event types');
    }
  }

  // Validate description (optional)
  if (description && typeof description !== 'string') {
    errors.push('Description must be a string');
  } else if (description && description.length > 200) {
    errors.push('Description cannot exceed 200 characters');
  }

  // Validate data (optional)
  if (data && typeof data !== 'object') {
    errors.push('Data must be an object');
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

export const validateQueueQuery = (req: Request, res: Response, next: NextFunction) => {
  const { 
    status, 
    priority, 
    start_date, 
    end_date, 
    limit, 
    offset 
  } = req.query;

  const errors: string[] = [];

  // Validate status (optional)
  if (status && typeof status === 'string') {
    const validStatuses = ['waiting', 'called', 'served', 'cancelled', 'no_show'];
    if (!validStatuses.includes(status)) {
      errors.push('Status must be one of: waiting, called, served, cancelled, no_show');
    }
  }

  // Validate priority (optional)
  if (priority && typeof priority === 'string') {
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      errors.push('Priority must be one of: low, normal, high, urgent');
    }
  }

  // Validate start_date (optional)
  if (start_date && typeof start_date === 'string') {
    const startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      errors.push('Start date must be a valid date');
    }
  }

  // Validate end_date (optional)
  if (end_date && typeof end_date === 'string') {
    const endDate = new Date(end_date);
    if (isNaN(endDate.getTime())) {
      errors.push('End date must be a valid date');
    }
  }

  // Validate both dates together
  if (start_date && end_date && typeof start_date === 'string' && typeof end_date === 'string') {
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate >= endDate) {
      errors.push('Start date must be before end date');
    }
  }

  // Validate limit (optional)
  if (limit) {
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      errors.push('Limit must be a number between 1 and 1000');
    }
  }

  // Validate offset (optional)
  if (offset) {
    const offsetNum = Number(offset);
    if (isNaN(offsetNum) || offsetNum < 0) {
      errors.push('Offset must be a non-negative number');
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