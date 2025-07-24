exports.up = function(knex) {
  return knex.schema.createTable('lessons', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('class_id').references('id').inTable('classes').onDelete('CASCADE').notNullable();
    table.string('title', 255).notNullable();
    table.text('description');
    table.string('subject', 100).notNullable();
    table.datetime('start_time').notNullable();
    table.datetime('end_time').notNullable();
    table.string('location', 100);
    table.enum('status', ['scheduled', 'ongoing', 'completed', 'cancelled']).defaultTo('scheduled');
    table.json('materials'); // Links to documents, videos, etc.
    table.json('settings').defaultTo('{}');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['class_id']);
    table.index(['subject']);
    table.index(['start_time']);
    table.index(['status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('lessons');
}; 