import { Knex } from 'knex';
import { AuthenticatedUser } from '../types/auth';

export interface AccessibleUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
  role: string;
  phone?: string;
  avatar_url?: string;
  school_id: string;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at?: Date;
}

export interface AccessControlOptions {
  includeInactive?: boolean;
  search?: string;
  userType?: string;
  limit?: number;
  offset?: number;
}

/**
 * Centralized access control service for determining which users are accessible to other users
 * based on their roles and relationships within the school system.
 */
export class AccessControlService {
  constructor(private db: Knex) {}

  /**
   * Get all users accessible to the current user based on role-based access control
   */
  async getAccessibleUsers(
    currentUser: AuthenticatedUser,
    options: AccessControlOptions = {}
  ): Promise<AccessibleUser[]> {
    const {
      includeInactive = false,
      search,
      userType,
      limit = 100,
      offset = 0
    } = options;

    // Admin can see all users in their school
    if (currentUser.role === 'admin') {
      return this.getAdminAccessibleUsers(currentUser, options);
    }

    // Teachers can see: admins, teachers from same school, parents of classes they teach
    if (currentUser.user_type === 'teacher') {
      return this.getTeacherAccessibleUsers(currentUser, options);
    }

    // Parents can see: admins, homeroom teachers, teachers of their children's classes, parents in same classes
    if (currentUser.user_type === 'parent') {
      return this.getParentAccessibleUsers(currentUser, options);
    }

    // Students can see: admins, homeroom teachers, teachers of their classes, parents in same classes
    if (currentUser.user_type === 'student') {
      return this.getStudentAccessibleUsers(currentUser, options);
    }

    // Fallback: return empty array
    return [];
  }

  /**
   * Check if a user can access another specific user
   */
  async canAccessUser(currentUser: AuthenticatedUser, targetUserId: string): Promise<boolean> {
    // Admin can access all users in their school
    if (currentUser.role === 'admin') {
      const targetUser = await this.db('users')
        .where({ id: targetUserId, school_id: currentUser.school_id })
        .first();
      return !!targetUser;
    }

    // Get accessible users and check if target is in the list
    const accessibleUsers = await this.getAccessibleUsers(currentUser);
    return accessibleUsers.some(user => user.id === targetUserId);
  }

  /**
   * Get users accessible to admin (all users in school)
   */
  private async getAdminAccessibleUsers(
    currentUser: AuthenticatedUser,
    options: AccessControlOptions
  ): Promise<AccessibleUser[]> {
    let query = this.db('users')
      .where('school_id', currentUser.school_id)
      .where('id', '!=', currentUser.id);

    if (!options.includeInactive) {
      query = query.where('is_active', true);
    }

    if (options.userType && options.userType !== 'all') {
      query = query.where('user_type', options.userType);
    }

    if (options.search?.trim()) {
      const searchPattern = `%${options.search.trim()}%`;
      query = query.where(function() {
        this.where('first_name', 'ilike', searchPattern)
            .orWhere('last_name', 'ilike', searchPattern)
            .orWhere('email', 'ilike', searchPattern)
            .orWhere(this.client.raw("CONCAT(first_name, ' ', last_name)"), 'ilike', searchPattern);
      });
    }

    const users = await query
      .select(
        'id', 'first_name', 'last_name', 'email', 'user_type', 'role',
        'phone', 'avatar_url', 'school_id', 'is_active', 'last_login_at',
        'created_at', 'updated_at'
      )
      .orderBy('first_name', 'asc')
      .limit(options.limit || 100)
      .offset(options.offset || 0);

    return users;
  }

