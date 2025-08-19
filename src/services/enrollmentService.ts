import { EnrollmentRepository } from '../repositories/enrollmentRepository';
import { AuthenticatedRequest } from '../types/auth';

type AuthenticatedUser = AuthenticatedRequest['user'];

export class EnrollmentService {
  constructor(private enrollmentRepository: EnrollmentRepository) {}

  /**
   * Get subject offerings for a student based on their enrollments
   */
  async getStudentSubjectOfferings(currentUser: AuthenticatedUser) {
    // Verify user is a student
    if (currentUser.user_type !== 'student') {
      throw new Error('Access denied: Only students can access this endpoint');
    }

    const enrollments = await this.enrollmentRepository.getStudentEnrollments(currentUser.id);
    return enrollments;
  }

  /**
   * Get subject offerings for a parent's children based on their enrollments
   */
  async getParentChildrenSubjectOfferings(currentUser: AuthenticatedUser) {
    // Verify user is a parent
    if (currentUser.user_type !== 'parent') {
      throw new Error('Access denied: Only parents can access this endpoint');
    }

    const enrollments = await this.enrollmentRepository.getChildrenEnrollments(currentUser.id);
    return enrollments;
  }

  /**
   * Check if user has access to view a specific enrollment
   */
  async checkEnrollmentAccess(enrollmentId: string, currentUser: AuthenticatedUser): Promise<boolean> {
    // Admins have access to all enrollments
    if (currentUser.role === 'admin') {
      return true;
    }

    const enrollment = await this.enrollmentRepository.getEnrollmentById(enrollmentId);
    if (!enrollment) {
      return false;
    }

    // Students can only access their own enrollments
    if (currentUser.user_type === 'student') {
      return enrollment.student_id === currentUser.id;
    }

    // Parents can access their children's enrollments
    if (currentUser.user_type === 'parent') {
      // This would require a parent-children relationship check
      // For now, we'll allow it and let the repository filter by parent access
      return true;
    }

    // Teachers can access enrollments for offerings they teach
    if (currentUser.user_type === 'teacher') {
      // This would require checking if the teacher teaches the class offering
      // For now, we'll allow read access
      return true;
    }

    return false;
  }

  /**
   * Enroll a student in a class offering
   */
  async enrollStudent(
    studentId: string,
    classOfferingId: string,
    currentUser: AuthenticatedUser,
    notes?: string
  ): Promise<string> {
    // Only admins and teachers can enroll students
    if (currentUser.role !== 'admin' && currentUser.user_type !== 'teacher') {
      throw new Error('Access denied: Insufficient permissions to enroll students');
    }

    // Check if student is already enrolled
    const isAlreadyEnrolled = await this.enrollmentRepository.isStudentEnrolled(
      studentId,
      classOfferingId
    );

    if (isAlreadyEnrolled) {
      throw new Error('Student is already enrolled in this class offering');
    }

    return await this.enrollmentRepository.createEnrollment(
      studentId,
      classOfferingId,
      currentUser.id,
      notes
    );
  }

  /**
   * Withdraw a student from a class offering
   */
  async withdrawStudent(
    enrollmentId: string,
    currentUser: AuthenticatedUser,
    withdrawalReason?: string
  ): Promise<void> {
    // Only admins and teachers can withdraw students
    if (currentUser.role !== 'admin' && currentUser.user_type !== 'teacher') {
      throw new Error('Access denied: Insufficient permissions to withdraw students');
    }

    await this.enrollmentRepository.updateEnrollmentStatus(
      enrollmentId,
      'withdrawn',
      currentUser.id,
      withdrawalReason
    );
  }
}
