import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate, authorize } from '../../middleware/auth';

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);
analyticsRouter.use(authorize('admin', 'operator', 'super_admin'));

analyticsRouter.get('/dashboard', (req, res, next) => analyticsController.getDashboard(req, res, next));
analyticsRouter.get('/detections', (req, res, next) => analyticsController.getDetections(req, res, next));
analyticsRouter.get('/performance', (req, res, next) => analyticsController.getPerformance(req, res, next));
