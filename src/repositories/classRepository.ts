import { Knex } from 'knex';
import { Class, CreateClassRequest as CreateClassData, UpdateClassRequest as UpdateClassData } from '../types/class';

export class ClassRepository {
  constructor(private db: Knex) {}

  async findAll(): Promise<Class[]> {
    return await this.db('classes')
      .select('*')
      .where('is_active', true)
      .orderBy('name', 'asc');
  }

  async findBySchoolId(schoolId: string): Promise<Class[]> {
    return await this.db('classes')
      .select('*')
      .where('school_id', schoolId)
      .where('is_active', true)
      .orderBy('grade_level', 'asc')
      .orderBy('name', 'asc');
  }

  async findById(id: string): Promise<Class | null> {
    const classItem = await this.db('classes')
      .where('id', id)
      .where('is_active', true)
      .first();
    
    return classItem || null;
  }

  async create(data: CreateClassData): Promise<string> {
    const [classItem] = await this.db('classes')
      .insert({
        id: this.generateUUID(),
        ...data,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('id');
    
    return classItem.id;
  }

  async update(id: string, data: UpdateClassData): Promise<void> {
    await this.db('classes')
      .where('id', id)
      .update({
        ...data,
        updated_at: new Date()
      });
  }

  async delete(id: string): Promise<void> {
    await this.db('classes')
      .where('id', id)
      .update({
        is_active: false,
        updated_at: new Date()
      });
  }

  async findStudentsByClassId(classId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    
    return await this.db('user_classes')
      .join('users', 'user_classes.user_id', 'users.id')
      .where('user_classes.class_id', classId)
      .where('user_classes.is_active', true)
      .where('users.user_type', 'student')
      .where('users.is_active', true)
      .select(
        'users.id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.phone',
        'users.avatar_url',
        'users.user_type',
        'users.role',
        'users.school_id',
        'users.student_id',
        'users.is_active',
        'users.created_at',
        'users.updated_at',
        'user_classes.role_in_class',
        'user_classes.created_at as enrolled_at'
      )
      .orderBy('users.last_name', 'asc')
      .limit(limit)
      .offset(offset);
  }

  async findTeachersByClassId(classId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    
    return await this.db('user_classes')
      .join('users', 'user_classes.user_id', 'users.id')
      .where('user_classes.class_id', classId)
      .where('user_classes.is_active', true)
      .where('users.user_type', 'teacher')
      .where('users.is_active', true)
      .select(
        'users.id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.phone',
        'users.avatar_url',
        'users.user_type',
        'users.role',
        'users.school_id',
        'users.employee_id',
        'users.is_active',
        'users.created_at',
        'users.updated_at',
        'user_classes.role_in_class',
        'user_classes.created_at as enrolled_at'
      )
      .orderBy('users.last_name', 'asc')
      .limit(limit)
      .offset(offset);
  }

  async findClassSubjectsWithDetails(classId: string) {
    const result = await this.db.raw(`
      SELECT 
        cs.id as class_subject_id,
        cs.hours_per_week,
        cs.room as classroom,
        cs.schedule,
        s.id as subject_id,
        s.name as subject_name,
        s.code as subject_code,
        s.description as subject_description,
        u.id as teacher_id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
      FROM class_subjects cs
      JOIN subjects s ON cs.subject_id = s.id
      JOIN users u ON cs.teacher_id = u.id
      WHERE cs.class_id = ? AND cs.is_active = true AND s.is_active = true
      ORDER BY s.code
    `, [classId]);

    return result.rows;
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