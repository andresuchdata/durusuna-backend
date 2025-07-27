const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get school IDs from previous seeds
  const schools = await knex('schools').select('id').limit(2);
  
  if (schools.length === 0) {
    console.log('No schools found. Make sure to run previous seeds first.');
    return;
  }

  const elementarySchoolId = schools[0].id;
  const highSchoolId = schools[1].id;

  // Deletes ALL existing entries
  await knex('subjects').del();
  
  // Create proper UUID subject IDs
  const mathSubjectId = uuidv4();
  const scienceSubjectId = uuidv4();
  const englishSubjectId = uuidv4();
  const historySubjectId = uuidv4();
  const artSubjectId = uuidv4();
  const peSubjectId = uuidv4();

  // Elementary School Subjects
  await knex('subjects').insert([
    {
      id: mathSubjectId,
      school_id: elementarySchoolId,
      name: 'Mathematics',
      description: 'Elementary mathematics covering basic arithmetic, geometry, and problem-solving skills',
      subject_code: 'MATH',
      grade_levels: JSON.stringify(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6']),
      learning_objectives: 'Students will develop numerical fluency, mathematical reasoning, and problem-solving skills appropriate for their grade level.',
      curriculum_standard: 'Common Core Mathematics',
      prerequisites: JSON.stringify([]),
      subject_category: 'STEM',
      total_hours_per_year: 180,
      settings: JSON.stringify({
        requires_calculator: false,
        assessment_types: ['quiz', 'test', 'project', 'homework']
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: scienceSubjectId,
      school_id: elementarySchoolId,
      name: 'Science',
      description: 'Elementary science exploring the natural world through observation and experimentation',
      subject_code: 'SCI',
      grade_levels: JSON.stringify(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6']),
      learning_objectives: 'Students will develop scientific thinking, observation skills, and understanding of basic scientific concepts.',
      curriculum_standard: 'Next Generation Science Standards',
      prerequisites: JSON.stringify([]),
      subject_category: 'STEM',
      total_hours_per_year: 120,
      settings: JSON.stringify({
        requires_lab: true,
        safety_requirements: ['safety_goggles', 'lab_coats'],
        assessment_types: ['observation', 'experiment', 'quiz', 'project']
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: englishSubjectId,
      school_id: elementarySchoolId,
      name: 'English Language Arts',
      description: 'Reading, writing, speaking, and listening skills development',
      subject_code: 'ELA',
      grade_levels: JSON.stringify(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6']),
      learning_objectives: 'Students will develop reading comprehension, writing skills, vocabulary, and oral communication abilities.',
      curriculum_standard: 'Common Core English Language Arts',
      prerequisites: JSON.stringify([]),
      subject_category: 'Language Arts',
      total_hours_per_year: 200,
      settings: JSON.stringify({
        requires_library_access: true,
        assessment_types: ['reading_assessment', 'writing_portfolio', 'oral_presentation', 'vocabulary_quiz']
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // High School Subjects
  await knex('subjects').insert([
    {
      id: historySubjectId,
      school_id: highSchoolId,
      name: 'World History',
      description: 'Comprehensive study of world civilizations and historical events',
      subject_code: 'HIST',
      grade_levels: JSON.stringify(['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
      learning_objectives: 'Students will develop critical thinking about historical events, understand cause and effect relationships, and analyze historical sources.',
      curriculum_standard: 'State History Standards',
      prerequisites: JSON.stringify([]),
      subject_category: 'Social Studies',
      total_hours_per_year: 150,
      settings: JSON.stringify({
        requires_textbook: true,
        assessment_types: ['essay', 'test', 'research_project', 'presentation']
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: artSubjectId,
      school_id: highSchoolId,
      name: 'Visual Arts',
      description: 'Creative expression through various artistic mediums and techniques',
      subject_code: 'ART',
      grade_levels: JSON.stringify(['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
      learning_objectives: 'Students will develop artistic skills, creative expression, and appreciation for visual arts.',
      curriculum_standard: 'National Visual Arts Standards',
      prerequisites: JSON.stringify([]),
      subject_category: 'Arts',
      total_hours_per_year: 90,
      settings: JSON.stringify({
        requires_art_supplies: true,
        assessment_types: ['portfolio', 'practical_exam', 'artist_statement', 'critique']
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: peSubjectId,
      school_id: highSchoolId,
      name: 'Physical Education',
      description: 'Physical fitness, sports skills, and health education',
      subject_code: 'PE',
      grade_levels: JSON.stringify(['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
      learning_objectives: 'Students will develop physical fitness, motor skills, teamwork, and healthy lifestyle habits.',
      curriculum_standard: 'National Physical Education Standards',
      prerequisites: JSON.stringify([]),
      subject_category: 'Physical Education',
      total_hours_per_year: 100,
      settings: JSON.stringify({
        requires_gym_clothes: true,
        requires_medical_clearance: true,
        assessment_types: ['fitness_test', 'skill_demonstration', 'participation', 'written_exam']
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  console.log('✅ Subjects seeded successfully');
  console.log(`📚 Created subjects: Math, Science, English (Elementary) + History, Art, PE (High School)`);
}; 