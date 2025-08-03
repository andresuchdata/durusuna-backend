import { Knex } from 'knex';
import { Lesson, CreateLessonRequest, UpdateLessonRequest } from '../types/lesson';

export class LessonRepository {
  constructor(private db: Knex) {}

  async findAll(): Promise<Lesson[]> {
    return await this.db('lessons')
      .select('*')
      .orderBy('start_time', 'desc');
  }

  async findBySchoolId(schoolId: string): Promise<Lesson[]> {
    // Join with classes to filter by school_id since lessons don't have school_id directly
    return await this.db('lessons')
      .join('classes', 'lessons.class_id', 'classes.id')
      .select('lessons.*')
      .where('classes.school_id', schoolId)
      .orderBy('lessons.start_time', 'desc');
  }

  async findByTeacherId(teacherId: string): Promise<Lesson[]> {
    // Join with class_subjects to filter by teacher_id since lessons don't have teacher_id directly
    return await this.db('lessons')
      .join('class_subjects', 'lessons.class_id', 'class_subjects.class_id')
      .select('lessons.*')
      .where('class_subjects.teacher_id', teacherId)
      .orderBy('lessons.start_time', 'desc');
  }

  async findByClassId(classId: string): Promise<Lesson[]> {
    return await this.db('lessons')
      .select('*')
      .where('class_id', classId)
      .orderBy('start_time', 'desc');
  }

  async findByClassSubjectId(classSubjectId: string): Promise<Lesson[]> {
    // Since lessons table doesn't have class_subject_id, we need to find lessons
    // by joining through class_subjects to get the class_id, then filter by subject
    const result = await this.db('lessons')
      .join('class_subjects', 'lessons.class_id', 'class_subjects.class_id')
      .join('subjects', 'class_subjects.subject_id', 'subjects.id')
      .select('lessons.*')
      .where('class_subjects.id', classSubjectId)
      .orderBy('lessons.start_time', 'desc');
    
    return result;
  }

  async findById(id: string): Promise<Lesson | null> {
    const lesson = await this.db('lessons')
      .where('id', id)
      .first();
    
    return lesson || null;
  }

  async create(data: any): Promise<string> {
    const [lesson] = await this.db('lessons')
      .insert({
        id: this.generateUUID(),
        class_id: data.class_id,
        title: data.title,
        description: data.description,
        subject: data.subject || 'General',
        start_time: data.start_time,
        end_time: data.end_time,
        location: data.location,
        status: 'scheduled',
        materials: data.materials || [],
        settings: data.settings || {},
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('id');
    
    return lesson.id;
  }

  async update(id: string, data: any): Promise<void> {
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
      .delete();
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