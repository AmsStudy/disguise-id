import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginSchema, refreshSchema } from './auth.schema';
import z from 'zod';
import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import { authService } from './auth.service';

export const authMobileRouter = Router();

// Mobile expects `username` instead of `email`
const mobileLoginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

authMobileRouter.post(
  '/login',
  validate(mobileLoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = {
        email: req.body.username, // Map username to email for the existing service
        password: req.body.password,
      };
      
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';

      const data = await authService.login(input, ipAddress, userAgent);
      
      // Transform response for mobile
      const mobileData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: {
          id: data.user.id,
          name: data.user.full_name, // Mobile expects 'name' instead of 'full_name'
          email: data.user.email,
        }
      };
      
      sendSuccess(res, mobileData);
    } catch (err) {
      next(err);
    }
  }
);

authMobileRouter.post(
  '/refresh',
  validate(refreshSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refresh_token } = req.body;
      const data = await authService.refresh(refresh_token);
      
      const mobileData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: {
          id: data.user.id,
          name: data.user.full_name,
          email: data.user.email,
        }
      };
      sendSuccess(res, mobileData);
    } catch (err) {
      next(err);
    }
  }
);

authMobileRouter.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.headers.authorization?.split(' ')[1] || '';
      const refreshToken = req.body?.refresh_token;
      await authService.logout(accessToken, refreshToken);
      sendSuccess(res, { message: 'Berhasil logout' });
    } catch (err) {
      next(err);
    }
  }
);
