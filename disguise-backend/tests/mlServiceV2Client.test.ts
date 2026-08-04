import { mlServiceV2Client } from '../src/utils/mlServiceV2Client';
import { mlServiceV2Config } from '../src/config/ml-service-v2.config';
import { mlServiceV2Logger } from '../src/utils/mlServiceV2Logger';
import { MLServiceV2Error, V2ErrorCode } from '../src/types/ml-service-v2.types';
import MockAdapter from 'axios-mock-adapter';

// Mock the logger to prevent actual file writes and to inspect logs
jest.mock('../src/utils/mlServiceV2Logger', () => ({
  mlServiceV2Logger: {
    log: jest.fn(),
  },
}));

describe('MLServiceV2Client', () => {
  let mock: MockAdapter;
  const dummyBuffer = Buffer.from('dummy-image');
  const metadata = {
    organization_id: 'org1',
    camera_id: 'cam1',
    camera_session_id: 'session1',
    track_id: 'track1',
    captured_at: new Date().toISOString(),
    frame_number: 1,
    bounding_box_json: '[0,0,10,10]',
  };

  const originalConfig = { ...mlServiceV2Config };

  beforeAll(() => {
    // @ts-expect-error - Accessing private client for mocking
    mock = new MockAdapter(mlServiceV2Client.client);
  });

  beforeEach(() => {
    mock.reset();
    jest.clearAllMocks();
    // Restore default config
    Object.assign(mlServiceV2Config, originalConfig, {
      enabled: true,
      apiKey: 'valid_key',
      failJob: false, // Default to shadow mode behavior (no throw)
    });
  });

  afterAll(() => {
    mock.restore();
    Object.assign(mlServiceV2Config, originalConfig);
  });

  it('should not do anything if disabled mode', async () => {
    mlServiceV2Config.enabled = false;
    await mlServiceV2Client.shadowInfer('job1', dummyBuffer, metadata);
    expect(mock.history.post.length).toBe(0);
    expect(mlServiceV2Logger.log).not.toHaveBeenCalled();
  });

  it('should log SUCCESS with valid key and valid response', async () => {
    const validResponse = {
      request_id: 'req1',
      organization_id: 'org1',
      camera_id: 'cam1',
      camera_session_id: 'session1',
      track_id: 'track1',
      model_version: 'v1',
      gallery_version: 'g1',
      original: { valid: true, score: 0.8 },
      reconstructed: { valid: true, score: 0.9 },
      selected_branch: 'original',
      candidate_id: 'DID001',
      score: 0.8,
      margin: 0.1,
      frame_decision: 'HIGH_PRIORITY',
      processing_ms: 100,
      requires_operator_verification: true,
    };

    mock.onPost('/v2/infer-face').reply(200, validResponse);

    await mlServiceV2Client.shadowInfer('job1', dummyBuffer, metadata);

    expect(mock.history.post.length).toBe(1);
    expect(mock.history.post[0].headers?.['x-api-key']).toBe('valid_key');
    expect(mlServiceV2Logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SUCCESS',
        jobId: 'job1',
        decision: 'HIGH_PRIORITY',
        score: 0.8,
      })
    );
  });

  it('should log V2_AUTH_ERROR on invalid key (401)', async () => {
    mock.onPost('/v2/infer-face').reply(401, { error: 'Unauthorized' });

    await mlServiceV2Client.shadowInfer('job1', dummyBuffer, metadata);

    expect(mlServiceV2Logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        errorCode: V2ErrorCode.V2_AUTH_ERROR,
      })
    );
  });

  it('should log V2_TIMEOUT on timeout', async () => {
    mock.onPost('/v2/infer-face').timeout();

    await mlServiceV2Client.shadowInfer('job1', dummyBuffer, metadata);

    expect(mlServiceV2Logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        errorCode: V2ErrorCode.V2_TIMEOUT,
      })
    );
  });

  it('should log V2_INTERNAL_ERROR on 500', async () => {
    mock.onPost('/v2/infer-face').reply(500, { error: 'Internal Server Error' });

    await mlServiceV2Client.shadowInfer('job1', dummyBuffer, metadata);

    expect(mlServiceV2Logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        errorCode: V2ErrorCode.V2_INTERNAL_ERROR,
      })
    );
  });

  it('should log V2_UNAVAILABLE when service is unreachable (network error)', async () => {
    mock.onPost('/v2/infer-face').networkError();

    await mlServiceV2Client.shadowInfer('job1', dummyBuffer, metadata);

    expect(mlServiceV2Logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        errorCode: V2ErrorCode.V2_UNAVAILABLE,
      })
    );
  });

  it('should log V2_INVALID_RESPONSE when API returns unexpected schema', async () => {
    mock.onPost('/v2/infer-face').reply(200, { some_random_field: true });

    await mlServiceV2Client.shadowInfer('job1', dummyBuffer, metadata);

    expect(mlServiceV2Logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        errorCode: V2ErrorCode.V2_INVALID_RESPONSE,
      })
    );
  });

  it('should replace NaN/Infinity with null in scores', async () => {
    const validResponse = {
      request_id: 'req1',
      organization_id: 'org1',
      camera_id: 'cam1',
      camera_session_id: 'session1',
      track_id: 'track1',
      model_version: 'v1',
      gallery_version: 'g1',
      original: { valid: true, score: NaN },
      reconstructed: { valid: true, score: Infinity },
      selected_branch: 'original',
      candidate_id: 'DID001',
      score: NaN,
      margin: Infinity,
      frame_decision: 'HIGH_PRIORITY',
      processing_ms: 100,
      requires_operator_verification: true,
    };

    mock.onPost('/v2/infer-face').reply(200, validResponse);

    await mlServiceV2Client.shadowInfer('job1', dummyBuffer, metadata);

    expect(mlServiceV2Logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SUCCESS',
        score: null,
        margin: null,
        original_score: null,
        reconstructed_score: null,
      })
    );
  });

  it('should not log secrets (API Key) in the log entry', async () => {
    mock.onPost('/v2/infer-face').reply(401);
    await mlServiceV2Client.shadowInfer('job1', dummyBuffer, metadata);

    const logCall = (mlServiceV2Logger.log as jest.Mock).mock.calls[0][0];
    const logStr = JSON.stringify(logCall);
    expect(logStr).not.toContain('valid_key');
  });

  it('should not throw (V1 unaffected) on any error unless failJob is true', async () => {
    mock.onPost('/v2/infer-face').reply(500);
    // Should resolve successfully, logging the failure
    await expect(mlServiceV2Client.shadowInfer('job1', dummyBuffer, metadata)).resolves.toBeInstanceOf(MLServiceV2Error);
  });

  it('should throw if failJob is true', async () => {
    mlServiceV2Config.failJob = true;
    mock.onPost('/v2/infer-face').reply(500);
    
    await expect(mlServiceV2Client.shadowInfer('job1', dummyBuffer, metadata)).rejects.toThrow(MLServiceV2Error);
  });
});
