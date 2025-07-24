/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('Starting migration of existing messages to conversations...');
  
  // Get all existing messages
  const messages = await knex('messages')
    .select('id', 'sender_id', 'receiver_id', 'created_at')
    .orderBy('created_at', 'asc');

  if (messages.length === 0) {
    console.log('No existing messages found. Migration complete.');
    return;
  }

  console.log(`Found ${messages.length} messages to migrate.`);

  // Group messages by unique conversation pairs
  const conversationPairs = new Map();
  
  for (const message of messages) {
    // Create a consistent key for the conversation pair
    const participants = [message.sender_id, message.receiver_id].sort();
    const conversationKey = `${participants[0]}_${participants[1]}`;
    
    if (!conversationPairs.has(conversationKey)) {
      conversationPairs.set(conversationKey, {
        participants: participants,
        messages: [],
        firstMessageDate: message.created_at
      });
    }
    
    conversationPairs.get(conversationKey).messages.push(message);
  }

  console.log(`Found ${conversationPairs.size} unique conversations.`);

  // Create conversations and migrate messages
  const conversationUpdates = [];
  
  for (const [key, data] of conversationPairs) {
    try {
      // Create conversation
      const [conversation] = await knex('conversations')
        .insert({
          type: 'direct',
          name: null, // Direct chats don't have names
          created_by: data.participants[0], // First participant as creator
          last_message_at: data.messages[data.messages.length - 1].created_at,
          is_active: true,
          created_at: data.firstMessageDate,
          updated_at: new Date()
        })
        .returning('id');

      const conversationId = conversation.id;
      console.log(`Created conversation ${conversationId} for participants ${data.participants.join(', ')}`);

      // Create participants for this conversation
      for (const participantId of data.participants) {
        await knex('conversation_participants')
          .insert({
            conversation_id: conversationId,
            user_id: participantId,
            joined_at: data.firstMessageDate,
            unread_count: 0, // Reset unread counts
            is_active: true,
            role: 'member'
          });
      }

      // Update all messages to reference this conversation
      const messageIds = data.messages.map(m => m.id);
      await knex('messages')
        .whereIn('id', messageIds)
        .update({
          conversation_id: conversationId,
          updated_at: new Date()
        });

      conversationUpdates.push({
        conversationId,
        messageCount: data.messages.length
      });

    } catch (error) {
      console.error(`Error creating conversation for participants ${data.participants.join(', ')}:`, error);
      throw error;
    }
  }

  // Update conversations with last message reference
  for (const update of conversationUpdates) {
    const lastMessage = await knex('messages')
      .where('conversation_id', update.conversationId)
      .orderBy('created_at', 'desc')
      .first();

    if (lastMessage) {
      await knex('conversations')
        .where('id', update.conversationId)
        .update({
          last_message_id: lastMessage.id,
          last_message_at: lastMessage.created_at
        });
    }
  }

  console.log(`Migration complete! Created ${conversationPairs.size} conversations and migrated ${messages.length} messages.`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('Rolling back conversation migration...');
  
  // Remove conversation_id from all messages
  await knex('messages').update({ conversation_id: null });
  
  // Delete all conversation participants
  await knex('conversation_participants').del();
  
  // Delete all conversations
  await knex('conversations').del();
  
  console.log('Conversation migration rollback complete.');
}; 