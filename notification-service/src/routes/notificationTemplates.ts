import { Router } from 'express';
import { notificationTemplateController } from '../controllers/notificationTemplateController';
import { securityMiddleware } from '../middleware/security';
import { rateLimitMiddleware } from '../middleware/rateLimiter';
import { validateNotificationTemplate } from '../middleware/validation';

const router = Router();

// Apply authentication to all template routes
router.use(securityMiddleware.authenticate);

// Get all templates
router.get('/', 
  rateLimitMiddleware.api,
  notificationTemplateController.getAllTemplates
);

// Get template by ID
router.get('/:id', 
  rateLimitMiddleware.api,
  notificationTemplateController.getTemplateById
);

// Create new template
router.post('/', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['create:templates']),
  validateNotificationTemplate,
  notificationTemplateController.createTemplate
);

// Update template
router.put('/:id', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['update:templates']),
  validateNotificationTemplate,
  notificationTemplateController.updateTemplate
);

// Delete template
router.delete('/:id', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['delete:templates']),
  notificationTemplateController.deleteTemplate
);

// Toggle template status
router.patch('/:id/toggle', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['update:templates']),
  notificationTemplateController.toggleTemplateStatus
);

// Preview template
router.post('/:id/preview', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['read:templates']),
  notificationTemplateController.previewTemplate
);

// Get template variables
router.get('/:id/variables', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['read:templates']),
  notificationTemplateController.getTemplateVariables
);

// Duplicate template
router.post('/:id/duplicate', 
  rateLimitMiddleware.api,
  securityMiddleware.authorize(['create:templates']),
  notificationTemplateController.duplicateTemplate
);

export default router; 