/**
 * Fix notification types constraint with all new types
 * 
 * NOTE: This migration was already applied and should NOT be deleted.
 * Knex tracks this in knex_migrations table and expects the file to exist.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    -- Drop the old check constraint
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
    
    -- Add the new check constraint with all notification types
    ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check 
    CHECK (notification_type = ANY (ARRAY[
      -- Class Update Related
      'class_update_announcement'::text,
      'class_update_homework'::text,
      'class_update_reminder'::text,
      'class_update_event'::text,
      
      -- Class Update Comments
      'class_update_comment'::text,
      'class_update_reply'::text,
      
      -- Assignment Related
      'assignment_created'::text,
      'assignment_updated'::text,
      'assignment_due_soon'::text,
      'assignment_submitted'::text,
      'assignment_graded'::text,
      
      -- Attendance Related
      'attendance_marked'::text,
      'attendance_late'::text,
      'attendance_absent'::text,
      
      -- Grade Related
      'grade_posted'::text,
      'grade_updated'::text,
      
      -- Message Related
      'message_received'::text,
      'conversation_created'::text,
      
      -- System Related
      'system_announcement'::text,
      'system_maintenance'::text,
      'system_update'::text,
      
      -- General
      'announcement'::text,
      'event'::text,
      'reminder'::text,
      
      -- Legacy types (for backward compatibility)
      'message'::text,
      'assignment'::text,
      'system'::text
    ]));
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    -- Drop the new constraint
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
    
    -- Restore the old constraint
    ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check 
    CHECK (notification_type = ANY (ARRAY[
      'message'::text, 
      'assignment'::text, 
      'announcement'::text, 
      'event'::text, 
      'system'::text
    ]));
  `);
};
