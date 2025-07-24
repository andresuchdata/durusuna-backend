const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get class updates and users from previous seeds
  const classUpdates = await knex('class_updates').select('id', 'class_id').limit(10);
  const teachers = await knex('users').where('user_type', 'teacher').select('id').limit(2);
  const students = await knex('users').where('user_type', 'student').select('id').limit(6);
  
  if (classUpdates.length === 0 || teachers.length === 0) {
    console.log('No class updates or users found. Make sure to run previous seeds first.');
    return;
  }

  // Always create sample students for comments (delete any existing ones first)
  const schools = await knex('schools').select('id').limit(1);
  const schoolId = schools[0].id;

  // Delete existing sample students if they exist
  await knex('users').whereIn('email', [
    'student1@example.com',
    'student2@example.com', 
    'student3@example.com',
    'student4@example.com'
  ]).del();

  // Create fresh sample students
  const student1Id = uuidv4();
  const student2Id = uuidv4();
  const student3Id = uuidv4();
  const student4Id = uuidv4();

  await knex('users').insert([
    {
      id: student1Id,
      email: 'student1@example.com',
      password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewlqNjmKZgG6kl8.',
      first_name: 'Emma',
      last_name: 'Johnson',
      user_type: 'student',
              school_id: schoolId,
        student_id: 'STU001',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: student2Id,
        email: 'student2@example.com',
        password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewlqNjmKZgG6kl8.',
        first_name: 'Liam',
        last_name: 'Smith',
        user_type: 'student',
        school_id: schoolId,
        student_id: 'STU002',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: student3Id,
        email: 'student3@example.com',
        password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewlqNjmKZgG6kl8.',
        first_name: 'Sophia',
        last_name: 'Brown',
        user_type: 'student',
        school_id: schoolId,
        student_id: 'STU003',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: student4Id,
        email: 'student4@example.com',
        password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewlqNjmKZgG6kl8.',
        first_name: 'Noah',
        last_name: 'Davis',
        user_type: 'student',
        school_id: schoolId,
        student_id: 'STU004',
        is_active: true,
        email_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  const studentIds = [student1Id, student2Id, student3Id, student4Id];

  // Enroll students in classes so they can comment
  const mathClassId = '550e8400-e29b-41d4-a716-446655440001';
  const scienceClassId = '550e8400-e29b-41d4-a716-446655440002';
  const englishClassId = '550e8400-e29b-41d4-a716-446655440003';

  // Delete existing student enrollments first
  await knex('user_classes').whereIn('user_id', studentIds).del();

  // Enroll all students in all classes
  const enrollments = [];
  studentIds.forEach(studentId => {
    enrollments.push(
      {
        id: uuidv4(),
        user_id: studentId,
        class_id: mathClassId,
        role_in_class: 'student',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        user_id: studentId,
        class_id: scienceClassId,
        role_in_class: 'student',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        user_id: studentId,
        class_id: englishClassId,
        role_in_class: 'student',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    );
  });

  await knex('user_classes').insert(enrollments);

  const teacher1Id = teachers[0].id;
  const teacher2Id = teachers.length > 1 ? teachers[1].id : teacher1Id;

  // Clear existing comments
  await knex('class_update_comments').del();

  // Get specific update IDs (we'll need to query them since UUIDs are random)
  const mathWelcomeUpdate = await knex('class_updates').where('title', 'Welcome to Mathematics 5A!').first();
  const mathHomeworkUpdate = await knex('class_updates').where('title', 'Homework: Chapter 3 - Fractions').first();
  const mathTestUpdate = await knex('class_updates').where('title', 'Math Test Next Week').first();
  const scienceLabUpdate = await knex('class_updates').where('title', 'Science Lab Safety Rules').first();
  const sciencePlantUpdate = await knex('class_updates').where('title', 'Plant Growth Experiment').first();
  const englishWelcomeUpdate = await knex('class_updates').where('title', 'Course Introduction - English Literature 10B').first();
  const englishReadingUpdate = await knex('class_updates').where('title', 'Reading Assignment: To Kill a Mockingbird - Chapters 1-5').first();

  // Insert comments
  const comments = [];

  if (mathWelcomeUpdate) {
    comments.push(
      {
        id: uuidv4(),
        class_update_id: mathWelcomeUpdate.id,
        author_id: studentIds[0], // Emma
        content: 'I\'m excited for this year! Math is my favorite subject.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        class_update_id: mathWelcomeUpdate.id,
        author_id: studentIds[1], // Liam
        content: 'Do we need to buy a specific type of calculator?',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 3600000), // 6 days ago + 1 hour
        updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 3600000)
      },
      {
        id: uuidv4(),
        class_update_id: mathWelcomeUpdate.id,
        author_id: teacher1Id,
        content: '@Liam A basic scientific calculator will be fine. The TI-30X IIS is recommended.',
        reply_to_id: null, // This would reference Liam's comment in a real implementation
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 7200000), // 6 days ago + 2 hours
        updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 7200000)
      },
      {
        id: uuidv4(),
        class_update_id: mathWelcomeUpdate.id,
        author_id: studentIds[2], // Sophia
        content: 'Thank you for sharing the supply list! Very helpful.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    );
  }

  if (mathHomeworkUpdate) {
    comments.push(
      {
        id: uuidv4(),
        class_update_id: mathHomeworkUpdate.id,
        author_id: studentIds[0], // Emma
        content: 'Is problem #12 supposed to be 3/4 + 1/6? The text is a bit unclear.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        class_update_id: mathHomeworkUpdate.id,
        author_id: teacher1Id,
        content: 'Yes Emma, that\'s correct! 3/4 + 1/6. Remember to find the common denominator first.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1800000), // 2 days ago + 30 minutes
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1800000)
      },
      {
        id: uuidv4(),
        class_update_id: mathHomeworkUpdate.id,
        author_id: studentIds[3], // Noah
        content: 'I\'m finding problem #15 really challenging. Any hints?',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    );
  }

  if (mathTestUpdate) {
    comments.push(
      {
        id: uuidv4(),
        class_update_id: mathTestUpdate.id,
        author_id: studentIds[1], // Liam
        content: 'Will the test be multiple choice or word problems?',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
        updated_at: new Date(Date.now() - 18 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        class_update_id: mathTestUpdate.id,
        author_id: teacher1Id,
        content: 'It will be a mix of both! About 60% calculation problems and 40% word problems.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 17 * 60 * 60 * 1000), // 17 hours ago
        updated_at: new Date(Date.now() - 17 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        class_update_id: mathTestUpdate.id,
        author_id: studentIds[2], // Sophia
        content: 'Good luck everyone! Let\'s study together during lunch.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        updated_at: new Date(Date.now() - 8 * 60 * 60 * 1000)
      }
    );
  }

  if (scienceLabUpdate) {
    comments.push(
      {
        id: uuidv4(),
        class_update_id: scienceLabUpdate.id,
        author_id: studentIds[0], // Emma
        content: 'Are we getting our own safety goggles or will they be provided?',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        class_update_id: scienceLabUpdate.id,
        author_id: teacher1Id,
        content: 'Safety goggles will be provided, but make sure they fit properly before starting any experiment.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 1800000), // 5 days ago + 30 minutes
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 1800000)
      },
      {
        id: uuidv4(),
        class_update_id: scienceLabUpdate.id,
        author_id: studentIds[3], // Noah
        content: 'Safety first! I can\'t wait for our first experiment.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      }
    );
  }

  if (sciencePlantUpdate) {
    comments.push(
      {
        id: uuidv4(),
        class_update_id: sciencePlantUpdate.id,
        author_id: studentIds[2], // Sophia
        content: 'This sounds like fun! I love gardening at home.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 36 * 60 * 60 * 1000), // 36 hours ago
        updated_at: new Date(Date.now() - 36 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        class_update_id: sciencePlantUpdate.id,
        author_id: studentIds[1], // Liam
        content: 'How often should we water the plants?',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
        updated_at: new Date(Date.now() - 30 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        class_update_id: sciencePlantUpdate.id,
        author_id: teacher1Id,
        content: 'Great question Liam! Water them every other day, but check the soil first. It should be moist but not soggy.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 28 * 60 * 60 * 1000), // 28 hours ago
        updated_at: new Date(Date.now() - 28 * 60 * 60 * 1000)
      }
    );
  }

  if (englishWelcomeUpdate) {
    comments.push(
      {
        id: uuidv4(),
        class_update_id: englishWelcomeUpdate.id,
        author_id: studentIds[0], // Emma
        content: 'I\'m really looking forward to reading some classic literature!',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        class_update_id: englishWelcomeUpdate.id,
        author_id: studentIds[1], // Liam
        content: 'Will we be writing essays throughout the semester?',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000), // 7 days ago + 1 hour
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000)
      },
      {
        id: uuidv4(),
        class_update_id: englishWelcomeUpdate.id,
        author_id: teacher2Id,
        content: 'Yes Liam, we\'ll have several essay assignments. They\'ll help you develop your analytical and writing skills.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 5400000), // 7 days ago + 1.5 hours
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 5400000)
      }
    );
  }

  if (englishReadingUpdate) {
    comments.push(
      {
        id: uuidv4(),
        class_update_id: englishReadingUpdate.id,
        author_id: studentIds[2], // Sophia
        content: 'I\'ve read this book before! It\'s amazing. The characters are so well-developed.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        class_update_id: englishReadingUpdate.id,
        author_id: studentIds[3], // Noah
        content: 'Is the quiz going to be open book?',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        class_update_id: englishReadingUpdate.id,
        author_id: teacher2Id,
        content: 'The quiz will be closed book, but you can use your notes. Focus on understanding the themes and character development.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1800000), // 2 days ago + 30 minutes
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1800000)
      },
      {
        id: uuidv4(),
        class_update_id: englishReadingUpdate.id,
        author_id: studentIds[0], // Emma
        content: 'The character map template is really helpful! Thanks for providing it.',
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    );
  }

  // Insert all comments
  if (comments.length > 0) {
    await knex('class_update_comments').insert(comments);
  }

  console.log(`${comments.length} class update comments seeded successfully!`);
}; 