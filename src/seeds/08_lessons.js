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
      'class_subjects.primary_teacher_id',
      'classes.name as class_name',
      'subjects.name as subject_name',
      'subjects.subject_code'
    )
    .where('class_subjects.is_active', true);

  if (classSubjects.length === 0) {
    console.log('No class-subjects found. Make sure to run previous seeds first.');
    return;
  }

  // Deletes ALL existing entries
  await knex('lessons').del();
  
  const lessons = [];

  // Create sample lessons for each class-subject
  classSubjects.forEach((cs, index) => {
    const baseDate = new Date('2024-09-01');
    const lessonDate = new Date(baseDate);
    lessonDate.setDate(baseDate.getDate() + (index * 7)); // Weekly lessons

    // Create subject-specific lessons
    let lessonTitle, lessonDescription, objectives, materials, homework;

    switch (cs.subject_code) {
      case 'MATH':
        lessonTitle = index % 2 === 0 ? 'Introduction to Multiplication' : 'Division and Fractions';
        lessonDescription = index % 2 === 0 
          ? 'Learn the fundamentals of multiplication with hands-on activities and visual aids.'
          : 'Understanding division and working with simple fractions.';
        objectives = JSON.stringify([
          'Understand multiplication as repeated addition',
          'Solve basic multiplication problems',
          'Apply multiplication in real-world scenarios'
        ]);
        materials = JSON.stringify(['Multiplication charts', 'Counting blocks', 'Worksheets', 'Calculator']);
        homework = 'Complete exercises 1-15 on page 42';
        break;

      case 'SCI':
        lessonTitle = index % 2 === 0 ? 'States of Matter' : 'Simple Machines';
        lessonDescription = index % 2 === 0
          ? 'Explore the three states of matter through experiments and observations.'
          : 'Learn about levers, pulleys, and other simple machines in our daily life.';
        objectives = JSON.stringify([
          'Identify solid, liquid, and gas states',
          'Observe state changes in water',
          'Conduct safe science experiments'
        ]);
        materials = JSON.stringify(['Ice cubes', 'Water', 'Heat source', 'Thermometer', 'Safety goggles']);
        homework = 'Observe and record 5 examples of each state of matter at home';
        break;

      case 'ELA':
        lessonTitle = index % 2 === 0 ? 'Creative Writing: Describing Characters' : 'Reading Comprehension: Story Elements';
        lessonDescription = index % 2 === 0
          ? 'Develop character descriptions using vivid adjectives and sensory details.'
          : 'Identify plot, characters, setting, and theme in short stories.';
        objectives = JSON.stringify([
          'Use descriptive language effectively',
          'Create compelling character profiles',
          'Improve creative writing skills'
        ]);
        materials = JSON.stringify(['Writing journals', 'Character worksheets', 'Sample stories', 'Colored pencils']);
        homework = 'Write a one-page character description of your favorite book character';
        break;

      case 'HIST':
        lessonTitle = index % 2 === 0 ? 'Ancient Civilizations: Mesopotamia' : 'Egyptian Pyramids and Society';
        lessonDescription = index % 2 === 0
          ? 'Discover the first human civilizations in the fertile crescent region.'
          : 'Explore ancient Egyptian culture, pyramid construction, and social hierarchy.';
        objectives = JSON.stringify([
          'Understand early human civilization development',
          'Identify key historical figures and events',
          'Analyze primary source documents'
        ]);
        materials = JSON.stringify(['History textbook', 'Maps', 'Timeline worksheets', 'Documentary video']);
        homework = 'Research and write 2 paragraphs about daily life in ancient Mesopotamia';
        break;

      case 'ART':
        lessonTitle = index % 2 === 0 ? 'Introduction to Color Theory' : 'Basic Drawing Techniques';
        lessonDescription = index % 2 === 0
          ? 'Learn about primary, secondary colors and how they interact.'
          : 'Master fundamental drawing skills including line, shape, and shading.';
        objectives = JSON.stringify([
          'Understand color relationships',
          'Mix colors effectively',
          'Create pleasing color combinations'
        ]);
        materials = JSON.stringify(['Watercolor paints', 'Brushes', 'Color wheel', 'Drawing paper']);
        homework = 'Create a color wheel using paints and practice color mixing';
        break;

      default:
        lessonTitle = `${cs.subject_name} Lesson ${index + 1}`;
        lessonDescription = `Learning objectives for ${cs.subject_name} in ${cs.class_name}`;
        objectives = JSON.stringify(['General learning objective']);
        materials = JSON.stringify(['Basic classroom materials']);
        homework = 'Review today\'s lesson materials';
    }

    lessons.push({
      id: uuidv4(),
      class_subject_id: cs.class_subject_id,
      title: lessonTitle,
      description: lessonDescription,
      start_time: new Date(lessonDate.setHours(9, 0, 0, 0)), // 9:00 AM
      end_time: new Date(lessonDate.setHours(10, 0, 0, 0)), // 10:00 AM
      location: `Room ${cs.class_name}`,
      lesson_objectives: objectives,
      materials: materials,
      homework_assigned: homework,
      homework_due_date: new Date(lessonDate.getTime() + 7 * 24 * 60 * 60 * 1000), // Due in 1 week
      attendance_data: JSON.stringify({
        total_students: Math.floor(Math.random() * 15) + 15, // 15-30 students
        present: Math.floor(Math.random() * 5) + 25, // 25-30 present
        absent: Math.floor(Math.random() * 3), // 0-3 absent
        late: Math.floor(Math.random() * 2) // 0-2 late
      }),
      teacher_notes: `Great engagement from students. ${cs.subject_name} concepts were well understood.`,
      status: Math.random() > 0.2 ? 'completed' : 'scheduled', // 80% completed, 20% scheduled
      settings: JSON.stringify({}),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  });

  await knex('lessons').insert(lessons);

  console.log('✅ Lessons seeded successfully');
  console.log(`📚 Created ${lessons.length} lessons across all class-subjects`);
  console.log('🔗 Lessons now properly linked to class-subjects in the new Subject entity structure');
}; 