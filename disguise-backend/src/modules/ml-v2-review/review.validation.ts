import { z } from 'zod';
import { MlV2ReviewDecision, MlV2ReviewStatus } from '@prisma/client';

export const reviewQueueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  frameDecision: z.enum(['HIGH_PRIORITY_CANDIDATE', 'POSSIBLE_MATCH']).optional(),
  candidateId: z.string().trim().optional(),
  selectedBranch: z.enum(['arcface', 'adaface']).optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  claimedState: z.enum(['UNCLAIMED', 'CLAIMED_BY_ME', 'CLAIMED_BY_OTHER']).optional(),
  reviewerId: z.string().uuid().optional(),
}).refine((data) => {
  if (data.createdFrom && data.createdTo) {
    return new Date(data.createdFrom) <= new Date(data.createdTo);
  }
  return true;
}, {
  message: 'createdFrom must not be after createdTo',
  path: ['createdFrom'],
});

export type ReviewQueueQuery = z.infer<typeof reviewQueueQuerySchema>;

export const reviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(MlV2ReviewStatus).optional(),
  decision: z.nativeEnum(MlV2ReviewDecision).optional(),
  reviewerId: z.string().uuid().optional(),
  reviewedCandidateId: z.string().trim().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
}).refine((data) => {
  if (data.createdFrom && data.createdTo) {
    return new Date(data.createdFrom) <= new Date(data.createdTo);
  }
  return true;
}, {
  message: 'createdFrom must not be after createdTo',
  path: ['createdFrom'],
});

export type ReviewsQuery = z.infer<typeof reviewsQuerySchema>;

const candidateIdSchema = z.string().trim().min(1).max(128);
const notesSchema = z.string().trim().min(3).max(2000);

export const completeReviewPayloadSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal(MlV2ReviewDecision.CONFIRMED),
    reviewedCandidateId: candidateIdSchema,
    notes: notesSchema.optional(),
  }),
  z.object({
    decision: z.literal(MlV2ReviewDecision.REJECTED),
    reviewedCandidateId: z.null().optional().refine(val => val === null || val === undefined, {
      message: 'reviewedCandidateId must be absent or null for REJECTED',
    }),
    notes: notesSchema,
  }),
  z.object({
    decision: z.literal(MlV2ReviewDecision.INCONCLUSIVE),
    reviewedCandidateId: z.null().optional().refine(val => val === null || val === undefined, {
      message: 'reviewedCandidateId must be absent or null for INCONCLUSIVE',
    }),
    notes: notesSchema,
  }),
]);

export type CompleteReviewPayload = z.infer<typeof completeReviewPayloadSchema>;
