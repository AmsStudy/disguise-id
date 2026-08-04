import Redis from 'ioredis';
import { logger } from './logger';

let redis: Redis;

export const connectRedis = async (): Promise<void> => {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      keyPrefix: process.env.REDIS_PREFIX || 'disgid:',
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redis.on('connect', () => logger.info('✅ Redis connected'));
    redis.on('error', (err) => logger.error('Redis error', { error: err.message }));
    redis.on('reconnecting', () => logger.warn('Redis reconnecting...'));

    await redis.ping();
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
    throw error;
  }
};

export const getRedis = (): Redis => {
  if (!redis) throw new Error('Redis not initialized. Call connectRedis() first.');
  return redis;
};

export default getRedis;
