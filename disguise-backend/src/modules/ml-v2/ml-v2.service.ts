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
      startDate,
      endDate,
      status,
      frameDecision,
      cameraId,
      minConfidence,
      maxConfidence,
      hasNearestCandidate,
      hasWatchlistHit,
      requiresOperatorVerification,
    } = query;

    const where: Prisma.MlV2InferenceResultWhereInput = {
      detectionEvent: {
        organizationId: orgId,
      },
    };

    if (cameraId) {
      where.detectionEvent = {
        ...where.detectionEvent,
        sourceId: cameraId,
      } as Prisma.DetectionEventWhereInput;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as any).gte = new Date(startDate);
      if (endDate) (where.createdAt as any).lte = new Date(endDate);
    }

    if (status) {
      where.status = status;
    }

    if (frameDecision) {
      where.frameDecision = frameDecision;
    }

    if (minConfidence !== undefined || maxConfidence !== undefined) {
      where.score = {};
      if (minConfidence !== undefined) (where.score as any).gte = minConfidence;
      if (maxConfidence !== undefined) (where.score as any).lte = maxConfidence;
    }

    if (hasNearestCandidate !== undefined) {
      if (hasNearestCandidate) {
        where.candidateId = { not: null };
      } else {
        where.candidateId = null;
      }
    }

    if (hasWatchlistHit !== undefined) {
      if (hasWatchlistHit) {
        where.status = { in: ['HIGH_PRIORITY_CANDIDATE', 'POSSIBLE_CANDIDATE'] };
      } else {
        where.status = { notIn: ['HIGH_PRIORITY_CANDIDATE', 'POSSIBLE_CANDIDATE'] };
      }
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
      startDate,
      endDate,
      cameraId,
    } = query;

    const where: Prisma.MlV2InferenceResultWhereInput = {
      detectionEvent: {
        organizationId: orgId,
      },
    };

    if (cameraId) {
      where.detectionEvent = {
        ...where.detectionEvent,
        sourceId: cameraId,
      } as Prisma.DetectionEventWhereInput;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as any).gte = new Date(startDate);
      if (endDate) (where.createdAt as any).lte = new Date(endDate);
    }

    const [
      totalCount,
      highPriorityCount,
      possibleCount,
      unknownCount,
      failedCount,
    ] = await prisma.$transaction([
      prisma.mlV2InferenceResult.count({ where }),
      prisma.mlV2InferenceResult.count({ where: { ...where, status: 'HIGH_PRIORITY_CANDIDATE' } }),
      prisma.mlV2InferenceResult.count({ where: { ...where, status: 'POSSIBLE_CANDIDATE' } }),
      prisma.mlV2InferenceResult.count({ where: { ...where, status: 'UNKNOWN' } }),
      prisma.mlV2InferenceResult.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    return {
      total: totalCount,
      byStatus: {
        HIGH_PRIORITY_CANDIDATE: highPriorityCount,
        POSSIBLE_CANDIDATE: possibleCount,
        UNKNOWN: unknownCount,
        FAILED: failedCount,
      }
    };
  }

  /**
   * Get a specific MlV2InferenceResult by DetectionEvent ID
   */
  async getByDetectionEventId(orgId: string, detectionEventId: string) {
    // Ensure the detection event belongs to the organization
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
      return { data: null }; // Detection event exists, but no V2 telemetry yet
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

    // Omit the detectionEvent relation from the return to match typical DTO, or keep it if needed.
    // We'll just return the telemetry object.
    const { detectionEvent, ...result } = telemetry;
    return { data: result };
  }
}

export const mlV2Service = new MlV2Service();
