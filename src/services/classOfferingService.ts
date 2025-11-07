import { Knex } from 'knex';
import { AuthenticatedRequest } from '../types/auth';

type AuthenticatedUser = AuthenticatedRequest['user'];

export class ClassOfferingService {
  constructor(private db: Knex) {}

  /**
   * Get all class offerings for admin users
   */
  async getAllClassOfferings(currentUser: AuthenticatedUser) {
    // Only admins can access all class offerings
    if (currentUser.role !== 'admin') {
      throw new Error('Access denied: Only administrators can access all class offerings');
    }

    const query = `
      SELECT 
        co.id,
        CAST(co.hours_per_week AS INTEGER) as hours_per_week,
        co.room,
        co.schedule,
        co.created_at,
        co.updated_at,
        s.id as subject_id,
        s.name as subject_name,
        s.code as subject_code,
        s.description as subject_description,
        c.id as class_id,
        c.name as class_name,
        c.grade_level,
        c.academic_year,
        pt.id as primary_teacher_id,
        pt.first_name as teacher_first_name,
        pt.last_name as teacher_last_name,
        pt.email as teacher_email,
        pt.avatar_url as teacher_avatar_url,
        CAST((SELECT COUNT(*) FROM enrollments WHERE class_offering_id = co.id AND is_active = true) AS INTEGER) as enrollment_count
      FROM class_offerings co
      JOIN subjects s ON co.subject_id = s.id
      JOIN classes c ON co.class_id = c.id
      LEFT JOIN users pt ON co.primary_teacher_id = pt.id
      WHERE co.is_active = true
        AND s.is_active = true
        AND c.is_active = true
        AND c.school_id = ?
      ORDER BY s.name ASC, c.name ASC, c.grade_level ASC
    `;

    const result = await this.db.raw(query, [currentUser.school_id]);
    return result.rows;
  }

  /**
   * Get class offering details by ID
   */
  async getClassOfferingById(offeringId: string, currentUser: AuthenticatedUser) {
    // Check if user has access to this class offering
    const hasAccess = await this.checkClassOfferingAccess(offeringId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied: Insufficient permissions to access this class offering');
    }

    const query = `
      SELECT 
        co.id,
        co.class_id,
        co.subject_id,
        co.primary_teacher_id,
        CAST(co.hours_per_week AS INTEGER) as hours_per_week,
        co.room,
        co.schedule,
        co.is_active,
        co.created_at,
        co.updated_at,
        s.name as subject_name,
        s.code as subject_code,
        s.description as subject_description,
        c.name as class_name,
        c.grade_level,
        c.academic_year,
        pt.first_name as teacher_first_name,
        pt.last_name as teacher_last_name,
        pt.email as teacher_email,
        pt.avatar_url as teacher_avatar_url,
        CAST((SELECT COUNT(*) FROM enrollments WHERE class_offering_id = co.id AND is_active = true) AS INTEGER) as enrollment_count
      FROM class_offerings co
      JOIN subjects s ON co.subject_id = s.id
      JOIN classes c ON co.class_id = c.id
      LEFT JOIN users pt ON co.primary_teacher_id = pt.id
      WHERE co.id = ?
        AND co.is_active = true
        AND s.is_active = true
        AND c.is_active = true
    `;

    const result = await this.db.raw(query, [offeringId]);
    return result.rows[0] || null;
  }

  /**
   * Check if user has access to a specific class offering
   */
  async checkClassOfferingAccess(offeringId: string, currentUser: AuthenticatedUser): Promise<boolean> {
    // Admins have access to all class offerings in their school
    if (currentUser.role === 'admin') {
      const offering = await this.db('class_offerings')
        .join('classes', 'class_offerings.class_id', 'classes.id')
        .where('class_offerings.id', offeringId)
        .where('classes.school_id', currentUser.school_id)
        .first();
      return !!offering;
    }

    // Teachers have access to offerings they teach
    if (currentUser.user_type === 'teacher') {
      const offering = await this.db('class_offerings')
        .where('id', offeringId)
        .where(function() {
          this.where('primary_teacher_id', currentUser.id)
            .orWhereExists(function() {
              this.select('*')
                .from('class_offering_teachers as cot')
                .whereRaw('cot.class_offering_id = class_offerings.id')
                .where('cot.teacher_id', currentUser.id)
                .where('cot.is_active', true);
            });
        })
        .first();
      return !!offering;
    }

    // Students have access to offerings they're enrolled in
    if (currentUser.user_type === 'student') {
      const enrollment = await this.db('enrollments')
        .where('student_id', currentUser.id)
        .where('class_offering_id', offeringId)
        .where('is_active', true)
        .where('status', 'active')
        .first();
      return !!enrollment;
    }

    // Parents have access to their children's offerings
    if (currentUser.user_type === 'parent') {
      const childEnrollment = await this.db('enrollments')
        .join('parent_student_relationships', 'enrollments.student_id', 'parent_student_relationships.student_id')
        .where('parent_student_relationships.parent_id', currentUser.id)
        .where('enrollments.class_offering_id', offeringId)
        .where('enrollments.is_active', true)
        .where('enrollments.status', 'active')
        .where('parent_student_relationships.is_active', true)
        .first();
      return !!childEnrollment;
    }

    return false;
  }

  /**
   * Create a new class offering
   */
  async createClassOffering(
    classId: string,
    subjectId: string,
    primaryTeacherId: string,
    hoursPerWeek: number,
    room?: string,
    schedule?: Record<string, any>,
    currentUser?: AuthenticatedUser
  ): Promise<string> {
    // Only admins can create class offerings
    if (currentUser && currentUser.role !== 'admin') {
      throw new Error('Access denied: Only administrators can create class offerings');
    }

    const [offering] = await this.db('class_offerings')
      .insert({
        id: this.generateUUID(),
        class_id: classId,
        subject_id: subjectId,
        primary_teacher_id: primaryTeacherId,
        hours_per_week: hoursPerWeek,
        room: room || null,
        schedule: schedule || {},
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('id');

    return offering.id;
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
