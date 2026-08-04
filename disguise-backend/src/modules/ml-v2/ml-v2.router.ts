import { Router } from 'express';
import { authenticate, authorize, requireOrg } from '../../middleware/auth';
import { getMlV2List, getMlV2Stats, getMlV2ByDetectionEventId, getMlV2ById } from './ml-v2.controller';

const router = Router();

// Ensure user is authenticated, has org context, and is an admin, operator, or investigator
router.use(authenticate);
router.use(requireOrg);
router.use(authorize('admin', 'operator', 'investigator'));

// ML V2 List & Stats Endpoints
router.get('/', getMlV2List);
router.get('/stats', getMlV2Stats);
router.get('/:id', getMlV2ById);

export { router as mlV2Router };

export const detectionEventMlV2Router = Router();

detectionEventMlV2Router.use(authenticate);
detectionEventMlV2Router.use(requireOrg);
detectionEventMlV2Router.use(authorize('admin', 'operator', 'investigator'));

detectionEventMlV2Router.get('/:id/ml-v2', getMlV2ByDetectionEventId);
