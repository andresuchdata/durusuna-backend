const { v4: uuidv4 } = require('uuid');

// Import consistent IDs
const USER_IDS = {
  ADMIN_SDIT: '10000000-0000-0000-0000-000000000001',
  ADMIN_SMP: '10000000-0000-0000-0000-000000000002',
  TEACHER_SDIT_1: '20000000-0000-0000-0000-000000000001',
  TEACHER_SDIT_2: '20000000-0000-0000-0000-000000000002',
  TEACHER_SDIT_3: '20000000-0000-0000-0000-000000000003',
  TEACHER_SMP_1: '20000000-0000-0000-0000-000000000011',
  TEACHER_SMP_2: '20000000-0000-0000-0000-000000000012',
  TEACHER_SMP_3: '20000000-0000-0000-0000-000000000013',
  STUDENT_SDIT_1A_1: '30000000-0000-0000-0000-000000000001',
  STUDENT_SDIT_1A_2: '30000000-0000-0000-0000-000000000002',
  STUDENT_SDIT_1A_3: '30000000-0000-0000-0000-000000000003',
  STUDENT_SDIT_2C_1: '30000000-0000-0000-0000-000000000011',
  STUDENT_SMP_7M1_1: '30000000-0000-0000-0000-000000000101',
  STUDENT_SMP_7M1_2: '30000000-0000-0000-0000-000000000102',
  STUDENT_SMP_8M1_1: '30000000-0000-0000-0000-000000000121',
  PARENT_1: '40000000-0000-0000-0000-000000000001',
  PARENT_2: '40000000-0000-0000-0000-000000000002',
  PARENT_3: '40000000-0000-0000-0000-000000000003',
  PARENT_4: '40000000-0000-0000-0000-000000000004',
  PARENT_5: '40000000-0000-0000-0000-000000000005',
  PARENT_16: '40000000-0000-0000-0000-000000000016',
  PARENT_17: '40000000-0000-0000-0000-000000000017',
  PARENT_18: '40000000-0000-0000-0000-000000000018'
};

