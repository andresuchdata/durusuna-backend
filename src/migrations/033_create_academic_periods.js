/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('academic_periods', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('academic_year_id').notNullable().references('id').inTable('academic_years').onDelete('CASCADE');
    table.string('name', 50).notNullable(); // e.g., "Semester 1", "Semester 2"
    table.enum('type', ['semester']).defaultTo('semester'); // Future-proof for trimester/quarter
    table.integer('sequence').notNullable(); // 1, 2 for ordering
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_current').defaultTo(false); // Only one current per academic year
    table.json('settings').defaultTo('{}'); // Period-specific settings
    table.timestamps(true, true);

    // Indexes
    table.index(['academic_year_id']);
    table.index(['is_active']);
    table.index(['is_current']);
    table.index(['sequence']);
    table.unique(['academic_year_id', 'sequence']);
    
    // Constraint: Only one current period per academic year
    // Will be enforced at application level
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('academic_periods');
};
