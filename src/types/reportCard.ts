export interface ReportCard {
  id: string;
  student_id: string;
  class_id: string;
  academic_period_id: string;
  homeroom_teacher_id?: string | null;
  promotion_status?: 'promoted' | 'not_promoted' | 'conditional' | null;
  is_published: boolean;
  is_locked: boolean;
  generated_at: Date;
  finalized_at?: Date | null;
  published_at?: Date | null;
  published_by?: string | null;
  locked_at?: Date | null;
  locked_by?: string | null;
  general_remark?: string | null;
  metadata?: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReportCardSubjectFinalGradeDetails {
  numeric_grade?: number | null;
  letter_grade?: string | null;
  is_passing?: boolean | null;
  component_breakdown?: Record<string, any> | null;
  computed_at?: string | null;
  computed_by?: string | null;
  formula?: {
    id?: string | null;
    version?: number | null;
    expression?: string | null;
    rounding_rule?: string | null;
    decimal_places?: number | null;
    pass_threshold?: number | null;
    description?: string | null;
  } | null;
}

export interface ReportCardSubject {
  id: string;
  report_card_id: string;
  class_offering_id: string;
  final_grade_id?: string | null;
  subject_id: string;
  subject_name: string;
  subject_code?: string | null;
  teacher_id?: string | null;
  teacher_name?: string | null;
  numeric_grade?: number | null;
  letter_grade?: string | null;
  is_passing?: boolean | null;
  sequence?: number | null;
  metadata?: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
  final_grade_details?: ReportCardSubjectFinalGradeDetails;
}

export interface GenerateReportCardsRequest {
  class_id: string;
  academic_period_id: string;
  student_ids?: string[];
  regenerate?: boolean;
}

export interface ListReportCardsQuery {
  class_id: string;
  academic_period_id: string;
  student_id?: string;
  page?: number;
  limit?: number;
}

export interface ReportCardSummary extends ReportCard {
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    student_number?: string | null;
  };
}

export interface ReportCardDetail extends ReportCardSummary {
  class?: {
    id: string;
    name: string;
    grade_level?: string | null;
    section?: string | null;
  };
  academic_period?: {
    id: string;
    name: string;
    sequence: number;
  };
  academic_year?: {
    id: string;
    name: string;
  };
  subjects: ReportCardSubject[];
}
