/**
 * Simple in-memory cache for recent conversations and messages
 * This improves performance for frequently accessed conversations
 */

class MessageCache {
  constructor() {
    this.conversations = new Map(); // conversationId -> conversation data
    this.recentMessages = new Map(); // conversationId -> array of recent messages
    this.userConversations = new Map(); // userId -> array of conversation IDs
    this.maxConversations = 100; // Max conversations to cache
    this.maxMessagesPerConversation = 50; // Max messages per conversation
    this.ttl = 5 * 60 * 1000; // 5 minutes TTL
  }

  /**
   * Get cached conversation data
   */
  getConversation(conversationId) {
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
  setConversation(conversationId, conversationData) {
    // Remove oldest if at capacity
    if (this.conversations.size >= this.maxConversations) {
      const oldestKey = this.conversations.keys().next().value;
      this.conversations.delete(oldestKey);
    }
    
    this.conversations.set(conversationId, {
      data: conversationData,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached recent messages for a conversation
   */
  getRecentMessages(conversationId) {
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
  setRecentMessages(conversationId, messages) {
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
  addMessage(conversationId, message) {
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
   * Get cached conversation list for a user
   */
  getUserConversations(userId) {
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
  setUserConversations(userId, conversations) {
    this.userConversations.set(userId, {
      conversations,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache for a conversation
   */
  invalidateConversation(conversationId) {
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
  invalidateUser(userId) {
    this.userConversations.delete(userId);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.conversations.clear();
    this.recentMessages.clear();
    this.userConversations.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
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

module.exports = messageCache; 