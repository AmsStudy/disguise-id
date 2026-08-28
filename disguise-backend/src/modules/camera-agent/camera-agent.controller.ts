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
        cameraId: fullCamera.id,
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

  async reportLiveTracking(req: Request, res: Response, next: NextFunction) {
    try {
      const camera = (req as any).camera;
      if (!camera) throw notFound('Camera context missing');

      // req.body should contain { bboxes: [[x,y,w,h], ...], timestamp: string, frame_w: number, frame_h: number }
      // We will just emit this directly to the Socket.IO room for this camera
      const { emitDetectionLive } = require('../../sockets');
      
      emitDetectionLive(camera.id, {
        cameraId: camera.id,
        timestamp: req.body.timestamp || new Date().toISOString(),
        bboxes: req.body.bboxes || [],
        frameWidth: req.body.frame_w || 1920,
        frameHeight: req.body.frame_h || 1080
      });

      sendSuccess(res, { ok: true });
    } catch (err) {
      next(err);
    }
  }

  async triggerAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const camera = (req as any).camera;
      if (!camera) throw notFound('Camera context missing');

      const { person_name, similarity = 0.95, face_crop_url, frame_url } = req.body;
      
      const person = await prisma.watchlistPerson.findFirst({
        where: {
          fullName: { contains: person_name || 'Aan', mode: 'insensitive' }
        }
      });

      if (!person) throw notFound('Person not found in watchlist');

      const targetFaceCrop = face_crop_url || 'http://localhost:9000/cctv-frames/frames/2026/08/27/3bfffb63-12bf-42e1-b523-079a89a375f3.jpg';
      const targetFrameUrl = frame_url || 'http://localhost:9000/cctv-frames/frames/2026/08/27/fead997c-beb1-4424-bc31-b217a7aebf41.jpg';

      // Create detection event
      const detectionEvent = await prisma.detectionEvent.create({
        data: {
          organizationId: camera.organizationId,
          sourceId: camera.id,
          frameUrl: targetFrameUrl,
          faceCropUrl: targetFaceCrop,
          bestMatchId: person.id,
          bestMatchSim: Number(similarity),
          isMatch: true,
          processingMs: 120,
          modelVersion: 'stage20b-seed2026-arcface-buffalo_l',
          metadata: {
            tier: 'TINGGI',
            confidence: Number(similarity),
            margin_pct: 95.0,
            faceCropUrl: targetFaceCrop,
            frameThumbUrl: targetFrameUrl,
            top_candidates: [
              {
                id: person.id,
                name: person.fullName,
                distance: 1.0 - Number(similarity),
                similarity: Number(similarity)
              }
            ]
          }
        }
      });

      // Create alert
      const alert = await prisma.alert.create({
        data: {
          organizationId: camera.organizationId,
          detectionEventId: detectionEvent.id,
          personId: person.id,
          similarityScore: Number(similarity),
          priority: Number(similarity) >= 0.85 ? 'critical' : 'high',
          status: 'pending'
        },
        include: {
          person: true,
          detectionEvent: {
            include: {
              source: true
            }
          }
        }
      });

      // Emit Socket.IO event to org room and mobile
      const { emitAlertNew, emitDetectionLive } = require('../../sockets');
      const { mapAlertToMobile } = require('../alerts/alerts.mobile.mapper');
      const mobileAlert = mapAlertToMobile(alert);

      emitAlertNew(camera.organizationId, {
        ...mobileAlert,
        tier: 'TINGGI',
        distance: 1.0 - Number(similarity),
        margin_pct: 95.0,
        top_candidates: [
          {
            id: person.id,
            name: person.fullName,
            distance: 1.0 - Number(similarity),
            similarity: Number(similarity)
          }
        ],
        alert: {
          id: alert.id,
          status: alert.status,
          priority: alert.priority,
          similarityScore: alert.similarityScore,
          createdAt: alert.createdAt
        },
        person: {
          ...alert.person,
          photo_url: alert.person.photoUrl,
        },
        camera: alert.detectionEvent.source,
        detection: {
          faceCropUrl: targetFaceCrop,
          frameUrl: targetFrameUrl,
          detectedAt: detectionEvent.detectedAt
        }
      });

      emitDetectionLive(camera.id, {
        cameraId: camera.id,
        timestamp: new Date().toISOString(),
        bboxes: [
          {
            x: 820,
            y: 340,
            w: 260,
            h: 300,
            is_match: true,
            person_name: person.fullName,
            similarity: Number(similarity)
          }
        ],
        frameWidth: 1920,
        frameHeight: 1080
      });

      sendSuccess(res, { alert_id: alert.id, person: person.fullName, similarity });
    } catch (err) {
      next(err);
    }
  }
}

export const cameraAgentController = new CameraAgentController();
