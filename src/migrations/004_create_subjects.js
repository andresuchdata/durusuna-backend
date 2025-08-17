/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('subjects', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.string('code', 20).unique().notNullable(); // e.g., "MATH", "ENG", "SCI"
    table.string('category', 50).nullable(); // e.g., "Sains", "Bahasa", "Agama"
    table.text('description').nullable();
    table.string('color', 7).nullable(); // hex color for UI
    table.string('icon', 50).nullable(); // icon name for UI
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index('code');
    table.index('is_active');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('subjects');
}; 