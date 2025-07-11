import { Router } from 'express';
import {
  getAllPasswordResets,
  getPasswordResetById,
  deletePasswordReset,
  cleanupExpiredPasswordResets,
  getPasswordResetStats,
  validatePasswordResetToken
} from '../controllers/passwordResetController';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

// Admin routes (require admin authentication)
router.use('/admin', AuthMiddleware.requireAdmin());

// GET /api/password-resets/admin
router.get('/admin', getAllPasswordResets);

// GET /api/password-resets/admin/:id
router.get('/admin/:id', getPasswordResetById);

// DELETE /api/password-resets/admin/:id
router.delete('/admin/:id', deletePasswordReset);

// POST /api/password-resets/admin/cleanup
router.post('/admin/cleanup', cleanupExpiredPasswordResets);

// GET /api/password-resets/admin/stats
router.get('/admin/stats', getPasswordResetStats);

// Public route for token validation
// GET /api/password-resets/validate/:token
router.get('/validate/:token', validatePasswordResetToken);

export default router; 