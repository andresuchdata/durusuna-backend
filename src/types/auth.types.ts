import { User } from './user';

export interface AuthUser extends Omit<User, 'password_hash' | 'created_at' | 'updated_at' | 'last_login_at'> {
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
  school_name?: string | null;
  last_active_at: string;
}

export interface RegisterUserData {
  email: string;
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

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: Date;
  avatar_url?: string;
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
  user_type: 'student' | 'teacher' | 'parent' | 'admin';
  role: 'user' | 'admin';
  school_id: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}
