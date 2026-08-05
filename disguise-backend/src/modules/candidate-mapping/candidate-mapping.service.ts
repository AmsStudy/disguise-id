import prisma from '../../config/database';
import { badRequest, forbidden, AppError } from '../../utils/AppError';

export class CandidateMappingService {
  static async createMapping(
    organizationId: string,
    watchlistPersonId: string,
    proposedById: string,
    proposalReason?: string,
    galleryCandidateId?: string
  ) {
    // Rely on database partial unique index, but we can keep the application-level check for friendlier errors
    const existing = await prisma.mlV2CandidateMapping.findFirst({
      where: {
        organizationId,
        watchlistPersonId,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
    });

    if (existing) {
      throw badRequest('An active or pending mapping already exists for this person');
    }

    let resolvedCandidateId = galleryCandidateId;

    if (!resolvedCandidateId) {
      // Check if we already have a gallery candidate for this person in this org
      let candidate = await prisma.mlV2GalleryCandidate.findFirst({
        where: {
          organizationId,
          sourcePersonId: watchlistPersonId,
          status: 'ACTIVE',
        },
      });

      if (!candidate) {
        candidate = await prisma.mlV2GalleryCandidate.create({
          data: {
            organizationId,
            sourcePersonId: watchlistPersonId,
            status: 'ACTIVE',
          },
        });
      }
      resolvedCandidateId = candidate.galleryCandidateId;
    }

    // Create the mapping as PENDING
    try {
      const mapping = await prisma.mlV2CandidateMapping.create({
        data: {
          organizationId,
          watchlistPersonId,
          galleryCandidateId: resolvedCandidateId,
          proposedById,
          proposalReason,
          status: 'PENDING',
        },
      });
      return mapping;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError('CANDIDATE_MAPPING_CONFLICT', 'A pending or active mapping already exists for this candidate', 409);
      }
      throw error;
    }
  }

  static async approveMapping(
    id: string,
    organizationId: string,
    approvedById: string
  ) {
    const mapping = await prisma.mlV2CandidateMapping.findUnique({
      where: { id },
    });

    if (!mapping || mapping.organizationId !== organizationId) {
      throw badRequest('Mapping not found');
    }

    if (mapping.status !== 'PENDING') {
      throw badRequest('Only PENDING mappings can be approved');
    }

    // Maker-Checker: strictly block self-approval
    if (mapping.proposedById === approvedById) {
       throw forbidden('Proposer cannot approve their own mapping');
    }

    return prisma.mlV2CandidateMapping.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedById,
        approvedAt: new Date(),
      },
    });
  }

  static async rejectMapping(
    id: string,
    organizationId: string,
    rejectedById: string,
    rejectionReason?: string
  ) {
    const mapping = await prisma.mlV2CandidateMapping.findUnique({
      where: { id },
    });

    if (!mapping || mapping.organizationId !== organizationId) {
      throw badRequest('Mapping not found');
    }

    if (mapping.status !== 'PENDING') {
      throw badRequest('Only PENDING mappings can be rejected');
    }

    return prisma.mlV2CandidateMapping.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedById,
        rejectedAt: new Date(),
        rejectionReason,
      },
    });
  }

  static async revokeMapping(
    id: string,
    organizationId: string,
    revokedById: string,
    revocationReason?: string
  ) {
    const mapping = await prisma.mlV2CandidateMapping.findUnique({
      where: { id },
    });

    if (!mapping || mapping.organizationId !== organizationId) {
      throw badRequest('Mapping not found');
    }

    if (mapping.status === 'PENDING') {
      throw new AppError('CONFLICT', 'PENDING mappings cannot be revoked. Proposer withdrawal is currently unsupported.', 409);
    }

    if (mapping.status !== 'ACTIVE') {
      throw badRequest('Only ACTIVE mappings can be revoked');
    }

    return prisma.mlV2CandidateMapping.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedById,
        revokedAt: new Date(),
        revocationReason,
      },
    });
  }

  static async getMappings(organizationId: string) {
    return prisma.mlV2CandidateMapping.findMany({
      where: { organizationId },
      include: {
        watchlistPerson: true,
      },
      orderBy: { proposedAt: 'desc' },
    });
  }
}
