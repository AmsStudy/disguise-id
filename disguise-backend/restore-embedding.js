const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Restoring embedding columns...');
  
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "watchlist_persons" ADD COLUMN "embedding" vector(128)');
    console.log('Added embedding to watchlist_persons');
  } catch (e) { console.log('watchlist_persons column already exists or error:', e.message); }

  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "watchlist_photos" ADD COLUMN "embedding" vector(128)');
    console.log('Added embedding to watchlist_photos');
  } catch (e) { console.log('watchlist_photos column already exists or error:', e.message); }

  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "detection_events" ADD COLUMN "embedding" vector(128)');
    console.log('Added embedding to detection_events');
  } catch (e) { console.log('detection_events column already exists or error:', e.message); }

  try {
    await prisma.$executeRawUnsafe('CREATE INDEX "idx_watchlist_embedding" ON "watchlist_persons" USING hnsw ("embedding" vector_l2_ops) WITH (m = 16, ef_construction = 64) WHERE "deleted_at" IS NULL AND "is_active" = true');
    console.log('Created HNSW index');
  } catch (e) { console.log('Index already exists or error:', e.message); }

  console.log('Done!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
