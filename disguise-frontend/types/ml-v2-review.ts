import { PaginatedResponse } from './ml-v2';

export type MlV2ReviewStatus = 'PENDING' | 'COMPLETED';
export type MlV2ReviewDecision = 'CONFIRMED' | 'REJECTED' | 'INCONCLUSIVE';
export type ClaimedState = 'UNCLAIMED' | 'CLAIMED_BY_ME' | 'CLAIMED_BY_OTHER';

export interface MlV2OperatorReview {
  id: string;
  inferenceResultId: string;
  organizationId: string;
  reviewerId: string;
  status: MlV2ReviewStatus;
  decision?: MlV2ReviewDecision;
  notes?: string;
  reviewedCandidateId?: string;
  claimedAt: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MlV2ReviewQueueItem {
  id: string;
  detectionEventId: string;
  status: string;
  frameDecision: string;
  selectedBranch: string;
  candidateId?: string;
  score?: number;
  margin?: number;
  requiresOperatorVerification: boolean;
  createdAt: string;
  claimedState: ClaimedState;
  reviewSummary?: {
    id: string;
    status: MlV2ReviewStatus;
    reviewerId: string;
    claimedAt: string;
  };
  detectionEvent: {
    id: string;
    sourceId: string;
    detectedAt: string;
  };
}

export interface MlV2ReviewHistoryItem extends MlV2OperatorReview {
  inferenceResult: {
    id: string;
    candidateId: string | null;
    score: number | null;
    margin: number | null;
    frameDecision: string;
  };
}

export interface ReviewQueueQuery {
  page?: number;
  pageSize?: number;
  frameDecision?: string;
  candidateId?: string;
  selectedBranch?: string;
  createdFrom?: string;
  createdTo?: string;
  claimedState?: string;
  reviewerId?: string;
}

export interface ReviewsQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  decision?: string;
  reviewerId?: string;
  reviewedCandidateId?: string;
  createdFrom?: string;
  createdTo?: string;
}

export type CompleteReviewPayload = 
  | { decision: 'CONFIRMED'; reviewedCandidateId: string; notes?: string }
  | { decision: 'REJECTED'; notes: string }
  | { decision: 'INCONCLUSIVE'; notes: string };

export interface ReviewDetailResponse extends MlV2OperatorReview {
  inferenceResult: {
    id: string;
    candidateId: string | null;
    score: number | null;
    margin: number | null;
    frameDecision: string;
  };
}
