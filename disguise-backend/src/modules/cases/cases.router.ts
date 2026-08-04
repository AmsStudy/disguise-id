import { Router } from 'express';
import { casesController } from './cases.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadAttachment } from '../../utils/upload';
import {
  createCaseSchema,
  updateCaseSchema,
  updateCaseStatusSchema,
  addAlertsToCaseSchema,
  addCaseNoteSchema,
  listCasesQuerySchema,
} from './cases.schema';

export const casesRouter = Router();

casesRouter.use(authenticate);
casesRouter.use(authorize('investigator', 'admin', 'super_admin'));

// GET /cases
casesRouter.get(
  '/',
  validate(listCasesQuerySchema, 'query'),
  (req, res, next) => casesController.list(req, res, next)
);

// POST /cases
casesRouter.post(
  '/',
  validate(createCaseSchema),
  (req, res, next) => casesController.create(req, res, next)
);

// GET /cases/:id
casesRouter.get('/:id', (req, res, next) => casesController.getById(req, res, next));

// PATCH /cases/:id
casesRouter.patch(
  '/:id',
  validate(updateCaseSchema),
  (req, res, next) => casesController.update(req, res, next)
);

// PATCH /cases/:id/status
casesRouter.patch(
  '/:id/status',
  validate(updateCaseStatusSchema),
  (req, res, next) => casesController.updateStatus(req, res, next)
);

// POST /cases/:id/alerts
casesRouter.post(
  '/:id/alerts',
  validate(addAlertsToCaseSchema),
  (req, res, next) => casesController.addAlerts(req, res, next)
);

// POST /cases/:id/notes
casesRouter.post(
  '/:id/notes',
  uploadAttachment.array('attachments', 5),
  validate(addCaseNoteSchema),
  (req, res, next) => casesController.addNote(req, res, next)
);
