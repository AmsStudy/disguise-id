import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  prisma.$on('query', (e: any) => {
    logger.debug('Prisma Query', { query: e.query, duration: e.duration });
  });
}

// @ts-ignore
prisma.$on('error', (e: any) => {
  logger.error('Prisma Error', { message: e.message });
});

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');

    // Self-healing: ensure pgvector extension and 512-dim vector columns exist
    try {
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "watchlist_persons" ADD COLUMN IF NOT EXISTS "embedding" vector(512);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "watchlist_photos" ADD COLUMN IF NOT EXISTS "embedding" vector(512);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "detection_events" ADD COLUMN IF NOT EXISTS "embedding" vector(512);`);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "idx_watchlist_embedding" 
        ON "watchlist_persons" 
        USING hnsw ("embedding" vector_l2_ops) 
        WITH (m = 16, ef_construction = 64) 
        WHERE "deleted_at" IS NULL AND "is_active" = true;
      `);
      logger.info('✅ pgvector extension and 512-dim embedding columns verified');
    } catch (e: any) {
      logger.warn('⚠️ pgvector column initialization notice:', { message: e.message });
    }
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL', { error });
    throw error;
  }
};

export default prisma;
