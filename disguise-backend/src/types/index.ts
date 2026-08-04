export type UserRole = 'super_admin' | 'admin' | 'operator' | 'investigator';

export type AlertStatus = 'pending' | 'confirmed' | 'dismissed' | 'false_positive';

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

export type DangerLevel = 'low' | 'medium' | 'high' | 'critical';

export type CameraStatus = 'online' | 'offline' | 'error';

export type CaseStatus = 'open' | 'investigating' | 'closed' | 'archived';

export type OrgPlan = 'basic' | 'pro' | 'enterprise';

// ─── JWT Payload ────────────────────────────────────────────
export interface JwtPayload {
  sub: string;       // user id
  email: string;
  role: UserRole;
  orgId: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;       // user id
  tokenId: string;   // for blacklisting
  iat?: number;
  exp?: number;
}

// ─── Request Extension ───────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      cameraId?: string;
      orgId?: string;
    }
  }
}

// ─── API Response Types ──────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ─── Pagination Query ─────────────────────────────────────────
export interface PaginationQuery {
  page: number;
  limit: number;
}

// ─── BullMQ Job Data ─────────────────────────────────────────
export interface InferenceJobData {
  jobId: string;
  frameKey: string;       // MinIO object key
  frameUrl: string;
  cameraId: string;
  orgId: string;
  threshold: number;
  modelVersion: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
