/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('messages', function(table) {
    // Make receiver_id nullable to support group messages
    table.uuid('receiver_id').nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // For rollback, we need to handle null values first
  return knex.raw(`
    -- Delete messages with null receiver_id (group messages)
    DELETE FROM messages WHERE receiver_id IS NULL;
    
    -- Now make receiver_id not nullable
    ALTER TABLE messages ALTER COLUMN receiver_id SET NOT NULL;
  `);
}; 