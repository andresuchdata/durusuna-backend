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

  async findStudentsByClassId(classId: string, page: number = 1, limit: number = 20, search?: string) {
    const offset = (page - 1) * limit;
    
    let query = this.db('user_classes')
      .join('users', 'user_classes.user_id', 'users.id')
      .where('user_classes.class_id', classId)
      .where('user_classes.is_active', true)
      .where('users.user_type', 'student')
      .where('users.is_active', true);

    // Add search filter if provided
    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      query = query.where(function() {
        this.where('users.first_name', 'ilike', searchPattern)
            .orWhere('users.last_name', 'ilike', searchPattern)
            .orWhere('users.email', 'ilike', searchPattern)
            .orWhere(this.client.raw("CONCAT(users.first_name, ' ', users.last_name)"), 'ilike', searchPattern);
      });
    }

    return await query
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

  async findClassSubjectsWithDetails(classId: string, teacherId?: string) {
    let query = `
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
      LEFT JOIN users u ON cs.teacher_id = u.id
      WHERE cs.class_id = ? AND cs.is_active = true AND s.is_active = true
    `;

    const params = [classId];

    // If teacherId is provided, filter to show only subjects taught by that teacher
    if (teacherId) {
      query += ` AND cs.teacher_id = ?`;
      params.push(teacherId);
    }

    query += ` ORDER BY s.code`;

    const result = await this.db.raw(query, params);
    return result.rows;
  }

  /**
   * Get class offerings (newer structure) for a specific class, optionally filtered by teacher
   */
  async findClassOfferingsWithDetails(classId: string, teacherId?: string, academicPeriodId?: string) {
    let query = this.db('class_offerings as co')
      .join('subjects as s', 'co.subject_id', 's.id')
      .join('classes as c', 'co.class_id', 'c.id')
      .leftJoin('users as primary_teacher', 'co.primary_teacher_id', 'primary_teacher.id')
      .where('co.class_id', classId)
      .where('co.is_active', true)
      .where('s.is_active', true)
      .select([
        'co.id as class_offering_id',
        'co.hours_per_week',
        'co.room',
        'co.schedule',
        's.id as subject_id',
        's.name as subject_name',
        's.code as subject_code',
        's.description as subject_description',
        'primary_teacher.id as teacher_id',
        'primary_teacher.first_name',
        'primary_teacher.last_name',
        'primary_teacher.email',
        'primary_teacher.avatar_url'
      ]);

    if (academicPeriodId) {
      query = query.where('co.academic_period_id', academicPeriodId);
    }

    // If teacherId is provided, filter by teacher
    if (teacherId) {
      query = query.where(function() {
        this.where('co.primary_teacher_id', teacherId)
          .orWhereExists(function() {
            this.select('*')
              .from('class_offering_teachers as cot')
              .whereRaw('cot.class_offering_id = co.id')
              .where('cot.teacher_id', teacherId)
              .where('cot.is_active', true);
          });
      });
    }

    const result = await query.orderBy('s.code');
    return result;
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