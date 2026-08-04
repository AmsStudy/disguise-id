import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/response';

export const iotController = {
  /**
   * Get all active cameras for the IoT device (Raspberry Pi)
   * This provides the stream URL, credentials, and configuration needed to connect to MediaMTX
   */
  async getActiveCameras(req: Request, res: Response, next: NextFunction) {
    try {
      // The IoT middleware sets req.user
      const orgId = req.user!.orgId;

      const cameras = await prisma.cctvSource.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null, // Fetch all active (non-deleted) camera sources to allow continuous streaming and reconnects
        },
        select: {
          id: true,
          name: true,
          locationName: true,
          ipAddress: true,
          username: true,
          password: true,
          streamUrl: true,
          threshold: true,
          status: true,
        },
      });

      sendSuccess(res, cameras);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update camera status (e.g., if Raspberry Pi detects a camera is offline)
   */
  async updateCameraStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const orgId = req.user!.orgId;

      if (!['online', 'offline', 'error'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      const updated = await prisma.cctvSource.updateMany({
        where: {
          id,
          organizationId: orgId,
        },
        data: { status },
      });

      sendSuccess(res, { updated: updated.count });
    } catch (err) {
      next(err);
    }
  }
};
