import { ClassOfferingWithDetails } from './classOffering';

// Assessment Types
export interface Assessment {
  id: string;
  class_offering_id: string;
  type: 'assignment' | 'test' | 'final_exam';
  title: string;
  description?: string;
  max_score: number;
  weight_override?: number;
  group_tag?: string;
  sequence_no?: number;
  assigned_date?: Date;
  due_date?: Date;
  rubric?: Record<string, any>;
  instructions?: Record<string, any>;
  is_published: boolean;
  allow_late_submission: boolean;
  late_penalty_per_day?: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface AssessmentWithDetails extends Assessment {
  class_offering?: ClassOfferingWithDetails;
  created_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  grades_count?: number;
  submitted_count?: number;
  graded_count?: number;
  average_score?: number;
}

// Assessment Grade Types
export interface AssessmentGrade {
  id: string;
  assessment_id: string;
  student_id: string;
  score?: number;
  adjusted_score?: number;
  status: 'not_submitted' | 'submitted' | 'graded' | 'returned' | 'excused';
  submitted_at?: Date;
  graded_at?: Date;
  graded_by?: string;
  feedback?: string;
  rubric_scores?: Record<string, any>;
  is_late: boolean;
  days_late?: number;
  attachments: any[];
  created_at: Date;
  updated_at: Date;
}

export interface AssessmentGradeWithDetails extends AssessmentGrade {
  assessment?: Assessment;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    student_id?: string;
    avatar_url?: string;
  };
  graded_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

// Request/Response Types
export interface CreateAssessmentRequest {
  class_offering_id: string;
  type: 'assignment' | 'test' | 'final_exam';
  title: string;
  description?: string;
  max_score: number;
  weight_override?: number;
  group_tag?: string;
  sequence_no?: number;
  assigned_date?: Date;
  due_date?: Date;
  rubric?: Record<string, any>;
  instructions?: Record<string, any>;
  allow_late_submission?: boolean;
  late_penalty_per_day?: number;
}

export interface UpdateAssessmentRequest {
  title?: string;
  description?: string;
  max_score?: number;
  weight_override?: number;
  group_tag?: string;
  sequence_no?: number;
  assigned_date?: Date;
  due_date?: Date;
  rubric?: Record<string, any>;
  instructions?: Record<string, any>;
  is_published?: boolean;
  allow_late_submission?: boolean;
  late_penalty_per_day?: number;
}

export interface CreateAssessmentGradeRequest {
  assessment_id: string;
  student_id: string;
  score?: number;
  status?: 'not_submitted' | 'submitted' | 'graded' | 'returned' | 'excused';
  feedback?: string;
  rubric_scores?: Record<string, any>;
  attachments?: any[];
}

export interface UpdateAssessmentGradeRequest {
  score?: number;
  status?: 'not_submitted' | 'submitted' | 'graded' | 'returned' | 'excused';
  feedback?: string;
  rubric_scores?: Record<string, any>;
  attachments?: any[];
}

export interface BulkUpdateGradesRequest {
  grades: Array<{
    student_id: string;
    score?: number;
    status?: 'not_submitted' | 'submitted' | 'graded' | 'returned' | 'excused';
    feedback?: string;
    rubric_scores?: Record<string, any>;
  }>;
}

export interface AssessmentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  class_offering_id?: string;
  type?: 'assignment' | 'test' | 'final_exam';
  group_tag?: string;
  is_published?: boolean;
  created_by?: string;
  due_date_from?: Date;
  due_date_to?: Date;
}

export interface AssessmentGradeQueryParams {
  page?: number;
  limit?: number;
  assessment_id?: string;
  student_id?: string;
  status?: 'not_submitted' | 'submitted' | 'graded' | 'returned' | 'excused';
  is_late?: boolean;
  graded_by?: string;
}

export interface AssessmentsResponse {
  assessments: AssessmentWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface AssessmentGradesResponse {
  grades: AssessmentGradeWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface AssessmentStatsResponse {
  total_assessments: number;
  by_type: {
    assignment: number;
    test: number;
    final_exam: number;
  };
  by_status: {
    published: number;
    draft: number;
  };
  upcoming_due_dates: AssessmentWithDetails[];
  recent_activity: AssessmentWithDetails[];
}
