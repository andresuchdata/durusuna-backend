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
  await knex('messages').del();
  
  const messages = [];
  
  // Generate message IDs for referencing
  const MESSAGE_IDS = {
    DM_TS_1: uuidv4(),
    DM_TS_2: uuidv4(),
    DM_TS_3: uuidv4(),
    DM_TP_1: uuidv4(),
    DM_TP_2: uuidv4(),
    DM_TP_3: uuidv4(),
    GRP_1A_1: uuidv4(),
    GRP_1A_2: uuidv4(),
    GRP_1A_3: uuidv4(),
    GRP_1A_4: uuidv4(),
    GRP_ADM_1: uuidv4(),
    GRP_ADM_2: uuidv4(),
    GRP_ADM_3: uuidv4(),
    GRP_ADM_4: uuidv4()
  };
  
  // 1. DM: Teacher vs Student Messages
  messages.push(
    {
      id: MESSAGE_IDS.DM_TS_1,
      conversation_id: CONVERSATION_IDS.DM_TEACHER_STUDENT,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: USER_IDS.STUDENT_SDIT_1A_1,
      content: 'Assalamu\'alaikum Ahmad. Ustadz mau mengingatkan untuk mengerjakan tugas tahfidz yang kemarin. Jangan lupa bawa mushaf besok ya.',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({ '👍': [USER_IDS.STUDENT_SDIT_1A_1] }),
      is_read: true,
      read_at: new Date('2024-12-15T09:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.DM_TS_1}`,
      created_at: new Date('2024-12-15T08:30:00Z'),
      updated_at: new Date('2024-12-15T08:30:00Z')
    },
    {
      id: MESSAGE_IDS.DM_TS_2,
      conversation_id: CONVERSATION_IDS.DM_TEACHER_STUDENT,
      sender_id: USER_IDS.STUDENT_SDIT_1A_1,
      receiver_id: USER_IDS.TEACHER_SDIT_1,
      content: 'Wa\'alaikumussalam ustadz. Insya Allah, Ahmad sudah mengerjakan tugasnya. Tapi ada beberapa ayat yang masih susah dihafalkan.',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({ '❤️': [USER_IDS.TEACHER_SDIT_1] }),
      is_read: true,
      read_at: new Date('2024-12-15T10:15:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.DM_TS_2}`,
      created_at: new Date('2024-12-15T10:00:00Z'),
      updated_at: new Date('2024-12-15T10:00:00Z')
    },
    {
      id: MESSAGE_IDS.DM_TS_3,
      conversation_id: CONVERSATION_IDS.DM_TEACHER_STUDENT,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: USER_IDS.STUDENT_SDIT_1A_1,
      content: 'Alhamdulillah, bagus Ahmad. Nanti besok setelah sholat Dhuha kita bisa latihan bersama-sama. Semangat terus ya!',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({}),
      is_read: false,
      read_at: null,
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.DM_TS_3}`,
      created_at: new Date('2024-12-20T10:30:00Z'),
      updated_at: new Date('2024-12-20T10:30:00Z')
    }
  );
  
  // 2. DM: Teacher vs Parent Messages
  messages.push(
    {
      id: MESSAGE_IDS.DM_TP_1,
      conversation_id: CONVERSATION_IDS.DM_TEACHER_PARENT,
      sender_id: USER_IDS.TEACHER_SMP_1,
      receiver_id: USER_IDS.PARENT_16,
      content: 'Assalamu\'alaikum Bapak. Saya ustadz Ali, wali kelas Abdullah. Saya ingin memberikan update tentang perkembangan belajar Abdullah di sekolah.',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({ '🤲': [USER_IDS.PARENT_16] }),
      is_read: true,
      read_at: new Date('2024-12-18T11:30:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.DM_TP_1}`,
      created_at: new Date('2024-12-18T09:15:00Z'),
      updated_at: new Date('2024-12-18T09:15:00Z')
    },
    {
      id: MESSAGE_IDS.DM_TP_2,
      conversation_id: CONVERSATION_IDS.DM_TEACHER_PARENT,
      sender_id: USER_IDS.PARENT_16,
      receiver_id: USER_IDS.TEACHER_SMP_1,
      content: 'Wa\'alaikumussalam ustadz. Alhamdulillah, jazakallahu khairan sudah mau memberikan kabar. Bagaimana perkembangan Abdullah? Ada yang perlu diperbaiki?',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({ '👍': [USER_IDS.TEACHER_SMP_1] }),
      is_read: true,
      read_at: new Date('2024-12-19T08:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.DM_TP_2}`,
      created_at: new Date('2024-12-18T20:45:00Z'),
      updated_at: new Date('2024-12-18T20:45:00Z')
    },
    {
      id: MESSAGE_IDS.DM_TP_3,
      conversation_id: CONVERSATION_IDS.DM_TEACHER_PARENT,
      sender_id: USER_IDS.TEACHER_SMP_1,
      receiver_id: USER_IDS.PARENT_16,
      content: 'Alhamdulillah Abdullah menunjukkan perkembangan yang baik, terutama dalam hafalan dan akhlak. Hanya perlu sedikit lebih fokus dalam pelajaran matematika. Mohon bimbingan di rumah juga.',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({}),
      is_read: false,
      read_at: null,
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.DM_TP_3}`,
      created_at: new Date('2024-12-21T14:20:00Z'),
      updated_at: new Date('2024-12-21T14:20:00Z')
    }
  );
  
  // 3. Group: Class 1A Messages (Teachers + Parents)
  messages.push(
    {
      id: MESSAGE_IDS.GRP_1A_1,
      conversation_id: CONVERSATION_IDS.GROUP_CLASS_1A,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: null, // Group message
      content: 'Assalamu\'alaikum ayah bunda semua. Kami ingin menginformasikan jadwal kegiatan tahfidz untuk minggu depan. Mohon anak-anak diberi motivasi untuk rajin mengulang hafalan di rumah.',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({ 
        '👍': [USER_IDS.PARENT_1, USER_IDS.TEACHER_SDIT_2], 
        '🤲': [USER_IDS.PARENT_1] 
      }),
      is_read: true,
      read_at: new Date('2024-12-20T19:30:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_1A_1}`,
      created_at: new Date('2024-12-20T15:30:00Z'),
      updated_at: new Date('2024-12-20T15:30:00Z')
    },
    {
      id: MESSAGE_IDS.GRP_1A_2,
      conversation_id: CONVERSATION_IDS.GROUP_CLASS_1A,
      sender_id: USER_IDS.PARENT_1,
      receiver_id: null,
      content: 'Jazakallahu khairan ustadz atas informasinya. Insya Allah kami akan dukung di rumah. Apakah ada materi khusus yang perlu difokuskan?',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({ '❤️': [USER_IDS.TEACHER_SDIT_1] }),
      is_read: true,
      read_at: new Date('2024-12-21T08:15:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_1A_2}`,
      created_at: new Date('2024-12-20T20:15:00Z'),
      updated_at: new Date('2024-12-20T20:15:00Z')
    },
    {
      id: MESSAGE_IDS.GRP_1A_3,
      conversation_id: CONVERSATION_IDS.GROUP_CLASS_1A,
      sender_id: USER_IDS.TEACHER_SDIT_2,
      receiver_id: null,
      content: 'Untuk minggu ini kita fokus pada Surah Al-Fatihah dan Al-Ikhlas. Anak-anak sudah cukup baik, tinggal mengulang-ulang agar semakin lancar.',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({ '👍': [USER_IDS.PARENT_1], '🤲': [USER_IDS.TEACHER_SDIT_1] }),
      is_read: true,
      read_at: new Date('2024-12-22T07:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_1A_3}`,
      created_at: new Date('2024-12-21T16:20:00Z'),
      updated_at: new Date('2024-12-21T16:20:00Z')
    },
    {
      id: MESSAGE_IDS.GRP_1A_4,
      conversation_id: CONVERSATION_IDS.GROUP_CLASS_1A,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: null,
      content: 'Tambahan info: besok ada kegiatan bersih-bersih kelas bersama. Mohon anak-anak membawa kain lap dan semangat gotong royong. Barakallahu fiikum.',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({}),
      is_read: false,
      read_at: null,
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_1A_4}`,
      created_at: new Date('2024-12-22T16:45:00Z'),
      updated_at: new Date('2024-12-22T16:45:00Z')
    }
  );
  
  // 4. Group: Teachers and Admin Messages
  messages.push(
    {
      id: MESSAGE_IDS.GRP_ADM_1,
      conversation_id: CONVERSATION_IDS.GROUP_TEACHERS_ADMIN,
      sender_id: USER_IDS.ADMIN_SDIT,
      receiver_id: null,
      content: 'Assalamu\'alaikum semua tim guru. Rapat koordinasi bulan ini dijadwalkan hari Jumat setelah sholat Jumat. Mohon kehadiran semua untuk membahas program semester depan.',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({ 
        '👍': [USER_IDS.TEACHER_SDIT_1, USER_IDS.TEACHER_SMP_1], 
        '🤲': [USER_IDS.ADMIN_SMP] 
      }),
      is_read: true,
      read_at: new Date('2024-12-22T08:30:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_ADM_1}`,
      created_at: new Date('2024-12-22T07:15:00Z'),
      updated_at: new Date('2024-12-22T07:15:00Z')
    },
    {
      id: MESSAGE_IDS.GRP_ADM_2,
      conversation_id: CONVERSATION_IDS.GROUP_TEACHERS_ADMIN,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: null,
      content: 'Siap pak ustadz. Apakah ada agenda khusus yang perlu kami persiapkan sebelumnya?',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({ '❤️': [USER_IDS.ADMIN_SDIT] }),
      is_read: true,
      read_at: new Date('2024-12-22T10:45:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_ADM_2}`,
      created_at: new Date('2024-12-22T09:30:00Z'),
      updated_at: new Date('2024-12-22T09:30:00Z')
    },
    {
      id: MESSAGE_IDS.GRP_ADM_3,
      conversation_id: CONVERSATION_IDS.GROUP_TEACHERS_ADMIN,
      sender_id: USER_IDS.ADMIN_SMP,
      receiver_id: null,
      content: 'Kami akan bahas evaluasi pembelajaran semester ini dan rencana peningkatan kualitas untuk semester depan. Mohon disiapkan laporan perkembangan siswa masing-masing.',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({ '👍': [USER_IDS.TEACHER_SDIT_1, USER_IDS.TEACHER_SMP_1] }),
      is_read: true,
      read_at: new Date('2024-12-23T08:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_ADM_3}`,
      created_at: new Date('2024-12-22T14:20:00Z'),
      updated_at: new Date('2024-12-22T14:20:00Z')
    },
    {
      id: MESSAGE_IDS.GRP_ADM_4,
      conversation_id: CONVERSATION_IDS.GROUP_TEACHERS_ADMIN,
      sender_id: USER_IDS.TEACHER_SMP_1,
      receiver_id: null,
      content: 'Barakallahu fiikum. Saya usulkan kita juga bahas program tahfidz intensif untuk liburan nanti. Banyak orang tua yang bertanya tentang program tambahan.',
      message_type: 'text',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({}),
      is_read: false,
      read_at: null,
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_ADM_4}`,
      created_at: new Date('2024-12-23T11:15:00Z'),
      updated_at: new Date('2024-12-23T11:15:00Z')
    }
  );
  
  await knex('messages').insert(messages);
  
  // Update conversations with last message info
  await knex('conversations').where('id', CONVERSATION_IDS.DM_TEACHER_STUDENT).update({
    last_message_id: MESSAGE_IDS.DM_TS_3,
    last_message_at: new Date('2024-12-20T10:30:00Z'),
    updated_at: new Date('2024-12-20T10:30:00Z')
  });
  
  await knex('conversations').where('id', CONVERSATION_IDS.DM_TEACHER_PARENT).update({
    last_message_id: MESSAGE_IDS.DM_TP_3,
    last_message_at: new Date('2024-12-21T14:20:00Z'),
    updated_at: new Date('2024-12-21T14:20:00Z')
  });
  
  await knex('conversations').where('id', CONVERSATION_IDS.GROUP_CLASS_1A).update({
    last_message_id: MESSAGE_IDS.GRP_1A_4,
    last_message_at: new Date('2024-12-22T16:45:00Z'),
    updated_at: new Date('2024-12-22T16:45:00Z')
  });
  
  await knex('conversations').where('id', CONVERSATION_IDS.GROUP_TEACHERS_ADMIN).update({
    last_message_id: MESSAGE_IDS.GRP_ADM_4,
    last_message_at: new Date('2024-12-23T11:15:00Z'),
    updated_at: new Date('2024-12-23T11:15:00Z')
  });

  console.log('✅ Messages seeded successfully');
  console.log(`   - Total messages: ${messages.length}`);
  console.log('   - DM Teacher ↔ Student: 3 messages');
  console.log('   - DM Teacher ↔ Parent: 3 messages');
  console.log('   - Group Class 1A: 4 messages with reactions');
  console.log('   - Group Teachers/Admin: 4 messages');
  console.log('   - Messages include Islamic greetings and contextual content');
};
