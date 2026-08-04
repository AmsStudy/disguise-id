import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { z } from 'zod';
import { badRequest, notFound } from '../../utils/AppError';

export const settingsRouter = Router();

const updateSettingsSchema = z.object({
  default_threshold: z.number().min(0).max(1).optional(),
  alert_auto_assign: z.boolean().optional(),
  notification_email: z.string().email().optional(),
  retention_days_frames: z.number().int().min(1).optional(),
  retention_days_events: z.number().int().min(1).optional(),
});

settingsRouter.use(authenticate);

// GET /settings — admin only
settingsRouter.get(
  '/',
  authorize('admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = await prisma.organization.findFirst({
        where: { id: req.user!.orgId, deletedAt: null },
        select: { id: true, name: true, code: true, plan: true, settings: true },
      });
      if (!org) throw notFound('Organization');
      sendSuccess(res, org);
    } catch (err) { next(err); }
  }
);

// PATCH /settings
settingsRouter.patch(
  '/',
  authorize('admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateSettingsSchema.parse(req.body);
      const org = await prisma.organization.findFirst({
        where: { id: req.user!.orgId, deletedAt: null },
      });
      if (!org) throw notFound('Organization');

      const currentSettings = (org.settings as Record<string, unknown>) || {};
      const newSettings = { ...currentSettings, ...input };

      const updated = await prisma.organization.update({
        where: { id: req.user!.orgId },
        data: { settings: newSettings },
        select: { id: true, name: true, code: true, plan: true, settings: true },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: req.user!.orgId,
          userId: req.user!.sub,
          action: 'SETTINGS_UPDATED',
          resourceType: 'organization',
          resourceId: req.user!.orgId,
          oldValue: currentSettings as Prisma.InputJsonValue,
          newValue: newSettings as unknown as Prisma.InputJsonValue,
        },
      });

      sendSuccess(res, updated);
    } catch (err) { next(err); }
  }
);

// GET /settings/model-versions
settingsRouter.get(
  '/model-versions',
  authorize('admin', 'super_admin'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const versions = await prisma.modelVersion.findMany({
        orderBy: { createdAt: 'desc' },
      });
      sendSuccess(res, versions);
    } catch (err) { next(err); }
  }
);

// POST /settings/model-versions/:id/activate — super_admin only
settingsRouter.post(
  '/model-versions/:id/activate',
  authorize('super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const version = await prisma.modelVersion.findUnique({ where: { id } });
      if (!version) throw notFound('Model version');

      // Deactivate all others and activate this one (transaction)
      await prisma.$transaction([
        prisma.modelVersion.updateMany({ where: {}, data: { isActive: false } }),
        prisma.modelVersion.update({
          where: { id },
          data: { isActive: true, deployedAt: new Date() },
        }),
      ]);

      await prisma.auditLog.create({
        data: {
          organizationId: req.user!.orgId,
          userId: req.user!.sub,
          action: 'MODEL_VERSION_ACTIVATED',
          resourceType: 'model_version',
          resourceId: id,
          newValue: { version: version.version },
        },
      });

      sendSuccess(res, { message: `Model version ${version.version} activated` });
    } catch (err) { next(err); }
  }
);
