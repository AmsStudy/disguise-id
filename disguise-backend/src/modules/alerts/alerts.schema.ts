import { z } from 'zod';

export const updateAlertSchema = z.object({
  status: z.enum(['confirmed', 'dismissed', 'false_positive']).optional(),
  review_notes: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
});

export const assignAlertSchema = z.object({
  assigned_to: z.string().uuid('Must be a valid user UUID'),
});

export const listAlertsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'dismissed', 'false_positive']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  source_id: z.string().uuid().optional(),
  person_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
export type AssignAlertInput = z.infer<typeof assignAlertSchema>;
export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;
