import { AssessmentWithDetails } from '../types/assessment';

/**
 * Assignment Presenter
 * Provides consistent data formatting for assignment responses
 * Ensures all assignment APIs return data in the same standardized format
 */
export class AssignmentPresenter {
  /**
   * Format a single assignment for API response
   */
  static formatAssignment(assignment: any): any {
    return {
      id: assignment.id,
      class_offering_id: assignment.class_offering_id,
      type: assignment.type,
      title: assignment.title,
      description: assignment.description,
      max_score: this.parseNumber(assignment.max_score),
      weight_override: assignment.weight_override ? this.parseNumber(assignment.weight_override) : undefined,
      group_tag: assignment.group_tag,
      sequence_no: assignment.sequence_no,
      assigned_date: assignment.assigned_date,
      due_date: assignment.due_date,
      rubric: assignment.rubric,
      instructions: assignment.instructions,
      is_published: assignment.is_published,
      allow_late_submission: assignment.allow_late_submission,
      late_penalty_per_day: assignment.late_penalty_per_day ? this.parseNumber(assignment.late_penalty_per_day) : undefined,
      created_by: assignment.created_by,
      created_at: assignment.created_at,
      updated_at: assignment.updated_at,
      
      // Subject information
      subject_name: assignment.subject_name || null,
      subject_code: assignment.subject_code || null,
      
      // Class information
      class_name: assignment.class_name || null,
      
      // Creator information
      creator_first_name: assignment.creator_first_name || null,
      creator_last_name: assignment.creator_last_name || null,
      
      // Statistics (for teachers/admins)
      submitted_count: assignment.submitted_count ? parseInt(assignment.submitted_count) : undefined,
      total_students: assignment.total_students ? parseInt(assignment.total_students) : undefined,
      grades_count: assignment.grades_count ? parseInt(assignment.grades_count) : undefined,
      graded_count: assignment.graded_count ? parseInt(assignment.graded_count) : undefined,
      average_score: assignment.average_score ? this.parseNumber(assignment.average_score) : undefined,
      
      // Student-specific data (when applicable)
      submission_status: assignment.submission_status || null,
      student_score: assignment.student_score ? this.parseNumber(assignment.student_score) : undefined,
      is_late: assignment.is_late || false,
      submitted_at: assignment.submitted_at || null,
      graded_at: assignment.graded_at || null,
    };
  }

  /**
   * Format multiple assignments for API response
   */
  static formatAssignments(assignments: any[]): any[] {
    return assignments.map(assignment => this.formatAssignment(assignment));
  }

  /**
   * Format assignment list response with pagination
   */
  static formatAssignmentListResponse(data: {
    assignments: any[];
    total: number;
    page: number;
    limit: number;
  }) {
    return {
      assignments: this.formatAssignments(data.assignments),
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: Math.ceil(data.total / data.limit)
      }
    };
  }

  /**
   * Format assignment for creation response
   */
  static formatCreatedAssignment(assignment: any): any {
    const formatted = this.formatAssignment(assignment);
    
    // Ensure required fields for new assignments
    return {
      ...formatted,
      submitted_count: 0,
      total_students: 0,
      grades_count: 0,
      graded_count: 0,
    };
  }

  /**
   * Format assignment statistics summary
   */
  static formatAssignmentStats(assignments: any[]) {
    const stats = {
      total: assignments.length,
      published: 0,
      draft: 0,
      overdue: 0,
      due_soon: 0,
      submitted: 0,
      graded: 0,
    };

    const now = new Date();
    
    assignments.forEach(assignment => {
      // Publication status
      if (assignment.is_published) {
        stats.published++;
      } else {
        stats.draft++;
      }

      // Due date status
      if (assignment.due_date) {
        const dueDate = new Date(assignment.due_date);
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        
        if (diffDays < 0) {
          stats.overdue++;
        } else if (diffDays <= 3) {
          stats.due_soon++;
        }
      }

      // Submission status (for students)
      if (assignment.submission_status) {
        if (['submitted', 'graded', 'returned'].includes(assignment.submission_status)) {
          stats.submitted++;
        }
        if (['graded', 'returned'].includes(assignment.submission_status)) {
          stats.graded++;
        }
      }
    });

    return stats;
  }

  /**
   * Format teacher's accessible subjects
   */
  static formatTeacherAccessibleSubjects(subjects: any[]) {
    return subjects.map(subject => ({
      subject_id: subject.subject_id,
      subject_name: subject.subject_name,
      subject_code: subject.subject_code || null,
      subject_description: subject.subject_description || null,
      classes: subject.classes || []
    }));
  }

  /**
   * Format teacher's accessible classes
   */
  static formatTeacherAccessibleClasses(classes: any[]) {
    return classes.map(cls => ({
      class_id: cls.class_id,
      class_name: cls.class_name,
      grade_level: cls.grade_level || null,
      class_offering_id: cls.class_offering_id || null
    }));
  }

  /**
   * Safely parse numeric values
   */
  private static parseNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Format error response
   */
  static formatError(message: string, code?: string) {
    return {
      error: code || 'ASSIGNMENT_ERROR',
      message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format success response
   */
  static formatSuccess(data: any, message: string = 'Success') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }
}
