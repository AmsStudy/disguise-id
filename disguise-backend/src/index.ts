import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { initializeSocket } from './sockets';
import { logger } from './config/logger';
import { connectRedis } from './config/redis';
import { connectDatabase } from './config/database';
import { ensureBuckets } from './config/minio';
import { startWorkers } from './queues';
import { camerasService } from './modules/cameras/cameras.service';

import axios from 'axios';

const PORT = process.env.PORT || 3000;

async function checkMediaMTX() {
  const mtxApiUrl = process.env.MEDIAMTX_API_URL || 'http://127.0.0.1:9997';
  try {
    // Check MediaMTX API endpoint
    await axios.get(`${mtxApiUrl}/v3/paths/list`, { timeout: 3000 });
    logger.info(`✅ MediaMTX API is reachable (${mtxApiUrl})`);
    
    // Sync cameras
    await camerasService.syncMediaMtxConfigAll();
    logger.info(`✅ Camera configurations synced to MediaMTX`);
  } catch (error: any) {
    logger.warn(`⚠️ MediaMTX API check failed. Streaming features may not work. Error: ${error.message}`);
    // We do not exit the process here to allow backend to run even if MediaMTX is down,
    // as requested, it's a preflight warning/check.
  }
}

async function bootstrap() {
  try {
    // Connect to services
    await connectDatabase();
    await connectRedis();
    await ensureBuckets();
    await checkMediaMTX();

    // Create HTTP + WebSocket server
    const httpServer = createServer(app);
    initializeSocket(httpServer);

    // Start BullMQ workers
    await startWorkers();

    httpServer.listen(PORT, () => {
      logger.info(`🚀 DISGUISE-ID Backend running on port ${PORT}`, {
        env: process.env.NODE_ENV,
        port: PORT,
        version: process.env.API_VERSION || 'v1',
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to bootstrap application', { error });
    process.exit(1);
  }
}

bootstrap();
