const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('subjects').del();
  
  // Create proper UUID subject IDs
  const mathSubjectId = uuidv4();
  const scienceSubjectId = uuidv4();
  const englishSubjectId = uuidv4();
  const historySubjectId = uuidv4();
  const artSubjectId = uuidv4();
  const peSubjectId = uuidv4();
  const computerSubjectId = uuidv4();
  const musicSubjectId = uuidv4();

  // Insert subjects using only the columns that exist in the database schema
  await knex('subjects').insert([
    {
      id: mathSubjectId,
      name: 'Mathematics',
      code: 'MATH',
      description: 'Elementary and secondary mathematics covering arithmetic, algebra, geometry, and problem-solving skills',
      color: '#FF6B6B', // Red color for math
      icon: 'calculator',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: scienceSubjectId,
      name: 'Science',
      code: 'SCI',
      description: 'General science including biology, chemistry, physics, and earth science concepts',
      color: '#4ECDC4', // Teal color for science
      icon: 'flask',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: englishSubjectId,
      name: 'English Language Arts',
      code: 'ENG',
      description: 'Reading, writing, speaking, listening, and literature studies',
      color: '#45B7D1', // Blue color for English
      icon: 'book',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: historySubjectId,
      name: 'Social Studies',
      code: 'HIST',
      description: 'History, geography, civics, and social science studies',
      color: '#F7DC6F', // Yellow color for history
      icon: 'globe',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: artSubjectId,
      name: 'Visual Arts',
      code: 'ART',
      description: 'Drawing, painting, sculpture, and visual arts education',
      color: '#BB8FCE', // Purple color for arts
      icon: 'palette',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: peSubjectId,
      name: 'Physical Education',
      code: 'PE',
      description: 'Physical fitness, sports, and health education',
      color: '#58D68D', // Green color for PE
      icon: 'dumbbell',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: computerSubjectId,
      name: 'Computer Science',
      code: 'CS',
      description: 'Programming, computer literacy, and technology education',
      color: '#85C1E9', // Light blue for computer science
      icon: 'laptop',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: musicSubjectId,
      name: 'Music',
      code: 'MUS',
      description: 'Music theory, performance, and appreciation',
      color: '#F8C471', // Orange color for music
      icon: 'music',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  console.log('✅ Subjects seeded successfully');
  
  // Export the subject IDs for use in other seed files
  global.seedData = global.seedData || {};
  global.seedData.subjects = {
    mathSubjectId,
    scienceSubjectId,
    englishSubjectId,
    historySubjectId,
    artSubjectId,
    peSubjectId,
    computerSubjectId,
    musicSubjectId
  };
}; 