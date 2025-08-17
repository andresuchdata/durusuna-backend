const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Fixed UUIDs for consistent seeding
const SCHOOL_IDS = {
  SDIT: '11111111-1111-1111-1111-111111111111',
  SMP: '22222222-2222-2222-2222-222222222222'
};

const USER_IDS = {
  // Admins
  ADMIN_SDIT: '10000000-0000-0000-0000-000000000001',
  ADMIN_SMP: '10000000-0000-0000-0000-000000000002',
  
  // Teachers SDIT
  TEACHER_SDIT_1: '20000000-0000-0000-0000-000000000001',
  TEACHER_SDIT_2: '20000000-0000-0000-0000-000000000002',
  TEACHER_SDIT_3: '20000000-0000-0000-0000-000000000003',
  TEACHER_SDIT_4: '20000000-0000-0000-0000-000000000004',
  
  // Teachers SMP
  TEACHER_SMP_1: '20000000-0000-0000-0000-000000000011',
  TEACHER_SMP_2: '20000000-0000-0000-0000-000000000012',
  TEACHER_SMP_3: '20000000-0000-0000-0000-000000000013',
  TEACHER_SMP_4: '20000000-0000-0000-0000-000000000014',
  
  // Students SDIT (30 students - 5 per class)
  STUDENT_SDIT_1A_1: '30000000-0000-0000-0000-000000000001',
  STUDENT_SDIT_1A_2: '30000000-0000-0000-0000-000000000002',
  STUDENT_SDIT_1A_3: '30000000-0000-0000-0000-000000000003',
  STUDENT_SDIT_1A_4: '30000000-0000-0000-0000-000000000004',
  STUDENT_SDIT_1A_5: '30000000-0000-0000-0000-000000000005',
  
  STUDENT_SDIT_2C_1: '30000000-0000-0000-0000-000000000011',
  STUDENT_SDIT_2C_2: '30000000-0000-0000-0000-000000000012',
  STUDENT_SDIT_2C_3: '30000000-0000-0000-0000-000000000013',
  STUDENT_SDIT_2C_4: '30000000-0000-0000-0000-000000000014',
  STUDENT_SDIT_2C_5: '30000000-0000-0000-0000-000000000015',
  
  STUDENT_SDIT_3D_1: '30000000-0000-0000-0000-000000000021',
  STUDENT_SDIT_3D_2: '30000000-0000-0000-0000-000000000022',
  STUDENT_SDIT_3D_3: '30000000-0000-0000-0000-000000000023',
  STUDENT_SDIT_3D_4: '30000000-0000-0000-0000-000000000024',
  STUDENT_SDIT_3D_5: '30000000-0000-0000-0000-000000000025',
  
  STUDENT_SDIT_4B_1: '30000000-0000-0000-0000-000000000031',
  STUDENT_SDIT_4B_2: '30000000-0000-0000-0000-000000000032',
  STUDENT_SDIT_4B_3: '30000000-0000-0000-0000-000000000033',
  STUDENT_SDIT_4B_4: '30000000-0000-0000-0000-000000000034',
  STUDENT_SDIT_4B_5: '30000000-0000-0000-0000-000000000035',
  
  STUDENT_SDIT_5A_1: '30000000-0000-0000-0000-000000000041',
  STUDENT_SDIT_5A_2: '30000000-0000-0000-0000-000000000042',
  STUDENT_SDIT_5A_3: '30000000-0000-0000-0000-000000000043',
  STUDENT_SDIT_5A_4: '30000000-0000-0000-0000-000000000044',
  STUDENT_SDIT_5A_5: '30000000-0000-0000-0000-000000000045',
  
  STUDENT_SDIT_6C_1: '30000000-0000-0000-0000-000000000051',
  STUDENT_SDIT_6C_2: '30000000-0000-0000-0000-000000000052',
  STUDENT_SDIT_6C_3: '30000000-0000-0000-0000-000000000053',
  STUDENT_SDIT_6C_4: '30000000-0000-0000-0000-000000000054',
  STUDENT_SDIT_6C_5: '30000000-0000-0000-0000-000000000055',
  
  // Students SMP (30 students - 5 per class)
  STUDENT_SMP_7M1_1: '30000000-0000-0000-0000-000000000101',
  STUDENT_SMP_7M1_2: '30000000-0000-0000-0000-000000000102',
  STUDENT_SMP_7M1_3: '30000000-0000-0000-0000-000000000103',
  STUDENT_SMP_7M1_4: '30000000-0000-0000-0000-000000000104',
  STUDENT_SMP_7M1_5: '30000000-0000-0000-0000-000000000105',
  
  STUDENT_SMP_7MD1_1: '30000000-0000-0000-0000-000000000111',
  STUDENT_SMP_7MD1_2: '30000000-0000-0000-0000-000000000112',
  STUDENT_SMP_7MD1_3: '30000000-0000-0000-0000-000000000113',
  STUDENT_SMP_7MD1_4: '30000000-0000-0000-0000-000000000114',
  STUDENT_SMP_7MD1_5: '30000000-0000-0000-0000-000000000115',
  
  STUDENT_SMP_8M1_1: '30000000-0000-0000-0000-000000000121',
  STUDENT_SMP_8M1_2: '30000000-0000-0000-0000-000000000122',
  STUDENT_SMP_8M1_3: '30000000-0000-0000-0000-000000000123',
  STUDENT_SMP_8M1_4: '30000000-0000-0000-0000-000000000124',
  STUDENT_SMP_8M1_5: '30000000-0000-0000-0000-000000000125',
  
  STUDENT_SMP_8MD1_1: '30000000-0000-0000-0000-000000000131',
  STUDENT_SMP_8MD1_2: '30000000-0000-0000-0000-000000000132',
  STUDENT_SMP_8MD1_3: '30000000-0000-0000-0000-000000000133',
  STUDENT_SMP_8MD1_4: '30000000-0000-0000-0000-000000000134',
  STUDENT_SMP_8MD1_5: '30000000-0000-0000-0000-000000000135',
  
  STUDENT_SMP_9M1_1: '30000000-0000-0000-0000-000000000141',
  STUDENT_SMP_9M1_2: '30000000-0000-0000-0000-000000000142',
  STUDENT_SMP_9M1_3: '30000000-0000-0000-0000-000000000143',
  STUDENT_SMP_9M1_4: '30000000-0000-0000-0000-000000000144',
  STUDENT_SMP_9M1_5: '30000000-0000-0000-0000-000000000145',
  
  STUDENT_SMP_9MD2_1: '30000000-0000-0000-0000-000000000151',
  STUDENT_SMP_9MD2_2: '30000000-0000-0000-0000-000000000152',
  STUDENT_SMP_9MD2_3: '30000000-0000-0000-0000-000000000153',
  STUDENT_SMP_9MD2_4: '30000000-0000-0000-0000-000000000154',
  STUDENT_SMP_9MD2_5: '30000000-0000-0000-0000-000000000155',
  
  // Parents (20 parents)
  PARENT_1: '40000000-0000-0000-0000-000000000001',
  PARENT_2: '40000000-0000-0000-0000-000000000002',
  PARENT_3: '40000000-0000-0000-0000-000000000003',
  PARENT_4: '40000000-0000-0000-0000-000000000004',
  PARENT_5: '40000000-0000-0000-0000-000000000005',
  PARENT_6: '40000000-0000-0000-0000-000000000006',
  PARENT_7: '40000000-0000-0000-0000-000000000007',
  PARENT_8: '40000000-0000-0000-0000-000000000008',
  PARENT_9: '40000000-0000-0000-0000-000000000009',
  PARENT_10: '40000000-0000-0000-0000-000000000010',
  PARENT_11: '40000000-0000-0000-0000-000000000011',
  PARENT_12: '40000000-0000-0000-0000-000000000012',
  PARENT_13: '40000000-0000-0000-0000-000000000013',
  PARENT_14: '40000000-0000-0000-0000-000000000014',
  PARENT_15: '40000000-0000-0000-0000-000000000015',
  PARENT_16: '40000000-0000-0000-0000-000000000016',
  PARENT_17: '40000000-0000-0000-0000-000000000017',
  PARENT_18: '40000000-0000-0000-0000-000000000018',
  PARENT_19: '40000000-0000-0000-0000-000000000019',
  PARENT_20: '40000000-0000-0000-0000-000000000020'
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();
  
  // Hash passwords
  const hashedPassword = await bcrypt.hash('pass123', 12);
  
  // Generate sample FCM tokens for demo - safer version
  const generateFCMToken = (userId) => {
    const prefix = userId.substring(0, 8).replace(/-/g, '');
    const timestamp = Date.now();
    return `fcm_token_${prefix}_${timestamp}`;
  };
  
  const users = [];
  
  // Admins
  users.push(
    {
      id: USER_IDS.ADMIN_SDIT,
      email: 'admin.sdit@dareliman.sch.id',
      password_hash: hashedPassword,
      first_name: 'Ahmad',
      last_name: 'Siddiq',
      phone: '+62-812-1111-0001',
      user_type: 'teacher',
      role: 'admin',
      school_id: SCHOOL_IDS.SDIT,
      employee_id: 'ADM001',
      fcm_token: generateFCMToken(USER_IDS.ADMIN_SDIT),
      fcm_token_updated_at: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: USER_IDS.ADMIN_SMP,
      email: 'admin.smp@dareliman.sch.id',
      password_hash: hashedPassword,
      first_name: 'Fatimah',
      last_name: 'Zahra',
      phone: '+62-812-2222-0001',
      user_type: 'teacher',
      role: 'admin',
      school_id: SCHOOL_IDS.SMP,
      employee_id: 'ADM002',
      fcm_token: generateFCMToken(USER_IDS.ADMIN_SMP),
      fcm_token_updated_at: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  );
  
  // Teachers SDIT - Safe character handling
  const sdItTeachers = [
    { id: USER_IDS.TEACHER_SDIT_1, name: 'Ustadz Muhammad', surname: 'Rahman', empId: 'TCH001' },
    { id: USER_IDS.TEACHER_SDIT_2, name: 'Ustadzah Siti', surname: 'Aminah', empId: 'TCH002' },
    { id: USER_IDS.TEACHER_SDIT_3, name: 'Ustadz Abdul', surname: 'Hadi', empId: 'TCH003' },
    { id: USER_IDS.TEACHER_SDIT_4, name: 'Ustadzah Maryam', surname: 'Saleha', empId: 'TCH004' }
  ];
  
  sdItTeachers.forEach((teacher, index) => {
    // Safe email generation - replace spaces and special chars
    const safeName = teacher.name.toLowerCase().replace(/[^a-z]/g, '');
    const safeSurname = teacher.surname.toLowerCase().replace(/[^a-z]/g, '');
    
    users.push({
      id: teacher.id,
      email: `${safeName}.${safeSurname}@sditdareliman1.sch.id`,
      password_hash: hashedPassword,
      first_name: teacher.name,
      last_name: teacher.surname,
      phone: `+62-812-1111-100${index + 1}`,
      user_type: 'teacher',
      role: 'user',
      school_id: SCHOOL_IDS.SDIT,
      employee_id: teacher.empId,
      fcm_token: generateFCMToken(teacher.id),
      fcm_token_updated_at: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  });
  
  // Teachers SMP
  const smpTeachers = [
    { id: USER_IDS.TEACHER_SMP_1, name: 'Ustadz Ali', surname: 'Akbar', empId: 'TCH011' },
    { id: USER_IDS.TEACHER_SMP_2, name: 'Ustadzah Khadijah', surname: 'Binti', empId: 'TCH012' },
    { id: USER_IDS.TEACHER_SMP_3, name: 'Ustadz Umar', surname: 'Faruq', empId: 'TCH013' },
    { id: USER_IDS.TEACHER_SMP_4, name: 'Ustadzah Aisha', surname: 'Radhia', empId: 'TCH014' }
  ];
  
  smpTeachers.forEach((teacher, index) => {
    const safeName = teacher.name.toLowerCase().replace(/[^a-z]/g, '');
    const safeSurname = teacher.surname.toLowerCase().replace(/[^a-z]/g, '');
    
    users.push({
      id: teacher.id,
      email: `${safeName}.${safeSurname}@smpitdareliman.sch.id`,
      password_hash: hashedPassword,
      first_name: teacher.name,
      last_name: teacher.surname,
      phone: `+62-812-2222-100${index + 1}`,
      user_type: 'teacher',
      role: 'user',
      school_id: SCHOOL_IDS.SMP,
      employee_id: teacher.empId,
      fcm_token: generateFCMToken(teacher.id),
      fcm_token_updated_at: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  });
  
  // Students SDIT - Safe names without problematic characters
  const sdItStudentNames = [
    'Ahmad Zaki', 'Fatimah Azzahra', 'Muhammad Hafiz', 'Khadijah Salsabila', 'Ali Imran',
    'Maryam Suci', 'Umar Fadhil', 'Aisha Kamila', 'Yusuf Hakim', 'Zaynab Rahma',
    'Ibrahim Akmal', 'Safiyyah Nur', 'Ismail Rafi', 'Ruqayyah Hana', 'Idris Faris',
    'Ummu Salamah', 'Hamzah Dzaky', 'Juwairiyah Aulia', 'Bilal Rizky', 'Hafsah Naila',
    'Khalid Arkan', 'Sawda Anisa', 'Zaid Azka', 'Ummu Habibah', 'Muadz Irfan',
    'Maymunah Syifa', 'Saad Naufal', 'Zainab Qonita', 'Anas Ghazy', 'Ummu Ayman'
  ];
  
  const sdItStudentIds = [
    // 1A
    USER_IDS.STUDENT_SDIT_1A_1, USER_IDS.STUDENT_SDIT_1A_2, USER_IDS.STUDENT_SDIT_1A_3, USER_IDS.STUDENT_SDIT_1A_4, USER_IDS.STUDENT_SDIT_1A_5,
    // 2C  
    USER_IDS.STUDENT_SDIT_2C_1, USER_IDS.STUDENT_SDIT_2C_2, USER_IDS.STUDENT_SDIT_2C_3, USER_IDS.STUDENT_SDIT_2C_4, USER_IDS.STUDENT_SDIT_2C_5,
    // 3D
    USER_IDS.STUDENT_SDIT_3D_1, USER_IDS.STUDENT_SDIT_3D_2, USER_IDS.STUDENT_SDIT_3D_3, USER_IDS.STUDENT_SDIT_3D_4, USER_IDS.STUDENT_SDIT_3D_5,
    // 4B
    USER_IDS.STUDENT_SDIT_4B_1, USER_IDS.STUDENT_SDIT_4B_2, USER_IDS.STUDENT_SDIT_4B_3, USER_IDS.STUDENT_SDIT_4B_4, USER_IDS.STUDENT_SDIT_4B_5,
    // 5A
    USER_IDS.STUDENT_SDIT_5A_1, USER_IDS.STUDENT_SDIT_5A_2, USER_IDS.STUDENT_SDIT_5A_3, USER_IDS.STUDENT_SDIT_5A_4, USER_IDS.STUDENT_SDIT_5A_5,
    // 6C
    USER_IDS.STUDENT_SDIT_6C_1, USER_IDS.STUDENT_SDIT_6C_2, USER_IDS.STUDENT_SDIT_6C_3, USER_IDS.STUDENT_SDIT_6C_4, USER_IDS.STUDENT_SDIT_6C_5
  ];
  
  sdItStudentIds.forEach((studentId, index) => {
    const fullName = sdItStudentNames[index];
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName; // Fallback if no last name
    const studentNum = String(index + 1).padStart(3, '0');
    
    users.push({
      id: studentId,
      email: `student.sdit.${studentNum}@dareliman.sch.id`,
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      phone: `+62-812-1111-${2000 + index}`,
      user_type: 'student',
      role: 'user',
      school_id: SCHOOL_IDS.SDIT,
      student_id: `SDIT${studentNum}`,
      date_of_birth: new Date(2010 + Math.floor(index / 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      fcm_token: generateFCMToken(studentId),
      fcm_token_updated_at: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  });
  
  // Students SMP - Safe names without problematic characters
  const smpStudentNames = [
    'Abdullah Malik', 'Raihanah Putri', 'Usman Wijaya', 'Salamah Dewi', 'Hasan Ahmad',
    'Jumanah Sari', 'Husain Pratama', 'Ramlah Indira', 'Jafar Sidiq', 'Ummu Kulsum',
    'Muawiyyah Fajar', 'Layla Maharani', 'Zubayr Alam', 'Asma Binti', 'Talha Rizki',
    'Ummu Salamah', 'Abdurrahman Hakim', 'Hajar Assyifa', 'Said Naufal', 'Sakinah Aulia',
    'Miqdad Arya', 'Hindun Zahra', 'Ammar Fadhil', 'Shafiyyah Naura', 'Muadz Irfan',
    'Barakah Qonita', 'Ubay Rahman', 'Thuwaybah Maira', 'Usaid Akbar', 'Ruqayyah Hani'
  ];
  
  const smpStudentIds = [
    // 7 Makkah 1
    USER_IDS.STUDENT_SMP_7M1_1, USER_IDS.STUDENT_SMP_7M1_2, USER_IDS.STUDENT_SMP_7M1_3, USER_IDS.STUDENT_SMP_7M1_4, USER_IDS.STUDENT_SMP_7M1_5,
    // 7 Madinah 1
    USER_IDS.STUDENT_SMP_7MD1_1, USER_IDS.STUDENT_SMP_7MD1_2, USER_IDS.STUDENT_SMP_7MD1_3, USER_IDS.STUDENT_SMP_7MD1_4, USER_IDS.STUDENT_SMP_7MD1_5,
    // 8 Makkah 1
    USER_IDS.STUDENT_SMP_8M1_1, USER_IDS.STUDENT_SMP_8M1_2, USER_IDS.STUDENT_SMP_8M1_3, USER_IDS.STUDENT_SMP_8M1_4, USER_IDS.STUDENT_SMP_8M1_5,
    // 8 Madinah 1
    USER_IDS.STUDENT_SMP_8MD1_1, USER_IDS.STUDENT_SMP_8MD1_2, USER_IDS.STUDENT_SMP_8MD1_3, USER_IDS.STUDENT_SMP_8MD1_4, USER_IDS.STUDENT_SMP_8MD1_5,
    // 9 Makkah 1
    USER_IDS.STUDENT_SMP_9M1_1, USER_IDS.STUDENT_SMP_9M1_2, USER_IDS.STUDENT_SMP_9M1_3, USER_IDS.STUDENT_SMP_9M1_4, USER_IDS.STUDENT_SMP_9M1_5,
    // 9 Madinah 2
    USER_IDS.STUDENT_SMP_9MD2_1, USER_IDS.STUDENT_SMP_9MD2_2, USER_IDS.STUDENT_SMP_9MD2_3, USER_IDS.STUDENT_SMP_9MD2_4, USER_IDS.STUDENT_SMP_9MD2_5
  ];
  
  smpStudentIds.forEach((studentId, index) => {
    const fullName = smpStudentNames[index];
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;
    const studentNum = String(index + 101).padStart(3, '0');
    
    users.push({
      id: studentId,
      email: `student.smp.${studentNum}@dareliman.sch.id`,
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      phone: `+62-812-2222-${2000 + index}`,
      user_type: 'student',
      role: 'user',
      school_id: SCHOOL_IDS.SMP,
      student_id: `SMP${studentNum}`,
      date_of_birth: new Date(2007 + Math.floor(index / 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      fcm_token: generateFCMToken(studentId),
      fcm_token_updated_at: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  });
  
  // Parents - Safe names
  const parentNames = [
    'Bapak Ahmad', 'Ibu Siti', 'Bapak Muhammad', 'Ibu Fatimah', 'Bapak Abdul',
    'Ibu Khadijah', 'Bapak Ali', 'Ibu Maryam', 'Bapak Umar', 'Ibu Aisha',
    'Bapak Yusuf', 'Ibu Zaynab', 'Bapak Ibrahim', 'Ibu Ruqayyah', 'Bapak Ismail',
    'Ibu Hafsah', 'Bapak Hamzah', 'Ibu Juwairiyah', 'Bapak Khalid', 'Ibu Sawda'
  ];
  
  const parentIds = Object.values(USER_IDS).filter(id => id.startsWith('40000000'));
  
  parentIds.forEach((parentId, index) => {
    const fullName = parentNames[index];
    const nameParts = fullName.split(' ');
    const title = nameParts[0]; // Bapak or Ibu
    const firstName = nameParts[1];
    const isSDIT = index < 15; // First 15 parents for SDIT, rest for SMP
    
    // Safe email generation
    const safeFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
    
    users.push({
      id: parentId,
      email: `${safeFirstName}.parent${String(index + 1).padStart(2, '0')}@dareliman.sch.id`,
      password_hash: hashedPassword,
      first_name: `${title} ${firstName}`,
      last_name: 'Wali Murid',
      phone: `+62-812-${isSDIT ? '1111' : '2222'}-${3000 + index}`,
      user_type: 'parent',
      role: 'user',
      school_id: isSDIT ? SCHOOL_IDS.SDIT : SCHOOL_IDS.SMP,
      fcm_token: generateFCMToken(parentId),
      fcm_token_updated_at: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  });
  
  // Insert all users
  await knex('users').insert(users);

  console.log('✅ Users seeded successfully');
  console.log(`   - Total users: ${users.length}`);
  console.log(`   - Admins: 2`);
  console.log(`   - Teachers: 8`);
  console.log(`   - Students: 60 (30 SDIT + 30 SMP)`);
  console.log(`   - Parents: 20`);
  console.log(`   - All users have FCM tokens for testing`);
  console.log(`   - Names sanitized for JavaScript compatibility`);
};
