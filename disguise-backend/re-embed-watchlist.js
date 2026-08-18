/**
 * Re-embed all watchlist persons that have no embedding.
 * Run this after ML service is up and persons were added while ML was down.
 * 
 * Usage inside container: node re-embed-watchlist.js
 */
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const FormData = require('form-data');
const https = require('https');
const http = require('http');

const prisma = new PrismaClient();

const ML_URL = process.env.ML_SERVICE_V2_URL || 'http://ml-service:8001';
const ML_KEY = process.env.ML_SERVICE_V2_API_KEY || 'WalMWH1hinTEutYiOoeVeH8NYG-9d0P8DunLSlwYzGtgSCabPbN-bfQlQmBDtgec';
const MINIO_PUBLIC = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';
const MINIO_INTERNAL = 'http://minio:9000'; // internal docker hostname

async function downloadPhoto(url) {
  // Replace public URL with internal docker hostname
  const internalUrl = url.replace(MINIO_PUBLIC, MINIO_INTERNAL).replace('http://localhost:9000', MINIO_INTERNAL);
  console.log(`  Downloading: ${internalUrl}`);
  const resp = await axios.get(internalUrl, { responseType: 'arraybuffer', timeout: 15000 });
  return Buffer.from(resp.data);
}

async function getEmbedding(imageBuffer, filename) {
  const form = new FormData();
  form.append('image', imageBuffer, { filename: filename || 'photo.jpg' });
  const resp = await axios.post(`${ML_URL}/v2/embed`, form, {
    headers: { ...form.getHeaders(), 'X-Api-Key': ML_KEY },
    timeout: 30000,
  });
  return resp.data;
}

async function main() {
  console.log('=== Re-embedding Watchlist Persons ===\n');

  const persons = await prisma.$queryRaw`
    SELECT id, full_name, photo_url, (embedding IS NOT NULL) as has_embedding 
    FROM watchlist_persons 
    WHERE deleted_at IS NULL AND is_active = true
    ORDER BY created_at ASC
  `;

  console.log(`Found ${persons.length} persons total\n`);

  let success = 0, skipped = 0, failed = 0;

  for (const person of persons) {
    if (person.has_embedding) {
      console.log(`[SKIP] ${person.full_name} — already has embedding`);
      skipped++;
      continue;
    }

    if (!person.photo_url) {
      console.log(`[SKIP] ${person.full_name} — no photo URL`);
      skipped++;
      continue;
    }

    try {
      console.log(`[EMBED] ${person.full_name}...`);
      const buffer = await downloadPhoto(person.photo_url);
      const result = await getEmbedding(buffer, 'photo.jpg');

      if (!result.face_detected || !result.embedding) {
        console.log(`  ⚠ No face detected in photo for ${person.full_name}`);
        failed++;
        continue;
      }

      const embeddingStr = `[${result.embedding.join(',')}]`;
      await prisma.$executeRaw`
        UPDATE watchlist_persons SET embedding = ${embeddingStr}::vector WHERE id = ${person.id}
      `;

      console.log(`  ✅ Embedded ${person.full_name} (confidence: ${result.confidence?.toFixed(3)})`);
      success++;
    } catch (err) {
      console.error(`  ❌ Failed for ${person.full_name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Success: ${success} | Skipped: ${skipped} | Failed: ${failed}`);
  console.log(`\nAll persons with embeddings are now ready for detection!`);
}

main()
  .catch(e => { console.error('Fatal:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
