import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import { logger } from '../config/logger';

let io: SocketIOServer;

export const initializeSocket = (httpServer: HttpServer): void => {
  io = new SocketIOServer(httpServer, {
    path: '/socket',
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || '*',
      credentials: true,
    },
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const rawAuth = socket.handshake.headers?.authorization;
    const bearerToken = rawAuth?.startsWith('Bearer ') ? rawAuth.slice(7) : rawAuth;
    const token = (socket.handshake.auth?.token || socket.handshake.query?.token || bearerToken) as string;

    if (!token) {
      logger.warn('WebSocket connection rejected: Missing token');
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      logger.warn('WebSocket connection rejected: Invalid or expired token');
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as JwtPayload;
    logger.info('WebSocket client connected', {
      socketId: socket.id,
      userId: user.sub,
      orgId: user.orgId,
    });

    // Auto-join organization room
    const orgRoom = `org:${user.orgId}`;
    socket.join(orgRoom);

    // Handle camera live feed subscriptions
    socket.on('subscribe:camera', ({ camera_id }: { camera_id: string }) => {
      const cameraRoom = `camera:${camera_id}`;
      socket.join(cameraRoom);
      logger.debug('Client subscribed to camera', { socketId: socket.id, cameraId: camera_id });
    });

    socket.on('unsubscribe:camera', ({ camera_id }: { camera_id: string }) => {
      const cameraRoom = `camera:${camera_id}`;
      socket.leave(cameraRoom);
      logger.debug('Client unsubscribed from camera', { socketId: socket.id, cameraId: camera_id });
    });

    socket.on('disconnect', (reason) => {
      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        userId: user.sub,
        reason,
      });
    });

    socket.on('error', (err) => {
      logger.error('WebSocket error', { socketId: socket.id, error: err.message });
    });
  });

  logger.info('✅ Socket.IO initialized');
};

export const getIO = (): SocketIOServer => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

import { fcmService } from '../services/fcm.service';

/**
 * Emit new alert to all clients in the organization room and push to mobile devices
 */
export const emitAlertNew = (orgId: string, payload: Record<string, unknown>): void => {
  try {
    const _io = getIO();
    _io.to(`org:${orgId}`).emit('alert:new', payload);
    logger.debug('Emitted alert:new', { orgId });

    // Dispatch background push notification to registered Android/iOS field devices
    const alertData = (payload.alert || payload) as any;
    if (alertData && (alertData.id || alertData.alert_id)) {
      const person = alertData.person || {};
      const source = alertData.detectionEvent?.source || alertData.camera || {};
      fcmService.sendAlertNotification(orgId, {
        alertId: alertData.id || alertData.alert_id,
        personName: person.fullName || person.name || 'DPO Target',
        cameraName: source.name || 'CCTV Field Camera',
        similarity: alertData.similarityScore || alertData.similarity || 0.85,
        dangerLevel: person.dangerLevel || 'high',
        faceCropUrl: alertData.detectionEvent?.faceCropUrl,
        photoUrl: person.photoUrl,
      }).catch((err) => {
        logger.debug('FCM push notification non-blocking error', { error: err });
      });
    }
  } catch (err) {
    logger.warn('Failed to emit alert:new (socket not ready)', { orgId });
  }
};

/**
 * Emit alert status update to org room
 */
export const emitAlertUpdated = (orgId: string, payload: Record<string, unknown>): void => {
  try {
    const _io = getIO();
    _io.to(`org:${orgId}`).emit('alert:updated', payload);
  } catch (err) {
    logger.warn('Failed to emit alert:updated', { orgId });
  }
};

/**
 * Emit camera status change to org room
 */
export const emitCameraStatus = (orgId: string, cameraId: string, status: string): void => {
  try {
    const _io = getIO();
    _io.to(`org:${orgId}`).emit('camera:status', { camera_id: cameraId, status });
  } catch (err) {
    logger.warn('Failed to emit camera:status', { orgId, cameraId });
  }
};

/**
 * Emit live detection to camera subscribers
 */
export const emitDetectionLive = (
  cameraId: string,
  payload: Record<string, unknown>
): void => {
  try {
    const _io = getIO();
    _io.to(`camera:${cameraId}`).emit('detection:live', payload);
  } catch (err) {
    logger.warn('Failed to emit detection:live', { cameraId });
  }
};
