import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import prisma from '../../config/database';
import z from 'zod';
import { validate } from '../../middleware/validate';

export const devicesMobileRouter = Router();

const deviceSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    platform: z.string().min(1, 'Platform is required'),
  }),
});

// POST /devices
devicesMobileRouter.post(
  '/',
  authenticate,
  validate(deviceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { token, platform } = req.body;

      // Upsert the device token
      await prisma.deviceToken.upsert({
        where: { token },
        update: { userId, platform, updatedAt: new Date() },
        create: { userId, token, platform },
      });

      res.status(201).json({ message: 'Device token saved' });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /devices/:token
devicesMobileRouter.delete(
  '/:token',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      
      await prisma.deviceToken.deleteMany({
        where: { token },
      });

      sendSuccess(res, { message: 'Device token removed' });
    } catch (err) {
      next(err);
    }
  }
);
