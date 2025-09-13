import Redis from 'ioredis';
import { productionConfig } from './production';

// Redis connection configuration for production
export class RedisManager {
  private static instance: RedisManager;
  private redisClient: Redis;
  private redisSubscriber: Redis;
  private redisPublisher: Redis;

  private constructor() {
    const redisConfig = productionConfig.redis;
    
    // Main Redis client for caching and session management
    this.redisClient = new Redis({
      ...redisConfig,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Separate connections for pub/sub to avoid blocking
    this.redisSubscriber = new Redis({
      ...redisConfig,
      lazyConnect: true
    });

    this.redisPublisher = new Redis({
      ...redisConfig,
      lazyConnect: true
    });

    this.setupEventHandlers();
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  private setupEventHandlers(): void {
    this.redisClient.on('connect', () => {
      console.log('Redis client connected');
    });

    this.redisClient.on('error', (error) => {
      console.error('Redis client error:', error);
    });

    this.redisClient.on('reconnecting', () => {
      console.log('Redis client reconnecting...');
    });

    this.redisSubscriber.on('error', (error) => {
      console.error('Redis subscriber error:', error);
    });

    this.redisPublisher.on('error', (error) => {
      console.error('Redis publisher error:', error);
    });
  }

  // Session management methods
  public async setSession(sessionId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    try {
      await this.redisClient.setex(`session:${sessionId}`, ttl, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error setting session:', error);
      throw error;
    }
  }

  public async getSession(sessionId: string): Promise<any | null> {
    try {
      const sessionData = await this.redisClient.get(`session:${sessionId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  public async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.redisClient.del(`session:${sessionId}`);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  // Caching methods
  public async setCache(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.redisClient.setex(`cache:${key}`, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting cache:', error);
      throw error;
    }
  }

  public async getCache(key: string): Promise<any | null> {
    try {
      const cachedData = await this.redisClient.get(`cache:${key}`);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  public async deleteCache(key: string): Promise<void> {
    try {
      await this.redisClient.del(`cache:${key}`);
    } catch (error) {
      console.error('Error deleting cache:', error);
      throw error;
    }
  }

  public async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redisClient.keys(`cache:${pattern}`);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      console.error('Error invalidating cache pattern:', error);
      throw error;
    }
  }

  // Rate limiting methods
  public async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const current = await this.redisClient.incr(`rate_limit:${key}`);
      
      if (current === 1) {
        await this.redisClient.expire(`rate_limit:${key}`, window);
      }
      
      const ttl = await this.redisClient.ttl(`rate_limit:${key}`);
      const resetTime = Date.now() + (ttl * 1000);
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Fail open - allow request if Redis is down
      return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 };
    }
  }

  // Real-time messaging methods
  public async publish(channel: string, message: any): Promise<void> {
    try {
      await this.redisPublisher.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error('Error publishing message:', error);
      throw error;
    }
  }

  public async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      await this.redisSubscriber.subscribe(channel);
      this.redisSubscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        }
      });
    } catch (error) {
      console.error('Error subscribing to channel:', error);
      throw error;
    }
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Graceful shutdown
  public async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.redisClient.disconnect(),
        this.redisSubscriber.disconnect(),
        this.redisPublisher.disconnect()
      ]);
      console.log('Redis connections closed');
    } catch (error) {
      console.error('Error disconnecting Redis:', error);
    }
  }

  // Get Redis clients for advanced operations
  public getClient(): Redis {
    return this.redisClient;
  }

  public getSubscriber(): Redis {
    return this.redisSubscriber;
  }

  public getPublisher(): Redis {
    return this.redisPublisher;
  }
}

export const redisManager = RedisManager.getInstance();