import { Knex } from 'knex';

type CurrentPeriodRow = {
  period_id: string;
  period_name: string;
  sequence: number;
  period_start: Date;
  period_end: Date;
  year_id: string;
  year_name: string;
  year_start: Date;
  year_end: Date;
};

type PeriodWithYearRow = {
  period_id: string;
  period_name: string;
  sequence: number;
  period_start: Date;
  period_end: Date;
  is_current: boolean;
  year_id: string;
  year_name: string;
  year_start: Date;
  year_end: Date;
};

export class AcademicRepository {
  constructor(private readonly db: Knex) {}

  async findCurrentPeriodWithYearBySchoolId(schoolId: string): Promise<CurrentPeriodRow | null> {
    const row = await this.db('academic_periods')
      .join('academic_years', 'academic_periods.academic_year_id', 'academic_years.id')
      .where('academic_years.school_id', schoolId)
      .where('academic_periods.is_current', true)
      .select<CurrentPeriodRow[]>(
        'academic_periods.id as period_id',
        'academic_periods.name as period_name',
        'academic_periods.sequence',
        'academic_periods.start_date as period_start',
        'academic_periods.end_date as period_end',
        'academic_years.id as year_id',
        'academic_years.name as year_name',
        'academic_years.start_date as year_start',
        'academic_years.end_date as year_end',
      )
      .first();

    return row || null;
  }

  async listPeriodsWithYearBySchoolId(schoolId: string): Promise<PeriodWithYearRow[]> {
    const rows = await this.db('academic_periods')
      .join('academic_years', 'academic_periods.academic_year_id', 'academic_years.id')
      .where('academic_years.school_id', schoolId)
      .select<PeriodWithYearRow[]>(
        'academic_periods.id as period_id',
        'academic_periods.name as period_name',
        'academic_periods.sequence',
        'academic_periods.start_date as period_start',
        'academic_periods.end_date as period_end',
        'academic_periods.is_current',
        'academic_years.id as year_id',
        'academic_years.name as year_name',
        'academic_years.start_date as year_start',
        'academic_years.end_date as year_end',
      )
      .orderBy('academic_years.start_date', 'desc')
      .orderBy('academic_periods.sequence', 'asc');

    return rows;
  }
}
