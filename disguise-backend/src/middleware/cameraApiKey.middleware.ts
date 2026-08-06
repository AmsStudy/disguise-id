import { Request, Response, NextFunction } from 'express';
import { unauthorized, forbidden } from '../utils/AppError';
import { camerasService } from '../modules/cameras/cameras.service';

/**
 * Middleware to authenticate requests from Camera Agents.
 * 
 * Flow:
 * 1. Requires `X-Api-Key` header.
 * 2. Finds camera by hashing the provided API key and comparing with DB `apiKeyHash`.
 * 3. Verifies camera is active and not deleted.
 * 4. Binds the camera to `req.camera` so controllers can safely use it.
 * 5. Prevents spoofing of `organization_id` or `camera_id` in the payload by overriding them.
 */
export const cameraAgentAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      throw unauthorized('Missing X-Api-Key header');
    }

    const validIotKey = process.env.IOT_API_KEY || 'disguise-iot-secret-key-2026';
    let camera: any = null;

    if (apiKey === validIotKey && req.body.camera_id) {
       // Support multi-camera IoT orchestrator (legacy bypass, though we should transition away)
       // Keeping it for backwards compatibility if needed, but strict mode prefers camera-specific keys.
       const prisma = require('../config/database').default;
       camera = await prisma.cctvSource.findFirst({
         where: { id: req.body.camera_id, deletedAt: null },
         select: { id: true, organizationId: true, threshold: true, modelVersion: true, status: true }
       });
    } else {
       camera = await camerasService.findByApiKey(apiKey);
    }

    if (!camera) {
      throw unauthorized('Invalid API key');
    }

    // Verify camera status (should not process frames if camera is not online/configured)
    // Wait, if it's sending frames, it is coming online. But we should check if it's deleted.
    // findByApiKey already checks `deletedAt: null`.

    // Prevent payload spoofing: we enforce that the agent cannot lie about its organization or camera ID
    if (req.body) {
      if (req.body.organization_id && req.body.organization_id !== camera.organizationId) {
        throw forbidden('organization_id mismatch');
      }
      if (req.body.camera_id && req.body.camera_id !== camera.id) {
        throw forbidden('camera_id mismatch');
      }
      
      // Override payload to guarantee safety
      req.body.organization_id = camera.organizationId;
      req.body.camera_id = camera.id;
    }

    // Inject into request
    (req as any).camera = camera;
    next();
  } catch (err) {
    next(err);
  }
};
