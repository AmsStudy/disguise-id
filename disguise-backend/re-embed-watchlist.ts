import prisma from './src/config/database';
import { s3Client, BUCKETS } from './src/config/minio';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { mlService } from './src/utils/mlServiceClient';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function fetchBuffer(photoUrl: string): Promise<Buffer | null> {
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
          console.warn(`S3 direct fetch failed for key ${key}, trying HTTP get...`);
        }
      }
    }
    // Fallback via direct HTTP fetch
    const httpRes = await axios.get(photoUrl, { responseType: 'arraybuffer' });
    return Buffer.from(httpRes.data);
  } catch (err: any) {
    console.error(`Failed to download photo from ${photoUrl}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('🚀 Starting VAE Phase 5: Database index migration & Re-embedding Watchlist...');

  try {
    // 1. Migrate PostgreSQL HNSW index from vector_cosine_ops to vector_l2_ops (Phase 2 requirement)
    console.log('📦 Updating PostgreSQL pgvector HNSW index to vector_l2_ops (Euclidean distance)...');
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS idx_watchlist_embedding;`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_watchlist_embedding 
      ON watchlist_persons USING hnsw (embedding vector_l2_ops) 
      WITH (m = 16, ef_construction = 64) 
      WHERE deleted_at IS NULL AND is_active = true;
    `);
    console.log('✅ Index successfully migrated to vector_l2_ops.');

    // 2. Fetch all watchlist persons that are active and not deleted
    const persons = await prisma.watchlistPerson.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        photos: true,
      },
    });

    console.log(`🔍 Found ${persons.length} watchlist person(s) to check/re-embed.`);

    let successCount = 0;
    let failCount = 0;

    for (const person of persons) {
      console.log(`\n▶ Processing DPO: [${person.fullName}] (ID: ${person.id})`);
      
      const targetUrl = person.photoUrl || (person.photos.length > 0 ? person.photos[0].photoUrl : null);
      if (!targetUrl) {
        console.warn(`⚠️ No photo found for person [${person.fullName}], skipping...`);
        failCount++;
        continue;
      }

      const buffer = await fetchBuffer(targetUrl);
      if (!buffer) {
        console.warn(`⚠️ Could not retrieve image buffer for [${person.fullName}], skipping...`);
        failCount++;
        continue;
      }

      try {
        const mlResult = await mlService.getEmbedding(buffer, 'photo.jpg');
        if (mlResult.embedding && mlResult.embedding.length === 128) {
          const embeddingStr = `[${mlResult.embedding.join(',')}]`;
          await prisma.$executeRawUnsafe(
            `UPDATE watchlist_persons SET embedding = $1::vector, embedding_model = $2 WHERE id = $3`,
            embeddingStr,
            'vae-v1-128d',
            person.id
          );
          console.log(`✨ Successfully updated [${person.fullName}] with 128-dim VAE embedding!`);
          successCount++;
        } else {
          console.error(`❌ Expected 128-dim vector from ML Service, but got dimension: ${mlResult.embedding?.length || 0}`);
          failCount++;
        }
      } catch (mlErr: any) {
        console.error(`❌ ML Service error for [${person.fullName}]:`, mlErr.message);
        failCount++;
      }
    }

    console.log(`\n🎯 Re-embedding complete! Success: ${successCount}, Skipped/Failed: ${failCount}`);
  } catch (error: any) {
    console.error('💥 Fatal error during migration/re-embedding:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
