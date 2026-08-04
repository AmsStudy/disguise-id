import { z } from 'zod';

export const createCaseSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  lead_investigator_id: z.string().uuid().optional(),
});

export const updateCaseSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  lead_investigator_id: z.string().uuid().optional(),
});

export const updateCaseStatusSchema = z.object({
  status: z.enum(['open', 'investigating', 'closed', 'archived']),
  reason: z.string().optional(),
});

export const addAlertsToCaseSchema = z.object({
  alert_ids: z.array(z.string().uuid()).min(1, 'At least one alert ID required'),
});

export const addCaseNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
});

export const listCasesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['open', 'investigating', 'closed', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  search: z.string().optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type UpdateCaseStatusInput = z.infer<typeof updateCaseStatusSchema>;
export type AddAlertsToCaseInput = z.infer<typeof addAlertsToCaseSchema>;
export type AddCaseNoteInput = z.infer<typeof addCaseNoteSchema>;
export type ListCasesQuery = z.infer<typeof listCasesQuerySchema>;
