exports.up = function(knex) {
  return knex.schema.createTable('typing_indicators', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('conversation_with').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.boolean('is_typing').defaultTo(false);
    table.timestamp('last_typing_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['conversation_with']);
    table.index(['is_typing']);
    table.index(['last_typing_at']);
    table.unique(['user_id', 'conversation_with']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('typing_indicators');
}; 