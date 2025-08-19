/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('class_offerings', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    table.uuid('subject_id').notNullable().references('id').inTable('subjects').onDelete('CASCADE');
    table.uuid('academic_period_id').notNullable().references('id').inTable('academic_periods').onDelete('CASCADE');
    table.uuid('primary_teacher_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.integer('hours_per_week').nullable();
    table.string('room', 50).nullable();
    table.json('schedule').defaultTo('{}'); // Weekly schedule
    table.json('grading_settings').defaultTo('{}'); // Override grading config at offering level
    table.enum('grade_display_mode', ['numeric', 'letter', 'both']).defaultTo('numeric');
    table.json('letter_grade_scale').nullable(); // Custom A-F scale if using letters
    table.boolean('enable_grade_curve').defaultTo(false);
    table.json('curve_settings').nullable(); // Curve configuration
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    // Unique constraint: One offering per class+subject+period
    table.unique(['class_id', 'subject_id', 'academic_period_id']);

    // Indexes
    table.index(['class_id']);
    table.index(['subject_id']);
    table.index(['academic_period_id']);
    table.index(['primary_teacher_id']);
    table.index(['is_active']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('class_offerings');
};
