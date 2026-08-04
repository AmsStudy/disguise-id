import { Router } from 'express';
import { alertsController } from './alerts.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { updateAlertSchema, assignAlertSchema, listAlertsQuerySchema } from './alerts.schema';

export const alertsRouter = Router();

alertsRouter.use(authenticate);

// GET /alerts
alertsRouter.get(
  '/',
  authorize('operator', 'investigator', 'admin', 'super_admin'),
  validate(listAlertsQuerySchema, 'query'),
  (req, res, next) => alertsController.list(req, res, next)
);

// GET /alerts/:id
alertsRouter.get(
  '/:id',
  authorize('operator', 'investigator', 'admin', 'super_admin'),
  (req, res, next) => alertsController.getById(req, res, next)
);

// PATCH /alerts/:id
alertsRouter.patch(
  '/:id',
  authorize('operator', 'investigator', 'admin', 'super_admin'),
  validate(updateAlertSchema),
  (req, res, next) => alertsController.update(req, res, next)
);

// POST /alerts/:id/assign
alertsRouter.post(
  '/:id/assign',
  authorize('admin', 'operator', 'super_admin'),
  validate(assignAlertSchema),
  (req, res, next) => alertsController.assign(req, res, next)
);

// DELETE /alerts/:id
alertsRouter.delete(
  '/:id',
  authorize('operator', 'investigator', 'admin', 'super_admin'),
  (req, res, next) => alertsController.delete(req, res, next)
);
