import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

// Store connected users and their socket IDs
const connectedUsers = new Map(); // userId -> { socketId, isOnline, lastSeen }
const conversationRooms = new Map(); // conversationId -> Set of userIds

const socketAuth = (socket, next) => {
  try {
    logger.info('🔐 Socket authentication attempt', {
      'auth': socket.handshake.auth,
      'headers': socket.handshake.headers,
      'query': socket.handshake.query
    });

    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization?.replace('Bearer ', '') ||
                  socket.handshake.query.token;
    
    logger.info('🔐 Extracted token:', { 
      tokenExists: !!token, 
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 10) + '...' : 'null'
    });
    
    if (!token) {
      logger.error('🚫 No token provided for socket connection');
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    
    logger.info('✅ Socket authentication successful', {
      userId: decoded.id,
      userRole: decoded.role
    });
    
    next();
  } catch (error) {
    logger.error('❌ Socket authentication failed:', {
      error: error.message,
      tokenProvided: !!(socket.handshake.auth.token || socket.handshake.headers.authorization)
    });
    next(new Error('Authentication error: Invalid token'));
  }
};

const handleConnection = (socket) => {
  const userId = socket.userId;
  logger.info(`✅ User ${userId} connected to socket successfully`, {
    socketId: socket.id,
    userId: userId,
    userRole: socket.userRole
  });

  // Store user connection
  connectedUsers.set(userId, {
    socketId: socket.id,
    isOnline: true,
    lastSeen: new Date(),
  });

  // Join user to their personal room
  socket.join(`user_${userId}`);
  logger.info(`🏠 User ${userId} joined personal room: user_${userId}`);

  // Broadcast user is online
  const presenceData = {
    userId: userId,
    isOnline: true,
    timestamp: new Date().toISOString(),
  };
  
  socket.broadcast.emit('presence:online', presenceData);
  logger.info(`📡 Broadcasted online presence for user ${userId}`, presenceData);

  // === CONVERSATION MANAGEMENT ===
  
  // Join conversation room
  socket.on('conversation:join', (data) => {
    const { conversationId } = data;
    socket.join(`conversation_${conversationId}`);
    
    // Track conversation membership
    if (!conversationRooms.has(conversationId)) {
      conversationRooms.set(conversationId, new Set());
    }
    conversationRooms.get(conversationId).add(userId);
    
    logger.info(`User ${userId} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('conversation:leave', (data) => {
    const { conversationId } = data;
    socket.leave(`conversation_${conversationId}`);
    
    // Remove from conversation tracking
    if (conversationRooms.has(conversationId)) {
      conversationRooms.get(conversationId).delete(userId);
      if (conversationRooms.get(conversationId).size === 0) {
        conversationRooms.delete(conversationId);
      }
    }
    
    logger.info(`User ${userId} left conversation ${conversationId}`);
  });

  // === TYPING INDICATORS ===
  
  socket.on('typing:start', (data) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('typing:start', {
      userId: userId,
      conversationId: conversationId,
      isTyping: true,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('typing:stop', (data) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('typing:stop', {
      userId: userId,
      conversationId: conversationId,
      isTyping: false,
      timestamp: new Date().toISOString(),
    });
  });

  // === MESSAGE STATUS ===
  
  socket.on('message:delivered', (data) => {
    const { messageIds, deliveredAt } = data;
    // Broadcast to conversation participants
    messageIds.forEach(messageId => {
      socket.broadcast.emit('message:delivered', {
        messageIds: [messageId],
        status: 'delivered',
        userId: userId,
        timestamp: deliveredAt || new Date().toISOString(),
      });
    });
  });

  socket.on('message:read', (data) => {
    const { messageIds, conversationId, readAt } = data;
    // Broadcast to conversation participants
    socket.to(`conversation_${conversationId}`).emit('message:read', {
      messageIds: messageIds,
      status: 'read',
      userId: userId,
      conversationId: conversationId,
      timestamp: readAt || new Date().toISOString(),
    });
  });

  // === USER PRESENCE ===
  
  socket.on('user:online', () => {
    connectedUsers.set(userId, {
      socketId: socket.id,
      isOnline: true,
      lastSeen: new Date(),
    });
    
    socket.broadcast.emit('presence:online', {
      userId: userId,
      isOnline: true,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('user:offline', () => {
    const userData = connectedUsers.get(userId);
    if (userData) {
      userData.isOnline = false;
      userData.lastSeen = new Date();
      connectedUsers.set(userId, userData);
    }
    
    socket.broadcast.emit('presence:offline', {
      userId: userId,
      isOnline: false,
      timestamp: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    });
  });

  // === REACTIONS ===
  
  socket.on('reaction:add', (data) => {
    const { messageId, emoji } = data;
    socket.broadcast.emit('reaction:added', {
      messageId: messageId,
      emoji: emoji,
      userId: userId,
      action: 'added',
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('reaction:remove', (data) => {
    const { messageId, emoji } = data;
    socket.broadcast.emit('reaction:removed', {
      messageId: messageId,
      emoji: emoji,
      userId: userId,
      action: 'removed',
      timestamp: new Date().toISOString(),
    });
  });

  // === VOICE RECORDING ===
  
  socket.on('voice:start', (data) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('voice:recording', {
      userId: userId,
      conversationId: conversationId,
      isRecording: true,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('voice:stop', (data) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('voice:stopped', {
      userId: userId,
      conversationId: conversationId,
      isRecording: false,
      timestamp: new Date().toISOString(),
    });
  });

  // === LAST SEEN ===
  
  socket.on('user:lastseen', (data) => {
    const { conversationId } = data;
    const userData = connectedUsers.get(userId);
    if (userData) {
      userData.lastSeen = new Date();
      connectedUsers.set(userId, userData);
    }
    
    socket.to(`conversation_${conversationId}`).emit('user:lastseen', {
      userId: userId,
      conversationId: conversationId,
      timestamp: new Date().toISOString(),
    });
  });

  // === FILE UPLOAD ===
  
  socket.on('upload:progress', (data) => {
    const { uploadId, progress } = data;
    socket.emit('upload:progress', {
      uploadId: uploadId,
      progress: progress,
      status: 'progress',
    });
  });

  // === DISCONNECT HANDLER ===
  
  socket.on('disconnect', (reason) => {
    logger.info(`❌ User ${userId} disconnected`, {
      userId: userId,
      socketId: socket.id,
      reason: reason,
      timestamp: new Date().toISOString()
    });
    
    // Update user status
    const userData = connectedUsers.get(userId);
    if (userData) {
      userData.isOnline = false;
      userData.lastSeen = new Date();
      connectedUsers.set(userId, userData);
    }
    
    // Broadcast user offline
    const offlineData = {
      userId: userId,
      isOnline: false,
      timestamp: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };
    
    socket.broadcast.emit('presence:offline', offlineData);
    logger.info(`📡 Broadcasted offline presence for user ${userId}`, offlineData);
    
    // Clean up conversation rooms
    let cleanedRooms = 0;
    conversationRooms.forEach((users, conversationId) => {
      if (users.has(userId)) {
        users.delete(userId);
        cleanedRooms++;
        if (users.size === 0) {
          conversationRooms.delete(conversationId);
          logger.info(`🧹 Cleaned up empty conversation room: ${conversationId}`);
        }
      }
    });
    
    if (cleanedRooms > 0) {
      logger.info(`🧹 User ${userId} removed from ${cleanedRooms} conversation rooms`);
    }
  });
};

// === UTILITY FUNCTIONS FOR EMITTING EVENTS ===

const emitToConversation = (io, conversationId, event, data) => {
  io.to(`conversation_${conversationId}`).emit(event, data);
};

const emitToUser = (io, userId, event, data) => {
  io.to(`user_${userId}`).emit(event, data);
};

const emitNewMessage = (io, message, conversationId) => {
  emitToConversation(io, conversationId, 'message:new', {
    message: message,
    action: 'created',
    conversationId: conversationId,
  });
};

const emitConversationCreated = (io, conversation, participantIds) => {
  participantIds.forEach(userId => {
    emitToUser(io, userId, 'conversation:created', {
      conversationId: conversation.id,
      action: 'created',
      data: conversation,
      timestamp: new Date().toISOString(),
    });
  });
};

const emitMessageUpdated = (io, message, conversationId) => {
  emitToConversation(io, conversationId, 'message:updated', {
    message: message,
    action: 'updated',
    conversationId: conversationId,
  });
};

const emitMessageDeleted = (io, messageId, conversationId) => {
  emitToConversation(io, conversationId, 'message:deleted', {
    message: { id: messageId, is_deleted: true },
    action: 'deleted',
    conversationId: conversationId,
  });
};

const getConnectedUsers = () => {
  return Array.from(connectedUsers.entries()).map(([userId, data]) => ({
    userId,
    ...data,
  }));
};

const isUserOnline = (userId) => {
  const userData = connectedUsers.get(userId);
  return userData ? userData.isOnline : false;
};

// Global socket instance
let globalIo: any = null;

// Export getter for global io instance
export const getSocketInstance = () => {
  if (!globalIo) {
    throw new Error('Socket.io instance not initialized. Call initializeSocket first.');
  }
  return globalIo;
};

const initializeSocket = (io) => {
  // Log all connection attempts
  io.engine.on("connection_error", (err) => {
    logger.error('❌ Socket.io connection error:', {
      error: err.message,
      code: err.code,
      context: err.context,
      type: err.type
    });
  });

  // Apply authentication middleware
  io.use(socketAuth);

  // Handle connections
  io.on('connection', handleConnection);

  // Log when socket.io server is ready
  logger.info('🔌 Socket.io server initialized and ready for connections');

  // Attach utility functions to io for use in routes
  io.emitToConversation = emitToConversation.bind(null, io);
  io.emitToUser = emitToUser.bind(null, io);
  io.emitNewMessage = emitNewMessage.bind(null, io);
  io.emitConversationCreated = emitConversationCreated.bind(null, io);
  io.emitMessageUpdated = emitMessageUpdated.bind(null, io);
  io.emitMessageDeleted = emitMessageDeleted.bind(null, io);
  io.getConnectedUsers = getConnectedUsers;
  io.isUserOnline = isUserOnline;

  // Store global reference
  globalIo = io;

  return io;
};

export default initializeSocket; 