import { z } from 'zod';

export const promotionQueueQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  reviewedCandidateId: z.string().trim().optional(),
  reviewerId: z.string().uuid().optional(),
  reviewedFrom: z.string().datetime().optional(),
  reviewedTo: z.string().datetime().optional(),
  frameDecision: z.enum(['HIGH_PRIORITY_CANDIDATE', 'POSSIBLE_MATCH']).optional(),
  selectedBranch: z.string().optional(),
}).strict().refine((data) => {
  if (data.reviewedFrom && data.reviewedTo) {
    return new Date(data.reviewedFrom) <= new Date(data.reviewedTo);
  }
  return true;
}, {
  message: 'reviewedFrom must be less than or equal to reviewedTo',
  path: ['reviewedFrom'],
});

export const promotionsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  promotedCandidateId: z.string().trim().optional(),
  promotedById: z.string().uuid().optional(),
  promotedFrom: z.string().datetime().optional(),
  promotedTo: z.string().datetime().optional(),
}).strict().refine((data) => {
  if (data.promotedFrom && data.promotedTo) {
    return new Date(data.promotedFrom) <= new Date(data.promotedTo);
  }
  return true;
}, {
  message: 'promotedFrom must be less than or equal to promotedTo',
  path: ['promotedFrom'],
});

export const promoteReviewPayloadSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
}).strict();

export type PromotionQueueQuery = z.infer<typeof promotionQueueQuerySchema>;
export type PromotionsQuery = z.infer<typeof promotionsQuerySchema>;
export type PromoteReviewPayload = z.infer<typeof promoteReviewPayloadSchema>;
