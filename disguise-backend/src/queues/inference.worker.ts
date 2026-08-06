import { Job } from 'bullmq';
import prisma from '../config/database';
import { mlService } from '../utils/mlServiceClient';
import { mlServiceV2Client } from '../utils/mlServiceV2Client';
import { MlServiceV2Persistence } from '../services/mlServiceV2Persistence';
import { mlServiceV2Config } from '../config/ml-service-v2.config';
import { uploadFile, BUCKETS } from '../config/minio';
import { generateFileKey } from '../utils/helpers';
import { InferenceJobData } from '../types';
import { logger } from '../config/logger';
import { emitAlertNew } from '../sockets';
import { mlExecutionConfig } from '../config/ml-execution.config';

interface V1InferenceOutcome {
  attempted: boolean;
  faceDetected: boolean;
  embedding: number[] | null;
  processingMs: number;
  confidence: number | null;
  faceCropBase64?: string;
  reason?: string;
}

export const inferenceWorkerProcessor = async (job: Job<InferenceJobData>): Promise<void> => {
  const { cameraId, orgId, modelVersion, frameUrl, frameKey, timestamp, metadata } = job.data;
  const startTime = Date.now();
  const v1Attempted = mlExecutionConfig.mode === 'v1' || mlExecutionConfig.mode === 'dual';
  const v2Attempted = mlExecutionConfig.mode === 'dual' || mlExecutionConfig.mode === 'v2_shadow';

  logger.info('Processing inference job', {
    jobId: job.id,
    cameraId,
    orgId,
    mlExecutionMode: mlExecutionConfig.mode,
    v1Attempted,
    v2Attempted
  });

  try {
    // Update job progress
    await job.updateProgress(10);

    // 1. Fetch frame from MinIO (already uploaded before enqueueing)
    // The frame data should be accessible via the frameKey
    // For now, we call ML service with the stored URL

    // 2. Call ML service to process the frame
    // In production, the ML service fetches directly from MinIO or we pass the buffer
    // Here we simulate by calling the ML service with the frame URL
    let v1Outcome: V1InferenceOutcome = {
      attempted: false,
      faceDetected: false,
      embedding: null,
      processingMs: 0,
      confidence: null,
      reason: 'SKIPPED_BY_EXECUTION_MODE'
    };

    let frameBuffer: Buffer | null = await fetchFrameFromMinio(frameKey);

    if (v1Attempted && frameBuffer) {
      v1Outcome.attempted = true;
      try {
        const mlResult = await mlService.processFrame(frameBuffer, frameKey.split('/').pop() || 'frame.jpg');
        v1Outcome = {
          attempted: true,
          faceDetected: mlResult.face_detected,
          embedding: mlResult.embedding,
          processingMs: mlResult.processing_ms,
          confidence: mlResult.confidence,
          faceCropBase64: mlResult.face_crop_base64,
        };
      } catch (mlError) {
        v1Outcome.reason = 'NETWORK_OR_INTERNAL_ERROR';
        logger.warn('ML service error, recording event without match', { error: mlError, jobId: job.id });
      }
    }

    await job.updateProgress(50);

    let bestMatchId: string | undefined;
    let bestMatchSim = 0;
    let isMatch = false;
    let faceCropUrl: string | undefined;
    let tier = 'RENDAH';
    let marginPct = 100.0;
    let topCandidates: Array<{ id: string; name: string; distance: number }> = [];

    // 3. If face detected, search watchlist
    if (v1Outcome.faceDetected && v1Outcome.embedding) {
      // Upload face crop if returned by ML service, otherwise inherit from uploaded capture frame metadata
      if (v1Outcome.faceCropBase64) {
        try {
          const cropBuffer = Buffer.from(v1Outcome.faceCropBase64, 'base64');
          const cropKey = generateFileKey('faces', 'crop.jpg');
          faceCropUrl = await uploadFile(BUCKETS.FACES, cropKey, cropBuffer, 'image/jpeg');
        } catch (uploadErr) {
          logger.warn('Failed to upload face crop', { error: uploadErr });
        }
      } else {
        faceCropUrl = (metadata?.faceCropUrl as string) || job.data.frameUrl;
      }

      // 4. Vector similarity search via raw SQL (pgvector - Euclidean L2)
      const embeddingStr = `[${v1Outcome.embedding.join(',')}]`;
      const candidates = await prisma.$queryRawUnsafe<Array<{
        id: string;
        full_name: string;
        danger_level: string;
        photo_url: string | null;
        distance: number;
      }>>(
        `SELECT
          id,
          full_name,
          danger_level,
          photo_url,
          (embedding <-> $1::vector) AS distance
        FROM watchlist_persons
        WHERE
          organization_id = $2
          AND is_active = true
          AND deleted_at IS NULL
          AND embedding IS NOT NULL
          AND (embedding <-> $1::vector) <= 4.5
        ORDER BY embedding <-> $1::vector
        LIMIT 3`,
        embeddingStr,
        orgId
      );

      if (candidates.length > 0) {
        topCandidates = candidates.map(c => ({
          id: c.id,
          name: c.full_name,
          distance: Number(c.distance),
        }));

        const dist1 = Number(candidates[0].distance);
        bestMatchId = candidates[0].id;
        bestMatchSim = -dist1; // Store distance as negative in similarity_score column for DB backward compatibility

        // Step 1: Initial tier classification
        if (dist1 <= 3.5) {
          tier = 'TINGGI';
        } else if (dist1 <= 4.5) {
          tier = 'SEDANG';
        } else {
          tier = 'RENDAH';
        }

        // Step 2: Relative margin analysis between candidate #1 and #2
        if (candidates.length > 1) {
          const dist2 = Number(candidates[1].distance);
          if (dist2 > 0) {
            marginPct = ((dist2 - dist1) / dist2) * 100;
            if (marginPct < 15.0) {
              // Ambiguity detected -> Downgrade tier by one level
              if (tier === 'TINGGI') tier = 'SEDANG';
              else if (tier === 'SEDANG') tier = 'RENDAH';
            }
          }
        }

        // Step 3: Final decision
        if (tier === 'TINGGI' || tier === 'SEDANG') {
          isMatch = true;
        }
      }
    }

    await job.updateProgress(70);

    // 5. Insert detection event (mapping correct camera scene thumbnail and face crop URLs)
    const sceneFrameUrl = (metadata?.frameThumbUrl as string) || frameUrl;
    const finalFaceCropUrl = faceCropUrl || (metadata?.faceCropUrl as string) || frameUrl;

    const processingMs = Date.now() - startTime + v1Outcome.processingMs;
    const detectionEvent = await prisma.detectionEvent.create({
      data: {
        organizationId: orgId,
        sourceId: cameraId,
        frameUrl: sceneFrameUrl,
        faceCropUrl: finalFaceCropUrl,
        bestMatchId: bestMatchId || null,
        bestMatchSim: bestMatchSim || null,
        isMatch,
        processingMs,
        modelVersion,
        metadata: { ...(metadata || {}), confidence: v1Outcome.confidence, tier, margin_pct: marginPct, top_candidates: topCandidates },
        detectedAt: new Date(timestamp),
      },
    });

    // Store embedding in detection event via raw SQL
    if (v1Outcome.embedding) {
      await prisma.$executeRawUnsafe(
        `UPDATE detection_events SET embedding = $1::vector WHERE id = $2`,
        `[${v1Outcome.embedding.join(',')}]`,
        detectionEvent.id
      );
    }

    await job.updateProgress(85);

    // 6. If match found, create alert and emit WebSocket event
    if (isMatch && bestMatchId) {
      const person = await prisma.watchlistPerson.findUnique({
        where: { id: bestMatchId },
        select: { dangerLevel: true, fullName: true, photoUrl: true },
      });

      // Map danger level to priority
      const priorityMap: Record<string, string> = {
        low: 'low',
        medium: 'medium',
        high: 'high',
        critical: 'critical',
      };

      // Best-Shot dynamic promotion session window: 5 minutes
      const sessionWindow = new Date(Date.now() - 5 * 60 * 1000);
      const recentAlert = await prisma.alert.findFirst({
        where: {
          organizationId: orgId,
          personId: bestMatchId,
          createdAt: { gte: sessionWindow },
        },
        include: {
          person: { select: { id: true, fullName: true, dangerLevel: true, photoUrl: true } },
          detectionEvent: {
            include: {
              source: { select: { id: true, name: true, locationName: true } },
            },
          },
        },
      });

      if (!recentAlert) {
        // First capture in session: create initial alert card
        const alert = await prisma.alert.create({
          data: {
            organizationId: orgId,
            detectionEventId: detectionEvent.id,
            personId: bestMatchId,
            similarityScore: bestMatchSim,
            status: 'pending',
            priority: priorityMap[person?.dangerLevel || 'medium'] || 'medium',
          },
          include: {
            person: { select: { id: true, fullName: true, dangerLevel: true, photoUrl: true } },
            detectionEvent: {
              include: {
                source: { select: { id: true, name: true, locationName: true } },
              },
            },
          },
        });

        await prisma.auditLog.create({
          data: {
            organizationId: orgId,
            action: 'ALERT_CREATED',
            resourceType: 'alert',
            resourceId: alert.id,
            newValue: {
              person_id: bestMatchId,
              similarity: bestMatchSim,
              camera_id: cameraId,
              tier,
              margin_pct: marginPct,
            },
          },
        });

        // Emit initial WebSocket event to organization room
        emitAlertNew(orgId, {
          tier,
          distance: Math.abs(bestMatchSim),
          margin_pct: marginPct,
          top_candidates: topCandidates,
          alert: {
            id: alert.id,
            status: alert.status,
            priority: alert.priority,
            similarityScore: alert.similarityScore,
            createdAt: alert.createdAt,
          },
          person: alert.person,
          camera: alert.detectionEvent.source,
          detection: {
            faceCropUrl: finalFaceCropUrl,
            frameUrl: sceneFrameUrl,
            detectedAt: detectionEvent.detectedAt,
          },
        });

        logger.info('Alert created and emitted', {
          alertId: alert.id,
          personId: bestMatchId,
          similarity: bestMatchSim,
          orgId,
        });
      } else {
        // Best-Shot Promotion: Compare Euclidean distance (smaller distance = stronger biometric accuracy)
        const currentDist = Math.abs(Number(recentAlert.similarityScore || 999));
        const newDist = Math.abs(bestMatchSim);

        if (newDist < currentDist) {
          // Upgrade existing alert record with stronger accuracy and clearer face crop photo
          const upgradedAlert = await prisma.alert.update({
            where: { id: recentAlert.id },
            data: {
              detectionEventId: detectionEvent.id,
              similarityScore: bestMatchSim,
              priority: priorityMap[person?.dangerLevel || 'medium'] || 'medium',
              updatedAt: new Date(),
            },
            include: {
              person: { select: { id: true, fullName: true, dangerLevel: true, photoUrl: true } },
              detectionEvent: {
                include: {
                  source: { select: { id: true, name: true, locationName: true } },
                },
              },
            },
          });

          // Broadcast upgraded best-shot to frontend so UI dynamically replaces the old photo with the clearer high-accuracy one
          emitAlertNew(orgId, {
            tier,
            distance: newDist,
            margin_pct: marginPct,
            top_candidates: topCandidates,
            alert: {
              id: upgradedAlert.id,
              status: upgradedAlert.status,
              priority: upgradedAlert.priority,
              similarityScore: upgradedAlert.similarityScore,
              createdAt: upgradedAlert.createdAt,
            },
            person: upgradedAlert.person,
            camera: upgradedAlert.detectionEvent.source,
            detection: {
              faceCropUrl: finalFaceCropUrl,
              frameUrl: sceneFrameUrl,
              detectedAt: detectionEvent.detectedAt,
            },
          });

          logger.info('Best-Shot Promotion: Upgraded alert with stronger accuracy photo', {
            alertId: upgradedAlert.id,
            personId: bestMatchId,
            oldDistance: currentDist.toFixed(3),
            newDistance: newDist.toFixed(3),
            orgId,
          });
        } else {
          logger.info('Suppressed weaker detection (best-shot already retained in active session)', {
            personId: bestMatchId,
            retainedBestDistance: currentDist.toFixed(3),
            ignoredWeakerDistance: newDist.toFixed(3),
            orgId,
          });
        }
      }
    }

    // Update camera last_seen_at
    await prisma.cctvSource.update({
      where: { id: cameraId },
      data: { lastSeenAt: new Date(), status: 'online' },
    });

    // 7. Phase 3A Shadow Integration: Call ML Service V2 sequentially
    if (v2Attempted && frameBuffer) {
      // Do not block or fail the existing pipeline
      try {
        const v2StartTime = Date.now();
        const v2Result = await mlServiceV2Client.shadowInfer(
          job.id || 'unknown-job-id',
          frameBuffer,
          {
            organization_id: orgId,
            camera_id: cameraId,
            camera_session_id: job.data.metadata?.cameraSessionId as string || `legacy-session-${cameraId}`,
            track_id: job.data.metadata?.trackId as string || `legacy-job-${job.id || 'unknown'}`,
            captured_at: new Date(timestamp).toISOString(),
            frame_number: metadata?.frameNumber ? Number(metadata.frameNumber) : 0,
            bounding_box_json: JSON.stringify(metadata?.boundingBox || [0, 0, 0, 0]),
            landmarks_json: metadata?.landmarks ? JSON.stringify(metadata.landmarks) : undefined,
            detection_score: metadata?.confidence ? Number(metadata.confidence) : undefined,
            quality_score: metadata?.qualityScore ? Number(metadata.qualityScore) : undefined,
          }
        );

        if (mlServiceV2Config.persistenceEnabled && v2Result) {
          await MlServiceV2Persistence.upsertV2Telemetry({
            detectionEventId: detectionEvent.id,
            jobId: job.id,
            cameraSessionId: job.data.metadata?.cameraSessionId as string || `legacy-session-${cameraId}`,
            trackId: job.data.metadata?.trackId as string || `legacy-job-${job.id || 'unknown'}`,
            roundTripLatencyMs: Date.now() - v2StartTime,
          }, v2Result, mlServiceV2Config.persistenceFailJob);
        }
      } catch (err) {
        // Safe to ignore in shadow mode unless failJob is intentionally enabled in config
        if (mlServiceV2Config.failJob || mlServiceV2Config.persistenceFailJob) {
          throw err;
        }
      }
    }

    await job.updateProgress(100);
    logger.info('Inference job complete', {
      jobId: job.id,
      isMatch,
      processingMs,
      faceDetected: v1Outcome.faceDetected,
    });
  } catch (error) {
    logger.error('Inference worker error', { jobId: job.id, error });
    throw error; // Re-throw to trigger BullMQ retry
  } finally {
    // Decrement pending face count and release capture lock if 0
    try {
      const redis = require('../config/redis').getRedis();
      const activeCaptureKey = `camera-inference:${cameraId}:capture_id`;
      const pendingCountKey = `camera-inference:${cameraId}:count`;

      const remaining = await redis.decr(pendingCountKey);
      if (remaining <= 0) {
        // All faces for this capture have been processed, clear the active capture to immediately allow next frame
        await redis.del(activeCaptureKey);
      }
    } catch (e) {
      logger.warn('Failed to decrement pending face count', { error: e });
    }
  }
};

/**
 * Fetch frame buffer from MinIO
 */
async function fetchFrameFromMinio(key: string): Promise<Buffer | null> {
  try {
    const { s3Client, BUCKETS } = await import('../config/minio');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKETS.FRAMES,
      Key: key,
    }));

    if (response.Body) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
    return null;
  } catch (err) {
    logger.warn('Failed to fetch frame from MinIO', { key, error: err });
    return null;
  }
}
