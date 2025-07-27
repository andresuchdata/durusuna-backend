const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get required data from previous seeds
  const classes = await knex('classes').select('id', 'school_id', 'name').orderBy('created_at');
  const subjects = await knex('subjects').select('id', 'school_id', 'subject_code', 'name').orderBy('created_at');
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

  // Find subjects by subject_code and school
  const mathSubject = subjects.find(s => s.subject_code === 'MATH');
  const scienceSubject = subjects.find(s => s.subject_code === 'SCI');
  const englishSubject = subjects.find(s => s.subject_code === 'ELA');
  const historySubject = subjects.find(s => s.subject_code === 'HIST');
  const artSubject = subjects.find(s => s.subject_code === 'ART');

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
      primary_teacher_id: elementaryTeacher.id,
      hours_per_week: 5,
      classroom: 'Room 5A',
      schedule: JSON.stringify({
        monday: '09:00-10:00',
        tuesday: '09:00-10:00',
        wednesday: '09:00-10:00',
        thursday: '09:00-10:00',
        friday: '09:00-10:00'
      }),
      start_date: new Date('2024-09-01'),
      end_date: new Date('2025-06-30'),
      assessment_methods: JSON.stringify(['quiz', 'test', 'homework', 'project']),
      syllabus: 'Primary 5 Mathematics covering arithmetic, basic geometry, fractions, and word problems.',
      settings: JSON.stringify({
        homework_frequency: 'daily',
        test_frequency: 'weekly'
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
      primary_teacher_id: elementaryTeacher.id,
      hours_per_week: 3,
      classroom: 'Science Lab A',
      schedule: JSON.stringify({
        monday: '14:00-15:00',
        wednesday: '14:00-15:00',
        friday: '14:00-15:00'
      }),
      start_date: new Date('2024-09-01'),
      end_date: new Date('2025-06-30'),
      assessment_methods: JSON.stringify(['observation', 'experiment', 'quiz', 'project']),
      syllabus: 'Primary 5 Science exploring basic physics, chemistry, and biology concepts through hands-on experiments.',
      settings: JSON.stringify({
        lab_equipment_required: true,
        safety_protocols: 'mandatory'
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
      primary_teacher_id: elementaryTeacher.id,
      hours_per_week: 6,
      classroom: 'Room 5A',
      schedule: JSON.stringify({
        monday: '08:00-09:00',
        tuesday: '08:00-09:00',
        wednesday: '08:00-09:00',
        thursday: '08:00-09:00',
        friday: '08:00-09:00',
        friday_extra: '13:00-14:00'
      }),
      start_date: new Date('2024-09-01'),
      end_date: new Date('2025-06-30'),
      assessment_methods: JSON.stringify(['reading_assessment', 'writing_portfolio', 'oral_presentation', 'vocabulary_quiz']),
      syllabus: 'Primary 5 English Language Arts focusing on reading comprehension, creative writing, and oral communication.',
      settings: JSON.stringify({
        reading_level: 'intermediate',
        library_visits: 'weekly'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Primary 6B gets same subjects as Primary 5A
  if (primary6B && mathSubject && elementaryTeacher) {
    classSubjectAssignments.push({
      id: uuidv4(),
      class_id: primary6B.id,
      subject_id: mathSubject.id,
      primary_teacher_id: elementaryTeacher.id,
      hours_per_week: 5,
      classroom: 'Room 6B',
      schedule: JSON.stringify({
        monday: '10:00-11:00',
        tuesday: '10:00-11:00',
        wednesday: '10:00-11:00',
        thursday: '10:00-11:00',
        friday: '10:00-11:00'
      }),
      start_date: new Date('2024-09-01'),
      end_date: new Date('2025-06-30'),
      assessment_methods: JSON.stringify(['quiz', 'test', 'homework', 'project']),
      syllabus: 'Primary 6 Mathematics preparing students for secondary education with advanced arithmetic and basic algebra.',
      settings: JSON.stringify({
        homework_frequency: 'daily',
        exam_preparation: true
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // High School Class-Subject Assignments
  if (secondary2A && historySubject && highSchoolTeacher) {
    classSubjectAssignments.push({
      id: uuidv4(),
      class_id: secondary2A.id,
      subject_id: historySubject.id,
      primary_teacher_id: highSchoolTeacher.id,
      hours_per_week: 4,
      classroom: 'History Room 201',
      schedule: JSON.stringify({
        monday: '09:00-10:00',
        tuesday: '09:00-10:00',
        thursday: '09:00-10:00',
        friday: '09:00-10:00'
      }),
      start_date: new Date('2024-09-01'),
      end_date: new Date('2025-06-30'),
      assessment_methods: JSON.stringify(['essay', 'test', 'research_project', 'presentation']),
      syllabus: 'Secondary 2 World History covering ancient civilizations through modern times.',
      settings: JSON.stringify({
        textbook_required: true,
        field_trips: 'quarterly'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  if (secondary2A && artSubject && highSchoolTeacher) {
    classSubjectAssignments.push({
      id: uuidv4(),
      class_id: secondary2A.id,
      subject_id: artSubject.id,
      primary_teacher_id: highSchoolTeacher.id,
      hours_per_week: 2,
      classroom: 'Art Studio 101',
      schedule: JSON.stringify({
        wednesday: '14:00-16:00'
      }),
      start_date: new Date('2024-09-01'),
      end_date: new Date('2025-06-30'),
      assessment_methods: JSON.stringify(['portfolio', 'practical_exam', 'artist_statement']),
      syllabus: 'Secondary 2 Visual Arts introducing various artistic mediums and techniques.',
      settings: JSON.stringify({
        art_supplies_required: true,
        portfolio_submission: 'end_of_term'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  await knex('class_subjects').insert(classSubjectAssignments);

  console.log('✅ Class-Subjects relationships seeded successfully');
  console.log(`🔗 Created ${classSubjectAssignments.length} class-subject assignments`);
}; 