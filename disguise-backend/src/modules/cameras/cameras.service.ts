import { Prisma } from '@prisma/client';
import { CameraStatus } from '../../types';
import bcrypt from 'bcryptjs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import prisma from '../../config/database';
import { badRequest, notFound } from '../../utils/AppError';
import { generateApiKey } from '../../utils/helpers';
import { getPaginationParams, paginate } from '../../utils/response';
import { CameraCredentialEncryption } from '../../utils/cameraCredentialEncryption';
import { CreateCameraInput, UpdateCameraInput, ListCamerasQuery } from './cameras.schema';

const execFileAsync = promisify(execFile);

const CAMERA_SELECT = {
  id: true,
  name: true,
  locationName: true,
  latitude: true,
  longitude: true,
  streamUrl: true,
  ipAddress: true,
  username: true,
  credentialsConfigured: true,
  modelVersion: true,
  threshold: true,
  status: true,
  lastSeenAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class CamerasService {
  async listCameras(orgId: string, query: ListCamerasQuery) {
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where = {
      organizationId: orgId,
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { locationName: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [cameras, total] = await Promise.all([
      prisma.cctvSource.findMany({
        where,
        select: CAMERA_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.cctvSource.count({ where }),
    ]);

    // Enrich with today's stats
    const enriched = await Promise.all(
      cameras.map(async (cam) => {
        const [detectionsToday, alertsToday] = await Promise.all([
          prisma.detectionEvent.count({
            where: { sourceId: cam.id, detectedAt: { gte: today } },
          }),
          prisma.alert.count({
            where: {
              detectionEvent: { sourceId: cam.id },
              createdAt: { gte: today },
            },
          }),
        ]);
        return { ...cam, detections_today: detectionsToday, alerts_today: alertsToday };
      })
    );

    return { cameras: enriched, meta: paginate(page, limit, total) };
  }

  async getCameraById(id: string, orgId: string) {
    const camera = await prisma.cctvSource.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: CAMERA_SELECT,
    });
    if (!camera) throw notFound('Camera');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [detectionsToday, alertsToday, totalDetections] = await Promise.all([
      prisma.detectionEvent.count({ where: { sourceId: id, detectedAt: { gte: today } } }),
      prisma.alert.count({ where: { detectionEvent: { sourceId: id }, createdAt: { gte: today } } }),
      prisma.detectionEvent.count({ where: { sourceId: id } }),
    ]);

    return { ...camera, detections_today: detectionsToday, alerts_today: alertsToday, total_detections: totalDetections };
  }


  private buildRtspUrl(streamUrl: string | null | undefined, username: string | null | undefined, passwordRaw: string | null | undefined, orgId: string, cameraId: string): string {
    if (!streamUrl) throw badRequest('Stream URL is required for RTSP health check');
    try {
      const parsed = new URL(streamUrl);

      // Always strip credentials from URL and re-apply from DB fields.
      // This prevents credential loss when URL is re-serialized by JS URL parser.
      parsed.username = '';
      parsed.password = '';

      if (username) {
        parsed.username = username;
      }

      if (passwordRaw) {
        let password = passwordRaw;
        if (CameraCredentialEncryption.isEncrypted(passwordRaw)) {
          password = CameraCredentialEncryption.decrypt(passwordRaw, orgId, cameraId);
        }
        parsed.password = encodeURIComponent(password);
      }

      return parsed.toString();
    } catch {
      return streamUrl;
    }
  }


  /**
   * Sync a single camera path to MediaMTX via REST API (instant, no restart needed)
   */
  private async syncMediaMtxPath(cameraId: string, rtspUrl: string): Promise<void> {
    const apiUrl = process.env.MEDIAMTX_API_URL || 'http://127.0.0.1:9997';
    const pathConfig = {
      source: rtspUrl,
      sourceProtocol: 'tcp',
    };

    // Try PATCH first (update if exists), then POST (create if new)
    try {
      const patchRes = await fetch(`${apiUrl}/v3/config/paths/patch/${cameraId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pathConfig),
      });
      if (patchRes.ok || patchRes.status === 404) {
        if (patchRes.status === 404) {
          // Path doesn't exist yet, create it
          const postRes = await fetch(`${apiUrl}/v3/config/paths/add/${cameraId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pathConfig),
          });
          if (!postRes.ok) {
            const body = await postRes.text();
            console.error(`[MediaMTX] Failed to add path ${cameraId}:`, body);
          } else {
            console.log(`[MediaMTX] ✅ Path added: ${cameraId}`);
          }
        } else {
          console.log(`[MediaMTX] ✅ Path updated: ${cameraId}`);
        }
      } else {
        const body = await patchRes.text();
        console.error(`[MediaMTX] Failed to patch path ${cameraId}:`, body);
      }
    } catch (err: any) {
      console.error(`[MediaMTX] API unreachable for path ${cameraId}:`, err.message);
    }
  }

  /**
   * Remove a camera path from MediaMTX via REST API
   */
  private async removeMediaMtxPath(cameraId: string): Promise<void> {
    const apiUrl = process.env.MEDIAMTX_API_URL || 'http://127.0.0.1:9997';
    try {
      await fetch(`${apiUrl}/v3/config/paths/delete/${cameraId}`, { method: 'DELETE' });
      console.log(`[MediaMTX] ✅ Path removed: ${cameraId}`);
    } catch (err: any) {
      console.error(`[MediaMTX] Failed to remove path ${cameraId}:`, err.message);
    }
  }

  /**
   * Write full mediamtx.yml for persistence across container restarts.
   * Also syncs all paths via API for immediate effect.
   */
  public async syncMediaMtxConfigAll() {
    try {
      const cameras = await prisma.cctvSource.findMany({ where: { deletedAt: null } });
      let yamlContent = `# Auto-generated by disguise-backend
api: yes
webrtc: yes
rtsp: yes
rtmp: yes
hls: yes
authInternalUsers:
  - user: any
    pass: ""
    ips: []
    permissions:
      - action: publish
      - action: read
      - action: playback
      - action: api
      - action: metrics
      - action: pprof
paths:
`;

      const apiPromises: Promise<void>[] = [];

      for (const cam of cameras) {
        if (cam.streamUrl) {
          const rtspUrl = this.buildRtspUrl(cam.streamUrl, cam.username, cam.password, cam.organizationId, cam.id);
          yamlContent += `  "${cam.id}":\n    source: "${rtspUrl}"\n    sourceProtocol: tcp\n`;
          // Sync via API for immediate effect (no restart needed)
          apiPromises.push(this.syncMediaMtxPath(cam.id, rtspUrl));
        }
      }

      // Write file for persistence across container restarts
      const fs = require('fs/promises');
      const path = require('path');
      const configPath = path.resolve(process.cwd(), '../infrastructure/mediamtx.yml');
      await fs.writeFile(configPath, yamlContent, 'utf-8');

      // Sync all paths to running MediaMTX instance
      await Promise.allSettled(apiPromises);
    } catch (err) {
      console.error('[MediaMTX] Failed to sync config:', err);
    }
  }

  async testConnection(id: string, orgId: string) {
    const camera = await prisma.cctvSource.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: {
        id: true,
        streamUrl: true,
        username: true,
        password: true,
      },
    });

    if (!camera) throw notFound('Camera');
    if (!camera.streamUrl) throw badRequest('Camera does not have a stream URL configured');

    const probePath = typeof ffprobe === 'string' ? ffprobe : ffprobe.path;
    const rtspUrl = this.buildRtspUrl(camera.streamUrl, camera.username, camera.password, orgId, id);
    const args = [
      '-rtsp_transport', 'tcp',
      '-v', 'error',
      '-show_entries', 'format=format_name,duration',
      '-print_format', 'json',
      rtspUrl,
    ];

    try {
      const { stdout } = await execFileAsync(probePath, args, { timeout: 15000, maxBuffer: 20 * 1024 * 1024 });
      const probeResult = stdout ? JSON.parse(stdout.toString()) : {};
      await prisma.cctvSource.update({
        where: { id },
        data: { status: 'online', lastSeenAt: new Date() },
      });

      return {
        success: true,
        message: `RTSP connection successful${probeResult.format?.format_name ? ` (${probeResult.format.format_name})` : ''}.`,
        probe: probeResult,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'RTSP probe failed';
      await prisma.cctvSource.update({
        where: { id },
        data: { status: 'offline' },
      });
      throw badRequest(`RTSP health check failed: ${errorMessage}`);
    }
  }

  async getPreview(id: string, orgId: string): Promise<Buffer> {
    const camera = await prisma.cctvSource.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: {
        id: true,
        streamUrl: true,
        username: true,
        password: true,
      },
    });

    if (!camera) throw notFound('Camera');
    if (!camera.streamUrl) throw badRequest('Camera does not have a stream URL configured');

    const rtspUrl = this.buildRtspUrl(camera.streamUrl, camera.username, camera.password, orgId, id);
    // @ts-ignore
    const ffmpegBinary = typeof ffmpegPath === 'string' ? ffmpegPath : ffmpegPath?.path || String(ffmpegPath);
    const args = [
      '-rtsp_transport', 'tcp',
      '-y',
      '-i', rtspUrl,
      '-frames:v', '1',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      'pipe:1',
    ];

    try {
      const { stdout } = await execFileAsync(ffmpegBinary, args, {
        timeout: 20000,
        encoding: null,
        maxBuffer: 20 * 1024 * 1024,
      });

      if (!stdout || stdout.length === 0) {
        throw new Error('Empty frame received from RTSP stream');
      }

      await prisma.cctvSource.update({
        where: { id },
        data: { status: 'online', lastSeenAt: new Date() },
      });

      return stdout as Buffer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'RTSP preview capture failed';
      await prisma.cctvSource.update({
        where: { id },
        data: { status: 'offline' },
      });
      throw badRequest(`RTSP preview failed: ${errorMessage}`);
    }
  }

  async createCamera(input: CreateCameraInput, orgId: string, userId: string) {
    // Generate API key
    const plainApiKey = generateApiKey();
    const apiKeyHash = await bcrypt.hash(plainApiKey, 12);

    // Assign a temporary ID if we need it for encryption AAD before create, but Prisma creates uuid().
    // We will generate the UUID manually first.
    const cameraId = require('crypto').randomUUID();

    const encryptedPassword = input.password
      ? CameraCredentialEncryption.encrypt(input.password, orgId, cameraId)
      : undefined;

    const camera = await prisma.cctvSource.create({
      data: {
        id: cameraId,
        organizationId: orgId,
        name: input.name,
        locationName: input.location_name,
        ipAddress: input.ip_address,
        username: input.username,
        password: encryptedPassword,
        credentialsConfigured: !!input.password,
        latitude: input.latitude,
        longitude: input.longitude,
        streamUrl: input.stream_url,
        apiKeyHash,
        modelVersion: input.model_version || 'v1',
        threshold: input.threshold || 0.570,
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
      },
      select: CAMERA_SELECT,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'CAMERA_CREATED',
        resourceType: 'cctv_source',
        resourceId: camera.id,
        newValue: { name: input.name },
      },
    });

    if (input.stream_url) {
      await this.syncMediaMtxConfigAll();
    }

    // Return camera with plain API key (shown only once)
    return { ...camera, api_key: plainApiKey };
  }

  async updateCamera(id: string, input: UpdateCameraInput, orgId: string, userId: string) {
    const existing = await prisma.cctvSource.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('Camera');

    const encryptedPassword = input.password !== undefined && input.password !== null
      ? CameraCredentialEncryption.encrypt(input.password, orgId, id)
      : undefined;

    const updated = await prisma.cctvSource.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.location_name !== undefined && { locationName: input.location_name }),
        ...(input.ip_address !== undefined && { ipAddress: input.ip_address }),
        ...(input.username !== undefined && { username: input.username }),
        ...(encryptedPassword !== undefined && { password: encryptedPassword, credentialsConfigured: true }),
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
        ...(input.stream_url !== undefined && { streamUrl: input.stream_url }),
        ...(input.model_version && { modelVersion: input.model_version }),
        ...(input.threshold !== undefined && { threshold: input.threshold }),
        ...(input.metadata !== undefined && { metadata: input.metadata as Prisma.InputJsonValue }),
        ...(input.status && { status: input.status }),
      },
      select: CAMERA_SELECT,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'CAMERA_UPDATED',
        resourceType: 'cctv_source',
        resourceId: id,
        newValue: {
          name: input.name || existing.name,
          locationName: input.location_name,
          ipAddress: input.ip_address,
          threshold: input.threshold,
          status: input.status,
          credentialsChanged: input.password !== undefined,
        },

      },
    });

    if (updated.streamUrl) {
      await this.syncMediaMtxConfigAll();
    }

    return updated;
  }

  async deleteCamera(id: string, orgId: string, userId: string) {
    const existing = await prisma.cctvSource.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('Camera');

    await prisma.cctvSource.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'CAMERA_DELETED',
        resourceType: 'cctv_source',
        resourceId: id,
      },
    });

    await this.syncMediaMtxConfigAll();
  }

  async regenerateApiKey(id: string, orgId: string, userId: string) {
    const existing = await prisma.cctvSource.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw notFound('Camera');

    const plainApiKey = generateApiKey();
    const apiKeyHash = await bcrypt.hash(plainApiKey, 12);

    await prisma.cctvSource.update({
      where: { id },
      data: { apiKeyHash },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'CAMERA_API_KEY_REGENERATED',
        resourceType: 'cctv_source',
        resourceId: id,
      },
    });

    return { api_key: plainApiKey, message: 'API key regenerated. Store this key securely — it will not be shown again.' };
  }

  /**
   * Find camera by API key (used during inference auth)
   */
  async findByApiKey(apiKey: string) {
    const cameras = await prisma.cctvSource.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        organizationId: true,
        threshold: true,
        modelVersion: true,
        apiKeyHash: true,
        status: true,
      },
    });

    for (const camera of cameras) {
      if (camera.apiKeyHash && await bcrypt.compare(apiKey, camera.apiKeyHash)) {
        return camera;
      }
    }

    return null;
  }

  /**
   * Update camera status (called when camera connects/disconnects)
   */
  async updateStatus(id: string, status: CameraStatus) {
    await prisma.cctvSource.update({
      where: { id },
      data: { status, lastSeenAt: status === 'online' ? new Date() : undefined },
    });
  }
}

export const camerasService = new CamerasService();
