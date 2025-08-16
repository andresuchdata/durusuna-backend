/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('parent_student_relationships', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('parent_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('student_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('relationship_type', ['parent', 'guardian', 'emergency_contact']).defaultTo('parent');
    table.boolean('can_receive_notifications').defaultTo(true);
    table.boolean('can_view_grades').defaultTo(true);
    table.boolean('can_view_attendance').defaultTo(true);
    table.boolean('is_primary_contact').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index(['parent_id']);
    table.index(['student_id']);
    table.index(['relationship_type']);
    table.index(['is_active']);
    table.index(['can_receive_notifications']);
    
    // Composite unique constraint to prevent duplicate relationships
    table.unique(['parent_id', 'student_id']);
    
    // Check constraints
    table.check('parent_id != student_id', [], 'parent_student_different');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('parent_student_relationships');
};
