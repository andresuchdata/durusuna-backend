import { Knex } from 'knex';
import { RegisterUserData, AuthUser, UpdateProfileData } from '../types/auth';

export class AuthRepository {
  constructor(private db: Knex) {}

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.db('users')
      .leftJoin('schools', 'users.school_id', 'schools.id')
      .where('users.email', email.toLowerCase())
      .where('users.is_active', true)
      .select(
        'users.*',
        'schools.name as school_name',
        'schools.address as school_address'
      )
      .first();
    
    return user || null;
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const user = await this.db('users')
      .leftJoin('schools', 'users.school_id', 'schools.id')
      .where('users.id', id)
      .where('users.is_active', true)
      .select(
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.user_type',
        'users.role',
        'users.school_id',
        'users.phone',
        'users.date_of_birth',
        'users.student_id',
        'users.employee_id',
        'users.avatar_url',
        'users.is_active',
        'users.is_verified',
        'users.last_active_at',
        'users.created_at',
        'users.updated_at',
        'schools.name as school_name'
      )
      .first();
    
    return user || null;
  }

  async findUserByIdWithPassword(id: string): Promise<(AuthUser & { password_hash: string }) | null> {
    const user = await this.db('users')
      .where('id', id)
      .where('is_active', true)
      .select('*')
      .first();
    
    return user || null;
  }

  async findSchoolById(schoolId: string): Promise<{ id: string; name: string; is_active: boolean } | null> {
    const school = await this.db('schools')
      .where({ id: schoolId, is_active: true })
      .select('id', 'name', 'is_active')
      .first();
    
    return school || null;
  }

  async createUser(userData: RegisterUserData, hashedPassword: string): Promise<string> {
    const userId = await this.db.transaction(async (trx) => {
      const [user] = await trx('users')
        .insert({
          id: this.generateUUID(),
          email: userData.email.toLowerCase(),
          password_hash: hashedPassword,
          first_name: userData.first_name,
          last_name: userData.last_name,
          user_type: userData.user_type,
          role: 'user', // Default role
          school_id: userData.school_id,
          phone: userData.phone,
          date_of_birth: userData.date_of_birth,
          student_id: userData.student_id,
          employee_id: userData.employee_id,
          is_active: true,
          is_verified: false,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');
      
      return user.id;
    });

    return userId;
  }

  async updateUserProfile(userId: string, data: UpdateProfileData): Promise<void> {
    await this.db('users')
      .where('id', userId)
      .update({
        ...data,
        updated_at: new Date()
      });
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await this.db('users')
      .where('id', userId)
      .update({
        password_hash: hashedPassword,
        updated_at: new Date()
      });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db('users')
      .where('id', userId)
      .update({
        last_active_at: new Date(),
        updated_at: new Date()
      });
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.db('password_reset_tokens')
      .insert({
        id: this.generateUUID(),
        user_id: userId,
        token,
        expires_at: expiresAt,
        created_at: new Date()
      });
  }

  async findPasswordResetToken(token: string): Promise<{ 
    id: string; 
    user_id: string; 
    expires_at: Date; 
    used_at?: Date 
  } | null> {
    const tokenRecord = await this.db('password_reset_tokens')
      .where('token', token)
      .where('used_at', null)
      .where('expires_at', '>', new Date())
      .first();
    
    return tokenRecord || null;
  }

  async markPasswordResetTokenAsUsed(tokenId: string): Promise<void> {
    await this.db('password_reset_tokens')
      .where('id', tokenId)
      .update({
        used_at: new Date()
      });
  }

  async cleanupExpiredPasswordResetTokens(): Promise<void> {
    await this.db('password_reset_tokens')
      .where('expires_at', '<', new Date())
      .del();
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