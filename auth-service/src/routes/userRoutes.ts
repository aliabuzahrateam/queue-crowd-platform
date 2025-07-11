import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  deactivateUser,
  activateUser,
  resetUserPassword,
  getUserSessions,
  revokeUserSession
} from '../controllers/userController';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

// All user routes require admin authentication
router.use(AuthMiddleware.requireAdmin());

// GET /api/users
router.get('/', getAllUsers);

// GET /api/users/:id
router.get('/:id', getUserById);

// PUT /api/users/:id
router.put('/:id', updateUser);

// DELETE /api/users/:id
router.delete('/:id', deleteUser);

// PUT /api/users/:id/deactivate
router.put('/:id/deactivate', deactivateUser);

// PUT /api/users/:id/activate
router.put('/:id/activate', activateUser);

// PUT /api/users/:id/reset-password
router.put('/:id/reset-password', resetUserPassword);

// GET /api/users/:id/sessions
router.get('/:id/sessions', getUserSessions);

// DELETE /api/users/sessions/:sessionId
router.delete('/sessions/:sessionId', revokeUserSession);

export default router; 