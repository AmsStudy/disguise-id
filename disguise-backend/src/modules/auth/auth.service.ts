import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database';
import { getRedis } from '../../config/redis';
import { AppError, unauthorized } from '../../utils/AppError';
import { JwtPayload, RefreshTokenPayload } from '../../types';
import { LoginInput } from './auth.schema';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class AuthService {
  /**
   * Login user and return tokens
   */
  async login(input: LoginInput, ipAddress: string, userAgent: string) {
    // Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email: input.email,
        deletedAt: null,
        isActive: true,
      },
      include: {
        organization: {
          select: { id: true, name: true, code: true, isActive: true },
        },
      },
    });

    if (!user) {
      throw unauthorized('Invalid email or password');
    }

    if (!user.organization.isActive) {
      throw new AppError('ORG_INACTIVE', 'Your organization is not active', 403);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw unauthorized('Invalid email or password');
    }

    // Generate tokens
    const tokenId = uuidv4();
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as JwtPayload['role'],
      orgId: user.organizationId,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
    const refreshPayload: RefreshTokenPayload = { sub: user.id, tokenId };
    const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);

    // Store refresh token in Redis
    const redis = getRedis();
    const refreshExpiry = 7 * 24 * 60 * 60; // 7 days in seconds
    await redis.setex(`refresh:${tokenId}`, refreshExpiry, user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'USER_LOGIN',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress,
        userAgent,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      user: {
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        role: user.role,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          code: user.organization.code,
        },
      },
    };
  }

  /**
   * Refresh access token
   */
  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch {
      throw unauthorized('Invalid or expired refresh token');
    }

    // Check if token is still valid in Redis
    const redis = getRedis();
    const stored = await redis.get(`refresh:${payload.tokenId}`);
    if (!stored || stored !== payload.sub) {
      throw unauthorized('Refresh token has been revoked');
    }

    // Get user
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      include: {
        organization: { select: { isActive: true } },
      },
    });

    if (!user || !user.organization.isActive) {
      throw unauthorized('User not found or inactive');
    }

    // Rotate token: revoke old, issue new
    await redis.del(`refresh:${payload.tokenId}`);
    const newTokenId = uuidv4();
    const newAccessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as JwtPayload['role'],
      orgId: user.organizationId,
    };

    const newAccessToken = jwt.sign(newAccessPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
    const newRefreshPayload: RefreshTokenPayload = { sub: user.id, tokenId: newTokenId };
    const newRefreshToken = jwt.sign(newRefreshPayload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);

    await redis.setex(`refresh:${newTokenId}`, 7 * 24 * 60 * 60, user.id);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: 3600,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
      }
    };
  }

  /**
   * Logout — blacklist access token, revoke refresh token
   */
  async logout(accessToken: string, refreshToken?: string) {
    const redis = getRedis();

    // Blacklist access token
    try {
      const decoded = jwt.decode(accessToken) as { exp?: number } | null;
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redis.setex(`blacklist:${accessToken}`, ttl, '1');
        }
      }
    } catch {
      // Ignore invalid token errors on logout
    }

    // Revoke refresh token if provided
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as RefreshTokenPayload;
        await redis.del(`refresh:${decoded.tokenId}`);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Get current user profile
   */
  async getMe(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        lastLoginAt: true,
        isActive: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true, code: true, plan: true },
        },
      },
    });

    if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);

    return user;
  }
}

export const authService = new AuthService();
