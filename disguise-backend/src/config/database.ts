import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Prisma Query', { query: e.query, duration: e.duration });
  });
}

prisma.$on('error', (e) => {
  logger.error('Prisma Error', { message: e.message });
});

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL', { error });
    throw error;
  }
};

export default prisma;
