/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('assessment_grades', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('assessment_id').notNullable().references('id').inTable('assessments').onDelete('CASCADE');
    table.uuid('student_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('score', 8, 2).nullable(); // Actual score (can be null if not graded yet)
    table.decimal('adjusted_score', 8, 2).nullable(); // After late penalties, curves, etc.
    table.enum('status', ['not_submitted', 'submitted', 'graded', 'returned', 'excused']).defaultTo('not_submitted');
    table.datetime('submitted_at').nullable();
    table.datetime('graded_at').nullable();
    table.uuid('graded_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.text('feedback').nullable(); // Teacher feedback
    table.json('rubric_scores').nullable(); // Detailed rubric breakdown
    table.boolean('is_late').defaultTo(false);
    table.integer('days_late').nullable();
    table.json('attachments').defaultTo('[]'); // Student submission files
    table.timestamps(true, true);

    // Unique constraint: One grade per student per assessment
    table.unique(['assessment_id', 'student_id']);

    // Indexes
    table.index(['assessment_id']);
    table.index(['student_id']);
    table.index(['status']);
    table.index(['graded_at']);
    table.index(['graded_by']);
    table.index(['is_late']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('assessment_grades');
};
