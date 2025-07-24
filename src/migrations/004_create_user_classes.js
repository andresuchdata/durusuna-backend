exports.up = function(knex) {
  return knex.schema.createTable('user_classes', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('class_id').references('id').inTable('classes').onDelete('CASCADE').notNullable();
    table.enum('role_in_class', ['teacher', 'student']).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['class_id']);
    table.index(['role_in_class']);
    table.index(['is_active']);
    table.unique(['user_id', 'class_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('user_classes');
}; 