import express from 'express';
import { financialReportingService } from '../services/financial-reporting-service';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

const router = express.Router();

// Get financial dashboard summary
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const summary = await financialReportingService.getDashboardSummary();
    
    res.json(successResponse(summary, 'Dashboard summary retrieved successfully'));
  } catch (error) {
    logger.error('Error fetching dashboard summary:', error);
    res.status(500).json(errorResponse('Failed to fetch dashboard summary'));
  }
});

// Generate revenue report
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { startDate, endDate, groupBy = 'month' } = req.query;
    
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
    
    if (!['day', 'week', 'month'].includes(groupBy as string)) {
      return res.status(400).json(errorResponse('Group by must be day, week, or month'));
    }
    
    const report = await financialReportingService.generateRevenueReport(
      start,
      end,
      groupBy as 'day' | 'week' | 'month'
    );
    
    res.json(successResponse(report, 'Revenue report generated successfully'));
  } catch (error) {
    logger.error('Error generating revenue report:', error);
    res.status(500).json(errorResponse('Failed to generate revenue report'));
  }
});

// Generate lawyer performance report
router.get('/lawyer-performance', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
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
    
    const report = await financialReportingService.generateLawyerPerformanceReport(start, end);
    
    res.json(successResponse(report, 'Lawyer performance report generated successfully'));
  } catch (error) {
    logger.error('Error generating lawyer performance report:', error);
    res.status(500).json(errorResponse('Failed to generate lawyer performance report'));
  }
});

// Generate user engagement report
router.get('/user-engagement', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
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
    
    const report = await financialReportingService.generateUserEngagementReport(start, end);
    
    res.json(successResponse(report, 'User engagement report generated successfully'));
  } catch (error) {
    logger.error('Error generating user engagement report:', error);
    res.status(500).json(errorResponse('Failed to generate user engagement report'));
  }
});

// Export financial data (CSV format)
router.get('/export/:reportType', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check middleware
    const { reportType } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;
    
    if (!['revenue', 'lawyer-performance', 'user-engagement'].includes(reportType)) {
      return res.status(400).json(errorResponse('Invalid report type'));
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json(errorResponse('Start date and end date are required'));
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json(errorResponse('Invalid date format'));
    }
    
    let data: any;
    
    switch (reportType) {
      case 'revenue':
        data = await financialReportingService.generateRevenueReport(start, end);
        break;
      case 'lawyer-performance':
        data = await financialReportingService.generateLawyerPerformanceReport(start, end);
        break;
      case 'user-engagement':
        data = await financialReportingService.generateUserEngagementReport(start, end);
        break;
    }
    
    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data, reportType);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.csv"`);
      res.send(csv);
    } else {
      res.json(successResponse(data, `${reportType} report exported successfully`));
    }
  } catch (error) {
    logger.error('Error exporting financial data:', error);
    res.status(500).json(errorResponse('Failed to export financial data'));
  }
});

// Helper function to convert data to CSV
function convertToCSV(data: any, reportType: string): string {
  if (!Array.isArray(data) && reportType !== 'user-engagement') {
    return '';
  }
  
  let headers: string[] = [];
  let rows: string[][] = [];
  
  switch (reportType) {
    case 'revenue':
      headers = ['Period', 'Subscription Revenue', 'Commission Revenue', 'Total Revenue', 'Active Subscriptions', 'New Subscriptions', 'Cancelled Subscriptions', 'ARPU'];
      rows = data.map((item: any) => [
        item.period,
        item.subscriptionRevenue.toString(),
        item.commissionRevenue.toString(),
        item.totalRevenue.toString(),
        item.activeSubscriptions.toString(),
        item.newSubscriptions.toString(),
        item.cancelledSubscriptions.toString(),
        item.averageRevenuePerUser.toString()
      ]);
      break;
      
    case 'lawyer-performance':
      headers = ['Lawyer ID', 'Lawyer Name', 'Total Referrals', 'Total Commissions', 'Average Commission Rate'];
      rows = data.map((item: any) => [
        item.lawyerId,
        item.lawyerName,
        item.totalReferrals.toString(),
        item.totalCommissions.toString(),
        item.averageCommissionRate.toString()
      ]);
      break;
      
    case 'user-engagement':
      headers = ['Metric', 'Value'];
      rows = [
        ['Total Users', data.totalUsers.toString()],
        ['Active Users', data.activeUsers.toString()],
        ['Premium Users', data.premiumUsers.toString()],
        ['Free Users', data.freeUsers.toString()],
        ['Conversion Rate', data.conversionRate.toString()],
        ['Churn Rate', data.churnRate.toString()]
      ];
      break;
  }
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

export default router;