import { Knex } from 'knex';
import { Enrollment, EnrollmentWithStudent } from '../types/classOffering';

export class EnrollmentRepository {
  constructor(private db: Knex) {}

  /**
   * Get all active enrollments for a student with class offering details
   */
  async getStudentEnrollments(studentId: string): Promise<any[]> {
    const query = `
      SELECT 
        e.id as enrollment_id,
        e.enrolled_at,
        e.status as enrollment_status,
        co.id as class_offering_id,
        CAST(co.hours_per_week AS INTEGER) as hours_per_week,
        co.room,
        co.schedule,
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
      FROM enrollments e
      JOIN class_offerings co ON e.class_offering_id = co.id
      JOIN subjects s ON co.subject_id = s.id
      JOIN classes c ON co.class_id = c.id
      LEFT JOIN users pt ON co.primary_teacher_id = pt.id
      WHERE e.student_id = ?
        AND e.is_active = true
        AND e.status = 'active'
        AND co.is_active = true
        AND s.is_active = true
        AND c.is_active = true
      ORDER BY s.name ASC, c.name ASC, c.grade_level ASC
    `;

    const result = await this.db.raw(query, [studentId]);
    return result.rows;
  }

  /**
   * Get all active enrollments for children of a parent with class offering details
   */
  async getChildrenEnrollments(parentId: string): Promise<any[]> {
    const query = `
      SELECT DISTINCT
        e.id as enrollment_id,
        e.enrolled_at,
        e.status as enrollment_status,
        co.id as class_offering_id,
        CAST(co.hours_per_week AS INTEGER) as hours_per_week,
        co.room,
        co.schedule,
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
        student.first_name as student_first_name,
        student.last_name as student_last_name,
        CAST((SELECT COUNT(*) FROM enrollments WHERE class_offering_id = co.id AND is_active = true) AS INTEGER) as enrollment_count
      FROM enrollments e
      JOIN class_offerings co ON e.class_offering_id = co.id
      JOIN subjects s ON co.subject_id = s.id
      JOIN classes c ON co.class_id = c.id
      LEFT JOIN users pt ON co.primary_teacher_id = pt.id
      JOIN users student ON e.student_id = student.id
      JOIN parent_student_relationships psr ON psr.student_id = student.id
      WHERE psr.parent_id = ?
        AND e.is_active = true
        AND e.status = 'active'
        AND co.is_active = true
        AND s.is_active = true
        AND c.is_active = true
        AND psr.is_active = true
      ORDER BY student.first_name ASC, student.last_name ASC, s.name ASC, c.name ASC
    `;

    const result = await this.db.raw(query, [parentId]);
    return result.rows;
  }

  /**
   * Check if a student is enrolled in a class offering
   */
  async isStudentEnrolled(studentId: string, classOfferingId: string): Promise<boolean> {
    const enrollment = await this.db('enrollments')
      .where('student_id', studentId)
      .where('class_offering_id', classOfferingId)
      .where('is_active', true)
      .where('status', 'active')
      .first();

    return !!enrollment;
  }

  /**
   * Get enrollment details
   */
  async getEnrollmentById(enrollmentId: string): Promise<Enrollment | null> {
    const enrollment = await this.db('enrollments')
      .where('id', enrollmentId)
      .first();

    return enrollment || null;
  }

  /**
   * Create a new enrollment
   */
  async createEnrollment(
    studentId: string,
    classOfferingId: string,
    enrolledBy: string,
    notes?: string
  ): Promise<string> {
    const [enrollment] = await this.db('enrollments')
      .insert({
        id: this.generateUUID(),
        student_id: studentId,
        class_offering_id: classOfferingId,
        enrolled_at: new Date(),
        status: 'active',
        enrolled_by: enrolledBy,
        is_active: true,
        notes,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('id');

    return enrollment.id;
  }

  /**
   * Update enrollment status
   */
  async updateEnrollmentStatus(
    enrollmentId: string,
    status: 'active' | 'dropped' | 'completed' | 'transferred' | 'withdrawn',
    withdrawnBy?: string,
    withdrawalReason?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      status_changed_at: new Date(),
      updated_at: new Date()
    };

    if (status === 'withdrawn' || status === 'dropped') {
      updateData.withdrawn_at = new Date();
      updateData.is_active = false;
      if (withdrawnBy) updateData.withdrawn_by = withdrawnBy;
      if (withdrawalReason) updateData.withdrawal_reason = withdrawalReason;
    }

    await this.db('enrollments')
      .where('id', enrollmentId)
      .update(updateData);
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
