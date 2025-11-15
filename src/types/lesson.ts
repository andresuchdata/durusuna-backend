export type LessonInstanceStatus = 'planned' | 'in_session' | 'completed' | 'cancelled';

export interface ScheduleTemplate {
  id: string;
  class_subject_id: string;
  name: string;
  effective_from: string;
  effective_to?: string | null;
  timezone: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleTemplateSlot {
  id: string;
  template_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  room?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LessonInstance {
  id: string;
  class_subject_id: string;
  schedule_slot_id?: string | null;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  status: LessonInstanceStatus;
  title?: string | null;
  description?: string | null;
  objectives: string[];
  materials: Record<string, unknown>[];
  notes?: string | null;
  cancellation_reason?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonInstanceWithContext extends LessonInstance {
  class?: {
    id: string;
    name: string;
    grade_level?: string | null;
    section?: string | null;
    academic_year: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
    category?: string | null;
  };
  primary_teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string | null;
  };
  schedule_slot?: ScheduleTemplateSlot | null;
}

export interface CreateLessonInstanceRequest {
  class_subject_id: string;
  scheduled_start: string;
  scheduled_end: string;
  schedule_slot_id?: string;
  title?: string;
  description?: string;
  objectives?: string[];
  materials?: Record<string, unknown>[];
  notes?: string;
}

export interface UpdateLessonInstanceRequest {
  scheduled_start?: string;
  scheduled_end?: string;
  schedule_slot_id?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  status?: LessonInstanceStatus;
  title?: string | null;
  description?: string | null;
  objectives?: string[];
  materials?: Record<string, unknown>[];
  notes?: string | null;
  cancellation_reason?: string | null;
  is_active?: boolean;
}

export interface LessonInstanceQueryParams {
  page?: number;
  limit?: number;
  status?: LessonInstanceStatus;
  from?: string;
  to?: string;
  class_id?: string;
  class_subject_id?: string;
  teacher_id?: string;
  subject_id?: string;
  search?: string;
}

export interface LessonInstanceResponse {
  lessons: LessonInstanceWithContext[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface TeacherLessonSummary extends LessonInstanceWithContext {
  class_name?: string;
  subject_name?: string;
  attendance_session_id?: string | null;
  attendance_status?: 'not_started' | 'in_progress' | 'finalized';
}

export interface TeacherLessonDashboardResponse {
  date: string;
  lessons: TeacherLessonSummary[];
  total: number;
}

export interface AdminLessonSummary {
  id: string;
  class_id?: string | null;
  title?: string | null;
  subject_id?: string | null;
  subject_name?: string | null;
  teacher_id?: string | null;
  class_name?: string | null;
  teacher_name?: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: LessonInstanceStatus;
}

export interface AdminLessonDashboardResponse {
  lessons: AdminLessonSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface UpdateLessonStatusRequest {
  status: Extract<LessonInstanceStatus, 'in_session' | 'completed'>;
  actual_start?: string | null;
  actual_end?: string | null;
}
 