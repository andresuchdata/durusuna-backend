// Academic Year and Period Types
export interface AcademicYear {
  id: string;
  school_id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
  is_current: boolean;
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AcademicPeriod {
  id: string;
  academic_year_id: string;
  name: string;
  type: 'semester';
  sequence: number;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
  is_current: boolean;
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AcademicPeriodWithYear extends AcademicPeriod {
  academic_year: AcademicYear;
}

// Request/Response Types
export interface CreateAcademicYearRequest {
  name: string;
  start_date: Date;
  end_date: Date;
  settings?: Record<string, any>;
}

export interface UpdateAcademicYearRequest {
  name?: string;
  start_date?: Date;
  end_date?: Date;
  is_active?: boolean;
  settings?: Record<string, any>;
}

export interface CreateAcademicPeriodRequest {
  academic_year_id: string;
  name: string;
  type: 'semester';
  sequence: number;
  start_date: Date;
  end_date: Date;
  settings?: Record<string, any>;
}

export interface UpdateAcademicPeriodRequest {
  name?: string;
  start_date?: Date;
  end_date?: Date;
  is_active?: boolean;
  settings?: Record<string, any>;
}

export interface AcademicYearQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  school_id?: string;
}

export interface AcademicYearsResponse {
  academic_years: AcademicYear[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface AcademicPeriodsResponse {
  academic_periods: AcademicPeriodWithYear[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CurrentAcademicPeriodResponse {
  academic_year: {
    id: string;
    name: string;
    start_date: Date;
    end_date: Date;
  };
  current_period: {
    id: string;
    name: string;
    sequence: number;
    start_date: Date;
    end_date: Date;
  };
}
