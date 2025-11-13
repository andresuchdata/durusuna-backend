const { v4: uuidv4 } = require('uuid');

const TARGET_TEACHER_EMAILS = ['teacher1@asdf.com', 'teacher2@asdf.com'];
const SESSIONS_PER_SUBJECT = 2;

function getUpcomingMondayUtc() {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = base.getUTCDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  base.setUTCDate(base.getUTCDate() + (day === 1 ? 0 : daysUntilMonday));
  return base;
}

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function seedLessonInstances(knex) {
  console.log('📚 Seeding lesson instances for teacher1 and teacher2...');

  // Fetch target teachers
  const teachers = await knex('users')
    .whereIn('email', TARGET_TEACHER_EMAILS)
    .select('id', 'email', 'first_name', 'last_name');

  if (!teachers.length) {
    console.log('⚠️  Target teachers not found – skipping lesson instance seed');
    return;
  }

  const teacherIds = teachers.map((teacher) => teacher.id);

  // Locate class subjects taught by the target teachers
  const classSubjects = await knex('class_subjects as cs')
    .join('classes as c', 'cs.class_id', 'c.id')
    .join('subjects as s', 'cs.subject_id', 's.id')
    .whereIn('cs.teacher_id', teacherIds)
    .where('cs.is_active', true)
    .select(
      'cs.id as class_subject_id',
      'cs.teacher_id',
      'c.name as class_name',
      's.name as subject_name'
    );

  if (!classSubjects.length) {
    console.log('⚠️  No class subjects found for target teachers – skipping lesson instance seed');
    return;
  }

  const classSubjectIds = classSubjects.map((subject) => subject.class_subject_id);

  // Clean existing lesson instances for these subjects to avoid duplicates
  await knex('lesson_instances')
    .whereIn('class_subject_id', classSubjectIds)
    .del();

  const lessonInstances = [];
  let dayOffset = 0;
  const baseDate = getUpcomingMondayUtc();

  const createSessionDate = (offsetDays, hour, minute) => {
    const date = new Date(baseDate.getTime());
    date.setUTCDate(date.getUTCDate() + offsetDays);
    date.setUTCHours(hour, minute, 0, 0);
    return date.toISOString();
  };

  classSubjects.forEach((subject, index) => {
    const teacher = teachers.find((t) => t.id === subject.teacher_id);

    for (let session = 0; session < SESSIONS_PER_SUBJECT; session += 1) {
      const scheduledStart = createSessionDate(dayOffset, 7 + (session % 2) * 2, 0);
      const scheduledEnd = createSessionDate(dayOffset, 8 + (session % 2) * 2, 30);

      lessonInstances.push({
        id: uuidv4(),
        class_subject_id: subject.class_subject_id,
        schedule_slot_id: null,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        actual_start: null,
        actual_end: null,
        status: 'planned',
        title: `${subject.class_name} - ${subject.subject_name} Session ${session + 1}`,
        description: `Planned ${subject.subject_name} lesson for ${subject.class_name}.`,
        objectives: JSON.stringify([
          `Strengthen understanding of ${subject.subject_name}.`,
          'Encourage active classroom participation.',
        ]),
        materials: JSON.stringify([
          { type: 'presentation', description: `${subject.subject_name} slides` },
          { type: 'worksheet', description: 'Practice problems and discussion questions' },
        ]),
        notes: `Facilitated by ${teacher ? teacher.first_name : 'assigned teacher'}.`,
        cancellation_reason: null,
        created_by: subject.teacher_id,
        updated_by: subject.teacher_id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      dayOffset += 1;
    }

    // Add a small gap between subjects to vary scheduling weeks
    if ((index + 1) % 3 === 0) {
      dayOffset += 2;
    }
  });

  if (!lessonInstances.length) {
    console.log('⚠️  No lesson instances generated – skipping insert');
    return;
  }

  await knex('lesson_instances').insert(lessonInstances);

  console.log(`✅ Inserted ${lessonInstances.length} lesson instances for ${teachers.length} teachers`);
};
