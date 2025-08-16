const { v4: uuidv4 } = require('uuid');

// Import consistent IDs
const USER_IDS = {
  ADMIN_SDIT: '10000000-0000-0000-0000-000000000001',
  ADMIN_SMP: '10000000-0000-0000-0000-000000000002',
  TEACHER_SDIT_1: '20000000-0000-0000-0000-000000000001',
  TEACHER_SDIT_2: '20000000-0000-0000-0000-000000000002',
  TEACHER_SMP_1: '20000000-0000-0000-0000-000000000011',
  TEACHER_SMP_2: '20000000-0000-0000-0000-000000000012',
  STUDENT_SDIT_1A_1: '30000000-0000-0000-0000-000000000001',
  STUDENT_SMP_7M1_1: '30000000-0000-0000-0000-000000000101',
  PARENT_1: '40000000-0000-0000-0000-000000000001',
  PARENT_16: '40000000-0000-0000-0000-000000000016'
};

const CONVERSATION_IDS = {
  DM_TEACHER_STUDENT: '70000000-0000-0000-0000-000000000001',
  DM_TEACHER_PARENT: '70000000-0000-0000-0000-000000000002',
  GROUP_CLASS_1A: '70000000-0000-0000-0000-000000000011',
  GROUP_TEACHERS_ADMIN: '70000000-0000-0000-0000-000000000012'
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex.transaction(async (trx) => {
    await trx('conversation_participants').del();
    await trx('messages').del();
    await trx('conversations').del();
    
    const conversations = [
      // 1. DM: Teacher vs Student
      {
        id: CONVERSATION_IDS.DM_TEACHER_STUDENT,
        type: 'direct',
        name: null,
        description: null,
        avatar_url: null,
        created_by: USER_IDS.TEACHER_SDIT_1,
        last_message_id: null, // Will be updated after messages are created
        last_message_at: new Date('2024-12-20T10:30:00Z'),
        is_active: true,
        created_at: new Date('2024-12-15T08:00:00Z'),
        updated_at: new Date('2024-12-20T10:30:00Z')
      },
      
      // 2. DM: Teacher vs Parent
      {
        id: CONVERSATION_IDS.DM_TEACHER_PARENT,
        type: 'direct',
        name: null,
        description: null,
        avatar_url: null,
        created_by: USER_IDS.TEACHER_SMP_1,
        last_message_id: null,
        last_message_at: new Date('2024-12-21T14:20:00Z'),
        is_active: true,
        created_at: new Date('2024-12-18T09:00:00Z'),
        updated_at: new Date('2024-12-21T14:20:00Z')
      },
      
      // 3. Group: Teachers and Parents (Class 1A)
      {
        id: CONVERSATION_IDS.GROUP_CLASS_1A,
        type: 'group',
        name: 'Kelas 1A - Orang Tua & Guru',
        description: 'Group komunikasi antara wali murid dan guru kelas 1A SDIT Darel Iman 1',
        avatar_url: null,
        created_by: USER_IDS.TEACHER_SDIT_1,
        last_message_id: null,
        last_message_at: new Date('2024-12-22T16:45:00Z'),
        is_active: true,
        created_at: new Date('2024-12-01T07:00:00Z'),
        updated_at: new Date('2024-12-22T16:45:00Z')
      },
      
      // 4. Group: Teachers and Admin
      {
        id: CONVERSATION_IDS.GROUP_TEACHERS_ADMIN,
        type: 'group',
        name: 'Tim Guru - SDIT & SMP Darel Iman',
        description: 'Group koordinasi untuk semua guru dan admin sekolah',
        avatar_url: null,
        created_by: USER_IDS.ADMIN_SDIT,
        last_message_id: null,
        last_message_at: new Date('2024-12-23T11:15:00Z'),
        is_active: true,
        created_at: new Date('2024-11-01T08:00:00Z'),
        updated_at: new Date('2024-12-23T11:15:00Z')
      }
    ];
    
    await trx('conversations').insert(conversations);
    
    // Create conversation participants
    const participants = [
      // DM: Teacher vs Student
      {
        conversation_id: CONVERSATION_IDS.DM_TEACHER_STUDENT,
        user_id: USER_IDS.TEACHER_SDIT_1,
        joined_at: new Date('2024-12-15T08:00:00Z'),
        unread_count: 0,
        last_read_at: new Date('2024-12-20T10:30:00Z'),
        is_active: true,
        role: 'member',
        can_add_participants: false,
        can_remove_participants: false,
        created_at: new Date('2024-12-15T08:00:00Z'),
        updated_at: new Date('2024-12-20T10:30:00Z')
      },
      {
        conversation_id: CONVERSATION_IDS.DM_TEACHER_STUDENT,
        user_id: USER_IDS.STUDENT_SDIT_1A_1,
        joined_at: new Date('2024-12-15T08:00:00Z'),
        unread_count: 1,
        last_read_at: new Date('2024-12-20T09:15:00Z'),
        is_active: true,
        role: 'member',
        can_add_participants: false,
        can_remove_participants: false,
        created_at: new Date('2024-12-15T08:00:00Z'),
        updated_at: new Date('2024-12-20T09:15:00Z')
      },
      
      // DM: Teacher vs Parent
      {
        conversation_id: CONVERSATION_IDS.DM_TEACHER_PARENT,
        user_id: USER_IDS.TEACHER_SMP_1,
        joined_at: new Date('2024-12-18T09:00:00Z'),
        unread_count: 0,
        last_read_at: new Date('2024-12-21T14:20:00Z'),
        is_active: true,
        role: 'member',
        can_add_participants: false,
        can_remove_participants: false,
        created_at: new Date('2024-12-18T09:00:00Z'),
        updated_at: new Date('2024-12-21T14:20:00Z')
      },
      {
        conversation_id: CONVERSATION_IDS.DM_TEACHER_PARENT,
        user_id: USER_IDS.PARENT_16,
        joined_at: new Date('2024-12-18T09:00:00Z'),
        unread_count: 2,
        last_read_at: new Date('2024-12-21T13:00:00Z'),
        is_active: true,
        role: 'member',
        can_add_participants: false,
        can_remove_participants: false,
        created_at: new Date('2024-12-18T09:00:00Z'),
        updated_at: new Date('2024-12-21T13:00:00Z')
      },
      
      // Group: Class 1A (Teachers + Parents)
      {
        conversation_id: CONVERSATION_IDS.GROUP_CLASS_1A,
        user_id: USER_IDS.TEACHER_SDIT_1,
        joined_at: new Date('2024-12-01T07:00:00Z'),
        unread_count: 0,
        last_read_at: new Date('2024-12-22T16:45:00Z'),
        is_active: true,
        role: 'admin',
        can_add_participants: true,
        can_remove_participants: true,
        created_at: new Date('2024-12-01T07:00:00Z'),
        updated_at: new Date('2024-12-22T16:45:00Z')
      },
      {
        conversation_id: CONVERSATION_IDS.GROUP_CLASS_1A,
        user_id: USER_IDS.TEACHER_SDIT_2,
        joined_at: new Date('2024-12-01T07:30:00Z'),
        unread_count: 1,
        last_read_at: new Date('2024-12-22T15:20:00Z'),
        is_active: true,
        role: 'member',
        can_add_participants: false,
        can_remove_participants: false,
        created_at: new Date('2024-12-01T07:30:00Z'),
        updated_at: new Date('2024-12-22T15:20:00Z')
      },
      {
        conversation_id: CONVERSATION_IDS.GROUP_CLASS_1A,
        user_id: USER_IDS.PARENT_1,
        joined_at: new Date('2024-12-01T19:00:00Z'),
        unread_count: 3,
        last_read_at: new Date('2024-12-22T12:00:00Z'),
        is_active: true,
        role: 'member',
        can_add_participants: false,
        can_remove_participants: false,
        created_at: new Date('2024-12-01T19:00:00Z'),
        updated_at: new Date('2024-12-22T12:00:00Z')
      },
      
      // Group: Teachers and Admin
      {
        conversation_id: CONVERSATION_IDS.GROUP_TEACHERS_ADMIN,
        user_id: USER_IDS.ADMIN_SDIT,
        joined_at: new Date('2024-11-01T08:00:00Z'),
        unread_count: 0,
        last_read_at: new Date('2024-12-23T11:15:00Z'),
        is_active: true,
        role: 'admin',
        can_add_participants: true,
        can_remove_participants: true,
        created_at: new Date('2024-11-01T08:00:00Z'),
        updated_at: new Date('2024-12-23T11:15:00Z')
      },
      {
        conversation_id: CONVERSATION_IDS.GROUP_TEACHERS_ADMIN,
        user_id: USER_IDS.ADMIN_SMP,
        joined_at: new Date('2024-11-01T08:00:00Z'),
        unread_count: 1,
        last_read_at: new Date('2024-12-23T10:30:00Z'),
        is_active: true,
        role: 'admin',
        can_add_participants: true,
        can_remove_participants: true,
        created_at: new Date('2024-11-01T08:00:00Z'),
        updated_at: new Date('2024-12-23T10:30:00Z')
      },
      {
        conversation_id: CONVERSATION_IDS.GROUP_TEACHERS_ADMIN,
        user_id: USER_IDS.TEACHER_SDIT_1,
        joined_at: new Date('2024-11-01T08:30:00Z'),
        unread_count: 0,
        last_read_at: new Date('2024-12-23T11:15:00Z'),
        is_active: true,
        role: 'member',
        can_add_participants: false,
        can_remove_participants: false,
        created_at: new Date('2024-11-01T08:30:00Z'),
        updated_at: new Date('2024-12-23T11:15:00Z')
      },
      {
        conversation_id: CONVERSATION_IDS.GROUP_TEACHERS_ADMIN,
        user_id: USER_IDS.TEACHER_SMP_1,
        joined_at: new Date('2024-11-01T08:30:00Z'),
        unread_count: 2,
        last_read_at: new Date('2024-12-23T09:45:00Z'),
        is_active: true,
        role: 'member',
        can_add_participants: false,
        can_remove_participants: false,
        created_at: new Date('2024-11-01T08:30:00Z'),
        updated_at: new Date('2024-12-23T09:45:00Z')
      }
    ];
    
    await trx('conversation_participants').insert(participants);
    
    console.log('✅ Conversations and participants seeded successfully');
    console.log('   - 1 DM: Teacher ↔ Student');
    console.log('   - 1 DM: Teacher ↔ Parent');
    console.log('   - 1 Group: Class 1A (Teachers + Parents)');
    console.log('   - 1 Group: All Teachers + Admins');
  });
};
