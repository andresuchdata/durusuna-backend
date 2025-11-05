import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';

// Configure environment variables
dotenv.config();

// Import mixed JS/TS files
import db from './shared/database/connection';
import logger from './shared/utils/logger';

// Debug: Log that we've reached import completion
logger.info('🔧 All imports loaded successfully');
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import schoolRoutes from './routes/schools';
import classRoutes from './routes/classes';
import lessonRoutes from './routes/lessons';
import messageRoutes from './routes/messages';
import conversationRoutes from './routes/conversations';
import uploadRoutes from './routes/uploads';
import classUpdatesRoutes from './routes/class_updates';
import notificationRoutes from './routes/notifications';
import attendanceRoutes from './routes/attendance';
import assignmentRoutes from './routes/assignments';
import enrollmentRoutes from './routes/enrollments';
import classOfferingRoutes from './routes/classOfferings';
import academicRoutes from './routes/academic';
import socketHandler, { getWebsocketStatus, logWebsocketStatus } from './services/socketService';
import { NotificationOutboxRepository } from './repositories/notificationOutboxRepository';
import { NotificationDeliveryRepository } from './repositories/notificationDeliveryRepository';
import { NotificationRepository } from './repositories/notificationRepository';
import { NotificationDispatcher } from './services/notification/NotificationDispatcher';
import { SocketChannelProvider } from './services/notification/channels/SocketChannelProvider';
import { EmailChannelProvider } from './services/notification/channels/EmailChannelProvider';
import { FirebaseChannelProvider } from './services/notification/channels/FirebaseChannelProvider';
import { FirebaseManager } from './config/firebase';

// Debug: Log that all imports completed
logger.info('🎯 All route and service imports completed');

// Create Express app
const app = express();
const server = http.createServer(app);

logger.info('🌐 Express app and HTTP server created');

// Trust proxy for Railway deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  logger.info('✅ Trust proxy enabled for production');
}

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5000 : 10000, // 5000 for production, 10000 for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for specific routes that need high frequency access
  skip: (req) => {
    // Skip rate limiting for socket.io related endpoints during development
    if (process.env.NODE_ENV !== 'production') {
      return req.path.includes('/socket.io/');
    }
    return false;
  }
});

app.use(limiter);

// CORS configuration - Secure implementation
const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, use environment variables for security
    const corsOrigin = process.env.CORS_ORIGIN;
    
    if (!corsOrigin) {
      logger.error('❌ CORS_ORIGIN not specified for production - blocking all origins');
      return [];
    }
    
    if (corsOrigin === "*") {
      // Only allow wildcard if explicitly set (not recommended for production)
      logger.warn('⚠️ CORS_ORIGIN is set to "*" - this is not secure for production');
      return "*";
    }
    
    // Split comma-separated origins and validate they're HTTPS
    const origins = corsOrigin.split(',').map(origin => origin.trim());
    const validOrigins = origins.filter(origin => {
      if (!origin.startsWith('https://') && !origin.startsWith('http://localhost')) {
        logger.error(`❌ Invalid origin in production: ${origin} - must use HTTPS or localhost`);
        return false;
      }
      return true;
    });
    
    logger.info(`✅ Production CORS origins: ${validOrigins.join(', ')}`);
    return validOrigins;
  }
  
  // Development origins
  return ["http://localhost:3000", "http://localhost:3001"];
};

const allowedOrigins = getAllowedOrigins();
logger.info(`🛡️ CORS Origins determined: ${Array.isArray(allowedOrigins) ? allowedOrigins.join(', ') : allowedOrigins}`);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
logger.info('✅ Express CORS middleware configured');

// Initialize Socket.io with secure CORS configuration (after CORS setup)
logger.info('🔌 Initializing Socket.IO server...');
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"]
  },
  allowEIO3: true, // Allow Engine.IO v3 clients
  transports: ['polling', 'websocket']
});
logger.info('✅ Socket.IO server initialized');

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'Durusuna API Documentation',
  customfavIcon: '/favicon.ico',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true
  }
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/class-updates', classUpdatesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/class-offerings', classOfferingRoutes);
app.use('/api/academic', academicRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current health status of the API
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
// Health check endpoint
app.get('/health', (req, res) => {
  const websocketStatus = getWebsocketStatus();
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      websocket: {
        status: websocketStatus.status,
        healthy: websocketStatus.healthy,
        connectedUsers: websocketStatus.connectedUsers,
        activeConversations: websocketStatus.activeConversations,
        message: websocketStatus.message
      }
    }
  });
});

// Make io available globally for routes BEFORE initializing handlers
declare global {
  var io: Server;
}
global.io = io;

// Socket.io handlers
socketHandler(io);

