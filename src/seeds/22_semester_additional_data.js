const { v4: uuidv4 } = require('uuid');

const CLASS_IDS = {
  SDIT_1A: '50000000-0000-0000-0000-000000000001',
  SDIT_6C: '50000000-0000-0000-0000-000000000006',
};

const SUBJECT_IDS = {
  MATEMATIKA: '60000000-0000-0000-0000-000000000001',
};

const TEACHER_IDS = {
  TEACHER_SDIT_1: '20000000-0000-0000-0000-000000000001',
};

const STUDENT_CLASS_MAP = {
  [CLASS_IDS.SDIT_1A]: [
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000005',
  ],
  [CLASS_IDS.SDIT_6C]: [
    '30000000-0000-0000-0000-000000000051',
    '30000000-0000-0000-0000-000000000052',
    '30000000-0000-0000-0000-000000000053',
    '30000000-0000-0000-0000-000000000054',
    '30000000-0000-0000-0000-000000000055',
  ],
};

const PASS_THRESHOLD = 65;

function getLetterGrade(numeric) {
  if (numeric >= 90) return 'A';
  if (numeric >= 80) return 'B';
  if (numeric >= 70) return 'C';
  if (numeric >= 65) return 'D';
  return 'E';
}

exports.seed = async function (knex) {
  console.log('📚 Seeding additional semester data (Sem2 2024/2025 + Sem1 2025/2026)...');

  const year2024 = await knex('academic_years').where('name', '2024-2025').first();
  if (!year2024) {
    console.log('❌ Academic year 2024-2025 not found, skipping');
    return;
  }

  let semester1_2024 = await knex('academic_periods')
    .where({ academic_year_id: year2024.id, type: 'semester', sequence: 1 })
    .first();
  let semester2_2024 = await knex('academic_periods')
    .where({ academic_year_id: year2024.id, type: 'semester', sequence: 2 })
    .first();

  if (!semester1_2024) {
    console.log('❌ Semester 1 2024/2025 not found, skipping');
    return;
  }

  if (!semester2_2024) {
    const [inserted] = await knex('academic_periods')
      .insert({
        id: uuidv4(),
        academic_year_id: year2024.id,
        name: 'Semester 2',
        type: 'semester',
        sequence: 2,
        start_date: '2025-01-06',
        end_date: '2025-06-30',
        is_active: true,
        is_current: false,
        settings: JSON.stringify({ ramadan_adjustment: true }),
      })
      .returning('*');
    semester2_2024 = inserted;
  }

  let year2025 = await knex('academic_years')
    .where({ name: '2025-2026', school_id: year2024.school_id })
    .first();

  if (!year2025) {
    const [insertedYear] = await knex('academic_years')
      .insert({
        id: uuidv4(),
        school_id: year2024.school_id,
        name: '2025-2026',
        start_date: '2025-07-15',
        end_date: '2026-06-30',
        is_active: true,
        is_current: false,
        settings: JSON.stringify({ semester_system: true }),
      })
      .returning('*');
    year2025 = insertedYear;
  }

  let semester1_2025 = await knex('academic_periods')
    .where({ academic_year_id: year2025.id, type: 'semester', sequence: 1 })
    .first();

  if (!semester1_2025) {
    const [insertedSem1] = await knex('academic_periods')
      .insert({
        id: uuidv4(),
        academic_year_id: year2025.id,
        name: 'Semester 1',
        type: 'semester',
        sequence: 1,
        start_date: '2025-07-15',
        end_date: '2025-12-20',
        is_active: true,
        is_current: false,
        settings: JSON.stringify({ ramadan_adjustment: false }),
      })
      .returning('*');
    semester1_2025 = insertedSem1;
  }

  await knex('academic_periods').update({ is_current: false });
  await knex('academic_periods')
    .where({ id: semester1_2025.id })
    .update({ is_current: true });

  const mathSubject = await knex('subjects')
    .where('id', SUBJECT_IDS.MATEMATIKA)
    .first();

  if (!mathSubject) {
    console.log('❌ Matematika subject not found, skipping');
    return;
  }

  const now = new Date();

  const offeringsSem2 = [];
  const offeringsSem1Next = [];

  for (const classId of [CLASS_IDS.SDIT_1A, CLASS_IDS.SDIT_6C]) {
    offeringsSem2.push({
      id: uuidv4(),
      class_id: classId,
      subject_id: mathSubject.id,
      academic_period_id: semester2_2024.id,
      primary_teacher_id: TEACHER_IDS.TEACHER_SDIT_1,
      hours_per_week: 5,
      room: 'Room Sem2',
      schedule: JSON.stringify({ Monday: '07:00-08:30' }),
      grading_settings: JSON.stringify({}),
      grade_display_mode: 'numeric',
      enable_grade_curve: false,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    offeringsSem1Next.push({
      id: uuidv4(),
      class_id: classId,
      subject_id: mathSubject.id,
      academic_period_id: semester1_2025.id,
      primary_teacher_id: TEACHER_IDS.TEACHER_SDIT_1,
      hours_per_week: 5,
      room: 'Room Sem1',
      schedule: JSON.stringify({ Monday: '07:00-08:30' }),
      grading_settings: JSON.stringify({}),
      grade_display_mode: 'numeric',
      enable_grade_curve: false,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
  }

  await knex('class_offerings').insert(offeringsSem2);
  await knex('class_offerings').insert(offeringsSem1Next);

  const enrollments = [];

  for (const offering of [...offeringsSem2, ...offeringsSem1Next]) {
    const students = STUDENT_CLASS_MAP[offering.class_id] || [];
    const enrolledAt =
      offering.academic_period_id === semester2_2024.id
        ? new Date('2025-01-10')
        : new Date('2025-07-15');

    for (const studentId of students) {
      enrollments.push({
        id: uuidv4(),
        student_id: studentId,
        class_offering_id: offering.id,
        enrolled_at: enrolledAt,
        status: 'active',
        status_changed_at: null,
        notes: 'Additional semester seed',
        created_at: now,
        updated_at: now,
      });
    }
  }

  await knex('enrollments').insert(enrollments);

  const finalGradesSem2 = [];
  const finalGradesSem1Next = [];

  for (const offering of offeringsSem2) {
    const students = STUDENT_CLASS_MAP[offering.class_id] || [];
    students.forEach((studentId, index) => {
      const base = offering.class_id === CLASS_IDS.SDIT_1A ? 82 : 78;
      const numeric = Math.min(100, base + index * 2);
      finalGradesSem2.push({
        id: uuidv4(),
        student_id: studentId,
        class_offering_id: offering.id,
        numeric_grade: numeric,
        letter_grade: getLetterGrade(numeric),
        is_passing: numeric >= PASS_THRESHOLD,
        is_published: true,
        published_at: now,
        is_locked: true,
      });
    });
  }

  for (const offering of offeringsSem1Next) {
    const students = STUDENT_CLASS_MAP[offering.class_id] || [];
    students.forEach((studentId, index) => {
      const base = offering.class_id === CLASS_IDS.SDIT_1A ? 80 : 76;
      const numeric = Math.min(100, base + index * 2);
      finalGradesSem1Next.push({
        id: uuidv4(),
        student_id: studentId,
        class_offering_id: offering.id,
        numeric_grade: numeric,
        letter_grade: getLetterGrade(numeric),
        is_passing: numeric >= PASS_THRESHOLD,
        is_published: false,
        is_locked: false,
      });
    });
  }

  await knex('final_grades').insert(finalGradesSem2);
  await knex('final_grades').insert(finalGradesSem1Next);

  // Create simplified assessments and grades for Semester 2 2024/2025 (Matematika)
  const finalGradeLookup = finalGradesSem2.reduce((map, fg) => {
    map[`${fg.student_id}|${fg.class_offering_id}`] = fg.numeric_grade;
    return map;
  }, {});

  const assessments = [];
  const assessmentGrades = [];

  const semester2Start = new Date('2025-01-06');
  const semester2Mid = new Date('2025-03-15');
  const semester2End = new Date('2025-06-20');

  function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function randomOffset(range) {
    return Math.random() * 2 * range - range;
  }

  const assessmentTypes = [
    {
      key: 'homework',
      title: 'Tugas Harian',
      dbType: 'assignment',
      groupTag: 'homework',
      maxScore: 100,
      weight: 0.25,
      dueDate: semester2Start,
    },
    {
      key: 'assignment',
      title: 'Tugas Proyek',
      dbType: 'assignment',
      groupTag: 'assignment',
      maxScore: 100,
      weight: 0.25,
      dueDate: new Date('2025-04-01'),
    },
    {
      key: 'midterm',
      title: 'Ujian Tengah Semester',
      dbType: 'assignment',
      groupTag: 'midterm',
      maxScore: 100,
      weight: 0.2,
      dueDate: semester2Mid,
    },
    {
      key: 'final',
      title: 'Ujian Akhir Semester',
      dbType: 'final_exam',
      groupTag: 'final',
      maxScore: 100,
      weight: 0.3,
      dueDate: semester2End,
    },
  ];

  const sem2OfferingIds = new Set(offeringsSem2.map((o) => o.id));
  const studentsByOffering = enrollments.reduce((map, e) => {
    if (!sem2OfferingIds.has(e.class_offering_id)) return map;
    if (!map[e.class_offering_id]) map[e.class_offering_id] = [];
    map[e.class_offering_id].push(e.student_id);
    return map;
  }, {});

  for (const offering of offeringsSem2) {
    const students = studentsByOffering[offering.id] || [];
    if (!students.length) continue;

    assessmentTypes.forEach((type, index) => {
      const dueDate = type.dueDate;
      const assignedDate = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const assessmentId = uuidv4();

      assessments.push({
        id: assessmentId,
        class_offering_id: offering.id,
        type: type.dbType,
        title: `${type.title} - ${mathSubject.name}`,
        description: `${type.title} Semester 2 2024/2025 untuk ${mathSubject.name}`,
        max_score: type.maxScore,
        weight_override: type.weight,
        group_tag: type.groupTag,
        sequence_no: index + 1,
        assigned_date: assignedDate.toISOString().split('T')[0],
        due_date: dueDate,
        rubric: null,
        instructions: null,
        is_published: true,
        allow_late_submission: type.key === 'homework' || type.key === 'assignment',
        late_penalty_per_day:
          type.key === 'homework' ? 0.05 : type.key === 'assignment' ? 0.1 : null,
        created_by: offering.primary_teacher_id || TEACHER_IDS.TEACHER_SDIT_1,
        created_at: assignedDate,
        updated_at: assignedDate,
      });

      students.forEach((studentId) => {
        const baseNumeric = finalGradeLookup[`${studentId}|${offering.id}`] || 75;
        const range = type.key === 'final' || type.key === 'midterm' ? 10 : 5;
        const score = clampScore(baseNumeric + randomOffset(range));
        const submittedAt = new Date(dueDate.getTime() - 2 * 24 * 60 * 60 * 1000);
        const gradedAt = new Date(submittedAt.getTime() + 2 * 24 * 60 * 60 * 1000);

        assessmentGrades.push({
          id: uuidv4(),
          assessment_id: assessmentId,
          student_id: studentId,
          score,
          adjusted_score: score,
          status: 'graded',
          submitted_at: submittedAt,
          graded_at: gradedAt,
          graded_by: offering.primary_teacher_id || TEACHER_IDS.TEACHER_SDIT_1,
          feedback: 'Nilai berdasarkan simulasi rapor Semester 2.',
          rubric_scores: null,
          is_late: false,
          days_late: 0,
          attachments: JSON.stringify([]),
          created_at: submittedAt,
          updated_at: gradedAt,
        });
      });
    });
  }

  if (assessments.length > 0) {
    await knex('assessments').insert(assessments);
  }

  if (assessmentGrades.length > 0) {
    await knex('assessment_grades').insert(assessmentGrades);
  }

  const gradesByStudent = finalGradesSem2.reduce((map, fg) => {
    if (!map[fg.student_id]) map[fg.student_id] = [];
    map[fg.student_id].push(fg);
    return map;
  }, {});

  const reportCards = [];
  const reportCardSubjects = [];

  for (const classId of [CLASS_IDS.SDIT_1A, CLASS_IDS.SDIT_6C]) {
    const students = STUDENT_CLASS_MAP[classId] || [];

    for (const studentId of students) {
      const rcId = uuidv4();
      reportCards.push({
        id: rcId,
        student_id: studentId,
        class_id: classId,
        academic_period_id: semester2_2024.id,
        is_published: true,
        is_locked: true,
        published_at: now,
      });

      const grades = gradesByStudent[studentId] || [];
      grades.forEach((fg, index) => {
        reportCardSubjects.push({
          id: uuidv4(),
          report_card_id: rcId,
          class_offering_id: fg.class_offering_id,
          final_grade_id: fg.id,
          subject_id: mathSubject.id,
          subject_name: mathSubject.name,
          subject_code: mathSubject.code,
          numeric_grade: fg.numeric_grade,
          letter_grade: fg.letter_grade,
          is_passing: fg.is_passing,
          sequence: index + 1,
        });
      });
    }
  }

  await knex('report_cards').insert(reportCards);
  await knex('report_card_subjects').insert(reportCardSubjects);

  console.log('✅ Additional semester data seeded');
};
