import { Request, Response } from 'express';
import { redisManager } from '../config/redis-config';
import { pool } from '../database/config';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
  instance?: string;
}

export class HealthCheckService {
  private static startTime = Date.now();

  public static async performHealthCheck(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;
    const version = process.env.npm_package_version || '1.0.0';
    const instance = process.env.INSTANCE_ID || 'unknown';

    // Check database health
    const databaseHealth = await this.checkDatabase();
    
    // Check Redis health
    const redisHealth = await this.checkRedis();
    
    // Check system resources
    const memoryInfo = this.getMemoryInfo();
    const cpuInfo = this.getCpuInfo();

    const overallStatus = (
      databaseHealth.status === 'healthy' && 
      redisHealth.status === 'healthy' &&
      memoryInfo.percentage < 90
    ) ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp,
      uptime,
      version,
      services: {
        database: databaseHealth,
        redis: redisHealth,
        memory: memoryInfo,
        cpu: cpuInfo
      },
      instance
    };
  }

  private static async checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number; error?: string }> {
    try {
      const startTime = Date.now();
      const client = await pool.connect();
      
      // Simple query to test database connectivity
      await client.query('SELECT 1');
      client.release();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  private static async checkRedis(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number; error?: string }> {
    try {
      const startTime = Date.now();
      const isHealthy = await redisManager.healthCheck();
      const responseTime = Date.now() - startTime;
      
      if (isHealthy) {
        return {
          status: 'healthy',
          responseTime
        };
      } else {
        return {
          status: 'unhealthy',
          error: 'Redis ping failed'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown Redis error'
      };
    }
  }

  private static getMemoryInfo(): { used: number; total: number; percentage: number } {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const percentage = (usedMemory / totalMemory) * 100;

    return {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round(percentage * 100) / 100
    };
  }

  private static getCpuInfo(): { usage: number } {
    // Simple CPU usage approximation
    const cpuUsage = process.cpuUsage();
    const totalUsage = cpuUsage.user + cpuUsage.system;
    
    return {
      usage: Math.round((totalUsage / 1000000) * 100) / 100 // Convert to percentage
    };
  }

  public static async detailedHealthCheck(): Promise<HealthStatus & { details: any }> {
    const basicHealth = await this.performHealthCheck();
    
    // Additional detailed checks for monitoring systems
    const details = {
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        instanceId: process.env.INSTANCE_ID
      },
      connections: {
        activeConnections: await this.getActiveConnections(),
        databasePool: await this.getDatabasePoolStatus()
      }
    };

    return {
      ...basicHealth,
      details
    };
  }

  private static async getActiveConnections(): Promise<number> {
    try {
      // This would typically come from your server instance
      // For now, return a placeholder
      return 0;
    } catch (error) {
      return -1;
    }
  }

  private static async getDatabasePoolStatus(): Promise<any> {
    try {
      return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      };
    } catch (error) {
      return {
        error: 'Unable to get pool status'
      };
    }
  }
}

// Express middleware for health check endpoint
export const healthCheckMiddleware = async (req: Request, res: Response): Promise<void> => {
  try {
    const detailed = req.query.detailed === 'true';
    
    const healthStatus = detailed 
      ? await HealthCheckService.detailedHealthCheck()
      : await HealthCheckService.performHealthCheck();

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Readiness probe (for Kubernetes)
export const readinessProbe = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if the application is ready to serve traffic
    const databaseHealth = await HealthCheckService['checkDatabase']();
    const redisHealth = await HealthCheckService['checkRedis']();
    
    if (databaseHealth.status === 'healthy' && redisHealth.status === 'healthy') {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: 'Readiness check failed' });
  }
};

// Liveness probe (for Kubernetes)
export const livenessProbe = async (req: Request, res: Response): Promise<void> => {
  try {
    // Simple check to see if the process is alive
    res.status(200).json({ 
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - HealthCheckService['startTime']
    });
  } catch (error) {
    res.status(503).json({ status: 'dead', error: 'Liveness check failed' });
  }
};