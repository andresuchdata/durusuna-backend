/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('academic_years', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    table.string('name', 50).notNullable(); // e.g., "2023-2024"
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_current').defaultTo(false); // Only one current per school
    table.json('settings').defaultTo('{}'); // School-specific academic year settings
    table.timestamps(true, true);

    // Indexes
    table.index(['school_id']);
    table.index(['is_active']);
    table.index(['is_current']);
    table.unique(['school_id', 'name']);
    
    // Constraint: Only one current academic year per school
    // Will be enforced at application level
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('academic_years');
};
