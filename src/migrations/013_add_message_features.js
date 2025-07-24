exports.up = function(knex) {
  return knex.schema.alterTable('messages', function(table) {
    // Add missing columns for modern messaging features
    table.boolean('is_read').defaultTo(false);
    table.timestamp('delivered_at');
    table.enum('read_status', ['sent', 'delivered', 'read']).defaultTo('sent');
    table.json('reactions').defaultTo('{}'); // For emoji reactions { "👍": { "count": 2, "users": ["user1", "user2"] } }
    
    // Add indexes for performance
    table.index(['is_read']);
    table.index(['read_status']);
    table.index(['delivered_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('messages', function(table) {
    table.dropColumn('is_read');
    table.dropColumn('delivered_at');
    table.dropColumn('read_status');
    table.dropColumn('reactions');
  });
}; 