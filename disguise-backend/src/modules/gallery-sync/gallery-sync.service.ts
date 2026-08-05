import crypto from 'crypto';
import prisma from '../../config/database';
import { logger } from '../../config/logger';
import { badRequest } from '../../utils/AppError';

export interface DryRunReport {
  organizationId: string;
  proposedVersion: string;
  validCandidatesCount: number;
  pendingMappingsCount: number;
  orphanCandidates: Array<{
    galleryCandidateId: string;
  }>;
  missingPhotos: Array<{
    mappingId: string;
    galleryCandidateId: string;
    watchlistPersonId: string;
  }>;
  inactivePersons: Array<{
    mappingId: string;
    galleryCandidateId: string;
    watchlistPersonId: string;
  }>;
}

export class GallerySyncService {
  /**
   * Generates a dry-run report for what would be published to the V2 gallery.
   */
  static async dryRunSync(organizationId: string): Promise<DryRunReport> {
    // 1. Fetch all ACTIVE mappings for this organization
    const activeMappings = await prisma.mlV2CandidateMapping.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
      include: {
        watchlistPerson: {
          include: {
            photos: {
              where: { isPrimary: true },
            },
          },
        },
      },
    });

    const pendingMappingsCount = await prisma.mlV2CandidateMapping.count({
      where: {
        organizationId,
        status: 'PENDING',
      },
    });

    const mappedCandidateIds = await prisma.mlV2CandidateMapping.findMany({
      where: {
        organizationId,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
      select: { galleryCandidateId: true }
    });
    const mappedIds = mappedCandidateIds.map(m => m.galleryCandidateId);

    const orphanCandidatesResult = await prisma.mlV2GalleryCandidate.findMany({
      where: {
        organizationId,
        galleryCandidateId: { notIn: mappedIds }
      },
      select: { galleryCandidateId: true }
    });

    const report: DryRunReport = {
      organizationId,
      proposedVersion: this.generateVersionString(),
      validCandidatesCount: 0,
      pendingMappingsCount,
      orphanCandidates: orphanCandidatesResult,
      missingPhotos: [],
      inactivePersons: [],
    };

    for (const mapping of activeMappings) {
      const person = mapping.watchlistPerson;

      if (!person.isActive || person.deletedAt) {
        report.inactivePersons.push({
          mappingId: mapping.id,
          galleryCandidateId: mapping.galleryCandidateId,
          watchlistPersonId: person.id,
        });
        continue;
      }

      const primaryPhoto = person.photos[0];
      if (!primaryPhoto || !primaryPhoto.photoUrl) {
        report.missingPhotos.push({
          mappingId: mapping.id,
          galleryCandidateId: mapping.galleryCandidateId,
          watchlistPersonId: person.id,
        });
        continue;
      }

      report.validCandidatesCount++;
    }

    return report;
  }

  private static generateVersionString(): string {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
    const hash = crypto.randomBytes(4).toString('hex');
    return `v2_${timestamp}_${hash}`;
  }

  static async simulatePublishSync(organizationId: string, userId: string) {
    const dryRun = await this.dryRunSync(organizationId);

    // Create the gallery version record
    const version = await prisma.mlV2GalleryVersion.create({
      data: {
        organizationId,
        version: dryRun.proposedVersion,
        checksum: crypto.randomBytes(16).toString('hex'), // Mock checksum
        modelVersion: 'stage20b', // Should fetch from active model
        preprocessingVersion: '1.0',
        status: 'BUILDING',
        createdById: userId,
      },
    });

    // VALIDATED state
    await prisma.mlV2GalleryVersion.update({
      where: { id: version.id },
      data: { status: 'VALIDATED' },
    });

    // Terminate at READY state for simulation. Does not claim real V2 active activation.
    await prisma.mlV2GalleryVersion.update({
      where: { id: version.id },
      data: { status: 'READY' },
    });

    return {
      versionId: version.id,
      version: version.version,
      status: 'READY',
      activationMode: 'SIMULATED'
    };
  }

  static async simulateRollbackSync(organizationId: string, versionId: string, userId: string) {
    const versionToRollbackTo = await prisma.mlV2GalleryVersion.findUnique({
      where: { id: versionId },
    });

    if (!versionToRollbackTo || versionToRollbackTo.organizationId !== organizationId) {
      throw badRequest('INVALID_VERSION');
    }

    // Explicitly do nothing for simulation to avoid corrupting actual ACTIVE pointer
    return {
      versionId: versionToRollbackTo.id,
      activationMode: 'SIMULATED',
      stateChanged: false
    };
  }
}
