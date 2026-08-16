import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import { alertsService } from './alerts.service';
import { mapAlertToMobile } from './alerts.mobile.mapper';
import prisma from '../../config/database';
import { z } from 'zod';
import { validate } from '../../middleware/validate';

export const alertsMobileRouter = Router();

// GET /alerts
alertsMobileRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      const result = await alertsService.listAlerts(orgId, req.query as any);
      
      const mobileData = {
        data: result.alerts.map(mapAlertToMobile),
        meta: result.meta
      };
      
      sendSuccess(res, mobileData);
    } catch (err) {
      next(err);
    }
  }
);

// GET /alerts/map
alertsMobileRouter.get(
  '/map',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      
      // 6 hours ago
      const sixHoursAgo = new Date();
      sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

      const alerts = await prisma.alert.findMany({
        where: {
          organizationId: orgId,
          createdAt: {
            gte: sixHoursAgo
          }
        },
        include: {
          person: { select: { id: true, fullName: true, dangerLevel: true, photoUrl: true, caseReference: true } },
          detectionEvent: {
            include: {
              source: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Filter alerts that have location
      const mapAlerts = alerts
        .filter(a => a.detectionEvent?.source?.latitude && a.detectionEvent?.source?.longitude)
        .map(mapAlertToMobile);
      
      sendSuccess(res, mapAlerts);
    } catch (err) {
      next(err);
    }
  }
);

// GET /alerts/:id
alertsMobileRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      const alert = await alertsService.getAlertById(req.params.id, orgId);
      
      sendSuccess(res, mapAlertToMobile(alert));
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /alerts/:id
const updateAlertSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'confirmed', 'dismissed']),
    reason: z.string().optional()
  })
});

alertsMobileRouter.patch(
  '/:id',
  authenticate,
  validate(updateAlertSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user!.sub;
      
      const input = {
        status: req.body.status,
        review_notes: req.body.reason
      };
      
      const updatedAlert = await alertsService.updateAlert(req.params.id, input, orgId, userId);
      
      // Re-fetch to get complete data for mapping
      const completeAlert = await alertsService.getAlertById(updatedAlert.id, orgId);
      
      sendSuccess(res, mapAlertToMobile(completeAlert));
    } catch (err) {
      next(err);
    }
  }
);
