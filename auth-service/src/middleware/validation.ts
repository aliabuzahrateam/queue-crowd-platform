import { Request, Response, NextFunction } from 'express';

export const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password, confirmPassword, role } = req.body;

  const errors: string[] = [];

  // Validate username
  if (!username) {
    errors.push('Username is required');
  } else if (typeof username !== 'string') {
    errors.push('Username must be a string');
  } else if (username.length < 3 || username.length > 30) {
    errors.push('Username must be between 3 and 30 characters');
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  // Validate email
  if (!email) {
    errors.push('Email is required');
  } else if (typeof email !== 'string') {
    errors.push('Email must be a string');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Email must be a valid email address');
    }
  }

  // Validate password
  if (!password) {
    errors.push('Password is required');
  } else if (typeof password !== 'string') {
    errors.push('Password must be a string');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one lowercase letter, one uppercase letter, and one number');
  }

  // Validate confirm password
  if (!confirmPassword) {
    errors.push('Confirm password is required');
  } else if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  // Validate role (optional)
  if (role && typeof role !== 'string') {
    errors.push('Role must be a string');
  } else if (role) {
    const validRoles = ['user', 'staff', 'admin'];
    if (!validRoles.includes(role)) {
      errors.push('Role must be one of: user, staff, admin');
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

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  const errors: string[] = [];

  // Validate email
  if (!email) {
    errors.push('Email is required');
  } else if (typeof email !== 'string') {
    errors.push('Email must be a string');
  }

  // Validate password
  if (!password) {
    errors.push('Password is required');
  } else if (typeof password !== 'string') {
    errors.push('Password must be a string');
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

export const validatePasswordReset = (req: Request, res: Response, next: NextFunction) => {
  const { token, password, confirmPassword } = req.body;

  const errors: string[] = [];

  // Validate token
  if (!token) {
    errors.push('Token is required');
  } else if (typeof token !== 'string') {
    errors.push('Token must be a string');
  }

  // Validate password
  if (!password) {
    errors.push('Password is required');
  } else if (typeof password !== 'string') {
    errors.push('Password must be a string');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one lowercase letter, one uppercase letter, and one number');
  }

  // Validate confirm password
  if (!confirmPassword) {
    errors.push('Confirm password is required');
  } else if (password !== confirmPassword) {
    errors.push('Passwords do not match');
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

export const validateProfileUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { username, email, firstName, lastName, phone } = req.body;

  const errors: string[] = [];

  // Validate username (optional)
  if (username && typeof username !== 'string') {
    errors.push('Username must be a string');
  } else if (username && (username.length < 3 || username.length > 30)) {
    errors.push('Username must be between 3 and 30 characters');
  } else if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
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

  // Validate firstName (optional)
  if (firstName && typeof firstName !== 'string') {
    errors.push('First name must be a string');
  } else if (firstName && firstName.length > 50) {
    errors.push('First name cannot exceed 50 characters');
  }

  // Validate lastName (optional)
  if (lastName && typeof lastName !== 'string') {
    errors.push('Last name must be a string');
  } else if (lastName && lastName.length > 50) {
    errors.push('Last name cannot exceed 50 characters');
  }

  // Validate phone (optional)
  if (phone && typeof phone !== 'string') {
    errors.push('Phone must be a string');
  } else if (phone && !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
    errors.push('Phone must be a valid phone number');
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