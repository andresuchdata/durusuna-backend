exports.up = function(knex) {
  return knex.schema.createTable('class_subjects', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('class_id').references('id').inTable('classes').onDelete('CASCADE').notNullable();
    table.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE').notNullable();
    table.uuid('primary_teacher_id').references('id').inTable('users').onDelete('SET NULL'); // Main teacher for this subject in this class
    table.integer('hours_per_week').defaultTo(0); // How many hours per week this subject is taught in this class
    table.string('classroom', 50); // Room where this subject is typically taught for this class
    table.json('schedule').defaultTo('{}'); // Weekly schedule for this subject-class combination
    table.date('start_date'); // When this subject starts for this class (might be mid-semester)
    table.date('end_date'); // When this subject ends for this class
    table.json('assessment_methods').defaultTo('[]'); // ["quiz", "project", "exam"] - how students are assessed
    table.text('syllabus'); // Specific syllabus for this subject in this class
    table.json('settings').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['class_id']);
    table.index(['subject_id']);
    table.index(['primary_teacher_id']);
    table.index(['is_active']);
    table.unique(['class_id', 'subject_id']); // Each subject can only be taught once per class
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('class_subjects');
}; 