import { Router } from 'express';
import { cameraAgentController } from './camera-agent.controller';
import { cameraAgentAuth } from '../../middleware/cameraApiKey.middleware';

export const cameraAgentRouter = Router();

// Agent endpoints
cameraAgentRouter.use(cameraAgentAuth);

cameraAgentRouter.get('/config', cameraAgentController.getConfig);
cameraAgentRouter.post('/heartbeat', cameraAgentController.reportHeartbeat);
