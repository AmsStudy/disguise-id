const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Creating HNSW index on watchlist_persons.embedding...");
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_watchlist_persons_embedding 
      ON watchlist_persons 
      USING hnsw (embedding vector_l2_ops);
    `);
    console.log("Successfully created index!");
  } catch (error) {
    console.error("Failed to create index:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
