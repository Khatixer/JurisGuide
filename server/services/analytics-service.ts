import { pool } from '../database/config';
import { redisManager } from '../config/redis-config';
import { trackBusinessMetrics, trackAIMetrics } from '../middleware/metrics';

export interface AnalyticsData {
  userEngagement: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    retentionRate: number;
  };
  legalQueries: {
    totalQueries: number;
    queriesByCategory: Record<string, number>;
    queriesByJurisdiction: Record<string, number>;
    averageResponseTime: number;
  };
  lawyerMatching: {
    totalMatches: number;
    successRate: number;
    averageMatchTime: number;
    topSpecializations: Array<{ specialization: string; count: number }>;
  };
  mediation: {
    totalCases: number;
    successRate: number;
    averageResolutionTime: number;
    casesByStatus: Record<string, number>;
  };
  revenue: {
    totalRevenue: number;
    subscriptionRevenue: number;
    commissionRevenue: number;
    revenueByPlan: Record<string, number>;
  };
  aiPerformance: {
    averageAccuracy: number;
    responseTime: number;
    requestVolume: number;
    accuracyByJurisdiction: Record<string, number>;
  };
}

export class AnalyticsService {
  private static instance: AnalyticsService;

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // Get comprehensive analytics dashboard data
  public async getDashboardAnalytics(timeframe: '24h' | '7d' | '30d' | '90d' = '30d'): Promise<AnalyticsData> {
    const cacheKey = `analytics:dashboard:${timeframe}`;
    
    // Try to get from cache first
    const cachedData = await redisManager.getCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const timeframeHours = this.getTimeframeHours(timeframe);
    const startDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);

    const [
      userEngagement,
      legalQueries,
      lawyerMatching,
      mediation,
      revenue,
      aiPerformance
    ] = await Promise.all([
      this.getUserEngagementMetrics(startDate),
      this.getLegalQueryMetrics(startDate),
      this.getLawyerMatchingMetrics(startDate),
      this.getMediationMetrics(startDate),
      this.getRevenueMetrics(startDate),
      this.getAIPerformanceMetrics(startDate)
    ]);

    const analyticsData: AnalyticsData = {
      userEngagement,
      legalQueries,
      lawyerMatching,
      mediation,
      revenue,
      aiPerformance
    };

    // Cache for 15 minutes
    await redisManager.setCache(cacheKey, analyticsData, 900);

