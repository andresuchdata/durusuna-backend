const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get school and user IDs from previous seeds
  const schools = await knex('schools').select('id').limit(2);
  
  if (schools.length === 0) {
    console.log('No schools found. Make sure to run previous seeds first.');
    return;
  }

  const elementarySchoolId = schools[0].id;
  const highSchoolId = schools[1].id;

  // Deletes ALL existing entries
  await knex('classes').del();
  
  // Create class IDs that we'll use consistently
  const primary5AId = '550e8400-e29b-41d4-a716-446655440001';
  const primary6BId = '550e8400-e29b-41d4-a716-446655440002';
  const secondary2AId = '550e8400-e29b-41d4-a716-446655440003';
  const secondary3BId = '550e8400-e29b-41d4-a716-446655440004';
  
  // Elementary School Classes
  await knex('classes').insert([
    {
      id: primary5AId,
      school_id: elementarySchoolId,
      name: 'Primary 5A',
      description: 'Primary Level 5, Section A - Mixed ability class for 10-11 year olds',
      grade_level: 'Primary 5',
      section: 'A',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        class_size_limit: 30,
        homeroom_teacher_required: true,
        parent_notifications: true
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: primary6BId,
      school_id: elementarySchoolId,
      name: 'Primary 6B',
      description: 'Primary Level 6, Section B - Preparing students for secondary education',
      grade_level: 'Primary 6',
      section: 'B',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        class_size_limit: 28,
        homeroom_teacher_required: true,
        parent_notifications: true,
        exam_preparation: true
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // High School Classes
  await knex('classes').insert([
    {
      id: secondary2AId,
      school_id: highSchoolId,
      name: 'Secondary 2A',
      description: 'Secondary Level 2, Section A - Academic stream for 13-14 year olds',
      grade_level: 'Secondary 2',
      section: 'A',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        class_size_limit: 25,
        academic_stream: 'general',
        subject_specialization: false
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: secondary3BId,
      school_id: highSchoolId,
      name: 'Secondary 3B',
      description: 'Secondary Level 3, Section B - Advanced academic preparation',
      grade_level: 'Secondary 3',
      section: 'B',
      academic_year: '2024-2025',
      settings: JSON.stringify({
        class_size_limit: 22,
        academic_stream: 'advanced',
        subject_specialization: true,
        career_guidance: true
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  console.log('✅ Classes seeded successfully');
}; 