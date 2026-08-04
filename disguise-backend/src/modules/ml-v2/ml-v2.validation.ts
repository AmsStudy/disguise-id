import { z } from 'zod';

export const mlV2ListQuerySchema = z.object({
  page: z.preprocess((a) => (a === undefined ? 1 : parseInt(String(a), 10)), z.number().int().min(1).default(1)),
  pageSize: z.preprocess((a) => (a === undefined ? 20 : parseInt(String(a), 10)), z.number().int().min(1).max(100).default(20)),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['HIGH_PRIORITY_CANDIDATE', 'POSSIBLE_CANDIDATE', 'UNKNOWN', 'FAILED']).optional(),
  frameDecision: z.enum(['FACE_DETECTED', 'NO_FACE_DETECTED']).optional(),
  cameraId: z.string().uuid().optional(),
  minConfidence: z.preprocess((a) => (a === undefined ? undefined : parseFloat(String(a))), z.number().min(0).max(1).optional()),
  maxConfidence: z.preprocess((a) => (a === undefined ? undefined : parseFloat(String(a))), z.number().min(0).max(1).optional()),
  hasNearestCandidate: z.preprocess((a) => (a === undefined ? undefined : String(a) === 'true'), z.boolean().optional()),
  hasWatchlistHit: z.preprocess((a) => (a === undefined ? undefined : String(a) === 'true'), z.boolean().optional()),
  requiresOperatorVerification: z.preprocess((a) => (a === undefined ? undefined : String(a) === 'true'), z.boolean().optional()),
});

export type MlV2ListQuery = z.infer<typeof mlV2ListQuerySchema>;
