import { pool } from '../database/config';
import { redisManager } from '../config/redis-config';
import { trackAIMetrics } from '../middleware/metrics';

export interface AIPerformanceMetrics {
  requestId: string;
  serviceType: 'legal_guidance' | 'mediation' | 'cultural_adaptation' | 'translation';
  jurisdiction: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error' | 'timeout';
  accuracy?: number;
  confidence?: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  errorDetails?: string;
  metadata?: any;
}

export class AIPerformanceMonitor {
  private static instance: AIPerformanceMonitor;
  private activeRequests: Map<string, AIPerformanceMetrics> = new Map();

  public static getInstance(): AIPerformanceMonitor {
    if (!AIPerformanceMonitor.instance) {
      AIPerformanceMonitor.instance = new AIPerformanceMonitor();
    }
    return AIPerformanceMonitor.instance;
  }

  // Start tracking an AI request
  public startRequest(
    requestId: string,
    serviceType: AIPerformanceMetrics['serviceType'],
    jurisdiction: string,
    metadata?: any
  ): void {
    const metrics: AIPerformanceMetrics = {
      requestId,
      serviceType,
      jurisdiction,
      startTime: Date.now(),
      status: 'pending',
      metadata
    };

    this.activeRequests.set(requestId, metrics);
  }

  // Complete tracking an AI request
  public async completeRequest(
    requestId: string,
    status: 'success' | 'error' | 'timeout',
    accuracy?: number,
    confidence?: number,
    tokenUsage?: AIPerformanceMetrics['tokenUsage'],
    errorDetails?: string
  ): Promise<void> {
    const metrics = this.activeRequests.get(requestId);
    if (!metrics) {
      console.warn(`AI request ${requestId} not found in active requests`);
      return;
    }

    const endTime = Date.now();
    const duration = (endTime - metrics.startTime) / 1000; // Convert to seconds

    // Update metrics
    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.status = status;
    metrics.accuracy = accuracy;
    metrics.confidence = confidence;
    metrics.tokenUsage = tokenUsage;
    metrics.errorDetails = errorDetails;

    // Store in database
    await this.storeMetrics(metrics);

    // Update Prometheus metrics
    trackAIMetrics(metrics.serviceType, metrics.jurisdiction, duration, status, accuracy);

    // Update real-time cache
    await this.updateRealTimeMetrics(metrics);

    // Remove from active requests
    this.activeRequests.delete(requestId);

    // Check for performance issues
    await this.checkPerformanceThresholds(metrics);
  }

