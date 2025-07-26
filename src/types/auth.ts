export interface RegisterUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_type: 'student' | 'teacher' | 'parent' | 'admin';
  school_id: string;
  phone?: string;
  date_of_birth?: Date;
  student_id?: string;
  employee_id?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  role: string;
  school_id: string;
  school_name?: string;
  phone?: string;
  date_of_birth?: Date;
  student_id?: string;
  employee_id?: string;
  avatar_url?: string;
  is_active: boolean;
  is_verified: boolean;
  last_active_at?: Date;
  last_login_at?: Date;
  created_at: Date;
  updated_at?: Date;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: Date;
  avatar_url?: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export interface RefreshTokenData {
  refresh_token: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  new_password: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  user_type: string;
  role: string;
  school_id: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    user_type: string;
    role: string;
    school_id: string;
  };
} 