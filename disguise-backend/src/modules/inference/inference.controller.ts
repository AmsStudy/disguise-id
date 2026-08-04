import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { camerasService } from '../cameras/cameras.service';
import { uploadFile, BUCKETS } from '../../config/minio';
import { addInferenceJob, getJobStatus } from '../../queues';
import { generateFileKey } from '../../utils/helpers';
import { unauthorized, badRequest } from '../../utils/AppError';
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
      // 1. Validate API key and find camera
      const apiKey = req.headers['x-api-key'] as string;
      if (!apiKey) throw unauthorized('Missing X-Api-Key header');

      let camera: any = null;
      const validIotKey = process.env.IOT_API_KEY || 'disguise-iot-secret-key-2026';

      // Support multi-camera IoT orchestrator (v2 script) using IOT_API_KEY + camera_id in form data
      if (apiKey === validIotKey && req.body.camera_id) {
        camera = await prisma.cctvSource.findFirst({
          where: { id: req.body.camera_id, deletedAt: null },
          select: { id: true, organizationId: true, threshold: true, modelVersion: true, status: true }
        });
      } else {
        // Support single-camera standalone agent (v1 script) using individual camera API key
        camera = await camerasService.findByApiKey(apiKey);
      }

      if (!camera) throw unauthorized('Invalid API key or Camera ID');

      // 2. Validate frame and crop files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const faceCrop = files?.['face_crop']?.[0];
      const frameThumb = files?.['frame_thumb']?.[0];

      if (!faceCrop || !frameThumb) {
        throw badRequest('Both face_crop and frame_thumb images are required');
      }

      // 3. Upload files to MinIO
      const faceCropKey = generateFileKey('frames', faceCrop.originalname);
      const frameThumbKey = generateFileKey('frames', frameThumb.originalname);
      
      const [faceCropUrl, frameThumbUrl] = await Promise.all([
        uploadFile(BUCKETS.FRAMES, faceCropKey, faceCrop.buffer, faceCrop.mimetype),
        uploadFile(BUCKETS.FRAMES, frameThumbKey, frameThumb.buffer, frameThumb.mimetype)
      ]);

      // 4. Parse text fields from request
      const {
        detected_at,
        confidence,
        bbox_x,
        bbox_y,
        bbox_w,
        bbox_h,
        frame_w,
        frame_h
      } = req.body;

      // Pack them into metadata for the inference queue
      const metadata = {
        detected_at,
        confidence: parseFloat(confidence),
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

      // 5. Enqueue inference job
      const jobId = uuidv4();
      const timestamp = detected_at || new Date().toISOString();

      await addInferenceJob({
        jobId,
        frameKey: faceCropKey, // For backward compatibility or you can use frameThumbKey
        frameUrl: faceCropUrl,
        cameraId: camera.id,
        orgId: camera.organizationId,
        threshold: Number(camera.threshold),
        modelVersion: camera.modelVersion,
        timestamp,
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
