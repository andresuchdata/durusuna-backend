exports.up = function(knex) {
  return knex.schema.createTable('report_cards', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('student_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    table.uuid('academic_period_id').notNullable().references('id').inTable('academic_periods').onDelete('CASCADE');
    table.uuid('homeroom_teacher_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.enum('promotion_status', ['promoted', 'not_promoted', 'conditional']).nullable();
    table.boolean('is_published').defaultTo(false);
    table.boolean('is_locked').defaultTo(false);
    table.datetime('generated_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('finalized_at').nullable();
    table.datetime('published_at').nullable();
    table.uuid('published_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.datetime('locked_at').nullable();
    table.uuid('locked_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.text('general_remark').nullable();
    table.json('metadata').nullable();
    table.timestamps(true, true);

    table.unique(['student_id', 'class_id', 'academic_period_id']);

    table.index(['student_id']);
    table.index(['class_id']);
    table.index(['academic_period_id']);
    table.index(['is_published']);
    table.index(['is_locked']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('report_cards');
};
