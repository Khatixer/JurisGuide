import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { analyticsService } from '../services/analytics-service';
import { metricsHandler } from '../middleware/metrics';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

// Middleware to check admin access
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'admin') {
    return errorResponse(res, 'Insufficient permissions', 403, 'FORBIDDEN');
  }
  next();
};

// Get comprehensive dashboard analytics
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const timeframe = req.query.timeframe as '24h' | '7d' | '30d' | '90d' || '30d';
    const analytics = await analyticsService.getDashboardAnalytics(timeframe);
    
    successResponse(res, analytics, 'Analytics data retrieved successfully');
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    errorResponse(res, 'Failed to fetch analytics data', 500, 'ANALYTICS_ERROR');
  }
});

// Get real-time metrics
router.get('/realtime', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const realTimeMetrics = await analyticsService.getRealTimeMetrics();
    
    successResponse(res, realTimeMetrics, 'Real-time metrics retrieved successfully');
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    errorResponse(res, 'Failed to fetch real-time metrics', 500, 'REALTIME_ERROR');
  }
});

// Get user engagement analytics
router.get('/user-engagement', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const timeframe = req.query.timeframe as '24h' | '7d' | '30d' | '90d' || '30d';
    const analytics = await analyticsService.getDashboardAnalytics(timeframe);
    
    successResponse(res, analytics.userEngagement, 'User engagement data retrieved successfully');
  } catch (error) {
    console.error('Error fetching user engagement analytics:', error);
    errorResponse(res, 'Failed to fetch user engagement data', 500, 'USER_ENGAGEMENT_ERROR');
  }
});

// Get legal query analytics
router.get('/legal-queries', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const timeframe = req.query.timeframe as '24h' | '7d' | '30d' | '90d' || '30d';
    const analytics = await analyticsService.getDashboardAnalytics(timeframe);
    
    successResponse(res, analytics.legalQueries, 'Legal query analytics retrieved successfully');
  } catch (error) {
    console.error('Error fetching legal query analytics:', error);
    errorResponse(res, 'Failed to fetch legal query analytics', 500, 'LEGAL_QUERY_ERROR');
  }
});

// Get lawyer matching analytics
router.get('/lawyer-matching', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const timeframe = req.query.timeframe as '24h' | '7d' | '30d' | '90d' || '30d';
    const analytics = await analyticsService.getDashboardAnalytics(timeframe);
    
    successResponse(res, analytics.lawyerMatching, 'Lawyer matching analytics retrieved successfully');
  } catch (error) {
    console.error('Error fetching lawyer matching analytics:', error);
    errorResponse(res, 'Failed to fetch lawyer matching analytics', 500, 'LAWYER_MATCHING_ERROR');
  }
});

// Get mediation analytics
router.get('/mediation', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const timeframe = req.query.timeframe as '24h' | '7d' | '30d' | '90d' || '30d';
    const analytics = await analyticsService.getDashboardAnalytics(timeframe);
    
    successResponse(res, analytics.mediation, 'Mediation analytics retrieved successfully');
  } catch (error) {
    console.error('Error fetching mediation analytics:', error);
    errorResponse(res, 'Failed to fetch mediation analytics', 500, 'MEDIATION_ERROR');
  }
});

// Get revenue analytics
router.get('/revenue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const timeframe = req.query.timeframe as '24h' | '7d' | '30d' | '90d' || '30d';
    const analytics = await analyticsService.getDashboardAnalytics(timeframe);
    
    successResponse(res, analytics.revenue, 'Revenue analytics retrieved successfully');
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    errorResponse(res, 'Failed to fetch revenue analytics', 500, 'REVENUE_ERROR');
  }
});

// Get AI performance analytics
router.get('/ai-performance', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const timeframe = req.query.timeframe as '24h' | '7d' | '30d' | '90d' || '30d';
    const analytics = await analyticsService.getDashboardAnalytics(timeframe);
    
    successResponse(res, analytics.aiPerformance, 'AI performance analytics retrieved successfully');
  } catch (error) {
    console.error('Error fetching AI performance analytics:', error);
    errorResponse(res, 'Failed to fetch AI performance analytics', 500, 'AI_PERFORMANCE_ERROR');
  }
});

// Track user action
router.post('/track', authenticateToken, async (req, res) => {
  try {
    const { action, metadata } = req.body;
    const userId = (req as any).user.id;
    
    if (!action) {
      return errorResponse(res, 'Action is required', 400, 'MISSING_ACTION');
    }
    
    await analyticsService.trackUserAction(userId, action, metadata);
    
    successResponse(res, null, 'User action tracked successfully');
  } catch (error) {
    console.error('Error tracking user action:', error);
    errorResponse(res, 'Failed to track user action', 500, 'TRACKING_ERROR');
  }
});

// Prometheus metrics endpoint (restricted access)
router.get('/metrics', metricsHandler);

// Export analytics data (CSV format)
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, timeframe = '30d' } = req.query;
    
    if (!type) {
      return errorResponse(res, 'Export type is required', 400, 'MISSING_TYPE');
    }
    
    const analytics = await analyticsService.getDashboardAnalytics(timeframe as any);
    
    let csvData = '';
    let filename = '';
    
    switch (type) {
      case 'user-engagement':
        csvData = this.generateUserEngagementCSV(analytics.userEngagement);
        filename = `user-engagement-${timeframe}.csv`;
        break;
      case 'revenue':
        csvData = this.generateRevenueCSV(analytics.revenue);
        filename = `revenue-${timeframe}.csv`;
        break;
      case 'legal-queries':
        csvData = this.generateLegalQueriesCSV(analytics.legalQueries);
        filename = `legal-queries-${timeframe}.csv`;
        break;
      default:
        return errorResponse(res, 'Invalid export type', 400, 'INVALID_TYPE');
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (error) {
    console.error('Error exporting analytics data:', error);
    errorResponse(res, 'Failed to export analytics data', 500, 'EXPORT_ERROR');
  }
});

// Helper functions for CSV generation
function generateUserEngagementCSV(data: any): string {
  const headers = 'Metric,Value\n';
  const rows = [
    `Total Users,${data.totalUsers}`,
    `Active Users,${data.activeUsers}`,
    `New Users,${data.newUsers}`,
    `Retention Rate,${data.retentionRate}%`
  ].join('\n');
  
  return headers + rows;
}

function generateRevenueCSV(data: any): string {
  const headers = 'Metric,Amount (USD)\n';
  const rows = [
    `Total Revenue,${data.totalRevenue}`,
    `Subscription Revenue,${data.subscriptionRevenue}`,
    `Commission Revenue,${data.commissionRevenue}`
  ];
  
  // Add revenue by plan
  Object.entries(data.revenueByPlan).forEach(([plan, amount]) => {
    rows.push(`${plan} Plan Revenue,${amount}`);
  });
  
  return headers + rows.join('\n');
}

function generateLegalQueriesCSV(data: any): string {
  const headers = 'Category,Query Count\n';
  const rows = Object.entries(data.queriesByCategory).map(([category, count]) => 
    `${category},${count}`
  );
  
  return headers + rows.join('\n');
}

export default router;