const { v4: uuidv4 } = require('uuid');

const SUBJECT_IDS = {
  MATEMATIKA: '60000000-0000-0000-0000-000000000001',
  BAHASA_INDONESIA: '60000000-0000-0000-0000-000000000002',
  BAHASA_INGGRIS: '60000000-0000-0000-0000-000000000003',
  PKN: '60000000-0000-0000-0000-000000000004',
  TEKNOLOGI_INFORMASI: '60000000-0000-0000-0000-000000000005',
  DIROSAH: '60000000-0000-0000-0000-000000000006'
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('subjects').del();
  
  const subjects = [
    {
      id: SUBJECT_IDS.MATEMATIKA,
      name: 'Matematika',
      code: 'MTK',
      category: 'Sains',
      description: 'Mata pelajaran matematika untuk semua tingkat kelas',
      color: '#FF9800',
      icon: 'calculator',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.BAHASA_INDONESIA,
      name: 'Bahasa Indonesia',
      code: 'BI',
      category: 'Bahasa',
      description: 'Mata pelajaran Bahasa Indonesia untuk semua tingkat kelas',
      color: '#F44336',
      icon: 'book',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.BAHASA_INGGRIS,
      name: 'Bahasa Inggris',
      code: 'ENG',
      category: 'Bahasa',
      description: 'Mata pelajaran Bahasa Inggris untuk semua tingkat kelas',
      color: '#2196F3',
      icon: 'language',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.PKN,
      name: 'PKN',
      code: 'PKN',
      category: 'Sosial',
      description: 'Pendidikan Kewarganegaraan untuk semua tingkat kelas',
      color: '#4CAF50',
      icon: 'flag',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.TEKNOLOGI_INFORMASI,
      name: 'Teknologi Informasi',
      code: 'TI',
      category: 'Teknologi',
      description: 'Mata pelajaran Teknologi Informasi dan Komputer',
      color: '#9C27B0',
      icon: 'computer',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SUBJECT_IDS.DIROSAH,
      name: 'Dirosah',
      code: 'DIR',
      category: 'Agama',
      description: 'Pembelajaran Agama Islam mencakup Aqidah, Akhlak, Fiqh, dan Sejarah Islam',
      color: '#607D8B',
      icon: 'mosque',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
  
  // Insert subjects
  await knex('subjects').insert(subjects);

  console.log('✅ Simplified subjects seeded successfully');
  console.log(`   - Total subjects: ${subjects.length}`);
  console.log('   - Categories: Sains, Bahasa, Sosial, Teknologi, Agama');
  console.log('   - Can be assigned to any class via class_subjects mapping');
};
