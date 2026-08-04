import { Router } from 'express';
import { mlV2ReviewController } from './review.controller';
import { authenticate, requireOrg, authorize } from '../../middleware/auth';

export const mlV2ReviewRouter = Router();

mlV2ReviewRouter.use(authenticate);
mlV2ReviewRouter.use(requireOrg);
// Only admins, operators, and investigators can access review features
mlV2ReviewRouter.use(authorize('admin', 'operator', 'investigator'));

// Review Queue
mlV2ReviewRouter.get('/review-queue', mlV2ReviewController.getReviewQueue);

// Reviews list (paginated, for history/audit)
mlV2ReviewRouter.get('/reviews', mlV2ReviewController.getReviews);

// Review details
mlV2ReviewRouter.get('/reviews/:id', mlV2ReviewController.getReviewById);

// Claim review (nested under inference-results)
mlV2ReviewRouter.post('/inference-results/:id/review', mlV2ReviewController.claimReview);

// Complete review
mlV2ReviewRouter.post('/reviews/:id/complete', mlV2ReviewController.completeReview);
