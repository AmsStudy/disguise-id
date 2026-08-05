import { Request, Response, NextFunction } from 'express';
import { mlV2ReviewedAlertService } from './reviewed-alert.service';
import { getAlertCreationQueueSchema, getReviewedAlertsSchema, createReviewedAlertSchema } from './reviewed-alert.schema';

export class MlV2ReviewedAlertController {
  async getAlertCreationQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const query = getAlertCreationQueueSchema.parse(req.query);
      const result = await mlV2ReviewedAlertService.getAlertCreationQueue(orgId, query);
      return res.status(200).json({
        success: true,
        data: result.data.items,
        meta: result.data.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async getReviewedAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const query = getReviewedAlertsSchema.parse(req.query);
      const result = await mlV2ReviewedAlertService.getReviewedAlerts(orgId, query);
      return res.status(200).json({
        success: true,
        data: result.data.items,
        meta: result.data.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async getReviewedAlertById(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const { id } = req.params;
      
      const result = await mlV2ReviewedAlertService.getReviewedAlertById(orgId, id);
      
      if (result.error) {
        let status = 400;
        if (result.error === 'NOT_FOUND') status = 404;
        return res.status(status).json({ success: false, error: { code: result.error, message: result.message } });
      }

      return res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  async createReviewedAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const actorUserId = req.user!.sub;
      const { promotionId } = req.params;
      const payload = createReviewedAlertSchema.parse(req.body);

      const result = await mlV2ReviewedAlertService.createReviewedAlert({
        orgId,
        actorUserId,
        promotionId,
        payload,
      });

      if (result.error) {
        let status = 400;
        if (result.error === 'NOT_FOUND') status = 404;
        if (result.error === 'CONFLICT') status = 409;
        
        return res.status(status).json({ success: false, error: { code: result.error, message: result.message } });
      }

      return res.status(201).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const mlV2ReviewedAlertController = new MlV2ReviewedAlertController();
