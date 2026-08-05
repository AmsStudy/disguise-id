import { Router } from 'express';
import { mlV2ReviewedAlertController } from './reviewed-alert.controller';
import { authenticate, authorize, requireOrg } from '../../middleware/auth';


export const mlV2ReviewedAlertRouter = Router();

mlV2ReviewedAlertRouter.use(authenticate);
mlV2ReviewedAlertRouter.use(requireOrg);

mlV2ReviewedAlertRouter.get(
  '/alert-creation-queue',
  authorize('operator', 'investigator', 'admin', 'super_admin'),
  (req, res, next) => mlV2ReviewedAlertController.getAlertCreationQueue(req, res, next)
);

mlV2ReviewedAlertRouter.get(
  '/reviewed-alerts',
  authorize('operator', 'investigator', 'admin', 'super_admin'),
  (req, res, next) => mlV2ReviewedAlertController.getReviewedAlerts(req, res, next)
);

mlV2ReviewedAlertRouter.get(
  '/reviewed-alerts/:id',
  authorize('operator', 'investigator', 'admin', 'super_admin'),
  (req, res, next) => mlV2ReviewedAlertController.getReviewedAlertById(req, res, next)
);

mlV2ReviewedAlertRouter.post(
  '/promotions/:promotionId/create-alert',
  authorize('investigator', 'admin', 'super_admin'),
  (req, res, next) => mlV2ReviewedAlertController.createReviewedAlert(req, res, next)
);
