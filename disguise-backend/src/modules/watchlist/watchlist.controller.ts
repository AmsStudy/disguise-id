import { Request, Response, NextFunction } from 'express';
import { watchlistService } from './watchlist.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response';
import { badRequest } from '../../utils/AppError';

export class WatchlistController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { persons, meta } = await watchlistService.listPersons(req.user!.orgId, req.query as any);
      sendSuccess(res, persons, 200, meta);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const person = await watchlistService.getPersonById(req.params.id, req.user!.orgId);
      sendSuccess(res, person);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const photoFile = req.file;
      const person = await watchlistService.createPerson(
        req.body,
        req.user!.orgId,
        req.user!.sub,
        photoFile
      );
      sendCreated(res, person);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const person = await watchlistService.updatePerson(
        req.params.id,
        req.body,
        req.user!.orgId,
        req.user!.sub,
        req.file
      );
      sendSuccess(res, person);
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await watchlistService.deletePerson(req.params.id, req.user!.orgId, req.user!.sub);
      sendNoContent(res);
    } catch (err) { next(err); }
  }

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      await watchlistService.deactivatePerson(req.params.id, req.user!.orgId, req.user!.sub);
      sendSuccess(res, { message: 'Person deactivated from active watchlist' });
    } catch (err) { next(err); }
  }

  async addPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const photoFile = req.file;
      if (!photoFile) throw badRequest('Photo file is required');

      const isPrimary = req.body.is_primary === 'true';
      const photo = await watchlistService.addPhoto(
        req.params.id,
        req.user!.orgId,
        req.user!.sub,
        photoFile,
        isPrimary
      );
      sendCreated(res, photo);
    } catch (err) { next(err); }
  }

  async deletePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      await watchlistService.deletePhoto(req.params.id, req.params.photoId, req.user!.orgId);
      sendNoContent(res);
    } catch (err) { next(err); }
  }
}

export const watchlistController = new WatchlistController();
