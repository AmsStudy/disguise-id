import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { z } from 'zod';

export type AlertCreationQueueQuery = {
  page: number;
  pageSize: number;
  promotedCandidateId?: string;
  promotedById?: string;
  promotedFrom?: string;
  promotedTo?: string;
  originalFrameDecision?: string;
  originalSelectedBranch?: string;
  cameraSessionId?: string;
  trackId?: string;
};

export type ReviewedAlertsQuery = {
  page: number;
  pageSize: number;
  createdById?: string;
  promotedCandidateId?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type CreateReviewedAlertPayload = {
  notes?: string;
};

export class MlV2ReviewedAlertService {
  /**
   * Retrieves the queue of promotions eligible for alert creation.
   */
  async getAlertCreationQueue(orgId: string, query: AlertCreationQueueQuery) {
    const {
      page,
      pageSize,
      promotedCandidateId,
      promotedById,
      promotedFrom,
      promotedTo,
      originalFrameDecision,
      originalSelectedBranch,
      cameraSessionId,
      trackId
    } = query;

    const where: Prisma.MlV2ReviewedPromotionWhereInput = {
      organizationId: orgId,
      reviewedAlert: null, // Only those without an alert
      review: {
        status: 'COMPLETED',
        decision: 'CONFIRMED',
      }
    };

    if (promotedCandidateId) where.promotedCandidateId = promotedCandidateId;
    if (promotedById) where.promotedById = promotedById;
    if (promotedFrom || promotedTo) {
      where.promotedAt = {};
      if (promotedFrom) (where.promotedAt as any).gte = new Date(promotedFrom);
      if (promotedTo) (where.promotedAt as any).lte = new Date(promotedTo);
    }

    // Inference Result Filters via Review relation
    if (originalFrameDecision || originalSelectedBranch || cameraSessionId || trackId) {
      where.review!.inferenceResult = {};
      if (originalFrameDecision) where.review!.inferenceResult.frameDecision = originalFrameDecision;
      if (originalSelectedBranch) where.review!.inferenceResult.selectedBranch = originalSelectedBranch;
      if (cameraSessionId) where.review!.inferenceResult.cameraSessionId = cameraSessionId;
      if (trackId) where.review!.inferenceResult.trackId = trackId;
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await prisma.$transaction([
      prisma.mlV2ReviewedPromotion.findMany({
        where,
        include: {
          review: {
            include: {
              inferenceResult: {
                select: {
                  frameDecision: true,
                  selectedBranch: true,
                  score: true,
                  margin: true,
                  cameraSessionId: true,
                  trackId: true,
                  detectionEventId: true
                }
              }
            }
          }
        },
        orderBy: [
          { promotedAt: 'desc' },
          { id: 'desc' }
        ],
        skip,
        take: pageSize,
      }),
      prisma.mlV2ReviewedPromotion.count({ where }),
    ]);

    return {
      data: {
        items,
        meta: {
          page,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    };
  }

  /**
   * Retrieves created ML V2 reviewed alerts.
   */
  async getReviewedAlerts(orgId: string, query: ReviewedAlertsQuery) {
    const {
      page,
      pageSize,
      createdById,
      promotedCandidateId,
      createdFrom,
      createdTo
    } = query;

    const where: Prisma.MlV2ReviewedAlertWhereInput = {
      organizationId: orgId,
    };

    if (createdById) where.createdById = createdById;
    if (promotedCandidateId) where.promotedCandidateId = promotedCandidateId;
    
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) (where.createdAt as any).gte = new Date(createdFrom);
      if (createdTo) (where.createdAt as any).lte = new Date(createdTo);
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await prisma.$transaction([
      prisma.mlV2ReviewedAlert.findMany({
        where,
        include: {
          promotion: {
            select: {
              promotedAt: true,
              promotedById: true
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: pageSize,
      }),
      prisma.mlV2ReviewedAlert.count({ where }),
    ]);

    return {
      data: {
        items,
        meta: {
          page,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    };
  }

  /**
   * Retrieves a single reviewed alert by ID.
   */
  async getReviewedAlertById(orgId: string, id: string) {
    const alert = await prisma.mlV2ReviewedAlert.findUnique({
      where: { id },
      include: {
        promotion: true,
        detectionEvent: true
      },
    });

    if (!alert || alert.organizationId !== orgId) {
      return { error: 'NOT_FOUND', message: 'Reviewed alert not found' };
    }

    return { data: alert };
  }

  /**
   * Explicitly creates a reviewed alert from a promotion.
   */
  async createReviewedAlert({
    orgId,
    actorUserId,
    promotionId,
    payload,
  }: {
    orgId: string;
    actorUserId: string;
    promotionId: string;
    payload: CreateReviewedAlertPayload;
  }) {
    const promotion = await prisma.mlV2ReviewedPromotion.findUnique({
      where: { id: promotionId },
      include: {
        review: {
          include: {
            inferenceResult: {
              include: {
                detectionEvent: true
              }
            }
          }
        },
        reviewedAlert: true
      },
    });

    if (!promotion || promotion.organizationId !== orgId) {
      return { error: 'NOT_FOUND', message: 'Promotion not found' };
    }

    // Validate chain state
    const review = promotion.review;
    const inference = review.inferenceResult;
    const detectionEvent = inference.detectionEvent;

    if (review.status !== 'COMPLETED' || review.decision !== 'CONFIRMED') {
      return { error: 'BAD_REQUEST', message: 'Related review must be COMPLETED and CONFIRMED' };
    }
    if (!review.reviewedCandidateId) {
      return { error: 'BAD_REQUEST', message: 'Missing reviewedCandidateId' };
    }
    if (!promotion.promotedCandidateId) {
      return { error: 'BAD_REQUEST', message: 'Missing promotedCandidateId' };
    }
    if (promotion.promotedCandidateId !== review.reviewedCandidateId) {
      return { error: 'BAD_REQUEST', message: 'Promoted candidate does not match reviewed candidate' };
    }
    if (detectionEvent.organizationId !== orgId) {
      return { error: 'BAD_REQUEST', message: 'Invalid detection event organization' };
    }
    if (promotion.reviewedAlert) {
      return { error: 'CONFLICT', message: 'An alert already exists for this promotion' };
    }

    // Title generation
    const title = 'Human-reviewed ML V2 candidate approved for investigation';

    try {
      const result = await prisma.$transaction(async (tx) => {
        const newAlert = await tx.mlV2ReviewedAlert.create({
          data: {
            promotionId: promotion.id,
            organizationId: orgId,
            detectionEventId: detectionEvent.id,
            createdById: actorUserId,
            promotedCandidateId: promotion.promotedCandidateId,
            title,
            notes: payload.notes
          }
        });

        await tx.auditLog.create({
          data: {
            organizationId: orgId,
            userId: actorUserId,
            action: 'ML_V2_REVIEWED_ALERT_CREATED',
            resourceType: 'MlV2ReviewedAlert',
            resourceId: newAlert.id,
            newValue: {
              reviewedAlertId: newAlert.id,
              promotionId: promotion.id,
              reviewId: review.id,
              inferenceResultId: inference.id,
              detectionEventId: detectionEvent.id,
              promotedCandidateId: promotion.promotedCandidateId,
            } as any,
          },
        });

        return newAlert;
      });

      return { data: result };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { error: 'CONFLICT', message: 'An alert already exists for this promotion (concurrent request)' };
      }
      throw error;
    }
  }
}

export const mlV2ReviewedAlertService = new MlV2ReviewedAlertService();
