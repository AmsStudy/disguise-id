import { Request, Response, NextFunction } from 'express';
import { camerasService } from './cameras.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response';

export class CamerasController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { cameras, meta } = await camerasService.listCameras(req.user!.orgId, req.query as any);
      sendSuccess(res, cameras, 200, meta);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const camera = await camerasService.getCameraById(req.params.id, req.user!.orgId);
      sendSuccess(res, camera);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const camera = await camerasService.createCamera(req.body, req.user!.orgId, req.user!.sub);
      sendCreated(res, camera);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const camera = await camerasService.updateCamera(req.params.id, req.body, req.user!.orgId, req.user!.sub);
      sendSuccess(res, camera);
    } catch (err) { next(err); }
  }

  async testConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await camerasService.testConnection(req.params.id, req.user!.orgId);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  }

  async getPreview(req: Request, res: Response, next: NextFunction) {
    try {
      const imageBuffer = await camerasService.getPreview(req.params.id, req.user!.orgId);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.send(imageBuffer);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await camerasService.deleteCamera(req.params.id, req.user!.orgId, req.user!.sub);
      sendNoContent(res);
    } catch (err) { next(err); }
  }

  async regenerateKey(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await camerasService.regenerateApiKey(req.params.id, req.user!.orgId, req.user!.sub);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  }
}

export const camerasController = new CamerasController();
