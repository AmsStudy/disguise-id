import prisma from '../../config/database';
import { notFound, forbidden, badRequest } from '../../utils/AppError';
import { getPaginationParams, paginate } from '../../utils/response';
import { UpdateAlertInput, AssignAlertInput, ListAlertsQuery } from './alerts.schema';
import { emitAlertUpdated } from '../../sockets';

const ALERT_INCLUDE = {
  person: {
    select: { id: true, fullName: true, dangerLevel: true, photoUrl: true },
  },
  detectionEvent: {
    select: {
      id: true,
      faceCropUrl: true,
      frameUrl: true,
      detectedAt: true,
      processingMs: true,
      source: {
        select: { id: true, name: true, locationName: true },
      },
    },
  },
  assignedToUser: { select: { id: true, fullName: true, email: true } },
  reviewedByUser: { select: { id: true, fullName: true } },
} as const;

export class AlertsService {
  async listAlerts(orgId: string, query: ListAlertsQuery) {
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const where = {
      organizationId: orgId,
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.person_id && { personId: query.person_id }),
      ...(query.source_id && { detectionEvent: { sourceId: query.source_id } }),
      ...(query.date_from || query.date_to
        ? {
            createdAt: {
              ...(query.date_from && { gte: new Date(query.date_from) }),
              ...(query.date_to && { lte: new Date(query.date_to) }),
            },
          }
        : {}),
    };

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: ALERT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.alert.count({ where }),
    ]);

    return { alerts, meta: paginate(page, limit, total) };
  }

  async getAlertById(id: string, orgId: string) {
    const alert = await prisma.alert.findFirst({
      where: { id, organizationId: orgId },
      include: ALERT_INCLUDE,
    });
    if (!alert) throw notFound('Alert');
    return alert;
  }

  async updateAlert(id: string, input: UpdateAlertInput, orgId: string, userId: string) {
    const existing = await prisma.alert.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw notFound('Alert');

    if (existing.status !== 'pending' && input.status) {
      throw badRequest('Only pending alerts can be updated');
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        ...(input.status && { status: input.status }),
        ...(input.review_notes !== undefined && { reviewNotes: input.review_notes }),
        ...(input.assigned_to && { assignedTo: input.assigned_to }),
        ...(input.status && { reviewedBy: userId, reviewedAt: new Date() }),
        ...(input.status && ['confirmed', 'dismissed', 'false_positive'].includes(input.status)
          ? { resolvedAt: new Date() }
          : {}),
      },
      include: ALERT_INCLUDE,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: input.status ? `ALERT_${input.status.toUpperCase()}` : 'ALERT_UPDATED',
        resourceType: 'alert',
        resourceId: id,
        oldValue: { status: existing.status },
        newValue: { status: input.status, review_notes: input.review_notes },
      },
    });

    // Emit WebSocket update
    emitAlertUpdated(orgId, {
      alert_id: id,
      status: updated.status,
      updated_by: userId,
    });

    return updated;
  }

  async assignAlert(id: string, input: AssignAlertInput, orgId: string, assignedByUserId: string) {
    const existing = await prisma.alert.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw notFound('Alert');

    // Verify assignee exists in same org
    const assignee = await prisma.user.findFirst({
      where: { id: input.assigned_to, organizationId: orgId, deletedAt: null, isActive: true },
    });
    if (!assignee) throw badRequest('Assignee not found or not in your organization');

    const updated = await prisma.alert.update({
      where: { id },
      data: { assignedTo: input.assigned_to },
      include: ALERT_INCLUDE,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: assignedByUserId,
        action: 'ALERT_ASSIGNED',
        resourceType: 'alert',
        resourceId: id,
        newValue: { assigned_to: input.assigned_to },
      },
    });

    return updated;
  }

  async deleteAlert(id: string, orgId: string, userId: string) {
    const existing = await prisma.alert.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw notFound('Alert');

    // Remove relations in case_alerts if any exist
    await prisma.caseAlert.deleteMany({ where: { alertId: id } });

    // Delete the alert record
    await prisma.alert.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'ALERT_DELETED',
        resourceType: 'alert',
        resourceId: id,
        oldValue: { status: existing.status, personId: existing.personId, similarityScore: existing.similarityScore },
      },
    });

    // Emit WebSocket update for deletion
    emitAlertUpdated(orgId, {
      alert_id: id,
      status: 'deleted',
      updated_by: userId,
    });

    return { id, deleted: true };
  }
}

export const alertsService = new AlertsService();
