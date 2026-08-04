import prisma from '../config/database';
import { V2InferenceResponse, MLServiceV2Error } from '../types/ml-service-v2.types';
import { logger } from '../config/logger';

interface PersistenceMetadata {
  detectionEventId: string;
  jobId?: string;
  cameraSessionId?: string;
  trackId?: string;
  roundTripLatencyMs?: number;
}

export class MlServiceV2Persistence {
  static requiresOperatorVerificationForDecision(status: string, frameDecision?: string | null): boolean {
    if (status !== 'SUCCESS') {
      return false;
    }
    if (frameDecision === 'HIGH_PRIORITY_CANDIDATE' || frameDecision === 'POSSIBLE_CANDIDATE') {
      return true;
    }
    return false;
  }

  static async upsertV2Telemetry(
    metadata: PersistenceMetadata,
    result: V2InferenceResponse | Error,
    failJob: boolean = false
  ): Promise<void> {
    try {
      const data: any = {
        jobId: metadata.jobId,
        cameraSessionId: metadata.cameraSessionId,
        trackId: metadata.trackId,
        roundTripLatencyMs: metadata.roundTripLatencyMs,
      };

      if (result instanceof Error) {
        data.status = 'FAILED';
        data.errorCode = result instanceof MLServiceV2Error ? result.code : 'V2_INTERNAL_ERROR';
      } else {
        data.status = 'SUCCESS';
        data.requestId = result.request_id;
        data.modelVersion = result.model_version;
        data.galleryVersion = result.gallery_version;

        // Original Branch
        data.originalValid = result.original.valid;
        data.originalCandidateId = result.original.candidate_id ?? null;
        data.originalScore = result.original.score ?? null;
        data.originalSecondScore = result.original.second_score ?? null;
        data.originalMargin = result.original.margin ?? null;

        // Reconstructed Branch
        data.reconstructedValid = result.reconstructed.valid;
        data.reconstructedCandidateId = result.reconstructed.candidate_id ?? null;
        data.reconstructedScore = result.reconstructed.score ?? null;
        data.reconstructedSecondScore = result.reconstructed.second_score ?? null;
        data.reconstructedMargin = result.reconstructed.margin ?? null;

        // Decision
        data.selectedBranch = result.selected_branch ?? null;
        data.candidateId = result.candidate_id ?? null;
        data.score = result.score ?? null;
        data.margin = result.margin ?? null;
        data.frameDecision = result.frame_decision;

        data.serviceProcessingMs = result.processing_ms;
      }
      data.requiresOperatorVerification = MlServiceV2Persistence.requiresOperatorVerificationForDecision(
        data.status,
        data.frameDecision
      );

      await prisma.mlV2InferenceResult.upsert({
        where: { detectionEventId: metadata.detectionEventId },
        update: data,
        create: {
          detectionEventId: metadata.detectionEventId,
          ...data,
        },
      });

    } catch (error) {
      logger.error('Failed to persist ML Service V2 telemetry:', error);
      if (failJob) {
        throw error;
      }
    }
  }
}
