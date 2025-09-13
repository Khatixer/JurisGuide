import { Pool } from 'pg';
import { pool } from '../database/config';
import { logger } from '../utils/logger';
import { whiteLabelService } from './white-label-service';
import { financialReportingService } from './financial-reporting-service';
import { commissionService } from './commission-service';

export interface AdminDashboardMetrics {
  overview: {
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    totalRevenue: number;
    monthlyRecurringRevenue: number;
  };
  tenantMetrics: Array<{
    tenantId: string;
    organizationName: string;
    subdomain: string;
    status: string;
    userCount: number;
    revenue: number;
    createdAt: Date;
  }>;
  revenueMetrics: {
    subscriptionRevenue: number;
    commissionRevenue: number;
    growthRate: number;
  };
  systemHealth: {
    activeSubscriptions: number;
    pendingCommissions: number;
    disputedCommissions: number;
    systemUptime: number;
  };
}

export interface TenantManagementAction {
  tenantId: string;
  action: 'suspend' | 'activate' | 'cancel' | 'upgrade' | 'downgrade';
  reason?: string;
  effectiveDate?: Date;
}

export class AdminDashboardService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  // Get comprehensive admin dashboard metrics
  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    try {
      // Get tenant overview
      const tenantOverviewQuery = `
        SELECT 
          COUNT(*) as total_tenants,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tenants
        FROM white_label_configs
      `;
      
      const tenantOverviewResult = await this.db.query(tenantOverviewQuery);
      const tenantOverview = tenantOverviewResult.rows[0];

      // Get user count
      const userCountQuery = `SELECT COUNT(*) as total_users FROM users`;
      const userCountResult = await this.db.query(userCountQuery);
      const totalUsers = parseInt(userCountResult.rows[0].total_users);

      // Get financial metrics
      const financialSummary = await financialReportingService.getDashboardSummary();

      // Get tenant-specific metrics
      const tenantMetricsQuery = `
        SELECT 
          wlc.id as tenant_id,
          wlc.organization_name,
          wlc.subdomain,
          wlc.status,
          wlc.created_at,
          COUNT(u.id) as user_count,
          COALESCE(SUM(bt.amount), 0) as revenue
        FROM white_label_configs wlc
        LEFT JOIN users u ON u.profile->>'tenantId' = wlc.id
        LEFT JOIN billing_transactions bt ON bt.user_id = u.id AND bt.status = 'completed'
        GROUP BY wlc.id, wlc.organization_name, wlc.subdomain, wlc.status, wlc.created_at
        ORDER BY wlc.created_at DESC
      `;
      
      const tenantMetricsResult = await this.db.query(tenantMetricsQuery);
      const tenantMetrics = tenantMetricsResult.rows.map(row => ({
        tenantId: row.tenant_id,
        organizationName: row.organization_name,
        subdomain: row.subdomain,
        status: row.status,
        userCount: parseInt(row.user_count) || 0,
        revenue: parseFloat(row.revenue) || 0,
        createdAt: row.created_at
      }));

      // Get commission metrics
      const commissionMetricsQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_commissions,
          COUNT(CASE WHEN status = 'disputed' THEN 1 END) as disputed_commissions
        FROM commission_tracking
      `;
      
      const commissionMetricsResult = await this.db.query(commissionMetricsQuery);
      const commissionMetrics = commissionMetricsResult.rows[0];

      // Calculate revenue breakdown
      const revenueBreakdownQuery = `
        SELECT 
          SUM(CASE WHEN transaction_type = 'subscription' THEN amount ELSE 0 END) as subscription_revenue,
          SUM(CASE WHEN transaction_type = 'commission' THEN ABS(amount) ELSE 0 END) as commission_revenue
        FROM billing_transactions
        WHERE status = 'completed'
      `;
      
      const revenueBreakdownResult = await this.db.query(revenueBreakdownQuery);
      const revenueBreakdown = revenueBreakdownResult.rows[0];

      return {
        overview: {
          totalTenants: parseInt(tenantOverview.total_tenants) || 0,
          activeTenants: parseInt(tenantOverview.active_tenants) || 0,
          totalUsers,
          totalRevenue: financialSummary.monthlyRecurringRevenue * 12, // Annualized
          monthlyRecurringRevenue: financialSummary.monthlyRecurringRevenue
        },
        tenantMetrics,
        revenueMetrics: {
          subscriptionRevenue: parseFloat(revenueBreakdown.subscription_revenue) || 0,
          commissionRevenue: parseFloat(revenueBreakdown.commission_revenue) || 0,
          growthRate: financialSummary.growthRate
        },
        systemHealth: {
          activeSubscriptions: financialSummary.totalActiveSubscriptions,
          pendingCommissions: parseInt(commissionMetrics.pending_commissions) || 0,
          disputedCommissions: parseInt(commissionMetrics.disputed_commissions) || 0,
          systemUptime: process.uptime()
        }
      };
    } catch (error) {
      logger.error('Error getting admin dashboard metrics:', error);
      throw new Error('Failed to get dashboard metrics');
    }
  }

  // Perform tenant management actions
  async performTenantAction(action: TenantManagementAction): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const { tenantId, action: actionType, reason, effectiveDate } = action;

      // Validate tenant exists
      const tenant = await whiteLabelService.getConfigById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      let newStatus: string;
      
      switch (actionType) {
        case 'suspend':
          newStatus = 'suspended';
          break;
        case 'activate':
          newStatus = 'active';
          break;
        case 'cancel':
          newStatus = 'cancelled';
          break;
        default:
          throw new Error(`Unsupported action: ${actionType}`);
      }

      // Update tenant status
      await whiteLabelService.updateWhiteLabelConfig(tenantId, { status: newStatus as any });

      // Log the action
      const logQuery = `
        INSERT INTO admin_actions (admin_user_id, tenant_id, action_type, reason, effective_date, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `;
      
      // Note: This would require an admin_actions table to be created
      // For now, we'll just log it
      logger.info(`Admin action performed: ${actionType} on tenant ${tenantId}`, {
        tenantId,
        action: actionType,
        reason,
        effectiveDate
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error performing tenant action:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get tenant usage analytics
  async getTenantUsageAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    userActivity: Array<{ date: string; activeUsers: number; newUsers: number }>;
    featureUsage: Record<string, number>;
    revenueMetrics: { totalRevenue: number; averageRevenuePerUser: number };
  }> {
    try {
      // Get daily user activity
      const userActivityQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(CASE WHEN created_at BETWEEN $2 AND $3 THEN 1 END) as new_users,
          COUNT(CASE WHEN last_login BETWEEN $2 AND $3 THEN 1 END) as active_users
        FROM users
        WHERE profile->>'tenantId' = $1
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
      
      const userActivityResult = await this.db.query(userActivityQuery, [tenantId, startDate, endDate]);
      const userActivity = userActivityResult.rows.map(row => ({
        date: row.date,
        activeUsers: parseInt(row.active_users) || 0,
        newUsers: parseInt(row.new_users) || 0
      }));

      // Get feature usage
      const featureUsageQuery = `
        SELECT 
          resource_type,
          SUM(usage_count) as total_usage
        FROM usage_tracking ut
        JOIN users u ON ut.user_id = u.id
        WHERE u.profile->>'tenantId' = $1
          AND ut.period_start >= $2 AND ut.period_end <= $3
        GROUP BY resource_type
      `;
      
      const featureUsageResult = await this.db.query(featureUsageQuery, [tenantId, startDate, endDate]);
      const featureUsage: Record<string, number> = {};
      featureUsageResult.rows.forEach(row => {
        featureUsage[row.resource_type] = parseInt(row.total_usage) || 0;
      });

      // Get revenue metrics
      const revenueQuery = `
        SELECT 
          SUM(amount) as total_revenue,
          COUNT(DISTINCT user_id) as paying_users
        FROM billing_transactions bt
        JOIN users u ON bt.user_id = u.id
        WHERE u.profile->>'tenantId' = $1
          AND bt.created_at BETWEEN $2 AND $3
          AND bt.status = 'completed'
      `;
      
      const revenueResult = await this.db.query(revenueQuery, [tenantId, startDate, endDate]);
      const revenueData = revenueResult.rows[0];
      
      const totalRevenue = parseFloat(revenueData.total_revenue) || 0;
      const payingUsers = parseInt(revenueData.paying_users) || 0;
      const averageRevenuePerUser = payingUsers > 0 ? totalRevenue / payingUsers : 0;

      return {
        userActivity,
        featureUsage,
        revenueMetrics: {
          totalRevenue,
          averageRevenuePerUser
        }
      };
    } catch (error) {
      logger.error('Error getting tenant usage analytics:', error);
      throw new Error('Failed to get tenant usage analytics');
    }
  }

  // Get system-wide alerts and notifications
  async getSystemAlerts(): Promise<Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
    createdAt: Date;
    resolved: boolean;
  }>> {
    try {
      const alerts: Array<any> = [];

      // Check for high commission disputes
      const disputedCommissionsQuery = `
        SELECT COUNT(*) as disputed_count
        FROM commission_tracking
        WHERE status = 'disputed' AND created_at >= NOW() - INTERVAL '7 days'
      `;
      
      const disputedResult = await this.db.query(disputedCommissionsQuery);
      const disputedCount = parseInt(disputedResult.rows[0].disputed_count);
      
      if (disputedCount > 5) {
        alerts.push({
          id: 'high-disputes',
          type: 'warning',
          title: 'High Commission Disputes',
          message: `${disputedCount} commission disputes in the last 7 days`,
          createdAt: new Date(),
          resolved: false
        });
      }

      // Check for failed payments
      const failedPaymentsQuery = `
        SELECT COUNT(*) as failed_count
        FROM billing_transactions
        WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours'
      `;
      
      const failedResult = await this.db.query(failedPaymentsQuery);
      const failedCount = parseInt(failedResult.rows[0].failed_count);
      
      if (failedCount > 10) {
        alerts.push({
          id: 'failed-payments',
          type: 'error',
          title: 'High Payment Failures',
          message: `${failedCount} failed payments in the last 24 hours`,
          createdAt: new Date(),
          resolved: false
        });
      }

      // Check for inactive tenants
      const inactiveTenantsQuery = `
        SELECT COUNT(*) as inactive_count
        FROM white_label_configs wlc
        LEFT JOIN users u ON u.profile->>'tenantId' = wlc.id
        WHERE wlc.status = 'active' 
          AND (u.last_login IS NULL OR u.last_login < NOW() - INTERVAL '30 days')
        GROUP BY wlc.id
        HAVING COUNT(u.id) = 0
      `;
      
      const inactiveResult = await this.db.query(inactiveTenantsQuery);
      const inactiveCount = inactiveResult.rows.length;
      
      if (inactiveCount > 0) {
        alerts.push({
          id: 'inactive-tenants',
          type: 'info',
          title: 'Inactive Tenants',
          message: `${inactiveCount} tenants have no active users in the last 30 days`,
          createdAt: new Date(),
          resolved: false
        });
      }

      return alerts;
    } catch (error) {
      logger.error('Error getting system alerts:', error);
      return [];
    }
  }

  // Export tenant data for compliance or migration
  async exportTenantData(tenantId: string): Promise<{
    tenant: any;
    users: any[];
    subscriptions: any[];
    transactions: any[];
    usage: any[];
  }> {
    try {
      // Get tenant configuration
      const tenant = await whiteLabelService.getConfigById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get tenant users
      const usersQuery = `
        SELECT id, email, profile, preferences, created_at
        FROM users
        WHERE profile->>'tenantId' = $1
      `;
      const usersResult = await this.db.query(usersQuery, [tenantId]);

      // Get subscriptions
      const subscriptionsQuery = `
        SELECT us.*, sp.name as plan_name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        JOIN users u ON us.user_id = u.id
        WHERE u.profile->>'tenantId' = $1
      `;
      const subscriptionsResult = await this.db.query(subscriptionsQuery, [tenantId]);

      // Get transactions
      const transactionsQuery = `
        SELECT bt.*
        FROM billing_transactions bt
        JOIN users u ON bt.user_id = u.id
        WHERE u.profile->>'tenantId' = $1
      `;
      const transactionsResult = await this.db.query(transactionsQuery, [tenantId]);

      // Get usage data
      const usageQuery = `
        SELECT ut.*
        FROM usage_tracking ut
        JOIN users u ON ut.user_id = u.id
        WHERE u.profile->>'tenantId' = $1
      `;
      const usageResult = await this.db.query(usageQuery, [tenantId]);

      return {
        tenant,
        users: usersResult.rows,
        subscriptions: subscriptionsResult.rows,
        transactions: transactionsResult.rows,
        usage: usageResult.rows
      };
    } catch (error) {
      logger.error('Error exporting tenant data:', error);
      throw new Error('Failed to export tenant data');
    }
  }
}

export const adminDashboardService = new AdminDashboardService();