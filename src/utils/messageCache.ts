/**
 * Simple in-memory cache for recent conversations and messages
 * This improves performance for frequently accessed conversations
 */

interface CachedConversationData {
  data: ConversationData;
  timestamp: number;
}

interface CachedMessages {
  messages: MessageData[];
  timestamp: number;
}

interface CachedUserConversations {
  conversations: ConversationData[];
  timestamp: number;
}

interface ConversationData {
  id: string;
  name?: string;
  is_group: boolean;
  created_by: string;
  created_at: Date;
  updated_at?: Date;
  participants?: ParticipantData[];
  last_message?: MessageData;
  unread_count?: number;
}

interface MessageData {
  id: string;
  conversation_id: string;
  sender_id: string;
  content?: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'emoji';
  reply_to_id?: string;
  attachments?: AttachmentData[];
  metadata?: Record<string, any>;
  sent_at: Date;
  edited_at?: Date;
  deleted_at?: Date;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface ParticipantData {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: Date;
  left_at?: Date;
  role: 'member' | 'admin';
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface AttachmentData {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  key: string;
  fileType: 'image' | 'video' | 'audio' | 'document' | 'other';
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
  isDocument: boolean;
  sizeFormatted: string;
  uploadedBy: string;
  uploadedAt: string;
  metadata?: Record<string, any>;
}

interface CacheStats {
  conversations: number;
  recentMessages: number;
  userConversations: number;
  memoryUsageApprox: number;
}

class MessageCache {
  private conversations: Map<string, CachedConversationData> = new Map();
  private recentMessages: Map<string, CachedMessages> = new Map();
  private userConversations: Map<string, CachedUserConversations> = new Map();
  private readonly maxConversations: number = 100;
  private readonly maxMessagesPerConversation: number = 50;
  private readonly ttl: number = 5 * 60 * 1000; // 5 minutes TTL

  /**
   * Get cached conversation data
   */
  getConversation(conversationId: string): ConversationData | null {
    const cached = this.conversations.get(conversationId);
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.conversations.delete(conversationId);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Cache conversation data
   */
  setConversation(conversationId: string, conversationData: ConversationData): void {
    // Remove oldest if at capacity
    if (this.conversations.size >= this.maxConversations) {
      const oldestKey = this.conversations.keys().next().value;
      if (oldestKey) {
        this.conversations.delete(oldestKey);
      }
    }
    
    this.conversations.set(conversationId, {
      data: conversationData,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached recent messages for a conversation
   */
  getRecentMessages(conversationId: string): MessageData[] | null {
    const cached = this.recentMessages.get(conversationId);
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.recentMessages.delete(conversationId);
      return null;
    }
    
    return cached.messages;
  }

  /**
   * Cache recent messages for a conversation
   */
  setRecentMessages(conversationId: string, messages: MessageData[]): void {
    // Limit messages to prevent memory bloat
    const limitedMessages = messages.slice(0, this.maxMessagesPerConversation);
    
    this.recentMessages.set(conversationId, {
      messages: limitedMessages,
      timestamp: Date.now()
    });
  }

  /**
   * Add a new message to cached conversation
   */
  addMessage(conversationId: string, message: MessageData): void {
    const cached = this.recentMessages.get(conversationId);
    if (!cached) return;
    
    // Add message to the beginning (newest first)
    cached.messages.unshift(message);
    
    // Keep only the most recent messages
    if (cached.messages.length > this.maxMessagesPerConversation) {
      cached.messages = cached.messages.slice(0, this.maxMessagesPerConversation);
    }
    
    // Update timestamp
    cached.timestamp = Date.now();
  }

  /**
   * Remove a message from cached conversation
   */
  removeMessage(conversationId: string, messageId: string): void {
    const cached = this.recentMessages.get(conversationId);
    if (!cached) return;
    
    // Remove message from cached messages
    cached.messages = cached.messages.filter(msg => msg.id !== messageId);
    
    // Update timestamp
    cached.timestamp = Date.now();
  }

  /**
   * Get cached conversation list for a user
   */
  getUserConversations(userId: string): ConversationData[] | null {
    const cached = this.userConversations.get(userId);
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.userConversations.delete(userId);
      return null;
    }
    
    return cached.conversations;
  }

  /**
   * Cache conversation list for a user
   */
  setUserConversations(userId: string, conversations: ConversationData[]): void {
    this.userConversations.set(userId, {
      conversations,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache for a conversation
   */
  invalidateConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
    this.recentMessages.delete(conversationId);
    
    // Also invalidate user conversation lists that might contain this conversation
    for (const [userId, cached] of this.userConversations.entries()) {
      if (cached.conversations.some(c => c.id === conversationId)) {
        this.userConversations.delete(userId);
      }
    }
  }

  /**
   * Invalidate cache for a user
   */
  invalidateUser(userId: string): void {
    this.userConversations.delete(userId);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.conversations.clear();
    this.recentMessages.clear();
    this.userConversations.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      conversations: this.conversations.size,
      recentMessages: this.recentMessages.size,
      userConversations: this.userConversations.size,
      memoryUsageApprox: (this.conversations.size + this.recentMessages.size + this.userConversations.size) * 1024 // rough estimate
    };
  }
}

// Create a singleton instance
const messageCache = new MessageCache();

export default messageCache;
export { MessageCache, type ConversationData, type MessageData, type ParticipantData, type AttachmentData, type CacheStats }; 