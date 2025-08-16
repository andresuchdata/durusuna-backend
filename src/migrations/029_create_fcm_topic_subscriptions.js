/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('fcm_topic_subscriptions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('topic_name', 255).notNullable();
    table.enum('topic_type', ['class_updates', 'class_comments', 'attendance', 'grades']).notNullable();
    table.uuid('class_id').nullable().references('id').inTable('classes').onDelete('CASCADE');
    table.boolean('is_subscribed').defaultTo(true);
    table.timestamp('subscribed_at').defaultTo(knex.fn.now());
    table.timestamp('unsubscribed_at').nullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['topic_name']);
    table.index(['topic_type']);
    table.index(['class_id']);
    table.index(['is_subscribed']);
    
    // Unique constraint to prevent duplicate subscriptions
    table.unique(['user_id', 'topic_name']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('fcm_topic_subscriptions');
};
