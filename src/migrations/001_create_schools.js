exports.up = function(knex) {
  return knex.schema.createTable('schools', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('address', 500);
    table.string('phone', 20);
    table.string('email', 100);
    table.string('website', 255);
    table.string('logo_url', 500);
    table.json('settings').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['name']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('schools');
}; 