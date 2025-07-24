exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
    table.string('email', 100).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('phone', 20);
    table.string('avatar_url', 500);
    table.enum('user_type', ['parent', 'student', 'teacher']).notNullable();
    table.enum('role', ['admin', 'user']).defaultTo('user');
    table.date('date_of_birth');
    table.string('student_id', 50); // For students
    table.string('employee_id', 50); // For teachers
    table.json('preferences').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('email_verified_at');
    table.timestamp('last_login_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['school_id']);
    table.index(['email']);
    table.index(['user_type']);
    table.index(['role']);
    table.index(['student_id']);
    table.index(['employee_id']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
}; 