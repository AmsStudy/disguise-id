import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { camerasService } from '../cameras/cameras.service';
import { uploadFile, BUCKETS } from '../../config/minio';
import { addInferenceJob, getJobStatus } from '../../queues';
import { generateFileKey } from '../../utils/helpers';
import { AppError, unauthorized, badRequest } from '../../utils/AppError';
import { sendSuccess } from '../../utils/response';
import { logger } from '../../config/logger';
import prisma from '../../config/database';

export class InferenceController {
  /**
   * POST /inference/frame
   * Camera submits a frame for processing
   */
  async submitFrame(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Get camera from middleware
      const camera = (req as any).camera;
      if (!camera) throw unauthorized('Camera context missing');

      // 2. Validate frame and crop files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const faceCrop = files?.['face_crop']?.[0];
      const frameThumb = files?.['frame_thumb']?.[0];

      if (!faceCrop || !frameThumb) {
        throw badRequest('Both face_crop and frame_thumb images are required');
      }

      const {
        capture_id,
        captured_at,
        confidence,
        bbox_x,
        bbox_y,
        bbox_w,
        bbox_h,
        frame_w,
        frame_h,
        face_index
      } = req.body;

      if (!capture_id) throw badRequest('capture_id is required');

      const fIndex = face_index || '0';
      const timestamp = captured_at || new Date().toISOString();
      const jobId = `${camera.id}:${capture_id}:${fIndex}`; // Canonical BullMQ Job ID

      // Guard: Max faces per capture (Phase 6A.5)
      const faceIndexInt = parseInt(fIndex, 10);
      if (faceIndexInt >= 10) { // MAX_FACES_PER_CAPTURE = 10
        throw badRequest('Max faces per capture exceeded');
      }

      // 4. Backpressure and flood protection (2-layer Redis lock)
      const redis = require('../../config/redis').getRedis();
      const activeCaptureKey = `camera-inference:${camera.id}:capture_id`;
      const pendingCountKey = `camera-inference:${camera.id}:count`;
      const samplingLockKey = `camera-capture:${camera.id}`;

      let activeCapture = await redis.get(activeCaptureKey);

      if (activeCapture && activeCapture !== capture_id) {
        throw new AppError('TOO_MANY_REQUESTS', 'Camera is processing another frame', 429);
      }

      if (activeCapture !== capture_id) {
        // Atomically attempt to make this capture_id the active one
        const acquired = await redis.set(activeCaptureKey, capture_id, 'NX', 'EX', 60);
        if (acquired) {
          // We are the first face of this new capture. Check sampling rate!
          const sampled = await redis.set(samplingLockKey, capture_id, 'NX', 'EX', 1);
          if (!sampled) {
            // Rate limit exceeded. Revert active capture.
            await redis.del(activeCaptureKey);
            throw new AppError('TOO_MANY_REQUESTS', 'Camera sampling limit exceeded', 429);
          }
          await redis.set(pendingCountKey, 0, 'EX', 60);
        } else {
          // Another face sneaked in. Verify it's ours.
          activeCapture = await redis.get(activeCaptureKey);
          if (activeCapture !== capture_id) {
            throw new AppError('TOO_MANY_REQUESTS', 'Camera is processing another frame', 429);
          }
        }
      }

      // We safely belong to the activeCapture now.
      await redis.incr(pendingCountKey);
      await redis.expire(pendingCountKey, 60);

      // 5. Upload files to MinIO
      const faceCropKey = generateFileKey('frames', faceCrop.originalname);
      const frameThumbKey = generateFileKey('frames', frameThumb.originalname);

      const [faceCropUrl, frameThumbUrl] = await Promise.all([
        uploadFile(BUCKETS.FRAMES, faceCropKey, faceCrop.buffer, faceCrop.mimetype),
        uploadFile(BUCKETS.FRAMES, frameThumbKey, frameThumb.buffer, frameThumb.mimetype)
      ]);

      // Pack them into metadata for the inference queue
      const metadata = {
        detected_at: timestamp,
        confidence: parseFloat(confidence),
        face_index: parseInt(fIndex, 10),
        bbox: {
          x: parseInt(bbox_x, 10),
          y: parseInt(bbox_y, 10),
          w: parseInt(bbox_w, 10),
          h: parseInt(bbox_h, 10)
        },
        frame_dimensions: {
          w: parseInt(frame_w, 10),
          h: parseInt(frame_h, 10)
        }
      };

      // 6. Enqueue inference job (BullMQ uses jobId for deduplication)

      await addInferenceJob({
        jobId,
        frameKey: faceCropKey,
        frameUrl: faceCropUrl,
        cameraId: camera.id,
        orgId: camera.organizationId,
        threshold: Number(camera.threshold),
        modelVersion: camera.modelVersion,
        timestamp,
        captureId: capture_id,
        metadata: {
          ...metadata,
          frameThumbKey,
          frameThumbUrl,
          faceCropUrl,
        },
      });

      logger.info('Frame queued for inference', {
        jobId,
        cameraId: camera.id,
        orgId: camera.organizationId,
      });

      // 6. Return 202 immediately (async processing)
      res.status(202).json({
        success: true,
        data: {
          job_id: jobId,
          status: 'queued',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /inference/jobs/:jobId
   * Check status of an inference job
   */
  async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const status = await getJobStatus(jobId);

      if (!status) {
        res.status(404).json({
          success: false,
          error: { code: 'JOB_NOT_FOUND', message: 'Job not found or already removed' },
        });
        return;
      }

      sendSuccess(res, status);
    } catch (err) {
      next(err);
    }
  }
}

export const inferenceController = new InferenceController();
