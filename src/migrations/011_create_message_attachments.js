exports.up = function(knex) {
  return knex.schema.createTable('message_attachments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('message_id').references('id').inTable('messages').onDelete('CASCADE').notNullable();
    table.string('file_name', 255).notNullable();
    table.string('file_type', 100).notNullable(); // MIME type
    table.bigInteger('file_size').notNullable(); // in bytes
    table.string('file_url', 500).notNullable();
    table.string('thumbnail_url', 500); // For images/videos
    table.integer('duration'); // For audio/video in seconds
    table.json('metadata').defaultTo('{}'); // Width, height, etc.
    table.timestamps(true, true);
    
    // Indexes
    table.index(['message_id']);
    table.index(['file_type']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('message_attachments');
}; 