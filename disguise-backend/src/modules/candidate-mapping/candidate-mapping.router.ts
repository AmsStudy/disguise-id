import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { createMapping, revokeMapping, getMappings, approveMapping, rejectMapping } from './candidate-mapping.controller';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'investigator'), getMappings);
router.post('/', authorize('admin', 'investigator'), createMapping);

// Checkers (admins)
router.post('/:id/approve', authorize('admin'), approveMapping);
router.post('/:id/reject', authorize('admin'), rejectMapping);

// Admins or investigators can revoke active mappings depending on rules, let's keep as is
router.post('/:id/revoke', authorize('admin', 'investigator'), revokeMapping);

export default router;
