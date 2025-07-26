export interface Lesson {
  id: string;
  title: string;
  content?: string;
  lesson_date: Date;
  class_id: string;
  teacher_id: string;
  duration_minutes?: number;
  materials?: string;
  homework_assigned?: string;
  learning_objectives?: string[];
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface LessonWithClass extends Lesson {
  class: {
    id: string;
    name: string;
    subject: string;
    school_id: string;
  };
}

export interface LessonWithTeacher extends Lesson {
  teacher: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface CreateLessonRequest {
  title: string;
  content?: string;
  lesson_date: Date;
  class_id: string;
  duration_minutes?: number;
  materials?: string;
  homework_assigned?: string;
  learning_objectives?: string[];
}

export interface UpdateLessonRequest extends Partial<CreateLessonRequest> {
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}

export interface LessonQueryParams {
  page?: number;
  limit?: number;
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  from_date?: string;
  to_date?: string;
}

export interface LessonsResponse {
  lessons: Lesson[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
} 