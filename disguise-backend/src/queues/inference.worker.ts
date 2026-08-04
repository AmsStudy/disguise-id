import { Job } from 'bullmq';
import prisma from '../config/database';
import { mlService } from '../utils/mlServiceClient';
import { uploadFile, BUCKETS } from '../config/minio';
import { generateFileKey } from '../utils/helpers';
import { InferenceJobData } from '../types';
import { logger } from '../config/logger';
import { emitAlertNew } from '../sockets';

export const inferenceWorkerProcessor = async (job: Job<InferenceJobData>): Promise<void> => {
  const { cameraId, orgId, threshold, modelVersion, frameUrl, frameKey, timestamp, metadata } = job.data;
  const startTime = Date.now();

  logger.info('Processing inference job', { jobId: job.id, cameraId, orgId });

  try {
    // Update job progress
    await job.updateProgress(10);

    // 1. Fetch frame from MinIO (already uploaded before enqueueing)
    // The frame data should be accessible via the frameKey
    // For now, we call ML service with the stored URL

    // 2. Call ML service to process the frame
    // In production, the ML service fetches directly from MinIO or we pass the buffer
    // Here we simulate by calling the ML service with the frame URL
    let mlResult: { embedding: number[] | null; face_detected: boolean; face_crop_base64?: string; confidence: number; processing_ms: number } = {
      embedding: null,
      face_detected: false,
      confidence: 0,
      processing_ms: 0,
    };

    try {
      // Attempt to call ML service
      // In a real scenario, you'd fetch the frame buffer from MinIO here
      // and pass it to the ML service. We use a graceful degradation approach.
      const s3GetResponse = await fetchFrameFromMinio(frameKey);
      if (s3GetResponse) {
        mlResult = await mlService.processFrame(s3GetResponse, frameKey.split('/').pop() || 'frame.jpg');
      }
    } catch (mlError) {
      logger.warn('ML service error, recording event without match', { error: mlError, jobId: job.id });
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
    if (mlResult.face_detected && mlResult.embedding) {
      // Upload face crop if returned by ML service, otherwise inherit from uploaded capture frame metadata
      if (mlResult.face_crop_base64) {
        try {
          const cropBuffer = Buffer.from(mlResult.face_crop_base64, 'base64');
          const cropKey = generateFileKey('faces', 'crop.jpg');
          faceCropUrl = await uploadFile(BUCKETS.FACES, cropKey, cropBuffer, 'image/jpeg');
        } catch (uploadErr) {
          logger.warn('Failed to upload face crop', { error: uploadErr });
        }
      } else {
        faceCropUrl = (metadata?.faceCropUrl as string) || job.data.frameUrl;
      }

      // 4. Vector similarity search via raw SQL (pgvector - Euclidean L2)
      const embeddingStr = `[${mlResult.embedding.join(',')}]`;
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

    const processingMs = Date.now() - startTime + mlResult.processing_ms;
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
        metadata: { ...(metadata || {}), confidence: mlResult.confidence, tier, margin_pct: marginPct, top_candidates: topCandidates },
        detectedAt: new Date(timestamp),
      },
    });

    // Store embedding in detection event via raw SQL
    if (mlResult.embedding) {
      await prisma.$executeRawUnsafe(
        `UPDATE detection_events SET embedding = $1::vector WHERE id = $2`,
        `[${mlResult.embedding.join(',')}]`,
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

    await job.updateProgress(100);
    logger.info('Inference job complete', {
      jobId: job.id,
      isMatch,
      processingMs,
      faceDetected: mlResult.face_detected,
    });
  } catch (error) {
    logger.error('Inference worker error', { jobId: job.id, error });
    throw error; // Re-throw to trigger BullMQ retry
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
