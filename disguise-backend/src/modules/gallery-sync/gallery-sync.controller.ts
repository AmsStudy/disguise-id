import { Request, Response, NextFunction } from 'express';
import { GallerySyncService } from './gallery-sync.service';
import { sendSuccess } from '../../utils/response';
import { badRequest } from '../../utils/AppError';
import prisma from '../../config/database';

export const dryRunSync = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      throw badRequest('Organization ID is required');
    }

    const report = await GallerySyncService.dryRunSync(orgId);
    sendSuccess(res, report, 200);
  } catch (error) {
    next(error);
  }
};

export const simulatePublishSync = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.sub;
    if (!orgId || !userId) {
      throw badRequest('Organization ID and User ID are required');
    }

    const result = await GallerySyncService.simulatePublishSync(orgId, userId);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
};

export const simulateRollbackSync = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.sub;
    const { versionId } = req.params;

    if (!orgId || !userId) {
      throw badRequest('Organization ID and User ID are required');
    }

    const result = await GallerySyncService.simulateRollbackSync(orgId, versionId, userId);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
};

export const getGalleryStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      throw badRequest('Organization ID is required');
    }

    const activeVersion = await prisma.mlV2GalleryVersion.findFirst({
      where: { organizationId: orgId, status: 'ACTIVE' },
      orderBy: { activatedAt: 'desc' },
      include: {
        _count: {
          select: { candidates: true },
        },
      },
    });

    const activeMappingsCount = await prisma.mlV2CandidateMapping.count({
      where: { organizationId: orgId, status: 'ACTIVE' },
    });

    const status = {
      activeVersion: activeVersion ? {
        id: activeVersion.id,
        version: activeVersion.version,
        activatedAt: activeVersion.activatedAt,
        candidatesCount: activeVersion._count.candidates,
      } : null,
      activeMappingsCount,
      isDriftDetected: activeVersion ? (activeVersion._count.candidates !== activeMappingsCount) : false,
    };

    sendSuccess(res, status, 200);
  } catch (error) {
    next(error);
  }
};
