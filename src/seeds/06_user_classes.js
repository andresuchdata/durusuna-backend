const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get required data from previous seeds
  const classes = await knex('classes').select('id', 'school_id', 'name').orderBy('created_at');
  const users = await knex('users').select('id', 'email', 'user_type', 'school_id').orderBy('created_at');
  
  if (classes.length === 0 || users.length === 0) {
    console.log('Missing required data. Make sure classes and users are seeded first.');
    return;
  }

  // Get specific classes by their fixed IDs
  const primary5A = classes.find(c => c.id === '550e8400-e29b-41d4-a716-446655440001');
  const primary6B = classes.find(c => c.id === '550e8400-e29b-41d4-a716-446655440002');
  const secondary2A = classes.find(c => c.id === '550e8400-e29b-41d4-a716-446655440003');
  const secondary3B = classes.find(c => c.id === '550e8400-e29b-41d4-a716-446655440004');

  // Get users by email and type
  const teacher1 = users.find(u => u.email === 'teacher@demo.com');
  const teacher2 = users.find(u => u.email === 'teacher2@demo.com');
  const student1 = users.find(u => u.email === 'student@demo.com');
  const student2 = users.find(u => u.email === 'student2@demo.com');

  // Deletes ALL existing entries
  await knex('user_classes').del();
  
  const userClassAssignments = [];

  // Assign Teacher 1 (Elementary) to Primary classes
  if (teacher1 && primary5A && teacher1.school_id === primary5A.school_id) {
    userClassAssignments.push({
      id: uuidv4(),
      user_id: teacher1.id,
      class_id: primary5A.id,
      role_in_class: 'teacher',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  if (teacher1 && primary6B && teacher1.school_id === primary6B.school_id) {
    userClassAssignments.push({
      id: uuidv4(),
      user_id: teacher1.id,
      class_id: primary6B.id,
      role_in_class: 'teacher',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Assign Teacher 2 (High School) to Secondary classes
  if (teacher2 && secondary2A && teacher2.school_id === secondary2A.school_id) {
    userClassAssignments.push({
      id: uuidv4(),
      user_id: teacher2.id,
      class_id: secondary2A.id,
      role_in_class: 'teacher',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  if (teacher2 && secondary3B && teacher2.school_id === secondary3B.school_id) {
    userClassAssignments.push({
      id: uuidv4(),
      user_id: teacher2.id,
      class_id: secondary3B.id,
      role_in_class: 'teacher',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Assign Student 1 to Primary 5A (following the rule: students can be in 0-1 class max)
  if (student1 && primary5A && student1.school_id === primary5A.school_id) {
    userClassAssignments.push({
      id: uuidv4(),
      user_id: student1.id,
      class_id: primary5A.id,
      role_in_class: 'student',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Assign Student 2 to Secondary 2A
  if (student2 && secondary2A && student2.school_id === secondary2A.school_id) {
    userClassAssignments.push({
      id: uuidv4(),
      user_id: student2.id,
      class_id: secondary2A.id,
      role_in_class: 'student',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  await knex('user_classes').insert(userClassAssignments);

  console.log('✅ User-Classes relationships seeded successfully');
  console.log(`📊 Created ${userClassAssignments.length} user-class assignments`);
}; 