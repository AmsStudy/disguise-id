import { Queue, Worker, QueueEvents } from 'bullmq';
import { getRedis } from '../config/redis';
import { logger } from '../config/logger';
import { inferenceWorkerProcessor } from './inference.worker';
import { InferenceJobData } from '../types';

let inferenceQueue: Queue<InferenceJobData>;
let inferenceWorker: Worker<InferenceJobData>;

const QUEUE_NAME = 'inference-queue';

export const getInferenceQueue = (): Queue<InferenceJobData> => {
  if (!inferenceQueue) throw new Error('Inference queue not initialized');
  return inferenceQueue;
};

export const startWorkers = async (): Promise<void> => {
  const connection = {
    host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
    port: parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'),
  };

  // Create queue
  inferenceQueue = new Queue<InferenceJobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });

  // Create worker
  inferenceWorker = new Worker<InferenceJobData>(
    QUEUE_NAME,
    inferenceWorkerProcessor,
    {
      connection,
      concurrency: Number(process.env.WORKER_CONCURRENCY) || 5,
    }
  );

  // Worker event listeners
  inferenceWorker.on('completed', (job) => {
    logger.info('Inference job completed', { jobId: job.id });
  });

  inferenceWorker.on('failed', (job, err) => {
    logger.error('Inference job failed', {
      jobId: job?.id,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  inferenceWorker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
  });

  // Queue events for monitoring
  const queueEvents = new QueueEvents(QUEUE_NAME, { connection });
  queueEvents.on('waiting', ({ jobId }) => {
    logger.debug('Job waiting', { jobId });
  });

  logger.info('✅ BullMQ workers started');
};

export const addInferenceJob = async (data: InferenceJobData): Promise<string> => {
  const queue = getInferenceQueue();
  const job = await queue.add('process-frame', data, {
    jobId: data.jobId,
    priority: 1,
  });
  return job.id || data.jobId;
};

export const getJobStatus = async (jobId: string) => {
  const queue = getInferenceQueue();
  const job = await queue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  return {
    id: job.id,
    status: state,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    createdAt: new Date(job.timestamp).toISOString(),
    processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
    finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    failedReason: job.failedReason,
  };
};
