/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.all([
    // Optimized indexes for message queries
    knex.schema.alterTable('messages', function(table) {
      // Composite index for conversation pagination (most important)
      table.index(['conversation_id', 'created_at', 'id'], 'idx_messages_conversation_created_id');
      
      // Index for conversation + sender queries
      table.index(['conversation_id', 'sender_id', 'created_at'], 'idx_messages_conversation_sender_created');
      
      // Index for unread messages per conversation
      table.index(['conversation_id', 'is_read', 'created_at'], 'idx_messages_conversation_read_created');
      
      // Index for deleted messages filtering
      table.index(['conversation_id', 'is_deleted', 'created_at'], 'idx_messages_conversation_deleted_created');
      
      // Index for message search by content
      table.index(['conversation_id', 'content'], 'idx_messages_conversation_content');
    }),
    
    // Optimized indexes for conversation participants
    knex.schema.alterTable('conversation_participants', function(table) {
      // Index for user's active conversations
      table.index(['user_id', 'is_active', 'unread_count'], 'idx_participants_user_active_unread');
      
      // Index for conversation's active participants
      table.index(['conversation_id', 'is_active', 'user_id'], 'idx_participants_conversation_active_user');
    }),
    
    // Optimized indexes for conversations
    knex.schema.alterTable('conversations', function(table) {
      // Index for active conversations ordered by last message
      table.index(['is_active', 'last_message_at', 'id'], 'idx_conversations_active_last_message');
      
      // Index for conversation type filtering
      table.index(['type', 'is_active', 'last_message_at'], 'idx_conversations_type_active_last');
    })
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return Promise.all([
    knex.schema.alterTable('messages', function(table) {
      table.dropIndex([], 'idx_messages_conversation_created_id');
      table.dropIndex([], 'idx_messages_conversation_sender_created');
      table.dropIndex([], 'idx_messages_conversation_read_created');
      table.dropIndex([], 'idx_messages_conversation_deleted_created');
      table.dropIndex([], 'idx_messages_conversation_content');
    }),
    
    knex.schema.alterTable('conversation_participants', function(table) {
      table.dropIndex([], 'idx_participants_user_active_unread');
      table.dropIndex([], 'idx_participants_conversation_active_user');
    }),
    
    knex.schema.alterTable('conversations', function(table) {
      table.dropIndex([], 'idx_conversations_active_last_message');
      table.dropIndex([], 'idx_conversations_type_active_last');
    })
  ]);
}; 