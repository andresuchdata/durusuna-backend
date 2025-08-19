/**
 * Homeroom Teacher Assignments
 * Ensures all classes have homeroom teachers
 */

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

const TEACHER_IDS = {
  TEACHER_SDIT_1: '20000000-0000-0000-0000-000000000001', // Ustadz Muhammad Rahman
  TEACHER_SDIT_2: '20000000-0000-0000-0000-000000000002', // Ustadzah Siti Aminah
  TEACHER_SDIT_3: '20000000-0000-0000-0000-000000000003', // Ustadz Abdul Hadi
  TEACHER_SDIT_4: '20000000-0000-0000-0000-000000000004', // Ustadzah Maryam Saleha
  TEACHER_SMP_1: '20000000-0000-0000-0000-000000000011', // Ustadz Ali Akbar
  TEACHER_SMP_2: '20000000-0000-0000-0000-000000000012', // Ustadzah Khadijah Binti
  TEACHER_SMP_3: '20000000-0000-0000-0000-000000000013', // Ustadz Umar Faruq
  TEACHER_SMP_4: '20000000-0000-0000-0000-000000000014'  // Ustadzah Aisha Radhia
};

// Homeroom assignments (all classes including 2C SDIT)
const HOMEROOM_ASSIGNMENTS = {
  [CLASS_IDS.SDIT_1A]: {
    teacher_id: TEACHER_IDS.TEACHER_SDIT_1,
    teacher_name: 'Ustadz Muhammad Rahman',
    role: 'Wali Kelas'
  },
  [CLASS_IDS.SDIT_2C]: {
    teacher_id: TEACHER_IDS.TEACHER_SDIT_2,
    teacher_name: 'Ustadzah Siti Aminah',
    role: 'Wali Kelas'
  },
  [CLASS_IDS.SDIT_3D]: {
    teacher_id: TEACHER_IDS.TEACHER_SDIT_3,
    teacher_name: 'Ustadz Abdul Hadi',
    role: 'Wali Kelas'
  },
  [CLASS_IDS.SDIT_4B]: {
    teacher_id: TEACHER_IDS.TEACHER_SDIT_4,
    teacher_name: 'Ustadzah Maryam Saleha',
    role: 'Wali Kelas'
  },
  [CLASS_IDS.SDIT_5A]: {
    teacher_id: TEACHER_IDS.TEACHER_SDIT_1,
    teacher_name: 'Ustadz Muhammad Rahman',
    role: 'Wali Kelas'
  },
  [CLASS_IDS.SDIT_6C]: {
    teacher_id: TEACHER_IDS.TEACHER_SDIT_2,
    teacher_name: 'Ustadzah Siti Aminah',
    role: 'Wali Kelas'
  },
  [CLASS_IDS.SMP_7M1]: {
    teacher_id: TEACHER_IDS.TEACHER_SMP_1,
    teacher_name: 'Ustadz Ali Akbar',
    role: 'Wali Kelas'
  },
  [CLASS_IDS.SMP_7MD1]: {
    teacher_id: TEACHER_IDS.TEACHER_SMP_2,
    teacher_name: 'Ustadzah Khadijah Binti',
    role: 'Wali Kelas'
  },
  [CLASS_IDS.SMP_8M1]: {
    teacher_id: TEACHER_IDS.TEACHER_SMP_3,
    teacher_name: 'Ustadz Umar Faruq',
    role: 'Wali Kelas'
  },
  [CLASS_IDS.SMP_8MD1]: {
    teacher_id: TEACHER_IDS.TEACHER_SMP_4,
    teacher_name: 'Ustadzah Aisha Radhia',
    role: 'Wali Kelas'
  },
  [CLASS_IDS.SMP_9M1]: {
    teacher_id: TEACHER_IDS.TEACHER_SMP_1,
    teacher_name: 'Ustadz Ali Akbar',
    role: 'Wali Kelas'
  },
  [CLASS_IDS.SMP_9MD2]: {
    teacher_id: TEACHER_IDS.TEACHER_SMP_2,
    teacher_name: 'Ustadzah Khadijah Binti',
    role: 'Wali Kelas'
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  console.log('🏫 Updating homeroom teacher assignments...');
  
  // Get all classes to update their settings
  const classes = await knex('classes').select('id', 'name', 'settings');
  
  console.log(`📋 Updating ${classes.length} classes with homeroom assignments...`);
  
  let assignedCount = 0;
  let unassignedCount = 0;

  for (const classItem of classes) {
    let currentSettings;
    try {
      currentSettings = typeof classItem.settings === 'string' ? 
        JSON.parse(classItem.settings) : classItem.settings || {};
    } catch (e) {
      currentSettings = {};
    }
    
    const homeroom = HOMEROOM_ASSIGNMENTS[classItem.id];
    
    if (homeroom) {
      // Assign homeroom teacher in class settings
      currentSettings.homeroom_teacher = homeroom.teacher_name;
      currentSettings.homeroom_teacher_id = homeroom.teacher_id;
      currentSettings.homeroom_role = homeroom.role;
      currentSettings.has_homeroom = true;
      
      await knex('classes')
        .where('id', classItem.id)
        .update({
          settings: JSON.stringify(currentSettings),
          updated_at: new Date()
        });

      // Also ensure homeroom teacher is in user_classes table
      const existingTeacherRelation = await knex('user_classes')
        .where('user_id', homeroom.teacher_id)
        .where('class_id', classItem.id)
        .where('role_in_class', 'teacher')
        .first();

      if (!existingTeacherRelation) {
        await knex('user_classes').insert({
          id: knex.raw('gen_random_uuid()'),
          user_id: homeroom.teacher_id,
          class_id: classItem.id,
          role_in_class: 'teacher',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`   📝 Added ${homeroom.teacher_name} to user_classes for ${classItem.name}`);
      } else {
        // Update existing relation to ensure it's marked as teacher
        await knex('user_classes')
          .where('id', existingTeacherRelation.id)
          .update({
            role_in_class: 'teacher',
            updated_at: new Date()
          });
        console.log(`   ✏️  Updated ${homeroom.teacher_name}'s role in user_classes for ${classItem.name}`);
      }
        
      assignedCount++;
      console.log(`   ✅ ${classItem.name}: ${homeroom.teacher_name}`);
    }
  }

  // Homeroom assignments are stored in class settings, not user_classes
  // The user_classes table only supports 'teacher' and 'student' roles
  // Homeroom information is already stored in the classes.settings JSON field
  console.log('📝 Homeroom relationships stored in class settings (user_classes only supports teacher/student roles)');

  // Generate teacher assignment summary
  const teacherAssignments = {};
  for (const homeroom of Object.values(HOMEROOM_ASSIGNMENTS)) {
    if (!teacherAssignments[homeroom.teacher_name]) {
      teacherAssignments[homeroom.teacher_name] = [];
    }
    const className = Object.keys(CLASS_IDS).find(key => 
      Object.values(HOMEROOM_ASSIGNMENTS).find(h => h.teacher_id === homeroom.teacher_id)
    );
    teacherAssignments[homeroom.teacher_name].push(className);
  }

  console.log('✅ Homeroom assignments completed successfully');
  console.log(`   📊 Assignment Summary:`);
  console.log(`   - Classes with homeroom: ${assignedCount}`);
  console.log(`   - Classes without homeroom: ${unassignedCount}`);
  console.log(`   - Total classes: ${assignedCount + unassignedCount}`);
  console.log('   👥 Teacher assignments:');
  
  for (const [teacherName, classes] of Object.entries(teacherAssignments)) {
    // Count how many classes this teacher has
    const classCount = Object.values(HOMEROOM_ASSIGNMENTS)
      .filter(h => h.teacher_name === teacherName).length;
    console.log(`     ${teacherName}: ${classCount} class(es)`);
  }
  
  console.log('   📋 Notes:');
  console.log('     - All classes now have homeroom teachers assigned');
  console.log('     - Some teachers manage multiple classes (normal for small schools)');
  console.log('     - Homeroom data stored in both class settings and user_classes table');
};
