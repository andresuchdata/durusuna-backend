const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get users from previous seeds
  const users = await knex('users').select('id', 'email', 'first_name', 'last_name', 'user_type');
  
  const teacher = users.find(u => u.email === 'teacher@demo.com');
  const teacher2 = users.find(u => u.email === 'teacher2@demo.com');
  const student = users.find(u => u.email === 'student@demo.com');
  const student2 = users.find(u => u.email === 'student2@demo.com');
  const parent = users.find(u => u.email === 'parent@demo.com');
  const admin = users.find(u => u.email === 'admin@demo.com');

  // Clear existing conversation data
  await knex('messages').where('conversation_id', 'is not', null).del();
  await knex('conversation_participants').del();
  await knex('conversations').del();

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Conversation 1: Teacher and Parent (about student progress)
  const conv1Id = uuidv4();
  const conv1Msg1Id = uuidv4();
  const conv1Msg2Id = uuidv4();
  const conv1Msg3Id = uuidv4();

  await knex('conversations').insert({
    id: conv1Id,
    type: 'direct',
    created_by: teacher.id,
    last_message_at: oneHourAgo,
    is_active: true,
    created_at: twoDaysAgo,
    updated_at: oneHourAgo
  });

  await knex('conversation_participants').insert([
    {
      conversation_id: conv1Id,
      user_id: teacher.id,
      joined_at: twoDaysAgo,
      unread_count: 0,
      is_active: true,
      role: 'member'
    },
    {
      conversation_id: conv1Id,
      user_id: parent.id,
      joined_at: twoDaysAgo,
      unread_count: 1,
      is_active: true,
      role: 'member'
    }
  ]);

  await knex('messages').insert([
    {
      id: conv1Msg1Id,
      conversation_id: conv1Id,
      sender_id: teacher.id,
      receiver_id: parent.id,
      content: 'Hi Robert, I wanted to discuss Emma\'s recent progress in mathematics.',
      message_type: 'text',
      is_read: false,
      is_edited: false,
      is_deleted: false,
      read_status: 'delivered',
      reactions: '{}',
      created_at: twoDaysAgo,
      updated_at: twoDaysAgo
    },
    {
      id: conv1Msg2Id,
      conversation_id: conv1Id,
      sender_id: parent.id,
      receiver_id: teacher.id,
      content: 'Thank you for reaching out, Sarah. I\'d love to hear how she\'s doing.',
      message_type: 'text',
      is_read: true,
      is_edited: false,
      is_deleted: false,
      read_status: 'read',
      reactions: '{}',
      created_at: new Date(twoDaysAgo.getTime() + 30 * 60 * 1000),
      updated_at: new Date(twoDaysAgo.getTime() + 30 * 60 * 1000)
    },
    {
      id: conv1Msg3Id,
      conversation_id: conv1Id,
      sender_id: teacher.id,
      receiver_id: parent.id,
      content: 'She\'s been doing exceptionally well! Her problem-solving skills have improved significantly.',
      message_type: 'text',
      is_read: false,
      is_edited: false,
      is_deleted: false,
      read_status: 'sent',
      reactions: '{}',
      created_at: oneHourAgo,
      updated_at: oneHourAgo
    }
  ]);

  // Conversation 2: Teacher and Student (homework reminder)
  const conv2Id = uuidv4();
  const conv2Msg1Id = uuidv4();
  const conv2Msg2Id = uuidv4();

  await knex('conversations').insert({
    id: conv2Id,
    type: 'direct',
    created_by: teacher.id,
    last_message_at: new Date(now.getTime() - 30 * 60 * 1000),
    is_active: true,
    created_at: oneWeekAgo,
    updated_at: new Date(now.getTime() - 30 * 60 * 1000)
  });

  await knex('conversation_participants').insert([
    {
      conversation_id: conv2Id,
      user_id: teacher.id,
      joined_at: oneWeekAgo,
      unread_count: 0,
      is_active: true,
      role: 'member'
    },
    {
      conversation_id: conv2Id,
      user_id: student.id,
      joined_at: oneWeekAgo,
      unread_count: 1,
      is_active: true,
      role: 'member'
    }
  ]);

  await knex('messages').insert([
    {
      id: conv2Msg1Id,
      conversation_id: conv2Id,
      sender_id: teacher.id,
      receiver_id: student.id,
      content: 'Hi Emma! Don\'t forget to submit your science project by tomorrow.',
      message_type: 'text',
      is_read: true,
      is_edited: false,
      is_deleted: false,
      read_status: 'read',
      reactions: '{}',
      created_at: oneWeekAgo,
      updated_at: oneWeekAgo
    },
    {
      id: conv2Msg2Id,
      conversation_id: conv2Id,
      sender_id: student.id,
      receiver_id: teacher.id,
      content: 'Thank you for the reminder, Ms. Johnson! I\'ll submit it today.',
      message_type: 'text',
      is_read: false,
      is_edited: false,
      is_deleted: false,
      read_status: 'delivered',
      reactions: '{}',
      created_at: new Date(now.getTime() - 30 * 60 * 1000),
      updated_at: new Date(now.getTime() - 30 * 60 * 1000)
    }
  ]);

  // Conversation 3: Admin and Teachers (group announcement preparation)
  const conv3Id = uuidv4();
  const conv3Msg1Id = uuidv4();
  const conv3Msg2Id = uuidv4();
  const conv3Msg3Id = uuidv4();

  await knex('conversations').insert({
    id: conv3Id,
    type: 'group',
    name: 'Staff Meeting Prep',
    description: 'Coordination for upcoming staff meeting',
    created_by: admin.id,
    last_message_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    is_active: true,
    created_at: oneWeekAgo,
    updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000)
  });

  await knex('conversation_participants').insert([
    {
      conversation_id: conv3Id,
      user_id: admin.id,
      joined_at: oneWeekAgo,
      unread_count: 0,
      is_active: true,
      role: 'admin',
      can_add_participants: true,
      can_remove_participants: true
    },
    {
      conversation_id: conv3Id,
      user_id: teacher.id,
      joined_at: oneWeekAgo,
      unread_count: 2,
      is_active: true,
      role: 'member'
    },
    {
      conversation_id: conv3Id,
      user_id: teacher2.id,
      joined_at: oneWeekAgo,
      unread_count: 2,
      is_active: true,
      role: 'member'
    }
  ]);

  await knex('messages').insert([
    {
      id: conv3Msg1Id,
      conversation_id: conv3Id,
      sender_id: admin.id,
      receiver_id: null, // Group message
      content: 'Good morning everyone! Let\'s prepare for next week\'s staff meeting.',
      message_type: 'text',
      is_read: false,
      is_edited: false,
      is_deleted: false,
      read_status: 'sent',
      reactions: '{}',
      created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 4 * 60 * 60 * 1000)
    },
    {
      id: conv3Msg2Id,
      conversation_id: conv3Id,
      sender_id: teacher.id,
      receiver_id: null,
      content: 'I can present the student progress report.',
      message_type: 'text',
      is_read: false,
      is_edited: false,
      is_deleted: false,
      read_status: 'sent',
      reactions: '{"👍": ["' + admin.id + '"]}',
      created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 3 * 60 * 60 * 1000)
    },
    {
      id: conv3Msg3Id,
      conversation_id: conv3Id,
      sender_id: teacher2.id,
      receiver_id: null,
      content: 'I\'ll handle the curriculum updates section.',
      message_type: 'text',
      is_read: false,
      is_edited: false,
      is_deleted: false,
      read_status: 'sent',
      reactions: '{}',
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    }
  ]);

  // Update conversations with last message references
  await knex('conversations').where('id', conv1Id).update({
    last_message_id: conv1Msg3Id
  });
  
  await knex('conversations').where('id', conv2Id).update({
    last_message_id: conv2Msg2Id
  });
  
  await knex('conversations').where('id', conv3Id).update({
    last_message_id: conv3Msg3Id
  });

  console.log('✅ Conversations seeded successfully!');
  console.log(`   - Created 3 conversations (2 direct, 1 group)`);
  console.log(`   - Added 8 participants`);
  console.log(`   - Created 8 sample messages`);
}; 