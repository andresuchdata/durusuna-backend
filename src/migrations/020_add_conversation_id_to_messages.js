/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('messages', function(table) {
    // Add conversation_id column
    table.uuid('conversation_id').nullable();
    
    // Add foreign key constraint
    table.foreign('conversation_id').references('id').inTable('conversations').onDelete('CASCADE');
    
    // Add index for performance
    table.index(['conversation_id']);
    table.index(['conversation_id', 'created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('messages', function(table) {
    // Drop foreign key and column
    table.dropForeign(['conversation_id']);
    table.dropIndex(['conversation_id']);
    table.dropIndex(['conversation_id', 'created_at']);
    table.dropColumn('conversation_id');
  });
}; 