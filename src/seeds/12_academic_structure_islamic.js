/**
 * Islamic School Academic Structure Seed Data
 * For SDIT (Sekolah Dasar Islam Terpadu) and SMP IT (SMP Islam Terpadu)
 */

exports.seed = async function(knex) {
  // Get first school for seeding
  const [school] = await knex('schools').select('id').limit(1);
  if (!school) {
    console.log('No schools found, skipping academic structure seed');
    return;
  }

  // Create Academic Year 2024-2025
  const [academicYear] = await knex('academic_years').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      school_id: school.id,
      name: '2024-2025',
      start_date: '2024-07-15',
      end_date: '2025-06-30',
      is_active: true,
      is_current: true,
      settings: JSON.stringify({
        calendar_type: 'islamic',
        holidays: ['Idul Fitri', 'Idul Adha', 'Maulid Nabi'],
        semester_system: true
      })
    }
  ]).returning('*');

  // Create Semesters
  const [semester1, semester2] = await knex('academic_periods').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      academic_year_id: academicYear.id,
      name: 'Semester 1',
      type: 'semester',
      sequence: 1,
      start_date: '2024-07-15',
      end_date: '2024-12-20',
      is_active: true,
      is_current: true,
      settings: JSON.stringify({
        ramadan_adjustment: false,
        major_holidays: ['Idul Adha', 'Maulid Nabi']
      })
    },
    {
      id: knex.raw('gen_random_uuid()'),
      academic_year_id: academicYear.id,
      name: 'Semester 2',
      type: 'semester',
      sequence: 2,
      start_date: '2025-01-06',
      end_date: '2025-06-30',
      is_active: true,
      is_current: false,
      settings: JSON.stringify({
        ramadan_adjustment: true,
        major_holidays: ['Idul Fitri']
      })
    }
  ]).returning('*');

  // Update existing classes to use academic year
  await knex('classes').update({ academic_year_id: academicYear.id });

  // Get existing classes and subjects for Islamic school context
  const classes = await knex('classes').select('*').where({ school_id: school.id });
  const subjects = await knex('subjects').select('*');

  // Create Islamic school subjects if they don't exist
  const islamicSubjects = [
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Quran Hadits',
      code: 'QH',
      category: 'Agama Islam',
      description: 'Pembelajaran Al-Quran dan Hadits',
      color: '#2E8B57',
      icon: 'quran',
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Aqidah Akhlak',
      code: 'AA',
      category: 'Agama Islam',
      description: 'Pembelajaran Aqidah dan Akhlak Mulia',
      color: '#4682B4',
      icon: 'mosque',
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Fiqh',
      code: 'FQ',
      category: 'Agama Islam',
      description: 'Pembelajaran Fiqh dan Ibadah',
      color: '#8B4513',
      icon: 'prayer',
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Sejarah Kebudayaan Islam',
      code: 'SKI',
      category: 'Agama Islam',
      description: 'Sejarah dan Kebudayaan Islam',
      color: '#CD853F',
      icon: 'history',
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Bahasa Arab',
      code: 'BA',
      category: 'Bahasa',
      description: 'Pembelajaran Bahasa Arab',
      color: '#DAA520',
      icon: 'language',
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Tahfidz',
      code: 'TH',
      category: 'Agama Islam',
      description: 'Hafalan Al-Quran',
      color: '#9370DB',
      icon: 'book-open',
      is_active: true
    }
  ];

  // Insert Islamic subjects (ignore if already exist)
  for (const subject of islamicSubjects) {
    await knex('subjects').insert(subject).onConflict('code').ignore();
  }

  // Get all subjects including newly created Islamic ones
  const allSubjects = await knex('subjects').select('*');

  // Create class offerings for semester 1
  const classOfferings = [];
  for (const classItem of classes) {
    for (const subject of allSubjects) {
      // Determine grade display mode based on subject
      let gradeDisplayMode = 'numeric';
      let letterGradeScale = null;
      
      if (subject.category === 'Agama Islam') {
        gradeDisplayMode = 'both';
        letterGradeScale = {
          'A': 90,
          'B': 80,
          'C': 70,
          'D': 60,
          'E': 0
        };
      }

      classOfferings.push({
        id: knex.raw('gen_random_uuid()'),
        class_id: classItem.id,
        subject_id: subject.id,
        academic_period_id: semester1.id,
        primary_teacher_id: null, // Will be assigned by teacher assignment seed
        hours_per_week: subject.code === 'TH' ? 2 : (subject.category === 'Agama Islam' ? 3 : 4),
        room: null,
        schedule: JSON.stringify({}),
        grading_settings: JSON.stringify({
          islamic_context: subject.category === 'Agama Islam',
          include_akhlak: subject.category === 'Agama Islam',
          hafalan_component: subject.code === 'TH'
        }),
        grade_display_mode: gradeDisplayMode,
        letter_grade_scale: letterGradeScale ? JSON.stringify(letterGradeScale) : null,
        enable_grade_curve: false,
        curve_settings: null,
        is_active: true
      });
    }
  }

  // Insert class offerings in batches
  const batchSize = 50;
  for (let i = 0; i < classOfferings.length; i += batchSize) {
    const batch = classOfferings.slice(i, i + batchSize);
    await knex('class_offerings').insert(batch);
  }

  console.log(`Created academic structure for Islamic school:
    - Academic Year: ${academicYear.name}
    - Semesters: 2
    - Islamic Subjects: ${islamicSubjects.length}
    - Class Offerings: ${classOfferings.length}
  `);

  // Create default grading components for Islamic school
  const schoolGradingComponents = [
    {
      id: knex.raw('gen_random_uuid()'),
      scope: 'school',
      scope_ref_id: school.id,
      key: 'tugas_harian',
      display_label: 'Tugas Harian (Daily Assignments)',
      source_type: 'assignment',
      filters: JSON.stringify({ group_tag: 'tugas_harian' }),
      aggregator: JSON.stringify({
        type: 'average',
        missing_policy: 'ignore',
        rounding: 'half_up',
        decimal_places: 2
      }),
      version: 1,
      is_active: true,
      created_by: knex.raw("(SELECT id FROM users WHERE role = 'admin' LIMIT 1)")
    },
    {
      id: knex.raw('gen_random_uuid()'),
      scope: 'school',
      scope_ref_id: school.id,
      key: 'ulangan_harian',
      display_label: 'Ulangan Harian (Regular Tests)',
      source_type: 'test',
      filters: JSON.stringify({ group_tag: 'pengulangan' }),
      aggregator: JSON.stringify({
        type: 'average',
        missing_policy: 'ignore',
        rounding: 'half_up',
        decimal_places: 2
      }),
      version: 1,
      is_active: true,
      created_by: knex.raw("(SELECT id FROM users WHERE role = 'admin' LIMIT 1)")
    },
    {
      id: knex.raw('gen_random_uuid()'),
      scope: 'school',
      scope_ref_id: school.id,
      key: 'uts',
      display_label: 'UTS (Mid-Semester Exam)',
      source_type: 'test',
      filters: JSON.stringify({ group_tag: 'uts' }),
      aggregator: JSON.stringify({
        type: 'latest',
        missing_policy: 'zero',
        rounding: 'half_up',
        decimal_places: 2
      }),
      version: 1,
      is_active: true,
      created_by: knex.raw("(SELECT id FROM users WHERE role = 'admin' LIMIT 1)")
    },
    {
      id: knex.raw('gen_random_uuid()'),
      scope: 'school',
      scope_ref_id: school.id,
      key: 'uas',
      display_label: 'UAS (Final Semester Exam)',
      source_type: 'final_exam',
      filters: JSON.stringify({}),
      aggregator: JSON.stringify({
        type: 'latest',
        missing_policy: 'fail_validation',
        rounding: 'half_up',
        decimal_places: 2
      }),
      version: 1,
      is_active: true,
      created_by: knex.raw("(SELECT id FROM users WHERE role = 'admin' LIMIT 1)")
    }
  ];

  await knex('grading_components').insert(schoolGradingComponents);

  // Create default grading formula for Islamic school
  const schoolGradingFormula = {
    id: knex.raw('gen_random_uuid()'),
    scope: 'school',
    scope_ref_id: school.id,
    expression: '0.25 * tugas_harian + 0.25 * ulangan_harian + 0.2 * uts + 0.3 * uas',
    conditions: JSON.stringify([
      {
        condition: 'uas < 60',
        formula: 'uas',
        description: 'Jika nilai UAS kurang dari 60, nilai akhir = nilai UAS'
      },
      {
        condition: 'tugas_harian == null',
        formula: '0.4 * ulangan_harian + 0.25 * uts + 0.35 * uas',
        description: 'Jika tidak ada tugas harian'
      }
    ]),
    rounding_rule: 'half_up',
    decimal_places: 2,
    pass_threshold: 65,
    grade_boundaries: JSON.stringify({
      'A': 90,
      'B': 80,
      'C': 70,
      'D': 65,
      'E': 0
    }),
    version: 1,
    is_active: true,
    description: 'Formula penilaian standar sekolah Islam: 25% Tugas Harian + 25% Ulangan Harian + 20% UTS + 30% UAS',
    created_by: knex.raw("(SELECT id FROM users WHERE role = 'admin' LIMIT 1)")
  };

  await knex('grading_formulas').insert(schoolGradingFormula);

  console.log('Created default grading components and formula for Islamic school context');
};
