exports.up = function(knex) {
  return knex.schema.createTable('notifications', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table.enum('notification_type', [
      // Class Update Related
      'class_update_announcement',
      'class_update_homework', 
      'class_update_reminder',
      'class_update_event',
      
      // Class Update Comments
      'class_update_comment',
      'class_update_reply',
      
      // Assignment Related
      'assignment_created',
      'assignment_updated',
      'assignment_due_soon',
      'assignment_submitted',
      'assignment_graded',
      
      // Attendance Related
      'attendance_marked',
      'attendance_late',
      'attendance_absent',
      
      // Grade Related
      'grade_posted',
      'grade_updated',
      
      // Message Related
      'message_received',
      'conversation_created',
      
      // System Related
      'system_announcement',
      'system_maintenance',
      'system_update',
      
      // General
      'announcement',
      'event',
      'reminder'
    ]).notNullable();
    table.enum('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal');
    table.boolean('is_read').defaultTo(false);
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('sender_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('action_url', 500);
    table.json('action_data').defaultTo('{}');
    table.string('image_url', 500);
    table.timestamp('read_at');
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['user_id']);
    table.index(['sender_id']);
    table.index(['notification_type']);
    table.index(['priority']);
    table.index(['is_read']);
    table.index(['created_at']);
    table.index(['user_id', 'is_read']);
    table.index(['user_id', 'created_at']);
    table.index(['user_id', 'is_read', 'created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notifications');
}; 