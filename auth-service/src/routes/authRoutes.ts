import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  verifyEmail,
  resendVerification
} from '../controllers/authController';
import { validateRegistration, validateLogin, validatePasswordReset, validateProfileUpdate } from '../middleware/validation';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', validatePasswordReset, resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// Protected routes
router.get('/profile', AuthMiddleware.authenticateToken, getProfile);
router.put('/profile', AuthMiddleware.authenticateToken, validateProfileUpdate, updateProfile);
router.put('/change-password', AuthMiddleware.authenticateToken, validatePasswordReset, changePassword);

export default router; 