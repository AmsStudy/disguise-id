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
