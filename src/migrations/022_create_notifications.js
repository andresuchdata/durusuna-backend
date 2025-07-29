exports.up = function(knex) {
  return knex.schema.createTable('notifications', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table.enum('notification_type', ['message', 'class_update', 'assignment', 'announcement', 'event', 'system']).notNullable();
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