import { Request, Response, NextFunction } from 'express';

export const validateBranchData = (req: Request, res: Response, next: NextFunction) => {
  const { 
    name, 
    address, 
    city, 
    state, 
    postal_code, 
    country, 
    phone, 
    email, 
    max_capacity,
    operating_hours 
  } = req.body;

  const errors: string[] = [];

  // Validate name
  if (!name) {
    errors.push('Branch name is required');
  } else if (typeof name !== 'string') {
    errors.push('Branch name must be a string');
  } else if (name.length < 2 || name.length > 100) {
    errors.push('Branch name must be between 2 and 100 characters');
  }

  // Validate address
  if (!address) {
    errors.push('Address is required');
  } else if (typeof address !== 'string') {
    errors.push('Address must be a string');
  } else if (address.length < 5 || address.length > 200) {
    errors.push('Address must be between 5 and 200 characters');
  }

  // Validate city
  if (!city) {
    errors.push('City is required');
  } else if (typeof city !== 'string') {
    errors.push('City must be a string');
  } else if (city.length < 2 || city.length > 50) {
    errors.push('City must be between 2 and 50 characters');
  }

  // Validate state
  if (!state) {
    errors.push('State is required');
  } else if (typeof state !== 'string') {
    errors.push('State must be a string');
  } else if (state.length < 2 || state.length > 50) {
    errors.push('State must be between 2 and 50 characters');
  }

  // Validate postal_code
  if (!postal_code) {
    errors.push('Postal code is required');
  } else if (typeof postal_code !== 'string') {
    errors.push('Postal code must be a string');
  } else if (postal_code.length < 3 || postal_code.length > 20) {
    errors.push('Postal code must be between 3 and 20 characters');
  }

  // Validate country
  if (!country) {
    errors.push('Country is required');
  } else if (typeof country !== 'string') {
    errors.push('Country must be a string');
  } else if (country.length < 2 || country.length > 50) {
    errors.push('Country must be between 2 and 50 characters');
  }

  // Validate phone (optional)
  if (phone && typeof phone !== 'string') {
    errors.push('Phone must be a string');
  } else if (phone && !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
    errors.push('Phone must be a valid phone number');
  }

  // Validate email (optional)
  if (email && typeof email !== 'string') {
    errors.push('Email must be a string');
  } else if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Email must be a valid email address');
    }
  }

  // Validate max_capacity (optional)
  if (max_capacity !== undefined && max_capacity !== null) {
    if (typeof max_capacity !== 'number') {
      errors.push('Max capacity must be a number');
    } else if (max_capacity < 1 || max_capacity > 10000) {
      errors.push('Max capacity must be between 1 and 10,000');
    }
  }

  // Validate operating_hours (optional)
  if (operating_hours && typeof operating_hours !== 'object') {
    errors.push('Operating hours must be an object');
  } else if (operating_hours) {
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const providedDays = Object.keys(operating_hours);
    
    providedDays.forEach(day => {
      if (!validDays.includes(day)) {
        errors.push(`Invalid day: ${day}`);
      } else {
        const hours = operating_hours[day];
        if (hours && typeof hours !== 'object') {
          errors.push(`Operating hours for ${day} must be an object`);
        } else if (hours) {
          if (hours.open && typeof hours.open !== 'string') {
            errors.push(`Open time for ${day} must be a string`);
          }
          if (hours.close && typeof hours.close !== 'string') {
            errors.push(`Close time for ${day} must be a string`);
          }
          if (hours.open && hours.close) {
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(hours.open) || !timeRegex.test(hours.close)) {
              errors.push(`Time format for ${day} must be HH:MM`);
            }
          }
        }
      }
    });
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

export const validateBranchUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { 
    name, 
    address, 
    city, 
    state, 
    postal_code, 
    country, 
    phone, 
    email, 
    max_capacity,
    operating_hours 
  } = req.body;

  const errors: string[] = [];

  // Validate name (optional for updates)
  if (name && typeof name !== 'string') {
    errors.push('Branch name must be a string');
  } else if (name && (name.length < 2 || name.length > 100)) {
    errors.push('Branch name must be between 2 and 100 characters');
  }

  // Validate address (optional for updates)
  if (address && typeof address !== 'string') {
    errors.push('Address must be a string');
  } else if (address && (address.length < 5 || address.length > 200)) {
    errors.push('Address must be between 5 and 200 characters');
  }

  // Validate city (optional for updates)
  if (city && typeof city !== 'string') {
    errors.push('City must be a string');
  } else if (city && (city.length < 2 || city.length > 50)) {
    errors.push('City must be between 2 and 50 characters');
  }

  // Validate state (optional for updates)
  if (state && typeof state !== 'string') {
    errors.push('State must be a string');
  } else if (state && (state.length < 2 || state.length > 50)) {
    errors.push('State must be between 2 and 50 characters');
  }

  // Validate postal_code (optional for updates)
  if (postal_code && typeof postal_code !== 'string') {
    errors.push('Postal code must be a string');
  } else if (postal_code && (postal_code.length < 3 || postal_code.length > 20)) {
    errors.push('Postal code must be between 3 and 20 characters');
  }

  // Validate country (optional for updates)
  if (country && typeof country !== 'string') {
    errors.push('Country must be a string');
  } else if (country && (country.length < 2 || country.length > 50)) {
    errors.push('Country must be between 2 and 50 characters');
  }

  // Validate phone (optional)
  if (phone && typeof phone !== 'string') {
    errors.push('Phone must be a string');
  } else if (phone && !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
    errors.push('Phone must be a valid phone number');
  }

  // Validate email (optional)
  if (email && typeof email !== 'string') {
    errors.push('Email must be a string');
  } else if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Email must be a valid email address');
    }
  }

  // Validate max_capacity (optional)
  if (max_capacity !== undefined && max_capacity !== null) {
    if (typeof max_capacity !== 'number') {
      errors.push('Max capacity must be a number');
    } else if (max_capacity < 1 || max_capacity > 10000) {
      errors.push('Max capacity must be between 1 and 10,000');
    }
  }

  // Validate operating_hours (optional)
  if (operating_hours && typeof operating_hours !== 'object') {
    errors.push('Operating hours must be an object');
  } else if (operating_hours) {
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const providedDays = Object.keys(operating_hours);
    
    providedDays.forEach(day => {
      if (!validDays.includes(day)) {
        errors.push(`Invalid day: ${day}`);
      } else {
        const hours = operating_hours[day];
        if (hours && typeof hours !== 'object') {
          errors.push(`Operating hours for ${day} must be an object`);
        } else if (hours) {
          if (hours.open && typeof hours.open !== 'string') {
            errors.push(`Open time for ${day} must be a string`);
          }
          if (hours.close && typeof hours.close !== 'string') {
            errors.push(`Close time for ${day} must be a string`);
          }
          if (hours.open && hours.close) {
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(hours.open) || !timeRegex.test(hours.close)) {
              errors.push(`Time format for ${day} must be HH:MM`);
            }
          }
        }
      }
    });
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