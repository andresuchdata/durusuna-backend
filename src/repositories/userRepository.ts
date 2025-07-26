import { Knex } from 'knex';
import { User, School, UpdateUserProfileData } from '../types/user';

export class UserRepository {
  constructor(private db: Knex) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.db('users')
      .select('id', 'email', 'first_name', 'last_name', 'role', 'school_id', 'created_at')
      .where('id', id)
      .first();
    
    return user || null;
  }

  async findByIdWithPassword(id: string): Promise<Pick<User, 'id' | 'password'> | null> {
    const user = await this.db('users')
      .select('id', 'password')
      .where('id', id)
      .first();
    
    return user || null;
  }

  async findSchoolById(schoolId: string): Promise<School | null> {
    const school = await this.db('schools')
      .select('id', 'name', 'address')
      .where('id', schoolId)
      .first();
    
    return school || null;
  }

  async updateProfile(id: string, data: UpdateUserProfileData): Promise<void> {
    const updateData = {
      ...data,
      updated_at: new Date()
    };

    await this.db('users')
      .where('id', id)
      .update(updateData);
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.db('users')
      .where('id', id)
      .update({
        password: hashedPassword,
        updated_at: new Date()
      });
  }

  async findBySchoolId(schoolId: string): Promise<Omit<User, 'password'>[]> {
    return await this.db('users')
      .select('id', 'email', 'first_name', 'last_name', 'role', 'created_at')
      .where('school_id', schoolId)
      .orderBy('last_name', 'asc');
  }

  async searchUsers(
    currentUserSchoolId: string, 
    currentUserId: string, 
    searchTerm: string, 
    limit: number = 20
  ): Promise<Omit<User, 'password'>[]> {
    const searchPattern = `%${searchTerm}%`;
    
    return await this.db('users')
      .where('school_id', currentUserSchoolId)
      .where('id', '!=', currentUserId)
      .where('is_active', true)
      .where(function() {
        this.where('first_name', 'ilike', searchPattern)
            .orWhere('last_name', 'ilike', searchPattern)
            .orWhere('email', 'ilike', searchPattern)
            .orWhere(this.client.raw("CONCAT(first_name, ' ', last_name)"), 'ilike', searchPattern);
      })
      .select(
        'id',
        'first_name',
        'last_name',
        'email',
        'avatar_url',
        'user_type',
        'role'
      )
      .orderBy('first_name', 'asc')
      .limit(limit);
  }

  async findCurrentUserSchool(userId: string): Promise<{ school_id: string | null } | null> {
    const user = await this.db('users')
      .where('id', userId)
      .select('school_id')
      .first();
    
    return user || null;
  }
} 