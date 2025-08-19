import knex from '../config/database';
import { Assessment, AssessmentWithDetails } from '../types/assessment';

interface GetClassAssignmentsOptions {
  classId: string;
  page: number;
  limit: number;
  type?: string;
  status?: string;
  userId: string;
}

interface GetRecentAssignmentsOptions {
  teacherId: string;
  limit: number;
}

interface GetSubjectAssignmentsOptions {
  classId: string;
  subjectId: string;
  page: number;
  limit: number;
  userId: string;
}

interface AssignmentResult {
  assignments: AssessmentWithDetails[];
  total: number;
}

export class AssignmentRepository {
  /**
   * Get assignments for a specific class
   */
  async getClassAssignments(options: GetClassAssignmentsOptions): Promise<AssignmentResult> {
    const { classId, page, limit, type, status, userId } = options;
    const offset = (page - 1) * limit;

    let query = knex('assessments as a')
      .join('class_offerings as co', 'a.class_offering_id', 'co.id')
      .join('subjects as s', 'co.subject_id', 's.id')
      .join('classes as c', 'co.class_id', 'c.id')
      .leftJoin('users as creator', 'a.created_by', 'creator.id')
      .where('co.class_id', classId)
      .where('co.is_active', true);

    // Filter by assignment type if specified
    if (type && type !== 'all') {
      query = query.where('a.type', type);
    }

    // Filter by status if specified
    if (status === 'published') {
      query = query.where('a.is_published', true);
    } else if (status === 'draft') {
      query = query.where('a.is_published', false);
    }

    // Only show assignments the user has access to
    // If user is a teacher, show assignments they created or for subjects they teach
    // If user is a student, show only published assignments
    const user = await knex('users').where('id', userId).first();
    
    if (user?.user_type === 'teacher') {
      query = query.where(function() {
        this.where('a.created_by', userId)
          .orWhere('co.primary_teacher_id', userId)
          .orWhereExists(function() {
            this.select('*')
              .from('class_offering_teachers as cot')
              .whereRaw('cot.class_offering_id = co.id')
              .where('cot.teacher_id', userId)
              .where('cot.is_active', true);
          });
      });
    } else if (user?.user_type === 'student') {
      query = query.where('a.is_published', true);
      
      // Also check if student is enrolled in the class
      query = query.whereExists(function() {
        this.select('*')
          .from('enrollments as e')
          .whereRaw('e.class_id = co.class_id')
          .where('e.student_id', userId)
          .where('e.is_active', true);
      });
    }

    // Get total count
    const countQuery = query.clone().count('a.id as total').first();
    const { total } = await countQuery;

    // Get paginated results
    const assignments = await query
      .select([
        'a.*',
        's.name as subject_name',
        's.code as subject_code',
        'c.name as class_name',
        'creator.first_name as creator_first_name',
        'creator.last_name as creator_last_name'
      ])
      .orderBy('a.due_date', 'asc')
      .orderBy('a.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const formattedAssignments: AssessmentWithDetails[] = assignments.map(row => ({
      id: row.id,
      class_offering_id: row.class_offering_id,
      type: row.type,
      title: row.title,
      description: row.description,
      max_score: parseFloat(row.max_score),
      weight_override: row.weight_override ? parseFloat(row.weight_override) : undefined,
      group_tag: row.group_tag,
      sequence_no: row.sequence_no,
      assigned_date: row.assigned_date,
      due_date: row.due_date,
      rubric: row.rubric,
      instructions: row.instructions,
      is_published: row.is_published,
      allow_late_submission: row.allow_late_submission,
      late_penalty_per_day: row.late_penalty_per_day ? parseFloat(row.late_penalty_per_day) : undefined,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      subject: {
        id: row.subject_id,
        name: row.subject_name,
        code: row.subject_code
      },
      class: {
        id: row.class_id,
        name: row.class_name
      },
      creator: {
        id: row.created_by,
        first_name: row.creator_first_name,
        last_name: row.creator_last_name
      }
    }));

    return {
      assignments: formattedAssignments,
      total: parseInt(total as string)
    };
  }

  /**
   * Get recent assignments for a teacher across all their classes
   */
  async getRecentAssignments(options: GetRecentAssignmentsOptions): Promise<AssessmentWithDetails[]> {
    const { teacherId, limit } = options;

    const assignments = await knex('assessments as a')
      .join('class_offerings as co', 'a.class_offering_id', 'co.id')
      .join('subjects as s', 'co.subject_id', 's.id')
      .join('classes as c', 'co.class_id', 'c.id')
      .where(function() {
        this.where('co.primary_teacher_id', teacherId)
          .orWhere('a.created_by', teacherId)
          .orWhereExists(function() {
            this.select('*')
              .from('class_offering_teachers as cot')
              .whereRaw('cot.class_offering_id = co.id')
              .where('cot.teacher_id', teacherId)
              .where('cot.is_active', true);
          });
      })
      .where('co.is_active', true)
      .select([
        'a.*',
        's.name as subject_name',
        's.code as subject_code',
        'c.name as class_name'
      ])
      .orderBy('a.created_at', 'desc')
      .limit(limit);

    return assignments.map(row => ({
      id: row.id,
      class_offering_id: row.class_offering_id,
      type: row.type,
      title: row.title,
      description: row.description,
      max_score: parseFloat(row.max_score),
      weight_override: row.weight_override ? parseFloat(row.weight_override) : undefined,
      group_tag: row.group_tag,
      sequence_no: row.sequence_no,
      assigned_date: row.assigned_date,
      due_date: row.due_date,
      rubric: row.rubric,
      instructions: row.instructions,
      is_published: row.is_published,
      allow_late_submission: row.allow_late_submission,
      late_penalty_per_day: row.late_penalty_per_day ? parseFloat(row.late_penalty_per_day) : undefined,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      subject: {
        id: row.subject_id,
        name: row.subject_name,
        code: row.subject_code
      },
      class: {
        id: row.class_id,
        name: row.class_name
      }
    }));
  }

  /**
   * Get assignments for a specific subject within a class
   */
  async getSubjectAssignments(options: GetSubjectAssignmentsOptions): Promise<AssignmentResult> {
    const { classId, subjectId, page, limit, userId } = options;
    const offset = (page - 1) * limit;

    // Get the class offering ID
    const classOffering = await knex('class_offerings')
      .where('class_id', classId)
      .where('subject_id', subjectId)
      .where('is_active', true)
      .first();

    if (!classOffering) {
      return { assignments: [], total: 0 };
    }

    let query = knex('assessments as a')
      .where('a.class_offering_id', classOffering.id);

    // Apply user-specific filters
    const user = await knex('users').where('id', userId).first();
    
    if (user?.user_type === 'student') {
      query = query.where('a.is_published', true);
    }

    // Get total count
    const countQuery = query.clone().count('a.id as total').first();
    const { total } = await countQuery;

    // Get paginated results
    const assignments = await query
      .select('a.*')
      .orderBy('a.due_date', 'asc')
      .orderBy('a.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const formattedAssignments: AssessmentWithDetails[] = assignments.map(row => ({
      id: row.id,
      class_offering_id: row.class_offering_id,
      type: row.type,
      title: row.title,
      description: row.description,
      max_score: parseFloat(row.max_score),
      weight_override: row.weight_override ? parseFloat(row.weight_override) : undefined,
      group_tag: row.group_tag,
      sequence_no: row.sequence_no,
      assigned_date: row.assigned_date,
      due_date: row.due_date,
      rubric: row.rubric,
      instructions: row.instructions,
      is_published: row.is_published,
      allow_late_submission: row.allow_late_submission,
      late_penalty_per_day: row.late_penalty_per_day ? parseFloat(row.late_penalty_per_day) : undefined,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return {
      assignments: formattedAssignments,
      total: parseInt(total as string)
    };
  }

  /**
   * Check if user has access to a class
   */
  async checkClassAccess(userId: string, classId: string): Promise<boolean> {
    const user = await knex('users').where('id', userId).first();
    
    if (!user) return false;

    // Admin has access to all classes
    if (user.role === 'admin') return true;

    // Check if teacher teaches any subject in this class
    if (user.user_type === 'teacher') {
      const hasAccess = await knex('class_offerings')
        .where('class_id', classId)
        .where(function() {
          this.where('primary_teacher_id', userId)
            .orWhereExists(function() {
              this.select('*')
                .from('class_offering_teachers as cot')
                .whereRaw('cot.class_offering_id = class_offerings.id')
                .where('cot.teacher_id', userId)
                .where('cot.is_active', true);
            });
        })
        .first();
      
      return !!hasAccess;
    }

    // Check if student is enrolled in this class
    if (user.user_type === 'student') {
      const enrollment = await knex('enrollments')
        .where('student_id', userId)
        .where('class_id', classId)
        .where('is_active', true)
        .first();
      
      return !!enrollment;
    }

    return false;
  }

  /**
   * Check if user has access to a specific subject within a class
   */
  async checkSubjectAccess(userId: string, classId: string, subjectId: string): Promise<boolean> {
    const user = await knex('users').where('id', userId).first();
    
    if (!user) return false;

    // Admin has access to all subjects
    if (user.role === 'admin') return true;

    // Check if teacher teaches this specific subject
    if (user.user_type === 'teacher') {
      const hasAccess = await knex('class_offerings')
        .where('class_id', classId)
        .where('subject_id', subjectId)
        .where(function() {
          this.where('primary_teacher_id', userId)
            .orWhereExists(function() {
              this.select('*')
                .from('class_offering_teachers as cot')
                .whereRaw('cot.class_offering_id = class_offerings.id')
                .where('cot.teacher_id', userId)
                .where('cot.is_active', true);
            });
        })
        .first();
      
      return !!hasAccess;
    }

    // For students, check if they're enrolled and the class offering exists
    if (user.user_type === 'student') {
      const enrollment = await knex('enrollments')
        .join('class_offerings', function() {
          this.on('enrollments.class_id', '=', 'class_offerings.class_id')
            .andOn('class_offerings.subject_id', '=', knex.raw('?', [subjectId]));
        })
        .where('enrollments.student_id', userId)
        .where('enrollments.class_id', classId)
        .where('enrollments.is_active', true)
        .where('class_offerings.is_active', true)
        .first();
      
      return !!enrollment;
    }

    return false;
  }

  /**
   * Check if teacher has permission to create assignments for a subject
   */
  async checkTeacherPermission(teacherId: string, classId: string, subjectId: string): Promise<boolean> {
    const user = await knex('users').where('id', teacherId).first();
    
    if (!user || user.user_type !== 'teacher') return false;

    // Admin teachers can create assignments for any subject
    if (user.role === 'admin') return true;

    // Check if teacher is assigned to this subject
    const hasPermission = await knex('class_offerings')
      .where('class_id', classId)
      .where('subject_id', subjectId)
      .where(function() {
        this.where('primary_teacher_id', teacherId)
          .orWhereExists(function() {
            this.select('*')
              .from('class_offering_teachers as cot')
              .whereRaw('cot.class_offering_id = class_offerings.id')
              .where('cot.teacher_id', teacherId)
              .where('cot.is_active', true);
          });
      })
      .first();

    return !!hasPermission;
  }

  /**
   * Create a new assignment
   */
  async createAssignment(classId: string, subjectId: string, assignmentData: any): Promise<Assessment> {
    // Get the class offering ID
    const classOffering = await knex('class_offerings')
      .where('class_id', classId)
      .where('subject_id', subjectId)
      .where('is_active', true)
      .first();

    if (!classOffering) {
      throw new Error('Class offering not found');
    }

    const [assignment] = await knex('assessments')
      .insert({
        ...assignmentData,
        class_offering_id: classOffering.id
      })
      .returning('*');

    return assignment;
  }
}
