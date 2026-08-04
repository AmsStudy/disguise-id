import { Request, Response, NextFunction } from 'express';
import { alertsService } from './alerts.service';
import { sendSuccess } from '../../utils/response';

export class AlertsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { alerts, meta } = await alertsService.listAlerts(req.user!.orgId, req.query as any);
      sendSuccess(res, alerts, 200, meta);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const alert = await alertsService.getAlertById(req.params.id, req.user!.orgId);
      sendSuccess(res, alert);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const alert = await alertsService.updateAlert(req.params.id, req.body, req.user!.orgId, req.user!.sub);
      sendSuccess(res, alert);
    } catch (err) { next(err); }
  }

  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const alert = await alertsService.assignAlert(req.params.id, req.body, req.user!.orgId, req.user!.sub);
      sendSuccess(res, alert);
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await alertsService.deleteAlert(req.params.id, req.user!.orgId, req.user!.sub);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  }
}

export const alertsController = new AlertsController();
