import { ClassOfferingWithDetails } from './classOffering';

// Grading Component Types
export interface GradingComponent {
  id: string;
  scope: 'school' | 'period' | 'subject' | 'class_offering';
  scope_ref_id?: string;
  key: string;
  display_label: string;
  source_type: 'assignment' | 'test' | 'final_exam';
  filters: Record<string, any>;
  aggregator: GradingAggregator;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface GradingAggregator {
  type: 'average' | 'weighted_average' | 'best_n' | 'drop_lowest_k' | 'latest' | 'sum' | 'max' | 'min';
  n?: number; // for best_n
  k?: number; // for drop_lowest_k
  then?: 'average' | 'sum'; // for drop_lowest_k
  weights?: 'equal' | 'score_based' | number[]; // for weighted_average
  missing_policy: 'ignore' | 'zero' | 'fail_validation';
  rounding?: 'none' | 'half_up' | 'half_down' | 'bankers';
  decimal_places?: number;
}

// Grading Formula Types
export interface GradingFormula {
  id: string;
  scope: 'school' | 'period' | 'subject' | 'class_offering';
  scope_ref_id?: string;
  expression: string;
  conditions?: GradingCondition[];
  rounding_rule: 'none' | 'half_up' | 'half_down' | 'bankers' | 'floor' | 'ceil';
  decimal_places: number;
  pass_threshold?: number;
  grade_boundaries?: Record<string, number>;
  version: number;
  is_active: boolean;
  description?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface GradingCondition {
  condition: string; // e.g., "final_exam < 60"
  formula: string; // e.g., "final_exam"
  description?: string;
}

// Final Grade Types
export interface FinalGrade {
  id: string;
  student_id: string;
  class_offering_id: string;
  numeric_grade?: number;
  letter_grade?: string;
  is_passing?: boolean;
  component_breakdown?: ComponentBreakdown;
  formula_id?: string;
  formula_version?: number;
  computed_at?: Date;
  computed_by?: string;
  is_published: boolean;
  published_at?: Date;
  published_by?: string;
  is_locked: boolean;
  locked_at?: Date;
  locked_by?: string;
  override_grade?: number;
  override_reason?: string;
  override_by?: string;
  override_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ComponentBreakdown {
  [componentKey: string]: number | null | string | string[] | undefined;
  formula_used?: string;
  calculation?: string;
  conditions_applied?: string[];
  raw_calculation?: number;
  curved_grade?: number;
  final_grade?: number;
}

export interface FinalGradeWithDetails extends FinalGrade {
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    student_id?: string;
    avatar_url?: string;
  };
  class_offering?: ClassOfferingWithDetails;
  formula?: GradingFormula;
  computed_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

// Grade Computation Types
export interface GradeComputation {
  id: string;
  final_grade_id: string;
  triggered_by?: string;
  trigger_type: 'manual' | 'auto_grade_change' | 'auto_assessment_change' | 'formula_change';
  trigger_description?: string;
  previous_grade?: number;
  new_grade?: number;
  computation_log?: ComputationLog;
  status: 'pending' | 'completed' | 'failed';
  error_message?: string;
  started_at: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ComputationLog {
  components_resolved: Record<string, any>;
  formula_applied: string;
  calculation_steps: string[];
  conditions_evaluated: Array<{
    condition: string;
    result: boolean;
    formula_used?: string;
  }>;
  raw_result: number;
  rounded_result: number;
  letter_grade?: string;
  is_passing?: boolean;
}

// Request/Response Types
export interface CreateGradingComponentRequest {
  scope: 'school' | 'period' | 'subject' | 'class_offering';
  scope_ref_id?: string;
  key: string;
  display_label: string;
  source_type: 'assignment' | 'test' | 'final_exam';
  filters?: Record<string, any>;
  aggregator: GradingAggregator;
}

export interface UpdateGradingComponentRequest {
  key?: string;
  display_label?: string;
  source_type?: 'assignment' | 'test' | 'final_exam';
  filters?: Record<string, any>;
  aggregator?: GradingAggregator;
  is_active?: boolean;
}

export interface CreateGradingFormulaRequest {
  scope: 'school' | 'period' | 'subject' | 'class_offering';
  scope_ref_id?: string;
  expression: string;
  conditions?: GradingCondition[];
  rounding_rule?: 'none' | 'half_up' | 'half_down' | 'bankers' | 'floor' | 'ceil';
  decimal_places?: number;
  pass_threshold?: number;
  grade_boundaries?: Record<string, number>;
  description?: string;
}

export interface UpdateGradingFormulaRequest {
  expression?: string;
  conditions?: GradingCondition[];
  rounding_rule?: 'none' | 'half_up' | 'half_down' | 'bankers' | 'floor' | 'ceil';
  decimal_places?: number;
  pass_threshold?: number;
  grade_boundaries?: Record<string, number>;
  description?: string;
  is_active?: boolean;
}

export interface OverrideFinalGradeRequest {
  override_grade: number;
  override_reason: string;
}

export interface ComputeGradesRequest {
  scope: 'class_offering' | 'period' | 'school';
  scope_id: string;
  student_ids?: string[]; // Optional: compute for specific students only
  force_recompute?: boolean; // Ignore is_locked flag
}

export interface PreviewGradeRequest {
  student_id: string;
  class_offering_id: string;
  formula_override?: string; // Test different formula
  component_overrides?: Record<string, number>; // Test different component values
}

export interface GradingComponentQueryParams {
  page?: number;
  limit?: number;
  scope?: 'school' | 'period' | 'subject' | 'class_offering';
  scope_ref_id?: string;
  source_type?: 'assignment' | 'test' | 'final_exam';
  is_active?: boolean;
}

export interface GradingFormulaQueryParams {
  page?: number;
  limit?: number;
  scope?: 'school' | 'period' | 'subject' | 'class_offering';
  scope_ref_id?: string;
  is_active?: boolean;
}

export interface FinalGradeQueryParams {
  page?: number;
  limit?: number;
  student_id?: string;
  class_offering_id?: string;
  is_published?: boolean;
  is_locked?: boolean;
  has_override?: boolean;
}

export interface GradingComponentsResponse {
  components: GradingComponent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface GradingFormulasResponse {
  formulas: GradingFormula[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface FinalGradesResponse {
  final_grades: FinalGradeWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface GradePreviewResponse {
  student_id: string;
  class_offering_id: string;
  component_breakdown: ComponentBreakdown;
  numeric_grade: number;
  letter_grade?: string;
  is_passing: boolean;
  formula_used: string;
  computation_log: ComputationLog;
  warnings?: string[];
}

export interface GradeComputationResponse {
  computation_id: string;
  status: 'pending' | 'completed' | 'failed';
  affected_students: number;
  completed_students: number;
  failed_students: number;
  errors?: string[];
}

// Utility Types for Islamic School Context
export interface IslamicGradingPresets {
  // Common Indonesian Islamic school grading components
  tugas_harian: GradingComponent; // Daily assignments
  ulangan_harian: GradingComponent; // Regular tests (pengulangan)
  uts: GradingComponent; // Mid-semester exam
  uas: GradingComponent; // Final semester exam
  akhlak: GradingComponent; // Character/behavior assessment
  hafalan: GradingComponent; // Quran memorization
}

export interface IslamicSubjectTypes {
  // Common Islamic school subjects
  quran_hadits: 'Quran Hadits';
  aqidah_akhlak: 'Aqidah Akhlak';
  fiqh: 'Fiqh';
  ski: 'Sejarah Kebudayaan Islam';
  bahasa_arab: 'Bahasa Arab';
  // Plus regular subjects (Math, Science, etc.)
}
