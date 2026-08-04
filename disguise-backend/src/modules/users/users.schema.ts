import { z } from 'zod';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).max(255),
  role: z.enum(['admin', 'operator', 'investigator', 'super_admin']),
  password: z.string().regex(PASSWORD_REGEX, 'Password must be at least 8 characters with uppercase, lowercase, number and special character'),
});

export const updateUserSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  role: z.enum(['admin', 'operator', 'investigator', 'super_admin']).optional(),
  is_active: z.boolean().optional(),
  avatar_url: z.string().url().optional(),
});

export const resetPasswordSchema = z.object({
  new_password: z.string().regex(PASSWORD_REGEX, 'Password must be at least 8 characters with uppercase, lowercase, number and special character'),
});

export const listUsersQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'operator', 'investigator']).optional(),
  is_active: z.enum(['true', 'false']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
