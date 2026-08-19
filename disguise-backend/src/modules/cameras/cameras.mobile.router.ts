import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import prisma from '../../config/database';

export const camerasMobileRouter = Router();

// GET /cameras/map
camerasMobileRouter.get(
  '/map',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      
      const cameras = await prisma.cctvSource.findMany({
        where: {
          organizationId: orgId,
          latitude: { not: null },
          longitude: { not: null },
        }
      });
      
      const mobileData = cameras.map(cam => ({
        id: cam.id,
        name: cam.name,
        location_name: cam.locationName || '',
        zone_name: 'Area', // If you add zoneName to schema, map it here
        floor_level: 'Lantai 1', // Mock for now
        latitude: Number(cam.latitude),
        longitude: Number(cam.longitude)
      }));
      
      sendSuccess(res, mobileData);
    } catch (err) {
      next(err);
    }
  }
);

// GET /cameras/:id/preview
camerasMobileRouter.get(
  '/:id/preview',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      const { id } = req.params;

      const camera = await prisma.cctvSource.findFirst({
        where: { id, organizationId: orgId, deletedAt: null },
      });

      if (!camera) {
        res.status(404).json({ error: 'Camera not found' });
        return;
      }

      // Check if there is a recent detection frame or snapshot
      const recentEvent = await prisma.detectionEvent.findFirst({
        where: { sourceId: id, organizationId: orgId },
        orderBy: { detectedAt: 'desc' },
        select: { frameUrl: true, faceCropUrl: true },
      });

      if (recentEvent?.frameUrl || recentEvent?.faceCropUrl) {
        res.redirect(recentEvent.frameUrl || recentEvent.faceCropUrl!);
        return;
      }

      // Fallback 1x1 grey JPEG
      const fallbackJpeg = Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
        'base64'
      );
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.send(fallbackJpeg);
    } catch (err) {
      next(err);
    }
  }
);