// Phase 1: In-process notification outbox processor to allow Socket channel access to io
const startOutboxProcessor = () => {
  const outboxRepo = new NotificationOutboxRepository(db);
  const deliveryRepo = new NotificationDeliveryRepository(db);
  const notificationRepo = new NotificationRepository(db);
  const providers = [
    new SocketChannelProvider(), 
    new EmailChannelProvider(db),
    new FirebaseChannelProvider(db)
  ];
  const dispatcher = new NotificationDispatcher(outboxRepo, deliveryRepo, providers);

  let tablesReady = false;

  const checkTables = async () => {
    try {
      // Use to_regclass to avoid raising an error when relation doesn't exist
      const result = await db.raw(
        "SELECT to_regclass('public.notification_outbox') AS outbox, to_regclass('public.notification_deliveries') AS deliveries"
      );
      const row = (result as any)?.rows?.[0];
      const ready = !!row?.outbox && !!row?.deliveries;
      if (ready && !tablesReady) {
        tablesReady = true;
        logger.info('📋 Notification tables ready');
      }
      return ready;
    } catch (e) {
      return false;
    }
  };

  const runOnce = async () => {
    try {
      // Check if tables are ready first
      if (!tablesReady) {
        const ready = await checkTables();
        if (!ready) {
          // Tables not ready yet, skip this run
          logger.debug('⏳ Notification outbox tables not ready yet, waiting...');
          return;
        }
      }

      const batch = await outboxRepo.leaseNextBatch(50);
      logger.debug(`🔄 Outbox processor: Found ${batch.length} jobs to process`);
      
      for (const job of batch) {
        try {
          const raw = await db('notifications').where('id', job.notification_id).first();
          if (!raw) {
            await outboxRepo.markSent(job.id);
            continue;
          }
          const notification = (notificationRepo as any).parseNotification
            ? (notificationRepo as any).parseNotification(raw)
            : raw;
          await dispatcher.process(job.id, {
            notification,
            userId: job.user_id,
            channels: job.channels as any,
          });
        } catch (err) {
          logger.error('Outbox processor job error', err);
          await outboxRepo.rescheduleFailure(job.id, (err as any)?.message || String(err), 60000, job.attempts);
        }
      }
    } catch (e) {
      // If this is a "relation does not exist" error, it's expected during startup
      if (e && typeof e === 'object' && 'code' in e && e.code === '42P01') {
        // Table doesn't exist yet, reset flag and wait
        tablesReady = false;
        return;
      }
      logger.error('Outbox processor loop error', e);
    }
  };

  // Delay worker startup to avoid racing migrations on Railway when DB_RESET_MODE=true
  const startupDelayMs = process.env.NOTIF_OUTBOX_STARTUP_DELAY_MS
    ? parseInt(process.env.NOTIF_OUTBOX_STARTUP_DELAY_MS, 10)
    : (process.env.DB_RESET_MODE === 'true' ? 10000 : 0);

  setTimeout(() => {
    setInterval(runOnce, 2000);
    logger.info(`🧵 Notification outbox processor started after ${startupDelayMs}ms`);
  }, startupDelayMs);
};

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found on this server.'
  });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    db.destroy();
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Function to run database seeding
async function runSeedingIfRequested() {
  if (process.env.RUN_SEED_ON_START === 'true') {
    try {
      logger.info('🌱 Running database seeds as requested...');
      const seedFiles = await db.seed.run();
      logger.info(`✅ Successfully ran ${seedFiles[0].length} seed files`);
      seedFiles[0].forEach(file => logger.info(`  - ${file}`));
      logger.info('🎉 Seeding completed! Container will exit.');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  }
}

const PORT = process.env.PORT || 3001;

// Initialize Firebase before starting the server
async function initializeFirebase() {
  try {
    logger.info('🔥 Initializing Firebase...');
    const firebaseManager = FirebaseManager.getInstance();
    const initialized = await firebaseManager.initialize();
    
    if (initialized) {
      logger.info('🔥 Firebase initialized successfully');
    } else {
      logger.warn('🔥 Firebase initialization skipped (configuration missing or module unavailable)');
    }
  } catch (error) {
    logger.error('🔥 Firebase initialization failed:', error);
    // Don't fail server startup if Firebase fails
  }
}

// Check if we should run seeding before starting the server
runSeedingIfRequested().then(async () => {
  // Initialize Firebase before starting notification system
  await initializeFirebase();
  
  logger.info('🎯 About to start server listening...');
  server.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    logger.info(`🌐 Public URL: https://durusuna-backend-production.up.railway.app`);
    logger.info(`🔗 Socket.IO endpoint: wss://durusuna-backend-production.up.railway.app/socket.io/`);
    
    // Log CORS status
    logger.info(`🛡️ CORS Origins: ${Array.isArray(allowedOrigins) ? allowedOrigins.join(', ') : allowedOrigins}`);
    
    // Start outbox processor and log websocket service status
    startOutboxProcessor();
    setTimeout(() => {
      logger.info('🔌 Initializing WebSocket status check...');
      logWebsocketStatus();
    }, 100); // Small delay to ensure socket.io is fully initialized
  });
}).catch(error => {
  logger.error('❌ Failed to start server:', error);
  process.exit(1);
}); 