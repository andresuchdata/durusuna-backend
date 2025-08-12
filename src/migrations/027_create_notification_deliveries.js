exports.up = function(knex) {
  return knex.schema.createTable('notification_deliveries', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('notification_id').notNullable().references('id').inTable('notifications').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('channel', ['socket', 'email']).notNullable();
    table.enum('status', ['queued', 'sent', 'failed', 'acknowledged']).notNullable().defaultTo('queued');
    table.integer('attempts').notNullable().defaultTo(0);
    table.timestamp('sent_at');
    table.timestamp('ack_at');
    table.text('last_error');
    table.timestamps(true, true);

    table.unique(['notification_id', 'user_id', 'channel']);
    table.index(['user_id']);
    table.index(['channel']);
    table.index(['status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notification_deliveries');
};

