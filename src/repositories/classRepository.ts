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

  async findStudentsByClassId(classId: string) {
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
        'users.student_id',
        'user_classes.role_in_class',
        'user_classes.created_at as enrolled_at'
      )
      .orderBy('users.last_name', 'asc');
  }

  async findTeachersByClassId(classId: string) {
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
        'users.employee_id',
        'user_classes.role_in_class',
        'user_classes.created_at as assigned_at'
      )
      .orderBy('users.last_name', 'asc');
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