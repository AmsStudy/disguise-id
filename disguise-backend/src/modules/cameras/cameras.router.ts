import { Router } from 'express';
import { camerasController } from './cameras.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createCameraSchema,
  updateCameraSchema,
  listCamerasQuerySchema,
} from './cameras.schema';

export const camerasRouter = Router();

camerasRouter.use(authenticate);

// GET /cameras
camerasRouter.get(
  '/',
  authorize('admin', 'operator', 'super_admin'),
  validate(listCamerasQuerySchema, 'query'),
  (req, res, next) => camerasController.list(req, res, next)
);

// POST /cameras
camerasRouter.post(
  '/',
  authorize('admin', 'super_admin'),
  validate(createCameraSchema),
  (req, res, next) => camerasController.create(req, res, next)
);

// GET /cameras/:id
camerasRouter.get(
  '/:id',
  authorize('admin', 'operator', 'super_admin'),
  (req, res, next) => camerasController.getById(req, res, next)
);

// POST /cameras/:id/test-connection
camerasRouter.post(
  '/:id/test-connection',
  authorize('admin', 'operator', 'super_admin'),
  (req, res, next) => camerasController.testConnection(req, res, next)
);

// GET /cameras/:id/preview
camerasRouter.get(
  '/:id/preview',
  authorize('admin', 'operator', 'super_admin'),
  (req, res, next) => camerasController.getPreview(req, res, next)
);

// PATCH /cameras/:id
camerasRouter.patch(
  '/:id',
  authorize('admin', 'super_admin'),
  validate(updateCameraSchema),
  (req, res, next) => camerasController.update(req, res, next)
);

// DELETE /cameras/:id
camerasRouter.delete(
  '/:id',
  authorize('admin', 'super_admin'),
  (req, res, next) => camerasController.delete(req, res, next)
);

// POST /cameras/:id/regenerate-key
camerasRouter.post(
  '/:id/regenerate-key',
  authorize('admin', 'super_admin'),
  (req, res, next) => camerasController.regenerateKey(req, res, next)
);
