import { Request, Response, NextFunction } from 'express';

export const validateFeedbackSubmission = (req: Request, res: Response, next: NextFunction) => {
  const { 
    branch_id, 
    service_type_id, 
    rating, 
    category, 
    comment, 
    customer_name, 
    customer_email,
    queue_ticket_id 
  } = req.body;

  const errors: string[] = [];

  // Validate branch_id
  if (!branch_id) {
    errors.push('Branch ID is required');
  } else if (typeof branch_id !== 'string') {
    errors.push('Branch ID must be a string');
  }

  // Validate service_type_id (optional)
  if (service_type_id && typeof service_type_id !== 'string') {
    errors.push('Service type ID must be a string');
  }

  // Validate rating
  if (rating === undefined || rating === null) {
    errors.push('Rating is required');
  } else if (typeof rating !== 'number') {
    errors.push('Rating must be a number');
  } else if (rating < 1 || rating > 5) {
    errors.push('Rating must be between 1 and 5');
  }

  // Validate category
  if (!category) {
    errors.push('Category is required');
  } else if (typeof category !== 'string') {
    errors.push('Category must be a string');
  } else {
    const validCategories = ['service_quality', 'wait_time', 'staff_behavior', 'facility', 'overall_experience'];
    if (!validCategories.includes(category)) {
      errors.push('Category must be one of: service_quality, wait_time, staff_behavior, facility, overall_experience');
    }
  }

  // Validate comment (optional)
  if (comment && typeof comment !== 'string') {
    errors.push('Comment must be a string');
  } else if (comment && comment.length > 1000) {
    errors.push('Comment cannot exceed 1000 characters');
  }

  // Validate customer_name (optional)
  if (customer_name && typeof customer_name !== 'string') {
    errors.push('Customer name must be a string');
  } else if (customer_name && customer_name.length > 100) {
    errors.push('Customer name cannot exceed 100 characters');
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

  // Validate queue_ticket_id (optional)
  if (queue_ticket_id && typeof queue_ticket_id !== 'string') {
    errors.push('Queue ticket ID must be a string');
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

export const validateFeedbackQuery = (req: Request, res: Response, next: NextFunction) => {
  const { category, rating, start_date, end_date, limit } = req.query;

  const errors: string[] = [];

  // Validate category (optional)
  if (category && typeof category === 'string') {
    const validCategories = ['service_quality', 'wait_time', 'staff_behavior', 'facility', 'overall_experience'];
    if (!validCategories.includes(category)) {
      errors.push('Category must be one of: service_quality, wait_time, staff_behavior, facility, overall_experience');
    }
  }

  // Validate rating (optional)
  if (rating) {
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      errors.push('Rating must be a number between 1 and 5');
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

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

export const validateFeedbackResponse = (req: Request, res: Response, next: NextFunction) => {
  const { response, responded_by } = req.body;

  const errors: string[] = [];

  // Validate response
  if (!response) {
    errors.push('Response is required');
  } else if (typeof response !== 'string') {
    errors.push('Response must be a string');
  } else if (response.length > 1000) {
    errors.push('Response cannot exceed 1000 characters');
  }

  // Validate responded_by (optional)
  if (responded_by && typeof responded_by !== 'string') {
    errors.push('Responded by must be a string');
  } else if (responded_by && responded_by.length > 100) {
    errors.push('Responded by cannot exceed 100 characters');
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