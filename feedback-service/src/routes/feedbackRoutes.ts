import { Router } from 'express';
import {
  submitFeedback,
  getFeedbackByBranch,
  getFeedbackByServiceType,
  getFeedbackAnalytics,
  respondToFeedback,
  getFeedbackById,
  deleteFeedback
} from '../controllers/feedbackController';
import { validateFeedbackSubmission, validateFeedbackQuery, validateFeedbackResponse } from '../middleware/validation';

const router = Router();

// POST /api/feedback/submit
router.post('/submit', validateFeedbackSubmission, submitFeedback);

// GET /api/feedback/branch/:branch_id
router.get('/branch/:branch_id', validateFeedbackQuery, getFeedbackByBranch);

// GET /api/feedback/service/:service_type_id
router.get('/service/:service_type_id', validateFeedbackQuery, getFeedbackByServiceType);

// GET /api/feedback/analytics/:branch_id
router.get('/analytics/:branch_id', getFeedbackAnalytics);

// PUT /api/feedback/:id/respond
router.put('/:id/respond', validateFeedbackResponse, respondToFeedback);

// GET /api/feedback/:id
router.get('/:id', getFeedbackById);

// DELETE /api/feedback/:id
router.delete('/:id', deleteFeedback);

export default router; 