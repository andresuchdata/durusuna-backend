/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('grade_computations', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('final_grade_id').notNullable().references('id').inTable('final_grades').onDelete('CASCADE');
    table.uuid('triggered_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.enum('trigger_type', ['manual', 'auto_grade_change', 'auto_assessment_change', 'formula_change']).notNullable();
    table.text('trigger_description').nullable(); // What caused the recomputation
    table.decimal('previous_grade', 8, 4).nullable();
    table.decimal('new_grade', 8, 4).nullable();
    table.json('computation_log').nullable(); // Detailed calculation steps
    table.enum('status', ['pending', 'completed', 'failed']).defaultTo('pending');
    table.text('error_message').nullable();
    table.datetime('started_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('completed_at').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(['final_grade_id']);
    table.index(['triggered_by']);
    table.index(['trigger_type']);
    table.index(['status']);
    table.index(['started_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('grade_computations');
};
