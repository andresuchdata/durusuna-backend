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
    
    // Students - Elementary School
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
      email: 'student3@demo.com',
      password_hash: hashedPassword,
      first_name: 'Oliver',
      last_name: 'Martinez',
      phone: '+1-555-2003',
      user_type: 'student',
      role: 'user',
      school_id: elementarySchoolId,
      student_id: 'S003',
      date_of_birth: new Date('2010-03-10'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'student4@demo.com',
      password_hash: hashedPassword,
      first_name: 'Sophia',
      last_name: 'Garcia',
      phone: '+1-555-2004',
      user_type: 'student',
      role: 'user',
      school_id: elementarySchoolId,
      student_id: 'S004',
      date_of_birth: new Date('2010-07-22'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'student5@demo.com',
      password_hash: hashedPassword,
      first_name: 'Liam',
      last_name: 'Anderson',
      phone: '+1-555-2005',
      user_type: 'student',
      role: 'user',
      school_id: elementarySchoolId,
      student_id: 'S005',
      date_of_birth: new Date('2009-12-05'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'student6@demo.com',
      password_hash: hashedPassword,
      first_name: 'Ava',
      last_name: 'Taylor',
      phone: '+1-555-2006',
      user_type: 'student',
      role: 'user',
      school_id: elementarySchoolId,
      student_id: 'S006',
      date_of_birth: new Date('2009-09-18'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'student7@demo.com',
      password_hash: hashedPassword,
      first_name: 'Noah',
      last_name: 'Thomas',
      phone: '+1-555-2007',
      user_type: 'student',
      role: 'user',
      school_id: elementarySchoolId,
      student_id: 'S007',
      date_of_birth: new Date('2010-01-30'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'student8@demo.com',
      password_hash: hashedPassword,
      first_name: 'Isabella',
      last_name: 'Jackson',
      phone: '+1-555-2008',
      user_type: 'student',
      role: 'user',
      school_id: elementarySchoolId,
      student_id: 'S008',
      date_of_birth: new Date('2009-11-14'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },

    // Students - High School
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
    {
      id: uuidv4(),
      email: 'student9@demo.com',
      password_hash: hashedPassword,
      first_name: 'Ethan',
      last_name: 'White',
      phone: '+1-555-2009',
      user_type: 'student',
      role: 'user',
      school_id: highSchoolId,
      student_id: 'S009',
      date_of_birth: new Date('2008-04-12'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'student10@demo.com',
      password_hash: hashedPassword,
      first_name: 'Mia',
      last_name: 'Harris',
      phone: '+1-555-2010',
      user_type: 'student',
      role: 'user',
      school_id: highSchoolId,
      student_id: 'S010',
      date_of_birth: new Date('2007-10-25'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'student11@demo.com',
      password_hash: hashedPassword,
      first_name: 'Lucas',
      last_name: 'Clark',
      phone: '+1-555-2011',
      user_type: 'student',
      role: 'user',
      school_id: highSchoolId,
      student_id: 'S011',
      date_of_birth: new Date('2008-02-08'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'student12@demo.com',
      password_hash: hashedPassword,
      first_name: 'Charlotte',
      last_name: 'Lewis',
      phone: '+1-555-2012',
      user_type: 'student',
      role: 'user',
      school_id: highSchoolId,
      student_id: 'S012',
      date_of_birth: new Date('2007-06-17'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'student13@demo.com',
      password_hash: hashedPassword,
      first_name: 'Alexander',
      last_name: 'Walker',
      phone: '+1-555-2013',
      user_type: 'student',
      role: 'user',
      school_id: highSchoolId,
      student_id: 'S013',
      date_of_birth: new Date('2008-09-03'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'student14@demo.com',
      password_hash: hashedPassword,
      first_name: 'Amelia',
      last_name: 'Hall',
      phone: '+1-555-2014',
      user_type: 'student',
      role: 'user',
      school_id: highSchoolId,
      student_id: 'S014',
      date_of_birth: new Date('2007-12-21'),
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