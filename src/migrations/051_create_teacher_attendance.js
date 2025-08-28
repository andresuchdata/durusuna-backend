/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('teacher_attendance_records', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('teacher_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.date('attendance_date').notNullable();
    table.enum('status', ['present', 'absent', 'late', 'excused']).notNullable();
    table.text('notes').nullable(); // Teacher's notes about their attendance
    table.enum('marked_via', ['manual', 'gps']).defaultTo('manual');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['teacher_id']);
    table.index(['attendance_date']);
    table.index(['status']);
    table.index(['marked_via']);
    table.unique(['teacher_id', 'attendance_date']); // One record per teacher per day
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('teacher_attendance_records');
};
