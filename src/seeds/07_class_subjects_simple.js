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
  MATEMATIKA: '60000000-0000-0000-0000-000000000001',
  BAHASA_INDONESIA: '60000000-0000-0000-0000-000000000002',
  BAHASA_INGGRIS: '60000000-0000-0000-0000-000000000003',
  PKN: '60000000-0000-0000-0000-000000000004',
  TEKNOLOGI_INFORMASI: '60000000-0000-0000-0000-000000000005',
  DIROSAH: '60000000-0000-0000-0000-000000000006'
};

const TEACHER_IDS = {
  SDIT: [
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000004'
  ],
  SMP: [
    '20000000-0000-0000-0000-000000000011',
    '20000000-0000-0000-0000-000000000012',
    '20000000-0000-0000-0000-000000000013',
    '20000000-0000-0000-0000-000000000014'
  ]
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('class_subjects').del();
  
  const classSubjects = [];
  
  // Helper function to assign subjects to a class
  const assignSubjectsToClass = (classId, teacherPool, isSDIT = true) => {
    const subjects = Object.values(SUBJECT_IDS);
    
    subjects.forEach((subjectId, index) => {
      // Rotate teachers for variety
      const teacherIndex = index % teacherPool.length;
      const teacherId = teacherPool[teacherIndex];
      
      // Different schedules and hours based on subject
      let hoursPerWeek, schedule;
      const subjectName = Object.keys(SUBJECT_IDS)[index];
      
      switch(subjectName) {
        case 'MATEMATIKA':
          hoursPerWeek = 5;
          schedule = '{"Monday": "07:00-08:30", "Wednesday": "09:00-10:30", "Friday": "07:00-08:30"}';
          break;
        case 'BAHASA_INDONESIA':
          hoursPerWeek = 4;
          schedule = '{"Tuesday": "07:00-08:30", "Thursday": "09:00-10:30"}';
          break;
        case 'BAHASA_INGGRIS':
          hoursPerWeek = isSDIT ? 2 : 3; // More English for SMP
          schedule = '{"Monday": "09:00-10:30", "Friday": "09:00-10:30"}';
          break;
        case 'PKN':
          hoursPerWeek = 2;
          schedule = '{"Wednesday": "07:00-08:30"}';
          break;
        case 'TEKNOLOGI_INFORMASI':
          hoursPerWeek = 2;
          schedule = '{"Thursday": "07:00-08:30"}';
          break;
        case 'DIROSAH':
          hoursPerWeek = 4;
          schedule = '{"Tuesday": "09:00-10:30", "Friday": "10:30-12:00"}';
          break;
        default:
          hoursPerWeek = 3;
          schedule = '{"Monday": "10:30-12:00"}';
      }
      
      classSubjects.push({
        id: uuidv4(),
        class_id: classId,
        subject_id: subjectId,
        teacher_id: teacherId,
        hours_per_week: hoursPerWeek,
        room: `Room ${Math.floor(Math.random() * 20) + 1}`,
        schedule: schedule,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    });
  };
  
  // Assign subjects to all SDIT classes
  const sdItClasses = [
    CLASS_IDS.SDIT_1A, CLASS_IDS.SDIT_2C, CLASS_IDS.SDIT_3D,
    CLASS_IDS.SDIT_4B, CLASS_IDS.SDIT_5A, CLASS_IDS.SDIT_6C
  ];
  
  sdItClasses.forEach(classId => {
    assignSubjectsToClass(classId, TEACHER_IDS.SDIT, true);
  });
  
  // Assign subjects to all SMP classes
  const smpClasses = [
    CLASS_IDS.SMP_7M1, CLASS_IDS.SMP_7MD1, CLASS_IDS.SMP_8M1,
    CLASS_IDS.SMP_8MD1, CLASS_IDS.SMP_9M1, CLASS_IDS.SMP_9MD2
  ];
  
  smpClasses.forEach(classId => {
    assignSubjectsToClass(classId, TEACHER_IDS.SMP, false);
  });
  
  // Insert all class-subject relationships
  await knex('class_subjects').insert(classSubjects);

  console.log('✅ Class-Subject relationships seeded successfully');
  console.log(`   - Total relationships: ${classSubjects.length}`);
  console.log(`   - SDIT classes: 6 × 6 subjects = 36 relationships`);
  console.log(`   - SMP classes: 6 × 6 subjects = 36 relationships`);
  console.log('   - Each subject assigned to a rotating teacher');
  console.log('   - Different hours/week based on subject importance');
  console.log('   - Sample schedules for each subject');
};
