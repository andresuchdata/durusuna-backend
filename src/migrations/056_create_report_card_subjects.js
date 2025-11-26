exports.up = function(knex) {
  return knex.schema.createTable('report_card_subjects', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('report_card_id').notNullable().references('id').inTable('report_cards').onDelete('CASCADE');
    table.uuid('class_offering_id').notNullable().references('id').inTable('class_offerings').onDelete('CASCADE');
    table.uuid('final_grade_id').nullable().references('id').inTable('final_grades').onDelete('SET NULL');
    table.uuid('subject_id').notNullable().references('id').inTable('subjects').onDelete('CASCADE');
    table.string('subject_name', 100).notNullable();
    table.string('subject_code', 50).nullable();
    table.uuid('teacher_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('teacher_name', 150).nullable();
    table.decimal('numeric_grade', 8, 2).nullable();
    table.string('letter_grade', 5).nullable();
    table.boolean('is_passing').nullable();
    table.integer('sequence').nullable();
    table.json('metadata').nullable();
    table.timestamps(true, true);

    table.unique(['report_card_id', 'class_offering_id']);

    table.index(['report_card_id']);
    table.index(['class_offering_id']);
    table.index(['subject_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('report_card_subjects');
};
