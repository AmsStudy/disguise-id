import { Request, Response, NextFunction } from 'express';
import { casesService } from './cases.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export class CasesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { cases, meta } = await casesService.listCases(req.user!.orgId, req.query as any);
      sendSuccess(res, cases, 200, meta);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const caseRecord = await casesService.getCaseById(req.params.id, req.user!.orgId);
      sendSuccess(res, caseRecord);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const newCase = await casesService.createCase(req.body, req.user!.orgId, req.user!.sub);
      sendCreated(res, newCase);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await casesService.updateCase(req.params.id, req.body, req.user!.orgId, req.user!.sub);
      sendSuccess(res, updated);
    } catch (err) { next(err); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await casesService.updateCaseStatus(req.params.id, req.body, req.user!.orgId, req.user!.sub);
      sendSuccess(res, updated);
    } catch (err) { next(err); }
  }

  async addAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await casesService.addAlerts(req.params.id, req.body, req.user!.orgId, req.user!.sub);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  }

  async addNote(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const note = await casesService.addNote(req.params.id, req.body, req.user!.orgId, req.user!.sub, files);
      sendCreated(res, note);
    } catch (err) { next(err); }
  }
}

export const casesController = new CasesController();
