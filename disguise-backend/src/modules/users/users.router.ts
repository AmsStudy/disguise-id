import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  listUsersQuerySchema,
} from './users.schema';

export const usersRouter = Router();

// All users routes require authentication
usersRouter.use(authenticate);

// GET /users
usersRouter.get(
  '/',
  authorize('admin', 'super_admin'),
  validate(listUsersQuerySchema, 'query'),
  (req, res, next) => usersController.list(req, res, next)
);

// POST /users
usersRouter.post(
  '/',
  authorize('admin', 'super_admin'),
  validate(createUserSchema),
  (req, res, next) => usersController.create(req, res, next)
);

// GET /users/:id
usersRouter.get(
  '/:id',
  authorize('admin', 'super_admin'),
  (req, res, next) => usersController.getById(req, res, next)
);

// PATCH /users/:id
usersRouter.patch(
  '/:id',
  authorize('admin', 'super_admin'),
  validate(updateUserSchema),
  (req, res, next) => usersController.update(req, res, next)
);

// DELETE /users/:id
usersRouter.delete(
  '/:id',
  authorize('admin', 'super_admin'),
  (req, res, next) => usersController.delete(req, res, next)
);

// POST /users/:id/reset-password
usersRouter.post(
  '/:id/reset-password',
  authorize('admin', 'super_admin'),
  validate(resetPasswordSchema),
  (req, res, next) => usersController.resetPassword(req, res, next)
);
