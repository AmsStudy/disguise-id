import { Router } from 'express';
import { cameraAgentController } from './camera-agent.controller';
import { cameraAgentAuth } from '../../middleware/cameraApiKey.middleware';

export const cameraAgentRouter = Router();

// Agent endpoints
cameraAgentRouter.use(cameraAgentAuth);

cameraAgentRouter.get('/config', cameraAgentController.getConfig);
cameraAgentRouter.post('/heartbeat', cameraAgentController.reportHeartbeat);
cameraAgentRouter.post('/tracking', cameraAgentController.reportLiveTracking);
cameraAgentRouter.post('/trigger-alert', cameraAgentController.triggerAlert);
