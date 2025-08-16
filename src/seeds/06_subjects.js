const { v4: uuidv4 } = require('uuid');

const SCHOOL_IDS = {
  SDIT: '11111111-1111-1111-1111-111111111111',
  SMP: '22222222-2222-2222-2222-222222222222'
};

const SUBJECT_IDS = {
  // SDIT Subjects
  SDIT_BAHASA_ARAB: '60000000-0000-0000-0000-000000000001',
  SDIT_TAHFIDZ: '60000000-0000-0000-0000-000000000002',
  SDIT_MATEMATIKA: '60000000-0000-0000-0000-000000000003',
  SDIT_BAHASA_INDONESIA: '60000000-0000-0000-0000-000000000004',
  SDIT_IPA: '60000000-0000-0000-0000-000000000005',
  SDIT_IPS: '60000000-0000-0000-0000-000000000006',
  SDIT_AKIDAH_AKHLAK: '60000000-0000-0000-0000-000000000007',
  SDIT_FIQH: '60000000-0000-0000-0000-000000000008',
  SDIT_SEJARAH_ISLAM: '60000000-0000-0000-0000-000000000009',
  
  // SMP Subjects
  SMP_BAHASA_ARAB: '60000000-0000-0000-0000-000000000011',
  SMP_TAHFIDZ: '60000000-0000-0000-0000-000000000012',
  SMP_MATEMATIKA: '60000000-0000-0000-0000-000000000013',
  SMP_BAHASA_INDONESIA: '60000000-0000-0000-0000-000000000014',
  SMP_BAHASA_INGGRIS: '60000000-0000-0000-0000-000000000015',
  SMP_IPA: '60000000-0000-0000-0000-000000000016',
  SMP_IPS: '60000000-0000-0000-0000-000000000017',
  SMP_AKIDAH_AKHLAK: '60000000-0000-0000-0000-000000000018',
  SMP_FIQH: '60000000-0000-0000-0000-000000000019',
  SMP_SEJARAH_ISLAM: '60000000-0000-0000-0000-000000000020',
  SMP_QURAN_HADITS: '60000000-0000-0000-0000-000000000021',
  SMP_SKI: '60000000-0000-0000-0000-000000000022'
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('subjects').del();
  
  const subjects = [
    // SDIT Subjects
    {
      id: SUBJECT_IDS.SDIT_BAHASA_ARAB,
      school_id: SCHOOL_IDS.SDIT,
      name: 'Bahasa Arab',
      code: 'AR-SDIT',
      description: 'Pembelajaran Bahasa Arab untuk tingkat dasar dengan fokus pada kosakata dan percakapan sehari-hari',
      category: 'Bahasa',
      color: '#4CAF50',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SDIT_TAHFIDZ,
      school_id: SCHOOL_IDS.SDIT,
      name: 'Tahfidz Quran',
      code: 'TH-SDIT',
      description: 'Program menghafal Al-Quran dengan target sesuai tingkat kelas',
      category: 'Agama',
      color: '#2196F3',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SDIT_MATEMATIKA,
      school_id: SCHOOL_IDS.SDIT,
      name: 'Matematika',
      code: 'MTK-SDIT',
      description: 'Matematika dasar dengan pendekatan pembelajaran yang menyenangkan',
      category: 'Sains',
      color: '#FF9800',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SDIT_BAHASA_INDONESIA,
      school_id: SCHOOL_IDS.SDIT,
      name: 'Bahasa Indonesia',
      code: 'BI-SDIT',
      description: 'Pembelajaran Bahasa Indonesia untuk kemampuan membaca, menulis, dan berkomunikasi',
      category: 'Bahasa',
      color: '#E91E63',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SDIT_IPA,
      school_id: SCHOOL_IDS.SDIT,
      name: 'Ilmu Pengetahuan Alam',
      code: 'IPA-SDIT',
      description: 'Pengenalan sains dasar dengan eksperimen sederhana',
      category: 'Sains',
      color: '#009688',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SDIT_IPS,
      school_id: SCHOOL_IDS.SDIT,
      name: 'Ilmu Pengetahuan Sosial',
      code: 'IPS-SDIT',
      description: 'Pembelajaran tentang masyarakat, budaya, dan lingkungan sosial',
      category: 'Sosial',
      color: '#795548',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SDIT_AKIDAH_AKHLAK,
      school_id: SCHOOL_IDS.SDIT,
      name: 'Akidah Akhlak',
      code: 'AA-SDIT',
      description: 'Pembentukan karakter dan akhlak mulia berdasarkan ajaran Islam',
      category: 'Agama',
      color: '#673AB7',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SDIT_FIQH,
      school_id: SCHOOL_IDS.SDIT,
      name: 'Fiqh',
      code: 'FQ-SDIT',
      description: 'Pembelajaran fiqh ibadah sesuai tingkat usia anak',
      category: 'Agama',
      color: '#3F51B5',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SDIT_SEJARAH_ISLAM,
      school_id: SCHOOL_IDS.SDIT,
      name: 'Sejarah Kebudayaan Islam',
      code: 'SKI-SDIT',
      description: 'Pengenalan sejarah Islam dengan cerita-cerita menarik',
      category: 'Agama',
      color: '#607D8B',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // SMP Subjects
    {
      id: SUBJECT_IDS.SMP_BAHASA_ARAB,
      school_id: SCHOOL_IDS.SMP,
      name: 'Bahasa Arab',
      code: 'AR-SMP',
      description: 'Bahasa Arab tingkat menengah dengan penekanan pada tata bahasa dan sastra',
      category: 'Bahasa',
      color: '#4CAF50',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SMP_TAHFIDZ,
      school_id: SCHOOL_IDS.SMP,
      name: 'Tahfidz Quran',
      code: 'TH-SMP',
      description: 'Program tahfidz lanjutan dengan target hafalan yang lebih tinggi',
      category: 'Agama',
      color: '#2196F3',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SMP_MATEMATIKA,
      school_id: SCHOOL_IDS.SMP,
      name: 'Matematika',
      code: 'MTK-SMP',
      description: 'Matematika tingkat SMP dengan materi aljabar, geometri, dan statistika',
      category: 'Sains',
      color: '#FF9800',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SMP_BAHASA_INDONESIA,
      school_id: SCHOOL_IDS.SMP,
      name: 'Bahasa Indonesia',
      code: 'BI-SMP',
      description: 'Bahasa Indonesia tingkat menengah dengan fokus pada sastra dan keterampilan berbahasa',
      category: 'Bahasa',
      color: '#E91E63',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SMP_BAHASA_INGGRIS,
      school_id: SCHOOL_IDS.SMP,
      name: 'Bahasa Inggris',
      code: 'ENG-SMP',
      description: 'Bahasa Inggris dengan kemampuan listening, speaking, reading, writing',
      category: 'Bahasa',
      color: '#FF5722',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SMP_IPA,
      school_id: SCHOOL_IDS.SMP,
      name: 'Ilmu Pengetahuan Alam',
      code: 'IPA-SMP',
      description: 'IPA terpadu meliputi Fisika, Kimia, dan Biologi',
      category: 'Sains',
      color: '#009688',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SMP_IPS,
      school_id: SCHOOL_IDS.SMP,
      name: 'Ilmu Pengetahuan Sosial',
      code: 'IPS-SMP',
      description: 'IPS terpadu meliputi Sejarah, Geografi, Ekonomi, dan Sosiologi',
      category: 'Sosial',
      color: '#795548',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SMP_AKIDAH_AKHLAK,
      school_id: SCHOOL_IDS.SMP,
      name: 'Akidah Akhlak',
      code: 'AA-SMP',
      description: 'Pendalaman akidah dan akhlak untuk remaja',
      category: 'Agama',
      color: '#673AB7',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SMP_FIQH,
      school_id: SCHOOL_IDS.SMP,
      name: 'Fiqh',
      code: 'FQ-SMP',
      description: 'Fiqh tingkat menengah dengan materi muamalah dan ibadah lanjutan',
      category: 'Agama',
      color: '#3F51B5',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SMP_SEJARAH_ISLAM,
      school_id: SCHOOL_IDS.SMP,
      name: 'Sejarah Kebudayaan Islam',
      code: 'SKI-SMP',
      description: 'Sejarah peradaban Islam dan tokoh-tokoh penting',
      category: 'Agama',
      color: '#607D8B',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SMP_QURAN_HADITS,
      school_id: SCHOOL_IDS.SMP,
      name: 'Quran Hadits',
      code: 'QH-SMP',
      description: 'Pembelajaran Al-Quran dan Hadits dengan terjemah dan tafsir sederhana',
      category: 'Agama',
      color: '#8BC34A',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.SMP_SKI,
      school_id: SCHOOL_IDS.SMP,
      name: 'Sejarah Kebudayaan Islam',
      code: 'SKI2-SMP',
      description: 'Sejarah perkembangan Islam di Indonesia dan dunia',
      category: 'Agama',
      color: '#607D8B',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
  
  await knex('subjects').insert(subjects);

  console.log('✅ Subjects seeded successfully');
  console.log('   SDIT: 9 subjects (Islamic + General)');
  console.log('   SMP: 12 subjects (Islamic + General + English)');
};
