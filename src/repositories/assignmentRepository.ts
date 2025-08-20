import { Knex } from 'knex';
import knex from '../config/database';
import { Assessment, AssessmentWithDetails } from '../types/assessment';
import { UserRepository } from './userRepository';
import { AssignmentPresenter } from '../presenters/assignmentPresenter';

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

interface GetUserAssignmentsOptions {
  userId: string;
  page: number;
  limit: number;
  type?: string;
  status?: string;
  search?: string;
  subjectId?: string;
}

interface AssignmentResult {
  assignments: AssessmentWithDetails[];
  total: number;
}

export class AssignmentRepository {
  private userRepository: UserRepository;

  constructor(db: Knex = knex) {
    this.userRepository = new UserRepository(db);
  }

  /**
   * Get assignments for a specific class
   */
  async getClassAssignments(options: GetClassAssignmentsOptions): Promise<AssignmentResult> {
    const { classId, page, limit, type, status, userId } = options;
    const offset = (page - 1) * limit;
    
    console.log(`🔍 [DEBUG] Repository query - classId: ${classId}, userId: ${userId}, page: ${page}, limit: ${limit}`);

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
    const user = await this.userRepository.findById(userId);
    console.log(`🔍 [DEBUG] User type: ${user?.user_type}, User: ${JSON.stringify(user)}`);
    
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
      
      // Also check if student is enrolled in the class offering
      query = query.whereExists(function() {
        this.select('*')
          .from('enrollments as e')
          .whereRaw('e.class_offering_id = co.id')
          .where('e.student_id', userId)
          .where('e.status', 'active')
          .where('e.is_active', true);
      });
    }

    // Get total count
    const countQuery = query.clone().count('a.id as total').first();
    const countResult = await countQuery;
    const total = countResult?.total || 0;

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

    const formattedAssignments = AssignmentPresenter.formatAssignments(assignments);

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

    return AssignmentPresenter.formatAssignments(assignments);
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
      .join('class_offerings as co', 'a.class_offering_id', 'co.id')
      .join('subjects as s', 'co.subject_id', 's.id')
      .join('classes as c', 'co.class_id', 'c.id')
      .leftJoin('users as creator', 'a.created_by', 'creator.id')
      .where('a.class_offering_id', classOffering.id);

    // Apply user-specific filters
    const user = await this.userRepository.findById(userId);
    
    if (user?.user_type === 'student') {
      query = query.where('a.is_published', true);
    }

    // Get total count
    const countQuery = query.clone().count('a.id as total').first();
    const countResult = await countQuery;
    const total = countResult?.total || 0;

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

    const formattedAssignments = AssignmentPresenter.formatAssignments(assignments);

