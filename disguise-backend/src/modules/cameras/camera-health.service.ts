import prisma from '../../config/database';
import { getRedis } from '../../config/redis';
import { notFound } from '../../utils/AppError';

export class CameraHealthService {
  async getHealth(cameraId: string) {
    const camera = await prisma.cctvSource.findUnique({
      where: { id: cameraId, deletedAt: null }
    });
    
    if (!camera) {
      throw notFound('Camera not found');
    }

    const redis = getRedis();
    
    // Fetch Redis metrics
    const [
      lastFrameAt,
      lastConnectionAttemptAt,
      consecutiveFailures,
      lastErrorCode,
      lastErrorAt,
      currentFps,
      droppedFrames,
      agentHeartbeatAt
    ] = await Promise.all([
      redis.get(`camera:${cameraId}:health:lastFrameAt`),
      redis.get(`camera:${cameraId}:health:lastConnectionAttemptAt`),
      redis.get(`camera:${cameraId}:health:consecutiveFailures`),
      redis.get(`camera:${cameraId}:health:lastErrorCode`),
      redis.get(`camera:${cameraId}:health:lastErrorAt`),
      redis.get(`camera:${cameraId}:health:currentFps`),
      redis.get(`camera:${cameraId}:health:droppedFrames`),
      redis.get(`camera:${cameraId}:health:agentHeartbeatAt`)
    ]);

    // Fetch BullMQ queue backlog size (approximation from Redis keys if needed)
    // We already use camera-inference:{cameraId}:count
    const queueBacklog = await redis.get(`camera-inference:${cameraId}:count`);

    // Merge logic
    // A camera is considered online if agentHeartbeatAt or lastFrameAt is recent (e.g. < 30s)
    let isOnlineRedis = false;
    const now = Date.now();
    
    if (agentHeartbeatAt && now - parseInt(agentHeartbeatAt) < 30000) {
      isOnlineRedis = true;
    } else if (lastFrameAt && now - parseInt(lastFrameAt) < 15000) {
      isOnlineRedis = true;
    }

    const combinedStatus = isOnlineRedis ? 'online' : (camera.status === 'offline' ? 'offline' : 'disconnected');
    
    return {
      persistent: {
        id: camera.id,
        status: camera.status, // Database status (could be stale)
        lastSeenAt: camera.lastSeenAt,
        credentialsConfigured: camera.credentialsConfigured,
        enabled: true // placeholder if you have an enabled column
      },
      operational: {
        status: combinedStatus,
        lastFrameAt: lastFrameAt ? new Date(parseInt(lastFrameAt)).toISOString() : null,
        lastConnectionAttemptAt: lastConnectionAttemptAt ? new Date(parseInt(lastConnectionAttemptAt)).toISOString() : null,
        consecutiveFailures: parseInt(consecutiveFailures || '0'),
        lastErrorCode: lastErrorCode || null,
        lastErrorAt: lastErrorAt ? new Date(parseInt(lastErrorAt)).toISOString() : null,
        currentFps: parseFloat(currentFps || '0'),
        droppedFrames: parseInt(droppedFrames || '0'),
        queueBacklog: parseInt(queueBacklog || '0'),
        agentHeartbeatAt: agentHeartbeatAt ? new Date(parseInt(agentHeartbeatAt)).toISOString() : null,
      }
    };
  }
  
  async reportHeartbeat(cameraId: string, payload: any) {
    const redis = getRedis();
    const now = Date.now().toString();
    await redis.set(`camera:${cameraId}:health:agentHeartbeatAt`, now, 'EX', 60);

    try {
      const camera = await prisma.cctvSource.findUnique({
        where: { id: cameraId, deletedAt: null },
        select: { id: true, status: true, organizationId: true }
      });

      if (camera) {
        if (camera.status !== 'online') {
          await prisma.cctvSource.update({
            where: { id: cameraId },
            data: { status: 'online', lastSeenAt: new Date() }
          });
          const { emitCameraStatus } = require('../../sockets');
          emitCameraStatus(camera.organizationId, camera.id, 'online');
        } else {
          await prisma.cctvSource.update({
            where: { id: cameraId },
            data: { lastSeenAt: new Date() }
          });
        }
      }
    } catch (e) {
      // Non-blocking
    }
  }
}

export const cameraHealthService = new CameraHealthService();
