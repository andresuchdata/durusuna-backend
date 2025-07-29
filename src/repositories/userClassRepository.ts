import { Knex } from 'knex';
import { UserClass, UserClassWithUser, UserClassWithClass } from '../types/class';

export class UserClassRepository {
  constructor(private db: Knex) {}

  async findUserClassesByUserId(userId: string): Promise<UserClassWithClass[]> {
    const results = await this.db('user_classes')
      .join('classes', 'user_classes.class_id', 'classes.id')
      .where('user_classes.user_id', userId)
      .where('user_classes.is_active', true)
      .where('classes.is_active', true)
      .select(
        'user_classes.*',
        'classes.id as class_id',
        'classes.school_id as class_school_id',
        'classes.name as class_name',
        'classes.description as class_description',
        'classes.grade_level as class_grade_level',
        'classes.section as class_section',
        'classes.academic_year as class_academic_year',
        'classes.settings as class_settings',
        'classes.is_active as class_is_active',
        'classes.created_at as class_created_at',
        'classes.updated_at as class_updated_at'
      )
      .orderBy('classes.name', 'asc');

    // Transform flattened data into nested structure
    return results.map(result => ({
      id: result.id,
      user_id: result.user_id,
      class_id: result.class_id,
      role_in_class: result.role_in_class,
      enrolled_at: result.created_at, // Map created_at to enrolled_at
      is_active: result.is_active,
      created_at: result.created_at,
      updated_at: result.updated_at,
      class: {
        id: result.class_id,
        school_id: result.class_school_id,
        name: result.class_name,
        description: result.class_description,
        grade_level: result.class_grade_level,
        section: result.class_section,
        academic_year: result.class_academic_year,
        settings: result.class_settings,
        is_active: result.class_is_active,
        created_at: result.class_created_at,
        updated_at: result.class_updated_at
      }
    }));
  }

  async findUserClass(userId: string, classId: string): Promise<UserClass | null> {
    const userClass = await this.db('user_classes')
      .where({
        user_id: userId,
        class_id: classId,
        is_active: true
      })
      .first();
    
    return userClass || null;
  }

  async checkUserClassAccess(userId: string, classId: string): Promise<boolean> {
    const userClass = await this.db('user_classes')
      .where({
        user_id: userId,
        class_id: classId,
        is_active: true
      })
      .first();
    
    return !!userClass;
  }

  async checkUserSchoolAccess(userId: string, schoolId: string): Promise<boolean> {
    const user = await this.db('users')
      .where('id', userId)
      .where('school_id', schoolId)
      .first();
    
    return !!user;
  }

  async getUserType(userId: string): Promise<{ user_type: string; role: string; school_id: string } | null> {
    const user = await this.db('users')
      .where('id', userId)
      .select('user_type', 'role', 'school_id')
      .first();
    
    return user || null;
  }

  async getClassStudentCount(classId: string): Promise<number> {
    const result = await this.db('user_classes')
      .join('users', 'user_classes.user_id', 'users.id')
      .where('user_classes.class_id', classId)
      .where('user_classes.is_active', true)
      .where('users.user_type', 'student')
      .where('users.is_active', true)
      .count('* as count')
      .first();
    
    return parseInt(result?.count as string) || 0;
  }

  async getClassTeacherCount(classId: string): Promise<number> {
    const result = await this.db('user_classes')
      .join('users', 'user_classes.user_id', 'users.id')
      .where('user_classes.class_id', classId)
      .where('user_classes.is_active', true)
      .where('users.user_type', 'teacher')
      .where('users.is_active', true)
      .count('* as count')
      .first();
    
    return parseInt(result?.count as string) || 0;
  }

  async addUserToClass(userId: string, classId: string, roleInClass: 'student' | 'teacher' | 'assistant'): Promise<string> {
    const [userClass] = await this.db('user_classes')
      .insert({
        id: this.generateUUID(),
        user_id: userId,
        class_id: classId,
        role_in_class: roleInClass,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('id');
    
    return userClass.id;
  }

  async removeUserFromClass(userId: string, classId: string): Promise<void> {
    await this.db('user_classes')
      .where({
        user_id: userId,
        class_id: classId
      })
      .update({
        is_active: false,
        updated_at: new Date()
      });
  }

  async updateUserClassRole(userId: string, classId: string, roleInClass: 'student' | 'teacher' | 'assistant'): Promise<void> {
    await this.db('user_classes')
      .where({
        user_id: userId,
        class_id: classId
      })
      .update({
        role_in_class: roleInClass,
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