import { Knex } from 'knex';
import {
  User,
  School,
  UpdateUserProfileData,
  CreateUserData,
  UpdateUserData,
  ListUsersParams,
  ListUsersResult,
} from '../types/user';

export class UserRepository {
  constructor(private db: Knex) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.db('users')
      .select('*')
      .where('id', id)
      .first();
    
    return user || null;
  }

  async findByIdAndSchool(id: string, schoolId: string): Promise<User | null> {
    const user = await this.db('users')
      .select('*')
      .where({ id, school_id: schoolId })
      .first();

    return user || null;
  }

  async findByIdWithPassword(id: string): Promise<{ id: string; password_hash: string } | null> {
    const user = await this.db('users')
      .select('id', 'password_hash')
      .where('id', id)
      .first();
    
    if (!user) return null;
    return {
      id: user.id,
      password_hash: user.password_hash,
    };
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
      updated_at: new Date(),
    };

    await this.db('users').where('id', id).update(updateData);
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.db('users').where('id', id).update({
      password_hash: hashedPassword,
      updated_at: new Date(),
    });
  }

  async findByEmail(email: string, schoolId: string): Promise<User | null> {
    const user = await this.db('users')
      .select('*')
      .where('school_id', schoolId)
      .andWhereRaw('LOWER(email) = ?', email.toLowerCase())
      .first();

    return user || null;
  }

  async findBySchoolId(schoolId: string): Promise<Omit<User, 'password_hash'>[]> {
    const users = await this.db('users')
      .select('*')
      .where('school_id', schoolId)
      .orderBy('last_name', 'asc');
    
    return users.map(({ password_hash, ...user }) => user);
  }

  async searchUsers(
    currentUserSchoolId: string,
    currentUserId: string,
    searchTerm: string,
    limit: number = 20,
    userType?: string
  ): Promise<Omit<User, 'password_hash'>[]> {
    const searchPattern = `%${searchTerm}%`;
    
    let query = this.db('users')
      .where('school_id', currentUserSchoolId)
      .where('id', '!=', currentUserId)
      .where('is_active', true);

    // Add user type filter if provided
    if (userType && userType !== 'all') {
      query = query.where('user_type', userType);
    }

    // Add search term filter if provided
    if (searchTerm.trim()) {
      query = query.where(function() {
        this.where('first_name', 'ilike', searchPattern)
            .orWhere('last_name', 'ilike', searchPattern)
            .orWhere('email', 'ilike', searchPattern)
            .orWhere(this.client.raw("CONCAT(first_name, ' ', last_name)"), 'ilike', searchPattern);
      });
    }

    const users = await query
      .select('*')
      .orderBy('first_name', 'asc')
      .limit(limit);
    
    return users.map(({ password_hash, ...user }) => user);
  }

  async findCurrentUserSchool(userId: string): Promise<{ school_id: string | null } | null> {
    const user = await this.db('users')
      .where('id', userId)
      .select('school_id')
      .first();
    
    return user || null;
  }

  async findStudentsBySchoolId(schoolId: string): Promise<Omit<User, 'password_hash'>[]> {
    const students = await this.db('users')
      .select('*')
      .where('school_id', schoolId)
      .where('user_type', 'student')
      .where('is_active', true)
      .orderBy('last_name', 'asc');
    
    return students.map(({ password_hash, ...user }) => user);
  }

  async findTeachersBySchoolId(schoolId: string): Promise<Omit<User, 'password_hash'>[]> {
    const teachers = await this.db('users')
      .select('*')
      .where('school_id', schoolId)
      .where('user_type', 'teacher')
      .where('is_active', true)
      .orderBy('last_name', 'asc');
    
    return teachers.map(({ password_hash, ...user }) => user);
  }

  async findUsersByTypeAndSchool(schoolId: string, userType: string): Promise<Omit<User, 'password_hash'>[]> {
    const users = await this.db('users')
      .select('*')
      .where('school_id', schoolId)
      .where('user_type', userType)
      .where('is_active', true)
      .orderBy('last_name', 'asc');
    
    return users.map(({ password_hash, ...user }) => user);
  }

  async listUsers(params: ListUsersParams): Promise<ListUsersResult> {
    const { schoolId, page = 1, limit = 20, search, userType, isActive, dobFrom, dobTo } = params;
    const offset = (page - 1) * limit;

    const baseQuery = this.db('users')
      .where('school_id', schoolId)
      .modify((qb) => {
        if (isActive !== undefined) {
          qb.where('is_active', isActive);
        }
        if (userType && userType !== 'all') {
          qb.where('user_type', userType);
        }
        if (search && search.trim()) {
          const pattern = `%${search.trim()}%`;
          qb.andWhere(function () {
            this.where('first_name', 'ilike', pattern)
              .orWhere('last_name', 'ilike', pattern)
              .orWhere('email', 'ilike', pattern)
              .orWhere('phone', 'ilike', pattern)
              .orWhere(this.client.raw("CONCAT(first_name, ' ', last_name)"), 'ilike', pattern);
          });
        }
        if (dobFrom) {
          qb.where('date_of_birth', '>=', dobFrom);
        }
        if (dobTo) {
          qb.where('date_of_birth', '<=', dobTo);
        }
      });

    const [totalResult] = await baseQuery.clone().count<{ count: string }[]>({ count: '*' });

    const records = await baseQuery
      .clone()
      .select(
        'id',
        'email',
        'first_name',
        'last_name',
        'user_type',
        'role',
        'school_id',
        'phone',
        'avatar_url',
        'is_active',
        'date_of_birth',
        'student_id',
        'employee_id',
        'last_login_at',
        'created_at',
        'updated_at',
      )
      .orderBy([{ column: 'last_name', order: 'asc' }, { column: 'first_name', order: 'asc' }])
      .limit(limit)
      .offset(offset);

    return {
      users: records,
      total: Number(totalResult?.count ?? 0),
      page,
      limit,
    };
  }

  async createUser(
    data: CreateUserData & { school_id: string; password_hash: string },
  ): Promise<Omit<User, 'password_hash'>> {
    const now = new Date();
    const insertData = {
      email: data.email.toLowerCase(),
      password_hash: data.password_hash,
      first_name: data.first_name,
      last_name: data.last_name,
      user_type: data.user_type,
      role: data.role ?? 'user',
      school_id: data.school_id,
      phone: data.phone,
      avatar_url: data.avatar_url,
      date_of_birth: data.date_of_birth ?? null,
      student_id: data.student_id ?? null,
      employee_id: data.employee_id ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    const [user] = await this.db('users')
      .insert(insertData)
      .returning([ 'id','email','first_name','last_name','user_type','role','school_id','phone','avatar_url','is_active','date_of_birth','student_id','employee_id','last_login_at','created_at','updated_at' ]);

    return user;
  }

  async createUsersBatch(
    payload: Array<CreateUserData & { school_id: string; password_hash: string }>,
  ): Promise<Omit<User, 'password_hash'>[]> {
    const now = new Date();
    const rows = payload.map((data) => ({
      email: data.email.toLowerCase(),
      password_hash: data.password_hash,
      first_name: data.first_name,
      last_name: data.last_name,
      user_type: data.user_type,
      role: data.role ?? 'user',
      school_id: data.school_id,
      phone: data.phone,
      avatar_url: data.avatar_url,
      date_of_birth: data.date_of_birth ?? null,
      student_id: data.student_id ?? null,
      employee_id: data.employee_id ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));

    const inserted = await this.db('users')
      .insert(rows)
      .returning([ 'id','email','first_name','last_name','user_type','role','school_id','phone','avatar_url','is_active','date_of_birth','student_id','employee_id','last_login_at','created_at','updated_at' ]);

    return inserted;
  }

  async updateUser(
    userId: string,
    schoolId: string,
    data: UpdateUserData & { password_hash?: string },
  ): Promise<Omit<User, 'password_hash'> | null> {
    const updatePayload: Record<string, unknown> = {
      ...data,
      updated_at: new Date(),
    };

    delete updatePayload.password;

    if (data.password_hash) {
      updatePayload.password_hash = data.password_hash;
    }

    const [user] = await this.db('users')
      .where({ id: userId, school_id: schoolId })
      .update(updatePayload)
      .returning([ 'id','email','first_name','last_name','user_type','role','school_id','phone','avatar_url','is_active','date_of_birth','student_id','employee_id','last_login_at','created_at','updated_at' ]);

    return user ?? null;
  }

  async deactivateUser(userId: string, schoolId: string): Promise<void> {
    await this.db('users')
      .where({ id: userId, school_id: schoolId })
      .update({
        is_active: false,
        updated_at: new Date(),
      });
  }

  async updateFCMToken(userId: string, fcmToken: string): Promise<void> {
    await this.db('users')
      .where('id', userId)
      .update({
        fcm_token: fcmToken,
        fcm_token_updated_at: new Date(),
        updated_at: new Date()
      });
  }

  async clearFCMToken(userId: string): Promise<void> {
    await this.db('users')
      .where('id', userId)
      .update({
        fcm_token: null,
        fcm_token_updated_at: new Date(),
        updated_at: new Date()
      });
  }

  async getParentChildren(parentId: string): Promise<Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string | null;
  }>> {
    return await this.db('parent_student_relationships as psr')
      .join('users as students', 'psr.student_id', 'students.id')
      .where({
        'psr.parent_id': parentId,
        'psr.is_active': true,
        'students.is_active': true
      })
      .select(
        'students.id',
        'students.first_name',
        'students.last_name',
        'students.email',
        'students.avatar_url'
      )
      .orderBy('students.first_name', 'asc')
      .orderBy('students.last_name', 'asc');
  }

  async isParentOfStudent(parentId: string, studentId: string): Promise<boolean> {
    const relationship = await this.db('parent_student_relationships')
      .where({
        parent_id: parentId,
        student_id: studentId,
        is_active: true
      })
      .first();

    return !!relationship;
  }
}