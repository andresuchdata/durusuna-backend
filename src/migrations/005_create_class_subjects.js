/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('class_subjects', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    table.uuid('subject_id').notNullable().references('id').inTable('subjects').onDelete('CASCADE');
    table.uuid('teacher_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.integer('hours_per_week').nullable(); // e.g., 4 hours per week
    table.string('room', 50).nullable(); // classroom number/name
    table.string('schedule').nullable(); // JSON string of schedule times
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    // Composite unique constraint
    table.unique(['class_id', 'subject_id']);

    // Indexes
    table.index('class_id');
    table.index('subject_id');
    table.index('teacher_id');
    table.index('is_active');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('class_subjects');
}; 