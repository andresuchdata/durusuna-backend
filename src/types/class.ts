export interface Class {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  grade_level?: string;
  section?: string;
  academic_year: string;
  settings?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface ClassWithDetails extends Class {
  student_count?: number;
  teacher_count?: number;
  teachers?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    role_in_class?: string;
  }>;
  students?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    student_id?: string;
    role_in_class?: string;
  }>;
}

export interface ClassWithSchool extends Class {
  school: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export interface CreateClassRequest {
  name: string;
  description?: string;
  grade_level?: string;
  section?: string;
  academic_year: string;
  school_id: string;
  settings?: Record<string, any>;
}

export interface UpdateClassRequest {
  name?: string;
  description?: string;
  grade_level?: string;
  section?: string;
  academic_year?: string;
  settings?: Record<string, any>;
  is_active?: boolean;
}

export interface ClassQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  grade_level?: string;
  academic_year?: string;
  is_active?: boolean;
  school_id?: string;
}

export interface ClassesResponse {
  classes: Class[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ClassResponse {
  class: ClassWithDetails;
}

export interface UserClass {
  id: string;
  user_id: string;
  class_id: string;
  role_in_class: 'student' | 'teacher' | 'assistant';
  enrolled_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface UserClassWithUser extends UserClass {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    user_type: 'student' | 'teacher' | 'parent' | 'admin';
    student_id?: string;
    employee_id?: string;
  };
}

export interface UserClassWithClass extends UserClass {
  class: Class;
}

export interface AddUserToClassRequest {
  user_id: string;
  role_in_class: 'student' | 'teacher' | 'assistant';
}

export interface UpdateUserClassRequest {
  role_in_class?: 'student' | 'teacher' | 'assistant';
  is_active?: boolean;
}

export interface ClassMembersResponse {
  members: UserClassWithUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ClassStudentsResponse {
  students: UserClassWithUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ClassTeachersResponse {
  teachers: UserClassWithUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
} 