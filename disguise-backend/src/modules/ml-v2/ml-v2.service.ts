import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { MlV2ListQuery } from './ml-v2.validation';

export class MlV2Service {
  /**
   * Get a paginated list of ML V2 telemetry items
   */
  async getTelemetryList(orgId: string, query: MlV2ListQuery) {
    const {
      page,
      pageSize,
      createdFrom,
      createdTo,
      status,
      errorCode,
      frameDecision,
      selectedBranch,
      candidateId,
      cameraSessionId,
      trackId,
      modelVersion,
      galleryVersion,
      requiresOperatorVerification,
    } = query;

    const where: Prisma.MlV2InferenceResultWhereInput = {
      detectionEvent: {
        organizationId: orgId,
      },
    };

    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) (where.createdAt as any).gte = new Date(createdFrom);
      if (createdTo) (where.createdAt as any).lte = new Date(createdTo);
    }

    if (status) {
      where.status = status;
    }
    if (errorCode) {
      where.errorCode = errorCode;
    }
    if (frameDecision) {
      where.frameDecision = frameDecision;
    }
    if (selectedBranch) {
      if (selectedBranch === 'NONE') {
        where.selectedBranch = null;
      } else {
        where.selectedBranch = selectedBranch;
      }
    }
    if (candidateId) {
      where.candidateId = candidateId;
    }
    if (cameraSessionId) {
      where.cameraSessionId = cameraSessionId;
    }
    if (trackId) {
      where.trackId = trackId;
    }
    if (modelVersion) {
      where.modelVersion = modelVersion;
    }
    if (galleryVersion) {
      where.galleryVersion = galleryVersion;
    }
    if (requiresOperatorVerification !== undefined) {
      where.requiresOperatorVerification = requiresOperatorVerification;
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await prisma.$transaction([
      prisma.mlV2InferenceResult.findMany({
        where,
        include: {
          detectionEvent: {
            select: {
              id: true,
              sourceId: true,
              detectedAt: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' }, // Tie-breaker
        ],
        skip,
        take: pageSize,
      }),
      prisma.mlV2InferenceResult.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get telemetry statistics for the organization
   */
  async getTelemetryStats(orgId: string, query: MlV2ListQuery) {
    const {
      createdFrom,
      createdTo,
      cameraSessionId,
    } = query;

    const where: Prisma.MlV2InferenceResultWhereInput = {
      detectionEvent: {
        organizationId: orgId,
      },
    };

    if (cameraSessionId) {
      where.cameraSessionId = cameraSessionId;
    }

    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) (where.createdAt as any).gte = new Date(createdFrom);
      if (createdTo) (where.createdAt as any).lte = new Date(createdTo);
    }

    const [
      totalCount,
      successCount,
      failedCount,
      highPriorityCount,
      possibleCount,
      unknownCount,
    ] = await prisma.$transaction([
      prisma.mlV2InferenceResult.count({ where }),
      prisma.mlV2InferenceResult.count({ where: { ...where, status: 'SUCCESS' } }),
      prisma.mlV2InferenceResult.count({ where: { ...where, status: 'FAILED' } }),
      prisma.mlV2InferenceResult.count({ where: { ...where, frameDecision: 'HIGH_PRIORITY_CANDIDATE' } }),
      prisma.mlV2InferenceResult.count({ where: { ...where, frameDecision: 'POSSIBLE_MATCH' } }),
      prisma.mlV2InferenceResult.count({ where: { ...where, frameDecision: 'UNKNOWN' } }),
    ]);

    return {
      total: totalCount,
      byStatus: {
        SUCCESS: successCount,
        FAILED: failedCount,
      },
      byFrameDecision: {
        HIGH_PRIORITY_CANDIDATE: highPriorityCount,
        POSSIBLE_MATCH: possibleCount,
        UNKNOWN: unknownCount,
      }
    };
  }

  /**
   * Get a specific MlV2InferenceResult by DetectionEvent ID
   */
  async getByDetectionEventId(orgId: string, detectionEventId: string) {
    const event = await prisma.detectionEvent.findUnique({
      where: { id: detectionEventId },
      select: { organizationId: true },
    });

    if (!event || event.organizationId !== orgId) {
      return { error: 'NOT_FOUND', message: 'Detection event not found or inaccessible' };
    }

    const telemetry = await prisma.mlV2InferenceResult.findUnique({
      where: { detectionEventId },
    });

    if (!telemetry) {
      return { data: null };
    }

    return { data: telemetry };
  }

  /**
   * Get a specific MlV2InferenceResult by its own ID
   */
  async getById(orgId: string, id: string) {
    const telemetry = await prisma.mlV2InferenceResult.findUnique({
      where: { id },
      include: {
        detectionEvent: {
          select: { organizationId: true }
        }
      }
    });

    if (!telemetry || telemetry.detectionEvent.organizationId !== orgId) {
      return { error: 'NOT_FOUND', message: 'Inference result not found or inaccessible' };
    }

    const { detectionEvent, ...result } = telemetry;
    return { data: result };
  }
}

export const mlV2Service = new MlV2Service();