    return analyticsData;
  }

  // User engagement metrics
  private async getUserEngagementMetrics(startDate: Date): Promise<AnalyticsData['userEngagement']> {
    const client = await pool.connect();
    
    try {
      // Total users
      const totalUsersResult = await client.query('SELECT COUNT(*) as count FROM users');
      const totalUsers = parseInt(totalUsersResult.rows[0].count);

      // Active users (users who performed any action in the timeframe)
      const activeUsersResult = await client.query(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM audit_logs 
        WHERE created_at >= $1
      `, [startDate]);
      const activeUsers = parseInt(activeUsersResult.rows[0].count);

      // New users in timeframe
      const newUsersResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at >= $1
      `, [startDate]);
      const newUsers = parseInt(newUsersResult.rows[0].count);

      // Calculate retention rate (simplified)
      const retentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

      return {
        totalUsers,
        activeUsers,
        newUsers,
        retentionRate: Math.round(retentionRate * 100) / 100
      };
    } finally {
      client.release();
    }
  }

  // Legal query metrics
  private async getLegalQueryMetrics(startDate: Date): Promise<AnalyticsData['legalQueries']> {
    const client = await pool.connect();
    
    try {
      // Total queries
      const totalQueriesResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM legal_queries 
        WHERE created_at >= $1
      `, [startDate]);
      const totalQueries = parseInt(totalQueriesResult.rows[0].count);

      // Queries by category
      const categoriesResult = await client.query(`
        SELECT category, COUNT(*) as count 
        FROM legal_queries 
        WHERE created_at >= $1 
        GROUP BY category
      `, [startDate]);
      const queriesByCategory: Record<string, number> = {};
      categoriesResult.rows.forEach(row => {
        queriesByCategory[row.category] = parseInt(row.count);
      });

      // Queries by jurisdiction
      const jurisdictionsResult = await client.query(`
        SELECT unnest(jurisdiction) as jurisdiction, COUNT(*) as count 
        FROM legal_queries 
        WHERE created_at >= $1 
        GROUP BY jurisdiction
      `, [startDate]);
      const queriesByJurisdiction: Record<string, number> = {};
      jurisdictionsResult.rows.forEach(row => {
        queriesByJurisdiction[row.jurisdiction] = parseInt(row.count);
      });

      // Average response time (from legal_guidance table)
      const responseTimeResult = await client.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (lg.created_at - lq.created_at))) as avg_time
        FROM legal_queries lq
        JOIN legal_guidance lg ON lq.id = lg.query_id
        WHERE lq.created_at >= $1
      `, [startDate]);
      const averageResponseTime = parseFloat(responseTimeResult.rows[0]?.avg_time || '0');

      return {
        totalQueries,
        queriesByCategory,
        queriesByJurisdiction,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100
      };
    } finally {
      client.release();
    }
  }

  // Lawyer matching metrics
  private async getLawyerMatchingMetrics(startDate: Date): Promise<AnalyticsData['lawyerMatching']> {
    const client = await pool.connect();
    
    try {
      // Total matches (assuming lawyer_matches table exists)
      const totalMatchesResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM lawyer_matches 
        WHERE created_at >= $1
      `, [startDate]);
      const totalMatches = parseInt(totalMatchesResult.rows[0]?.count || '0');

      // Success rate (matches that led to consultations)
      const successfulMatchesResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM lawyer_matches 
        WHERE created_at >= $1 AND status = 'consultation_booked'
      `, [startDate]);
      const successfulMatches = parseInt(successfulMatchesResult.rows[0]?.count || '0');
      const successRate = totalMatches > 0 ? (successfulMatches / totalMatches) * 100 : 0;

      // Average match time
      const matchTimeResult = await client.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (matched_at - created_at))) as avg_time
        FROM lawyer_matches 
        WHERE created_at >= $1 AND matched_at IS NOT NULL
      `, [startDate]);
      const averageMatchTime = parseFloat(matchTimeResult.rows[0]?.avg_time || '0');

      // Top specializations
      const specializationsResult = await client.query(`
        SELECT unnest(l.specializations) as specialization, COUNT(*) as count
        FROM lawyer_matches lm
        JOIN lawyers l ON lm.lawyer_id = l.id
        WHERE lm.created_at >= $1
        GROUP BY specialization
        ORDER BY count DESC
        LIMIT 10
      `, [startDate]);
      const topSpecializations = specializationsResult.rows.map(row => ({
        specialization: row.specialization,
        count: parseInt(row.count)
      }));

      return {
        totalMatches,
        successRate: Math.round(successRate * 100) / 100,
        averageMatchTime: Math.round(averageMatchTime * 100) / 100,
        topSpecializations
      };
    } finally {
      client.release();
    }
  }

  // Mediation metrics
  private async getMediationMetrics(startDate: Date): Promise<AnalyticsData['mediation']> {
    const client = await pool.connect();
    
    try {
      // Total cases
      const totalCasesResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM mediation_cases 
        WHERE created_at >= $1
      `, [startDate]);
      const totalCases = parseInt(totalCasesResult.rows[0].count);

      // Success rate (resolved cases)
      const resolvedCasesResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM mediation_cases 
        WHERE created_at >= $1 AND status = 'resolved'
      `, [startDate]);
      const resolvedCases = parseInt(resolvedCasesResult.rows[0].count);
      const successRate = totalCases > 0 ? (resolvedCases / totalCases) * 100 : 0;

      // Average resolution time
      const resolutionTimeResult = await client.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_time
        FROM mediation_cases 
        WHERE created_at >= $1 AND resolved_at IS NOT NULL
      `, [startDate]);
      const averageResolutionTime = parseFloat(resolutionTimeResult.rows[0]?.avg_time || '0');

      // Cases by status
      const statusResult = await client.query(`
        SELECT status, COUNT(*) as count 
        FROM mediation_cases 
        WHERE created_at >= $1 
        GROUP BY status
      `, [startDate]);
      const casesByStatus: Record<string, number> = {};
      statusResult.rows.forEach(row => {
        casesByStatus[row.status] = parseInt(row.count);
      });

      return {
        totalCases,
        successRate: Math.round(successRate * 100) / 100,
        averageResolutionTime: Math.round(averageResolutionTime / 3600 * 100) / 100, // Convert to hours
        casesByStatus
      };
    } finally {
      client.release();
    }
  }

  // Revenue metrics
  private async getRevenueMetrics(startDate: Date): Promise<AnalyticsData['revenue']> {
    const client = await pool.connect();
    
    try {
      // Subscription revenue
      const subscriptionRevenueResult = await client.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM subscription_payments 
        WHERE created_at >= $1 AND status = 'completed'
      `, [startDate]);
      const subscriptionRevenue = parseFloat(subscriptionRevenueResult.rows[0].total);

      // Commission revenue
      const commissionRevenueResult = await client.query(`
        SELECT COALESCE(SUM(commission_amount), 0) as total
        FROM lawyer_commissions 
        WHERE created_at >= $1 AND status = 'paid'
      `, [startDate]);
      const commissionRevenue = parseFloat(commissionRevenueResult.rows[0].total);

      const totalRevenue = subscriptionRevenue + commissionRevenue;

      // Revenue by plan
      const planRevenueResult = await client.query(`
        SELECT plan_type, COALESCE(SUM(amount), 0) as total
        FROM subscription_payments 
        WHERE created_at >= $1 AND status = 'completed'
        GROUP BY plan_type
      `, [startDate]);
      const revenueByPlan: Record<string, number> = {};
      planRevenueResult.rows.forEach(row => {
        revenueByPlan[row.plan_type] = parseFloat(row.total);
      });

      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        subscriptionRevenue: Math.round(subscriptionRevenue * 100) / 100,
        commissionRevenue: Math.round(commissionRevenue * 100) / 100,
        revenueByPlan
      };
    } finally {
      client.release();
    }
  }

  // AI performance metrics
  private async getAIPerformanceMetrics(startDate: Date): Promise<AnalyticsData['aiPerformance']> {
    const client = await pool.connect();
    
    try {
      // Average accuracy from legal_guidance table
      const accuracyResult = await client.query(`
        SELECT AVG(confidence) as avg_accuracy
        FROM legal_guidance 
        WHERE created_at >= $1
      `, [startDate]);
      const averageAccuracy = parseFloat(accuracyResult.rows[0]?.avg_accuracy || '0');

      // Average response time
      const responseTimeResult = await client.query(`
        SELECT AVG(response_time_ms) as avg_time
        FROM ai_request_logs 
        WHERE created_at >= $1
      `, [startDate]);
      const responseTime = parseFloat(responseTimeResult.rows[0]?.avg_time || '0');

      // Request volume
      const volumeResult = await client.query(`
        SELECT COUNT(*) as count
        FROM ai_request_logs 
        WHERE created_at >= $1
      `, [startDate]);
      const requestVolume = parseInt(volumeResult.rows[0]?.count || '0');

      // Accuracy by jurisdiction
      const jurisdictionAccuracyResult = await client.query(`
        SELECT lq.jurisdiction[1] as jurisdiction, AVG(lg.confidence) as avg_accuracy
        FROM legal_guidance lg
        JOIN legal_queries lq ON lg.query_id = lq.id
        WHERE lg.created_at >= $1
        GROUP BY lq.jurisdiction[1]
      `, [startDate]);
      const accuracyByJurisdiction: Record<string, number> = {};
      jurisdictionAccuracyResult.rows.forEach(row => {
        if (row.jurisdiction) {
          accuracyByJurisdiction[row.jurisdiction] = Math.round(parseFloat(row.avg_accuracy) * 100) / 100;
        }
      });

      return {
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        responseTime: Math.round(responseTime * 100) / 100,
        requestVolume,
        accuracyByJurisdiction
      };
    } finally {
      client.release();
    }
  }

  // Real-time analytics for live dashboard
  public async getRealTimeMetrics(): Promise<any> {
    const cacheKey = 'analytics:realtime';
    
    // Check cache first (short TTL for real-time data)
    const cachedData = await redisManager.getCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const client = await pool.connect();
    
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Current active sessions
      const activeSessionsResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM user_sessions 
        WHERE last_activity >= $1
      `, [oneHourAgo]);

      // Queries in last hour
      const recentQueriesResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM legal_queries 
        WHERE created_at >= $1
      `, [oneHourAgo]);

      // AI requests in last hour
      const aiRequestsResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM ai_request_logs 
        WHERE created_at >= $1
      `, [oneHourAgo]);

      const realTimeData = {
        activeSessions: parseInt(activeSessionsResult.rows[0].count),
        recentQueries: parseInt(recentQueriesResult.rows[0].count),
        aiRequests: parseInt(aiRequestsResult.rows[0].count),
        timestamp: now.toISOString()
      };

      // Cache for 30 seconds
      await redisManager.setCache(cacheKey, realTimeData, 30);

      return realTimeData;
    } finally {
      client.release();
    }
  }

  // Track user action for analytics
  public async trackUserAction(userId: string, action: string, metadata?: any): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(`
        INSERT INTO user_actions (user_id, action, metadata, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [userId, action, JSON.stringify(metadata || {})]);
    } finally {
      client.release();
    }
  }

  private getTimeframeHours(timeframe: string): number {
    switch (timeframe) {
      case '24h': return 24;
      case '7d': return 24 * 7;
      case '30d': return 24 * 30;
      case '90d': return 24 * 90;
      default: return 24 * 30;
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();