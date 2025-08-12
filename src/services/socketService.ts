import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';

// Types for socket events
interface SocketUser extends Socket {
  userId: string;
  userRole: string;
}

interface ConversationJoinData {
  conversationId: string;
}

interface TypingData {
  conversationId: string;
}

interface MessageStatusData {
  messageIds: string[];
  deliveredAt?: string;
  conversationId?: string;
  readAt?: string;
}

interface ReactionData {
  messageId: string;
  emoji: string;
}

interface VoiceData {
  conversationId: string;
}

interface LastSeenData {
  conversationId: string;
}

interface UploadProgressData {
  uploadId: string;
  progress: number;
}

// Store connected users and their socket IDs
const connectedUsers = new Map<string, { socketId: string; isOnline: boolean; lastSeen: Date }>(); 
const conversationRooms = new Map<string, Set<string>>(); // conversationId -> Set of userIds

// Global socket instance
let globalIo: Server | null = null;

const socketAuth = (socket: Socket, next: (err?: Error) => void) => {
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

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('🚫 JWT_SECRET not configured');
      return next(new Error('Authentication error: Server configuration error'));
    }

    const decoded = jwt.verify(token, jwtSecret) as { id: string; role: string };
    (socket as SocketUser).userId = decoded.id;
    (socket as SocketUser).userRole = decoded.role;
    
    logger.info('✅ Socket authentication successful', {
      userId: decoded.id,
      userRole: decoded.role
    });
    
    next();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('❌ Socket authentication failed:', {
      error: errorMessage,
      tokenProvided: !!(socket.handshake.auth.token || socket.handshake.headers.authorization)
    });
    next(new Error('Authentication error: Invalid token'));
  }
};