  /**
   * Get users accessible to teachers
   */
  private async getTeacherAccessibleUsers(
    currentUser: AuthenticatedUser,
    options: AccessControlOptions
  ): Promise<AccessibleUser[]> {
    const userIds = new Set<string>();

    // 1. All admins in the same school
    const admins = await this.db('users')
      .where({
        school_id: currentUser.school_id,
        role: 'admin'
      })
      .where('id', '!=', currentUser.id)
      .where('is_active', options.includeInactive ? undefined : true)
      .select('id');
    
    admins.forEach(admin => userIds.add(admin.id));

    // 2. All teachers from the same school
    const teachers = await this.db('users')
      .where({
        school_id: currentUser.school_id,
        user_type: 'teacher'
      })
      .where('id', '!=', currentUser.id)
      .where('is_active', options.includeInactive ? undefined : true)
      .select('id');
    
    teachers.forEach(teacher => userIds.add(teacher.id));

    // 3. Parents of students in classes this teacher teaches
    const parentsOfStudents = await this.db('parent_student_relationships as psr')
      .join('users as parents', 'psr.parent_id', 'parents.id')
      .join('users as students', 'psr.student_id', 'students.id')
      .join('enrollments as e', 'students.id', 'e.student_id')
      .join('class_offering_teachers as cot', 'e.class_offering_id', 'cot.class_offering_id')
      .where({
        'cot.teacher_id': currentUser.id,
        'psr.is_active': true,
        'e.status': 'active'
      })
      .where('parents.school_id', currentUser.school_id)
      .where('parents.is_active', options.includeInactive ? undefined : true)
      .distinct('parents.id')
      .select('parents.id');

    parentsOfStudents.forEach(parent => userIds.add(parent.id));

    // Convert to array and get full user details
    if (userIds.size === 0) {
      return [];
    }

    return this.getUsersByIds(Array.from(userIds), options);
  }

  /**
   * Get users accessible to parents
   */
  private async getParentAccessibleUsers(
    currentUser: AuthenticatedUser,
    options: AccessControlOptions
  ): Promise<AccessibleUser[]> {
    const userIds = new Set<string>();

    // 1. All admins in the same school
    const admins = await this.db('users')
      .where({
        school_id: currentUser.school_id,
        role: 'admin'
      })
      .where('is_active', options.includeInactive ? undefined : true)
      .select('id');
    
    admins.forEach(admin => userIds.add(admin.id));

    // 2. Get this parent's children
    const children = await this.db('parent_student_relationships as psr')
      .join('users as students', 'psr.student_id', 'students.id')
      .where({
        'psr.parent_id': currentUser.id,
        'psr.is_active': true
      })
      .select('students.id as student_id');

    if (children.length > 0) {
      const studentIds = children.map(child => child.student_id);

      // 3. Teachers of their children's classes (including homeroom teachers)
      const teachersOfChildren = await this.db('enrollments as e')
        .join('class_offering_teachers as cot', 'e.class_offering_id', 'cot.class_offering_id')
        .join('users as teachers', 'cot.teacher_id', 'teachers.id')
        .whereIn('e.student_id', studentIds)
        .where({
          'e.status': 'active',
          'cot.is_active': true
        })
        .where('teachers.school_id', currentUser.school_id)
        .where('teachers.is_active', options.includeInactive ? undefined : true)
        .distinct('teachers.id')
        .select('teachers.id');

      teachersOfChildren.forEach(teacher => userIds.add(teacher.id));

      // 4. Parents of students in the same classes as their children
      const parentsInSameClasses = await this.db('enrollments as e1')
        .join('enrollments as e2', 'e1.class_offering_id', 'e2.class_offering_id')
        .join('parent_student_relationships as psr', 'e2.student_id', 'psr.student_id')
        .join('users as parents', 'psr.parent_id', 'parents.id')
        .whereIn('e1.student_id', studentIds)
        .where({
          'e1.status': 'active',
          'e2.status': 'active',
          'psr.is_active': true
        })
        .where('parents.id', '!=', currentUser.id)
        .where('parents.school_id', currentUser.school_id)
        .where('parents.is_active', options.includeInactive ? undefined : true)
        .distinct('parents.id')
        .select('parents.id');

      parentsInSameClasses.forEach(parent => userIds.add(parent.id));
    }

    // Convert to array and get full user details
    if (userIds.size === 0) {
      return [];
    }

    return this.getUsersByIds(Array.from(userIds), options);
  }