const CONVERSATION_IDS = {
  DM_TEACHER_STUDENT: '70000000-0000-0000-0000-000000000001',
  DM_TEACHER_PARENT: '70000000-0000-0000-0000-000000000002',
  GROUP_CLASS_1A: '70000000-0000-0000-0000-000000000011',
  GROUP_TEACHERS_ADMIN: '70000000-0000-0000-0000-000000000012',
  GROUP_PARENTS_1A: '70000000-0000-0000-0000-000000000013',
  // Additional DMs with fixed IDs
  DM_T1_S3: '70000000-0000-0000-0000-000000000021', // Teacher1 - Student1A_3
  DM_T1_P2: '70000000-0000-0000-0000-000000000022', // Teacher1 - Parent2
  DM_T1_P4: '70000000-0000-0000-0000-000000000023', // Teacher1 - Parent4
  DM_T2_S2: '70000000-0000-0000-0000-000000000024', // Teacher2 - Student1A_2
  DM_T3_S2C: '70000000-0000-0000-0000-000000000025', // Teacher3 - Student2C_1
  DM_T12_S7M2: '70000000-0000-0000-0000-000000000026', // TeacherSMP2 - Student7M1_2
  DM_T13_S8M1: '70000000-0000-0000-0000-000000000027' // TeacherSMP3 - Student8M1_1
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  try {
    await knex.transaction(async (trx) => {
      console.log('🗑️  Deleting existing conversation data...');
      await trx('conversation_participants').del();
      await trx('messages').del();
      await trx('conversations').del();
      console.log('✅ Existing data deleted');
    
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
      },
      
      // 5. Group: Parents of Class 1A
      {
        id: CONVERSATION_IDS.GROUP_PARENTS_1A,
        type: 'group',
        name: 'Orang Tua Kelas 1A',
        description: 'Group komunikasi orang tua murid kelas 1A dengan wali kelas',
        avatar_url: null,
        created_by: USER_IDS.TEACHER_SDIT_1,
        last_message_id: null,
        last_message_at: new Date('2024-12-24T09:30:00Z'),
        is_active: true,
        created_at: new Date('2024-12-01T10:00:00Z'),
        updated_at: new Date('2024-12-24T09:30:00Z')
      }
    ];
    
    console.log(`📝 Inserting ${conversations.length} base conversations...`);
    await trx('conversations').insert(conversations);
    console.log('✅ Base conversations inserted');
    
    // Create conversation participants
    console.log('👥 Creating conversation participants...');
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
      },
      
      // Group: Parents of Class 1A
      {
        conversation_id: CONVERSATION_IDS.GROUP_PARENTS_1A,
        user_id: USER_IDS.TEACHER_SDIT_1,
        joined_at: new Date('2024-12-01T10:00:00Z'),
        unread_count: 0,
        last_read_at: new Date('2024-12-24T09:30:00Z'),
        is_active: true,
        role: 'admin',
        can_add_participants: true,
        can_remove_participants: true,
        created_at: new Date('2024-12-01T10:00:00Z'),
        updated_at: new Date('2024-12-24T09:30:00Z')
      },
      {
        conversation_id: CONVERSATION_IDS.GROUP_PARENTS_1A,
        user_id: USER_IDS.PARENT_2,
        joined_at: new Date('2024-12-01T11:00:00Z'),
        unread_count: 1,
        last_read_at: new Date('2024-12-24T08:00:00Z'),
        is_active: true,
        role: 'member',
        can_add_participants: false,
        can_remove_participants: false,
        created_at: new Date('2024-12-01T11:00:00Z'),
        updated_at: new Date('2024-12-24T08:00:00Z')
      },
      {
        conversation_id: CONVERSATION_IDS.GROUP_PARENTS_1A,
        user_id: USER_IDS.PARENT_4,
        joined_at: new Date('2024-12-01T11:15:00Z'),
        unread_count: 1,
        last_read_at: new Date('2024-12-24T07:30:00Z'),
        is_active: true,
        role: 'member',
        can_add_participants: false,
        can_remove_participants: false,
        created_at: new Date('2024-12-01T11:15:00Z'),
        updated_at: new Date('2024-12-24T07:30:00Z')
      },
      {
        conversation_id: CONVERSATION_IDS.GROUP_PARENTS_1A,
        user_id: USER_IDS.PARENT_5,
        joined_at: new Date('2024-12-01T11:30:00Z'),
        unread_count: 1,
        last_read_at: new Date('2024-12-24T06:00:00Z'),
        is_active: true,
        role: 'member',
        can_add_participants: false,
        can_remove_participants: false,
        created_at: new Date('2024-12-01T11:30:00Z'),
        updated_at: new Date('2024-12-24T06:00:00Z')
      }
    ];
    
    console.log(`📝 Inserting ${participants.length} base participants...`);
    await trx('conversation_participants').insert(participants);
    console.log('✅ Base participants inserted');
    
    // Add more conversations for other users
    console.log('➕ Creating additional conversations...');
    const additionalConversations = [];
    const additionalParticipants = [];
    
    // Create DMs for more teacher-student pairs
    const teacherStudentPairs = [
      // Additional DMs for TEACHER_SDIT_1 (teacher1@asdf.com)
      { teacher: USER_IDS.TEACHER_SDIT_1, student: USER_IDS.STUDENT_SDIT_1A_3 },
      // Other teachers
      { teacher: USER_IDS.TEACHER_SDIT_2, student: USER_IDS.STUDENT_SDIT_1A_2 },
      { teacher: USER_IDS.TEACHER_SDIT_3, student: USER_IDS.STUDENT_SDIT_2C_1 },
      { teacher: USER_IDS.TEACHER_SMP_2, student: USER_IDS.STUDENT_SMP_7M1_2 },
      { teacher: USER_IDS.TEACHER_SMP_3, student: USER_IDS.STUDENT_SMP_8M1_1 },
    ];
    
    const convIdMap = [
      CONVERSATION_IDS.DM_T1_S3,
      CONVERSATION_IDS.DM_T2_S2,
      CONVERSATION_IDS.DM_T3_S2C,
      CONVERSATION_IDS.DM_T12_S7M2,
      CONVERSATION_IDS.DM_T13_S8M1
    ];
    
    teacherStudentPairs.forEach((pair, index) => {
      const convId = convIdMap[index];
      const now = new Date();
      
      additionalConversations.push({
        id: convId,
        type: 'direct',
        name: null,
        description: null,
        avatar_url: null,
        created_by: pair.teacher,
        last_message_id: null,
        last_message_at: now,
        is_active: true,
        created_at: now,
        updated_at: now
      });
      
      additionalParticipants.push(
        {
          conversation_id: convId,
          user_id: pair.teacher,
          joined_at: now,
          unread_count: 0,
          last_read_at: now,
          is_active: true,
          role: 'member',
          can_add_participants: false,
          can_remove_participants: false,
          created_at: now,
          updated_at: now
        },
        {
          conversation_id: convId,
          user_id: pair.student,
          joined_at: now,
          unread_count: 0,
          last_read_at: now,
          is_active: true,
          role: 'member',
          can_add_participants: false,
          can_remove_participants: false,
          created_at: now,
          updated_at: now
        }
      );
    });
    
    // Create DMs for more teacher-parent pairs
    const teacherParentPairs = [
      // Additional DMs for TEACHER_SDIT_1 (teacher1@asdf.com)
      { teacher: USER_IDS.TEACHER_SDIT_1, parent: USER_IDS.PARENT_2 },
      { teacher: USER_IDS.TEACHER_SDIT_1, parent: USER_IDS.PARENT_4 },
      // Other teachers
      { teacher: USER_IDS.TEACHER_SDIT_2, parent: USER_IDS.PARENT_3 },
      { teacher: USER_IDS.TEACHER_SMP_1, parent: USER_IDS.PARENT_17 },
      { teacher: USER_IDS.TEACHER_SMP_2, parent: USER_IDS.PARENT_18 },
    ];
    
    const parentConvIdMap = [
      CONVERSATION_IDS.DM_T1_P2,
      CONVERSATION_IDS.DM_T1_P4,
      '70000000-0000-0000-0000-000000000028', // Teacher2 - Parent3
      '70000000-0000-0000-0000-000000000029', // TeacherSMP1 - Parent17
      '70000000-0000-0000-0000-000000000030'  // TeacherSMP2 - Parent18
    ];
    
    teacherParentPairs.forEach((pair, index) => {
      const convId = parentConvIdMap[index];
      const now = new Date();
      
      additionalConversations.push({
        id: convId,
        type: 'direct',
        name: null,
        description: null,
        avatar_url: null,
        created_by: pair.teacher,
        last_message_id: null,
        last_message_at: now,
        is_active: true,
        created_at: now,
        updated_at: now
      });
      
      additionalParticipants.push(
        {
          conversation_id: convId,
          user_id: pair.teacher,
          joined_at: now,
          unread_count: 0,
          last_read_at: now,
          is_active: true,
          role: 'member',
          can_add_participants: false,
          can_remove_participants: false,
          created_at: now,
          updated_at: now
        },
        {
          conversation_id: convId,
          user_id: pair.parent,
          joined_at: now,
          unread_count: 0,
          last_read_at: now,
          is_active: true,
          role: 'member',
          can_add_participants: false,
          can_remove_participants: false,
          created_at: now,
          updated_at: now
        }
      );
    });
    
    if (additionalConversations.length > 0) {
      console.log(`📝 Inserting ${additionalConversations.length} additional conversations...`);
      await trx('conversations').insert(additionalConversations);
      console.log(`📝 Inserting ${additionalParticipants.length} additional participants...`);
      await trx('conversation_participants').insert(additionalParticipants);
      console.log('✅ Additional conversations and participants inserted');
    }
    
    console.log('✅ Conversations and participants seeded successfully');
    console.log('   - 1 DM: Teacher ↔ Student');
    console.log('   - 1 DM: Teacher ↔ Parent');
    console.log('   - 1 Group: Class 1A (Teachers + Parents)');
    console.log('   - 1 Group: All Teachers + Admins');
    console.log('   - 1 Group: Parents of Class 1A (Teacher + Parents)');
    console.log(`   - ${teacherStudentPairs.length} additional Teacher ↔ Student DMs`);
    console.log(`   - ${teacherParentPairs.length} additional Teacher ↔ Parent DMs`);
    console.log(`   Total: ${5 + additionalConversations.length} conversations`);
    console.log('   - teacher1@asdf.com now has: 2 DMs (student), 2 DMs (parent), 3 groups');
    });
  } catch (error) {
    console.error('❌ Error seeding conversations:', error);
    throw error;
  }
};
