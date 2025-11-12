exports.up = function(knex) {
  return knex.schema.createTable('grades', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('student_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table
      .uuid('lesson_instance_id')
      .references('id')
      .inTable('lesson_instances')
      .onDelete('CASCADE')
      .notNullable();
    table.uuid('teacher_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('assignment_name', 255).notNullable();
    table.enum('assignment_type', ['homework', 'quiz', 'exam', 'project', 'participation']).notNullable();
    table.decimal('score', 5, 2); // e.g., 85.50
    table.decimal('max_score', 5, 2).notNullable(); // e.g., 100.00
    table.string('grade_letter', 5); // e.g., "A+", "B", "C-"
    table.text('feedback');
    table.date('assignment_date');
    table.date('due_date');
    table.date('graded_date');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['student_id']);
    table.index(['lesson_instance_id']);
    table.index(['teacher_id']);
    table.index(['assignment_type']);
    table.index(['graded_date']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('grades');
}; 