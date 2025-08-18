/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('grading_components', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.enum('scope', ['school', 'period', 'subject', 'class_offering']).notNullable();
    table.uuid('scope_ref_id').nullable(); // References school_id, period_id, subject_id, or class_offering_id
    table.string('key', 50).notNullable(); // e.g., "assignments_avg", "pengulangan_best", "final_exam"
    table.string('display_label', 100).notNullable(); // Human-readable name
    table.enum('source_type', ['assignment', 'test', 'final_exam']).notNullable();
    table.json('filters').defaultTo('{}'); // e.g., {"group_tag": "pengulangan", "sequence_no": [1,2,3]}
    table.json('aggregator').notNullable(); // Aggregation rules
    /*
    aggregator examples:
    {"type": "average", "missing_policy": "ignore"}
    {"type": "weighted_average", "weights": "score_based", "missing_policy": "zero"}
    {"type": "best_n", "n": 2, "missing_policy": "ignore"}
    {"type": "drop_lowest_k", "k": 1, "then": "average", "missing_policy": "ignore"}
    {"type": "latest", "missing_policy": "zero"}
    {"type": "sum", "missing_policy": "zero"}
    */
    table.integer('version').defaultTo(1);
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamps(true, true);

    // Unique constraint: One active component per key per scope
    // Will be enforced at application level

    // Indexes
    table.index(['scope']);
    table.index(['scope_ref_id']);
    table.index(['key']);
    table.index(['source_type']);
    table.index(['is_active']);
    table.index(['version']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('grading_components');
};
