export interface AlertCreationQueueQuery {
  page?: number;
  pageSize?: number;
  promotedCandidateId?: string;
  promotedById?: string;
  promotedFrom?: string;
  promotedTo?: string;
  originalFrameDecision?: string;
  originalSelectedBranch?: string;
  cameraSessionId?: string;
  trackId?: string;
}

export interface ReviewedAlertsQuery {
  page?: number;
  pageSize?: number;
  createdById?: string;
  promotedCandidateId?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface CreateReviewedAlertPayload {
  notes?: string;
}

export interface MlV2AlertCreationQueueItem {
  id: string; // Promotion ID
  organizationId: string;
  reviewId: string;
  promotedCandidateId: string;
  promotedById: string;
  promotedAt: string;
  review?: {
    inferenceResult?: {
      frameDecision: string;
      selectedBranch?: string | null;
      score: number | null;
      margin: number | null;
      cameraSessionId: string;
      trackId: string;
      detectionEventId: string;
    };
  };
}

export interface MlV2ReviewedAlert {
  id: string; // Reviewed Alert ID
  promotionId: string;
  organizationId: string;
  detectionEventId: string;
  createdById: string;
  promotedCandidateId: string;
  title: string;
  notes?: string | null;
  createdAt: string;
  promotion?: {
    promotedAt: string;
    promotedById: string;
  };
}

export interface ReviewedAlertDetailResponse extends MlV2ReviewedAlert {
  promotion?: {
    id: string;
    promotedAt: string;
    promotedById: string;
    reviewId: string;
  };
  detectionEvent?: {
    id: string;
    bestMatchId?: string | null;
    createdAt: string;
  };
}
