exports.up = function(knex) {
  return knex.schema.createTable('messages', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('sender_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('receiver_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.text('content');
    table.enum('message_type', ['text', 'image', 'video', 'audio', 'file', 'emoji']).defaultTo('text');
    table.json('metadata').defaultTo('{}'); // For storing emoji reactions, file info, etc.
    table.uuid('reply_to_id').references('id').inTable('messages').onDelete('SET NULL');
    table.boolean('is_edited').defaultTo(false);
    table.timestamp('edited_at');
    table.boolean('is_deleted').defaultTo(false);
    table.timestamp('deleted_at');
    table.timestamp('read_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['sender_id']);
    table.index(['receiver_id']);
    table.index(['message_type']);
    table.index(['reply_to_id']);
    table.index(['created_at']);
    table.index(['sender_id', 'receiver_id', 'created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('messages');
}; 