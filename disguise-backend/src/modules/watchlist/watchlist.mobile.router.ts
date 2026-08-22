import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import prisma from '../../config/database';
import { notFound } from '../../utils/AppError';
import { formatBiometricScore } from '../../utils/biometric';

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

// GET /watchlist/:id
watchlistMobileRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      const { id } = req.params;

      const person = await prisma.watchlistPerson.findFirst({
        where: { id, organizationId: orgId, deletedAt: null },
        include: {
          photos: { select: { id: true, photoUrl: true, isPrimary: true } }
        }
      });

      if (!person) throw notFound('Person');

      const mobileData = {
        id: person.id,
        full_name: person.fullName,
        danger_level: person.dangerLevel,
        photo_url: person.photoUrl || '',
        case_number: person.caseReference || 'N/A',
        notes: person.description || '',
        aliases: person.alias || [],
        photos: person.photos.map(p => ({ id: p.id, url: p.photoUrl, is_primary: p.isPrimary })),
        created_at: person.createdAt
      };

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
      
      const trail = alerts.map(a => {
        const scoreInfo = formatBiometricScore(a.similarityScore);
        return {
          alert_id: a.id,
          detected_at: a.createdAt,
          status: a.status,
          score: {
            raw: scoreInfo.percentage / 100,
            distance: scoreInfo.distance,
            display_text: scoreInfo.display_text,
            confidence_band: scoreInfo.confidence_band,
            tier_label: scoreInfo.tier_label
          },
          camera: {
            id: a.detectionEvent?.source?.id || '',
            name: a.detectionEvent?.source?.name || 'Unknown',
            location_name: a.detectionEvent?.source?.locationName || '',
            latitude: a.detectionEvent?.source?.latitude ? Number(a.detectionEvent.source.latitude) : null,
            longitude: a.detectionEvent?.source?.longitude ? Number(a.detectionEvent.source.longitude) : null
          }
        };
      });
      
      sendSuccess(res, trail);
    } catch (err) {
      next(err);
    }
  }
);
