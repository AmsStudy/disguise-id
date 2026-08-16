import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import prisma from '../../config/database';
import { notFound } from '../../utils/AppError';

export const watchlistMobileRouter = Router();

// GET /watchlist
watchlistMobileRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      
      const persons = await prisma.watchlistPerson.findMany({
        where: {
          organizationId: orgId,
          isActive: true,
          deletedAt: null
        }
      });
      
      const mobileData = persons.map(p => ({
        id: p.id,
        full_name: p.fullName,
        danger_level: p.dangerLevel,
        photo_url: p.photoUrl || '',
        case_number: p.caseReference || 'N/A'
      }));
      
      sendSuccess(res, mobileData);
    } catch (err) {
      next(err);
    }
  }
);

// GET /watchlist/:id/trail
watchlistMobileRouter.get(
  '/:id/trail',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      const { id } = req.params;
      
      const person = await prisma.watchlistPerson.findFirst({
        where: { id, organizationId: orgId }
      });
      
      if (!person) throw notFound('Person');
      
      // Get trail from alerts sorted ascending
      const alerts = await prisma.alert.findMany({
        where: {
          personId: id,
          organizationId: orgId,
          // optionally only get confirmed/pending alerts
          status: { in: ['pending', 'confirmed'] } 
        },
        include: {
          detectionEvent: {
            include: {
              source: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      const trail = alerts
        .filter(a => a.detectionEvent?.source?.latitude && a.detectionEvent?.source?.longitude)
        .map(a => ({
          alert_id: a.id,
          detected_at: a.createdAt,
          camera: {
            name: a.detectionEvent?.source?.name || 'Unknown',
            latitude: Number(a.detectionEvent?.source?.latitude),
            longitude: Number(a.detectionEvent?.source?.longitude)
          }
        }));
      
      sendSuccess(res, trail);
    } catch (err) {
      next(err);
    }
  }
);
