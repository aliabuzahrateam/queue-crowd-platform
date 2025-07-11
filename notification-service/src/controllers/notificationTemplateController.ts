import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../config/winston';

const prisma = new PrismaClient();

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const notificationTemplateController = {
  // Get all templates
  async getAllTemplates(req: Request, res: Response) {
    try {
      const { type, isActive } = req.query;
      
      const where: any = {};
      if (type) where.type = type;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const templates = await prisma.notificationTemplate.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Failed to get templates', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get templates'
      });
    }
  },

  // Get template by ID
  async getTemplateById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const template = await prisma.notificationTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Failed to get template by ID', {
        error: error instanceof Error ? error.message : String(error),
        templateId: req.params.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get template'
      });
    }
  },

  // Create new template
  async createTemplate(req: Request, res: Response) {
    try {
      const { name, type, subject, content, variables, isActive = true } = req.body;

      // Validate required fields
      if (!name || !type || !content) {
        return res.status(400).json({
          success: false,
          error: 'Name, type, and content are required'
        });
      }

      // Validate type
      if (!['email', 'sms', 'push'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Type must be email, sms, or push'
        });
      }

      // Check if template with same name exists
      const existingTemplate = await prisma.notificationTemplate.findFirst({
        where: { name }
      });

      if (existingTemplate) {
        return res.status(409).json({
          success: false,
          error: 'Template with this name already exists'
        });
      }

      const template = await prisma.notificationTemplate.create({
        data: {
          name,
          type,
          subject,
          content,
          variables: variables || [],
          isActive
        }
      });

      logger.info('Template created', {
        templateId: template.id,
        name: template.name,
        type: template.type
      });

      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Failed to create template', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create template'
      });
    }
  },

  // Update template
  async updateTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, type, subject, content, variables, isActive } = req.body;

      // Check if template exists
      const existingTemplate = await prisma.notificationTemplate.findUnique({
        where: { id }
      });

      if (!existingTemplate) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      // Validate type if provided
      if (type && !['email', 'sms', 'push'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Type must be email, sms, or push'
        });
      }

      // Check for name conflict if name is being changed
      if (name && name !== existingTemplate.name) {
        const nameConflict = await prisma.notificationTemplate.findFirst({
          where: { 
            name,
            id: { not: id }
          }
        });

        if (nameConflict) {
          return res.status(409).json({
            success: false,
            error: 'Template with this name already exists'
          });
        }
      }

      const template = await prisma.notificationTemplate.update({
        where: { id },
        data: {
          name,
          type,
          subject,
          content,
          variables,
          isActive,
          updatedAt: new Date()
        }
      });

      logger.info('Template updated', {
        templateId: template.id,
        name: template.name
      });

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Failed to update template', {
        error: error instanceof Error ? error.message : String(error),
        templateId: req.params.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update template'
      });
    }
  },

  // Delete template
  async deleteTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if template exists
      const template = await prisma.notificationTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      await prisma.notificationTemplate.delete({
        where: { id }
      });

      logger.info('Template deleted', {
        templateId: id,
        name: template.name
      });

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete template', {
        error: error instanceof Error ? error.message : String(error),
        templateId: req.params.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to delete template'
      });
    }
  },

  // Toggle template active status
  async toggleTemplateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const template = await prisma.notificationTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      const updatedTemplate = await prisma.notificationTemplate.update({
        where: { id },
        data: {
          isActive: !template.isActive,
          updatedAt: new Date()
        }
      });

      logger.info('Template status toggled', {
        templateId: template.id,
        name: template.name,
        newStatus: updatedTemplate.isActive
      });

      res.json({
        success: true,
        data: updatedTemplate
      });
    } catch (error) {
      logger.error('Failed to toggle template status', {
        error: error instanceof Error ? error.message : String(error),
        templateId: req.params.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to toggle template status'
      });
    }
  },

  // Preview template with variables
  async previewTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { variables } = req.body;

      const template = await prisma.notificationTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      if (!template.isActive) {
        return res.status(400).json({
          success: false,
          error: 'Template is not active'
        });
      }

      // Replace variables in content
      let previewContent = template.content;
      let previewSubject = template.subject;

      if (variables && typeof variables === 'object') {
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          previewContent = previewContent.replace(regex, String(value));
          if (previewSubject) {
            previewSubject = previewSubject.replace(regex, String(value));
          }
        });
      }

      res.json({
        success: true,
        data: {
          id: template.id,
          name: template.name,
          type: template.type,
          subject: previewSubject,
          content: previewContent,
          variables: template.variables,
          preview: true
        }
      });
    } catch (error) {
      logger.error('Failed to preview template', {
        error: error instanceof Error ? error.message : String(error),
        templateId: req.params.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to preview template'
      });
    }
  },

  // Get template variables
  async getTemplateVariables(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const template = await prisma.notificationTemplate.findUnique({
        where: { id },
        select: { variables: true }
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      res.json({
        success: true,
        data: {
          templateId: id,
          variables: template.variables
        }
      });
    } catch (error) {
      logger.error('Failed to get template variables', {
        error: error instanceof Error ? error.message : String(error),
        templateId: req.params.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get template variables'
      });
    }
  },

  // Duplicate template
  async duplicateTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name is required for duplicated template'
        });
      }

      const originalTemplate = await prisma.notificationTemplate.findUnique({
        where: { id }
      });

      if (!originalTemplate) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      // Check if new name already exists
      const existingTemplate = await prisma.notificationTemplate.findFirst({
        where: { name }
      });

      if (existingTemplate) {
        return res.status(409).json({
          success: false,
          error: 'Template with this name already exists'
        });
      }

      const duplicatedTemplate = await prisma.notificationTemplate.create({
        data: {
          name,
          type: originalTemplate.type,
          subject: originalTemplate.subject,
          content: originalTemplate.content,
          variables: originalTemplate.variables,
          isActive: false // Duplicated templates are inactive by default
        }
      });

      logger.info('Template duplicated', {
        originalTemplateId: id,
        newTemplateId: duplicatedTemplate.id,
        name: duplicatedTemplate.name
      });

      res.status(201).json({
        success: true,
        data: duplicatedTemplate
      });
    } catch (error) {
      logger.error('Failed to duplicate template', {
        error: error instanceof Error ? error.message : String(error),
        templateId: req.params.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to duplicate template'
      });
    }
  }
}; 