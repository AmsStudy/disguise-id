import { Router } from 'express';
import { iotController } from './iot.controller';
import { iotAuthenticate } from '../../middleware/iotAuth';

export const iotRouter = Router();

// Secure IoT routes with API Key
iotRouter.use(iotAuthenticate);

// GET /api/v1/iot/cameras
// Raspberry Pi calls this to get the list of active cameras to stream
iotRouter.get('/cameras', iotController.getActiveCameras);

// PATCH /api/v1/iot/cameras/:id/status
// Raspberry Pi can report if a camera stream is broken
iotRouter.patch('/cameras/:id/status', iotController.updateCameraStatus);
