import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginSchema, refreshSchema } from './auth.schema';

export const authRouter = Router();

// POST /auth/login
authRouter.post(
  '/login',
  validate(loginSchema),
  (req, res, next) => authController.login(req, res, next)
);

// POST /auth/refresh
authRouter.post(
  '/refresh',
  validate(refreshSchema),
  (req, res, next) => authController.refresh(req, res, next)
);

// POST /auth/logout
authRouter.post(
  '/logout',
  authenticate,
  (req, res, next) => authController.logout(req, res, next)
);

// GET /auth/me
authRouter.get(
  '/me',
  authenticate,
  (req, res, next) => authController.getMe(req, res, next)
);
