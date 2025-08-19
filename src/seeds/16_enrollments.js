const { v4: uuidv4 } = require('uuid');

// Fixed IDs from other seed files
const CLASS_IDS = {
  SDIT_1A: '50000000-0000-0000-0000-000000000001',
  SDIT_2C: '50000000-0000-0000-0000-000000000002',
  SDIT_3D: '50000000-0000-0000-0000-000000000003',
  SDIT_4B: '50000000-0000-0000-0000-000000000004',
  SDIT_5A: '50000000-0000-0000-0000-000000000005',
  SDIT_6C: '50000000-0000-0000-0000-000000000006',
  SMP_7M1: '50000000-0000-0000-0000-000000000011',
  SMP_7MD1: '50000000-0000-0000-0000-000000000012',
  SMP_8M1: '50000000-0000-0000-0000-000000000013',
  SMP_8MD1: '50000000-0000-0000-0000-000000000014',
  SMP_9M1: '50000000-0000-0000-0000-000000000015',
  SMP_9MD2: '50000000-0000-0000-0000-000000000016'
};

// Student ID mappings to classes
const STUDENT_CLASS_MAP = {
  // SDIT 1A students
  [CLASS_IDS.SDIT_1A]: [
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002', 
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000005'
  ],
  // SDIT 2C students  
  [CLASS_IDS.SDIT_2C]: [
    '30000000-0000-0000-0000-000000000011',
    '30000000-0000-0000-0000-000000000012',
    '30000000-0000-0000-0000-000000000013',
    '30000000-0000-0000-0000-000000000014',
    '30000000-0000-0000-0000-000000000015'
  ],
  // SDIT 3D students
  [CLASS_IDS.SDIT_3D]: [
    '30000000-0000-0000-0000-000000000021',
    '30000000-0000-0000-0000-000000000022',
    '30000000-0000-0000-0000-000000000023',
    '30000000-0000-0000-0000-000000000024',
    '30000000-0000-0000-0000-000000000025'
  ],
  // SDIT 4B students
  [CLASS_IDS.SDIT_4B]: [
    '30000000-0000-0000-0000-000000000031',
    '30000000-0000-0000-0000-000000000032',
    '30000000-0000-0000-0000-000000000033',
    '30000000-0000-0000-0000-000000000034',
    '30000000-0000-0000-0000-000000000035'
  ],
  // SDIT 5A students
  [CLASS_IDS.SDIT_5A]: [
    '30000000-0000-0000-0000-000000000041',
    '30000000-0000-0000-0000-000000000042',
    '30000000-0000-0000-0000-000000000043',
    '30000000-0000-0000-0000-000000000044',
    '30000000-0000-0000-0000-000000000045'
  ],
  // SDIT 6C students
  [CLASS_IDS.SDIT_6C]: [
    '30000000-0000-0000-0000-000000000051',
    '30000000-0000-0000-0000-000000000052',
    '30000000-0000-0000-0000-000000000053',
    '30000000-0000-0000-0000-000000000054',
    '30000000-0000-0000-0000-000000000055'
  ],
  // SMP 7M1 students
  [CLASS_IDS.SMP_7M1]: [
    '30000000-0000-0000-0000-000000000101',
    '30000000-0000-0000-0000-000000000102',
    '30000000-0000-0000-0000-000000000103',
    '30000000-0000-0000-0000-000000000104',
    '30000000-0000-0000-0000-000000000105'
  ],
  // SMP 7MD1 students
  [CLASS_IDS.SMP_7MD1]: [
    '30000000-0000-0000-0000-000000000111',
    '30000000-0000-0000-0000-000000000112',
    '30000000-0000-0000-0000-000000000113',
    '30000000-0000-0000-0000-000000000114',
    '30000000-0000-0000-0000-000000000115'
  ],
  // SMP 8M1 students
  [CLASS_IDS.SMP_8M1]: [
    '30000000-0000-0000-0000-000000000121',
    '30000000-0000-0000-0000-000000000122',
    '30000000-0000-0000-0000-000000000123',
    '30000000-0000-0000-0000-000000000124',
    '30000000-0000-0000-0000-000000000125'
  ],
  // SMP 8MD1 students
  [CLASS_IDS.SMP_8MD1]: [
    '30000000-0000-0000-0000-000000000131',
    '30000000-0000-0000-0000-000000000132',
    '30000000-0000-0000-0000-000000000133',
    '30000000-0000-0000-0000-000000000134',
    '30000000-0000-0000-0000-000000000135'
  ],
  // SMP 9M1 students
  [CLASS_IDS.SMP_9M1]: [
    '30000000-0000-0000-0000-000000000141',
    '30000000-0000-0000-0000-000000000142',
    '30000000-0000-0000-0000-000000000143',
    '30000000-0000-0000-0000-000000000144',
    '30000000-0000-0000-0000-000000000145'
  ],
  // SMP 9MD2 students
  [CLASS_IDS.SMP_9MD2]: [
    '30000000-0000-0000-0000-000000000151',
    '30000000-0000-0000-0000-000000000152',
    '30000000-0000-0000-0000-000000000153',
    '30000000-0000-0000-0000-000000000154',
    '30000000-0000-0000-0000-000000000155'
  ]
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  console.log('📚 Seeding student enrollments in class offerings...');
  
  // Delete existing enrollments
  await knex('enrollments').del();
  
  // Get all class offerings
  const classOfferings = await knex('class_offerings')
    .select('id', 'class_id', 'subject_id')
    .where('is_active', true);
    
  console.log(`📋 Found ${classOfferings.length} class offerings to enroll students in`);

  const enrollments = [];
  const enrollmentDate = new Date('2024-07-15'); // Start of academic year
  
  // For each class offering, enroll all students from that class
  for (const offering of classOfferings) {
    const studentsInClass = STUDENT_CLASS_MAP[offering.class_id];
    
    if (studentsInClass && studentsInClass.length > 0) {
      for (const studentId of studentsInClass) {
        enrollments.push({
          id: uuidv4(),
          student_id: studentId,
          class_offering_id: offering.id,
          enrolled_at: enrollmentDate,
          status: 'active',
          status_changed_at: null,
          notes: 'Enrolled at start of academic year',
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
  }

  // Insert enrollments in batches
  console.log(`📝 Creating ${enrollments.length} student enrollments...`);
  const batchSize = 100;
  for (let i = 0; i < enrollments.length; i += batchSize) {
    const batch = enrollments.slice(i, i + batchSize);
    await knex('enrollments').insert(batch);
  }

  // Generate enrollment statistics
  const stats = {};
  for (const [classId, students] of Object.entries(STUDENT_CLASS_MAP)) {
    const className = Object.keys(CLASS_IDS).find(key => CLASS_IDS[key] === classId);
    const offeringsForClass = classOfferings.filter(o => o.class_id === classId).length;
    stats[className] = {
      students: students.length,
      subjects: offeringsForClass,
      total_enrollments: students.length * offeringsForClass
    };
  }

  console.log('✅ Student enrollments seeded successfully');
  console.log(`   📊 Enrollment Summary:`);
  console.log(`   - Total enrollments: ${enrollments.length}`);
  console.log(`   - Classes covered: ${Object.keys(CLASS_IDS).length}`);
  console.log(`   - Students per class: 5`);
  console.log(`   - Subjects per class: ~6`);
  console.log('   📋 Per-class breakdown:');
  
  for (const [className, stat] of Object.entries(stats)) {
    console.log(`     ${className}: ${stat.students} students × ${stat.subjects} subjects = ${stat.total_enrollments} enrollments`);
  }
  
  console.log('   🎯 All students now enrolled in their class subjects for Semester 1');
};
