const bcrypt = require('bcryptjs');
import { UserRepository } from '../repositories/userRepository';
import { FCMTokenRepository } from '../repositories/fcmTokenRepository';
import { AccessControlService } from './accessControlService';
import {
  User,
  UserWithSchool,
  AuthenticatedUser,
  UpdateUserData,
} from '../types/user';
import {
  updateProfileSchema,
  changePasswordSchema,
  searchUsersSchema,
  createUserSchema,
  updateUserSchema,
  batchCreateUsersSchema,
  listUsersQuerySchema,
  type UpdateProfileInput,
  type ChangePasswordInput,
  type SearchUsersInput,
  type CreateUserInput,
  type UpdateUserInput,
  type BatchCreateUsersInput,
  type ListUsersQueryInput,
} from '../schemas/userSchemas';

export class UserService {
  private fcmTokenRepository: FCMTokenRepository;
  private accessControlService: AccessControlService;

  constructor(private userRepository: UserRepository) {
    // Get db instance from userRepository (cleaner than passing separately)
    this.fcmTokenRepository = new FCMTokenRepository((this.userRepository as any).db);
    this.accessControlService = new AccessControlService((this.userRepository as any).db);
  }

  private ensureSchool(currentUser: AuthenticatedUser): string {
    if (!currentUser.school_id) {
      throw new Error('User not associated with a school');
    }
    return currentUser.school_id;
  }

  private isAdmin(currentUser: AuthenticatedUser): boolean {
    return currentUser.role === 'admin';
  }

  private isTeacher(currentUser: AuthenticatedUser): boolean {
    return currentUser.user_type === 'teacher';
  }

  private canReadUsers(currentUser: AuthenticatedUser): boolean {
    return this.isAdmin(currentUser) || this.isTeacher(currentUser) || currentUser.user_type === 'student' || currentUser.user_type === 'parent';
  }

  private canUpdateUsers(currentUser: AuthenticatedUser): boolean {
    return this.isAdmin(currentUser) || this.isTeacher(currentUser);
  }

  async getUserProfile(userId: string): Promise<UserWithSchool> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const userWithSchool: UserWithSchool = { ...user };

    // Add school information if user has a school
    if (user.school_id) {
      const school = await this.userRepository.findSchoolById(user.school_id);
      if (school) {
        userWithSchool.school = school;
      }
    }

