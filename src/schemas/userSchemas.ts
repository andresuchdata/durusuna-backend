import { z } from 'zod';

export const updateProfileSchema = z.object({
  first_name: z.string().min(1, 'First name cannot be empty').optional(),
  last_name: z.string().min(1, 'Last name cannot be empty').optional(),
  email: z.string().email('Invalid email format').optional()
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

export const searchUsersSchema = z.object({
  q: z.string().min(1, 'Search query is required').optional().default(''),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
  userType: z.enum(['all', 'teacher', 'student', 'parent']).optional()
});

export const getContactsSchema = z.object({
  page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
  search: z.string().optional(),
  userType: z.enum(['all', 'teacher', 'student', 'parent']).optional()
});

// Export types from schemas
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
export type GetContactsInput = z.infer<typeof getContactsSchema>;