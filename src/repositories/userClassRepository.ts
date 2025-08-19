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

  async getUserClass(userId: string, classId: string): Promise<UserClass | null> {
    const result = await this.db('user_classes')
      .where({
        user_id: userId,
        class_id: classId,
        is_active: true
      })
      .first();

    return result || null;
  }

  async getClassMembers(classId: string, role?: 'student' | 'teacher' | 'assistant'): Promise<UserClassWithUser[]> {
    let query = this.db('user_classes')
      .join('users', 'user_classes.user_id', 'users.id')
      .where('user_classes.class_id', classId)
      .where('user_classes.is_active', true)
      .where('users.is_active', true);

    if (role) {
      query = query.where('user_classes.role_in_class', role);
    }

    const results = await query
      .select(
        'user_classes.*',
        'users.id as user_id',
        'users.email as user_email',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name',
        'users.user_type as user_user_type',
        'users.avatar_url as user_avatar_url',
        'users.student_id as user_student_id',
        'users.employee_id as user_employee_id'
      )
      .orderBy('users.last_name', 'asc')
      .orderBy('users.first_name', 'asc');

    return results.map(result => ({
      id: result.id,
      user_id: result.user_id,
      class_id: result.class_id,
      role_in_class: result.role_in_class,
      enrolled_at: result.created_at,
      is_active: result.is_active,
      created_at: result.created_at,
      updated_at: result.updated_at,
      user: {
        id: result.user_id,
        email: result.user_email,
        first_name: result.user_first_name,
        last_name: result.user_last_name,
        user_type: result.user_user_type,
        avatar_url: result.user_avatar_url,
        student_id: result.user_student_id,
        employee_id: result.user_employee_id
      }
    }));
  }

  async getClassById(classId: string): Promise<any> {
    const result = await this.db('classes')
      .where('id', classId)
      .where('is_active', true)
      .first();

    return result || null;
  }

  /**
   * Check if a teacher is the homeroom teacher for a specific class
   */
  async isHomeroomTeacher(teacherId: string, classId: string): Promise<boolean> {
    const classInfo = await this.db('classes')
      .where('id', classId)
      .where('is_active', true)
      .first();

    if (!classInfo || !classInfo.settings) {
      return false;
    }

    try {
      const settings = typeof classInfo.settings === 'string' 
        ? JSON.parse(classInfo.settings) 
        : classInfo.settings;

      return settings.homeroom_teacher_id === teacherId && settings.has_homeroom === true;
    } catch (error) {
      console.error('Error parsing class settings:', error);
      return false;
    }
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