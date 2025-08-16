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
  SMP_QURAN_HADITS: '60000000-0000-0000-0000-000000000021'
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

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('class_subjects').del();
  
  const classSubjects = [];
  
  // SDIT Class-Subject mappings
  const sdItClassSubjects = [
    // Core subjects for all SDIT classes
    {
      subjects: [
        SUBJECT_IDS.SDIT_BAHASA_ARAB,
        SUBJECT_IDS.SDIT_TAHFIDZ,
        SUBJECT_IDS.SDIT_MATEMATIKA,
        SUBJECT_IDS.SDIT_BAHASA_INDONESIA,
        SUBJECT_IDS.SDIT_AKIDAH_AKHLAK
      ],
      classes: [CLASS_IDS.SDIT_1A, CLASS_IDS.SDIT_2C]
    },
    // Advanced subjects for upper classes
    {
      subjects: [
        SUBJECT_IDS.SDIT_BAHASA_ARAB,
        SUBJECT_IDS.SDIT_TAHFIDZ,
        SUBJECT_IDS.SDIT_MATEMATIKA,
        SUBJECT_IDS.SDIT_BAHASA_INDONESIA,
        SUBJECT_IDS.SDIT_IPA,
        SUBJECT_IDS.SDIT_IPS,
        SUBJECT_IDS.SDIT_AKIDAH_AKHLAK,
        SUBJECT_IDS.SDIT_FIQH
      ],
      classes: [CLASS_IDS.SDIT_3D, CLASS_IDS.SDIT_4B, CLASS_IDS.SDIT_5A, CLASS_IDS.SDIT_6C]
    }
  ];
  
  sdItClassSubjects.forEach(mapping => {
    mapping.classes.forEach(classId => {
      mapping.subjects.forEach((subjectId, index) => {
        // Assign different teachers to different subjects
        const teacherId = index % 2 === 0 ? USER_IDS.TEACHER_SDIT_1 : USER_IDS.TEACHER_SDIT_2;
        const hoursPerWeek = subjectId === SUBJECT_IDS.SDIT_TAHFIDZ ? 6 : 
                            subjectId === SUBJECT_IDS.SDIT_MATEMATIKA ? 5 : 
                            subjectId === SUBJECT_IDS.SDIT_BAHASA_INDONESIA ? 4 : 3;
        
        classSubjects.push({
          id: uuidv4(),
          class_id: classId,
          subject_id: subjectId,
          teacher_id: teacherId,
          hours_per_week: hoursPerWeek,
          room: `Ruang ${String.fromCharCode(65 + Math.floor(Math.random() * 6))}${Math.floor(Math.random() * 10) + 1}`,
          schedule: JSON.stringify({
            monday: ['08:00-09:30'],
            tuesday: ['10:00-11:30'],
            wednesday: ['08:00-09:30']
          }),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      });
    });
  });
  
  // SMP Class-Subject mappings
  const smpClassSubjects = [
    // Class 7
    {
      subjects: [
        SUBJECT_IDS.SMP_BAHASA_ARAB,
        SUBJECT_IDS.SMP_TAHFIDZ,
        SUBJECT_IDS.SMP_MATEMATIKA,
        SUBJECT_IDS.SMP_BAHASA_INDONESIA,
        SUBJECT_IDS.SMP_BAHASA_INGGRIS,
        SUBJECT_IDS.SMP_IPA,
        SUBJECT_IDS.SMP_AKIDAH_AKHLAK
      ],
      classes: [CLASS_IDS.SMP_7M1, CLASS_IDS.SMP_7MD1]
    },
    // Class 8
    {
      subjects: [
        SUBJECT_IDS.SMP_BAHASA_ARAB,
        SUBJECT_IDS.SMP_TAHFIDZ,
        SUBJECT_IDS.SMP_MATEMATIKA,
        SUBJECT_IDS.SMP_BAHASA_INDONESIA,
        SUBJECT_IDS.SMP_BAHASA_INGGRIS,
        SUBJECT_IDS.SMP_IPA,
        SUBJECT_IDS.SMP_IPS,
        SUBJECT_IDS.SMP_FIQH
      ],
      classes: [CLASS_IDS.SMP_8M1, CLASS_IDS.SMP_8MD1]
    },
    // Class 9 (full curriculum)
    {
      subjects: [
        SUBJECT_IDS.SMP_BAHASA_ARAB,
        SUBJECT_IDS.SMP_TAHFIDZ,
        SUBJECT_IDS.SMP_MATEMATIKA,
        SUBJECT_IDS.SMP_BAHASA_INDONESIA,
        SUBJECT_IDS.SMP_BAHASA_INGGRIS,
        SUBJECT_IDS.SMP_IPA,
        SUBJECT_IDS.SMP_IPS,
        SUBJECT_IDS.SMP_AKIDAH_AKHLAK,
        SUBJECT_IDS.SMP_FIQH,
        SUBJECT_IDS.SMP_QURAN_HADITS
      ],
      classes: [CLASS_IDS.SMP_9M1, CLASS_IDS.SMP_9MD2]
    }
  ];
  
  smpClassSubjects.forEach(mapping => {
    mapping.classes.forEach(classId => {
      mapping.subjects.forEach((subjectId, index) => {
        // Distribute teachers across subjects
        const teacherIds = [USER_IDS.TEACHER_SMP_1, USER_IDS.TEACHER_SMP_2, USER_IDS.TEACHER_SMP_3, USER_IDS.TEACHER_SMP_4];
        const teacherId = teacherIds[index % teacherIds.length];
        const hoursPerWeek = subjectId === SUBJECT_IDS.SMP_TAHFIDZ ? 6 : 
                            subjectId === SUBJECT_IDS.SMP_MATEMATIKA ? 5 : 
                            subjectId === SUBJECT_IDS.SMP_BAHASA_INDONESIA ? 4 : 
                            subjectId === SUBJECT_IDS.SMP_BAHASA_INGGRIS ? 4 : 3;
        
        classSubjects.push({
          id: uuidv4(),
          class_id: classId,
          subject_id: subjectId,
          teacher_id: teacherId,
          hours_per_week: hoursPerWeek,
          room: `Lab ${String.fromCharCode(65 + Math.floor(Math.random() * 8))}${Math.floor(Math.random() * 5) + 1}`,
          schedule: JSON.stringify({
            monday: ['07:30-09:00'],
            wednesday: ['10:30-12:00'],
            friday: ['13:00-14:30']
          }),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      });
    });
  });
  
  await knex('class_subjects').insert(classSubjects);

  console.log('✅ Class-Subject relationships seeded successfully');
  console.log(`   - Total relationships: ${classSubjects.length}`);
  console.log('   - SDIT: Core + Advanced curriculum by grade');
  console.log('   - SMP: Progressive curriculum from grade 7-9');
  console.log('   - Teachers distributed across subjects');
};
