import { Router } from 'express';
import { systemController } from './system.controller';
import { authenticate } from '../../middleware/auth';

export const systemRouter = Router();

// Requires standard user authentication
systemRouter.use(authenticate);

systemRouter.get('/mediamtx/health', systemController.getMediaMtxHealth);
