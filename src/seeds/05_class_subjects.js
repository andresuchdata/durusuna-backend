const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get required data from previous seeds
  const classes = await knex('classes').select('id', 'school_id', 'name').orderBy('created_at');
  const subjects = await knex('subjects').select('id', 'code', 'name').orderBy('created_at');
  const teachers = await knex('users').where('user_type', 'teacher').select('id', 'school_id').orderBy('created_at');
  
  if (classes.length === 0 || subjects.length === 0 || teachers.length === 0) {
    console.log('Missing required data. Make sure classes, subjects, and users are seeded first.');
    return;
  }

  // Get specific classes and subjects by their identifiers
  const primary5A = classes.find(c => c.id === '550e8400-e29b-41d4-a716-446655440001');
  const primary6B = classes.find(c => c.id === '550e8400-e29b-41d4-a716-446655440002');
  const secondary2A = classes.find(c => c.id === '550e8400-e29b-41d4-a716-446655440003');
  const secondary3B = classes.find(c => c.id === '550e8400-e29b-41d4-a716-446655440004');

  // Find subjects by code
  const mathSubject = subjects.find(s => s.code === 'MATH');
  const scienceSubject = subjects.find(s => s.code === 'SCI');
  const englishSubject = subjects.find(s => s.code === 'ENG');
  const historySubject = subjects.find(s => s.code === 'HIST');
  const artSubject = subjects.find(s => s.code === 'ART');

  // Get teachers by school
  const elementaryTeacher = teachers.find(t => t.school_id === primary5A?.school_id);
  const highSchoolTeacher = teachers.find(t => t.school_id === secondary2A?.school_id);

  // Deletes ALL existing entries
  await knex('class_subjects').del();
  
  const classSubjectAssignments = [];

  // Elementary School Class-Subject Assignments
  if (primary5A && mathSubject && elementaryTeacher) {
    classSubjectAssignments.push({
      id: uuidv4(),
      class_id: primary5A.id,
      subject_id: mathSubject.id,
      teacher_id: elementaryTeacher.id,
      hours_per_week: 5,
      room: 'Room 5A',
      schedule: JSON.stringify({
        monday: '09:00-10:00',
        tuesday: '09:00-10:00',
        wednesday: '09:00-10:00',
        thursday: '09:00-10:00',
        friday: '09:00-10:00'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  if (primary5A && scienceSubject && elementaryTeacher) {
    classSubjectAssignments.push({
      id: uuidv4(),
      class_id: primary5A.id,
      subject_id: scienceSubject.id,
      teacher_id: elementaryTeacher.id,
      hours_per_week: 3,
      room: 'Science Lab A',
      schedule: JSON.stringify({
        monday: '14:00-15:00',
        wednesday: '14:00-15:00',
        friday: '14:00-15:00'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  if (primary5A && englishSubject && elementaryTeacher) {
    classSubjectAssignments.push({
      id: uuidv4(),
      class_id: primary5A.id,
      subject_id: englishSubject.id,
      teacher_id: elementaryTeacher.id,
      hours_per_week: 4,
      room: 'Room 5A',
      schedule: JSON.stringify({
        monday: '10:30-11:30',
        tuesday: '10:30-11:30',
        thursday: '10:30-11:30',
        friday: '10:30-11:30'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Primary 6B Class Assignments
  if (primary6B && mathSubject && elementaryTeacher) {
    classSubjectAssignments.push({
      id: uuidv4(),
      class_id: primary6B.id,
      subject_id: mathSubject.id,
      teacher_id: elementaryTeacher.id,
      hours_per_week: 5,
      room: 'Room 6B',
      schedule: JSON.stringify({
        monday: '11:30-12:30',
        tuesday: '11:30-12:30',
        wednesday: '11:30-12:30',
        thursday: '11:30-12:30',
        friday: '11:30-12:30'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  if (primary6B && englishSubject && elementaryTeacher) {
    classSubjectAssignments.push({
      id: uuidv4(),
      class_id: primary6B.id,
      subject_id: englishSubject.id,
      teacher_id: elementaryTeacher.id,
      hours_per_week: 4,
      room: 'Room 6B',
      schedule: JSON.stringify({
        monday: '13:30-14:30',
        tuesday: '13:30-14:30',
        wednesday: '13:30-14:30',
        friday: '13:30-14:30'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // High School Class Assignments
  if (secondary2A && mathSubject && highSchoolTeacher) {
    classSubjectAssignments.push({
      id: uuidv4(),
      class_id: secondary2A.id,
      subject_id: mathSubject.id,
      teacher_id: highSchoolTeacher.id,
      hours_per_week: 6,
      room: 'Math Room 201',
      schedule: JSON.stringify({
        monday: '08:00-09:00',
        tuesday: '08:00-09:00',
        wednesday: '08:00-09:00',
        thursday: '08:00-09:00',
        friday: '08:00-09:00',
        saturday: '08:00-09:00'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  if (secondary2A && historySubject && highSchoolTeacher) {
    classSubjectAssignments.push({
      id: uuidv4(),
      class_id: secondary2A.id,
      subject_id: historySubject.id,
      teacher_id: highSchoolTeacher.id,
      hours_per_week: 3,
      room: 'History Room 202',
      schedule: JSON.stringify({
        monday: '10:00-11:00',
        wednesday: '10:00-11:00',
        friday: '10:00-11:00'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  if (secondary3B && artSubject && highSchoolTeacher) {
    classSubjectAssignments.push({
      id: uuidv4(),
      class_id: secondary3B.id,
      subject_id: artSubject.id,
      teacher_id: highSchoolTeacher.id,
      hours_per_week: 2,
      room: 'Art Studio',
      schedule: JSON.stringify({
        tuesday: '14:00-16:00',
        thursday: '14:00-16:00'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Insert all assignments
  if (classSubjectAssignments.length > 0) {
    await knex('class_subjects').insert(classSubjectAssignments);
    console.log(`✅ Class-Subject assignments seeded successfully (${classSubjectAssignments.length} assignments)`);
  } else {
    console.log('⚠️  No class-subject assignments created - missing required data');
  }

  // Export the assignment IDs for use in other seed files
  global.seedData = global.seedData || {};
  global.seedData.classSubjects = classSubjectAssignments.map(cs => cs.id);
}; 