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
import db from './config/database';
import logger from './utils/logger';
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
import socketHandler, { getWebsocketStatus, logWebsocketStatus } from './services/socketService';

// Create Express app
const app = express();
const server = http.createServer(app);

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

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Initialize Socket.io with secure CORS configuration (after CORS setup)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"]
  },
  allowEIO3: true, // Allow Engine.IO v3 clients
  transports: ['polling', 'websocket']
});

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Socket.io handlers
socketHandler(io);

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

// Check if we should run seeding before starting the server
runSeedingIfRequested().then(() => {
  server.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    logger.info(`📱 Android emulator: http://10.0.2.2:${PORT}`);
    logger.info(`🍎 iOS simulator: http://localhost:${PORT}`);
    logger.info(`📱 Physical devices: http://192.168.1.7:${PORT}`);
    logger.info(`💡 Find your local IP: ifconfig en0 | grep "inet " | awk '{print $2}'`);
    
    // Log websocket service status
    setTimeout(() => {
      logWebsocketStatus();
    }, 100); // Small delay to ensure socket.io is fully initialized
  });
});

// Make io available globally for routes
declare global {
  var io: Server;
}
global.io = io; 