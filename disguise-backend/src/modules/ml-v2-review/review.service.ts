import { Prisma, MlV2ReviewStatus, MlV2ReviewDecision } from '@prisma/client';
import prisma from '../../config/database';
import { ReviewQueueQuery, ReviewsQuery, CompleteReviewPayload } from './review.validation';

export class MlV2ReviewService {
  /**
   * Retrieves the review queue for eligible inference results.
   */
  async getReviewQueue(orgId: string, actorUserId: string, actorRole: string, query: ReviewQueueQuery) {
    const {
      page,
      pageSize,
      frameDecision,
      candidateId,
      selectedBranch,
      createdFrom,
      createdTo,
      claimedState,
      reviewerId,
    } = query;

    // Base conditions for eligibility:
    // - status SUCCESS
    // - requiresOperatorVerification true
    // - frameDecision HIGH_PRIORITY_CANDIDATE or POSSIBLE_CANDIDATE
    // - belongs to org
    const where: Prisma.MlV2InferenceResultWhereInput = {
      detectionEvent: {
        organizationId: orgId,
      },
      status: 'SUCCESS',
      requiresOperatorVerification: true,
      frameDecision: { in: ['HIGH_PRIORITY_CANDIDATE', 'POSSIBLE_CANDIDATE'] },
    };

    if (frameDecision) where.frameDecision = frameDecision;
    if (candidateId) where.candidateId = candidateId;
    if (selectedBranch) where.selectedBranch = selectedBranch;

    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) (where.createdAt as any).gte = new Date(createdFrom);
      if (createdTo) (where.createdAt as any).lte = new Date(createdTo);
    }

    // Default queue visibility:
    // Admin sees all eligible (unclaimed + all pending)
    // Operator/Investigator sees unclaimed + claimed by them. Completed are always excluded from default queue.
    if (!claimedState) {
      if (actorRole === 'admin') {

        where.OR = [
          { operatorReview: null },
          { operatorReview: { status: 'PENDING' } },
        ];
      } else {
        where.OR = [
          { operatorReview: null },
          { operatorReview: { status: 'PENDING', reviewerId: actorUserId } },
        ];
      }
    } else {
      // Explicit filters
      if (claimedState === 'UNCLAIMED') {
        where.operatorReview = null;
      } else if (claimedState === 'CLAIMED_BY_ME') {
        where.operatorReview = {
          status: 'PENDING',
          reviewerId: actorUserId,
        };
      } else if (claimedState === 'CLAIMED_BY_OTHER') {
        where.operatorReview = {
          status: 'PENDING',
          reviewerId: { not: actorUserId },
        };
      }
    }

    // Apply explicit reviewerId filter if requested
    if (reviewerId) {
       // Only allow if admin or filtering for self
       if (actorRole !== 'admin' && reviewerId !== actorUserId) {
         return { error: 'FORBIDDEN', message: 'Not authorized to filter by other reviewers' };
       }
       // If there's an existing OR condition, we merge it safely
       // For simplicity, we just force the reviewerId on the operatorReview relation
       const existingConditions = (where.operatorReview && typeof where.operatorReview === 'object') ? where.operatorReview : {};
       where.operatorReview = {
         ...existingConditions,
         is: {
           ...((existingConditions as any).is || {}),
           reviewerId,
         }
       };
       // If we forced reviewerId, we must remove the OR condition that allows `null` operatorReview
       where.OR = undefined; 
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await prisma.$transaction([
      prisma.mlV2InferenceResult.findMany({
        where,
        include: {
          detectionEvent: {
            select: { id: true, sourceId: true, detectedAt: true },
          },
          operatorReview: {
            select: { id: true, status: true, reviewerId: true, claimedAt: true },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: pageSize,
      }),
      prisma.mlV2InferenceResult.count({ where }),
    ]);

    // Map to safe DTO, determining the computed claimedState for each item
    const safeItems = items.map((item) => {
      let computedClaimedState = 'UNCLAIMED';
      if (item.operatorReview) {
        if (item.operatorReview.reviewerId === actorUserId) {
          computedClaimedState = 'CLAIMED_BY_ME';
        } else {
          computedClaimedState = 'CLAIMED_BY_OTHER';
        }
      }

      return {
        id: item.id,
        detectionEventId: item.detectionEventId,
        status: item.status,
        frameDecision: item.frameDecision,
        selectedBranch: item.selectedBranch,
        candidateId: item.candidateId,
        score: item.score,
        margin: item.margin,
        requiresOperatorVerification: item.requiresOperatorVerification,
        createdAt: item.createdAt,
        claimedState: computedClaimedState,
        reviewSummary: item.operatorReview,
        detectionEvent: item.detectionEvent,
      };
    });

    return {
      data: {
        items: safeItems,
        meta: {
          page,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      }
    };
  }

  /**
   * Retrieves paginated review records for the organization.
   */
  async getReviews(orgId: string, query: ReviewsQuery) {
    const {
      page,
      pageSize,
      status,
      decision,
      reviewerId,
      reviewedCandidateId,
      createdFrom,
      createdTo,
    } = query;

    const where: Prisma.MlV2OperatorReviewWhereInput = {
      organizationId: orgId,
    };

    if (status) where.status = status;
    if (decision) where.decision = decision;
    if (reviewerId) where.reviewerId = reviewerId;
    if (reviewedCandidateId) where.reviewedCandidateId = reviewedCandidateId;

    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) (where.createdAt as any).gte = new Date(createdFrom);
      if (createdTo) (where.createdAt as any).lte = new Date(createdTo);
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await prisma.$transaction([
      prisma.mlV2OperatorReview.findMany({
        where,
        include: {
          inferenceResult: {
            select: { candidateId: true, score: true, frameDecision: true },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
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
      }
    };
  }

  /**
   * Fetch a single review by ID safely.
   */
  async getReviewById(orgId: string, id: string) {
    const review = await prisma.mlV2OperatorReview.findUnique({
      where: { id },
      include: {
        inferenceResult: {
          select: { candidateId: true, score: true, frameDecision: true },
        },
      },
    });

    if (!review || review.organizationId !== orgId) {
      return { error: 'NOT_FOUND', message: 'Review not found' };
    }

    return { data: review };
  }

  /**
   * Claim an eligible inference result for review.
   */
  async claimReview(orgId: string, reviewerId: string, inferenceResultId: string) {
    // 1. Fetch inference result scoping by org
    const inferenceResult = await prisma.mlV2InferenceResult.findUnique({
      where: { id: inferenceResultId },
      include: {
        detectionEvent: { select: { organizationId: true } },
        operatorReview: true,
      },
    });

    if (!inferenceResult || inferenceResult.detectionEvent.organizationId !== orgId) {
      return { error: 'NOT_FOUND', message: 'Inference result not found' };
    }

    // 2. Eligibility checks
    if (
      inferenceResult.status === 'FAILED' ||
      !inferenceResult.requiresOperatorVerification ||
      (inferenceResult.frameDecision !== 'HIGH_PRIORITY_CANDIDATE' && inferenceResult.frameDecision !== 'POSSIBLE_CANDIDATE')
    ) {
      return { error: 'BAD_REQUEST', message: 'Inference result is not eligible for review' };
    }

    // 3. Concurrency / Idempotency handling
    if (inferenceResult.operatorReview) {
      const review = inferenceResult.operatorReview;
      if (review.status === 'COMPLETED') {
        return { error: 'CONFLICT', message: 'Review is already completed' };
      }
      if (review.reviewerId === reviewerId) {
        // Idempotent return
        return { data: review };
      }
      // PENDING by another reviewer
      return { error: 'CONFLICT', message: 'Review is already claimed by another operator' };
    }

    // 4. Create the review
    try {
      const result = await prisma.$transaction(async (tx) => {
        const newReview = await tx.mlV2OperatorReview.create({
          data: {
            inferenceResultId,
            organizationId: orgId,
            reviewerId,
            status: 'PENDING',
            claimedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId: orgId,
            userId: reviewerId,
            action: 'ML_V2_REVIEW_CLAIMED',
            resourceType: 'MlV2OperatorReview',
            resourceId: newReview.id,
            newValue: {
              reviewId: newReview.id,
              inferenceResultId,
              newStatus: 'PENDING',
            } as any,
          },
        });

        return newReview;
      });

      return { data: result };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Unique constraint failed on inferenceResultId, meaning another claim won the race.
        // Re-read it to determine if it's ours or someone else's.
        const reRead = await prisma.mlV2OperatorReview.findUnique({
          where: { inferenceResultId },
        });
        if (reRead && reRead.reviewerId === reviewerId) {
           return { data: reRead };
        }
        return { error: 'CONFLICT', message: 'Review is already claimed by another operator' };
      }
      throw error;
    }
  }

  /**
   * Complete a pending review.
   */
  async completeReview({
    orgId,
    actorUserId,
    actorRole,
    reviewId,
    payload,
  }: {
    orgId: string;
    actorUserId: string;
    actorRole: string;
    reviewId: string;
    payload: CompleteReviewPayload;
  }) {
    // 1. We must verify if the user is authorized to complete this review.
    // Use updateMany for concurrency safety.
    const whereCondition: Prisma.MlV2OperatorReviewWhereInput = {
      id: reviewId,
      organizationId: orgId,
      status: 'PENDING',
    };

    // Only admins can complete reviews assigned to others. Operators can only complete their own.
    if (actorRole !== 'admin' && actorRole !== 'super_admin') {
      whereCondition.reviewerId = actorUserId;
    }

    const { decision, notes, reviewedCandidateId } = payload;
    const reviewedAt = new Date();

    const updateResult = await prisma.$transaction(async (tx) => {
      const result = await tx.mlV2OperatorReview.updateMany({
        where: whereCondition,
        data: {
          status: 'COMPLETED',
          decision,
          notes,
          reviewedCandidateId,
          reviewedAt,
        },
      });

      if (result.count === 1) {
        // Find the updated record for returning and audit log inferenceResultId
        const updated = await tx.mlV2OperatorReview.findUniqueOrThrow({
          where: { id: reviewId },
        });

        await tx.auditLog.create({
          data: {
            organizationId: orgId,
            userId: actorUserId,
            action: 'ML_V2_REVIEW_COMPLETED',
            resourceType: 'MlV2OperatorReview',
            resourceId: reviewId,
            oldValue: { status: 'PENDING' } as any,
            newValue: {
              reviewId,
              inferenceResultId: updated.inferenceResultId,
              decision,
              reviewedCandidateId,
              newStatus: 'COMPLETED',
            } as any,
          },
        });
        return { updated };
      }
      return { updated: null };
    });

    if (updateResult.updated) {
      return { data: updateResult.updated };
    }

    // 2. If count === 0, we need to know why to return the correct error.
    const current = await prisma.mlV2OperatorReview.findUnique({
      where: { id: reviewId },
    });

    if (!current || current.organizationId !== orgId) {
      return { error: 'NOT_FOUND', message: 'Review not found' };
    }

    if (current.status === 'COMPLETED') {
      return { error: 'CONFLICT', message: 'Review is already completed' };
    }

    // Must be a role ownership issue
    return { error: 'FORBIDDEN', message: 'Not authorized to complete this review' };
  }
}

export const mlV2ReviewService = new MlV2ReviewService();
