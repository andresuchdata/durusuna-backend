const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get class-subject relationships from previous seeds
  const classSubjects = await knex('class_subjects')
    .join('classes', 'class_subjects.class_id', 'classes.id')
    .join('subjects', 'class_subjects.subject_id', 'subjects.id')
    .select(
      'class_subjects.id as class_subject_id',
      'class_subjects.teacher_id',
      'classes.id as class_id',
      'classes.name as class_name',
      'subjects.name as subject_name',
      'subjects.code'
    )
    .where('class_subjects.is_active', true);

  if (classSubjects.length === 0) {
    console.log('No class-subjects found. Make sure to run previous seeds first.');
    return;
  }

  // Deletes ALL existing entries
  await knex('lessons').del();
  
  const lessons = [];

  // Create 2-3 lessons per class-subject relationship
  classSubjects.forEach((cs, csIndex) => {
    const lessonsPerSubject = 2 + Math.floor(Math.random() * 2); // 2-3 lessons

    for (let index = 0; index < lessonsPerSubject; index++) {
      // Calculate lesson date (spread over 2 weeks)
      const baseDate = new Date('2024-12-01');
      const lessonDate = new Date(baseDate.getTime() + (csIndex * 7 + index * 2) * 24 * 60 * 60 * 1000);

      let lessonTitle, lessonDescription;

      switch (cs.code) {
        case 'MATH':
          lessonTitle = index % 2 === 0 ? 'Introduction to Multiplication' : 'Division and Fractions';
          lessonDescription = index % 2 === 0
            ? 'Learn multiplication tables and basic multiplication concepts'
            : 'Understanding division as inverse of multiplication and introduction to fractions';
          break;

        case 'SCI':
          lessonTitle = index % 2 === 0 ? 'States of Matter' : 'Simple Chemical Reactions';
          lessonDescription = index % 2 === 0
            ? 'Explore solid, liquid, and gas states through experiments'
            : 'Observe safe chemical reactions and understand basic chemistry concepts';
          break;

        case 'ENG':
          lessonTitle = index % 2 === 0 ? 'Creative Writing: Describing Characters' : 'Reading Comprehension: Story Elements';
          lessonDescription = index % 2 === 0
            ? 'Develop character descriptions using vivid adjectives and sensory details'
            : 'Identify plot, characters, setting, and theme in short stories';
          break;

        case 'HIST':
          lessonTitle = index % 2 === 0 ? 'Ancient Civilizations: Mesopotamia' : 'Egyptian Pyramids and Society';
          lessonDescription = index % 2 === 0
            ? 'Discover the first human civilizations in the fertile crescent region'
            : 'Explore ancient Egyptian culture, pyramid construction, and social hierarchy';
          break;

        case 'ART':
          lessonTitle = index % 2 === 0 ? 'Introduction to Color Theory' : 'Basic Drawing Techniques';
          lessonDescription = index % 2 === 0
            ? 'Learn about primary, secondary colors and how they interact'
            : 'Practice basic drawing skills including line, shape, and shading';
          break;

        default:
          lessonTitle = `${cs.subject_name} Lesson ${index + 1}`;
          lessonDescription = `Learning objectives for ${cs.subject_name} in ${cs.class_name}`;
      }

      lessons.push({
        id: uuidv4(),
        class_id: cs.class_id,
        title: lessonTitle,
        description: lessonDescription,
        subject: cs.subject_name,
        start_time: new Date(lessonDate.setHours(9, 0, 0, 0)), // 9:00 AM
        end_time: new Date(lessonDate.setHours(10, 0, 0, 0)), // 10:00 AM
        location: `${cs.class_name} Classroom`,
        status: Math.random() > 0.3 ? 'completed' : 'scheduled', // 70% completed, 30% scheduled
        materials: JSON.stringify([
          'Textbook',
          'Worksheets',
          'Interactive whiteboard',
          'Educational videos'
        ]),
        settings: JSON.stringify({
          recording_enabled: false,
          attendance_required: true,
          homework_assigned: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  });

  // Insert lessons
  if (lessons.length > 0) {
    await knex('lessons').insert(lessons);
    console.log(`✅ Lessons seeded successfully (${lessons.length} lessons)`);
    console.log(`📚 Created lessons for ${classSubjects.length} class-subject combinations`);
  } else {
    console.log('⚠️  No lessons created - missing required data');
  }

  // Export the lesson IDs for use in other seed files
  global.seedData = global.seedData || {};
  global.seedData.lessons = lessons.map(l => l.id);
}; 