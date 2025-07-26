exports.up = function(knex) {
  // First, update any existing 'class_update' notifications to 'announcement'
  return knex.raw(`
    UPDATE notifications 
    SET notification_type = 'announcement' 
    WHERE notification_type = 'class_update'
  `).then(() => {
    // Then alter the enum to remove 'class_update'
    return knex.raw(`
      ALTER TABLE notifications 
      DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
      
      ALTER TABLE notifications 
      ADD CONSTRAINT notifications_notification_type_check 
      CHECK (notification_type IN ('message', 'assignment', 'announcement', 'event', 'system'));
    `);
  });
};

exports.down = function(knex) {
  // First restore the old constraint
  return knex.raw(`
    ALTER TABLE notifications 
    DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
    
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_notification_type_check 
    CHECK (notification_type IN ('message', 'class_update', 'assignment', 'announcement', 'event', 'system'));
  `).then(() => {
    // Then convert any 'announcement' back to 'class_update' for rollback
    return knex.raw(`
      UPDATE notifications
      SET notification_type = 'class_update' 
      WHERE notification_type = 'announcement'
    `);
  });
}; 