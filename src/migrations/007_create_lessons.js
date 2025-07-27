exports.up = function(knex) {
  return knex.schema.createTable('lessons', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('class_subject_id').references('id').inTable('class_subjects').onDelete('CASCADE').notNullable();
    table.string('title', 255).notNullable(); // "Introduction to Multiplication", "States of Matter"
    table.text('description');
    table.datetime('start_time').notNullable();
    table.datetime('end_time').notNullable();
    table.string('location', 100); // Classroom/location for this specific lesson
    table.enum('status', ['scheduled', 'ongoing', 'completed', 'cancelled']).defaultTo('scheduled');
    table.text('lesson_objectives'); // What students should learn in this specific lesson
    table.json('materials').defaultTo('[]'); // Links to documents, videos, etc.
    table.text('homework_assigned'); // Homework given at the end of this lesson
    table.date('homework_due_date'); // When homework is due
    table.json('attendance_data').defaultTo('{}'); // Store attendance info for this lesson
    table.text('teacher_notes'); // Private notes for the teacher
    table.json('settings').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['class_subject_id']);
    table.index(['start_time']);
    table.index(['status']);
    table.index(['is_active']);
    table.index(['homework_due_date']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('lessons');
}; 