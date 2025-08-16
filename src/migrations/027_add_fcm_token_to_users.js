/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.text('fcm_token').nullable().comment('Firebase Cloud Messaging token for push notifications');
    table.timestamp('fcm_token_updated_at').nullable().comment('When the FCM token was last updated');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('fcm_token');
    table.dropColumn('fcm_token_updated_at');
  });
};
