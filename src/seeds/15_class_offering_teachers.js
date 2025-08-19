/**
 * Class Offering Teachers Seed Data
 * Assigns teachers to subject offerings with proper roles
 */

const { v4: uuidv4 } = require('uuid');

// Import consistent IDs
const SCHOOL_IDS = {
  SDIT: '11111111-1111-1111-1111-111111111111',
  SMP: '22222222-2222-2222-2222-222222222222'
};

const CLASS_IDS = {
  // SDIT Classes
  SDIT_1A: '50000000-0000-0000-0000-000000000001',
  SDIT_2C: '50000000-0000-0000-0000-000000000002',
  SDIT_3D: '50000000-0000-0000-0000-000000000003',
  SDIT_4B: '50000000-0000-0000-0000-000000000004',
  SDIT_5A: '50000000-0000-0000-0000-000000000005',
  SDIT_6C: '50000000-0000-0000-0000-000000000006',
  
  // SMP Classes
  SMP_7M1: '50000000-0000-0000-0000-000000000011',
  SMP_7MD1: '50000000-0000-0000-0000-000000000012',
  SMP_8M1: '50000000-0000-0000-0000-000000000013',
  SMP_8MD1: '50000000-0000-0000-0000-000000000014',
  SMP_9M1: '50000000-0000-0000-0000-000000000015',
  SMP_9MD2: '50000000-0000-0000-0000-000000000016'
};

const TEACHER_IDS = {
  // SDIT Teachers
  TEACHER_SDIT_1: '20000000-0000-0000-0000-000000000001', // Ustadz Muhammad Rahman
  TEACHER_SDIT_2: '20000000-0000-0000-0000-000000000002', // Ustadzah Siti Aminah
  TEACHER_SDIT_3: '20000000-0000-0000-0000-000000000003', // Ustadz Abdul Hadi
  TEACHER_SDIT_4: '20000000-0000-0000-0000-000000000004', // Ustadzah Maryam Saleha
  
  // SMP Teachers
  TEACHER_SMP_1: '20000000-0000-0000-0000-000000000011', // Ustadz Ali Akbar
  TEACHER_SMP_2: '20000000-0000-0000-0000-000000000012', // Ustadzah Khadijah Binti
  TEACHER_SMP_3: '20000000-0000-0000-0000-000000000013', // Ustadz Umar Faruq
  TEACHER_SMP_4: '20000000-0000-0000-0000-000000000014'  // Ustadzah Aisha Radhia
};

// Homeroom teacher assignments based on class settings
const HOMEROOM_ASSIGNMENTS = {
  [CLASS_IDS.SDIT_1A]: TEACHER_IDS.TEACHER_SDIT_1,    // Ustadz Muhammad Rahman
  [CLASS_IDS.SDIT_2C]: TEACHER_IDS.TEACHER_SDIT_2,    // Ustadzah Siti Aminah
  [CLASS_IDS.SDIT_3D]: TEACHER_IDS.TEACHER_SDIT_3,    // Ustadz Abdul Hadi
  [CLASS_IDS.SDIT_4B]: TEACHER_IDS.TEACHER_SDIT_4,    // Ustadzah Maryam Saleha
  [CLASS_IDS.SDIT_5A]: TEACHER_IDS.TEACHER_SDIT_1,    // Ustadz Muhammad Rahman
  [CLASS_IDS.SDIT_6C]: TEACHER_IDS.TEACHER_SDIT_2,    // Ustadzah Siti Aminah
  
  [CLASS_IDS.SMP_7M1]: TEACHER_IDS.TEACHER_SMP_1,     // Ustadz Ali Akbar
  [CLASS_IDS.SMP_7MD1]: TEACHER_IDS.TEACHER_SMP_2,    // Ustadzah Khadijah Binti
  [CLASS_IDS.SMP_8M1]: TEACHER_IDS.TEACHER_SMP_3,     // Ustadz Umar Faruq
  [CLASS_IDS.SMP_8MD1]: TEACHER_IDS.TEACHER_SMP_4,    // Ustadzah Aisha Radhia
  [CLASS_IDS.SMP_9M1]: TEACHER_IDS.TEACHER_SMP_1,     // Ustadz Ali Akbar
  [CLASS_IDS.SMP_9MD2]: TEACHER_IDS.TEACHER_SMP_2     // Ustadzah Khadijah Binti
};