  // Store metrics in database
  private async storeMetrics(metrics: AIPerformanceMetrics): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(`
        INSERT INTO ai_request_logs (
          request_id, service_type, jurisdiction, start_time, end_time,
          duration_ms, status, accuracy, confidence, token_usage,
          error_details, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      `, [
        metrics.requestId,
        metrics.serviceType,
        metrics.jurisdiction,
        new Date(metrics.startTime),
        metrics.endTime ? new Date(metrics.endTime) : null,
        metrics.duration ? metrics.duration * 1000 : null,
        metrics.status,
        metrics.accuracy,
        metrics.confidence,
        metrics.tokenUsage ? JSON.stringify(metrics.tokenUsage) : null,
        metrics.errorDetails,
        metrics.metadata ? JSON.stringify(metrics.metadata) : null
      ]);
    } catch (error) {
      console.error('Error storing AI metrics:', error);
    } finally {
      client.release();
    }
  }

  // Update real-time metrics cache
  private async updateRealTimeMetrics(metrics: AIPerformanceMetrics): Promise<void> {
    try {
      const cacheKey = `ai_metrics:realtime:${metrics.serviceType}`;
      const currentMetrics = await redisManager.getCache(cacheKey) || {
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0,
        averageAccuracy: 0,
        lastUpdated: Date.now()
      };

      // Update counters
      currentMetrics.totalRequests += 1;
      if (metrics.status === 'success') {
        currentMetrics.successfulRequests += 1;
      }

      // Update averages (simple moving average)
      if (metrics.duration) {
        currentMetrics.averageResponseTime = 
          (currentMetrics.averageResponseTime * (currentMetrics.totalRequests - 1) + metrics.duration) / 
          currentMetrics.totalRequests;
      }

      if (metrics.accuracy) {
        currentMetrics.averageAccuracy = 
          (currentMetrics.averageAccuracy * (currentMetrics.successfulRequests - 1) + metrics.accuracy) / 
          currentMetrics.successfulRequests;
      }

      currentMetrics.lastUpdated = Date.now();

      // Cache for 5 minutes
      await redisManager.setCache(cacheKey, currentMetrics, 300);
    } catch (error) {
      console.error('Error updating real-time AI metrics:', error);
    }
  }

  // Check performance thresholds and trigger alerts
  private async checkPerformanceThresholds(metrics: AIPerformanceMetrics): Promise<void> {
    const thresholds = {
      responseTime: {
        warning: 10, // seconds
        critical: 30
      },
      accuracy: {
        warning: 0.7,
        critical: 0.5
      },
      errorRate: {
        warning: 0.1, // 10%
        critical: 0.2  // 20%
      }
    };

    // Check response time
    if (metrics.duration && metrics.duration > thresholds.responseTime.critical) {
      await this.triggerAlert('critical', 'AI_RESPONSE_TIME_CRITICAL', {
        serviceType: metrics.serviceType,
        jurisdiction: metrics.jurisdiction,
        duration: metrics.duration,
        requestId: metrics.requestId
      });
    } else if (metrics.duration && metrics.duration > thresholds.responseTime.warning) {
      await this.triggerAlert('warning', 'AI_RESPONSE_TIME_WARNING', {
        serviceType: metrics.serviceType,
        jurisdiction: metrics.jurisdiction,
        duration: metrics.duration,
        requestId: metrics.requestId
      });
    }

    // Check accuracy
    if (metrics.accuracy && metrics.accuracy < thresholds.accuracy.critical) {
      await this.triggerAlert('critical', 'AI_ACCURACY_CRITICAL', {
        serviceType: metrics.serviceType,
        jurisdiction: metrics.jurisdiction,
        accuracy: metrics.accuracy,
        requestId: metrics.requestId
      });
    } else if (metrics.accuracy && metrics.accuracy < thresholds.accuracy.warning) {
      await this.triggerAlert('warning', 'AI_ACCURACY_WARNING', {
        serviceType: metrics.serviceType,
        jurisdiction: metrics.jurisdiction,
        accuracy: metrics.accuracy,
        requestId: metrics.requestId
      });
    }

    // Check error status
    if (metrics.status === 'error' || metrics.status === 'timeout') {
      await this.triggerAlert('warning', 'AI_REQUEST_FAILED', {
        serviceType: metrics.serviceType,
        jurisdiction: metrics.jurisdiction,
        status: metrics.status,
        errorDetails: metrics.errorDetails,
        requestId: metrics.requestId
      });
    }
  }

  // Trigger alert (integrate with alerting system)
  private async triggerAlert(severity: 'warning' | 'critical', alertType: string, details: any): Promise<void> {
    try {
      // Store alert in database
      const client = await pool.connect();
      
      try {
        await client.query(`
          INSERT INTO ai_performance_alerts (
            alert_type, severity, details, created_at
          ) VALUES ($1, $2, $3, NOW())
        `, [alertType, severity, JSON.stringify(details)]);
      } finally {
        client.release();
      }

      // Send to monitoring system (Prometheus AlertManager, Slack, etc.)
      console.warn(`AI Performance Alert [${severity.toUpperCase()}]: ${alertType}`, details);
      
      // You could integrate with external alerting systems here
      // await this.sendToSlack(severity, alertType, details);
      // await this.sendToEmail(severity, alertType, details);
    } catch (error) {
      console.error('Error triggering AI performance alert:', error);
    }
  }

  // Get AI performance summary
  public async getPerformanceSummary(
    serviceType?: string,
    jurisdiction?: string,
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<any> {
    const client = await pool.connect();
    
    try {
      const timeframeHours = {
        '1h': 1,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30
      }[timeframe];

      const startTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);

      let whereClause = 'WHERE created_at >= $1';
      const params: any[] = [startTime];

      if (serviceType) {
        whereClause += ' AND service_type = $2';
        params.push(serviceType);
      }

      if (jurisdiction) {
        const paramIndex = params.length + 1;
        whereClause += ` AND jurisdiction = $${paramIndex}`;
        params.push(jurisdiction);
      }

      const result = await client.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(*) FILTER (WHERE status = 'success') as successful_requests,
          COUNT(*) FILTER (WHERE status = 'error') as failed_requests,
          COUNT(*) FILTER (WHERE status = 'timeout') as timeout_requests,
          AVG(duration_ms) as avg_duration_ms,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
          AVG(accuracy) FILTER (WHERE accuracy IS NOT NULL) as avg_accuracy,
          AVG(confidence) FILTER (WHERE confidence IS NOT NULL) as avg_confidence,
          SUM((token_usage->>'total')::int) FILTER (WHERE token_usage IS NOT NULL) as total_tokens
        FROM ai_request_logs
        ${whereClause}
      `, params);

      const summary = result.rows[0];
      
      return {
        totalRequests: parseInt(summary.total_requests),
        successfulRequests: parseInt(summary.successful_requests),
        failedRequests: parseInt(summary.failed_requests),
        timeoutRequests: parseInt(summary.timeout_requests),
        successRate: summary.total_requests > 0 ? 
          (summary.successful_requests / summary.total_requests) * 100 : 0,
        averageDuration: parseFloat(summary.avg_duration_ms) || 0,
        p95Duration: parseFloat(summary.p95_duration_ms) || 0,
        averageAccuracy: parseFloat(summary.avg_accuracy) || 0,
        averageConfidence: parseFloat(summary.avg_confidence) || 0,
        totalTokens: parseInt(summary.total_tokens) || 0,
        timeframe,
        serviceType,
        jurisdiction
      };
    } finally {
      client.release();
    }
  }

  // Get active requests count
  public getActiveRequestsCount(): number {
    return this.activeRequests.size;
  }

  // Get active requests by service type
  public getActiveRequestsByService(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const metrics of this.activeRequests.values()) {
      counts[metrics.serviceType] = (counts[metrics.serviceType] || 0) + 1;
    }
    
    return counts;
  }

  // Clean up stale requests (requests that have been pending too long)
  public cleanupStaleRequests(maxAgeMinutes: number = 10): void {
    const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
    const now = Date.now();
    
    for (const [requestId, metrics] of this.activeRequests.entries()) {
      if (now - metrics.startTime > maxAge) {
        console.warn(`Cleaning up stale AI request: ${requestId}`);
        this.completeRequest(requestId, 'timeout', undefined, undefined, undefined, 'Request timed out');
      }
    }
  }
}

export const aiPerformanceMonitor = AIPerformanceMonitor.getInstance();