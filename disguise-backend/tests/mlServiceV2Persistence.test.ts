import { MlServiceV2Persistence } from '../src/services/mlServiceV2Persistence';
import prisma from '../src/config/database';
import { MLServiceV2Error, V2ErrorCode, V2InferenceResponse } from '../src/types/ml-service-v2.types';
import { logger } from '../src/config/logger';

jest.mock('../src/config/database', () => {
  return {
    __esModule: true,
    default: {
      mlV2InferenceResult: {
        upsert: jest.fn(),
      },
    },
  };
});

jest.mock('../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('MlServiceV2Persistence', () => {
  const mockMetadata = {
    detectionEventId: 'evt-123',
    jobId: 'job-123',
    cameraSessionId: 'cam-sess-1',
    trackId: 'track-1',
    roundTripLatencyMs: 150,
  };

  const mockSuccessResponse: V2InferenceResponse = {
    request_id: 'req-1',
    organization_id: 'org-1',
    camera_id: 'cam-1',
    camera_session_id: 'cam-sess-1',
    track_id: 'track-1',
    model_version: 'v2.0',
    gallery_version: 'g-1',
    original: {
      valid: true,
      candidate_id: 'DID001',
      score: 0.9,
      second_score: 0.8,
      margin: 0.1,
    },
    reconstructed: {
      valid: false,
    },
    selected_branch: 'original',
    candidate_id: 'DID001',
    score: 0.9,
    margin: 0.1,
    frame_decision: 'HIGH_PRIORITY',
    processing_ms: 100,
    requires_operator_verification: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully map and upsert a successful telemetry result', async () => {
    (prisma.mlV2InferenceResult.upsert as jest.Mock).mockResolvedValue({});

    await MlServiceV2Persistence.upsertV2Telemetry(mockMetadata, mockSuccessResponse, false);

    expect(prisma.mlV2InferenceResult.upsert).toHaveBeenCalledWith({
      where: { detectionEventId: 'evt-123' },
      update: expect.objectContaining({
        status: 'SUCCESS',
        jobId: 'job-123',
        originalCandidateId: 'DID001',
        reconstructedValid: false,
        reconstructedCandidateId: null,
      }),
      create: expect.any(Object),
    });
  });

  it('should successfully map and upsert an error result', async () => {
    (prisma.mlV2InferenceResult.upsert as jest.Mock).mockResolvedValue({});
    const err = new MLServiceV2Error(V2ErrorCode.V2_TIMEOUT, 'Timeout');

    await MlServiceV2Persistence.upsertV2Telemetry(mockMetadata, err, false);

    expect(prisma.mlV2InferenceResult.upsert).toHaveBeenCalledWith({
      where: { detectionEventId: 'evt-123' },
      update: expect.objectContaining({
        status: 'FAILED',
        errorCode: 'V2_TIMEOUT',
      }),
      create: expect.any(Object),
    });
  });

  it('should absorb persistence errors when failJob is false', async () => {
    (prisma.mlV2InferenceResult.upsert as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    await expect(
      MlServiceV2Persistence.upsertV2Telemetry(mockMetadata, mockSuccessResponse, false)
    ).resolves.not.toThrow();

    expect(logger.error).toHaveBeenCalledWith('Failed to persist ML Service V2 telemetry:', expect.any(Error));
  });

  it('should propagate persistence errors when failJob is true', async () => {
    (prisma.mlV2InferenceResult.upsert as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    await expect(
      MlServiceV2Persistence.upsertV2Telemetry(mockMetadata, mockSuccessResponse, true)
    ).rejects.toThrow('DB connection lost');
  });

  describe('requiresOperatorVerificationForDecision', () => {
    it('should return true for HIGH_PRIORITY_CANDIDATE', () => {
      expect(MlServiceV2Persistence.requiresOperatorVerificationForDecision('SUCCESS', 'HIGH_PRIORITY_CANDIDATE')).toBe(true);
    });

    it('should return true for POSSIBLE_MATCH', () => {
      expect(MlServiceV2Persistence.requiresOperatorVerificationForDecision('SUCCESS', 'POSSIBLE_MATCH')).toBe(true);
    });

    it('should return false for UNKNOWN', () => {
      expect(MlServiceV2Persistence.requiresOperatorVerificationForDecision('SUCCESS', 'UNKNOWN')).toBe(false);
    });

    it('should return false for FAILED/V2_AUTH_ERROR status', () => {
      expect(MlServiceV2Persistence.requiresOperatorVerificationForDecision('FAILED', 'HIGH_PRIORITY_CANDIDATE')).toBe(false);
      expect(MlServiceV2Persistence.requiresOperatorVerificationForDecision('V2_AUTH_ERROR', 'POSSIBLE_MATCH')).toBe(false);
    });

    it('should return false for missing decision', () => {
      expect(MlServiceV2Persistence.requiresOperatorVerificationForDecision('SUCCESS', null)).toBe(false);
      expect(MlServiceV2Persistence.requiresOperatorVerificationForDecision('SUCCESS', undefined)).toBe(false);
    });
  });
});
