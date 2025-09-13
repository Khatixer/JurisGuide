import { Pool } from 'pg';
import { pool } from '../database/config';
import { logger } from '../utils/logger';

export interface RevenueReport {
  period: string;
  subscriptionRevenue: number;
  commissionRevenue: number;
  totalRevenue: number;
  activeSubscriptions: number;
  newSubscriptions: number;
  cancelledSubscriptions: number;
  averageRevenuePerUser: number;
}

export interface LawyerPerformanceReport {
  lawyerId: string;
  lawyerName: string;
  totalReferrals: number;
  totalCommissions: number;
  averageCommissionRate: number;
  clientSatisfactionScore?: number;
  monthlyTrend: Array<{ month: string; referrals: number; commissions: number }>;
}

export interface UserEngagementReport {
  totalUsers: number;
  activeUsers: number;
  premiumUsers: number;
  freeUsers: number;
  averageUsagePerUser: Record<string, number>;
  conversionRate: number;
  churnRate: number;
}

export class FinancialReportingService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  // Generate revenue report for a specific period
  async generateRevenueReport(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<RevenueReport[]> {
    try {
      const dateFormat = this.getDateFormat(groupBy);
      
      const query = `
        WITH subscription_revenue AS (
          SELECT 
            TO_CHAR(bt.created_at, $3) as period,
            SUM(CASE WHEN bt.transaction_type = 'subscription' THEN bt.amount ELSE 0 END) as subscription_revenue,
            COUNT(CASE WHEN bt.transaction_type = 'subscription' AND bt.status = 'completed' THEN 1 END) as subscription_transactions
          FROM billing_transactions bt
          WHERE bt.created_at BETWEEN $1 AND $2
          GROUP BY TO_CHAR(bt.created_at, $3)
        ),
        commission_revenue AS (
          SELECT 
            TO_CHAR(ct.created_at, $3) as period,
            SUM(ct.commission_amount) as commission_revenue,
            COUNT(*) as commission_count
          FROM commission_tracking ct
          WHERE ct.created_at BETWEEN $1 AND $2 AND ct.status = 'paid'
          GROUP BY TO_CHAR(ct.created_at, $3)
        ),
        subscription_metrics AS (
          SELECT 
            TO_CHAR(us.created_at, $3) as period,
            COUNT(CASE WHEN us.created_at BETWEEN $1 AND $2 THEN 1 END) as new_subscriptions,
            COUNT(CASE WHEN us.status = 'active' THEN 1 END) as active_subscriptions,
            COUNT(CASE WHEN us.status = 'cancelled' AND us.updated_at BETWEEN $1 AND $2 THEN 1 END) as cancelled_subscriptions
          FROM user_subscriptions us
          GROUP BY TO_CHAR(us.created_at, $3)
        )
        SELECT 
          COALESCE(sr.period, cr.period, sm.period) as period,
          COALESCE(sr.subscription_revenue, 0) as subscription_revenue,
          COALESCE(cr.commission_revenue, 0) as commission_revenue,
          COALESCE(sr.subscription_revenue, 0) + COALESCE(cr.commission_revenue, 0) as total_revenue,
          COALESCE(sm.active_subscriptions, 0) as active_subscriptions,
          COALESCE(sm.new_subscriptions, 0) as new_subscriptions,
          COALESCE(sm.cancelled_subscriptions, 0) as cancelled_subscriptions,
          CASE 
            WHEN COALESCE(sm.active_subscriptions, 0) > 0 
            THEN (COALESCE(sr.subscription_revenue, 0) + COALESCE(cr.commission_revenue, 0)) / sm.active_subscriptions
            ELSE 0 
          END as average_revenue_per_user
        FROM subscription_revenue sr
        FULL OUTER JOIN commission_revenue cr ON sr.period = cr.period
        FULL OUTER JOIN subscription_metrics sm ON COALESCE(sr.period, cr.period) = sm.period
        ORDER BY period
      `;
      
      const result = await this.db.query(query, [startDate, endDate, dateFormat]);
      
      return result.rows.map(row => ({
        period: row.period,
        subscriptionRevenue: parseFloat(row.subscription_revenue) || 0,
        commissionRevenue: parseFloat(row.commission_revenue) || 0,
        totalRevenue: parseFloat(row.total_revenue) || 0,
        activeSubscriptions: parseInt(row.active_subscriptions) || 0,
        newSubscriptions: parseInt(row.new_subscriptions) || 0,
        cancelledSubscriptions: parseInt(row.cancelled_subscriptions) || 0,
        averageRevenuePerUser: parseFloat(row.average_revenue_per_user) || 0
      }));
    } catch (error) {
      logger.error('Error generating revenue report:', error);
      throw new Error('Failed to generate revenue report');
    }
  }

  // Generate lawyer performance report
  async generateLawyerPerformanceReport(
    startDate: Date,
    endDate: Date
  ): Promise<LawyerPerformanceReport[]> {
    try {
      const query = `
        WITH lawyer_stats AS (
          SELECT 
            ct.lawyer_id,
            l.profile->>'name' as lawyer_name,
            COUNT(*) as total_referrals,
            SUM(ct.commission_amount) as total_commissions,
            AVG(ct.commission_rate) as average_commission_rate
          FROM commission_tracking ct
          JOIN lawyers l ON ct.lawyer_id = l.id
          WHERE ct.created_at BETWEEN $1 AND $2
          GROUP BY ct.lawyer_id, l.profile->>'name'
        ),
        monthly_trends AS (
          SELECT 
            ct.lawyer_id,
            TO_CHAR(ct.created_at, 'YYYY-MM') as month,
            COUNT(*) as referrals,
            SUM(ct.commission_amount) as commissions
          FROM commission_tracking ct
          WHERE ct.created_at BETWEEN $1 AND $2
          GROUP BY ct.lawyer_id, TO_CHAR(ct.created_at, 'YYYY-MM')
        )
        SELECT 
          ls.*,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'month', mt.month,
                'referrals', mt.referrals,
                'commissions', mt.commissions
              ) ORDER BY mt.month
            ) FILTER (WHERE mt.month IS NOT NULL),
            '[]'::json
          ) as monthly_trend
        FROM lawyer_stats ls
        LEFT JOIN monthly_trends mt ON ls.lawyer_id = mt.lawyer_id
        GROUP BY ls.lawyer_id, ls.lawyer_name, ls.total_referrals, ls.total_commissions, ls.average_commission_rate
        ORDER BY ls.total_commissions DESC
      `;
      
      const result = await this.db.query(query, [startDate, endDate]);
      
      return result.rows.map(row => ({
        lawyerId: row.lawyer_id,
        lawyerName: row.lawyer_name,
        totalReferrals: parseInt(row.total_referrals) || 0,
        totalCommissions: parseFloat(row.total_commissions) || 0,
        averageCommissionRate: parseFloat(row.average_commission_rate) || 0,
        monthlyTrend: row.monthly_trend || []
      }));
    } catch (error) {
      logger.error('Error generating lawyer performance report:', error);
      throw new Error('Failed to generate lawyer performance report');
    }
  }

  // Generate user engagement report
  async generateUserEngagementReport(
    startDate: Date,
    endDate: Date
  ): Promise<UserEngagementReport> {
    try {
      // Get user counts
      const userCountsQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN u.created_at BETWEEN $1 AND $2 THEN 1 END) as new_users,
          COUNT(CASE WHEN us.id IS NOT NULL AND us.status = 'active' THEN 1 END) as premium_users
        FROM users u
        LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
      `;
      
      const userCountsResult = await this.db.query(userCountsQuery, [startDate, endDate]);
      const userCounts = userCountsResult.rows[0];
      
      // Get active users (users who performed any action in the period)
      const activeUsersQuery = `
        SELECT COUNT(DISTINCT user_id) as active_users
        FROM (
          SELECT user_id FROM legal_queries WHERE created_at BETWEEN $1 AND $2
          UNION
          SELECT user_id FROM usage_tracking WHERE period_start >= $1 AND period_end <= $2
        ) active_user_actions
      `;
      
      const activeUsersResult = await this.db.query(activeUsersQuery, [startDate, endDate]);
      const activeUsers = parseInt(activeUsersResult.rows[0].active_users) || 0;
      
      // Get average usage per user
      const usageQuery = `
        SELECT 
          resource_type,
          AVG(usage_count) as average_usage
        FROM usage_tracking
        WHERE period_start >= $1 AND period_end <= $2
        GROUP BY resource_type
      `;
      
      const usageResult = await this.db.query(usageQuery, [startDate, endDate]);
      const averageUsagePerUser: Record<string, number> = {};
      usageResult.rows.forEach(row => {
        averageUsagePerUser[row.resource_type] = parseFloat(row.average_usage) || 0;
      });
      
      // Calculate conversion rate (free to paid)
      const conversionQuery = `
        SELECT 
          COUNT(CASE WHEN us.created_at BETWEEN $1 AND $2 THEN 1 END) as new_subscriptions,
          COUNT(CASE WHEN u.created_at BETWEEN $1 AND $2 THEN 1 END) as new_users
        FROM users u
        LEFT JOIN user_subscriptions us ON u.id = us.user_id
      `;
      
      const conversionResult = await this.db.query(conversionQuery, [startDate, endDate]);
      const conversionData = conversionResult.rows[0];
      const conversionRate = conversionData.new_users > 0 
        ? (conversionData.new_subscriptions / conversionData.new_users) * 100 
        : 0;
      
      // Calculate churn rate
      const churnQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'cancelled' AND updated_at BETWEEN $1 AND $2 THEN 1 END) as churned_subscriptions,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
        FROM user_subscriptions
      `;
      
      const churnResult = await this.db.query(churnQuery, [startDate, endDate]);
      const churnData = churnResult.rows[0];
      const churnRate = churnData.active_subscriptions > 0 
        ? (churnData.churned_subscriptions / churnData.active_subscriptions) * 100 
        : 0;
      
      return {
        totalUsers: parseInt(userCounts.total_users) || 0,
        activeUsers,
        premiumUsers: parseInt(userCounts.premium_users) || 0,
        freeUsers: (parseInt(userCounts.total_users) || 0) - (parseInt(userCounts.premium_users) || 0),
        averageUsagePerUser,
        conversionRate,
        churnRate
      };
    } catch (error) {
      logger.error('Error generating user engagement report:', error);
      throw new Error('Failed to generate user engagement report');
    }
  }

  // Get financial dashboard summary
  async getDashboardSummary(): Promise<{
    monthlyRecurringRevenue: number;
    totalActiveSubscriptions: number;
    pendingCommissions: number;
    totalCommissionsPaid: number;
    growthRate: number;
  }> {
    try {
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      // Get MRR (Monthly Recurring Revenue)
      const mrrQuery = `
        SELECT 
          SUM(CASE 
            WHEN sp.tier != 'free' AND us.billing_cycle = 'monthly' THEN sp.price_monthly
            WHEN sp.tier != 'free' AND us.billing_cycle = 'yearly' THEN sp.price_yearly / 12
            ELSE 0
          END) as mrr,
          COUNT(CASE WHEN us.status = 'active' THEN 1 END) as active_subscriptions
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active'
      `;
      
      const mrrResult = await this.db.query(mrrQuery);
      const mrrData = mrrResult.rows[0];
      
      // Get commission data
      const commissionQuery = `
        SELECT 
          SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END) as pending_commissions,
          SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END) as total_paid
        FROM commission_tracking
      `;
      
      const commissionResult = await this.db.query(commissionQuery);
      const commissionData = commissionResult.rows[0];
      
      // Calculate growth rate
      const growthQuery = `
        SELECT 
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as current_month_subscriptions,
          COUNT(CASE WHEN created_at >= $2 AND created_at < $1 THEN 1 END) as last_month_subscriptions
        FROM user_subscriptions
        WHERE status = 'active'
      `;
      
      const growthResult = await this.db.query(growthQuery, [currentMonth, lastMonth]);
      const growthData = growthResult.rows[0];
      
      const growthRate = growthData.last_month_subscriptions > 0 
        ? ((growthData.current_month_subscriptions - growthData.last_month_subscriptions) / growthData.last_month_subscriptions) * 100
        : 0;
      
      return {
        monthlyRecurringRevenue: parseFloat(mrrData.mrr) || 0,
        totalActiveSubscriptions: parseInt(mrrData.active_subscriptions) || 0,
        pendingCommissions: parseFloat(commissionData.pending_commissions) || 0,
        totalCommissionsPaid: parseFloat(commissionData.total_paid) || 0,
        growthRate
      };
    } catch (error) {
      logger.error('Error generating dashboard summary:', error);
      throw new Error('Failed to generate dashboard summary');
    }
  }

  private getDateFormat(groupBy: 'day' | 'week' | 'month'): string {
    switch (groupBy) {
      case 'day':
        return 'YYYY-MM-DD';
      case 'week':
        return 'YYYY-"W"WW';
      case 'month':
      default:
        return 'YYYY-MM';
    }
  }
}

export const financialReportingService = new FinancialReportingService();