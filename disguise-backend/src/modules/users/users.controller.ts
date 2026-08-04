import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response';

export class UsersController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { users, meta } = await usersService.listUsers(req.user!.orgId, req.query as any);
      sendSuccess(res, users, 200, meta);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.getUserById(req.params.id, req.user!.orgId);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.createUser(req.body, req.user!.orgId, req.user!.sub);
      sendCreated(res, user);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.updateUser(req.params.id, req.body, req.user!.orgId, req.user!.sub);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.deleteUser(req.params.id, req.user!.orgId, req.user!.sub);
      sendNoContent(res);
    } catch (err) { next(err); }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.resetPassword(req.params.id, req.body, req.user!.orgId, req.user!.sub);
      sendSuccess(res, { message: 'Password reset successfully' });
    } catch (err) { next(err); }
  }
}

export const usersController = new UsersController();
