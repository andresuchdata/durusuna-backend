const { v4: uuidv4 } = require('uuid');

// Import consistent IDs
const CLASS_IDS = {
  SDIT_1A: '50000000-0000-0000-0000-000000000001',
  SDIT_2C: '50000000-0000-0000-0000-000000000002',
  SDIT_3D: '50000000-0000-0000-0000-000000000003',
  SDIT_4B: '50000000-0000-0000-0000-000000000004',
  SDIT_5A: '50000000-0000-0000-0000-000000000005',
  SDIT_6C: '50000000-0000-0000-0000-000000000006',
  SMP_7M1: '50000000-0000-0000-0000-000000000011',
  SMP_7MD1: '50000000-0000-0000-0000-000000000012',
  SMP_8M1: '50000000-0000-0000-0000-000000000013',
  SMP_8MD1: '50000000-0000-0000-0000-000000000014',
  SMP_9M1: '50000000-0000-0000-0000-000000000015',
  SMP_9MD2: '50000000-0000-0000-0000-000000000016'
};

const USER_IDS = {
  TEACHER_SDIT_1: '20000000-0000-0000-0000-000000000001',
  TEACHER_SDIT_2: '20000000-0000-0000-0000-000000000002',
  TEACHER_SDIT_3: '20000000-0000-0000-0000-000000000003',
  TEACHER_SDIT_4: '20000000-0000-0000-0000-000000000004',
  TEACHER_SMP_1: '20000000-0000-0000-0000-000000000011',
  TEACHER_SMP_2: '20000000-0000-0000-0000-000000000012',
  TEACHER_SMP_3: '20000000-0000-0000-0000-000000000013',
  TEACHER_SMP_4: '20000000-0000-0000-0000-000000000014'
};

