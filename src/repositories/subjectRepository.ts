import { Knex } from 'knex';

export interface SchoolSubject {
  id: string;
  name: string;
  subject_code: string | null;
}

export class SubjectRepository {
  constructor(private db: Knex) {}

  async findActiveSubjectsForSchool(schoolId: string): Promise<SchoolSubject[]> {
    const rows = await this.db('subjects as s')
      .distinct('s.id', 's.name', 's.code')
      .join('class_subjects as cs', 'cs.subject_id', 's.id')
      .join('classes as c', 'cs.class_id', 'c.id')
      .where('c.school_id', schoolId)
      .andWhere('s.is_active', true)
      .andWhere('cs.is_active', true)
      .andWhere('c.is_active', true)
      .orderBy('s.name', 'asc')
      .orderBy('s.code', 'asc');

    return rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      subject_code: (row.code as string | undefined) ?? null,
    }));
  }
}
