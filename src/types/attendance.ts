export interface AttendanceRecord {
  id: string;
  class_id: string;
  student_id: string;
  attendance_date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: Date;
  notes?: string;
  marked_by?: string;
  marked_via: 'manual' | 'gps' | 'imported';
  student_latitude?: number;
  student_longitude?: number;
  location_verified: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface AttendanceRecordWithStudent extends AttendanceRecord {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    student_id?: string;
  };
}

export interface AttendanceSession {
  id: string;
  class_id: string;
  teacher_id: string;
  session_date: Date;
  opened_at: Date;
  closed_at?: Date;
  is_finalized: boolean;
  settings: Record<string, any>;
  created_at: Date;
  updated_at?: Date;
}

export interface SchoolAttendanceSettings {
  id: string;
  school_id: string;
  require_location: boolean;
  school_latitude?: number;
  school_longitude?: number;
  location_radius_meters: number;
  attendance_hours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  allow_late_attendance: boolean;
  late_threshold_minutes: number;
  created_at: Date;
  updated_at?: Date;
}

export interface CreateAttendanceRecordRequest {
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: string; // ISO string
  notes?: string;
  marked_via?: 'manual' | 'gps';
  student_latitude?: number;
  student_longitude?: number;
}

export interface BulkUpdateAttendanceRequest {
  records: Array<{
    student_id: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
  }>;
  marked_via?: 'manual' | 'gps';
}

export interface StudentAttendanceRequest {
  class_id: string;
  latitude?: number;
  longitude?: number;
}

export interface AttendanceStatsResponse {
  total_students: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_rate: number; // percentage
}

export interface AttendanceReportRequest {
  class_id: string;
  start_date: string;
  end_date: string;
  student_ids?: string[];
}

export interface StudentAttendanceSummary {
  student_id: string;
  student_name: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  attendance_rate: number;
}

export interface AttendanceReportResponse {
  class_id: string;
  class_name: string;
  date_range: {
    start_date: string;
    end_date: string;
  };
  summary: AttendanceStatsResponse;
  students: StudentAttendanceSummary[];
}

export interface LocationVerificationResult {
  is_valid: boolean;
  distance_meters?: number;
  error?: string;
}

export interface TeacherAttendanceRequest {
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export interface TeacherAttendanceOverview {
  teacher_id: string;
  teacher_name: string;
  total_classes: number;
  classes_with_attendance: number;
  classes_without_attendance: number;
  classes: Array<{
    class_id: string;
    class_name: string;
    has_attendance_session: boolean;
    is_finalized: boolean;
    student_count: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    excused_count: number;
  }>;
}

export interface TeacherAttendanceRecord extends AttendanceRecord {
  teacher: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface SchoolTeachersAttendanceReport {
  school_id: string;
  school_name: string;
  date_range: {
    start_date: string;
    end_date: string;
  };
  summary: {
    total_teachers: number;
    present_days: number;
    absent_days: number;
    late_days: number;
    excused_days: number;
    average_attendance_rate: number;
  };
  teachers: Array<{
    teacher_id: string;
    teacher_name: string;
    total_days: number;
    present_days: number;
    absent_days: number;
    late_days: number;
    excused_days: number;
    attendance_rate: number;
    attendance_records: TeacherAttendanceRecord[];
  }>;
}
