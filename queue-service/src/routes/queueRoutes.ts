import { Router } from 'express';
import {
  createQueueTicket,
  getQueueTicketById,
  updateQueueTicket,
  deleteQueueTicket,
  getQueueTicketsByBranch,
  getQueueTicketsByServiceType,
  getQueueAnalytics,
  getQueueEvents,
  createQueueEvent,
  updateQueueEvent,
  deleteQueueEvent
} from '../controllers/queueController';
import { validateQueueTicket, validateQueueEvent, validateQueueQuery } from '../middleware/validation';

const router = Router();

// Queue Ticket routes
router.post('/tickets', validateQueueTicket, createQueueTicket);
router.get('/tickets/:id', getQueueTicketById);
router.put('/tickets/:id', validateQueueTicket, updateQueueTicket);
router.delete('/tickets/:id', deleteQueueTicket);
router.get('/tickets/branch/:branch_id', validateQueueQuery, getQueueTicketsByBranch);
router.get('/tickets/service/:service_type_id', validateQueueQuery, getQueueTicketsByServiceType);
router.get('/tickets/analytics/:branch_id', getQueueAnalytics);

// Queue Event routes
router.get('/events', getQueueEvents);
router.post('/events', validateQueueEvent, createQueueEvent);
router.put('/events/:id', validateQueueEvent, updateQueueEvent);
router.delete('/events/:id', deleteQueueEvent);

export default router; 