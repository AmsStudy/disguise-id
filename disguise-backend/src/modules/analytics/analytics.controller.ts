import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { sendSuccess } from '../../utils/response';

export class AnalyticsController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDashboard(req.user!.orgId);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  async getDetections(req: Request, res: Response, next: NextFunction) {
    try {
      const period = (req.query.period as string) || '7d';
      const sourceId = req.query.source_id as string | undefined;
      const data = await analyticsService.getDetectionStats(req.user!.orgId, period, sourceId);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  async getPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getPerformanceMetrics(req.user!.orgId);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  }
}

export const analyticsController = new AnalyticsController();
