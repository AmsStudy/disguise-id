import { Job } from 'bullmq';
import { inferenceWorkerProcessor } from '../src/queues/inference.worker';
import { mlService } from '../src/utils/mlServiceClient';
import { mlServiceV2Client } from '../src/utils/mlServiceV2Client';
import { mlExecutionConfig } from '../src/config/ml-execution.config';
import prisma from '../src/config/database';
import { InferenceJobData } from '../src/types';

jest.mock('../src/config/ml-execution.config', () => ({
  mlExecutionConfig: { mode: 'dual' },
}));
jest.mock('../src/utils/mlServiceClient');
jest.mock('../src/utils/mlServiceV2Client');
jest.mock('../src/config/database', () => ({
  $queryRawUnsafe: jest.fn(),
  detectionEvent: { create: jest.fn().mockResolvedValue({ id: 'test-event-id', detectedAt: new Date() }) },
  $executeRawUnsafe: jest.fn(),
  watchlistPerson: { findUnique: jest.fn() },
  alert: { findFirst: jest.fn(), create: jest.fn().mockResolvedValue({ id: 'test-alert-id', person: { id: 'person-123' }, detectionEvent: { source: { id: 'cam-1' } } }), update: jest.fn() },
  auditLog: { create: jest.fn() },
  cctvSource: { update: jest.fn() },
}));
jest.mock('../src/config/minio', () => ({
  uploadFile: jest.fn().mockResolvedValue('http://mock-minio/crop.jpg'),
  BUCKETS: { FACES: 'faces', FRAMES: 'frames' },
  s3Client: { send: jest.fn().mockResolvedValue({ Body: [Buffer.from('mock-frame')] }) },
}));
jest.mock('../src/services/mlServiceV2Persistence');

// REDIS MOCK
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  expire: jest.fn(),
};
jest.mock('../src/config/redis', () => ({
  getRedis: jest.fn(() => mockRedis),
}));