    return {
      assignments: formattedAssignments,
      total: parseInt(total as string)
    };
  }

  /**
   * Check if user has access to a class
   */
  async checkClassAccess(userId: string, classId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    
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
      const enrollment = await knex('enrollments as e')
        .join('class_offerings as co', 'e.class_offering_id', 'co.id')
        .where('e.student_id', userId)
        .where('co.class_id', classId)
        .where('e.status', 'active')
        .where('e.is_active', true)
        .where('co.is_active', true)
        .first();
      
      return !!enrollment;
    }

    return false;
  }

  /**
   * Check if user has access to a specific subject within a class
   */
  async checkSubjectAccess(userId: string, classId: string, subjectId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) return false;

    // Admin has access to all subjects
    if (user.role === 'admin') return true;

    // Check if teacher teaches this specific subject
    if (user.user_type === 'teacher') {
      console.log(`🔍 [DEBUG] Checking teacher access - userId: ${userId}, classId: ${classId}, subjectId: ${subjectId}`);
      
      // First, check if the class offering exists
      const classOffering = await knex('class_offerings')
        .where('class_id', classId)
        .where('subject_id', subjectId)
        .where('is_active', true)
        .first();
      
      console.log(`🔍 [DEBUG] Class offering found:`, classOffering);
      
      if (!classOffering) {
        console.log(`🔍 [DEBUG] No class offering found for classId: ${classId}, subjectId: ${subjectId}`);
        return false;
      }

      // Check if teacher has access via primary_teacher_id or class_offering_teachers
      const hasAccess = await knex('class_offerings')
        .where('class_id', classId)
        .where('subject_id', subjectId)
        .where('is_active', true)
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
      
      console.log(`🔍 [DEBUG] Teacher access result:`, hasAccess);
      
      // If no direct access, check if teacher has access to the class (fallback)
      if (!hasAccess) {
        const classAccess = await knex('class_offerings')
          .where('class_id', classId)
          .where('is_active', true)
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
        
        console.log(`🔍 [DEBUG] Fallback class access:`, classAccess);
        
        // If teacher has access to any subject in this class, allow access
        if (classAccess) {
          console.log(`🔍 [DEBUG] Teacher has access to class, allowing subject access`);
          return true;
        }
      }
      
      return !!hasAccess;
    }

    // For students, check if they're enrolled and the class offering exists
    if (user.user_type === 'student') {
      // First, find the class offering for this class and subject
      const classOffering = await knex('class_offerings')
        .where('class_id', classId)
        .where('subject_id', subjectId)
        .where('is_active', true)
        .first();

      if (!classOffering) {
        return false;
      }

      // Then check if student is enrolled in this class offering
      const enrollment = await knex('enrollments')
        .where('student_id', userId)
        .where('class_offering_id', classOffering.id)
        .where('is_active', true)
        .where('status', 'active')
        .first();
      
      return !!enrollment;
    }

    return false;
  }

  /**
   * Get all subjects accessible by a teacher
   */
  async getTeacherAccessibleSubjects(userId: string): Promise<any[]> {
    console.log(`🔍 [DEBUG] Getting accessible subjects for teacher: ${userId}`);

    // Get all class offerings where the teacher has access
    const accessibleOfferings = await knex('class_offerings as co')
      .join('subjects as s', 'co.subject_id', 's.id')
      .join('classes as c', 'co.class_id', 'c.id')
      .leftJoin('users as teacher', 'co.primary_teacher_id', 'teacher.id')
      .where('co.is_active', true)
      .where(function() {
        this.where('co.primary_teacher_id', userId)
          .orWhereExists(function() {
            this.select('*')
              .from('class_offering_teachers as cot')
              .whereRaw('cot.class_offering_id = co.id')
              .where('cot.teacher_id', userId)
              .where('cot.is_active', true);
          });
      })
      .select([
        's.id as subject_id',
        's.name as subject_name',
        's.code as subject_code',
        's.description as subject_description',
        'c.id as class_id',
        'c.name as class_name',
        'c.grade_level',
        'co.id as class_offering_id',
        'teacher.first_name as teacher_first_name',
        'teacher.last_name as teacher_last_name'
      ])
      .orderBy('s.name')
      .orderBy('c.name');

    console.log(`🔍 [DEBUG] Found ${accessibleOfferings.length} accessible offerings`);

    return accessibleOfferings;
  }

  /**
   * Get unique subjects accessible by a teacher (deduplicated)
   */
  async getTeacherAccessibleSubjectsUnique(userId: string): Promise<any[]> {
    const offerings = await this.getTeacherAccessibleSubjects(userId);
    
    // Deduplicate by subject_id
    const uniqueSubjects = offerings.reduce((acc, offering) => {
      const subjectId = offering.subject_id;
      if (!acc[subjectId]) {
        acc[subjectId] = {
          subject_id: offering.subject_id,
          subject_name: offering.subject_name,
          subject_code: offering.subject_code,
          subject_description: offering.subject_description,
          classes: []
        };
      }
      
      // Add class information
      acc[subjectId].classes.push({
        class_id: offering.class_id,
        class_name: offering.class_name,
        grade_level: offering.grade_level,
        class_offering_id: offering.class_offering_id
      });
      
      return acc;
    }, {});

    const result = Object.values(uniqueSubjects);
    console.log(`🔍 [DEBUG] Returning ${result.length} unique subjects`);
    
    return result;
  }

  /**
   * Get unique classes accessible by a teacher
   */
  async getTeacherAccessibleClasses(userId: string): Promise<any[]> {
    console.log(`🔍 [DEBUG] Getting accessible classes for teacher: ${userId}`);

    // Get unique classes where teacher has access
    const accessibleClasses = await knex('class_offerings as co')
      .join('classes as c', 'co.class_id', 'c.id')
      .where('co.is_active', true)
      .where(function() {
        this.where('co.primary_teacher_id', userId)
          .orWhereExists(function() {
            this.select('*')
              .from('class_offering_teachers as cot')
              .whereRaw('cot.class_offering_id = co.id')
              .where('cot.teacher_id', userId)
              .where('cot.is_active', true);
          });
      })
      .groupBy('c.id', 'c.name', 'c.grade_level')
      .select([
        'c.id as class_id',
        'c.name as class_name',
        'c.grade_level'
      ])
      .orderBy('c.name');

    console.log(`🔍 [DEBUG] Found ${accessibleClasses.length} accessible classes`);
    return accessibleClasses;
  }

  /**
   * Check if teacher has permission to create assignments for a subject
   */
  async checkTeacherPermission(teacherId: string, classId: string, subjectId: string): Promise<boolean> {
    const user = await this.userRepository.findById(teacherId);
    
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

  /**
   * Get assignments for the current user based on their role and enrollments
   */
  async getUserAssignments(options: GetUserAssignmentsOptions): Promise<AssignmentResult> {
    const { userId, page, limit, type, status, search, subjectId } = options;
    const offset = (page - 1) * limit;

    // Get user information
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let query = knex('assessments as a')
      .join('class_offerings as co', 'a.class_offering_id', 'co.id')
      .join('subjects as s', 'co.subject_id', 's.id')
      .join('classes as c', 'co.class_id', 'c.id')
      .leftJoin('users as creator', 'a.created_by', 'creator.id')
      .where('co.is_active', true)
      .where('a.is_published', true); // Default to published assignments

    // Apply role-based filtering
    if (user.user_type === 'student') {
      // Students see assignments from their enrolled class offerings
      query = query.whereExists(function() {
        this.select('*')
          .from('enrollments as e')
          .whereRaw('e.class_offering_id = co.id')
          .where('e.student_id', userId)
          .where('e.status', 'active')
          .where('e.is_active', true);
      });
    } else if (user.user_type === 'parent') {
      // Parents see assignments from their children's enrolled class offerings
      query = query.whereExists(function() {
        this.select('*')
          .from('enrollments as e')
          .join('students as st', 'e.student_id', 'st.user_id')
          .whereRaw('e.class_offering_id = co.id')
          .where('st.parent_id', userId)
          .where('e.status', 'active')
          .where('e.is_active', true);
      });
    } else if (user.user_type === 'teacher') {
      // Teachers see assignments they created or for subjects they teach
      if (status !== 'published') {
        query = query.where(function() {
          this.where('a.is_published', status === 'draft' ? false : true);
        });
      }
      
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
    } else {
      // Admins can see all assignments, respect status filter
      if (status === 'published') {
        query = query.where('a.is_published', true);
      } else if (status === 'draft') {
        query = query.where('a.is_published', false);
      }
    }

    // Filter by assignment type if specified
    if (type && type !== 'all') {
      query = query.where('a.type', type);
    }

    // Filter by search query if specified
    if (search && search.trim() !== '') {
      query = query.where(function() {
        this.whereILike('a.title', `%${search.trim()}%`)
          .orWhereILike('s.name', `%${search.trim()}%`)
          .orWhereILike('c.name', `%${search.trim()}%`);
      });
    }

    // Filter by subject if specified (for independent subject filtering)
    if (subjectId && subjectId.trim() !== '') {
      query = query.where('co.subject_id', subjectId.trim());
    }

    // Get total count
    const countQuery = query.clone().count('a.id as total').first();
    const countResult = await countQuery;
    const total = countResult?.total || 0;

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

    const formattedAssignments: AssessmentWithDetails[] = assignments.map((row: any) => ({
      id: row.id,
      class_offering_id: row.class_offering_id,
      type: row.type,
      title: row.title,
      description: row.description,
      max_score: row.max_score,
      weight_override: row.weight_override,
      group_tag: row.group_tag,
      sequence_no: row.sequence_no,
      assigned_date: row.assigned_date,
      due_date: row.due_date,
      rubric: row.rubric,
      instructions: row.instructions,
      is_published: row.is_published,
      allow_late_submission: row.allow_late_submission,
      late_penalty_per_day: row.late_penalty_per_day,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      subject_name: row.subject_name,
      subject_code: row.subject_code,
      class_name: row.class_name,
      creator_first_name: row.creator_first_name,
      creator_last_name: row.creator_last_name,
    }));

    return {
      assignments: formattedAssignments,
      total: Number(total)
    };
  }
}
