import { Request, Response, NextFunction } from 'express';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Enable default metrics collection
collectDefaultMetrics({ register });

// Custom metrics for JurisGuide platform
export const metrics = {
  // HTTP request metrics
  httpRequestsTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'user_type']
  }),

  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),

  // AI service metrics
  aiRequestsTotal: new Counter({
    name: 'ai_requests_total',
    help: 'Total number of AI service requests',
    labelNames: ['service_type', 'status', 'jurisdiction']
  }),

  aiRequestDuration: new Histogram({
    name: 'ai_request_duration_seconds',
    help: 'Duration of AI service requests in seconds',
    labelNames: ['service_type', 'jurisdiction'],
    buckets: [1, 5, 10, 30, 60, 120]
  }),

  aiGuidanceAccuracy: new Histogram({
    name: 'ai_guidance_accuracy_score',
    help: 'AI guidance accuracy scores',
    labelNames: ['jurisdiction', 'category'],
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
  }),

  // Business metrics
  activeUsers: new Gauge({
    name: 'active_users_total',
    help: 'Number of currently active users',
    labelNames: ['user_type']
  }),

  legalQueriesTotal: new Counter({
    name: 'legal_queries_total',
    help: 'Total number of legal queries submitted',
    labelNames: ['category', 'jurisdiction', 'urgency']
  }),

  lawyerMatchesTotal: new Counter({
    name: 'lawyer_matches_total',
    help: 'Total number of successful lawyer matches',
    labelNames: ['specialization', 'location']
  }),

  mediationCasesTotal: new Counter({
    name: 'mediation_cases_total',
    help: 'Total number of mediation cases created',
    labelNames: ['status', 'jurisdiction']
  }),

  subscriptionRevenue: new Counter({
    name: 'subscription_revenue_total',
    help: 'Total subscription revenue in USD',
    labelNames: ['plan_type', 'billing_cycle']
  }),

  commissionRevenue: new Counter({
    name: 'commission_revenue_total',
    help: 'Total commission revenue in USD',
    labelNames: ['lawyer_specialization']
  }),

  // Database metrics
  databaseConnections: new Gauge({
    name: 'database_connections_active',
    help: 'Number of active database connections'
  }),

  databaseQueryDuration: new Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  }),

  // Cache metrics
  cacheHits: new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type']
  }),

  cacheMisses: new Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type']
  }),

  // Error metrics
  errorsTotal: new Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['error_type', 'service', 'severity']
  }),

  // Security metrics
  authenticationAttempts: new Counter({
    name: 'authentication_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['status', 'method']
  }),

  rateLimitHits: new Counter({
    name: 'rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['endpoint', 'user_type']
  })
};

// Middleware to collect HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Track request start
  const originalSend = res.send;
  res.send = function(body) {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path;
    const userType = (req as any).user?.type || 'anonymous';
    
    // Record metrics
    metrics.httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
      user_type: userType
    });
    
    metrics.httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode.toString()
      },
      duration
    );
    
    return originalSend.call(this, body);
  };
  
  next();
};

// Function to track AI service metrics
export const trackAIMetrics = (
  serviceType: string,
  jurisdiction: string,
  duration: number,
  status: 'success' | 'error',
  accuracy?: number
): void => {
  metrics.aiRequestsTotal.inc({
    service_type: serviceType,
    status,
    jurisdiction
  });
  
  metrics.aiRequestDuration.observe(
    { service_type: serviceType, jurisdiction },
    duration
  );
  
  if (accuracy !== undefined) {
    metrics.aiGuidanceAccuracy.observe(
      { jurisdiction, category: serviceType },
      accuracy
    );
  }
};

// Function to track business metrics
export const trackBusinessMetrics = {
  legalQuery: (category: string, jurisdiction: string, urgency: string) => {
    metrics.legalQueriesTotal.inc({ category, jurisdiction, urgency });
  },
  
  lawyerMatch: (specialization: string, location: string) => {
    metrics.lawyerMatchesTotal.inc({ specialization, location });
  },
  
  mediationCase: (status: string, jurisdiction: string) => {
    metrics.mediationCasesTotal.inc({ status, jurisdiction });
  },
  
  subscriptionRevenue: (amount: number, planType: string, billingCycle: string) => {
    metrics.subscriptionRevenue.inc({ plan_type: planType, billing_cycle: billingCycle }, amount);
  },
  
  commissionRevenue: (amount: number, specialization: string) => {
    metrics.commissionRevenue.inc({ lawyer_specialization: specialization }, amount);
  }
};

// Function to track database metrics
export const trackDatabaseMetrics = (operation: string, table: string, duration: number): void => {
  metrics.databaseQueryDuration.observe({ operation, table }, duration);
};

// Function to track cache metrics
export const trackCacheMetrics = (type: 'hit' | 'miss', cacheType: string): void => {
  if (type === 'hit') {
    metrics.cacheHits.inc({ cache_type: cacheType });
  } else {
    metrics.cacheMisses.inc({ cache_type: cacheType });
  }
};

// Function to track errors
export const trackError = (errorType: string, service: string, severity: 'low' | 'medium' | 'high' | 'critical'): void => {
  metrics.errorsTotal.inc({ error_type: errorType, service, severity });
};

// Function to track security metrics
export const trackSecurityMetrics = {
  authAttempt: (status: 'success' | 'failure', method: string) => {
    metrics.authenticationAttempts.inc({ status, method });
  },
  
  rateLimitHit: (endpoint: string, userType: string) => {
    metrics.rateLimitHits.inc({ endpoint, user_type: userType });
  }
};

// Metrics endpoint handler
export const metricsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end('Error collecting metrics');
  }
};

// Function to update active users gauge
export const updateActiveUsers = (userType: string, count: number): void => {
  metrics.activeUsers.set({ user_type: userType }, count);
};

// Function to update database connections gauge
export const updateDatabaseConnections = (count: number): void => {
  metrics.databaseConnections.set(count);
};