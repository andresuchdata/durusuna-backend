export interface Subject {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  subject_code: string;
  grade_levels: string[];
  learning_objectives?: string;
  curriculum_standard?: string;
  prerequisites: string[];
  subject_category?: string;
  total_hours_per_year?: number;
  settings?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface CreateSubjectRequest {
  name: string;
  description?: string;
  subject_code: string;
  grade_levels?: string[];
  learning_objectives?: string;
  curriculum_standard?: string;
  prerequisites?: string[];
  subject_category?: string;
  total_hours_per_year?: number;
  settings?: Record<string, any>;
}

export interface UpdateSubjectRequest {
  name?: string;
  description?: string;
  subject_code?: string;
  grade_levels?: string[];
  learning_objectives?: string;
  curriculum_standard?: string;
  prerequisites?: string[];
  subject_category?: string;
  total_hours_per_year?: number;
  settings?: Record<string, any>;
  is_active?: boolean;
}

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  primary_teacher_id?: string;
  hours_per_week: number;
  classroom?: string;
  schedule?: Record<string, any>;
  start_date?: Date;
  end_date?: Date;
  assessment_methods: string[];
  syllabus?: string;
  settings?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface ClassSubjectWithDetails extends ClassSubject {
  class?: {
    id: string;
    name: string;
    grade_level?: string;
    section?: string;
    academic_year: string;
  };
  subject?: Subject;
  primary_teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface CreateClassSubjectRequest {
  class_id: string;
  subject_id: string;
  primary_teacher_id?: string;
  hours_per_week?: number;
  classroom?: string;
  schedule?: Record<string, any>;
  start_date?: Date;
  end_date?: Date;
  assessment_methods?: string[];
  syllabus?: string;
  settings?: Record<string, any>;
}

export interface UpdateClassSubjectRequest {
  primary_teacher_id?: string;
  hours_per_week?: number;
  classroom?: string;
  schedule?: Record<string, any>;
  start_date?: Date;
  end_date?: Date;
  assessment_methods?: string[];
  syllabus?: string;
  settings?: Record<string, any>;
  is_active?: boolean;
}

export interface SubjectQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  subject_category?: string;
  grade_level?: string;
  is_active?: boolean;
  school_id?: string;
}

export interface SubjectsResponse {
  subjects: Subject[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ClassSubjectsResponse {
  class_subjects: ClassSubjectWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
} 