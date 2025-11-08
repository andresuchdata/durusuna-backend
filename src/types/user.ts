export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'teacher' | 'student' | 'parent' | 'admin';
  role: 'admin' | 'user';
  school_id: string | null;
  phone?: string;
  avatar_url?: string;
  password_hash?: string;
  date_of_birth?: Date;
  student_id?: string | null;
  employee_id?: string | null;
  is_active?: boolean;
  created_at: Date;
  updated_at?: Date;
  last_login_at?: Date | null;
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
  role: 'admin' | 'user';
  user_type: 'teacher' | 'student' | 'parent' | 'admin';
  school_id: string | null;
} 

export interface CreateUserData {
  first_name: string;
  last_name: string;
  email: string;
  user_type: 'teacher' | 'student' | 'parent' | 'admin';
  role?: 'admin' | 'user';
  phone?: string;
  avatar_url?: string;
  password: string;
  date_of_birth?: Date;
  student_id?: string;
  employee_id?: string;
}

export interface UpdateUserData extends Partial<Omit<CreateUserData, 'password'>> {
  password?: string;
  is_active?: boolean;
}

export interface ListUsersParams {
  schoolId: string;
  page?: number;
  limit?: number;
  search?: string;
  userType?: 'teacher' | 'student' | 'parent' | 'admin' | 'all';
  isActive?: boolean;
  dobFrom?: Date;
  dobTo?: Date;
}

export interface ListUsersResult {
  users: Omit<User, 'password'>[];
  total: number;
  page: number;
  limit: number;
}