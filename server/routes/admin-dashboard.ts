import express from 'express';
import { adminDashboardService } from '../services/admin-dashboard-service';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

const router = express.Router();

// Get admin dashboard metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const metrics = await adminDashboardService.getDashboardMetrics();
    
    res.json(successResponse(metrics, 'Dashboard metrics retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching dashboard metrics:', error);
    res.status(500).json(errorResponse('Failed to fetch dashboard metrics'));
  }
});

// Perform tenant management action
router.post('/tenant-action', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { tenantId, action, reason, effectiveDate } = req.body;
    
    // Validate request
    const validation = validateRequest(req.body, {
      tenantId: { required: true, type: 'string' },
      action: { required: true, type: 'string', enum: ['suspend', 'activate', 'cancel', 'upgrade', 'downgrade'] },
      reason: { required: false, type: 'string' },
      effectiveDate: { required: false, type: 'string' }
    });

    if (!validation.isValid) {
      return res.status(400).json(errorResponse('Invalid request data', validation.errors));
    }

    const actionData = {
      tenantId,
      action: action as 'suspend' | 'activate' | 'cancel' | 'upgrade' | 'downgrade',
      reason,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined
    };

    await adminDashboardService.performTenantAction(actionData);
    
    res.json(successResponse(null, `Tenant ${action} action performed successfully`));
  } catch (error) {
    logger.error('Error performing tenant action:', error);
    if (error instanceof Error) {
      res.status(400).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Failed to perform tenant action'));
    }
  }
});

// Get tenant usage analytics
router.get('/tenant/:tenantId/analytics', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json(errorResponse('Start date and end date are required'));
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json(errorResponse('Invalid date format'));
    }
    
    if (start >= end) {
      return res.status(400).json(errorResponse('Start date must be before end date'));
    }
    
    const analytics = await adminDashboardService.getTenantUsageAnalytics(tenantId, start, end);
    
    res.json(successResponse(analytics, 'Tenant analytics retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching tenant analytics:', error);
    res.status(500).json(errorResponse('Failed to fetch tenant analytics'));
  }
});

// Get system alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const alerts = await adminDashboardService.getSystemAlerts();
    
    res.json(successResponse(alerts, 'System alerts retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching system alerts:', error);
    res.status(500).json(errorResponse('Failed to fetch system alerts'));
  }
});

// Export tenant data
router.get('/tenant/:tenantId/export', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { tenantId } = req.params;
    const { format = 'json' } = req.query;
    
    const data = await adminDashboardService.exportTenantData(tenantId);
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="tenant-${tenantId}-export.json"`);
      res.json(data);
    } else {
      // Could implement CSV export here
      res.status(400).json(errorResponse('Only JSON export is currently supported'));
    }
  } catch (error) {
    logger.error('Error exporting tenant data:', error);
    if (error instanceof Error) {
      res.status(400).json(errorResponse(error.message));
    } else {
      res.status(500).json(errorResponse('Failed to export tenant data'));
    }
  }
});

// Get tenant overview for admin dashboard
router.get('/tenants/overview', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { status, sortBy = 'created_at', sortOrder = 'desc', limit = '20', offset = '0' } = req.query;
    
    // This would be a simplified version of the tenant list with key metrics
    const query = `
      SELECT 
        wlc.id,
        wlc.organization_name,
        wlc.subdomain,
        wlc.status,
        wlc.created_at,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT us.id) as subscription_count,
        COALESCE(SUM(bt.amount), 0) as total_revenue,
        MAX(u.created_at) as last_user_signup
      FROM white_label_configs wlc
      LEFT JOIN users u ON u.profile->>'tenantId' = wlc.id
      LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
      LEFT JOIN billing_transactions bt ON bt.user_id = u.id AND bt.status = 'completed'
      ${status ? 'WHERE wlc.status = $1' : ''}
      GROUP BY wlc.id, wlc.organization_name, wlc.subdomain, wlc.status, wlc.created_at
      ORDER BY ${sortBy === 'revenue' ? 'total_revenue' : `wlc.${sortBy}`} ${sortOrder.toUpperCase()}
      LIMIT $${status ? '2' : '1'} OFFSET $${status ? '3' : '2'}
    `;
    
    const params = [];
    if (status) params.push(status);
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await adminDashboardService['db'].query(query, params);
    
    const tenants = result.rows.map(row => ({
      id: row.id,
      organizationName: row.organization_name,
      subdomain: row.subdomain,
      status: row.status,
      createdAt: row.created_at,
      userCount: parseInt(row.user_count) || 0,
      subscriptionCount: parseInt(row.subscription_count) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      lastUserSignup: row.last_user_signup
    }));
    
    res.json(successResponse(tenants, 'Tenant overview retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching tenant overview:', error);
    res.status(500).json(errorResponse('Failed to fetch tenant overview'));
  }
});

// Get system health status
router.get('/health', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    
    // Basic system health checks
    const healthStatus = {
      database: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    // Check database connectivity
    try {
      await adminDashboardService['db'].query('SELECT 1');
    } catch (dbError) {
      healthStatus.database = 'unhealthy';
    }
    
    res.json(successResponse(healthStatus, 'System health status retrieved'));
  } catch (error) {
    logger.error('Error checking system health:', error);
    res.status(500).json(errorResponse('Failed to check system health'));
  }
});

export default router;