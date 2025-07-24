exports.up = function(knex) {
  return knex.schema.createTable('user_lessons', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('lesson_id').references('id').inTable('lessons').onDelete('CASCADE').notNullable();
    table.enum('role_in_lesson', ['teacher', 'student']).notNullable();
    table.enum('attendance_status', ['present', 'absent', 'late', 'excused']).defaultTo('present');
    table.timestamp('attendance_marked_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['lesson_id']);
    table.index(['role_in_lesson']);
    table.index(['attendance_status']);
    table.unique(['user_id', 'lesson_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('user_lessons');
}; 