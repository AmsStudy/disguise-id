import { Request, Response, NextFunction } from 'express';
import { CandidateMappingService } from './candidate-mapping.service';
import { sendSuccess } from '../../utils/response';
import { badRequest } from '../../utils/AppError';

export const createMapping = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.sub;
    const { watchlistPersonId, proposalReason, galleryCandidateId } = req.body;

    if (!orgId || !userId) {
      throw badRequest('Organization ID and User ID are required');
    }

    if (!watchlistPersonId) {
      throw badRequest('Watchlist Person ID is required');
    }

    const mapping = await CandidateMappingService.createMapping(
      orgId,
      watchlistPersonId,
      userId,
      proposalReason,
      galleryCandidateId
    );

    sendSuccess(res, mapping, 201);
  } catch (error) {
    next(error);
  }
};

export const revokeMapping = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.sub;
    const { id } = req.params;
    const { revocationReason } = req.body;

    if (!orgId || !userId) {
      throw badRequest('Organization ID and User ID are required');
    }

    const mapping = await CandidateMappingService.revokeMapping(id, orgId, userId, revocationReason);
    sendSuccess(res, mapping, 200);
  } catch (error) {
    next(error);
  }
};

export const approveMapping = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.sub;
    const { id } = req.params;

    if (!orgId || !userId) {
      throw badRequest('Organization ID and User ID are required');
    }

    const mapping = await CandidateMappingService.approveMapping(id, orgId, userId);
    sendSuccess(res, mapping, 200);
  } catch (error) {
    next(error);
  }
};

export const rejectMapping = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.sub;
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!orgId || !userId) {
      throw badRequest('Organization ID and User ID are required');
    }

    const mapping = await CandidateMappingService.rejectMapping(id, orgId, userId, rejectionReason);
    sendSuccess(res, mapping, 200);
  } catch (error) {
    next(error);
  }
};

export const getMappings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      throw badRequest('Organization ID is required');
    }

    const mappings = await CandidateMappingService.getMappings(orgId);
    sendSuccess(res, mappings, 200);
  } catch (error) {
    next(error);
  }
};
