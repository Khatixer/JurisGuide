import express from 'express';
import { whiteLabelService } from '../services/white-label-service';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

const router = express.Router();

// Create a new white-label configuration
router.post('/create', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { organizationName, subdomain, adminUserId, branding, features, billingConfig } = req.body;
    
    // Validate request
    const validation = validateRequest(req.body, {
      organizationName: { required: true, type: 'string', minLength: 2 },
      subdomain: { required: true, type: 'string', minLength: 3, maxLength: 50 },
      adminUserId: { required: true, type: 'string' },
      branding: { required: false, type: 'object' },
      features: { required: false, type: 'object' },
      billingConfig: { required: false, type: 'object' }
    });

    if (!validation.isValid) {
      return res.status(400).json(errorResponse('Invalid request data', validation.errors));
    }

    const config = await whiteLabelService.createWhiteLabelConfig(
      organizationName,
      subdomain,
      adminUserId,
      branding,
      features,
      billingConfig
    );
    
    res.status(201).json(successResponse(config, 'White-label configuration created successfully'));
  } catch (error) {
    logger.error('Error creating white-label config:', error);
    if (error instanceof Error) {
      res.status(400).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Failed to create white-label configuration'));
    }
  }
});

// Get white-label configuration by subdomain
router.get('/subdomain/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;
    
    const config = await whiteLabelService.getConfigBySubdomain(subdomain);
    
    if (!config) {
      return res.status(404).json(errorResponse('White-label configuration not found'));
    }
    
    // Return only public information
    const publicConfig = {
      id: config.id,
      organizationName: config.organizationName,
      subdomain: config.subdomain,
      branding: config.branding,
      features: config.features
    };
    
    res.json(successResponse(publicConfig, 'Configuration retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching config by subdomain:', error);
    res.status(500).json(errorResponse('Failed to fetch configuration'));
  }
});

// Get white-label configuration by domain
router.get('/domain/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    
    const config = await whiteLabelService.getConfigByDomain(domain);
    
    if (!config) {
      return res.status(404).json(errorResponse('White-label configuration not found'));
    }
    
    // Return only public information
    const publicConfig = {
      id: config.id,
      organizationName: config.organizationName,
      subdomain: config.subdomain,
      customDomain: config.customDomain,
      branding: config.branding,
      features: config.features
    };
    
    res.json(successResponse(publicConfig, 'Configuration retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching config by domain:', error);
    res.status(500).json(errorResponse('Failed to fetch configuration'));
  }
});

// Get white-label configuration by ID (admin only)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { id } = req.params;
    
    const config = await whiteLabelService.getConfigById(id);
    
    if (!config) {
      return res.status(404).json(errorResponse('White-label configuration not found'));
    }
    
    res.json(successResponse(config, 'Configuration retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching config by ID:', error);
    res.status(500).json(errorResponse('Failed to fetch configuration'));
  }
});

// Update white-label configuration
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware or tenant admin check
    const { id } = req.params;
    const updates = req.body;
    
    // Validate allowed update fields
    const allowedFields = ['organizationName', 'customDomain', 'branding', 'features', 'billingConfig', 'status'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(errorResponse('No valid fields to update'));
    }
    
    const config = await whiteLabelService.updateWhiteLabelConfig(id, updateData);
    
    res.json(successResponse(config, 'Configuration updated successfully'));
  } catch (error) {
    logger.error('Error updating white-label config:', error);
    if (error instanceof Error) {
      res.status(400).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Failed to update configuration'));
    }
  }
});

// List all white-label configurations (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { status, limit = '50', offset = '0' } = req.query;
    
    const configs = await whiteLabelService.listConfigs(
      status as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json(successResponse(configs, 'Configurations retrieved successfully'));
  } catch (error) {
    logger.error('Error listing white-label configs:', error);
    res.status(500).json(errorResponse('Failed to list configurations'));
  }
});

// Delete white-label configuration
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { id } = req.params;
    
    await whiteLabelService.deleteConfig(id);
    
    res.json(successResponse(null, 'Configuration deleted successfully'));
  } catch (error) {
    logger.error('Error deleting white-label config:', error);
    if (error instanceof Error) {
      res.status(400).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Failed to delete configuration'));
    }
  }
});

// Check subdomain availability
router.get('/check-subdomain/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;
    
    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return res.status(400).json(errorResponse('Invalid subdomain format'));
    }
    
    const isAvailable = await whiteLabelService.isSubdomainAvailable(subdomain);
    
    res.json(successResponse({ 
      subdomain, 
      available: isAvailable 
    }, 'Subdomain availability checked'));
  } catch (error) {
    logger.error('Error checking subdomain availability:', error);
    res.status(500).json(errorResponse('Failed to check subdomain availability'));
  }
});

// Get tenant analytics (tenant admin only)
router.get('/:id/analytics', authenticateToken, async (req, res) => {
  try {
    // TODO: Add tenant admin role check middleware
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json(errorResponse('Start date and end date are required'));
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json(errorResponse('Invalid date format'));
    }
    
    const analytics = await whiteLabelService.getTenantAnalytics(id, start, end);
    
    res.json(successResponse(analytics, 'Tenant analytics retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching tenant analytics:', error);
    res.status(500).json(errorResponse('Failed to fetch tenant analytics'));
  }
});

// Get tenant branding (public endpoint for frontend)
router.get('/branding/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { type = 'subdomain' } = req.query;
    
    let config;
    if (type === 'domain') {
      config = await whiteLabelService.getConfigByDomain(identifier);
    } else {
      config = await whiteLabelService.getConfigBySubdomain(identifier);
    }
    
    if (!config) {
      return res.status(404).json(errorResponse('Tenant not found'));
    }
    
    // Return only branding information
    const branding = {
      organizationName: config.organizationName,
      branding: config.branding,
      features: config.features
    };
    
    res.json(successResponse(branding, 'Branding information retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching tenant branding:', error);
    res.status(500).json(errorResponse('Failed to fetch branding information'));
  }
});

export default router;