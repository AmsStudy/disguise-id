export type MlV2Status = 'SUCCESS' | 'FAILED';
export type MlV2FrameDecision = 'HIGH_PRIORITY_CANDIDATE' | 'POSSIBLE_MATCH' | 'UNKNOWN';
export type MlV2SelectedBranch = 'ORIGINAL' | 'RECONSTRUCTED' | 'NONE';

export interface MlV2InferenceResult {
  id: string;
  detectionEventId: string;
  jobId: string | null;
  requestId: string | null;
  cameraSessionId: string | null;
  trackId: string | null;

  status: MlV2Status;
  errorCode: string | null;

  modelVersion: string | null;
  galleryVersion: string | null;

  originalValid: boolean | null;
  originalCandidateId: string | null;
  originalScore: number | null;
  originalSecondScore: number | null;
  originalMargin: number | null;

  reconstructedValid: boolean | null;
  reconstructedCandidateId: string | null;
  reconstructedScore: number | null;
  reconstructedSecondScore: number | null;
  reconstructedMargin: number | null;

  selectedBranch: MlV2SelectedBranch | null;
  candidateId: string | null;
  score: number | null;
  margin: number | null;
  frameDecision: MlV2FrameDecision | null;

  serviceProcessingMs: number | null;
  roundTripLatencyMs: number | null;
  requiresOperatorVerification: boolean;

  createdAt: string;

  detectionEvent?: {
    id: string;
    sourceId: string;
    detectedAt: string;
  };
}

export interface MlV2Stats {
  total: number;
  byStatus: Record<MlV2Status, number>;
  byFrameDecision: Record<MlV2FrameDecision, number>;
}

export interface MlV2ListQuery {
  page?: number;
  pageSize?: number;
  createdFrom?: string;
  createdTo?: string;
  status?: MlV2Status;
  errorCode?: string;
  frameDecision?: MlV2FrameDecision;
  selectedBranch?: MlV2SelectedBranch;
  candidateId?: string;
  cameraSessionId?: string;
  trackId?: string;
  modelVersion?: string;
  galleryVersion?: string;
  requiresOperatorVerification?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginatedResponse<T>['meta'];
}
