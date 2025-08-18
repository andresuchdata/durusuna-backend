/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('grading_formulas', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.enum('scope', ['school', 'period', 'subject', 'class_offering']).notNullable();
    table.uuid('scope_ref_id').nullable(); // References school_id, period_id, subject_id, or class_offering_id
    table.text('expression').notNullable(); // Math expression using component keys
    /*
    expression examples:
    "0.3 * assignments_avg + 0.3 * pengulangan_best + 0.4 * final_exam"
    "IF(final_exam >= 60, 0.3 * assignments_avg + 0.3 * tests_avg + 0.4 * final_exam, final_exam)"
    "MAX(0.4 * (assignments_avg + tests_avg) + 0.6 * final_exam, final_exam)"
    */
    table.json('conditions').nullable(); // Conditional logic rules
    /*
    conditions examples:
    [
      {"condition": "final_exam < 60", "formula": "final_exam", "description": "If final exam < 60, use final exam score"},
      {"condition": "assignments_avg == null", "formula": "0.5 * tests_avg + 0.5 * final_exam", "description": "No assignments submitted"}
    ]
    */
    table.enum('rounding_rule', ['none', 'half_up', 'half_down', 'bankers', 'floor', 'ceil']).defaultTo('half_up');
    table.integer('decimal_places').defaultTo(2);
    table.decimal('pass_threshold', 5, 2).nullable(); // Minimum score to pass
    table.json('grade_boundaries').nullable(); // Letter grade thresholds
    /*
    grade_boundaries example:
    {"A": 90, "B": 80, "C": 70, "D": 60, "F": 0}
    */
    table.integer('version').defaultTo(1);
    table.boolean('is_active').defaultTo(true);
    table.text('description').nullable(); // Formula description for teachers
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamps(true, true);

        // Unique constraint: One active formula per scope  
    // Will be enforced at application level

    // Indexes
    table.index(['scope']);
    table.index(['scope_ref_id']);
    table.index(['is_active']);
    table.index(['version']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('grading_formulas');
};
