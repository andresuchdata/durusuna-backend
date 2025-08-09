/**
 * Adds client_message_id to messages for idempotent sends and dedupe.
 * - Column is nullable to avoid impacting historical data
 * - Unique index enforced only when not null (partial unique index)
 */

exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('messages', 'client_message_id');
  if (!hasColumn) {
    await knex.schema.table('messages', (table) => {
      table.string('client_message_id', 128).nullable();
    });
  }

  // Create a partial unique index if not exists
  // Note: knex doesn't have first-class partial index helpers, so use raw
  await knex.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS messages_client_msg_id_unique ON messages(client_message_id) WHERE client_message_id IS NOT NULL;"
  );
};

exports.down = async function(knex) {
  // Drop the unique index then the column
  await knex.raw(
    "DROP INDEX IF EXISTS messages_client_msg_id_unique;"
  );

  const hasColumn = await knex.schema.hasColumn('messages', 'client_message_id');
  if (hasColumn) {
    await knex.schema.table('messages', (table) => {
      table.dropColumn('client_message_id');
    });
  }
};


