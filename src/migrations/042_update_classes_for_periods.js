/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('classes', function (table) {
    // Add reference to academic year instead of string
    table.uuid('academic_year_id').nullable().references('id').inTable('academic_years').onDelete('SET NULL');
    table.index(['academic_year_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('classes', function (table) {
    table.dropColumn('academic_year_id');
  });
};
