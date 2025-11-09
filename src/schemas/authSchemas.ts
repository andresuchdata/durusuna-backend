import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  user_type: z.enum(['student', 'teacher', 'parent', 'admin'], {
    message: 'User type must be student, teacher, parent, or admin'
  }),
  school_id: z.string().uuid('Invalid school ID format'),
  phone: z.string().optional(),
  date_of_birth: z.string().datetime().optional().or(z.date().optional()),
  student_id: z.string().optional(),
  employee_id: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

export const updateProfileSchema = z.object({
  first_name: z.string().min(1, 'First name cannot be empty').trim().optional(),
  last_name: z.string().min(1, 'Last name cannot be empty').trim().optional(),
  phone: z.string().optional(),
  date_of_birth: z.string().datetime().optional().or(z.date().optional()),
  avatar_url: z.string().url('Invalid avatar URL').optional()
}).refine(
  data => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update',
    path: ['root']
  }
);

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters')
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters')
});

export const registerAdminSchema = z.object({
  // School information
  school_name: z.string().min(1, 'School name is required').trim(),
  school_address: z.string().min(1, 'School address is required').trim(),
  school_phone: z.string().optional(),
  school_email: z.string().email('Invalid school email format').optional(),
  school_website: z.string().url('Invalid website URL').optional(),
  
  // Admin user information
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional()
});

// Export types from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RegisterAdminInput = z.infer<typeof registerAdminSchema>; 