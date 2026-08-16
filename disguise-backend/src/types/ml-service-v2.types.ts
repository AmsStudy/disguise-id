import { z } from 'zod';

export enum V2ErrorCode {
  V2_AUTH_ERROR = 'V2_AUTH_ERROR',
  V2_TIMEOUT = 'V2_TIMEOUT',
  V2_UNAVAILABLE = 'V2_UNAVAILABLE',
  V2_INVALID_RESPONSE = 'V2_INVALID_RESPONSE',
  V2_INTERNAL_ERROR = 'V2_INTERNAL_ERROR',
  V2_CONFIG_ERROR = 'V2_CONFIG_ERROR',
  ORG_GALLERY_NOT_LOADED = 'ORG_GALLERY_NOT_LOADED',
}

export class MLServiceV2Error extends Error {
  constructor(
    public readonly code: V2ErrorCode,
    message: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'MLServiceV2Error';
  }
}

// Zod schemas for runtime response validation
export const branchResultSchema = z.object({
  valid: z.boolean(),
  candidate_id: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  second_score: z.number().nullable().optional(),
  margin: z.number().nullable().optional(),
  detection_score: z.number().nullable().optional(),
  reconstruction_ms: z.number().nullable().optional(),
  server_embedding: z.array(z.number()).nullable().optional(),
  error: z.string().nullable().optional(),
});

export const v2InferenceResponseSchema = z.object({
  request_id: z.string(),
  organization_id: z.string(),
  camera_id: z.string(),
  camera_session_id: z.string(),
  track_id: z.string(),
  model_version: z.string(),
  gallery_version: z.string(),
  original: branchResultSchema,
  reconstructed: branchResultSchema,
  selected_branch: z.string().nullable().optional(),
  candidate_id: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  margin: z.number().nullable().optional(),
  frame_decision: z.string(),
  processing_ms: z.number(),
  requires_operator_verification: z.boolean(),
});

export type V2BranchResult = z.infer<typeof branchResultSchema>;
export type V2InferenceResponse = z.infer<typeof v2InferenceResponseSchema>;

export interface V2ShadowLogEntry {
  timestamp: string;
  jobId: string;
  cameraId: string;
  status: 'SUCCESS' | 'FAILED';
  latency_ms: number;
  modelVersion?: string;
  galleryVersion?: string;
  
  // Dual-branch fields
  original_valid?: boolean;
  original_score?: number | null;
  original_margin?: number | null;
  reconstructed_valid?: boolean;
  reconstructed_score?: number | null;
  reconstructed_margin?: number | null;
  
  // Final decision
  decision?: string;
  candidate_id?: string | null;
  selected_branch?: string | null;
  score?: number | null;
  margin?: number | null;
  
  // Parity metrics
  edge_norm?: number;
  server_norm?: number;
  cosine_similarity?: number;
  l2_distance?: number;
  mean_abs_diff?: number;
  max_abs_diff?: number;
  model_hash_mismatch?: boolean;

  // Error handling
  errorCode?: V2ErrorCode;
  reason?: string;
}

