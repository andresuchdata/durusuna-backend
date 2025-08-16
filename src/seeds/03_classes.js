const { v4: uuidv4 } = require('uuid');

// Fixed UUIDs for consistent seeding
const SCHOOL_IDS = {
  SDIT: '11111111-1111-1111-1111-111111111111',
  SMP: '22222222-2222-2222-2222-222222222222'
};

const CLASS_IDS = {
  // SDIT Classes
  SDIT_1A: '50000000-0000-0000-0000-000000000001',
  SDIT_2C: '50000000-0000-0000-0000-000000000002',
  SDIT_3D: '50000000-0000-0000-0000-000000000003',
  SDIT_4B: '50000000-0000-0000-0000-000000000004',
  SDIT_5A: '50000000-0000-0000-0000-000000000005',
  SDIT_6C: '50000000-0000-0000-0000-000000000006',
  
  // SMP Classes
  SMP_7M1: '50000000-0000-0000-0000-000000000011',
  SMP_7MD1: '50000000-0000-0000-0000-000000000012',
  SMP_8M1: '50000000-0000-0000-0000-000000000013',
  SMP_8MD1: '50000000-0000-0000-0000-000000000014',
  SMP_9M1: '50000000-0000-0000-0000-000000000015',
  SMP_9MD2: '50000000-0000-0000-0000-000000000016'
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('classes').del();
  
  const classes = [
    // SDIT Classes
    {
      id: CLASS_IDS.SDIT_1A,
      school_id: SCHOOL_IDS.SDIT,
      name: '1A',
      description: 'Kelas 1A - Tahfidz dan Pembelajaran Dasar',
      grade_level: 'Kelas 1',
      section: 'A',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        max_students: 25,
        homeroom_teacher: 'Ustadz Muhammad Rahman',
        schedule: {
          start_time: '07:30',
          end_time: '12:00',
          break_time: '09:30',
          lunch_time: '11:00'
        },
        subjects: ['Bahasa Arab', 'Tahfidz Quran', 'Matematika', 'Bahasa Indonesia', 'IPA']
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: CLASS_IDS.SDIT_2C,
      school_id: SCHOOL_IDS.SDIT,
      name: '2C',
      description: 'Kelas 2C - Penguatan Akhlak dan Literasi',
      grade_level: 'Kelas 2',
      section: 'C',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        max_students: 25,
        homeroom_teacher: 'Ustadzah Siti Aminah',
        schedule: {
          start_time: '07:30',
          end_time: '12:30',
          break_time: '09:30',
          lunch_time: '11:30'
        }
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: CLASS_IDS.SDIT_3D,
      school_id: SCHOOL_IDS.SDIT,
      name: '3D',
      description: 'Kelas 3D - Pengembangan Kreativitas dan Sains',
      grade_level: 'Kelas 3',
      section: 'D',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        max_students: 25,
        homeroom_teacher: 'Ustadz Abdul Hadi'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: CLASS_IDS.SDIT_4B,
      school_id: SCHOOL_IDS.SDIT,
      name: '4B',
      description: 'Kelas 4B - Persiapan Ujian dan Leadership',
      grade_level: 'Kelas 4',
      section: 'B',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        max_students: 25,
        homeroom_teacher: 'Ustadzah Maryam Saleha'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: CLASS_IDS.SDIT_5A,
      school_id: SCHOOL_IDS.SDIT,
      name: '5A',
      description: 'Kelas 5A - Pendalaman Tahfidz dan Akademik',
      grade_level: 'Kelas 5',
      section: 'A',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        max_students: 25,
        homeroom_teacher: 'Ustadz Muhammad Rahman'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: CLASS_IDS.SDIT_6C,
      school_id: SCHOOL_IDS.SDIT,
      name: '6C',
      description: 'Kelas 6C - Persiapan Kelulusan dan Transisi SMP',
      grade_level: 'Kelas 6',
      section: 'C',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        max_students: 25,
        homeroom_teacher: 'Ustadzah Siti Aminah'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // SMP Classes
    {
      id: CLASS_IDS.SMP_7M1,
      school_id: SCHOOL_IDS.SMP,
      name: '7 Makkah 1',
      description: 'Kelas 7 Makkah 1 - Orientasi dan Adaptasi SMP',
      grade_level: 'Kelas 7',
      section: 'Makkah 1',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        max_students: 30,
        homeroom_teacher: 'Ustadz Ali Akbar',
        schedule: {
          start_time: '07:00',
          end_time: '15:00',
          break_time: '09:30',
          lunch_time: '12:00'
        },
        subjects: ['Bahasa Arab', 'Tahfidz Quran', 'Matematika', 'IPA', 'IPS', 'Bahasa Indonesia', 'Bahasa Inggris']
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: CLASS_IDS.SMP_7MD1,
      school_id: SCHOOL_IDS.SMP,
      name: '7 Madinah 1',
      description: 'Kelas 7 Madinah 1 - Pembentukan Karakter Islami',
      grade_level: 'Kelas 7',
      section: 'Madinah 1',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        max_students: 30,
        homeroom_teacher: 'Ustadzah Khadijah Binti'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: CLASS_IDS.SMP_8M1,
      school_id: SCHOOL_IDS.SMP,
      name: '8 Makkah 1',
      description: 'Kelas 8 Makkah 1 - Penguatan Akademik dan Tahfidz',
      grade_level: 'Kelas 8',
      section: 'Makkah 1',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        max_students: 30,
        homeroom_teacher: 'Ustadz Umar Faruq'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: CLASS_IDS.SMP_8MD1,
      school_id: SCHOOL_IDS.SMP,
      name: '8 Madinah 1',
      description: 'Kelas 8 Madinah 1 - Pengembangan Minat dan Bakat',
      grade_level: 'Kelas 8',
      section: 'Madinah 1',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        max_students: 30,
        homeroom_teacher: 'Ustadzah Aisha Radhia'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: CLASS_IDS.SMP_9M1,
      school_id: SCHOOL_IDS.SMP,
      name: '9 Makkah 1',
      description: 'Kelas 9 Makkah 1 - Persiapan Ujian Nasional',
      grade_level: 'Kelas 9',
      section: 'Makkah 1',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        max_students: 30,
        homeroom_teacher: 'Ustadz Ali Akbar'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: CLASS_IDS.SMP_9MD2,
      school_id: SCHOOL_IDS.SMP,
      name: '9 Madinah 2',
      description: 'Kelas 9 Madinah 2 - Persiapan Lanjutan dan Karir',
      grade_level: 'Kelas 9',
      section: 'Madinah 2',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        max_students: 30,
        homeroom_teacher: 'Ustadzah Khadijah Binti'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
  
  await knex('classes').insert(classes);

  console.log('✅ Classes seeded successfully');
  console.log('   SDIT Darel Iman 1 (6 classes):');
  console.log('     - 1A, 2C, 3D, 4B, 5A, 6C');
  console.log('   SMP IT Darel Iman (6 classes):');
  console.log('     - 7 Makkah 1, 7 Madinah 1, 8 Makkah 1, 8 Madinah 1, 9 Makkah 1, 9 Madinah 2');
};