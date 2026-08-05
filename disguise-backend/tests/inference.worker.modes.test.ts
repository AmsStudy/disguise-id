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

describe('inference.worker execution modes', () => {
  let mockJob: Job<InferenceJobData>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJob = {
      id: 'job-123',
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
  });

  it('v1 mode: calls V1, does NOT call V2', async () => {
    (mlExecutionConfig as any).mode = 'v1';

    await inferenceWorkerProcessor(mockJob);

    expect(mlService.processFrame).toHaveBeenCalled();
    expect(prisma.$queryRawUnsafe).toHaveBeenCalled(); // pgvector
    expect(prisma.detectionEvent.create).toHaveBeenCalled();
    expect(mlServiceV2Client.shadowInfer).not.toHaveBeenCalled();
  });

  it('dual mode: calls V1 and V2', async () => {
    (mlExecutionConfig as any).mode = 'dual';

    await inferenceWorkerProcessor(mockJob);

    expect(mlService.processFrame).toHaveBeenCalled();
    expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
    expect(prisma.detectionEvent.create).toHaveBeenCalled();
    expect(mlServiceV2Client.shadowInfer).toHaveBeenCalled();
  });

  it('v2_shadow mode: does NOT call V1, creates empty DetectionEvent, calls V2', async () => {
    (mlExecutionConfig as any).mode = 'v2_shadow';

    await inferenceWorkerProcessor(mockJob);

    expect(mlService.processFrame).not.toHaveBeenCalled();
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled(); // No pgvector
    expect(prisma.alert.create).not.toHaveBeenCalled(); // No V1 Alert

    expect(prisma.detectionEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        isMatch: false,
        bestMatchId: null,
      })
    }));

    expect(mlServiceV2Client.shadowInfer).toHaveBeenCalled();
  });
});
