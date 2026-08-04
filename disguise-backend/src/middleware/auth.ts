import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';
import { unauthorized, forbidden } from '../utils/AppError';
import { getRedis } from '../config/redis';

/**
 * Authenticate requests using JWT Bearer token
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw unauthorized('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted (after logout)
    const redis = getRedis();
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw unauthorized('Token has been revoked');
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as JwtPayload;

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      next(unauthorized('Invalid token'));
    } else if (err instanceof jwt.TokenExpiredError) {
      next(unauthorized('Token expired'));
    } else {
      next(err);
    }
  }
};

/**
 * Authorize specific roles
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(unauthorized());
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return next(forbidden(`Role '${req.user.role}' is not permitted for this action`));
    }

    next();
  };
};

/**
 * Authenticate camera API key requests
 */
export const authenticateApiKey = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      throw unauthorized('Missing X-Api-Key header');
    }

    // Camera lookup is done in the inference service
    // We just verify the key exists in the header here
    // Actual validation happens in the inference controller
    req.orgId = undefined; // Will be set after DB lookup
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Ensure user belongs to an organization (filter by org)
 */
export const requireOrg = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user?.orgId) {
    return next(forbidden('No organization context'));
  }
  next();
};
