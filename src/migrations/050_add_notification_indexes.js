/**
 * Add indexed columns for common notification filtering scenarios
 * This improves query performance while keeping action_data for complex context
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('notifications', function(table) {
    // Add indexed columns for common filtering scenarios
    table.uuid('class_id').references('id').inTable('classes').onDelete('CASCADE').index();
    table.uuid('update_id').references('id').inTable('class_updates').onDelete('CASCADE').index();
    table.uuid('assignment_id').index(); // No FK constraint as assignments table structure varies
    table.uuid('conversation_id').index(); // No FK constraint as conversations table structure varies
    table.uuid('message_id').index(); // No FK constraint as messages table structure varies
    
    // Composite indexes for common query patterns
    table.index(['user_id', 'class_id'], 'idx_notifications_user_class');
    table.index(['class_id', 'notification_type'], 'idx_notifications_class_type');
    table.index(['class_id', 'is_read'], 'idx_notifications_class_read');
    
    // Index for recent notifications per class
    table.index(['class_id', 'created_at'], 'idx_notifications_class_recent');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('notifications', function(table) {
    // Drop indexes first
    table.dropIndex(['class_id', 'created_at'], 'idx_notifications_class_recent');
    table.dropIndex(['class_id', 'is_read'], 'idx_notifications_class_read');
    table.dropIndex(['class_id', 'notification_type'], 'idx_notifications_class_type');
    table.dropIndex(['user_id', 'class_id'], 'idx_notifications_user_class');
    
    // Drop columns
    table.dropColumn('message_id');
    table.dropColumn('conversation_id');
    table.dropColumn('assignment_id');
    table.dropColumn('update_id');
    table.dropColumn('class_id');
  });
};
