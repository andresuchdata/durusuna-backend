/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('final_grades', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('student_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('class_offering_id').notNullable().references('id').inTable('class_offerings').onDelete('CASCADE');
    table.decimal('numeric_grade', 8, 4).nullable(); // Computed final grade
    table.string('letter_grade', 5).nullable(); // Computed letter grade (A, B, C, etc.)
    table.boolean('is_passing').nullable(); // Based on pass_threshold
    table.json('component_breakdown').nullable(); // Individual component scores
    /*
    component_breakdown example:
    {
      "assignments_avg": 85.5,
      "pengulangan_best": 92.0,
      "final_exam": 78.0,
      "formula_used": "0.3 * assignments_avg + 0.3 * pengulangan_best + 0.4 * final_exam",
      "calculation": "0.3 * 85.5 + 0.3 * 92.0 + 0.4 * 78.0 = 84.45"
    }
    */
    table.uuid('formula_id').nullable().references('id').inTable('grading_formulas').onDelete('SET NULL');
    table.integer('formula_version').nullable(); // Version of formula used
    table.datetime('computed_at').nullable();
    table.uuid('computed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_published').defaultTo(false); // Visible to students/parents
    table.datetime('published_at').nullable();
    table.uuid('published_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_locked').defaultTo(false); // Prevent recomputation
    table.datetime('locked_at').nullable();
    table.uuid('locked_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.decimal('override_grade', 8, 4).nullable(); // Admin override
    table.text('override_reason').nullable();
    table.uuid('override_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.datetime('override_at').nullable();
    table.timestamps(true, true);

    // Unique constraint: One final grade per student per class offering
    table.unique(['student_id', 'class_offering_id']);

    // Indexes
    table.index(['student_id']);
    table.index(['class_offering_id']);
    table.index(['is_published']);
    table.index(['is_locked']);
    table.index(['computed_at']);
    table.index(['formula_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('final_grades');
};
