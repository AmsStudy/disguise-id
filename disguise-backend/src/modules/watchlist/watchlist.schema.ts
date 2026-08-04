import { z } from 'zod';

export const createPersonSchema = z.object({
  full_name: z.string().min(2).max(255),
  alias: z.array(z.string()).optional().default([]),
  id_number: z.string().max(100).optional(),
  date_of_birth: z.string().optional(), // ISO date string
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  nationality: z.string().max(100).optional().default('Indonesia'),
  description: z.string().optional(),
  danger_level: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  case_reference: z.string().max(255).optional(),
});

export const updatePersonSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  alias: z.array(z.string()).optional(),
  id_number: z.string().max(100).optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  nationality: z.string().max(100).optional(),
  description: z.string().optional(),
  danger_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  case_reference: z.string().max(255).optional(),
  is_active: z.boolean().optional(),
});

export const listWatchlistQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  danger_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  is_active: z.enum(['true', 'false']).optional(),
  is_deleted: z.enum(['true', 'false']).optional(),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
export type ListWatchlistQuery = z.infer<typeof listWatchlistQuerySchema>;
