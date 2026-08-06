import { Request, Response, NextFunction } from 'express';
import { cameraHealthService } from './camera-health.service';
import { sendSuccess } from '../../utils/response';

export class CameraHealthController {
  async getCameraHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const health = await cameraHealthService.getHealth(id);
      sendSuccess(res, health);
    } catch (err) {
      next(err);
    }
  }

  async reportHeartbeat(req: Request, res: Response, next: NextFunction) {
    try {
      // cameraId is injected by the cameraAgentAuth middleware OR from req.params if available
      const cameraId = (req as any).camera?.id || req.params.id;
      await cameraHealthService.reportHeartbeat(cameraId, req.body);
      sendSuccess(res, { message: 'Heartbeat recorded' });
    } catch (err) {
      next(err);
    }
  }
}

export const cameraHealthController = new CameraHealthController();
