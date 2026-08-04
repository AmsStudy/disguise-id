import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { uploadFile, BUCKETS } from '../../config/minio';
import { mlService } from '../../utils/mlServiceClient';

import { generateFileKey } from '../../utils/helpers';
import { notFound, badRequest } from '../../utils/AppError';
import { getPaginationParams, paginate } from '../../utils/response';
import { CreatePersonInput, UpdatePersonInput, ListWatchlistQuery } from './watchlist.schema';
import { logger } from '../../config/logger';

const PERSON_SELECT = {
  id: true,
  fullName: true,
  alias: true,
  idNumber: true,
  dateOfBirth: true,
  gender: true,
  nationality: true,
  description: true,
  dangerLevel: true,
  caseReference: true,
  photoUrl: true,
  embeddingModel: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class WatchlistService {
  async listPersons(orgId: string, query: ListWatchlistQuery) {
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const isDeleted = query.is_deleted === 'true';

    const where = {
      organizationId: orgId,
      ...(isDeleted ? { deletedAt: { not: null } } : { deletedAt: null }),
      ...(query.search && {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' as const } },
          { idNumber: { contains: query.search, mode: 'insensitive' as const } },
          { caseReference: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
      ...(query.danger_level && { dangerLevel: query.danger_level }),
      ...(query.is_active !== undefined && { isActive: query.is_active === 'true' }),
    };

    const [persons, total] = await Promise.all([
      prisma.watchlistPerson.findMany({
        where,
        select: {
          ...PERSON_SELECT,
          _count: { select: { alerts: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.watchlistPerson.count({ where }),
    ]);

    // Get today's alert count and last detected for each person
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enriched = await Promise.all(
      persons.map(async (p) => {
        const [alertCountToday, lastDetection] = await Promise.all([
          prisma.alert.count({
            where: { personId: p.id, createdAt: { gte: today } },
          }),
          prisma.detectionEvent.findFirst({
            where: { bestMatchId: p.id, isMatch: true },
            orderBy: { detectedAt: 'desc' },
            select: { detectedAt: true },
          }),
        ]);

        return {
          ...p,
          alert_count_today: alertCountToday,
          last_detected_at: lastDetection?.detectedAt || null,
        };
      })
    );

    return { persons: enriched, meta: paginate(page, limit, total) };
  }

  async getPersonById(id: string, orgId: string) {
    const person = await prisma.watchlistPerson.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        photos: { orderBy: { createdAt: 'desc' } },
        detectionEvents: {
          where: { isMatch: true },
          orderBy: { detectedAt: 'desc' },
          take: 20,
          include: {
            source: { select: { id: true, name: true, locationName: true } },
          },
        },
        addedByUser: { select: { id: true, fullName: true } },
      },
    });

    if (!person) throw notFound('Person');
    return person;
  }

  async createPerson(
    input: CreatePersonInput,
    orgId: string,
    userId: string,
    photoFile?: Express.Multer.File
  ) {
    let photoUrl: string | undefined;
    let embedding: number[] | undefined;
    let embeddingModel = 'v1';

    if (photoFile) {
      // Upload photo to MinIO
      const key = generateFileKey('watchlist', photoFile.originalname);
      photoUrl = await uploadFile(BUCKETS.WATCHLIST, key, photoFile.buffer, photoFile.mimetype);

      // Get embedding from ML service
      try {
        const result = await mlService.getEmbedding(photoFile.buffer, photoFile.originalname);
        if (result.face_detected) {
          embedding = result.embedding;
        } else {
          logger.warn('No face detected in uploaded photo', { orgId, userId });
        }
      } catch (error) {
        logger.warn('ML service unavailable, creating person without embedding', { error });
      }

      // Get active model version
      const activeModel = await prisma.modelVersion.findFirst({ where: { isActive: true } });
      if (activeModel) embeddingModel = activeModel.version;
    }

    // Create person record with embedding via raw SQL (Prisma doesn't support vector natively)
    const person = await prisma.watchlistPerson.create({
      data: {
        organizationId: orgId,
        fullName: input.full_name,
        alias: input.alias || [],
        idNumber: input.id_number,
        dateOfBirth: input.date_of_birth ? new Date(input.date_of_birth) : null,
        gender: input.gender,
        nationality: input.nationality,
        description: input.description,
        dangerLevel: input.danger_level || 'medium',
        caseReference: input.case_reference,
        photoUrl,
        embeddingModel,
        addedBy: userId,
      },
    });

    // Set embedding via raw SQL if we have one
    if (embedding) {
      await prisma.$executeRawUnsafe(
        `UPDATE watchlist_persons SET embedding = $1::vector WHERE id = $2`,
        `[${embedding.join(',')}]`,
        person.id
      );
    }

    // Create primary photo record
    if (photoUrl) {
      await prisma.watchlistPhoto.create({
        data: {
          personId: person.id,
          photoUrl,
          embeddingModel,
          isPrimary: true,
          source: 'manual_upload',
          uploadedBy: userId,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'PERSON_ADDED',
        resourceType: 'watchlist_person',
        resourceId: person.id,
        newValue: { full_name: input.full_name, danger_level: input.danger_level } as Prisma.InputJsonValue,
      },
    });

    return person;
  }

  async updatePerson(
    id: string,
    input: UpdatePersonInput,
    orgId: string,
    userId: string,
    photoFile?: Express.Multer.File
  ) {
    const existing = await prisma.watchlistPerson.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('Person');

    let photoUrl = existing.photoUrl;
    let embedding: number[] | undefined;
    let embeddingModel = existing.embeddingModel;

    if (photoFile) {
      const key = generateFileKey('watchlist', photoFile.originalname);
      photoUrl = await uploadFile(BUCKETS.WATCHLIST, key, photoFile.buffer, photoFile.mimetype);

      try {
        const mlResult = await mlService.getEmbedding(photoFile.buffer, photoFile.originalname);
        if (mlResult.face_detected) {
          embedding = mlResult.embedding;
          embeddingModel = 'v1'; // Assuming v1 for new embeddings
        } else {
          logger.warn('No face detected in updated watchlist photo', { file: photoFile.originalname });
        }
      } catch (error) {
        logger.warn('ML service unavailable, updating person without embedding', { error });
      }
    }

    const updated = await prisma.watchlistPerson.update({
      where: { id },
      data: {
        ...(input.full_name && { fullName: input.full_name }),
        ...(input.alias !== undefined && { alias: input.alias }),
        ...(input.id_number !== undefined && { idNumber: input.id_number }),
        ...(input.date_of_birth && { dateOfBirth: new Date(input.date_of_birth) }),
        ...(input.gender && { gender: input.gender }),
        ...(input.nationality && { nationality: input.nationality }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.danger_level && { dangerLevel: input.danger_level }),
        ...(input.case_reference !== undefined && { caseReference: input.case_reference }),
        ...(input.is_active !== undefined && { isActive: input.is_active }),
        ...(photoUrl !== existing.photoUrl && { photoUrl, embeddingModel }),
      },
    });

    if (embedding) {
      await prisma.$executeRawUnsafe(
        `UPDATE watchlist_persons SET embedding = $1::vector WHERE id = $2`,
        `[${embedding.join(',')}]`,
        id
      );
    }

    if (photoUrl && photoUrl !== existing.photoUrl) {
      const photo = await prisma.watchlistPhoto.create({
        data: {
          personId: id,
          photoUrl,
          embeddingModel,
          isPrimary: true,
          source: 'manual_update',
          uploadedBy: userId,
        },
      });

      if (embedding) {
        await prisma.$executeRawUnsafe(
          `UPDATE watchlist_photos SET embedding = $1::vector WHERE id = $2`,
          `[${embedding.join(',')}]`,
          photo.id
        );
      }
    }

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'PERSON_UPDATED',
        resourceType: 'watchlist_person',
        resourceId: id,
        oldValue: { danger_level: existing.dangerLevel, is_active: existing.isActive } as Prisma.InputJsonValue,
        newValue: input as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  async deletePerson(id: string, orgId: string, userId: string) {
    const existing = await prisma.watchlistPerson.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('Person');

    await prisma.watchlistPerson.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'PERSON_DELETED',
        resourceType: 'watchlist_person',
        resourceId: id,
      },
    });
  }

  async deactivatePerson(id: string, orgId: string, userId: string) {
    const existing = await prisma.watchlistPerson.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('Person');

    await prisma.watchlistPerson.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'PERSON_DEACTIVATED',
        resourceType: 'watchlist_person',
        resourceId: id,
      },
    });
  }

  async addPhoto(
    personId: string,
    orgId: string,
    userId: string,
    photoFile: Express.Multer.File,
    isPrimary = false
  ) {
    const person = await prisma.watchlistPerson.findFirst({
      where: { id: personId, organizationId: orgId, deletedAt: null },
    });
    if (!person) throw notFound('Person');

    const key = generateFileKey('watchlist', photoFile.originalname);
    const photoUrl = await uploadFile(BUCKETS.WATCHLIST, key, photoFile.buffer, photoFile.mimetype);

    let embedding: number[] | undefined;
    try {
      const result = await mlService.getEmbedding(photoFile.buffer, photoFile.originalname);
      if (result.face_detected) embedding = result.embedding;
    } catch {
      logger.warn('Could not get embedding for additional photo');
    }

    const photo = await prisma.watchlistPhoto.create({
      data: {
        personId,
        photoUrl,
        embeddingModel: person.embeddingModel,
        isPrimary,
        source: 'manual_upload',
        uploadedBy: userId,
      },
    });

    if (embedding) {
      await prisma.$executeRawUnsafe(
        `UPDATE watchlist_photos SET embedding = $1::vector WHERE id = $2`,
        `[${embedding.join(',')}]`,
        photo.id
      );
    }

    // If setting as primary, update person photo_url
    if (isPrimary) {
      await prisma.watchlistPerson.update({
        where: { id: personId },
        data: { photoUrl },
      });
      // Unset other primaries
      await prisma.watchlistPhoto.updateMany({
        where: { personId, id: { not: photo.id } },
        data: { isPrimary: false },
      });
    }

    return photo;
  }

  async deletePhoto(personId: string, photoId: string, orgId: string) {
    const person = await prisma.watchlistPerson.findFirst({
      where: { id: personId, organizationId: orgId, deletedAt: null },
    });
    if (!person) throw notFound('Person');

    const photo = await prisma.watchlistPhoto.findFirst({
      where: { id: photoId, personId },
    });
    if (!photo) throw notFound('Photo');

    await prisma.watchlistPhoto.delete({ where: { id: photoId } });

    return { deleted: true };
  }
}

export const watchlistService = new WatchlistService();
