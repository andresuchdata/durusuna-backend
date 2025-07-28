exports.up = function(knex) {
  return knex.schema.createTable('class_updates', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('class_id').references('id').inTable('classes').onDelete('CASCADE').notNullable();
    table.uuid('author_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('title', 255);
    table.text('content').notNullable();
    table.enum('update_type', ['announcement', 'homework', 'reminder', 'event']).defaultTo('announcement');
    table.json('attachments').defaultTo('[]'); // Array of attachment objects
    table.json('reactions').defaultTo('{}'); // Emoji reactions count
    table.boolean('is_pinned').defaultTo(false);
    table.boolean('is_edited').defaultTo(false);
    table.timestamp('edited_at');
    table.boolean('is_deleted').defaultTo(false);
    table.timestamp('deleted_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['class_id']);
    table.index(['author_id']);
    table.index(['update_type']);
    table.index(['is_pinned']);
    table.index(['created_at']);
    table.index(['class_id', 'created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('class_updates');
}; 