describe('inference.worker execution modes', () => {
  let mockJob: Job<InferenceJobData>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJob = {
      id: 'job-123',
      opts: { attempts: 3 },
      attemptsMade: 0,
      failedReason: '',
      data: {
        jobId: 'job-123',
        cameraId: 'cam-1',
        orgId: 'org-1',
        modelVersion: 'v1',
        frameUrl: 'http://frame',
        frameKey: 'frame.jpg',
        threshold: 4.5,
        timestamp: new Date().toISOString(),
      },
      updateProgress: jest.fn(),
    } as unknown as Job<InferenceJobData>;

    (mlService.processFrame as jest.Mock).mockResolvedValue({
      face_detected: true,
      embedding: new Array(128).fill(0),
      processing_ms: 100,
      confidence: 0.9,
    });

    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
      { id: 'person-1', full_name: 'John Doe', danger_level: 'high', photo_url: null, distance: 2.0 },
    ]);

    (mlServiceV2Client.shadowInfer as jest.Mock).mockResolvedValue({
      frame_decision: 'POSSIBLE_MATCH',
    });

    mockRedis.set.mockResolvedValue('OK');
    mockRedis.decr.mockResolvedValue(0);
  });

  it('v1 mode: calls V1, does NOT call V2, decrements pending count', async () => {
    (mlExecutionConfig as any).mode = 'v1';

    await inferenceWorkerProcessor(mockJob);

    expect(mlService.processFrame).toHaveBeenCalled();
    expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
    expect(prisma.detectionEvent.create).toHaveBeenCalled();
    expect(mlServiceV2Client.shadowInfer).not.toHaveBeenCalled();

    // Assert cleanup
    expect(mockRedis.set).toHaveBeenCalledWith(`camera-inference:job-processed:job-123`, '1', 'NX', 'EX', 3600);
    expect(mockRedis.decr).toHaveBeenCalledWith('camera-inference:cam-1:count');
    expect(mockRedis.del).toHaveBeenCalledWith('camera-inference:cam-1:capture_id');
    expect(mockRedis.del).toHaveBeenCalledWith('camera-inference:cam-1:count');
  });

  it('dual mode: calls V1 and V2, decrements pending count', async () => {
    (mlExecutionConfig as any).mode = 'dual';

    await inferenceWorkerProcessor(mockJob);

    expect(mlService.processFrame).toHaveBeenCalled();
    expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
    expect(prisma.detectionEvent.create).toHaveBeenCalled();
    expect(mlServiceV2Client.shadowInfer).toHaveBeenCalled();

    // Assert cleanup
    expect(mockRedis.decr).toHaveBeenCalledWith('camera-inference:cam-1:count');
    expect(mockRedis.del).toHaveBeenCalledWith('camera-inference:cam-1:capture_id');
    expect(mockRedis.del).toHaveBeenCalledWith('camera-inference:cam-1:count');
  });

  it('v2_shadow mode: does NOT call V1, creates empty DetectionEvent, calls V2, decrements pending count', async () => {
    (mlExecutionConfig as any).mode = 'v2_shadow';

    await inferenceWorkerProcessor(mockJob);

    expect(mlService.processFrame).not.toHaveBeenCalled();
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(prisma.alert.create).not.toHaveBeenCalled();

    expect(prisma.detectionEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        isMatch: false,
        bestMatchId: null,
      })
    }));

    expect(mlServiceV2Client.shadowInfer).toHaveBeenCalled();

    // Assert cleanup
    expect(mockRedis.decr).toHaveBeenCalledWith('camera-inference:cam-1:count');
    expect(mockRedis.del).toHaveBeenCalledWith('camera-inference:cam-1:capture_id');
    expect(mockRedis.del).toHaveBeenCalledWith('camera-inference:cam-1:count');
  });

  describe('focused face count cleanup tests', () => {
    it('multiple face jobs decrement from N to zero', async () => {
      // Mock remaining faces to 1 (not zero yet)
      mockRedis.decr.mockResolvedValueOnce(1);
      await inferenceWorkerProcessor(mockJob);
      expect(mockRedis.decr).toHaveBeenCalledWith('camera-inference:cam-1:count');
      expect(mockRedis.del).not.toHaveBeenCalledWith('camera-inference:cam-1:capture_id');
      expect(mockRedis.del).not.toHaveBeenCalledWith('camera-inference:cam-1:count');

      // Another job finishes, remaining to 0
      jest.clearAllMocks();
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.decr.mockResolvedValueOnce(0);
      mockJob.id = 'job-124';
      await inferenceWorkerProcessor(mockJob);
      expect(mockRedis.decr).toHaveBeenCalledWith('camera-inference:cam-1:count');
      expect(mockRedis.del).toHaveBeenCalledWith('camera-inference:cam-1:capture_id');
      expect(mockRedis.del).toHaveBeenCalledWith('camera-inference:cam-1:count');
    });

    it('final failure releases the lock', async () => {
      (mlExecutionConfig as any).mode = 'v1';
      (prisma.detectionEvent.create as jest.Mock).mockRejectedValueOnce(new Error('Fatal DB error'));
      mockJob.attemptsMade = 2; // Final attempt (max is 3)

      await expect(inferenceWorkerProcessor(mockJob)).rejects.toThrow('Fatal DB error');

      // It should cleanup on final failure
      expect(mockRedis.decr).toHaveBeenCalledWith('camera-inference:cam-1:count');
      expect(mockRedis.del).toHaveBeenCalledWith('camera-inference:cam-1:capture_id');
      expect(mockRedis.del).toHaveBeenCalledWith('camera-inference:cam-1:count');
    });

    it('retries do not release lock before final attempt', async () => {
      (mlExecutionConfig as any).mode = 'v1';
      (prisma.detectionEvent.create as jest.Mock).mockRejectedValueOnce(new Error('Temporary DB error'));
      mockJob.attemptsMade = 0; // Not final attempt

      await expect(inferenceWorkerProcessor(mockJob)).rejects.toThrow('Temporary DB error');

      // Should NOT cleanup
      expect(mockRedis.decr).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('duplicate job does not decrement twice', async () => {
      // mockRedis.set returns null when NX condition fails (already exists)
      mockRedis.set.mockResolvedValueOnce(null);

      await inferenceWorkerProcessor(mockJob);

      expect(mockRedis.set).toHaveBeenCalledWith(`camera-inference:job-processed:job-123`, '1', 'NX', 'EX', 3600);
      expect(mockRedis.decr).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('missing count does not create a negative count', async () => {
      // Redis decr returning negative means count wasn't initialized or went below 0
      mockRedis.decr.mockResolvedValueOnce(-1);

      await inferenceWorkerProcessor(mockJob);

      // Should reset to 0
      expect(mockRedis.set).toHaveBeenCalledWith('camera-inference:cam-1:count', 0);
      expect(mockRedis.del).toHaveBeenCalledWith('camera-inference:cam-1:capture_id');
      expect(mockRedis.del).toHaveBeenCalledWith('camera-inference:cam-1:count');
    });
  });
});
