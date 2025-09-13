import { Request, Response, NextFunction } from 'express';
import { whiteLabelService, TenantContext } from '../services/white-label-service';
import { errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

// Extend Express Request interface to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

// Middleware to resolve tenant context from request
export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let tenantContext: TenantContext | null = null;
    
    // Try to resolve tenant from various sources
    
    // 1. Check for custom domain
    const host = req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      // Remove port if present
      const domain = host.split(':')[0];
      
      // Check if it's a custom domain
      tenantContext = await whiteLabelService.getTenantContext(domain, 'domain');
      
      // If not a custom domain, check if it's a subdomain
      if (!tenantContext && domain.includes('.')) {
        const subdomain = domain.split('.')[0];
        tenantContext = await whiteLabelService.getTenantContext(subdomain, 'subdomain');
      }
    }
    
    // 2. Check for subdomain in headers (for development/testing)
    if (!tenantContext) {
      const subdomainHeader = req.get('x-tenant-subdomain');
      if (subdomainHeader) {
        tenantContext = await whiteLabelService.getTenantContext(subdomainHeader, 'subdomain');
      }
    }
    
    // 3. Check for tenant ID in query parameters (for API access)
    if (!tenantContext) {
      const tenantId = req.query.tenantId as string;
      if (tenantId) {
        const config = await whiteLabelService.getConfigById(tenantId);
        if (config) {
          tenantContext = {
            tenantId: config.id,
            subdomain: config.subdomain,
            customDomain: config.customDomain,
            branding: config.branding,
            features: config.features,
            billingConfig: config.billingConfig
          };
        }
      }
    }
    
    // Attach tenant context to request
    req.tenant = tenantContext || undefined;
    
    next();
  } catch (error) {
    logger.error('Error resolving tenant context:', error instanceof Error ? error.message : String(error));
    // Continue without tenant context rather than failing the request
    next();
  }
};

// Middleware to require tenant context
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  if (!req.tenant) {
    return res.status(400).json(errorResponse(
      'Tenant context is required for this request',
      { requiresTenant: true }
    ));
  }
  
  next();
};

// Middleware to check if tenant has access to a specific feature
export const requireTenantFeature = (featureName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(400).json(errorResponse(
        'Tenant context is required for this request',
        { requiresTenant: true }
      ));
    }
    
    if (!req.tenant.features[featureName as keyof typeof req.tenant.features]) {
      return res.status(403).json(errorResponse(
        `Feature '${featureName}' is not enabled for this tenant`,
        { featureName, tenantId: req.tenant.tenantId }
      ));
    }
    
    next();
  };
};

// Middleware to inject tenant-specific configuration into responses
export const injectTenantBranding = (req: Request, res: Response, next: NextFunction) => {
  if (req.tenant) {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to inject branding
    res.json = function(body: any) {
      if (body && typeof body === 'object' && body.success !== false) {
        // Inject tenant branding into successful responses
        body.tenant = {
          branding: req.tenant!.branding,
          features: req.tenant!.features
        };
      }
      
      // Call original json method
      return originalJson.call(this, body);
    };
  }
  
  next();
};

// Middleware to validate tenant status
export const validateTenantStatus = async (req: Request, res: Response, next: NextFunction) => {
  if (req.tenant) {
    try {
      const config = await whiteLabelService.getConfigById(req.tenant.tenantId);
      
      if (!config) {
        return res.status(404).json(errorResponse('Tenant configuration not found'));
      }
      
      if (config.status === 'suspended') {
        return res.status(403).json(errorResponse(
          'This tenant account has been suspended',
          { tenantStatus: 'suspended' }
        ));
      }
      
      if (config.status === 'cancelled') {
        return res.status(403).json(errorResponse(
          'This tenant account has been cancelled',
          { tenantStatus: 'cancelled' }
        ));
      }
    } catch (error) {
      logger.error('Error validating tenant status:', error instanceof Error ? error.message : String(error));
      return res.status(500).json(errorResponse('Failed to validate tenant status'));
    }
  }
  
  next();
};

// Middleware to track tenant usage
export const trackTenantUsage = (resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.tenant && (req as any).user) {
      try {
        // Track usage for the tenant
        // This could be implemented to track tenant-specific usage limits
        logger.info(`Tenant ${req.tenant.tenantId} used resource: ${resourceType}`);
      } catch (error) {
        logger.error('Error tracking tenant usage:', error instanceof Error ? error.message : String(error));
        // Don't fail the request if usage tracking fails
      }
    }
    
    next();
  };
};