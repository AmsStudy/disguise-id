import prisma from '../../config/database';
import { s3Client, BUCKETS } from '../../config/minio';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { mlService } from '../../utils/mlServiceClient';
import { logger } from '../../config/logger';
import axios from 'axios';

async function fetchPhotoBuffer(photoUrl: string): Promise<Buffer | null> {
  try {
    const bucketPrefix = `${BUCKETS.WATCHLIST}/`;
    if (photoUrl.includes(bucketPrefix)) {
      const key = photoUrl.split(bucketPrefix)[1];
      if (key) {
        try {
          const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKETS.WATCHLIST,
            Key: key,
          }));
          if (response.Body) {
            const chunks: Uint8Array[] = [];
            for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
              chunks.push(chunk);
            }
            return Buffer.concat(chunks);
          }
        } catch (s3Err: any) {
          logger.warn(`S3 direct fetch failed for key ${key}, trying HTTP...`);
        }
      }
    }
    const httpRes = await axios.get(photoUrl, { responseType: 'arraybuffer', timeout: 10000 });
    return Buffer.from(httpRes.data);
  } catch (err: any) {
    logger.error(`Failed to fetch photo buffer from ${photoUrl}: ${err.message}`);
    return null;
  }
}

export async function syncMissingWatchlistEmbeddings(): Promise<void> {
  try {
    // Find persons where embedding is NULL but photoUrl exists
    const missingPersons: Array<{ id: string; full_name: string; photo_url: string }> = await prisma.$queryRawUnsafe(`
      SELECT id, full_name, photo_url
      FROM watchlist_persons
      WHERE deleted_at IS NULL
        AND is_active = true
        AND photo_url IS NOT NULL
        AND embedding IS NULL
    `);

    if (!missingPersons || missingPersons.length === 0) {
      logger.info('✅ All active watchlist persons have valid embeddings.');
      return;
    }

    logger.info(`🔄 Found ${missingPersons.length} watchlist person(s) missing embeddings. Auto-syncing...`);

    for (const person of missingPersons) {
      try {
        const buffer = await fetchPhotoBuffer(person.photo_url);
        if (!buffer) continue;

        const mlResult = await mlService.getEmbedding(buffer, 'photo.jpg');
        if (mlResult.embedding && mlResult.embedding.length === 512) {
          await prisma.$executeRawUnsafe(
            `UPDATE watchlist_persons SET embedding = $1::vector, embedding_model = $2 WHERE id = $3`,
            `[${mlResult.embedding.join(',')}]`,
            'arcface-512d',
            person.id
          );
          logger.info(`✨ Auto-synced 512-dim ArcFace embedding for [${person.full_name}] (${person.id})`);
        } else {
          logger.warn(`⚠️ ML Service did not return 512-dim embedding for [${person.full_name}]`);
        }
      } catch (err: any) {
        logger.error(`Failed to sync embedding for [${person.full_name}]: ${err.message}`);
      }
    }
  } catch (error: any) {
    logger.warn('Could not sync missing watchlist embeddings:', { error: error.message });
  }
}
