const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get specific users by email
  const teacherUser = await knex('users').where('email', 'teacher@demo.com').first();
  const studentUser = await knex('users').where('email', 'student@demo.com').first();
  
  if (!teacherUser || !studentUser) {
    console.log('Demo users not found. Please run user seeds first.');
    return;
  }

  console.log(`Found teacher user: ${teacherUser.id}, student user: ${studentUser.id}`);

  // Get class IDs from existing data
  const classes = await knex('classes').select('id').limit(3);
  const classIds = classes.length > 0 ? classes.map(c => c.id) : [];

  // Get conversation IDs from existing data
  const conversations = await knex('conversations').select('id').limit(2);
  const conversationIds = conversations.length > 0 ? conversations.map(c => c.id) : [];

  // Deletes ALL existing entries
  await knex('notifications').del();

  const notifications = [];

  // Create 10 notifications for teacher@demo.com
  notifications.push(
    // Message notifications for teacher
    {
      id: uuidv4(),
      title: 'New message from student',
      content: 'Sarah Wilson sent you a message about yesterday\'s assignment',
      notification_type: 'message',
      priority: 'normal',
      is_read: false,
      user_id: teacherUser.id,
      sender_id: studentUser.id,
      action_data: JSON.stringify({
        conversation_id: conversationIds[0] || uuidv4(),
        message_id: uuidv4()
      }),
      created_at: new Date(Date.now() - 1800000), // 30 minutes ago
      updated_at: new Date(Date.now() - 1800000)
    },
    {
      id: uuidv4(),
      title: 'Parent inquiry',
      content: 'Parent has questions about their child\'s progress in Mathematics',
      notification_type: 'message',
      priority: 'high',
      is_read: false,
      user_id: teacherUser.id,
      sender_id: studentUser.id,
      action_data: JSON.stringify({
        conversation_id: conversationIds[1] || uuidv4(),
        message_id: uuidv4()
      }),
      created_at: new Date(Date.now() - 3600000), // 1 hour ago
      updated_at: new Date(Date.now() - 3600000)
    },

    // Assignment notifications for teacher
    {
      id: uuidv4(),
      title: 'Assignment submitted',
      content: 'John Doe has submitted his Math homework early',
      notification_type: 'assignment',
      priority: 'normal',
      is_read: true,
      user_id: teacherUser.id,
      sender_id: studentUser.id,
      action_data: JSON.stringify({
        assignment_id: uuidv4(),
        class_id: classIds[0] || uuidv4(),
        class_name: 'Mathematics'
      }),
      read_at: new Date(Date.now() - 900000), // Read 15 minutes ago
      created_at: new Date(Date.now() - 7200000), // 2 hours ago
      updated_at: new Date(Date.now() - 900000)
    },
    {
      id: uuidv4(),
      title: 'Assignment deadline approaching',
      content: 'Reminder: Grade submissions are due in 2 days',
      notification_type: 'assignment',
      priority: 'high',
      is_read: false,
      user_id: teacherUser.id,
      action_data: JSON.stringify({
        assignment_id: uuidv4(),
        class_id: classIds[1] || uuidv4(),
        class_name: 'Science'
      }),
      created_at: new Date(Date.now() - 5400000), // 1.5 hours ago
      updated_at: new Date(Date.now() - 5400000)
    },

    // Announcement notifications for teacher
    {
      id: uuidv4(),
      title: 'School board meeting',
      content: 'Monthly faculty meeting scheduled for this Friday at 3 PM',
      notification_type: 'announcement',
      priority: 'normal',
      is_read: false,
      user_id: teacherUser.id,
      action_data: JSON.stringify({
        class_id: classIds[0] || uuidv4(),
        update_id: uuidv4(),
        meeting_date: '2024-02-16'
      }),
      created_at: new Date(Date.now() - 10800000), // 3 hours ago
      updated_at: new Date(Date.now() - 10800000)
    },
    {
      id: uuidv4(),
      title: 'Curriculum update',
      content: 'New mathematics curriculum guidelines have been published',
      notification_type: 'announcement',
      priority: 'high',
      is_read: true,
      user_id: teacherUser.id,
      action_data: JSON.stringify({
        class_id: classIds[1] || uuidv4(),
        update_id: uuidv4(),
        document_type: 'curriculum'
      }),
      read_at: new Date(Date.now() - 1800000), // Read 30 minutes ago
      created_at: new Date(Date.now() - 14400000), // 4 hours ago
      updated_at: new Date(Date.now() - 1800000)
    },

    // Event notifications for teacher
    {
      id: uuidv4(),
      title: 'Professional development workshop',
      content: 'Digital Teaching Tools workshop next Tuesday - registration open',
      notification_type: 'event',
      priority: 'normal',
      is_read: false,
      user_id: teacherUser.id,
      action_data: JSON.stringify({
        event_id: uuidv4(),
        event_date: '2024-02-20',
        event_name: 'Digital Teaching Workshop'
      }),
      created_at: new Date(Date.now() - 18000000), // 5 hours ago
      updated_at: new Date(Date.now() - 18000000)
    },
    {
      id: uuidv4(),
      title: 'Parent-teacher conference',
      content: 'Spring parent-teacher conferences begin next week',
      notification_type: 'event',
      priority: 'high',
      is_read: false,
      user_id: teacherUser.id,
      action_data: JSON.stringify({
        event_id: uuidv4(),
        event_date: '2024-02-22',
        event_name: 'Parent-Teacher Conference'
      }),
      created_at: new Date(Date.now() - 21600000), // 6 hours ago
      updated_at: new Date(Date.now() - 21600000)
    },

    // System notifications for teacher
    {
      id: uuidv4(),
      title: 'Gradebook backup completed',
      content: 'Your gradebook has been successfully backed up to the cloud',
      notification_type: 'system',
      priority: 'low',
      is_read: true,
      user_id: teacherUser.id,
      action_data: JSON.stringify({
        backup_type: 'gradebook',
        backup_date: new Date().toISOString()
      }),
      read_at: new Date(Date.now() - 3600000), // Read 1 hour ago
      created_at: new Date(Date.now() - 25200000), // 7 hours ago
      updated_at: new Date(Date.now() - 3600000)
    },
    {
      id: uuidv4(),
      title: 'New feature available',
      content: 'Try the new AI-powered assignment feedback tool',
      notification_type: 'system',
      priority: 'normal',
      is_read: false,
      user_id: teacherUser.id,
      action_url: 'durusuna://features/ai-feedback',
      action_data: JSON.stringify({
        feature: 'ai_feedback',
        version: '2.1.0'
      }),
      created_at: new Date(Date.now() - 28800000), // 8 hours ago
      updated_at: new Date(Date.now() - 28800000)
    }
  );

  // Create 10 notifications for student@demo.com
  notifications.push(
    // Message notifications for student
    {
      id: uuidv4(),
      title: 'Message from teacher',
      content: 'Ms. Johnson replied to your question about the homework',
      notification_type: 'message',
      priority: 'normal',
      is_read: false,
      user_id: studentUser.id,
      sender_id: teacherUser.id,
      action_data: JSON.stringify({
        conversation_id: conversationIds[0] || uuidv4(),
        message_id: uuidv4()
      }),
      created_at: new Date(Date.now() - 900000), // 15 minutes ago
      updated_at: new Date(Date.now() - 900000)
    },
    {
      id: uuidv4(),
      title: 'Study group invitation',
      content: 'Alex invited you to join the Math study group for tomorrow',
      notification_type: 'message',
      priority: 'normal',
      is_read: true,
      user_id: studentUser.id,
      sender_id: teacherUser.id,
      action_data: JSON.stringify({
        conversation_id: conversationIds[1] || uuidv4(),
        message_id: uuidv4()
      }),
      read_at: new Date(Date.now() - 1800000), // Read 30 minutes ago
      created_at: new Date(Date.now() - 5400000), // 1.5 hours ago
      updated_at: new Date(Date.now() - 1800000)
    },

    // Assignment notifications for student
    {
      id: uuidv4(),
      title: 'New assignment posted',
      content: 'Mathematics: Quadratic Equations worksheet has been assigned',
      notification_type: 'assignment',
      priority: 'high',
      is_read: false,
      user_id: studentUser.id,
      sender_id: teacherUser.id,
      action_data: JSON.stringify({
        assignment_id: uuidv4(),
        class_id: classIds[0] || uuidv4(),
        class_name: 'Mathematics',
        due_date: '2024-02-18'
      }),
      created_at: new Date(Date.now() - 2700000), // 45 minutes ago
      updated_at: new Date(Date.now() - 2700000)
    },
    {
      id: uuidv4(),
      title: 'Assignment graded',
      content: 'Your Science lab report has been graded - check your results!',
      notification_type: 'assignment',
      priority: 'normal',
      is_read: false,
      user_id: studentUser.id,
      sender_id: teacherUser.id,
      action_data: JSON.stringify({
        assignment_id: uuidv4(),
        class_id: classIds[1] || uuidv4(),
        class_name: 'Science',
        grade: 'A-'
      }),
      created_at: new Date(Date.now() - 7200000), // 2 hours ago
      updated_at: new Date(Date.now() - 7200000)
    },
    {
      id: uuidv4(),
      title: 'Assignment due reminder',
      content: 'Don\'t forget: History essay is due tomorrow at 11:59 PM',
      notification_type: 'assignment',
      priority: 'urgent',
      is_read: false,
      user_id: studentUser.id,
      sender_id: teacherUser.id,
      action_data: JSON.stringify({
        assignment_id: uuidv4(),
        class_id: classIds[2] || uuidv4(),
        class_name: 'History',
        due_date: '2024-02-16'
      }),
      created_at: new Date(Date.now() - 1800000), // 30 minutes ago
      updated_at: new Date(Date.now() - 1800000)
    },

    // Announcement notifications for student
    {
      id: uuidv4(),
      title: 'Class schedule change',
      content: 'Tomorrow\'s Math class has been moved to Room 203',
      notification_type: 'announcement',
      priority: 'high',
      is_read: true,
      user_id: studentUser.id,
      sender_id: teacherUser.id,
      action_data: JSON.stringify({
        class_id: classIds[0] || uuidv4(),
        update_id: uuidv4(),
        class_name: 'Mathematics',
        new_room: '203'
      }),
      read_at: new Date(Date.now() - 2700000), // Read 45 minutes ago
      created_at: new Date(Date.now() - 10800000), // 3 hours ago
      updated_at: new Date(Date.now() - 2700000)
    },
    {
      id: uuidv4(),
      title: 'Exam announcement',
      content: 'Midterm exams will be held next week - study schedule attached',
      notification_type: 'announcement',
      priority: 'urgent',
      is_read: false,
      user_id: studentUser.id,
      sender_id: teacherUser.id,
      action_data: JSON.stringify({
        class_id: classIds[1] || uuidv4(),
        update_id: uuidv4(),
        exam_week: '2024-02-19',
        class_name: 'All Subjects'
      }),
      created_at: new Date(Date.now() - 14400000), // 4 hours ago
      updated_at: new Date(Date.now() - 14400000)
    },

    // Event notifications for student
    {
      id: uuidv4(),
      title: 'Science fair registration',
      content: 'Registration for the annual science fair is now open!',
      notification_type: 'event',
      priority: 'normal',
      is_read: false,
      user_id: studentUser.id,
      action_data: JSON.stringify({
        event_id: uuidv4(),
        event_date: '2024-03-15',
        event_name: 'Science Fair',
        registration_deadline: '2024-02-25'
      }),
      created_at: new Date(Date.now() - 18000000), // 5 hours ago
      updated_at: new Date(Date.now() - 18000000)
    },
    {
      id: uuidv4(),
      title: 'Field trip tomorrow',
      content: 'Don\'t forget: Museum field trip starts at 9 AM sharp!',
      notification_type: 'event',
      priority: 'high',
      is_read: false,
      user_id: studentUser.id,
      action_data: JSON.stringify({
        event_id: uuidv4(),
        event_date: '2024-02-16',
        event_name: 'Natural History Museum',
        departure_time: '09:00'
      }),
      created_at: new Date(Date.now() - 21600000), // 6 hours ago
      updated_at: new Date(Date.now() - 21600000)
    },

    // System notification for student
    {
      id: uuidv4(),
      title: 'Account security update',
      content: 'Your password was successfully updated. If this wasn\'t you, contact support.',
      notification_type: 'system',
      priority: 'normal',
      is_read: true,
      user_id: studentUser.id,
      action_data: JSON.stringify({
        security_action: 'password_change',
        timestamp: new Date().toISOString()
      }),
      read_at: new Date(Date.now() - 7200000), // Read 2 hours ago
      created_at: new Date(Date.now() - 25200000), // 7 hours ago
      updated_at: new Date(Date.now() - 7200000)
    }
  );

  // Insert all notifications
  await knex('notifications').insert(notifications);

  console.log(`✅ Notification seeds completed: ${notifications.length} notifications created`);
  console.log(`   - 10 notifications for teacher@demo.com`);
  console.log(`   - 10 notifications for student@demo.com`);
}; 