const handleConnection = (socket: Socket) => {
  const socketUser = socket as SocketUser;
  const userId = socketUser.userId;
  logger.info(`✅ User ${userId} connected to socket successfully`, {
    socketId: socket.id,
    userId: userId,
    userRole: socketUser.userRole
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
  socket.on('conversation:join', (data: ConversationJoinData) => {
    const { conversationId } = data;
    socket.join(`conversation_${conversationId}`);
    
    // Track conversation membership
    if (!conversationRooms.has(conversationId)) {
      conversationRooms.set(conversationId, new Set());
    }
    conversationRooms.get(conversationId)!.add(userId);
    
    logger.info(`User ${userId} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('conversation:leave', (data: ConversationJoinData) => {
    const { conversationId } = data;
    socket.leave(`conversation_${conversationId}`);
    
    // Remove from conversation tracking
    if (conversationRooms.has(conversationId)) {
      conversationRooms.get(conversationId)!.delete(userId);
      if (conversationRooms.get(conversationId)!.size === 0) {
        conversationRooms.delete(conversationId);
      }
    }
    
    logger.info(`User ${userId} left conversation ${conversationId}`);
  });

  // === TYPING INDICATORS ===
  
  socket.on('typing:start', (data: TypingData) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('typing:start', {
      userId: userId,
      conversationId: conversationId,
      isTyping: true,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('typing:stop', (data: TypingData) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('typing:stop', {
      userId: userId,
      conversationId: conversationId,
      isTyping: false,
      timestamp: new Date().toISOString(),
    });
  });

  // === MESSAGE STATUS ===
  
  socket.on('message:delivered', (data: MessageStatusData) => {
    const { messageIds, deliveredAt } = data;
    // Broadcast to conversation participants
    messageIds.forEach((messageId: string) => {
      socket.broadcast.emit('message:delivered', {
        messageIds: [messageId],
        status: 'delivered',
        userId: userId,
        timestamp: deliveredAt || new Date().toISOString(),
      });
    });
  });

  socket.on('message:read', (data: MessageStatusData) => {
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

  // === NOTIFICATIONS ===
  socket.on('notification:ack', (data: { notificationId: string }) => {
    const notificationId = data?.notificationId;
    try {
      // Defer DB write to repository from route layer to keep service decoupled.
      // For Phase 1, do a lightweight emit back confirming ack.
      socket.emit('notification:acknowledged', {
        notificationId,
        userId: userId,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      // swallow errors
    }
  });

  // Presence snapshot query: allow clients to request current presence state of another user
  socket.on('presence:query', (data: { userId: string }) => {
    try {
      const targetUserId = data?.userId;
      if (!targetUserId) {
        return;
      }

      const target = connectedUsers.get(targetUserId);
      const snapshot = {
        userId: targetUserId,
        isOnline: target ? target.isOnline : false,
        timestamp: new Date().toISOString(),
        lastSeen: target?.lastSeen ? target.lastSeen.toISOString() : undefined,
      };

      // Emit only to the requester
      socket.emit('presence:snapshot', snapshot);
      logger.info(`📦 Sent presence snapshot for ${targetUserId} to ${userId}`, snapshot);
    } catch (err) {
      logger.error('❌ Failed to handle presence:query', { error: (err as Error).message });
    }
  });

  // === REACTIONS ===
  
  socket.on('reaction:add', (data: ReactionData) => {
    const { messageId, emoji } = data;
    socket.broadcast.emit('reaction:added', {
      messageId: messageId,
      emoji: emoji,
      userId: userId,
      action: 'added',
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('reaction:remove', (data: ReactionData) => {
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
  
  socket.on('voice:start', (data: VoiceData) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('voice:recording', {
      userId: userId,
      conversationId: conversationId,
      isRecording: true,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('voice:stop', (data: VoiceData) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('voice:stopped', {
      userId: userId,
      conversationId: conversationId,
      isRecording: false,
      timestamp: new Date().toISOString(),
    });
  });

  // === LAST SEEN ===
  
  socket.on('user:lastseen', (data: LastSeenData) => {
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
  
  socket.on('upload:progress', (data: UploadProgressData) => {
    const { uploadId, progress } = data;
    socket.emit('upload:progress', {
      uploadId: uploadId,
      progress: progress,
      status: 'progress',
    });
  });

  // === DISCONNECT HANDLER ===
  
  socket.on('disconnect', (reason: string) => {
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

const emitToConversation = (io: Server, conversationId: string, event: string, data: any) => {
  io.to(`conversation_${conversationId}`).emit(event, data);
};

const emitToUser = (io: Server, userId: string, event: string, data: any) => {
  io.to(`user_${userId}`).emit(event, data);
};

const emitNewMessage = (io: Server, message: any, conversationId: string) => {
  emitToConversation(io, conversationId, 'message:new', {
    message: message,
    action: 'created',
    conversationId: conversationId,
  });
};

const emitConversationCreated = (io: Server, conversation: any, participantIds: string[]) => {
  participantIds.forEach((userId: string) => {
    emitToUser(io, userId, 'conversation:created', {
      conversationId: conversation.id,
      action: 'created',
      data: conversation,
      timestamp: new Date().toISOString(),
    });
  });
};

const emitMessageUpdated = (io: Server, message: any, conversationId: string) => {
  emitToConversation(io, conversationId, 'message:updated', {
    message: message,
    action: 'updated',
    conversationId: conversationId,
  });
};

const emitMessageDeleted = (io: Server, messageId: string, conversationId: string) => {
  emitToConversation(io, conversationId, 'message:deleted', {
    message: { id: messageId, is_deleted: true },
    action: 'deleted',
    conversationId: conversationId,
  });
};

const emitBatchMessagesDeleted = (io: Server, messageIds: string[]) => {
  // For batch delete, we emit to all users since we don't have conversation IDs readily available
  // In a production app, you'd want to optimize this by getting conversation IDs
  io.emit('messages:batch_deleted', {
    messageIds: messageIds,
    action: 'batch_deleted',
    timestamp: new Date().toISOString(),
  });
};

const emitMessageReactionUpdated = (io: Server, conversationId: string, messageId: string, reactions: any) => {
  emitToConversation(io, conversationId, 'message:reaction_updated', {
    messageId: messageId,
    reactions: reactions,
    action: 'reaction_updated',
    conversationId: conversationId,
    timestamp: new Date().toISOString(),
  });
};

const getConnectedUsers = () => {
  return Array.from(connectedUsers.entries()).map(([userId, data]) => ({
    userId,
    ...data,
  }));
};

const isUserOnline = (userId: string) => {
  const userData = connectedUsers.get(userId);
  return userData ? userData.isOnline : false;
};

// === WEBSOCKET SERVICE STATUS FUNCTIONS ===

/**
 * Check if the websocket service is running and healthy
 */
export const getWebsocketStatus = () => {
  try {
    if (!globalIo) {
      return {
        status: 'offline',
        healthy: false,
        message: 'Socket.io instance not initialized',
        connectedUsers: 0,
        activeConversations: 0
      };
    }

    const connectedCount = connectedUsers.size;
    const activeConversations = conversationRooms.size;
    
    return {
      status: 'online',
      healthy: true,
      message: 'Socket.io service is running',
      connectedUsers: connectedCount,
      activeConversations: activeConversations,
      transport: (globalIo as any).engine?.transports || ['polling', 'websocket']
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      status: 'error',
      healthy: false,
      message: `Socket.io service error: ${errorMessage}`,
      connectedUsers: 0,
      activeConversations: 0
    };
  }
};

/**
 * Log websocket service status during startup
 */
export const logWebsocketStatus = () => {
  const status = getWebsocketStatus();
  
  if (status.healthy) {
    logger.info('✅ Websocket service is healthy', {
      status: status.status,
      connectedUsers: status.connectedUsers,
      activeConversations: status.activeConversations,
      transports: status.transport
    });
  } else {
    logger.error('❌ Websocket service is not healthy', {
      status: status.status,
      message: status.message
    });
  }
  
  return status;
};

// Export getter for global io instance
export const getSocketInstance = (): Server => {
  if (!globalIo) {
    throw new Error('Socket.io instance not initialized. Call initializeSocket first.');
  }
  return globalIo;
};

const initializeSocket = (io: Server) => {
  // Log all connection attempts
  io.engine.on("connection_error", (err: any) => {
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
  (io as any).emitToConversation = emitToConversation.bind(null, io);
  (io as any).emitToUser = emitToUser.bind(null, io);
  (io as any).emitNewMessage = emitNewMessage.bind(null, io);
  (io as any).emitConversationCreated = emitConversationCreated.bind(null, io);
  (io as any).emitMessageUpdated = emitMessageUpdated.bind(null, io);
  (io as any).emitMessageDeleted = emitMessageDeleted.bind(null, io);
  (io as any).emitBatchMessagesDeleted = emitBatchMessagesDeleted.bind(null, io);
  (io as any).emitMessageReactionUpdated = emitMessageReactionUpdated.bind(null, io);
  (io as any).getConnectedUsers = getConnectedUsers;
  (io as any).isUserOnline = isUserOnline;

  // Store global reference
  globalIo = io;

  return io;
};

export default initializeSocket; 