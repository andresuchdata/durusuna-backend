export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  role: string;
  school_id: string | null;
  phone?: string;
  avatar_url?: string;
  password?: string;
  is_active?: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface School {
  id: string;
  name: string;
  address: string;
}

export interface UserWithSchool extends Omit<User, 'password'> {
  school?: School;
}

export interface UpdateUserProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export interface SearchUsersParams {
  q: string;
  limit?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  school_id: string;
} 