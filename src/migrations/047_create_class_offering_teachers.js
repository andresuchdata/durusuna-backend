/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('class_offering_teachers', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('class_offering_id').notNullable().references('id').inTable('class_offerings').onDelete('CASCADE');
    table.uuid('teacher_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('role', ['primary', 'assistant', 'substitute']).defaultTo('primary');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    // Unique constraint: One role per teacher per offering
    table.unique(['class_offering_id', 'teacher_id', 'role']);

    // Indexes
    table.index(['class_offering_id']);
    table.index(['teacher_id']);
    table.index(['role']);
    table.index(['is_active']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('class_offering_teachers');
};
