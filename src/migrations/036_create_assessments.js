/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('assessments', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('class_offering_id').notNullable().references('id').inTable('class_offerings').onDelete('CASCADE');
    table.enum('type', ['assignment', 'test', 'final_exam']).notNullable();
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.decimal('max_score', 8, 2).notNullable(); // e.g., 100.00
    table.decimal('weight_override', 5, 4).nullable(); // Override default category weight (0.0000-1.0000)
    table.string('group_tag', 50).nullable(); // e.g., "pengulangan", "project", "quiz"
    table.integer('sequence_no').nullable(); // For ordering within group (1, 2, 3 for pengulangan)
    table.date('assigned_date').nullable();
    table.datetime('due_date').nullable();
    table.json('rubric').nullable(); // Detailed grading rubric
    table.json('instructions').nullable(); // Assignment instructions, materials, etc.
    table.boolean('is_published').defaultTo(false); // Visible to students
    table.boolean('allow_late_submission').defaultTo(true);
    table.decimal('late_penalty_per_day', 5, 4).nullable(); // e.g., 0.1000 = 10% per day
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamps(true, true);

    // Constraint: Only one final exam per class offering
    // Will be enforced at application level

    // Indexes
    table.index(['class_offering_id']);
    table.index(['type']);
    table.index(['group_tag']);
    table.index(['sequence_no']);
    table.index(['due_date']);
    table.index(['is_published']);
    table.index(['created_by']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('assessments');
};
