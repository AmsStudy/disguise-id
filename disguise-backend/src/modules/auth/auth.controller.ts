import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { LoginInput, RefreshInput } from './auth.schema';

export class AuthController {
  /**
   * POST /auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: LoginInput = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';

      const data = await authService.login(input, ipAddress, userAgent);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refresh_token }: RefreshInput = req.body;
      const data = await authService.refresh(refresh_token);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accessToken = req.headers.authorization?.split(' ')[1] || '';
      const refreshToken = req.body?.refresh_token;
      await authService.logout(accessToken, refreshToken);
      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const data = await authService.getMe(userId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
