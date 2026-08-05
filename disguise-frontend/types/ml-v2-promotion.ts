export interface PromotionQueueQuery {
  page?: number;
  pageSize?: number;
  reviewedCandidateId?: string;
  reviewerId?: string;
  reviewedFrom?: string;
  reviewedTo?: string;
  frameDecision?: string;
  selectedBranch?: string;
}

export interface PromotionsQuery {
  page?: number;
  pageSize?: number;
  promotedCandidateId?: string;
  promotedById?: string;
  promotedFrom?: string;
  promotedTo?: string;
}

export interface PromoteReviewPayload {
  notes?: string;
}

export interface MlV2PromotionQueueItem {
  id: string; // Review ID
  organizationId: string;
  reviewerId: string;
  reviewedCandidateId: string;
  status: string;
  decision: string;
  reviewedAt: string;
  inferenceResult: {
    frameDecision: string;
    selectedBranch?: string | null;
    score: number | null;
    margin: number | null;
  };
}

export interface MlV2ReviewedPromotion {
  id: string; // Promotion ID
  organizationId: string;
  reviewId: string;
  promotedCandidateId: string;
  promotedById: string;
  notes?: string | null;
  promotedAt: string;
  review?: {
    reviewerId: string;
    reviewedAt: string;
  };
}

export interface PromotionDetailResponse extends MlV2ReviewedPromotion {
  review?: {
    id: string;
    reviewerId: string;
    reviewedAt: string;
    reviewedCandidateId: string;
    status: string;
    decision: string;
  };
}
