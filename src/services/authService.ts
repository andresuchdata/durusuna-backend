const bcrypt = require('bcryptjs');
import { AuthRepository } from '../repositories/authRepository';
import { SchoolRepository } from '../repositories/schoolRepository';
import { 
  RegisterUserData, 
  LoginCredentials, 
  AuthUser, 
  LoginResponse,
  UpdateProfileData,
  ChangePasswordData,
  RefreshTokenData,
  ForgotPasswordData,
  ResetPasswordData
} from '../types/auth';
import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema,
  changePasswordSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  registerAdminSchema,
  type RegisterInput,
  type LoginInput,
  type UpdateProfileInput,
  type ChangePasswordInput,
  type RefreshTokenInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type RegisterAdminInput
} from '../schemas/authSchemas';

import { generateTokenPair, verifyRefreshToken, JWTUser } from '../utils/jwt';

export class AuthService {
  constructor(
    private authRepository: AuthRepository,
    private schoolRepository?: SchoolRepository
  ) {}

  async register(data: RegisterInput): Promise<{ user: AuthUser; accessToken: string; refreshToken: string; expiresIn: string }> {
    // Validate input
    const validatedData = registerSchema.parse(data);
    
    // Check if email already exists
    const existingUser = await this.authRepository.findUserByEmail(validatedData.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Verify school exists
    const school = await this.authRepository.findSchoolById(validatedData.school_id);
    if (!school) {
      throw new Error('Invalid school ID');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

    // Convert date_of_birth string to Date if needed
    const userData = {
      ...validatedData,
      date_of_birth: validatedData.date_of_birth 
        ? (typeof validatedData.date_of_birth === 'string' 
            ? new Date(validatedData.date_of_birth) 
            : validatedData.date_of_birth)
        : undefined
    };

    // Create user
    const userId = await this.authRepository.createUser(userData, hashedPassword);

    // Get created user
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new Error('Failed to create user');
    }

    // Generate tokens
    const tokens = generateTokenPair(user);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    };
  }

  async registerAdmin(data: RegisterAdminInput): Promise<{ user: AuthUser; accessToken: string; refreshToken: string; expiresIn: string }> {
    if (!this.schoolRepository) {
      throw new Error('School repository not available');
    }

    // Validate input
    const validatedData = registerAdminSchema.parse(data);
    
    // Check if email already exists (check across all schools)
    const existingUser = await this.authRepository.findUserByEmail(validatedData.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

    // Create school first
    const schoolId = await this.schoolRepository.create({
      name: validatedData.school_name,
      address: validatedData.school_address,
      phone: validatedData.school_phone,
      email: validatedData.school_email,
      website: validatedData.school_website,
    });

    // Create admin user for the school
    const userData = {
      email: validatedData.email,
      first_name: validatedData.first_name,
      last_name: validatedData.last_name,
      user_type: 'admin' as const,
      school_id: schoolId,
      phone: validatedData.phone,
    };

    const userId = await this.authRepository.createUser(userData, hashedPassword);

    // Get created user
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new Error('Failed to create admin user');
    }

    // Generate tokens
    const tokens = generateTokenPair(user);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    };
  }

  async login(credentials: LoginInput): Promise<LoginResponse> {
    // Validate input
    const validatedCredentials = loginSchema.parse(credentials);

    // Find user with password
    const user = await this.authRepository.findUserByEmail(validatedCredentials.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password - need to cast to include password_hash
    const userWithPassword = user as AuthUser & { password_hash: string };
    const isValidPassword = await bcrypt.compare(validatedCredentials.password, userWithPassword.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Update last login
    await this.authRepository.updateLastLogin(user.id);

    // Remove sensitive information for response
    const userResponse: AuthUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      user_type: user.user_type,
      role: user.role,
      school_id: user.school_id,
      school_name: user.school_name,
      phone: user.phone,
      date_of_birth: user.date_of_birth,
      student_id: user.student_id,
      employee_id: user.employee_id,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
      is_verified: user.is_verified,
      last_active_at: new Date(),
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return {
      message: 'Login successful',
      user: userResponse,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    };
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<AuthUser> {
    // Validate input
    const validatedData = updateProfileSchema.parse(data);

    // Convert date_of_birth string to Date if needed
    const profileData = {
      ...validatedData,
      date_of_birth: validatedData.date_of_birth 
        ? (typeof validatedData.date_of_birth === 'string' 
            ? new Date(validatedData.date_of_birth) 
            : validatedData.date_of_birth)
        : undefined
    };

    // Update user profile
    await this.authRepository.updateUserProfile(userId, profileData);

    // Return updated user
    const updatedUser = await this.authRepository.findUserById(userId);
    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  }

  async changePassword(userId: string, passwordData: ChangePasswordInput): Promise<void> {
    // Validate input
    const validatedData = changePasswordSchema.parse(passwordData);

    // Get user with current password
    const user = await this.authRepository.findUserByIdWithPassword(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      validatedData.current_password, 
      user.password_hash
    );
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(validatedData.new_password, saltRounds);

    // Update password
    await this.authRepository.updateUserPassword(userId, hashedNewPassword);
  }

  async refreshToken(tokenData: RefreshTokenInput): Promise<{ accessToken: string; refreshToken: string; expiresIn: string }> {
    // Validate input
    const validatedData = refreshTokenSchema.parse(tokenData);

    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(validatedData.refresh_token);
      
      // Get current user
      const user = await this.authRepository.findUserById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokens = generateTokenPair(user);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async forgotPassword(data: ForgotPasswordInput): Promise<void> {
    // Validate input
    const validatedData = forgotPasswordSchema.parse(data);

    // Find user
    const user = await this.authRepository.findUserByEmail(validatedData.email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return;
    }

    // Generate reset token (simplified - in production use crypto.randomBytes)
    const resetToken = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
    
    // Set token expiry (24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store reset token
    await this.authRepository.createPasswordResetToken(user.id, resetToken, expiresAt);

    // TODO: Send email with reset token
    // For now, just log it (in production, integrate with email service)
    console.log(`Password reset token for ${user.email}: ${resetToken}`);
  }

  async resetPassword(data: ResetPasswordInput): Promise<void> {
    // Validate input
    const validatedData = resetPasswordSchema.parse(data);

    // Find valid reset token
    const tokenRecord = await this.authRepository.findPasswordResetToken(validatedData.token);
    if (!tokenRecord) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(validatedData.new_password, saltRounds);

    // Update user password
    await this.authRepository.updateUserPassword(tokenRecord.user_id, hashedPassword);

    // Mark token as used
    await this.authRepository.markPasswordResetTokenAsUsed(tokenRecord.id);

    // Clean up expired tokens
    await this.authRepository.cleanupExpiredPasswordResetTokens();
  }

  async logout(userId: string): Promise<void> {
    // In a production app, you might want to:
    // 1. Invalidate the refresh token in database
    // 2. Add the access token to a blacklist (if using stateful tokens)
    // 3. Update last active time
    
    await this.authRepository.updateLastLogin(userId);
    
    // For JWT tokens, logout is typically handled client-side
    // by removing the tokens from storage
  }
} 