import { Router } from 'express';
import { watchlistController } from './watchlist.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadPhoto } from '../../utils/upload';
import {
  createPersonSchema,
  updatePersonSchema,
  listWatchlistQuerySchema,
} from './watchlist.schema';

export const watchlistRouter = Router();

// All watchlist routes require authentication
watchlistRouter.use(authenticate);

// GET /watchlist
watchlistRouter.get(
  '/',
  validate(listWatchlistQuerySchema, 'query'),
  (req, res, next) => watchlistController.list(req, res, next)
);

// POST /watchlist
watchlistRouter.post(
  '/',
  authorize('admin', 'investigator', 'super_admin'),
  uploadPhoto.single('photo'),
  (req, res, next) => {
    // Parse JSON fields from multipart form
    if (req.body.alias && typeof req.body.alias === 'string') {
      try { req.body.alias = JSON.parse(req.body.alias); } catch { req.body.alias = [req.body.alias]; }
    }
    next();
  },
  validate(createPersonSchema),
  (req, res, next) => watchlistController.create(req, res, next)
);

// GET /watchlist/:id
watchlistRouter.get('/:id', (req, res, next) => watchlistController.getById(req, res, next));

// PATCH /watchlist/:id
watchlistRouter.patch(
  '/:id',
  authorize('admin', 'investigator', 'super_admin'),
  uploadPhoto.single('photo'),
  (req, res, next) => {
    if (req.body.alias && typeof req.body.alias === 'string') {
      try { req.body.alias = JSON.parse(req.body.alias); } catch { req.body.alias = [req.body.alias]; }
    }
    next();
  },
  validate(updatePersonSchema),
  (req, res, next) => watchlistController.update(req, res, next)
);

// DELETE /watchlist/:id
watchlistRouter.delete(
  '/:id',
  authorize('admin', 'super_admin'),
  (req, res, next) => watchlistController.delete(req, res, next)
);

// POST /watchlist/:id/deactivate
watchlistRouter.post(
  '/:id/deactivate',
  authorize('admin', 'investigator', 'super_admin'),
  (req, res, next) => watchlistController.deactivate(req, res, next)
);

// POST /watchlist/:id/photos
watchlistRouter.post(
  '/:id/photos',
  authorize('admin', 'investigator', 'super_admin'),
  uploadPhoto.single('photo'),
  (req, res, next) => watchlistController.addPhoto(req, res, next)
);

// DELETE /watchlist/:id/photos/:photoId
watchlistRouter.delete(
  '/:id/photos/:photoId',
  authorize('admin', 'investigator', 'super_admin'),
  (req, res, next) => watchlistController.deletePhoto(req, res, next)
);
