import { Router } from 'express';
import { inferenceController } from './inference.controller';
import { authenticate } from '../../middleware/auth';
import { uploadFrame } from '../../utils/upload';
import { rateLimit } from 'express-rate-limit';

export const inferenceRouter = Router();

// Camera-specific rate limit
const cameraRateLimit = rateLimit({
  windowMs: 1000, // 1 second
  max: Number(process.env.RATE_LIMIT_CAMERA_MAX) || 30,
  keyGenerator: (req) => req.headers['x-api-key'] as string || req.ip || 'unknown',
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Camera frame rate limit exceeded' },
  },
});

// POST /inference/frame — API Key auth (no JWT)
inferenceRouter.post(
  '/frame',
  cameraRateLimit,
  uploadFrame.fields([
    { name: 'face_crop', maxCount: 1 },
    { name: 'frame_thumb', maxCount: 1 }
  ]),
  (req, res, next) => inferenceController.submitFrame(req, res, next)
);

// GET /inference/jobs/:jobId — JWT auth (for debugging)
inferenceRouter.get(
  '/jobs/:jobId',
  authenticate,
  (req, res, next) => inferenceController.getJobStatus(req, res, next)
);