    return userWithSchool;
  }

  async updateUserProfile(userId: string, data: UpdateProfileInput): Promise<UserWithSchool> {
    // Validate input
    const validatedData = updateProfileSchema.parse(data);
    
    // Update the user profile
    await this.userRepository.updateProfile(userId, validatedData);
    
    // Return updated user profile
    return await this.getUserProfile(userId);
  }

  async changePassword(userId: string, passwordData: ChangePasswordInput): Promise<void> {
    // Validate input
    const validatedData = changePasswordSchema.parse(passwordData);
    
    // Get current user with password
    const userWithPassword = await this.userRepository.findByIdWithPassword(userId);
    if (!userWithPassword) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      validatedData.current_password, 
      userWithPassword.password_hash
    );
    
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(validatedData.new_password, saltRounds);

    // Update password
    await this.userRepository.updatePassword(userId, hashedNewPassword);
  }

  async getSchoolUsers(currentUser: AuthenticatedUser, schoolId: string): Promise<Omit<User, 'password_hash'>[]> {
    // Check authorization - only admins can get all school users
    if (currentUser.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }

    // Admins can only access users from their own school
    if (currentUser.school_id !== schoolId) {
      throw new Error('Access denied: Can only access users from your school');
    }

    return await this.userRepository.findBySchoolId(schoolId);
  }

  async searchUsers(currentUser: AuthenticatedUser, searchParams: SearchUsersInput) {
    // Validate input
    const validatedParams = searchUsersSchema.parse(searchParams);
    
    // Get current user's school
    const currentUserData = await this.userRepository.findCurrentUserSchool(currentUser.id);
    
    if (!currentUserData || !currentUserData.school_id) {
      throw new Error('User not associated with a school');
    }

    // Search users in the same school
    const users = await this.userRepository.searchUsers(
      currentUserData.school_id,
      currentUser.id,
      validatedParams.q,
      validatedParams.limit || 20,
      validatedParams.userType
    );

    // Format users for response (add additional fields as needed)
    const formattedUsers = users.map(user => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || null,
      avatar_url: user.avatar_url || null,
      user_type: user.user_type,
      role: user.role,
      school_id: currentUserData.school_id,
      is_active: true,
      last_active_at: user.last_login_at || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    return {
      users: formattedUsers,
      query: validatedParams.q.trim()
    };
  }

  async getContacts(currentUser: AuthenticatedUser, page: number = 1, limit: number = 50, search?: string, userType?: string) {
    // Ensure user has a school
    this.ensureSchool(currentUser);

    // Use AccessControlService to get role-based filtered users
    const offset = (page - 1) * limit;
    const users = await this.accessControlService.getAccessibleUsers(currentUser, {
      search,
      userType,
      limit,
      offset,
      includeInactive: false
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || null,
      avatar_url: user.avatar_url || null,
      user_type: user.user_type,
      role: user.role,
      school_id: user.school_id,
      is_active: user.is_active,
      last_active_at: user.last_login_at || null,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at?.toISOString() || user.created_at.toISOString()
    }));

    return {
      contacts: formattedUsers,
      pagination: {
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        hasMore: users.length === limit
      },
      totalContacts: formattedUsers.length
    };
  }

  async getSchoolStudents(currentUser: AuthenticatedUser): Promise<Omit<User, 'password_hash'>[]> {
    // Only admins can get all school students
    if (currentUser.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }
    if(!currentUser.school_id) {
      throw new Error('Access denied: No school ID found');
    }

    return await this.userRepository.findStudentsBySchoolId(currentUser.school_id);
  }

  async getSchoolTeachers(currentUser: AuthenticatedUser): Promise<Omit<User, 'password_hash'>[]> {
    // Only admins can get all school teachers
    if (currentUser.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }
    if(!currentUser.school_id) {
      throw new Error('Access denied: No school ID found');
    }

    return await this.userRepository.findTeachersBySchoolId(currentUser.school_id);
  }

  async getUsersByType(currentUser: AuthenticatedUser, userType: string): Promise<Omit<User, 'password_hash'>[]> {
    // Only admins can get users by type
    if (currentUser.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }
    if(!currentUser.school_id) {
      throw new Error('Access denied: No school ID found');
    }

    const validUserTypes = ['student', 'teacher', 'parent', 'admin'];
    if (!validUserTypes.includes(userType)) {
      throw new Error('Invalid user type');
    }

    return await this.userRepository.findUsersByTypeAndSchool(currentUser.school_id, userType);
  }

  async listUsers(currentUser: AuthenticatedUser, input: ListUsersQueryInput) {
    if (!this.canReadUsers(currentUser)) {
      throw new Error('Access denied: insufficient permissions');
    }

    const params = listUsersQuerySchema.parse(input);
    this.ensureSchool(currentUser);

    // For admin users, use the original repository method for full user management
    if (currentUser.role === 'admin') {
      return this.userRepository.listUsers({
        schoolId: currentUser.school_id!,
        page: params.page,
        limit: params.limit,
        search: params.search,
        userType: params.userType,
        isActive: params.isActive,
        dobFrom: params.dobFrom,
        dobTo: params.dobTo,
      });
    }

    // For non-admin users, use access control service
    const offset = ((params.page || 1) - 1) * (params.limit || 20);
    const users = await this.accessControlService.getAccessibleUsers(currentUser, {
      search: params.search,
      userType: params.userType,
      limit: params.limit || 20,
      offset,
      includeInactive: params.isActive !== undefined ? !params.isActive : false
    });

    return {
      users,
      total: users.length, // Note: This won't be accurate for pagination, but non-admins typically don't need exact counts
      page: params.page || 1,
      limit: params.limit || 20,
    };
  }

  async getUserById(currentUser: AuthenticatedUser, userId: string) {
    if (!this.canReadUsers(currentUser)) {
      throw new Error('Access denied: insufficient permissions');
    }

    this.ensureSchool(currentUser);

    // Check if user can access this specific user
    if (currentUser.role !== 'admin') {
      const canAccess = await this.accessControlService.canAccessUser(currentUser, userId);
      if (!canAccess) {
        throw new Error('Access denied: You cannot view this user');
      }
    }

    const user = await this.userRepository.findByIdAndSchool(userId, currentUser.school_id!);

    if (!user) {
      throw new Error('User not found');
    }

    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  async createUser(currentUser: AuthenticatedUser, payload: CreateUserInput) {
    if (!this.isAdmin(currentUser)) {
      throw new Error('Access denied: Admin role required');
    }

    const data = createUserSchema.parse(payload);
    const schoolId = this.ensureSchool(currentUser);

    const existing = await this.userRepository.findByEmail(data.email, schoolId);
    if (existing) {
      throw new Error(`User with email ${data.email} already exists`);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await this.userRepository.createUser({
      ...data,
      school_id: schoolId,
      password_hash: hashedPassword,
    });

    return user;
  }

  async createUsersBatch(currentUser: AuthenticatedUser, payload: BatchCreateUsersInput) {
    if (!this.isAdmin(currentUser)) {
      throw new Error('Access denied: Admin role required');
    }

    const data = batchCreateUsersSchema.parse(payload);
    const schoolId = this.ensureSchool(currentUser);

    const seen = new Set<string>();
    for (const user of data.users) {
      const email = user.email.toLowerCase();
      if (seen.has(email)) {
        throw new Error(`Duplicate email in batch payload: ${email}`);
      }
      seen.add(email);
    }

    for (const user of data.users) {
      const existing = await this.userRepository.findByEmail(user.email, schoolId);
      if (existing) {
        throw new Error(`User with email ${user.email} already exists`);
      }
    }

    const usersWithHashes = await Promise.all(
      data.users.map(async (user) => ({
        ...user,
        school_id: schoolId,
        password_hash: await bcrypt.hash(user.password, 12),
      })),
    );

    return this.userRepository.createUsersBatch(usersWithHashes);
  }

  async updateUser(currentUser: AuthenticatedUser, userId: string, payload: UpdateUserInput) {
    if (!this.canUpdateUsers(currentUser)) {
      throw new Error('Access denied: insufficient permissions');
    }

    const data = updateUserSchema.parse(payload);
    const schoolId = this.ensureSchool(currentUser);

    const targetUser = await this.userRepository.findByIdAndSchool(userId, schoolId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    if (!this.isAdmin(currentUser)) {
      const forbiddenFields = ['role', 'user_type', 'is_active'];
      for (const field of forbiddenFields) {
        if (field in data) {
          throw new Error('Access denied: insufficient permissions');
        }
      }
    }

    if (data.email && data.email !== targetUser.email) {
      const existing = await this.userRepository.findByEmail(data.email, schoolId);
      if (existing && existing.id !== userId) {
        throw new Error(`User with email ${data.email} already exists`);
      }
    }

    const updatePayload: UpdateUserData & { password_hash?: string } = { ...data };

    if (data.password) {
      updatePayload.password_hash = await bcrypt.hash(data.password, 12);
      delete updatePayload.password;
    }

    const updated = await this.userRepository.updateUser(userId, schoolId, updatePayload);
    if (!updated) {
      throw new Error('Failed to update user');
    }

    return updated;
  }

  async deleteUser(currentUser: AuthenticatedUser, userId: string) {
    if (!this.isAdmin(currentUser)) {
      throw new Error('Access denied: Admin role required');
    }

    const schoolId = this.ensureSchool(currentUser);
    if (currentUser.id === userId) {
      throw new Error('You cannot delete your own account');
    }

    const user = await this.userRepository.findByIdAndSchool(userId, schoolId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.deactivateUser(userId, schoolId);
  }

  async updateFCMToken(userId: string, fcmToken: string): Promise<void> {
    await this.fcmTokenRepository.updateToken(userId, fcmToken);
  }

  async clearFCMToken(userId: string): Promise<void> {
    await this.fcmTokenRepository.removeToken(userId);
  }

  async getParentChildren(currentUser: AuthenticatedUser): Promise<Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string | null;
  }>> {
    // Only parents can access this endpoint
    if (currentUser.user_type !== 'parent') {
      throw new Error('Access denied: Only parents can access this endpoint');
    }

    return await this.userRepository.getParentChildren(currentUser.id);
  }
} 