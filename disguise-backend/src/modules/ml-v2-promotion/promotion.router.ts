import { Router } from 'express';
import { mlV2PromotionController } from './promotion.controller';
import { authenticate, authorize, requireOrg } from '../../middleware/auth';

const router = Router();

// Base middleware for all routes
router.use(authenticate);
router.use(requireOrg);

// --- STATIC ROUTES (MUST PRECEED DYNAMIC ROUTES) ---

// 1. Get promotion queue (reviews eligible for promotion)
router.get(
  '/promotion-queue',
  authorize('super_admin', 'admin', 'investigator', 'operator'),
  mlV2PromotionController.getPromotionQueue
);

// 2. Get historical promotions
router.get(
  '/promotions',
  authorize('super_admin', 'admin', 'investigator', 'operator'),
  mlV2PromotionController.getPromotions
);

// --- DYNAMIC ROUTES ---

// 3. Promote a review (MUTATION)
router.post(
  '/reviews/:reviewId/promote',
  authorize('super_admin', 'admin', 'investigator'),
  mlV2PromotionController.promoteReview
);

// 4. Get a specific promotion by ID
router.get(
  '/promotions/:id',
  authorize('super_admin', 'admin', 'investigator', 'operator'),
  mlV2PromotionController.getPromotionById
);

export default router;
