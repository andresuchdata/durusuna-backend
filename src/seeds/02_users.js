const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get school IDs from the previous seed
  const schools = await knex('schools').select('id').limit(2);
  const elementarySchoolId = schools[0].id;
  const highSchoolId = schools[1].id;

  // Deletes ALL existing entries
  await knex('users').del();
  
  // Hash passwords
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  // Inserts seed entries
  await knex('users').insert([
    // Teachers
    {
      id: uuidv4(),
      email: 'teacher@demo.com',
      password_hash: hashedPassword,
      first_name: 'Sarah',
      last_name: 'Johnson',
      phone: '+1-555-1001',
      user_type: 'teacher',
      role: 'user',
      school_id: elementarySchoolId,
      employee_id: 'T001',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'teacher2@demo.com',
      password_hash: hashedPassword,
      first_name: 'Michael',
      last_name: 'Davis',
      phone: '+1-555-1002',
      user_type: 'teacher',
      role: 'user',
      school_id: highSchoolId,
      employee_id: 'T002',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Students
    {
      id: uuidv4(),
      email: 'student@demo.com',
      password_hash: hashedPassword,
      first_name: 'Emma',
      last_name: 'Wilson',
      phone: '+1-555-2001',
      user_type: 'student',
      role: 'user',
      school_id: elementarySchoolId,
      student_id: 'S001',
      date_of_birth: new Date('2010-05-15'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'student2@demo.com',
      password_hash: hashedPassword,
      first_name: 'James',
      last_name: 'Brown',
      phone: '+1-555-2002',
      user_type: 'student',
      role: 'user',
      school_id: highSchoolId,
      student_id: 'S002',
      date_of_birth: new Date('2008-08-20'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Parents
    {
      id: uuidv4(),
      email: 'parent@demo.com',
      password_hash: hashedPassword,
      first_name: 'Robert',
      last_name: 'Wilson',
      phone: '+1-555-3001',
      user_type: 'parent',
      role: 'user',
      school_id: elementarySchoolId,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Admin
    {
      id: uuidv4(),
      email: 'admin@demo.com',
      password_hash: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      phone: '+1-555-0001',
      user_type: 'teacher',
      role: 'admin',
      school_id: elementarySchoolId,
      employee_id: 'A001',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}; 