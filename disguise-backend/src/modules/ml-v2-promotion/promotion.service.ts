import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { PromotionQueueQuery, PromotionsQuery, PromoteReviewPayload } from './promotion.validation';

export class MlV2PromotionService {
  /**
   * Retrieves the promotion queue for completed, confirmed reviews
   * that have not yet been promoted.
   */
  async getPromotionQueue(orgId: string, query: PromotionQueueQuery) {
    const {
      page,
      pageSize,
      reviewedCandidateId,
      reviewerId,
      reviewedFrom,
      reviewedTo,
      frameDecision,
      selectedBranch,
    } = query;

    // We only want COMPLETED reviews with decision CONFIRMED
    // that DO NOT have a promotion yet.
    const where: Prisma.MlV2OperatorReviewWhereInput = {
      organizationId: orgId,
      status: 'COMPLETED',
      decision: 'CONFIRMED',
      promotion: null,
    };

    if (reviewedCandidateId) where.reviewedCandidateId = reviewedCandidateId;
    if (reviewerId) where.reviewerId = reviewerId;

    if (reviewedFrom || reviewedTo) {
      where.reviewedAt = {};
      if (reviewedFrom) (where.reviewedAt as any).gte = new Date(reviewedFrom);
      if (reviewedTo) (where.reviewedAt as any).lte = new Date(reviewedTo);
    }

    if (frameDecision || selectedBranch) {
      where.inferenceResult = {};
      if (frameDecision) where.inferenceResult.frameDecision = frameDecision;
      if (selectedBranch) where.inferenceResult.selectedBranch = selectedBranch;
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await prisma.$transaction([
      prisma.mlV2OperatorReview.findMany({
        where,
        include: {
          inferenceResult: {
            select: {
              frameDecision: true,
              selectedBranch: true,
              score: true,
              margin: true,
            },
          },
        },
        orderBy: [
          { reviewedAt: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: pageSize,
      }),
      prisma.mlV2OperatorReview.count({ where }),
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
   * Retrieves historical promotions for the organization.
   */
  async getPromotions(orgId: string, query: PromotionsQuery) {
    const {
      page,
      pageSize,
      promotedCandidateId,
      promotedById,
      promotedFrom,
      promotedTo,
    } = query;

    const where: Prisma.MlV2ReviewedPromotionWhereInput = {
      organizationId: orgId,
    };

    if (promotedCandidateId) where.promotedCandidateId = promotedCandidateId;
    if (promotedById) where.promotedById = promotedById;

    if (promotedFrom || promotedTo) {
      where.promotedAt = {};
      if (promotedFrom) (where.promotedAt as any).gte = new Date(promotedFrom);
      if (promotedTo) (where.promotedAt as any).lte = new Date(promotedTo);
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await prisma.$transaction([
      prisma.mlV2ReviewedPromotion.findMany({
        where,
        include: {
          review: {
            select: {
              reviewerId: true,
              reviewedAt: true,
            },
          },
        },
        orderBy: [
          { promotedAt: 'desc' },
          { id: 'desc' },
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
   * Retrieves a single promotion by ID.
   */
  async getPromotionById(orgId: string, id: string) {
    const promotion = await prisma.mlV2ReviewedPromotion.findUnique({
      where: { id },
      include: {
        review: true,
      },
    });

    if (!promotion || promotion.organizationId !== orgId) {
      return { error: 'NOT_FOUND', message: 'Promotion not found' };
    }

    return { data: promotion };
  }

  /**
   * Promotes a completed review to a promotion record.
   */
  async promoteReview({
    orgId,
    actorUserId,
    reviewId,
    payload,
  }: {
    orgId: string;
    actorUserId: string;
    reviewId: string;
    payload: PromoteReviewPayload;
  }) {
    // 1. Fetch the review
    const review = await prisma.mlV2OperatorReview.findUnique({
      where: { id: reviewId },
      include: { promotion: true },
    });

    // 2. Validate existence and organization scope
    if (!review || review.organizationId !== orgId) {
      return { error: 'NOT_FOUND', message: 'Review not found' };
    }

    // 3. Validation Rules
    if (review.status === 'PENDING') {
      return { error: 'BAD_REQUEST', message: 'Cannot promote a PENDING review' };
    }
    if (review.decision === 'REJECTED' || review.decision === 'INCONCLUSIVE') {
      return { error: 'BAD_REQUEST', message: `Cannot promote a review with decision ${review.decision}` };
    }
    if (!review.reviewedCandidateId) {
      return { error: 'BAD_REQUEST', message: 'Review must have a reviewedCandidateId to be promoted' };
    }

    // 4. Idempotency Check
    if (review.promotion) {
      return { error: 'CONFLICT', message: 'Review is already promoted' };
    }

    // 5. Transaction
    try {
      const result = await prisma.$transaction(async (tx) => {
        const promotion = await tx.mlV2ReviewedPromotion.create({
          data: {
            reviewId,
            organizationId: orgId,
            promotedById: actorUserId,
            promotedCandidateId: review.reviewedCandidateId!,
            notes: payload.notes,
            promotedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId: orgId,
            userId: actorUserId,
            action: 'ML_V2_REVIEW_PROMOTED',
            resourceType: 'MlV2ReviewedPromotion',
            resourceId: promotion.id,
            newValue: {
              promotionId: promotion.id,
              reviewId,
              promotedCandidateId: promotion.promotedCandidateId,
            } as any,
          },
        });

        return promotion;
      });

      return { data: result };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Unique constraint failed on reviewId. Concurrent promotion won.
        return { error: 'CONFLICT', message: 'Review is already promoted by another concurrent request' };
      }
      throw error;
    }
  }
}

export const mlV2PromotionService = new MlV2PromotionService();
