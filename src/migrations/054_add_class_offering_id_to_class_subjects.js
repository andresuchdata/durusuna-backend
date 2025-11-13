/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('class_subjects', 'class_offering_id');

  if (!hasColumn) {
    await knex.schema.alterTable('class_subjects', (table) => {
      table
        .uuid('class_offering_id')
        .nullable()
        .references('id')
        .inTable('class_offerings')
        .onDelete('SET NULL');
      table.index(['class_offering_id']);
    });

    await knex.raw(`
      UPDATE class_subjects AS cs
      SET class_offering_id = sub.id
      FROM (
        SELECT DISTINCT ON (class_id, subject_id) id, class_id, subject_id
        FROM class_offerings
        WHERE is_active = TRUE
        ORDER BY class_id, subject_id, created_at DESC
      ) AS sub
      WHERE cs.class_id = sub.class_id
        AND cs.subject_id = sub.subject_id
        AND cs.class_offering_id IS NULL;
    `);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('class_subjects', 'class_offering_id');

  if (hasColumn) {
    await knex.schema.alterTable('class_subjects', (table) => {
      table.dropIndex(['class_offering_id']);
      table.dropColumn('class_offering_id');
    });
  }
};