  /**
   * Get users accessible to students
   */
  private async getStudentAccessibleUsers(
    currentUser: AuthenticatedUser,
    options: AccessControlOptions
  ): Promise<AccessibleUser[]> {
    const userIds = new Set<string>();

    // 1. All admins in the same school
    const admins = await this.db('users')
      .where({
        school_id: currentUser.school_id,
        role: 'admin'
      })
      .where('is_active', options.includeInactive ? undefined : true)
      .select('id');
    
    admins.forEach(admin => userIds.add(admin.id));

    // 2. Teachers of their classes (including homeroom teachers)
    const teachersOfStudent = await this.db('enrollments as e')
      .join('class_offering_teachers as cot', 'e.class_offering_id', 'cot.class_offering_id')
      .join('users as teachers', 'cot.teacher_id', 'teachers.id')
      .where({
        'e.student_id': currentUser.id,
        'e.status': 'active',
        'cot.is_active': true
      })
      .where('teachers.school_id', currentUser.school_id)
      .where('teachers.is_active', options.includeInactive ? undefined : true)
      .distinct('teachers.id')
      .select('teachers.id');

    teachersOfStudent.forEach(teacher => userIds.add(teacher.id));

    // 3. Parents of students in the same classes
    const parentsInSameClasses = await this.db('enrollments as e1')
      .join('enrollments as e2', 'e1.class_offering_id', 'e2.class_offering_id')
      .join('parent_student_relationships as psr', 'e2.student_id', 'psr.student_id')
      .join('users as parents', 'psr.parent_id', 'parents.id')
      .where({
        'e1.student_id': currentUser.id,
        'e1.status': 'active',
        'e2.status': 'active',
        'psr.is_active': true
      })
      .where('parents.school_id', currentUser.school_id)
      .where('parents.is_active', options.includeInactive ? undefined : true)
      .distinct('parents.id')
      .select('parents.id');

    parentsInSameClasses.forEach(parent => userIds.add(parent.id));

    // Convert to array and get full user details
    if (userIds.size === 0) {
      return [];
    }

    return this.getUsersByIds(Array.from(userIds), options);
  }

  /**
   * Helper method to get full user details by IDs with filtering
   */
  private async getUsersByIds(
    userIds: string[],
    options: AccessControlOptions
  ): Promise<AccessibleUser[]> {
    let query = this.db('users')
      .whereIn('id', userIds);

    if (options.userType && options.userType !== 'all') {
      query = query.where('user_type', options.userType);
    }

    if (options.search?.trim()) {
      const searchPattern = `%${options.search.trim()}%`;
      query = query.where(function() {
        this.where('first_name', 'ilike', searchPattern)
            .orWhere('last_name', 'ilike', searchPattern)
            .orWhere('email', 'ilike', searchPattern)
            .orWhere(this.client.raw("CONCAT(first_name, ' ', last_name)"), 'ilike', searchPattern);
      });
    }

    const users = await query
      .select(
        'id', 'first_name', 'last_name', 'email', 'user_type', 'role',
        'phone', 'avatar_url', 'school_id', 'is_active', 'last_login_at',
        'created_at', 'updated_at'
      )
      .orderBy('first_name', 'asc')
      .limit(options.limit || 100)
      .offset(options.offset || 0);

    return users;
  }

  /**
   * Get accessible user types for the current user
   */
  async getAccessibleUserTypes(currentUser: AuthenticatedUser): Promise<string[]> {
    if (currentUser.role === 'admin') {
      return ['teacher', 'student', 'parent'];
    }

    if (currentUser.user_type === 'teacher') {
      return ['teacher', 'parent'];
    }

    if (currentUser.user_type === 'parent' || currentUser.user_type === 'student') {
      return ['teacher', 'parent'];
    }

    return [];
  }

  /**
   * Check if user can access conversation participants
   */
  async canAccessConversationParticipants(
    currentUser: AuthenticatedUser,
    participantIds: string[]
  ): Promise<boolean> {
    // Admin can access all participants in their school
    if (currentUser.role === 'admin') {
      const participants = await this.db('users')
        .whereIn('id', participantIds)
        .where('school_id', currentUser.school_id);
      return participants.length === participantIds.length;
    }

    // Check each participant individually
    for (const participantId of participantIds) {
      const canAccess = await this.canAccessUser(currentUser, participantId);
      if (!canAccess) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get conversation participants that the user can access
   */
  async getAccessibleConversationParticipants(
    currentUser: AuthenticatedUser,
    participantIds: string[]
  ): Promise<AccessibleUser[]> {
    const accessibleUsers = await this.getAccessibleUsers(currentUser);
    const accessibleUserIds = new Set(accessibleUsers.map(user => user.id));
    
    const accessibleParticipantIds = participantIds.filter(id => 
      accessibleUserIds.has(id) || id === currentUser.id
    );

    return this.getUsersByIds(accessibleParticipantIds, {});
  }
}
