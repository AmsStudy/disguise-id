import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import prisma from '../../config/database';
import { CameraCredentialEncryption } from '../../utils/cameraCredentialEncryption';
import { cameraHealthService } from '../cameras/camera-health.service';
import { notFound, badRequest } from '../../utils/AppError';

export class CameraAgentController {
  async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const camera = (req as any).camera; // injected by cameraAgentAuth middleware
      if (!camera) {
        throw notFound('Camera context missing');
      }

      // We re-fetch to ensure we have the latest streamUrl and password.
      // Wait, we can just use the fetched camera if it has everything, but cameraAgentAuth only selects a few fields for speed.
      const fullCamera = await prisma.cctvSource.findUnique({
        where: { id: camera.id },
      });

      if (!fullCamera) throw notFound('Camera not found');

      // The ETag logic could go here, for now we will just return the config version based on updated_at
      const configVersion = fullCamera.updatedAt.getTime().toString();
      
      const clientETag = req.headers['if-none-match'];
      if (clientETag === configVersion) {
        return res.status(304).send();
      }

      // Set ETag
      res.setHeader('ETag', configVersion);
      res.setHeader('Cache-Control', 'no-store'); // Secure credential delivery

      let username = fullCamera.username;
      let password = fullCamera.password;
      
      if (password && CameraCredentialEncryption.isEncrypted(password)) {
        password = CameraCredentialEncryption.decrypt(password, fullCamera.organizationId, fullCamera.id);
      }

      const configResponse = {
        configVersion,
        updatedAt: fullCamera.updatedAt.toISOString(),
        enabled: fullCamera.status !== 'disabled' && fullCamera.status !== 'credentials_required',
        sampleFps: 1, // Defaulting to 1 FPS for this project phase
        credentials: {
          streamUrl: fullCamera.streamUrl,
          username,
          password
        },
        modelParams: {
          modelVersion: fullCamera.modelVersion,
          threshold: Number(fullCamera.threshold)
        }
      };

      sendSuccess(res, configResponse);
    } catch (err) {
      next(err);
    }
  }

  async reportHeartbeat(req: Request, res: Response, next: NextFunction) {
    try {
      const camera = (req as any).camera;
      if (!camera) {
        throw notFound('Camera context missing');
      }

      await cameraHealthService.reportHeartbeat(camera.id, req.body);
      
      // We can also return a hint if the config has changed
      sendSuccess(res, { message: 'Heartbeat recorded' });
    } catch (err) {
      next(err);
    }
  }
}

export const cameraAgentController = new CameraAgentController();
