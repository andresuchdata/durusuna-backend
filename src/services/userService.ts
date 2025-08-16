const bcrypt = require('bcryptjs');
import { UserRepository } from '../repositories/userRepository';
import { FCMTokenRepository } from '../repositories/fcmTokenRepository';
import { 
  User, 
  UserWithSchool, 
  UpdateUserProfileData, 
  ChangePasswordData, 
  AuthenticatedUser 
} from '../types/user';
import { 
  updateProfileSchema, 
  changePasswordSchema, 
  searchUsersSchema,
  type UpdateProfileInput,
  type ChangePasswordInput,
  type SearchUsersInput
} from '../schemas/userSchemas';

export class UserService {
  private fcmTokenRepository: FCMTokenRepository;

  constructor(private userRepository: UserRepository) {
    // Get db instance from userRepository (cleaner than passing separately)
    this.fcmTokenRepository = new FCMTokenRepository((this.userRepository as any).db);
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
      userWithPassword.password!
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

  async getSchoolUsers(currentUser: AuthenticatedUser, schoolId: string): Promise<Omit<User, 'password'>[]> {
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
    const offset = (page - 1) * limit;

    // Get current user's school
    const currentUserData = await this.userRepository.findCurrentUserSchool(currentUser.id);
    
    if (!currentUserData || !currentUserData.school_id) {
      throw new Error('User not associated with a school');
    }

    // Use search logic with optional search term and user type filter
    const users = await this.userRepository.searchUsers(
      currentUserData.school_id,
      currentUser.id,
      search || '', // Use provided search term or empty string
      limit,
      userType
    );

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
      contacts: formattedUsers,
      pagination: {
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        hasMore: users.length === limit
      },
      totalContacts: formattedUsers.length
    };
  }

  async getSchoolStudents(currentUser: AuthenticatedUser): Promise<Omit<User, 'password'>[]> {
    // Only admins can get all school students
    if (currentUser.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }

    return await this.userRepository.findStudentsBySchoolId(currentUser.school_id);
  }

  async getSchoolTeachers(currentUser: AuthenticatedUser): Promise<Omit<User, 'password'>[]> {
    // Only admins can get all school teachers
    if (currentUser.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }

    return await this.userRepository.findTeachersBySchoolId(currentUser.school_id);
  }

  async getUsersByType(currentUser: AuthenticatedUser, userType: string): Promise<Omit<User, 'password'>[]> {
    // Only admins can get users by type
    if (currentUser.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }

    const validUserTypes = ['student', 'teacher', 'parent', 'admin'];
    if (!validUserTypes.includes(userType)) {
      throw new Error('Invalid user type');
    }

    return await this.userRepository.findUsersByTypeAndSchool(currentUser.school_id, userType);
  }

  async updateFCMToken(userId: string, fcmToken: string): Promise<void> {
    await this.fcmTokenRepository.updateToken(userId, fcmToken);
  }

  async clearFCMToken(userId: string): Promise<void> {
    await this.fcmTokenRepository.removeToken(userId);
  }
} 