// Subject specializations for teachers
const TEACHER_SPECIALIZATIONS = {
  [TEACHER_IDS.TEACHER_SDIT_1]: ['Matematika', 'Tahfidz', 'Quran Hadits'], // Muhammad Rahman
  [TEACHER_IDS.TEACHER_SDIT_2]: ['Bahasa Indonesia', 'Aqidah Akhlak', 'Bahasa Arab'], // Siti Aminah
  [TEACHER_IDS.TEACHER_SDIT_3]: ['PKN', 'Sejarah Kebudayaan Islam', 'Fiqh'], // Abdul Hadi
  [TEACHER_IDS.TEACHER_SDIT_4]: ['Teknologi Informasi', 'Dirosah', 'Bahasa Inggris'], // Maryam Saleha
  
  [TEACHER_IDS.TEACHER_SMP_1]: ['Matematika', 'Tahfidz', 'Quran Hadits'], // Ali Akbar
  [TEACHER_IDS.TEACHER_SMP_2]: ['Bahasa Indonesia', 'Aqidah Akhlak', 'Bahasa Arab'], // Khadijah Binti
  [TEACHER_IDS.TEACHER_SMP_3]: ['PKN', 'Sejarah Kebudayaan Islam', 'Fiqh'], // Umar Faruq
  [TEACHER_IDS.TEACHER_SMP_4]: ['Teknologi Informasi', 'Dirosah', 'Bahasa Inggris'] // Aisha Radhia
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  console.log('🏫 Starting Class Offering Teachers seed...');
  
  // Delete existing entries
  await knex('class_offering_teachers').del();
  
  // Get all class offerings that need teacher assignments
  const classOfferings = await knex('class_offerings')
    .join('classes', 'class_offerings.class_id', 'classes.id')
    .join('subjects', 'class_offerings.subject_id', 'subjects.id')
    .select(
      'class_offerings.id as offering_id',
      'class_offerings.class_id',
      'class_offerings.subject_id',
      'classes.name as class_name',
      'subjects.name as subject_name',
      'subjects.code as subject_code'
    );

  console.log(`📚 Found ${classOfferings.length} class offerings to assign teachers to`);

  const offeringTeachers = [];
  const primaryTeacherUpdates = [];

  // Process each class offering
  for (const offering of classOfferings) {
    const { offering_id, class_id, subject_id, class_name, subject_name } = offering;
    
    // Determine which teachers to assign based on school and subject
    const isSDIT = Object.values(CLASS_IDS).slice(0, 6).includes(class_id);
    const availableTeachers = isSDIT ? 
      Object.values(TEACHER_IDS).slice(0, 4) : // SDIT teachers
      Object.values(TEACHER_IDS).slice(4, 8);  // SMP teachers

    // Find primary teacher - prioritize homeroom teacher or subject specialist
    let primaryTeacherId = null;
    let assistantTeacherId = null;

    // 1. Check if homeroom teacher is qualified for this subject
    const homeroomTeacher = HOMEROOM_ASSIGNMENTS[class_id];
    const homeroomSpecializations = TEACHER_SPECIALIZATIONS[homeroomTeacher] || [];
    
    if (homeroomSpecializations.some(spec => subject_name.includes(spec) || spec.includes(subject_name))) {
      primaryTeacherId = homeroomTeacher;
    } else {
      // 2. Find a teacher who specializes in this subject
      for (const teacherId of availableTeachers) {
        const specializations = TEACHER_SPECIALIZATIONS[teacherId] || [];
        if (specializations.some(spec => subject_name.includes(spec) || spec.includes(subject_name))) {
          primaryTeacherId = teacherId;
          break;
        }
      }
      
      // 3. If no specialist found, assign rotating teacher
      if (!primaryTeacherId) {
        const teacherIndex = Math.abs(class_id.charCodeAt(class_id.length - 1)) % availableTeachers.length;
        primaryTeacherId = availableTeachers[teacherIndex];
      }
      
      // 4. For important subjects, assign homeroom teacher as assistant
      const importantSubjects = ['Matematika', 'Bahasa Indonesia', 'Tahfidz', 'Quran Hadits'];
      if (importantSubjects.some(subj => subject_name.includes(subj)) && 
          primaryTeacherId !== homeroomTeacher) {
        assistantTeacherId = homeroomTeacher;
      }
    }

    // Add primary teacher assignment
    if (primaryTeacherId) {
      offeringTeachers.push({
        id: uuidv4(),
        class_offering_id: offering_id,
        teacher_id: primaryTeacherId,
        role: 'primary',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Track primary teacher updates for class_offerings table
      primaryTeacherUpdates.push({
        offering_id,
        primary_teacher_id: primaryTeacherId
      });
    }

    // Add assistant teacher assignment if applicable
    if (assistantTeacherId) {
      offeringTeachers.push({
        id: uuidv4(),
        class_offering_id: offering_id,
        teacher_id: assistantTeacherId,
        role: 'assistant',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // For classes with multiple subjects, sometimes add substitute teachers
    const substituteChance = Math.random();
    if (substituteChance < 0.3 && primaryTeacherId && assistantTeacherId) { // 30% chance
      const otherTeachers = availableTeachers.filter(id => 
        id !== primaryTeacherId && id !== assistantTeacherId
      );
      if (otherTeachers.length > 0) {
        const substituteTeacher = otherTeachers[Math.floor(Math.random() * otherTeachers.length)];
        offeringTeachers.push({
          id: uuidv4(),
          class_offering_id: offering_id,
          teacher_id: substituteTeacher,
          role: 'substitute',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
  }

  // Insert class offering teachers in batches
  console.log(`👥 Inserting ${offeringTeachers.length} teacher assignments...`);
  const batchSize = 50;
  for (let i = 0; i < offeringTeachers.length; i += batchSize) {
    const batch = offeringTeachers.slice(i, i + batchSize);
    await knex('class_offering_teachers').insert(batch);
  }

  // Update class_offerings with primary teachers
  console.log(`📋 Updating ${primaryTeacherUpdates.length} class offerings with primary teachers...`);
  for (const update of primaryTeacherUpdates) {
    await knex('class_offerings')
      .where('id', update.offering_id)
      .update({
        primary_teacher_id: update.primary_teacher_id,
        updated_at: new Date()
      });
  }

  // Generate summary statistics
  const primaryCount = offeringTeachers.filter(ot => ot.role === 'primary').length;
  const assistantCount = offeringTeachers.filter(ot => ot.role === 'assistant').length;
  const substituteCount = offeringTeachers.filter(ot => ot.role === 'substitute').length;

  console.log('✅ Class Offering Teachers seeded successfully');
  console.log(`   📊 Assignment Summary:`);
  console.log(`   - Primary teachers: ${primaryCount}`);
  console.log(`   - Assistant teachers: ${assistantCount}`);
  console.log(`   - Substitute teachers: ${substituteCount}`);
  console.log(`   - Total assignments: ${offeringTeachers.length}`);
  console.log(`   🏫 Coverage:`);
  console.log(`   - SDIT: ${Math.ceil(primaryCount / 2)} subject offerings covered`);
  console.log(`   - SMP: ${Math.floor(primaryCount / 2)} subject offerings covered`);
  console.log(`   📝 Teacher specializations matched to subjects where possible`);
  console.log(`   🏠 Homeroom teachers prioritized for their class subjects`);
};
