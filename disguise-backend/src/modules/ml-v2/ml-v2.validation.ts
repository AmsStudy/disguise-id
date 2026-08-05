import { z } from 'zod';

export const mlV2ListQuerySchema = z.object({
  page: z.preprocess((a) => (a === undefined ? 1 : parseInt(String(a), 10)), z.number().int().min(1).default(1)),
  pageSize: z.preprocess((a) => (a === undefined ? 20 : parseInt(String(a), 10)), z.number().int().min(1).max(100).default(20)),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  status: z.enum(['SUCCESS', 'FAILED']).optional(),
  errorCode: z.string().optional(),
  frameDecision: z.enum(['HIGH_PRIORITY_CANDIDATE', 'POSSIBLE_MATCH', 'UNKNOWN']).optional(),
  selectedBranch: z.enum(['ORIGINAL', 'RECONSTRUCTED', 'NONE']).optional(),
  candidateId: z.string().optional(),
  cameraSessionId: z.string().optional(),
  trackId: z.string().optional(),
  modelVersion: z.string().optional(),
  galleryVersion: z.string().optional(),
  requiresOperatorVerification: z.preprocess((a) => (a === undefined ? undefined : String(a) === 'true'), z.boolean().optional()),
});

export type MlV2ListQuery = z.infer<typeof mlV2ListQuerySchema>;