// Sample class update templates
const CLASS_UPDATE_TEMPLATES = {
  SDIT: [
    {
      type: 'announcement',
      title: 'Pengumuman Kegiatan Tahfidz',
      content: 'Assalamu\'alaikum warahmatullahi wabarakatuh.\n\nBerdasarkan jadwal yang telah disusun, kegiatan tahfidz akan dimulai setelah sholat Dhuha.\n\nMohon para siswa membawa:\n• Mushaf Al-Quran\n• Buku catatan hafalan\n• Semangat untuk belajar\n\nJazakumullahu khairan.',
      isPinned: true
    },
    {
      type: 'homework',
      title: 'Tugas Matematika Bab 3',
      content: 'Ananda diharapkan mengerjakan soal latihan halaman 45-47.\n\nDetail tugas:\n• Kerjakan soal nomor 1-15\n• Tulis di buku tugas matematika\n• Batas pengumpulan: Kamis, 25 Januari 2025\n\nBarakallahu fiikum.',
      isPinned: false
    },
    {
      type: 'reminder',
      title: 'Reminder: Persiapan Ujian Semester',
      content: 'Mengingatkan kepada para siswa untuk mempersiapkan diri menghadapi ujian semester.\n\nMateri yang akan diujikan meliputi seluruh bab yang telah dipelajari.\n\nSemoga Allah mudahkan.',
      isPinned: false
    },
    {
      type: 'event',
      title: 'Peringatan Maulid Nabi Muhammad SAW',
      content: 'Dalam rangka memperingati Maulid Nabi Muhammad SAW, akan diadakan kegiatan:\n\n1) Qira\'ah Al-Quran\n2) Tausiyah tentang akhlak Rasulullah\n3) Salawat bersama\n\nMohon kehadiran semua siswa.',
      isPinned: false
    },
    {
      type: 'announcement',
      title: 'Jadwal Pelajaran Tambahan',
      content: 'Mulai minggu depan akan ada pelajaran tambahan Bahasa Arab.\n\nJadwal:\n• Hari: Sabtu\n• Waktu: 08:00-10:00\n• Tujuan: Memperdalam kemampuan berbahasa Arab\n\nInsya Allah bermanfaat.',
      isPinned: false
    }
  ],
  SMP: [
    {
      type: 'announcement',
      title: 'Pengumuman Libur Hari Raya',
      content: 'Assalamu\'alaikum warahmatullahi wabarakatuh.\n\nDiinformasikan bahwa sekolah akan libur dalam rangka Hari Raya Idul Fitri selama 2 minggu.\n\nKegiatan pembelajaran akan dimulai kembali setelah libur.\n\nTaqabbalallahu minna wa minkum.',
      isPinned: true
    },
    {
      type: 'homework',
      title: 'Proyek IPA: Sistem Tata Surya',
      content: 'Tugas proyek IPA untuk materi Sistem Tata Surya.\n\nInstruksi:\n• Buatlah model tata surya sederhana\n• Gunakan bahan-bahan yang mudah didapat\n• Presentasi akan dilakukan minggu depan\n\nSemoga sukses!',
      isPinned: false
    },
    {
      type: 'reminder',
      title: 'Persiapan Ujian Nasional',
      content: 'Bagi siswa kelas 9, mohon untuk serius mempersiapkan diri menghadapi Ujian Nasional.\n\nTips:\n• Manfaatkan waktu belajar dengan baik\n• Konsultasi bisa dilakukan setiap hari Rabu setelah sholat Ashar\n\nSemoga Allah mudahkan.',
      isPinned: false
    },
    {
      type: 'event',
      title: 'Kompetisi Tahfidz Antar Kelas',
      content: 'Akan diadakan kompetisi tahfidz antar kelas tingkat SMP.\n\nKetentuan:\n• Setiap kelas mengirimkan 3 perwakilan terbaik\n• Pendaftaran dibuka sampai akhir bulan ini\n\nBarakallahu fiikum.',
      isPinned: false
    },
    {
      type: 'announcement',
      title: 'Program Bimbingan Konseling',
      content: 'Bagi siswa yang memerlukan bimbingan terkait pilihan karir atau masalah pribadi, dapat menemui guru BK.\n\nJadwal:\n• Hari: Senin-Kamis\n• Waktu: 13:00-15:00\n\nSemua akan dijaga kerahasiaannya.',
      isPinned: false
    }
  ]
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('class_updates').del();
  
  const classUpdates = [];
  const allClassIds = Object.values(CLASS_IDS);
  
  // Create 5 updates for each class (1 pinned + 4 regular)
  allClassIds.forEach((classId, classIndex) => {
    const isSDIT = classId.includes('000000000001') || classId.includes('000000000002') || 
                   classId.includes('000000000003') || classId.includes('000000000004') || 
                   classId.includes('000000000005') || classId.includes('000000000006');
    
    const templates = isSDIT ? CLASS_UPDATE_TEMPLATES.SDIT : CLASS_UPDATE_TEMPLATES.SMP;
    const teacherIds = isSDIT ? 
      [USER_IDS.TEACHER_SDIT_1, USER_IDS.TEACHER_SDIT_2, USER_IDS.TEACHER_SDIT_3, USER_IDS.TEACHER_SDIT_4] :
      [USER_IDS.TEACHER_SMP_1, USER_IDS.TEACHER_SMP_2, USER_IDS.TEACHER_SMP_3, USER_IDS.TEACHER_SMP_4];
    
    templates.forEach((template, templateIndex) => {
      // Assign one teacher per class to avoid duplicates
      const teacherIndex = classIndex % teacherIds.length;
      const authorId = teacherIds[teacherIndex];
      const createdDate = new Date(2024, 11, 15 + templateIndex * 2); // Spread updates over time
      
      classUpdates.push({
        id: uuidv4(),
        class_id: classId,
        author_id: authorId,
        title: template.title,
        content: template.content,
        update_type: template.type,
        attachments: JSON.stringify([]),
        reactions: JSON.stringify({
          '👍': Math.floor(Math.random() * 8) + 1,
          '❤️': Math.floor(Math.random() * 5) + 1,
          '🤲': Math.floor(Math.random() * 3) + 1
        }),
        is_pinned: template.isPinned,
        is_edited: false,
        is_deleted: false,
        created_at: createdDate,
        updated_at: createdDate
      });
    });
  });
  
  await knex('class_updates').insert(classUpdates);

  console.log('✅ Class updates seeded successfully');
  console.log(`   - Total updates: ${classUpdates.length}`);
  console.log(`   - 5 updates per class (1 pinned + 4 regular)`);
  console.log(`   - Mix of announcements, homework, reminders, and events`);
  console.log(`   - Islamic content appropriate for each school level`);
};
