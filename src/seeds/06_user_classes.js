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
  
  // Elementary students
  const elementaryStudents = users.filter(u => u.user_type === 'student' && (
    u.email === 'student@demo.com' || 
    u.email === 'student3@demo.com' || 
    u.email === 'student4@demo.com' || 
    u.email === 'student5@demo.com' || 
    u.email === 'student6@demo.com' || 
    u.email === 'student7@demo.com' || 
    u.email === 'student8@demo.com'
  ));
  
  // High school students  
  const highSchoolStudents = users.filter(u => u.user_type === 'student' && (
    u.email === 'student2@demo.com' || 
    u.email === 'student9@demo.com' || 
    u.email === 'student10@demo.com' || 
    u.email === 'student11@demo.com' || 
    u.email === 'student12@demo.com' || 
    u.email === 'student13@demo.com' || 
    u.email === 'student14@demo.com'
  ));

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

  // Assign elementary students to classes
  // Distribute students between Primary 5A and Primary 6B
  elementaryStudents.forEach((student, index) => {
    if (!student) return;
    
    // Assign to Primary 5A (first 4 students) and Primary 6B (remaining 3 students)
    const targetClass = index < 4 ? primary5A : primary6B;
    
    if (targetClass && student.school_id === targetClass.school_id) {
      userClassAssignments.push({
        id: uuidv4(),
        user_id: student.id,
        class_id: targetClass.id,
        role_in_class: 'student',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  });

  // Assign high school students to classes
  // Distribute students between Secondary 2A and Secondary 3B
  highSchoolStudents.forEach((student, index) => {
    if (!student) return;
    
    // Assign to Secondary 2A (first 4 students) and Secondary 3B (remaining 3 students)
    const targetClass = index < 4 ? secondary2A : secondary3B;
    
    if (targetClass && student.school_id === targetClass.school_id) {
      userClassAssignments.push({
        id: uuidv4(),
        user_id: student.id,
        class_id: targetClass.id,
        role_in_class: 'student',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  });

  await knex('user_classes').insert(userClassAssignments);

  console.log('✅ User-Classes relationships seeded successfully');
  console.log(`📊 Created ${userClassAssignments.length} user-class assignments`);
}; 