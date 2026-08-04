import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { uploadFile, BUCKETS } from '../../config/minio';
import { generateFileKey, generateCaseNumber } from '../../utils/helpers';
import { notFound, badRequest, conflict } from '../../utils/AppError';
import { getPaginationParams, paginate } from '../../utils/response';
import {
  CreateCaseInput,
  UpdateCaseInput,
  UpdateCaseStatusInput,
  AddAlertsToCaseInput,
  AddCaseNoteInput,
  ListCasesQuery,
} from './cases.schema';

const CASE_INCLUDE = {
  leadInvestigator: { select: { id: true, fullName: true, email: true } },
  createdByUser: { select: { id: true, fullName: true } },
  _count: { select: { caseAlerts: true, notes: true } },
} as const;

export class CasesService {
  async listCases(orgId: string, query: ListCasesQuery) {
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const where = {
      organizationId: orgId,
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' as const } },
          { caseNumber: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: CASE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.case.count({ where }),
    ]);

    return { cases, meta: paginate(page, limit, total) };
  }

  async getCaseById(id: string, orgId: string) {
    const caseRecord = await prisma.case.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        ...CASE_INCLUDE,
        caseAlerts: {
          include: {
            alert: {
              include: {
                person: { select: { id: true, fullName: true, dangerLevel: true, photoUrl: true } },
                detectionEvent: {
                  select: { faceCropUrl: true, frameUrl: true, detectedAt: true, source: { select: { name: true, locationName: true } } },
                },
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
        notes: {
          include: { createdByUser: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!caseRecord) throw notFound('Case');
    return caseRecord;
  }

  async createCase(input: CreateCaseInput, orgId: string, userId: string) {
    // Generate unique case number
    let caseNumber: string;
    let attempts = 0;
    do {
      caseNumber = generateCaseNumber();
      const existing = await prisma.case.findFirst({ where: { caseNumber } });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    const newCase = await prisma.case.create({
      data: {
        organizationId: orgId,
        caseNumber: caseNumber!,
        title: input.title,
        description: input.description,
        priority: input.priority || 'medium',
        leadInvestigatorId: input.lead_investigator_id,
        createdBy: userId,
      },
      include: CASE_INCLUDE,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'CASE_CREATED',
        resourceType: 'case',
        resourceId: newCase.id,
        newValue: { title: input.title, case_number: caseNumber! },
      },
    });

    return newCase;
  }

  async updateCase(id: string, input: UpdateCaseInput, orgId: string, userId: string) {
    const existing = await prisma.case.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('Case');

    const updated = await prisma.case.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.priority && { priority: input.priority }),
        ...(input.lead_investigator_id !== undefined && { leadInvestigatorId: input.lead_investigator_id }),
      },
      include: CASE_INCLUDE,
    });

    await prisma.auditLog.create({
      data: { organizationId: orgId, userId, action: 'CASE_UPDATED', resourceType: 'case', resourceId: id, newValue: input as unknown as Prisma.InputJsonValue },
    });

    return updated;
  }

  async updateCaseStatus(id: string, input: UpdateCaseStatusInput, orgId: string, userId: string) {
    const existing = await prisma.case.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('Case');

    // Status transitions
    const validTransitions: Record<string, string[]> = {
      open: ['investigating', 'closed'],
      investigating: ['closed', 'open'],
      closed: ['archived'],
      archived: [],
    };

    if (!validTransitions[existing.status]?.includes(input.status)) {
      throw badRequest(`Cannot transition from '${existing.status}' to '${input.status}'`);
    }

    const updated = await prisma.case.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.status === 'closed' ? { closedAt: new Date() } : {}),
      },
      include: CASE_INCLUDE,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: `CASE_${input.status.toUpperCase()}`,
        resourceType: 'case',
        resourceId: id,
        oldValue: { status: existing.status },
        newValue: { status: input.status },
      },
    });

    return updated;
  }

  async addAlerts(id: string, input: AddAlertsToCaseInput, orgId: string, userId: string) {
    const existing = await prisma.case.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('Case');

    // Validate all alerts belong to same org
    const alerts = await prisma.alert.findMany({
      where: { id: { in: input.alert_ids }, organizationId: orgId },
    });

    if (alerts.length !== input.alert_ids.length) {
      throw badRequest('Some alert IDs not found or do not belong to your organization');
    }

    // Use upsert to avoid duplicate additions
    await Promise.all(
      input.alert_ids.map((alertId) =>
        prisma.caseAlert.upsert({
          where: { caseId_alertId: { caseId: id, alertId } },
          update: {},
          create: { caseId: id, alertId, addedBy: userId },
        })
      )
    );

    return { added: input.alert_ids.length };
  }

  async addNote(
    id: string,
    input: AddCaseNoteInput,
    orgId: string,
    userId: string,
    files?: Express.Multer.File[]
  ) {
    const existing = await prisma.case.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('Case');

    let attachments: string[] = [];

    if (files && files.length > 0) {
      attachments = await Promise.all(
        files.map(async (file) => {
          const key = generateFileKey('case-attachments', file.originalname);
          return uploadFile(BUCKETS.MODELS, key, file.buffer, file.mimetype); // Reusing models bucket for attachments
        })
      );
    }

    const note = await prisma.caseNote.create({
      data: {
        caseId: id,
        content: input.content,
        attachments,
        createdBy: userId,
      },
      include: {
        createdByUser: { select: { id: true, fullName: true } },
      },
    });

    return note;
  }
}

export const casesService = new CasesService();
