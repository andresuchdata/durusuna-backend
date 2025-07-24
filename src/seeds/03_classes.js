const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get school and user IDs from previous seeds
  const schools = await knex('schools').select('id').limit(2);
  const teachers = await knex('users').where('user_type', 'teacher').select('id').limit(2);
  const students = await knex('users').where('user_type', 'student').select('id').limit(2);
  
  if (schools.length === 0 || teachers.length === 0 || students.length === 0) {
    console.log('No schools, teachers, or students found. Make sure to run previous seeds first.');
    return;
  }

  const elementarySchoolId = schools[0].id;
  const highSchoolId = schools[1].id;
  const teacher1Id = teachers[0].id;
  const teacher2Id = teachers[1].id;
  const student1Id = students[0].id; // This will be student@demo.com
  const student2Id = students[1].id; // This will be student2@demo.com

  // Deletes ALL existing entries
  await knex('classes').del();
  
  // Create class IDs that we'll use in the frontend
  const mathClassId = '550e8400-e29b-41d4-a716-446655440001';
  const scienceClassId = '550e8400-e29b-41d4-a716-446655440002';
  const englishClassId = '550e8400-e29b-41d4-a716-446655440003';
  
  // Inserts seed entries
  await knex('classes').insert([
    {
      id: mathClassId,
      school_id: elementarySchoolId,
      name: 'Mathematics 5A',
      description: 'Elementary Mathematics for Grade 5, Section A',
      grade_level: 'Grade 5',
      section: 'A',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        allow_announcements: true,
        allow_homework: true,
        max_students: 30
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: scienceClassId,
      school_id: elementarySchoolId,
      name: 'Science 5A',
      description: 'Elementary Science for Grade 5, Section A',
      grade_level: 'Grade 5',
      section: 'A',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        allow_announcements: true,
        allow_homework: true,
        max_students: 30
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: englishClassId,
      school_id: highSchoolId,
      name: 'English Literature 10B',
      description: 'Advanced English Literature for Grade 10, Section B',
      grade_level: 'Grade 10',
      section: 'B',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        allow_announcements: true,
        allow_homework: true,
        max_students: 25
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // Now create user-class relationships
  await knex('user_classes').del();
  
  await knex('user_classes').insert([
    // Teacher 1 teaches Mathematics and Science
    {
      id: uuidv4(),
      user_id: teacher1Id,
      class_id: mathClassId,
      role_in_class: 'teacher',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      user_id: teacher1Id,
      class_id: scienceClassId,
      role_in_class: 'teacher',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    // Teacher 2 teaches English
    {
      id: uuidv4(),
      user_id: teacher2Id,
      class_id: englishClassId,
      role_in_class: 'teacher',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Students enrolled in classes
    // Student 1 (student@demo.com) in Math class
    {
      id: uuidv4(),
      user_id: student1Id,
      class_id: mathClassId,
      role_in_class: 'student',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    // Student 1 in Science class
    {
      id: uuidv4(),
      user_id: student1Id,
      class_id: scienceClassId,
      role_in_class: 'student',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    // Student 2 (student2@demo.com) in English class
    {
      id: uuidv4(),
      user_id: student2Id,
      class_id: englishClassId,
      role_in_class: 'student',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}; 