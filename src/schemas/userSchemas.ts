import { z } from 'zod';

const userTypeEnum = z.enum(['teacher', 'student', 'parent']);
const roleEnum = z.enum(['admin', 'user']);

const optionalDateInput = z
  .union([z.string(), z.date()])
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  });

export const updateProfileSchema = z
  .object({
    first_name: z.string().min(1, 'First name cannot be empty').optional(),
    last_name: z.string().min(1, 'Last name cannot be empty').optional(),
    email: z.string().email('Invalid email format').optional(),
    phone: z.string().optional(),
    avatar_url: z.string().url('Invalid avatar URL format').optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field must be provided for update',
      path: ['root'],
    },
  );

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
});

export const searchUsersSchema = z.object({
  q: z.string().min(1, 'Search query is required').optional().default(''),
  limit: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().min(1).max(100))
    .optional(),
  userType: z.enum(['all', 'teacher', 'student', 'parent']).optional(),
});

export const getContactsSchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().min(1))
    .optional(),
  limit: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().min(1).max(100))
    .optional(),
  search: z.string().optional(),
  userType: z.enum(['all', 'teacher', 'student', 'parent']).optional(),
});

export const createUserSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().transform((value) => value.toLowerCase()),
  user_type: userTypeEnum,
  role: roleEnum.optional(),
  phone: z.string().max(20).optional(),
  avatar_url: z.string().url().optional(),
  password: z.string().min(8),
  date_of_birth: optionalDateInput,
  student_id: z.string().max(50).optional(),
  employee_id: z.string().max(50).optional(),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial()
  .extend({
    password: z.string().min(8).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
    path: ['root'],
  });

export const batchCreateUsersSchema = z
  .object({
    users: z.array(createUserSchema).min(1).max(100),
  })
  .refine((data) => data.users.length > 0, {
    message: 'At least one user is required',
    path: ['users'],
  });

export const listUsersQuerySchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().min(1))
    .optional(),
  limit: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .pipe(z.number().min(1).max(100))
    .optional(),
  search: z.string().optional(),
  userType: z.enum(['teacher', 'student', 'parent', 'admin', 'all']).optional(),
  isActive: z
    .union([z.string(), z.boolean()])
    .transform((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    })
    .optional(),
  dobFrom: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (val instanceof Date) return val;
      const parsed = new Date(val);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }),
  dobTo: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (val instanceof Date) return val;
      const parsed = new Date(val);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }),
});

// Export types from schemas
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
export type GetContactsInput = z.infer<typeof getContactsSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type BatchCreateUsersInput = z.infer<typeof batchCreateUsersSchema>;
export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;