/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('conversation_participants', function(table) {
    table.uuid('conversation_id').notNullable();
    table.uuid('user_id').notNullable();
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('left_at').nullable();
    table.integer('unread_count').defaultTo(0);
    table.timestamp('last_read_at').nullable();
    table.uuid('last_read_message_id').nullable();
    table.boolean('is_active').defaultTo(true);
    table.string('role', 20).defaultTo('member'); // 'admin', 'member' for group chats
    table.boolean('can_add_participants').defaultTo(false);
    table.boolean('can_remove_participants').defaultTo(false);
    table.timestamps(true, true);

    // Composite primary key
    table.primary(['conversation_id', 'user_id']);

    // Foreign key constraints
    table.foreign('conversation_id').references('id').inTable('conversations').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('last_read_message_id').references('id').inTable('messages').onDelete('SET NULL');

    // Indexes for performance
    table.index(['conversation_id']);
    table.index(['user_id']);
    table.index(['is_active']);
    table.index(['unread_count']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('conversation_participants');
}; 