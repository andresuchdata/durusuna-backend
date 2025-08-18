/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  console.log('🎯 Seeding sample assignments...');

  try {
    // Get sample class offerings for seeding assignments
    const classOfferings = await knex('class_offerings')
      .join('classes', 'class_offerings.class_id', 'classes.id')
      .join('subjects', 'class_offerings.subject_id', 'subjects.id')
      .where('class_offerings.is_active', true)
      .select(
        'class_offerings.id as offering_id',
        'class_offerings.primary_teacher_id',
        'classes.id as class_id',
        'classes.school_id as school_id',
        'classes.name as class_name',
        'subjects.name as subject_name'
      )
      .limit(5);

    if (classOfferings.length === 0) {
      console.log('   ⚠️ No class offerings found. Please run class offerings seed first.');
      return;
    }

    // Clear existing test assignments
    await knex('assessments').where('title', 'like', '%Test%').del();

    let insertedCount = 0;

    for (const offering of classOfferings) {
      const assignmentTypes = ['assignment', 'test', 'final_exam'];
      
      for (let i = 0; i < 3; i++) {
        const type = assignmentTypes[i % assignmentTypes.length];
        const assignedDate = new Date();
        assignedDate.setDate(assignedDate.getDate() - (7 * i)); // Stagger over weeks
        
        const dueDate = new Date(assignedDate);
        dueDate.setDate(dueDate.getDate() + 7); // Due in one week

        // Resolve a valid teacher to use as created_by
        let teacherId = offering.primary_teacher_id;

        if (!teacherId) {
          // Try additional teachers assigned to the offering
          try {
            const cot = await knex('class_offering_teachers')
              .where('class_offering_id', offering.offering_id)
              .where('is_active', true)
              .first();
            if (cot && cot.teacher_id) {
              teacherId = cot.teacher_id;
            }
          } catch (_) {
            // Table may not exist in older setups; ignore
          }
        }

        if (!teacherId) {
          // Fallback to any teacher in the same school
          const schoolTeacher = await knex('users')
            .where('school_id', offering.school_id)
            .where('user_type', 'teacher')
            .where('is_active', true)
            .first();
          if (schoolTeacher) {
            teacherId = schoolTeacher.id;
          }
        }

        if (!teacherId) {
          // Last resort: any active teacher
          const anyTeacher = await knex('users')
            .where('user_type', 'teacher')
            .where('is_active', true)
            .first();
          if (anyTeacher) {
            teacherId = anyTeacher.id;
          }
        }

        if (!teacherId) {
          console.warn(`   ⚠️  Skipping assignment seed for offering ${offering.offering_id} (${offering.class_name} - ${offering.subject_name}) because no teacher was found`);
          continue; // Skip this iteration to avoid NOT NULL violation
        }

        const assignment = {
          id: knex.raw('gen_random_uuid()'),
          class_offering_id: offering.offering_id,
          type: type,
          title: `${offering.subject_name} ${type === 'assignment' ? 'Assignment' : type === 'test' ? 'Quiz' : 'Final Exam'} ${i + 1}`,
          description: `Test ${type} for ${offering.class_name} - ${offering.subject_name}`,
          max_score: type === 'final_exam' ? 100 : type === 'test' ? 50 : 25,
          weight_override: null,
          group_tag: type === 'assignment' ? 'homework' : type === 'test' ? 'quiz' : 'final',
          sequence_no: i + 1,
          assigned_date: assignedDate,
          due_date: dueDate,
          rubric: JSON.stringify({
            criteria: [
              { name: 'Understanding', points: type === 'final_exam' ? 40 : 10 },
              { name: 'Application', points: type === 'final_exam' ? 35 : 8 },
              { name: 'Presentation', points: type === 'final_exam' ? 25 : 7 }
            ]
          }),
          instructions: JSON.stringify({
            description: `Complete the ${type} within the given timeframe`,
            materials: ['Textbook', 'Calculator', 'Notes'],
            submission_format: 'PDF upload'
          }),
          is_published: i < 2, // First two are published, last one is draft
          allow_late_submission: true,
          late_penalty_per_day: 0.1, // 10% per day
          created_by: teacherId,
          created_at: new Date(),
          updated_at: new Date()
        };

        await knex('assessments').insert(assignment);
        insertedCount++;
      }
    }

    console.log(`   ✅ Created ${insertedCount} sample assignments`);
    console.log(`   📊 Assignment distribution:`);
    console.log(`      - ${Math.floor(insertedCount / 3)} assignments per class offering`);
    console.log(`      - Mix of assignments, tests, and final exams`);
    console.log(`      - Some published, some drafts`);

  } catch (error) {
    console.error('❌ Error seeding assignments:', error);
    throw error;
  }
};
