import { z } from 'zod';

export const createReviewedAlertSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const getAlertCreationQueueSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  promotedCandidateId: z.string().optional(),
  promotedById: z.string().uuid().optional(),
  promotedFrom: z.string().datetime().optional(),
  promotedTo: z.string().datetime().optional(),
  originalFrameDecision: z.string().optional(),
  originalSelectedBranch: z.string().optional(),
  cameraSessionId: z.string().optional(),
  trackId: z.string().optional()
}).refine(data => {
  if (data.promotedFrom && data.promotedTo) {
    return new Date(data.promotedFrom) <= new Date(data.promotedTo);
  }
  return true;
}, {
  message: 'promotedFrom must be on or before promotedTo',
  path: ['promotedFrom']
});

export const getReviewedAlertsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  createdById: z.string().uuid().optional(),
  promotedCandidateId: z.string().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional()
}).refine(data => {
  if (data.createdFrom && data.createdTo) {
    return new Date(data.createdFrom) <= new Date(data.createdTo);
  }
  return true;
}, {
  message: 'createdFrom must be on or before createdTo',
  path: ['createdFrom']
});
