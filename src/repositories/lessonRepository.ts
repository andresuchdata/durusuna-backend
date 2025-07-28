import { Knex } from 'knex';
import { Lesson, CreateLessonData, UpdateLessonData } from '../services/lessonService';

export class LessonRepository {
  constructor(private db: Knex) {}

  async findAll(): Promise<Lesson[]> {
    return await this.db('lessons')
      .select('*')
      .where('is_active', true)
      .orderBy('lesson_date', 'desc');
  }

  async findBySchoolId(schoolId: string): Promise<Lesson[]> {
    return await this.db('lessons')
      .select('*')
      .where('school_id', schoolId)
      .where('is_active', true)
      .orderBy('lesson_date', 'desc');
  }

  async findByTeacherId(teacherId: string): Promise<Lesson[]> {
    return await this.db('lessons')
      .select('*')
      .where('teacher_id', teacherId)
      .where('is_active', true)
      .orderBy('lesson_date', 'desc');
  }

  async findByClassId(classId: string): Promise<Lesson[]> {
    return await this.db('lessons')
      .join('class_subjects', 'lessons.class_subject_id', 'class_subjects.id')
      .select('lessons.*')
      .where('class_subjects.class_id', classId)
      .where('lessons.is_active', true)
      .where('class_subjects.is_active', true)
      .orderBy('lessons.start_time', 'desc');
  }

  async findByClassSubjectId(classSubjectId: string): Promise<Lesson[]> {
    return await this.db('lessons')
      .select('*')
      .where('class_subject_id', classSubjectId)
      .where('is_active', true)
      .orderBy('start_time', 'desc');
  }

  async findById(id: string): Promise<Lesson | null> {
    const lesson = await this.db('lessons')
      .where('id', id)
      .where('is_active', true)
      .first();
    
    return lesson || null;
  }

  async create(data: CreateLessonData & { teacher_id: string; school_id: string }): Promise<string> {
    const [lesson] = await this.db('lessons')
      .insert({
        id: this.generateUUID(),
        ...data,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('id');
    
    return lesson.id;
  }

  async update(id: string, data: UpdateLessonData): Promise<void> {
    await this.db('lessons')
      .where('id', id)
      .update({
        ...data,
        updated_at: new Date()
      });
  }

  async delete(id: string): Promise<void> {
    await this.db('lessons')
      .where('id', id)
      .update({
        is_active: false,
        updated_at: new Date()
      });
  }

  private generateUUID(): string {
    // Simple UUID generation - in production, use a proper UUID library
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
} 