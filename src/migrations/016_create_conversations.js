/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('conversations', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('type', 20).defaultTo('direct'); // 'direct', 'group'
    table.string('name', 255).nullable(); // null for direct chats, set for group chats
    table.text('description').nullable(); // for group chat descriptions
    table.string('avatar_url').nullable(); // for group chat avatars
    table.uuid('created_by').nullable(); // who created the conversation
    table.uuid('last_message_id').nullable();
    table.timestamp('last_message_at').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('last_message_id').references('id').inTable('messages').onDelete('SET NULL');

    // Indexes for performance
    table.index(['type']);
    table.index(['is_active']);
    table.index(['last_message_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('conversations');
}; 