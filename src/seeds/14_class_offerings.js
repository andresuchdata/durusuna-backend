const { v4: uuidv4 } = require('uuid');

// Fixed IDs from other seed files
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
  // SDIT Teachers
  TEACHER_SDIT_1: '20000000-0000-0000-0000-000000000001', // teacher1@asdf.com
  TEACHER_SDIT_2: '20000000-0000-0000-0000-000000000002', // teacher2@asdf.com
  TEACHER_SDIT_3: '20000000-0000-0000-0000-000000000003', // teacher3@asdf.com
  TEACHER_SDIT_4: '20000000-0000-0000-0000-000000000004', // teacher4@asdf.com
  
  // SMP Teachers
  TEACHER_SMP_1: '20000000-0000-0000-0000-000000000011', // teacher5@asdf.com
  TEACHER_SMP_2: '20000000-0000-0000-0000-000000000012', // teacher6@asdf.com
  TEACHER_SMP_3: '20000000-0000-0000-0000-000000000013', // teacher7@asdf.com
  TEACHER_SMP_4: '20000000-0000-0000-0000-000000000014'  // teacher8@asdf.com
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Delete existing class offerings
  await knex('class_offerings').del();
  
  // Get the current academic period (semester 1)
  const academicPeriod = await knex('academic_periods')
    .where('is_current', true)
    .where('type', 'semester')
    .first();
    
  if (!academicPeriod) {
    console.log('No current academic period found, skipping class offerings seed');
    return;
  }

  const classOfferings = [];
  
  // Helper function to create subject offering
  const createOffering = (classId, subjectId, primaryTeacherId, hoursPerWeek, room) => {
    // Different schedules based on subject and hours
    let schedule = {};
    
    const subjectName = Object.keys(SUBJECT_IDS).find(key => SUBJECT_IDS[key] === subjectId);
    
    switch(subjectName) {
      case 'MATEMATIKA':
        schedule = {
          "Monday": "07:00-08:30",
          "Wednesday": "09:00-10:30", 
          "Friday": "07:00-08:30"
        };
        break;
      case 'BAHASA_INDONESIA':
        schedule = {
          "Tuesday": "07:00-08:30",
          "Thursday": "09:00-10:30"
        };
        break;
      case 'BAHASA_INGGRIS':
        schedule = {
          "Monday": "09:00-10:30",
          "Friday": "09:00-10:30"
        };
        break;
      case 'PKN':
        schedule = {
          "Wednesday": "07:00-08:30"
        };
        break;
      case 'TEKNOLOGI_INFORMASI':
        schedule = {
          "Thursday": "07:00-08:30"
        };
        break;
      case 'DIROSAH':
        schedule = {
          "Tuesday": "09:00-10:30",
          "Friday": "10:30-12:00"
        };
        break;
    }

    return {
      id: uuidv4(),
      class_id: classId,
      subject_id: subjectId,
      academic_period_id: academicPeriod.id,
      primary_teacher_id: primaryTeacherId,
      hours_per_week: hoursPerWeek,
      room: room,
      schedule: JSON.stringify(schedule),
      grading_settings: JSON.stringify({
        participation: 20,
        assignment: 30,
        midterm: 20,
        final: 30
      }),
      grade_display_mode: 'numeric',
      enable_grade_curve: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };
  };

  // SDIT 1A - teacher1@asdf.com gets Matematika, Dirosah, and PKN
  classOfferings.push(
    createOffering(CLASS_IDS.SDIT_1A, SUBJECT_IDS.MATEMATIKA, TEACHER_IDS.TEACHER_SDIT_1, 5, 'Room 1A'),
    createOffering(CLASS_IDS.SDIT_1A, SUBJECT_IDS.DIROSAH, TEACHER_IDS.TEACHER_SDIT_1, 4, 'Room 1A'),
    createOffering(CLASS_IDS.SDIT_1A, SUBJECT_IDS.PKN, TEACHER_IDS.TEACHER_SDIT_1, 2, 'Room 1A'),
    createOffering(CLASS_IDS.SDIT_1A, SUBJECT_IDS.BAHASA_INDONESIA, TEACHER_IDS.TEACHER_SDIT_2, 4, 'Room 1A'),
    createOffering(CLASS_IDS.SDIT_1A, SUBJECT_IDS.BAHASA_INGGRIS, TEACHER_IDS.TEACHER_SDIT_3, 2, 'Room 1A'),
    createOffering(CLASS_IDS.SDIT_1A, SUBJECT_IDS.TEKNOLOGI_INFORMASI, TEACHER_IDS.TEACHER_SDIT_4, 2, 'Lab Komputer')
  );

  // SDIT 5A - teacher1@asdf.com gets Bahasa Indonesia, Teknologi Informasi, and Matematika  
  classOfferings.push(
    createOffering(CLASS_IDS.SDIT_5A, SUBJECT_IDS.BAHASA_INDONESIA, TEACHER_IDS.TEACHER_SDIT_1, 4, 'Room 5A'),
    createOffering(CLASS_IDS.SDIT_5A, SUBJECT_IDS.TEKNOLOGI_INFORMASI, TEACHER_IDS.TEACHER_SDIT_1, 2, 'Lab Komputer'),
    createOffering(CLASS_IDS.SDIT_5A, SUBJECT_IDS.MATEMATIKA, TEACHER_IDS.TEACHER_SDIT_1, 5, 'Room 5A'),
    createOffering(CLASS_IDS.SDIT_5A, SUBJECT_IDS.DIROSAH, TEACHER_IDS.TEACHER_SDIT_2, 4, 'Room 5A'),
    createOffering(CLASS_IDS.SDIT_5A, SUBJECT_IDS.BAHASA_INGGRIS, TEACHER_IDS.TEACHER_SDIT_3, 2, 'Room 5A'),
    createOffering(CLASS_IDS.SDIT_5A, SUBJECT_IDS.PKN, TEACHER_IDS.TEACHER_SDIT_4, 2, 'Room 5A')
  );

  // Other SDIT classes - distribute subjects among teachers
  const otherSDITClasses = [CLASS_IDS.SDIT_2C, CLASS_IDS.SDIT_3D, CLASS_IDS.SDIT_4B, CLASS_IDS.SDIT_6C];
  const sdItTeachers = [TEACHER_IDS.TEACHER_SDIT_1, TEACHER_IDS.TEACHER_SDIT_2, TEACHER_IDS.TEACHER_SDIT_3, TEACHER_IDS.TEACHER_SDIT_4];
  
  otherSDITClasses.forEach((classId, classIndex) => {
    const className = Object.keys(CLASS_IDS).find(key => CLASS_IDS[key] === classId).replace('SDIT_', '');
    const roomName = `Room ${className}`;
    
    Object.values(SUBJECT_IDS).forEach((subjectId, subjectIndex) => {
      // Rotate teachers for variety
      const teacherIndex = (classIndex + subjectIndex) % sdItTeachers.length;
      const teacherId = sdItTeachers[teacherIndex];
      
      const subjectName = Object.keys(SUBJECT_IDS)[subjectIndex];
      const hoursPerWeek = getHoursPerWeek(subjectName, true);
      const room = subjectName === 'TEKNOLOGI_INFORMASI' ? 'Lab Komputer' : roomName;
      
      classOfferings.push(createOffering(classId, subjectId, teacherId, hoursPerWeek, room));
    });
  });

  // SMP classes - similar distribution
  const smpClasses = Object.values(CLASS_IDS).filter(id => id.includes('000000000011') || 
                                                           id.includes('000000000012') || 
                                                           id.includes('000000000013') || 
                                                           id.includes('000000000014') || 
                                                           id.includes('000000000015') || 
                                                           id.includes('000000000016'));
  const smpTeachers = [TEACHER_IDS.TEACHER_SMP_1, TEACHER_IDS.TEACHER_SMP_2, TEACHER_IDS.TEACHER_SMP_3, TEACHER_IDS.TEACHER_SMP_4];
  
  smpClasses.forEach((classId, classIndex) => {
    const className = Object.keys(CLASS_IDS).find(key => CLASS_IDS[key] === classId).replace('SMP_', '');
    const roomName = `Room ${className}`;
    
    Object.values(SUBJECT_IDS).forEach((subjectId, subjectIndex) => {
      const teacherIndex = (classIndex + subjectIndex) % smpTeachers.length;
      const teacherId = smpTeachers[teacherIndex];
      
      const subjectName = Object.keys(SUBJECT_IDS)[subjectIndex];
      const hoursPerWeek = getHoursPerWeek(subjectName, false);
      const room = subjectName === 'TEKNOLOGI_INFORMASI' ? 'Lab Komputer' : roomName;
      
      classOfferings.push(createOffering(classId, subjectId, teacherId, hoursPerWeek, room));
    });
  });

  // Insert all class offerings
  await knex('class_offerings').insert(classOfferings);

  console.log('✅ Class offerings seeded successfully');
  console.log(`   - Total offerings: ${classOfferings.length}`);
  console.log('   - teacher1@asdf.com teaches:');
  console.log('     • Class 1A: Matematika (5h), Dirosah (4h), PKN (2h)');
  console.log('     • Class 5A: Bahasa Indonesia (4h), Teknologi Informasi (2h), Matematika (5h)');
  console.log('   - All other subjects distributed among teachers');
  console.log('   - Academic period: ' + academicPeriod.name);
  console.log('   - Ready for class_offering_teachers assignments');
};

// Helper function to get hours per week for subjects
function getHoursPerWeek(subjectName, isSDIT) {
  switch(subjectName) {
    case 'MATEMATIKA':
      return 5;
    case 'BAHASA_INDONESIA':
      return 4;
    case 'BAHASA_INGGRIS':
      return isSDIT ? 2 : 3; // More English for SMP
    case 'PKN':
      return 2;
    case 'TEKNOLOGI_INFORMASI':
      return 2;
    case 'DIROSAH':
      return 4;
    default:
      return 3;
  }
}
