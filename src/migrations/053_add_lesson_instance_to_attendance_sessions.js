/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('attendance_sessions', (table) => {
    table
      .uuid('lesson_instance_id')
      .nullable()
      .references('id')
      .inTable('lesson_instances')
      .onDelete('SET NULL');
    table.unique(['lesson_instance_id']);
    table.index(['lesson_instance_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('attendance_sessions', (table) => {
    table.dropIndex(['lesson_instance_id']);
    table.dropUnique(['lesson_instance_id']);
    table.dropColumn('lesson_instance_id');
  });
};
