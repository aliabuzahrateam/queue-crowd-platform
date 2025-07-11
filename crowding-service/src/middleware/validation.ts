import { Request, Response, NextFunction } from 'express';

export const validateCrowdData = (req: Request, res: Response, next: NextFunction) => {
  const { branch_id, people_count, source, notes } = req.body;

  const errors: string[] = [];

  // Validate branch_id
  if (!branch_id) {
    errors.push('Branch ID is required');
  } else if (typeof branch_id !== 'string') {
    errors.push('Branch ID must be a string');
  }

  // Validate people_count
  if (people_count === undefined || people_count === null) {
    errors.push('People count is required');
  } else if (typeof people_count !== 'number') {
    errors.push('People count must be a number');
  } else if (people_count < 0) {
    errors.push('People count cannot be negative');
  } else if (people_count > 10000) {
    errors.push('People count cannot exceed 10,000');
  }

  // Validate source (optional)
  if (source && typeof source !== 'string') {
    errors.push('Source must be a string');
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

  return next();
};

export const validateCrowdQuery = (req: Request, res: Response, next: NextFunction) => {
  const { start_date, end_date, limit } = req.query;

  const errors: string[] = [];

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

  return next();
};

export const validateAlertResolution = (req: Request, res: Response, next: NextFunction) => {
  const { resolved_by, resolution_notes } = req.body;

  const errors: string[] = [];

  // Validate resolved_by (optional)
  if (resolved_by && typeof resolved_by !== 'string') {
    errors.push('Resolved by must be a string');
  }

  // Validate resolution_notes (optional)
  if (resolution_notes && typeof resolution_notes !== 'string') {
    errors.push('Resolution notes must be a string');
  } else if (resolution_notes && resolution_notes.length > 1000) {
    errors.push('Resolution notes cannot exceed 1000 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  return next();
}; 