import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectDatabase, pool } from './database/config';
import { runMigrations } from './database/migrations/migrate';
import { healthCheck } from './database/operations';
import { requestIdMiddleware } from './middleware/requestId';
import { resolveTenant, validateTenantStatus } from './middleware/tenant';

// Load environment variables
dotenv.config();

// Initialize encryption system
import { initializeEncryption } from './utils/encryption';

// Initialize notification service
import { notificationService } from './services/notification-service';

// Import routes
import authRoutes from './routes/auth';
import legalQueryRoutes from './routes/legal-queries';
import legalGuidanceRoutes from './routes/legal-guidance';
import lawyerRoutes from './routes/lawyers';
import locationRoutes from './routes/location';
import paymentRoutes from './routes/payments';
import secureCommunicationRoutes from './routes/secure-communication';
import privacyComplianceRoutes from './routes/privacy-compliance';
import subscriptionRoutes from './routes/subscriptions';
import commissionRoutes from './routes/commissions';
import financialReportRoutes from './routes/financial-reports';
import whiteLabelRoutes from './routes/white-label';
import adminDashboardRoutes from './routes/admin-dashboard';
import translationRoutes from './routes/translation';
import legalDatabaseRoutes from './routes/legal-database';
import notificationRoutes from './routes/notifications';
import analyticsRoutes from './routes/analytics';
import { createMediationRoutes } from './routes/mediation';
import { createMediationWorkflowRoutes } from './routes/mediation-workflow';

// Import monitoring middleware
import { metricsMiddleware } from './middleware/metrics';
const requestRoutes = require('./routes/requests');
const departmentRoutes = require('./routes/departments');

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestIdMiddleware);
app.use(resolveTenant);
app.use(validateTenantStatus);
app.use(metricsMiddleware); // Add metrics collection
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database and run migrations
async function initializeDatabase() {
  try {
    await connectDatabase();
    console.log('✅ Database connected successfully');
    
    // Run migrations
    await runMigrations();
    console.log('✅ Database migrations completed');
    
    // Initialize encryption system
    initializeEncryption();
    console.log('✅ Encryption system initialized');
    
    // Initialize notification service with Socket.IO
    notificationService.setSocketIO(io);
    console.log('✅ Notification service initialized with Socket.IO');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/legal-queries', legalQueryRoutes);
app.use('/api/legal-guidance', legalGuidanceRoutes);
app.use('/api/lawyers', lawyerRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/secure-communication', secureCommunicationRoutes);
app.use('/api/privacy', privacyComplianceRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/financial-reports', financialReportRoutes);
app.use('/api/white-label', whiteLabelRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/legal-database', legalDatabaseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/departments', departmentRoutes);

// Initialize mediation routes with database connection
async function initializeMediationRoutes() {
  await connectDatabase();
  app.use('/api/mediation', createMediationRoutes(pool));
  app.use('/api/mediation-workflow', createMediationWorkflowRoutes(pool));
}

// Import production health check middleware
import { healthCheckMiddleware, readinessProbe, livenessProbe } from './middleware/health-check';

// Production health check endpoints
app.get('/health', healthCheckMiddleware);
app.get('/health/ready', readinessProbe);
app.get('/health/live', livenessProbe);

// Enhanced health check with database status (legacy endpoint)
app.get('/api/health', async (req, res) => {
  try {
    const dbHealthy = await healthCheck();
    
    res.json({ 
      status: 'Server is running',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      version: '2.0.0',
      platform: 'JurisGuide'
    });
  } catch (error) {
    res.status(500).json({
      status: 'Server error',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    }
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Join user-specific room for notifications
  socket.on('join_user_room', (userId: string) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their notification room`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    await initializeMediationRoutes();
    
    server.listen(PORT, () => {
      console.log(`🚀 JurisGuide server running on port ${PORT}`);
      console.log(`📊 Health check available at http://localhost:${PORT}/api/health`);
      console.log(`🤝 Mediation services available at http://localhost:${PORT}/api/mediation`);
      console.log(`🔔 Real-time notifications enabled via Socket.IO`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();