import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { getPaginationParams, paginate } from '../../utils/response';
import { z } from 'zod';

export const auditRouter = Router();

const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  user_id: z.string().uuid().optional(),
  action: z.string().optional(),
  resource_type: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

auditRouter.use(authenticate);
auditRouter.use(authorize('admin', 'super_admin', 'operator', 'investigator'));

auditRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = querySchema.parse(req.query);
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const where: any = {
      organizationId: req.user!.orgId,
      ...(query.user_id && { userId: query.user_id }),
      ...(query.action && { action: { contains: query.action, mode: 'insensitive' as const } }),
      ...(query.resource_type && { resourceType: query.resource_type }),
      ...(query.search && {
        OR: [
          { action: { contains: query.search, mode: 'insensitive' as const } },
          { resourceType: { contains: query.search, mode: 'insensitive' as const } },
          { resourceId: { contains: query.search, mode: 'insensitive' as const } },
          { user: { fullName: { contains: query.search, mode: 'insensitive' as const } } },
        ],
      }),
      ...(query.date_from || query.date_to
        ? {
            createdAt: {
              ...(query.date_from && { gte: new Date(query.date_from) }),
              ...(query.date_to && { lte: new Date(query.date_to) }),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    sendSuccess(res, logs.map((l) => ({ ...l, id: l.id.toString() })), 200, paginate(page, limit, total));
  } catch (err) { next(err); }
});
