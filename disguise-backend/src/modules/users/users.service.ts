import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import { notFound, conflict } from '../../utils/AppError';
import { getPaginationParams, paginate } from '../../utils/response';
import { CreateUserInput, UpdateUserInput, ResetPasswordInput, ListUsersQuery } from './users.schema';

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  organization: {
    select: { id: true, name: true, code: true },
  },
} as const;

export class UsersService {
  async listUsers(orgId: string, query: ListUsersQuery) {
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const where = {
      organizationId: orgId,
      deletedAt: null,
      ...(query.search && {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
      ...(query.role && { role: query.role }),
      ...(query.is_active !== undefined && { isActive: query.is_active === 'true' }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, meta: paginate(page, limit, total) };
  }

  async getUserById(id: string, orgId: string) {
    const user = await prisma.user.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: USER_SELECT,
    });
    if (!user) throw notFound('User');
    return user;
  }

  async createUser(input: CreateUserInput, orgId: string, createdByUserId: string) {
    // Check email uniqueness
    const existing = await prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
    });
    if (existing) throw conflict('Email is already registered');

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: input.email,
        fullName: input.full_name,
        role: input.role,
        passwordHash,
      },
      select: USER_SELECT,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: createdByUserId,
        action: 'USER_CREATED',
        resourceType: 'user',
        resourceId: user.id,
        newValue: { email: input.email, role: input.role },
      },
    });

    return user;
  }

  async updateUser(id: string, input: UpdateUserInput, orgId: string, updatedByUserId: string) {
    const existing = await prisma.user.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('User');

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(input.full_name && { fullName: input.full_name }),
        ...(input.role && { role: input.role }),
        ...(input.is_active !== undefined && { isActive: input.is_active }),
        ...(input.avatar_url && { avatarUrl: input.avatar_url }),
      },
      select: USER_SELECT,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: updatedByUserId,
        action: 'USER_UPDATED',
        resourceType: 'user',
        resourceId: id,
        oldValue: { role: existing.role, isActive: existing.isActive },
        newValue: input as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  async deleteUser(id: string, orgId: string, deletedByUserId: string) {
    const existing = await prisma.user.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('User');

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: deletedByUserId,
        action: 'USER_DELETED',
        resourceType: 'user',
        resourceId: id,
      },
    });
  }

  async resetPassword(id: string, input: ResetPasswordInput, orgId: string, resetByUserId: string) {
    const existing = await prisma.user.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('User');

    const passwordHash = await bcrypt.hash(input.new_password, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: resetByUserId,
        action: 'USER_PASSWORD_RESET',
        resourceType: 'user',
        resourceId: id,
      },
    });
  }
}

export const usersService = new UsersService();
