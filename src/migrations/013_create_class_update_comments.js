exports.up = function(knex) {
  return knex.schema.createTable('class_update_comments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('class_update_id').references('id').inTable('class_updates').onDelete('CASCADE').notNullable();
    table.uuid('author_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.text('content').notNullable();
    table.uuid('reply_to_id').references('id').inTable('class_update_comments').onDelete('CASCADE');
    table.json('reactions').defaultTo('{}'); // Emoji reactions count
    table.boolean('is_edited').defaultTo(false);
    table.timestamp('edited_at');
    table.boolean('is_deleted').defaultTo(false);
    table.timestamp('deleted_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['class_update_id']);
    table.index(['author_id']);
    table.index(['reply_to_id']);
    table.index(['created_at']);
    table.index(['class_update_id', 'created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('class_update_comments');
}; 