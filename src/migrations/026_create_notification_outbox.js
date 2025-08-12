exports.up = function(knex) {
  return knex.schema.createTable('notification_outbox', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('notification_id').notNullable().references('id').inTable('notifications').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('channels').notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.enum('status', ['queued', 'processing', 'sent', 'failed']).notNullable().defaultTo('queued');
    table.integer('attempts').notNullable().defaultTo(0);
    table.timestamp('next_run_at').notNullable().defaultTo(knex.fn.now());
    table.text('last_error');
    table.timestamps(true, true);

    table.index(['status', 'next_run_at']);
    table.index(['user_id']);
    table.index(['notification_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notification_outbox');
};

