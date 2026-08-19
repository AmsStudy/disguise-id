import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// Endpoints that run at high frequency (polling/heartbeats/tracking)
const SILENT_PATHS = [
  '/health',
  '/api/v1/health',
  '/api/v1/camera-agent/heartbeat',
  '/api/v1/camera-agent/tracking',
  '/api/v1/camera-agent/config',
];

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const isError = res.statusCode >= 400;
    const level = res.statusCode >= 500 ? 'error' : isError ? 'warn' : 'info';

    // Ignore high-frequency polling from cluttering production logs unless it errored
    const isSilent = SILENT_PATHS.some((p) => req.path.startsWith(p));
    if (isSilent && !isError) {
      return;
    }

    logger[level]('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration_ms: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.sub,
      orgId: req.user?.orgId,
    });
  });

  next();
};
