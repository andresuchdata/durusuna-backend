exports.up = function(knex) {
  return knex.schema.createTable('classes', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    table.string('name', 100).notNullable();
    table.text('description');
    table.string('grade_level', 20); // e.g., "Grade 10", "Year 12"
    table.string('section', 10); // e.g., "A", "B", "Science"
    table.string('academic_year', 20).notNullable(); // e.g., "2023-2024"
    table.json('settings').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['school_id']);
    table.index(['grade_level']);
    table.index(['academic_year']);
    table.index(['is_active']);
    table.unique(['school_id', 'name', 'section', 'academic_year']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('classes');
}; 