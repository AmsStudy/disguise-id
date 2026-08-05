import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { dryRunSync, simulatePublishSync, simulateRollbackSync, getGalleryStatus } from './gallery-sync.controller';

const router = Router();

router.use(authenticate);

router.get('/status', authorize('admin', 'investigator'), getGalleryStatus);

// Investigators and admins can run a dry-run sync
router.post('/sync/dry-run', authorize('admin', 'investigator'), dryRunSync);

// Only admins can publish and rollback
router.post('/versions/simulate-publish', authorize('admin'), simulatePublishSync);
router.post('/versions/:versionId/simulate-rollback', authorize('admin'), simulateRollbackSync);

export default router;
