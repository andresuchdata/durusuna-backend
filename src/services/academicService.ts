import { Knex } from 'knex';
import { AcademicRepository } from '../repositories/academicRepository';
import { CurrentAcademicPeriodResponse } from '../types/academic';

export class AcademicService {
  private readonly repository: AcademicRepository;

  constructor(db: Knex) {
    this.repository = new AcademicRepository(db);
  }

  async getCurrentAcademicPeriodForSchool(schoolId: string): Promise<CurrentAcademicPeriodResponse | null> {
    const row = await this.repository.findCurrentPeriodWithYearBySchoolId(schoolId);

    if (!row) {
      return null;
    }

    return {
      academic_year: {
        id: row.year_id,
        name: row.year_name,
        start_date: row.year_start,
        end_date: row.year_end,
      },
      current_period: {
        id: row.period_id,
        name: row.period_name,
        sequence: row.sequence,
        start_date: row.period_start,
        end_date: row.period_end,
      },
    };
  }

  async getAcademicPeriodsForSchool(schoolId: string) {
    const rows = await this.repository.listPeriodsWithYearBySchoolId(schoolId);

    return rows.map((row) => ({
      id: row.period_id,
      name: row.period_name,
      sequence: row.sequence,
      start_date: row.period_start,
      end_date: row.period_end,
      is_current: row.is_current,
      academic_year: {
        id: row.year_id,
        name: row.year_name,
        start_date: row.year_start,
        end_date: row.year_end,
      },
    }));
  }
}
