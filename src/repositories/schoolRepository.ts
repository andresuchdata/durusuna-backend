import { Knex } from 'knex';
import { School, CreateSchoolData, UpdateSchoolData } from '../services/schoolService';

export class SchoolRepository {
  constructor(private db: Knex) {}

  async findAll(): Promise<School[]> {
    return await this.db('schools')
      .select('*')
      .where('is_active', true)
      .orderBy('name', 'asc');
  }

  async findById(id: string): Promise<School | null> {
    const school = await this.db('schools')
      .where('id', id)
      .where('is_active', true)
      .first();
    
    return school || null;
  }

  async create(data: CreateSchoolData): Promise<string> {
    const [school] = await this.db('schools')
      .insert({
        id: this.generateUUID(),
        ...data,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('id');
    
    return school.id;
  }

  async update(id: string, data: UpdateSchoolData): Promise<void> {
    await this.db('schools')
      .where('id', id)
      .update({
        ...data,
        updated_at: new Date()
      });
  }

  async delete(id: string): Promise<void> {
    await this.db('schools')
      .where('id', id)
      .update({
        is_active: false,
        updated_at: new Date()
      });
  }

  private generateUUID(): string {
    // Simple UUID generation - in production, use a proper UUID library
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
} 