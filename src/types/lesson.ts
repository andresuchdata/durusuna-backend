export interface Lesson {
  id: string;
  class_subject_id: string;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  location?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  lesson_objectives?: string;
  materials: any[];
  homework_assigned?: string;
  homework_due_date?: Date;
  attendance_data?: Record<string, any>;
  teacher_notes?: string;
  settings?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface LessonWithDetails extends Lesson {
  class_subject?: {
    id: string;
    class_id: string;
    subject_id: string;
    hours_per_week: number;
    classroom?: string;
    class?: {
      id: string;
      name: string;
      grade_level?: string;
      section?: string;
      academic_year: string;
    };
    subject?: {
      id: string;
      name: string;
      subject_code: string;
      subject_category?: string;
    };
    primary_teacher?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      avatar_url?: string;
    };
  };
}

export interface CreateLessonRequest {
  class_subject_id: string;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  location?: string;
  lesson_objectives?: string;
  materials?: any[];
  homework_assigned?: string;
  homework_due_date?: Date;
  teacher_notes?: string;
  settings?: Record<string, any>;
}

export interface UpdateLessonRequest {
  title?: string;
  description?: string;
  start_time?: Date;
  end_time?: Date;
  location?: string;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  lesson_objectives?: string;
  materials?: any[];
  homework_assigned?: string;
  homework_due_date?: Date;
  attendance_data?: Record<string, any>;
  teacher_notes?: string;
  settings?: Record<string, any>;
  is_active?: boolean;
}

export interface LessonQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  from_date?: string;
  to_date?: string;
  class_id?: string;
  subject_id?: string;
  teacher_id?: string;
}

export interface LessonsResponse {
  lessons: LessonWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
} 