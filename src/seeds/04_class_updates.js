const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get class and teacher IDs from previous seeds
  const classes = await knex('classes').select('id').limit(3);
  const teachers = await knex('users').where('user_type', 'teacher').select('id').limit(2);
  
  if (classes.length === 0 || teachers.length === 0) {
    console.log('No classes or teachers found. Make sure to run previous seeds first.');
    return;
  }

  // Use the same class IDs as in the class seeds
  const mathClassId = '550e8400-e29b-41d4-a716-446655440001';
  const scienceClassId = '550e8400-e29b-41d4-a716-446655440002';
  const englishClassId = '550e8400-e29b-41d4-a716-446655440003';
  const teacher1Id = teachers[0].id;
  const teacher2Id = teachers[1].id;

  // Clear existing class updates
  await knex('class_updates').del();

  // Create predefined update IDs for easy reference
  const update1Id = uuidv4();
  const update2Id = uuidv4();
  const update3Id = uuidv4();
  const update4Id = uuidv4();
  const update5Id = uuidv4();
  const update6Id = uuidv4();
  const update7Id = uuidv4();
  const update8Id = uuidv4();
  const update9Id = uuidv4();
  const update10Id = uuidv4();

  // Insert class updates
  await knex('class_updates').insert([
    // Mathematics Class Updates
    {
      id: update1Id,
      class_id: mathClassId,
      author_id: teacher1Id,
      title: 'Welcome to Mathematics 5A!',
      content: 'Welcome to our mathematics class! This year we will be covering fractions, decimals, geometry, and basic algebra. Please make sure to bring your textbook, notebook, and calculator to every class. If you have any questions, feel free to ask during class or visit me during office hours.',
      update_type: 'announcement',
      attachments: JSON.stringify([
        {
          fileName: 'Class Syllabus.pdf',
          fileUrl: '/uploads/syllabus_math_5a.pdf',
          fileType: 'application/pdf',
          fileSize: 245760
        },
        {
          fileName: 'Supply List.pdf',
          fileUrl: '/uploads/supply_list_math.pdf',
          fileType: 'application/pdf',
          fileSize: 128456
        }
      ]),
      reactions: JSON.stringify({
        '👍': { count: 8, users: [teacher1Id, teacher2Id, 'user3', 'user4', 'user5', 'user6', 'user7', 'user8'] },
        '📚': { count: 5, users: [teacher1Id, 'user9', 'user10', 'user11', 'user12'] },
        '🎉': { count: 3, users: [teacher2Id, 'user13', 'user14'] }
      }),
      is_pinned: true,
      is_edited: false,
      is_deleted: false,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: update2Id,
      class_id: mathClassId,
      author_id: teacher1Id,
      title: 'Homework: Chapter 3 - Fractions',
      content: 'Please complete exercises 1-15 on pages 45-47 in your textbook. Focus on adding and subtracting fractions with different denominators. Show all your work! Due date is Friday, January 19th. Remember to check your answers using the answer key at the back of the book.',
      update_type: 'homework',
      attachments: JSON.stringify([
        {
          fileName: 'Fraction Worksheet.pdf',
          fileUrl: '/uploads/fraction_worksheet.pdf',
          fileType: 'application/pdf',
          fileSize: 189432
        }
      ]),
      reactions: JSON.stringify({
        '✅': { count: 12, users: [teacher1Id, teacher2Id, 'user15', 'user16', 'user17', 'user18', 'user19', 'user20', 'user21', 'user22', 'user23', 'user24'] },
        '📝': { count: 6, users: [teacher1Id, 'user25', 'user26', 'user27', 'user28', 'user29'] }
      }),
      is_pinned: false,
      is_edited: false,
      is_deleted: false,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: update3Id,
      class_id: mathClassId,
      author_id: teacher1Id,
      title: 'Math Test Next Week',
      content: 'We will have our first math test next Thursday, January 25th. The test will cover chapters 1-3: whole numbers, place value, and fractions. Please review your notes and complete the practice problems I handed out in class. Good luck everyone!',
      update_type: 'reminder',
      attachments: JSON.stringify([
        {
          fileName: 'Test Study Guide.pdf',
          fileUrl: '/uploads/test_study_guide_ch1-3.pdf',
          fileType: 'application/pdf',
          fileSize: 156789
        }
      ]),
      reactions: JSON.stringify({
        '📖': { count: 10, users: [teacher1Id, teacher2Id, 'user30', 'user31', 'user32', 'user33', 'user34', 'user35', 'user36', 'user37'] },
        '💪': { count: 4, users: [teacher1Id, 'user38', 'user39', 'user40'] },
        '😅': { count: 2, users: ['user41', 'user42'] }
      }),
      is_pinned: true,
      is_edited: false,
      is_deleted: false,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },

    // Science Class Updates
    {
      id: update4Id,
      class_id: scienceClassId,
      author_id: teacher1Id,
      title: 'Science Lab Safety Rules',
      content: 'Before we begin our first experiment next week, please review these important safety rules:\n\n1. Always wear safety goggles in the lab\n2. Keep your workspace clean and organized\n3. Never eat or drink in the lab\n4. Report any spills or accidents immediately\n5. Listen to instructions carefully\n\nRemember, safety comes first in our science classroom!',
      update_type: 'announcement',
      attachments: JSON.stringify([
        {
          fileName: 'Lab Safety Rules.pdf',
          fileUrl: '/uploads/lab_safety_rules.pdf',
          fileType: 'application/pdf',
          fileSize: 198765
        },
        {
          fileName: 'Emergency Procedures.pdf',
          fileUrl: '/uploads/emergency_procedures.pdf',
          fileType: 'application/pdf',
          fileSize: 145632
        }
      ]),
      reactions: JSON.stringify({
        '🥽': { count: 15, users: [teacher1Id, teacher2Id, 'user43', 'user44', 'user45', 'user46', 'user47', 'user48', 'user49', 'user50', 'user51', 'user52', 'user53', 'user54', 'user55'] },
        '🔬': { count: 8, users: [teacher1Id, 'user56', 'user57', 'user58', 'user59', 'user60', 'user61', 'user62'] },
        '👍': { count: 12, users: [teacher2Id, 'user63', 'user64', 'user65', 'user66', 'user67', 'user68', 'user69', 'user70', 'user71', 'user72', 'user73'] }
      }),
      is_pinned: true,
      is_edited: false,
      is_deleted: false,
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    },
    {
      id: update5Id,
      class_id: scienceClassId,
      author_id: teacher1Id,
      title: 'Plant Growth Experiment',
      content: 'This week we will start our plant growth experiment! Each student will receive two bean seeds to plant. We will test how different conditions (light vs. dark, water vs. no water) affect plant growth. Make sure to observe your plants daily and record your observations in your science journal.',
      update_type: 'homework',
      attachments: JSON.stringify([
        {
          fileName: 'Observation Chart.pdf',
          fileUrl: '/uploads/plant_observation_chart.pdf',
          fileType: 'application/pdf',
          fileSize: 123456
        },
        {
          fileName: 'Experiment Instructions.pdf',
          fileUrl: '/uploads/plant_experiment_instructions.pdf',
          fileType: 'application/pdf',
          fileSize: 234567
        }
      ]),
      reactions: JSON.stringify({
        '🌱': { count: 18, users: [teacher1Id, teacher2Id, 'user74', 'user75', 'user76', 'user77', 'user78', 'user79', 'user80', 'user81', 'user82', 'user83', 'user84', 'user85', 'user86', 'user87', 'user88', 'user89'] },
        '📊': { count: 7, users: [teacher1Id, 'user90', 'user91', 'user92', 'user93', 'user94', 'user95'] },
        '🧪': { count: 5, users: [teacher2Id, 'user96', 'user97', 'user98', 'user99'] }
      }),
      is_pinned: false,
      is_edited: false,
      is_deleted: false,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: update6Id,
      class_id: scienceClassId,
      author_id: teacher1Id,
      title: 'Science Fair Participation',
      content: 'The annual school science fair is coming up in March! This is a great opportunity to showcase your scientific thinking and creativity. Participation is optional but highly encouraged. Start thinking about what topic interests you most. I will provide more details and project guidelines next week.',
      update_type: 'event',
      attachments: JSON.stringify([]),
      reactions: JSON.stringify({
        '🏆': { count: 9, users: [teacher1Id, teacher2Id, 'user100', 'user101', 'user102', 'user103', 'user104', 'user105', 'user106'] },
        '💡': { count: 6, users: [teacher1Id, 'user107', 'user108', 'user109', 'user110', 'user111'] },
        '🎯': { count: 4, users: [teacher2Id, 'user112', 'user113', 'user114'] }
      }),
      is_pinned: false,
      is_edited: false,
      is_deleted: false,
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000)
    },

    // English Literature Class Updates
    {
      id: update7Id,
      class_id: englishClassId,
      author_id: teacher2Id,
      title: 'Course Introduction - English Literature 10B',
      content: 'Welcome to English Literature 10B! This semester we will explore classic and contemporary works including novels, short stories, poetry, and drama. We will focus on developing critical thinking skills, improving writing techniques, and understanding literary devices. Please purchase the required reading list from the school bookstore.',
      update_type: 'announcement',
      attachments: JSON.stringify([
        {
          fileName: 'Required Reading List.pdf',
          fileUrl: '/uploads/reading_list_10b.pdf',
          fileType: 'application/pdf',
          fileSize: 178934
        },
        {
          fileName: 'Course Outline.pdf',
          fileUrl: '/uploads/english_course_outline.pdf',
          fileType: 'application/pdf',
          fileSize: 267845
        }
      ]),
      reactions: JSON.stringify({
        '📚': { count: 14, users: [teacher2Id, teacher1Id, 'user115', 'user116', 'user117', 'user118', 'user119', 'user120', 'user121', 'user122', 'user123', 'user124', 'user125', 'user126'] },
        '✍️': { count: 8, users: [teacher2Id, 'user127', 'user128', 'user129', 'user130', 'user131', 'user132', 'user133'] },
        '👍': { count: 11, users: [teacher1Id, 'user134', 'user135', 'user136', 'user137', 'user138', 'user139', 'user140', 'user141', 'user142', 'user143'] }
      }),
      is_pinned: true,
      is_edited: false,
      is_deleted: false,
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    },
    {
      id: update8Id,
      class_id: englishClassId,
      author_id: teacher2Id,
      title: 'Reading Assignment: To Kill a Mockingbird - Chapters 1-5',
      content: 'Please read chapters 1-5 of "To Kill a Mockingbird" by Harper Lee for our discussion next Tuesday. As you read, pay attention to the narrator\'s perspective and the setting of the story. Take notes on the main characters and their relationships. We will have a quiz on these chapters next Friday.',
      update_type: 'homework',
      attachments: JSON.stringify([
        {
          fileName: 'Reading Questions Ch 1-5.pdf',
          fileUrl: '/uploads/mockingbird_ch1-5_questions.pdf',
          fileType: 'application/pdf',
          fileSize: 145623
        },
        {
          fileName: 'Character Map Template.pdf',
          fileUrl: '/uploads/character_map_template.pdf',
          fileType: 'application/pdf',
          fileSize: 98765
        }
      ]),
      reactions: JSON.stringify({
        '📖': { count: 16, users: [teacher2Id, teacher1Id, 'user144', 'user145', 'user146', 'user147', 'user148', 'user149', 'user150', 'user151', 'user152', 'user153', 'user154', 'user155', 'user156', 'user157'] },
        '✏️': { count: 9, users: [teacher2Id, 'user158', 'user159', 'user160', 'user161', 'user162', 'user163', 'user164', 'user165'] },
        '🤔': { count: 5, users: [teacher1Id, 'user166', 'user167', 'user168', 'user169'] }
      }),
      is_pinned: false,
      is_edited: false,
      is_deleted: false,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    },
    {
      id: update9Id,
      class_id: englishClassId,
      author_id: teacher2Id,
      title: 'Essay Writing Workshop This Friday',
      content: 'We will have a special essay writing workshop this Friday during class time. We will cover thesis statements, paragraph structure, and citation methods. Please bring your laptops or notebooks. This workshop will help you prepare for your first major essay assignment next month.',
      update_type: 'event',
      attachments: JSON.stringify([
        {
          fileName: 'Essay Writing Guide.pdf',
          fileUrl: '/uploads/essay_writing_guide.pdf',
          fileType: 'application/pdf',
          fileSize: 312456
        }
      ]),
      reactions: JSON.stringify({
        '✍️': { count: 13, users: [teacher2Id, teacher1Id, 'user170', 'user171', 'user172', 'user173', 'user174', 'user175', 'user176', 'user177', 'user178', 'user179', 'user180'] },
        '💻': { count: 8, users: [teacher2Id, 'user181', 'user182', 'user183', 'user184', 'user185', 'user186', 'user187'] },
        '📝': { count: 10, users: [teacher1Id, 'user188', 'user189', 'user190', 'user191', 'user192', 'user193', 'user194', 'user195', 'user196'] }
      }),
      is_pinned: false,
      is_edited: false,
      is_deleted: false,
      created_at: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
      updated_at: new Date(Date.now() - 18 * 60 * 60 * 1000)
    },
    {
      id: update10Id,
      class_id: englishClassId,
      author_id: teacher2Id,
      title: 'Poetry Unit Coming Soon',
      content: 'Next week we will begin our poetry unit! We will study different poetic forms, analyze literary devices, and even try writing our own poems. This unit will help you appreciate the beauty and power of language. Get ready for some creative expression!',
      update_type: 'reminder',
      attachments: JSON.stringify([
        {
          fileName: 'Poetry Terms Glossary.pdf',
          fileUrl: '/uploads/poetry_terms_glossary.pdf',
          fileType: 'application/pdf',
          fileSize: 167890
        }
      ]),
      reactions: JSON.stringify({
        '🎭': { count: 11, users: [teacher2Id, teacher1Id, 'user197', 'user198', 'user199', 'user200', 'user201', 'user202', 'user203', 'user204', 'user205'] },
        '📜': { count: 7, users: [teacher2Id, 'user206', 'user207', 'user208', 'user209', 'user210', 'user211'] },
        '🎨': { count: 9, users: [teacher1Id, 'user212', 'user213', 'user214', 'user215', 'user216', 'user217', 'user218', 'user219'] }
      }),
      is_pinned: false,
      is_edited: false,
      is_deleted: false,
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000)
    }
  ]);

  console.log('Class updates seeded successfully!');
}; 