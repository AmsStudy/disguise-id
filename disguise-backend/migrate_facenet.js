const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Starting Facenet vector migration (128 -> 512 dims)...");

    console.log("1. Dropping existing HNSW indexes...");
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS idx_watchlist_embedding;`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS idx_watchlist_persons_embedding;`);

    console.log("2. Dropping embedding columns entirely...");
    await prisma.$executeRawUnsafe(`ALTER TABLE watchlist_persons DROP COLUMN embedding;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE watchlist_photos DROP COLUMN embedding;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE detection_events DROP COLUMN embedding;`);

    console.log("3. Adding embedding columns with vector(512)...");
    await prisma.$executeRawUnsafe(`ALTER TABLE watchlist_persons ADD COLUMN embedding vector(512);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE watchlist_photos ADD COLUMN embedding vector(512);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE detection_events ADD COLUMN embedding vector(512);`);

    console.log("4. Recreating HNSW index...");
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_watchlist_embedding 
      ON watchlist_persons 
      USING hnsw (embedding vector_l2_ops) 
      WITH (m = 16, ef_construction = 64) 
      WHERE deleted_at IS NULL AND is_active = true;
    `);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
