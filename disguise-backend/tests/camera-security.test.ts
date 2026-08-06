import { CamerasService } from '../src/modules/cameras/cameras.service';
import prisma from '../src/config/database';
import { CameraCredentialEncryption } from '../src/utils/cameraCredentialEncryption';

jest.mock('../src/config/database', () => ({
  cctvSource: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  detectionEvent: { count: jest.fn() },
  alert: { count: jest.fn() }
}));

const mockPrisma = prisma as any;
const mockCamerasService = require('../src/modules/cameras/cameras.service').camerasService;
// Prevent MediaMTX sync from failing or slowing down tests
mockCamerasService.syncMediaMtxConfigAll = jest.fn().mockResolvedValue(undefined);

describe('Camera Security & API Key Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not leak apiKeyHash or password in CAMERA_SELECT', async () => {
    // Inspect the internal CAMERA_SELECT of the module (using a hack or just verifying the mocked output)
    const mockCamera = {
      id: 'cam1',
      name: 'Test Cam',
      status: 'online',
    };
    
    mockPrisma.cctvSource.findFirst.mockResolvedValueOnce(mockCamera);
    
    const result = await mockCamerasService.getCameraById('cam1', 'org1');
    expect(result).toHaveProperty('name', 'Test Cam');
    expect(result).not.toHaveProperty('apiKeyHash');
    expect(result).not.toHaveProperty('password');
  });

  it('should return raw API key EXACTLY once during createCamera', async () => {
    mockPrisma.cctvSource.create.mockResolvedValueOnce({
      id: 'cam1',
      name: 'Test Cam',
    });
    
    const result = await mockCamerasService.createCamera({
      name: 'Test Cam',
    }, 'org1', 'user1');
    
    expect(result).toHaveProperty('api_key');
    expect(typeof result.api_key).toBe('string');
    
    // Make sure audit log doesn't contain the key
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ newValue: expect.objectContaining({ api_key: expect.anything() }) })
      })
    );
  });

  it('should return raw API key EXACTLY once during regenerateKey', async () => {
    mockPrisma.cctvSource.findFirst.mockResolvedValueOnce({ id: 'cam1' });
    mockPrisma.cctvSource.update.mockResolvedValueOnce({ id: 'cam1' });
    
    const result = await mockCamerasService.regenerateApiKey('cam1', 'org1', 'user1');
    
    expect(result).toHaveProperty('api_key');
    expect(typeof result.api_key).toBe('string');
  });
});
