/**
 * Student enrollments in class offerings
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('enrollments', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('student_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('class_offering_id').notNullable().references('id').inTable('class_offerings').onDelete('CASCADE');
    table.datetime('enrolled_at').notNullable().defaultTo(knex.fn.now());
    table.date('withdrawn_at').nullable();
    table.enum('status', ['active', 'dropped', 'completed', 'transferred', 'withdrawn']).defaultTo('active');
    table.datetime('status_changed_at').nullable();
    table.text('withdrawal_reason').nullable();
    table.uuid('enrolled_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.uuid('withdrawn_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_active').defaultTo(true);
    table.text('notes').nullable(); // Enrollment notes
    table.timestamps(true, true);

    // Unique constraint: One enrollment per student per class offering
    table.unique(['student_id', 'class_offering_id']);

    // Indexes
    table.index(['student_id']);
    table.index(['class_offering_id']);
    table.index(['status']);
    table.index(['is_active']);
    table.index(['enrolled_at']);
    table.index(['withdrawn_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('enrollments');
};
