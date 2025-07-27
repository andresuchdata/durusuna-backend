exports.up = function(knex) {
  return knex.schema.createTable('subjects', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    table.string('name', 100).notNullable(); // Mathematics, Science, English Literature
    table.text('description');
    table.string('subject_code', 20); // MATH, SCI, ENG for short codes
    table.json('grade_levels').defaultTo('[]'); // ["Grade 1", "Grade 2"] - which grades this subject is for
    table.text('learning_objectives'); // Educational objectives for this subject
    table.string('curriculum_standard', 100); // Common Core, Cambridge, etc.
    table.json('prerequisites').defaultTo('[]'); // Array of subject IDs that are prerequisites
    table.string('subject_category', 50); // STEM, Humanities, Arts, etc.
    table.integer('total_hours_per_year'); // Expected teaching hours per academic year
    table.json('settings').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['school_id']);
    table.index(['subject_code']);
    table.index(['subject_category']);
    table.index(['is_active']);
    table.unique(['school_id', 'subject_code']); // Unique subject codes per school
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('subjects');
}; 