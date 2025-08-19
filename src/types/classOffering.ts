import { Class } from './class';
import { Subject } from './subject';
import { AcademicPeriod } from './academic';

// Class Offering Types
export interface ClassOffering {
  id: string;
  class_id: string;
  subject_id: string;
  academic_period_id: string;
  primary_teacher_id?: string;
  hours_per_week?: number;
  room?: string;
  schedule: Record<string, any>;
  grading_settings: Record<string, any>;
  grade_display_mode: 'numeric' | 'letter' | 'both';
  letter_grade_scale?: Record<string, number>;
  enable_grade_curve: boolean;
  curve_settings?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ClassOfferingWithDetails extends ClassOffering {
  class?: Class;
  subject?: Subject;
  academic_period?: AcademicPeriod;
  primary_teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
  student_count?: number;
  enrollment_count?: number;
}

// Enrollment Types
export interface Enrollment {
  id: string;
  student_id: string;
  class_offering_id: string;
  enrolled_at: Date;
  status: 'active' | 'dropped' | 'completed' | 'transferred';
  status_changed_at?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface EnrollmentWithStudent extends Enrollment {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    student_id?: string;
  };
}

export interface EnrollmentWithOffering extends Enrollment {
  class_offering: ClassOfferingWithDetails;
}

// Request/Response Types
export interface CreateClassOfferingRequest {
  class_id: string;
  subject_id: string;
  academic_period_id: string;
  primary_teacher_id?: string;
  hours_per_week?: number;
  room?: string;
  schedule?: Record<string, any>;
  grading_settings?: Record<string, any>;
  grade_display_mode?: 'numeric' | 'letter' | 'both';
  letter_grade_scale?: Record<string, number>;
  enable_grade_curve?: boolean;
  curve_settings?: Record<string, any>;
}

export interface UpdateClassOfferingRequest {
  primary_teacher_id?: string;
  hours_per_week?: number;
  room?: string;
  schedule?: Record<string, any>;
  grading_settings?: Record<string, any>;
  grade_display_mode?: 'numeric' | 'letter' | 'both';
  letter_grade_scale?: Record<string, number>;
  enable_grade_curve?: boolean;
  curve_settings?: Record<string, any>;
  is_active?: boolean;
}

export interface CreateEnrollmentRequest {
  student_id: string;
  class_offering_id: string;
  notes?: string;
}

export interface UpdateEnrollmentRequest {
  status?: 'active' | 'dropped' | 'completed' | 'transferred';
  notes?: string;
}

export interface ClassOfferingQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  class_id?: string;
  subject_id?: string;
  academic_period_id?: string;
  primary_teacher_id?: string;
  is_active?: boolean;
  school_id?: string;
}

export interface ClassOfferingsResponse {
  class_offerings: ClassOfferingWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface EnrollmentsResponse {
  enrollments: EnrollmentWithStudent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
