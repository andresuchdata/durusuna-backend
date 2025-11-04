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
  STUDENT_SDIT_1A_3: '30000000-0000-0000-0000-000000000003',
  STUDENT_SMP_7M1_1: '30000000-0000-0000-0000-000000000101',
  PARENT_1: '40000000-0000-0000-0000-000000000001',
  PARENT_2: '40000000-0000-0000-0000-000000000002',
  PARENT_4: '40000000-0000-0000-0000-000000000004',
  PARENT_5: '40000000-0000-0000-0000-000000000005',
  PARENT_16: '40000000-0000-0000-0000-000000000016'
};

const CONVERSATION_IDS = {
  DM_TEACHER_STUDENT: '70000000-0000-0000-0000-000000000001',
  DM_TEACHER_PARENT: '70000000-0000-0000-0000-000000000002',
  GROUP_CLASS_1A: '70000000-0000-0000-0000-000000000011',
  GROUP_TEACHERS_ADMIN: '70000000-0000-0000-0000-000000000012',
  GROUP_PARENTS_1A: '70000000-0000-0000-0000-000000000013',
  // Additional conversations
  DM_T1_S3: '70000000-0000-0000-0000-000000000021',
  DM_T1_P2: '70000000-0000-0000-0000-000000000022',
  DM_T1_P4: '70000000-0000-0000-0000-000000000023'
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
    DM_TS_4: uuidv4(),
    DM_TP_1: uuidv4(),
    DM_TP_2: uuidv4(),
    DM_TP_3: uuidv4(),
    DM_TP_4: uuidv4(),
    GRP_1A_1: uuidv4(),
    GRP_1A_2: uuidv4(),
    GRP_1A_3: uuidv4(),
    GRP_1A_4: uuidv4(),
    GRP_ADM_1: uuidv4(),
    GRP_ADM_2: uuidv4(),
    GRP_ADM_3: uuidv4(),
    GRP_ADM_4: uuidv4(),
    GRP_PAR_1: uuidv4(),
    GRP_PAR_2: uuidv4(),
    GRP_PAR_3: uuidv4(),
    GRP_PAR_4: uuidv4(),
    // Additional conversations
    T1S3_1: uuidv4(),
    T1S3_2: uuidv4(),
    T1S3_3: uuidv4(),
    T1S3_4: uuidv4(),
    T1P2_1: uuidv4(),
    T1P2_2: uuidv4(),
    T1P2_3: uuidv4(),
    T1P2_4: uuidv4(),
    T1P4_1: uuidv4(),
    T1P4_2: uuidv4(),
    T1P4_3: uuidv4(),
    T1P4_4: uuidv4()
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
      metadata: JSON.stringify({ attachments: [], reactions: { '👍': [USER_IDS.STUDENT_SDIT_1A_1] } }),
      read_at: new Date('2024-12-15T09:00:00Z'),
      is_deleted: false,
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

      reactions: JSON.stringify({}),
      is_read: false,
      read_at: null,
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.DM_TS_3}`,
      created_at: new Date('2024-12-20T10:30:00Z'),
      updated_at: new Date('2024-12-20T10:30:00Z')
    },
    {
      id: MESSAGE_IDS.DM_TS_4,
      conversation_id: CONVERSATION_IDS.DM_TEACHER_STUDENT,
      sender_id: USER_IDS.STUDENT_SDIT_1A_1,
      receiver_id: USER_IDS.TEACHER_SDIT_1,
      content: 'Baik ustadz, terima kasih. Insya Allah Ahmad akan lebih semangat lagi!',
      message_type: 'text',
      reactions: JSON.stringify({ '🤲': [USER_IDS.TEACHER_SDIT_1] }),
      is_read: true,
      read_at: new Date('2024-12-20T11:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.DM_TS_4}`,
      created_at: new Date('2024-12-20T10:45:00Z'),
      updated_at: new Date('2024-12-20T10:45:00Z')
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

      reactions: JSON.stringify({}),
      is_read: false,
      read_at: null,
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.DM_TP_3}`,
      created_at: new Date('2024-12-21T14:20:00Z'),
      updated_at: new Date('2024-12-21T14:20:00Z')
    },
    {
      id: MESSAGE_IDS.DM_TP_4,
      conversation_id: CONVERSATION_IDS.DM_TEACHER_PARENT,
      sender_id: USER_IDS.PARENT_16,
      receiver_id: USER_IDS.TEACHER_SMP_1,
      content: 'Barakallahu fiikum ustadz. Insya Allah kami akan lebih perhatikan pelajaran matematikanya. Jazakallahu khairan atas bimbingannya.',
      message_type: 'text',
      reactions: JSON.stringify({ '❤️': [USER_IDS.TEACHER_SMP_1] }),
      is_read: true,
      read_at: new Date('2024-12-21T15:30:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.DM_TP_4}`,
      created_at: new Date('2024-12-21T15:00:00Z'),
      updated_at: new Date('2024-12-21T15:00:00Z')
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

      reactions: JSON.stringify({}),
      is_read: false,
      read_at: null,
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_ADM_4}`,
      created_at: new Date('2024-12-23T11:15:00Z'),
      updated_at: new Date('2024-12-23T11:15:00Z')
    }
  );
  
  // 5. Group: Parents of Class 1A Messages
  messages.push(
    {
      id: MESSAGE_IDS.GRP_PAR_1,
      conversation_id: CONVERSATION_IDS.GROUP_PARENTS_1A,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: null,
      content: 'Assalamu\'alaikum ayah bunda semua. Selamat bergabung di group orang tua kelas 1A. Semoga kita bisa saling berkomunikasi dengan baik untuk mendukung perkembangan anak-anak kita.',
      message_type: 'text',
      reactions: JSON.stringify({ 
        '👍': [USER_IDS.PARENT_2, USER_IDS.PARENT_4], 
        '🤲': [USER_IDS.PARENT_5] 
      }),
      is_read: true,
      read_at: new Date('2024-12-01T12:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_PAR_1}`,
      created_at: new Date('2024-12-01T10:30:00Z'),
      updated_at: new Date('2024-12-01T10:30:00Z')
    },
    {
      id: MESSAGE_IDS.GRP_PAR_2,
      conversation_id: CONVERSATION_IDS.GROUP_PARENTS_1A,
      sender_id: USER_IDS.PARENT_2,
      receiver_id: null,
      content: 'Wa\'alaikumussalam ustadz. Alhamdulillah, terima kasih sudah membuat group ini. Sangat membantu untuk koordinasi.',
      message_type: 'text',
      reactions: JSON.stringify({ '❤️': [USER_IDS.TEACHER_SDIT_1, USER_IDS.PARENT_4] }),
      is_read: true,
      read_at: new Date('2024-12-23T08:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_PAR_2}`,
      created_at: new Date('2024-12-23T07:15:00Z'),
      updated_at: new Date('2024-12-23T07:15:00Z')
    },
    {
      id: MESSAGE_IDS.GRP_PAR_3,
      conversation_id: CONVERSATION_IDS.GROUP_PARENTS_1A,
      sender_id: USER_IDS.PARENT_4,
      receiver_id: null,
      content: 'Ustadz, untuk jadwal kegiatan minggu depan apakah ada perubahan? Mohon informasinya.',
      message_type: 'text',
      reactions: JSON.stringify({ '👍': [USER_IDS.PARENT_2, USER_IDS.PARENT_5] }),
      is_read: true,
      read_at: new Date('2024-12-24T08:30:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_PAR_3}`,
      created_at: new Date('2024-12-24T07:45:00Z'),
      updated_at: new Date('2024-12-24T07:45:00Z')
    },
    {
      id: MESSAGE_IDS.GRP_PAR_4,
      conversation_id: CONVERSATION_IDS.GROUP_PARENTS_1A,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: null,
      content: 'Alhamdulillah tidak ada perubahan jadwal. Semua berjalan sesuai rencana. Mohon anak-anak tetap dijaga kesehatannya dan semangat belajarnya. Barakallahu fiikum.',
      message_type: 'text',
      reactions: JSON.stringify({ '🤲': [USER_IDS.PARENT_2, USER_IDS.PARENT_4, USER_IDS.PARENT_5] }),
      is_read: false,
      read_at: null,
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.GRP_PAR_4}`,
      created_at: new Date('2024-12-24T09:30:00Z'),
      updated_at: new Date('2024-12-24T09:30:00Z')
    }
  );
  
  // 6. Additional DM: Teacher1 vs Student1A_3
  messages.push(
    {
      id: MESSAGE_IDS.T1S3_1,
      conversation_id: CONVERSATION_IDS.DM_T1_S3,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: USER_IDS.STUDENT_SDIT_1A_3,
      content: 'Assalamu\'alaikum Fatimah. Alhamdulillah hafalan Fatimah sudah bagus. Terus semangat ya!',
      message_type: 'text',
      reactions: JSON.stringify({ '❤️': [USER_IDS.STUDENT_SDIT_1A_3] }),
      is_read: true,
      read_at: new Date('2024-12-25T09:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.T1S3_1}`,
      created_at: new Date('2024-12-25T08:30:00Z'),
      updated_at: new Date('2024-12-25T08:30:00Z')
    },
    {
      id: MESSAGE_IDS.T1S3_2,
      conversation_id: CONVERSATION_IDS.DM_T1_S3,
      sender_id: USER_IDS.STUDENT_SDIT_1A_3,
      receiver_id: USER_IDS.TEACHER_SDIT_1,
      content: 'Wa\'alaikumussalam ustadz. Jazakallahu khairan. Fatimah akan terus belajar.',
      message_type: 'text',
      reactions: JSON.stringify({ '👍': [USER_IDS.TEACHER_SDIT_1] }),
      is_read: true,
      read_at: new Date('2024-12-25T10:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.T1S3_2}`,
      created_at: new Date('2024-12-25T09:30:00Z'),
      updated_at: new Date('2024-12-25T09:30:00Z')
    },
    {
      id: MESSAGE_IDS.T1S3_3,
      conversation_id: CONVERSATION_IDS.DM_T1_S3,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: USER_IDS.STUDENT_SDIT_1A_3,
      content: 'Besok kita akan muroja\'ah Surah Al-Baqarah ayat 1-5. Mohon dipersiapkan ya.',
      message_type: 'text',
      reactions: JSON.stringify({}),
      is_read: true,
      read_at: new Date('2024-12-26T08:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.T1S3_3}`,
      created_at: new Date('2024-12-26T07:30:00Z'),
      updated_at: new Date('2024-12-26T07:30:00Z')
    },
    {
      id: MESSAGE_IDS.T1S3_4,
      conversation_id: CONVERSATION_IDS.DM_T1_S3,
      sender_id: USER_IDS.STUDENT_SDIT_1A_3,
      receiver_id: USER_IDS.TEACHER_SDIT_1,
      content: 'Baik ustadz, insya Allah siap!',
      message_type: 'text',
      reactions: JSON.stringify({ '🤲': [USER_IDS.TEACHER_SDIT_1] }),
      is_read: false,
      read_at: null,
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.T1S3_4}`,
      created_at: new Date('2024-12-26T08:15:00Z'),
      updated_at: new Date('2024-12-26T08:15:00Z')
    }
  );
  
  // 7. Additional DM: Teacher1 vs Parent2
  messages.push(
    {
      id: MESSAGE_IDS.T1P2_1,
      conversation_id: CONVERSATION_IDS.DM_T1_P2,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: USER_IDS.PARENT_2,
      content: 'Assalamu\'alaikum Bapak/Ibu. Saya ingin memberikan update tentang perkembangan putra/putri Bapak/Ibu di kelas.',
      message_type: 'text',
      reactions: JSON.stringify({ '👍': [USER_IDS.PARENT_2] }),
      is_read: true,
      read_at: new Date('2024-12-24T10:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.T1P2_1}`,
      created_at: new Date('2024-12-24T09:00:00Z'),
      updated_at: new Date('2024-12-24T09:00:00Z')
    },
    {
      id: MESSAGE_IDS.T1P2_2,
      conversation_id: CONVERSATION_IDS.DM_T1_P2,
      sender_id: USER_IDS.PARENT_2,
      receiver_id: USER_IDS.TEACHER_SDIT_1,
      content: 'Wa\'alaikumussalam ustadz. Alhamdulillah, terima kasih. Bagaimana perkembangannya?',
      message_type: 'text',
      reactions: JSON.stringify({ '❤️': [USER_IDS.TEACHER_SDIT_1] }),
      is_read: true,
      read_at: new Date('2024-12-24T11:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.T1P2_2}`,
      created_at: new Date('2024-12-24T10:30:00Z'),
      updated_at: new Date('2024-12-24T10:30:00Z')
    },
    {
      id: MESSAGE_IDS.T1P2_3,
      conversation_id: CONVERSATION_IDS.DM_T1_P2,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: USER_IDS.PARENT_2,
      content: 'Alhamdulillah perkembangannya baik. Anak Bapak/Ibu aktif di kelas dan hafalannya lancar. Terus dukung di rumah ya.',
      message_type: 'text',
      reactions: JSON.stringify({ '🤲': [USER_IDS.PARENT_2] }),
      is_read: true,
      read_at: new Date('2024-12-25T08:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.T1P2_3}`,
      created_at: new Date('2024-12-24T14:00:00Z'),
      updated_at: new Date('2024-12-24T14:00:00Z')
    },
    {
      id: MESSAGE_IDS.T1P2_4,
      conversation_id: CONVERSATION_IDS.DM_T1_P2,
      sender_id: USER_IDS.PARENT_2,
      receiver_id: USER_IDS.TEACHER_SDIT_1,
      content: 'Barakallahu fiikum ustadz. Insya Allah kami akan terus dukung.',
      message_type: 'text',
      reactions: JSON.stringify({}),
      is_read: false,
      read_at: null,
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.T1P2_4}`,
      created_at: new Date('2024-12-25T09:00:00Z'),
      updated_at: new Date('2024-12-25T09:00:00Z')
    }
  );
  
  // 8. Additional DM: Teacher1 vs Parent4
  messages.push(
    {
      id: MESSAGE_IDS.T1P4_1,
      conversation_id: CONVERSATION_IDS.DM_T1_P4,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: USER_IDS.PARENT_4,
      content: 'Assalamu\'alaikum. Mohon maaf mengganggu waktunya. Ada yang ingin saya sampaikan terkait pembelajaran.',
      message_type: 'text',
      reactions: JSON.stringify({ '👍': [USER_IDS.PARENT_4] }),
      is_read: true,
      read_at: new Date('2024-12-26T09:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.T1P4_1}`,
      created_at: new Date('2024-12-26T08:00:00Z'),
      updated_at: new Date('2024-12-26T08:00:00Z')
    },
    {
      id: MESSAGE_IDS.T1P4_2,
      conversation_id: CONVERSATION_IDS.DM_T1_P4,
      sender_id: USER_IDS.PARENT_4,
      receiver_id: USER_IDS.TEACHER_SDIT_1,
      content: 'Wa\'alaikumussalam ustadz. Tidak mengganggu sama sekali. Silakan ustadz.',
      message_type: 'text',
      reactions: JSON.stringify({ '❤️': [USER_IDS.TEACHER_SDIT_1] }),
      is_read: true,
      read_at: new Date('2024-12-26T10:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.T1P4_2}`,
      created_at: new Date('2024-12-26T09:15:00Z'),
      updated_at: new Date('2024-12-26T09:15:00Z')
    },
    {
      id: MESSAGE_IDS.T1P4_3,
      conversation_id: CONVERSATION_IDS.DM_T1_P4,
      sender_id: USER_IDS.TEACHER_SDIT_1,
      receiver_id: USER_IDS.PARENT_4,
      content: 'Minggu depan ada kegiatan field trip ke museum. Mohon persiapkan perlengkapan anak dan izin tertulis.',
      message_type: 'text',
      reactions: JSON.stringify({ '👍': [USER_IDS.PARENT_4] }),
      is_read: true,
      read_at: new Date('2024-12-26T11:00:00Z'),
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.T1P4_3}`,
      created_at: new Date('2024-12-26T10:30:00Z'),
      updated_at: new Date('2024-12-26T10:30:00Z')
    },
    {
      id: MESSAGE_IDS.T1P4_4,
      conversation_id: CONVERSATION_IDS.DM_T1_P4,
      sender_id: USER_IDS.PARENT_4,
      receiver_id: USER_IDS.TEACHER_SDIT_1,
      content: 'Baik ustadz, akan kami siapkan. Jazakallahu khairan atas informasinya.',
      message_type: 'text',
      reactions: JSON.stringify({}),
      is_read: false,
      read_at: null,
      is_deleted: false,
      client_message_id: `client_${MESSAGE_IDS.T1P4_4}`,
      created_at: new Date('2024-12-26T11:30:00Z'),
      updated_at: new Date('2024-12-26T11:30:00Z')
    }
  );
  
  await knex('messages').insert(messages);
  
  // Update conversations with last message info
  await knex('conversations').where('id', CONVERSATION_IDS.DM_TEACHER_STUDENT).update({
    last_message_id: MESSAGE_IDS.DM_TS_4,
    last_message_at: new Date('2024-12-20T10:45:00Z'),
    updated_at: new Date('2024-12-20T10:45:00Z')
  });
  
  await knex('conversations').where('id', CONVERSATION_IDS.DM_TEACHER_PARENT).update({
    last_message_id: MESSAGE_IDS.DM_TP_4,
    last_message_at: new Date('2024-12-21T15:00:00Z'),
    updated_at: new Date('2024-12-21T15:00:00Z')
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
  
  await knex('conversations').where('id', CONVERSATION_IDS.GROUP_PARENTS_1A).update({
    last_message_id: MESSAGE_IDS.GRP_PAR_4,
    last_message_at: new Date('2024-12-24T09:30:00Z'),
    updated_at: new Date('2024-12-24T09:30:00Z')
  });
  
  await knex('conversations').where('id', CONVERSATION_IDS.DM_T1_S3).update({
    last_message_id: MESSAGE_IDS.T1S3_4,
    last_message_at: new Date('2024-12-26T08:15:00Z'),
    updated_at: new Date('2024-12-26T08:15:00Z')
  });
  
  await knex('conversations').where('id', CONVERSATION_IDS.DM_T1_P2).update({
    last_message_id: MESSAGE_IDS.T1P2_4,
    last_message_at: new Date('2024-12-25T09:00:00Z'),
    updated_at: new Date('2024-12-25T09:00:00Z')
  });
  
  await knex('conversations').where('id', CONVERSATION_IDS.DM_T1_P4).update({
    last_message_id: MESSAGE_IDS.T1P4_4,
    last_message_at: new Date('2024-12-26T11:30:00Z'),
    updated_at: new Date('2024-12-26T11:30:00Z')
  });

  console.log('✅ Messages seeded successfully');
  console.log(`   - Total messages: ${messages.length}`);
  console.log('   - DM Teacher ↔ Student: 4 messages');
  console.log('   - DM Teacher ↔ Parent: 4 messages');
  console.log('   - Group Class 1A: 4 messages with reactions');
  console.log('   - Group Teachers/Admin: 4 messages');
  console.log('   - Group Parents 1A: 4 messages');
  console.log('   - Teacher1 additional DMs: 3 conversations × 4 messages = 12 messages');
  console.log('   - All conversations now have at least 4 messages');
  console.log('   - Messages include Islamic greetings and contextual content');
};
