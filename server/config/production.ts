import { config } from 'dotenv';

// Load production environment variables
config({ path: '.env.production' });

export const productionConfig = {
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'jurisguide_prod',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    pool: {
      min: 10,
      max: 50,
      idle: 10000,
      acquire: 60000,
      evict: 1000
    },
    logging: false, // Disable SQL logging in production
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: 0,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
    family: 4
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://jurisguide.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiration: '24h',
    bcryptRounds: 12,
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Increased for production load
      standardHeaders: true,
      legacyHeaders: false
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "https://api.openai.com", "https://maps.googleapis.com"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }
  },

  // Monitoring Configuration
  monitoring: {
    healthCheck: {
      interval: 30000, // 30 seconds
      timeout: 5000,
      retries: 3
    },
    metrics: {
      enabled: true,
      endpoint: '/metrics',
      collectDefaultMetrics: true
    }
  }
};