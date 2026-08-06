import crypto from 'crypto';
process.env.CAMERA_CREDENTIAL_KEY_BASE64 = crypto.randomBytes(32).toString('base64');
process.env.CAMERA_CREDENTIAL_KEY_VERSION = 'v1';
process.env.CAMERA_CREDENTIAL_ENCRYPTION_ENABLED = 'true';

import { CameraCredentialEncryption } from '../src/utils/cameraCredentialEncryption';

describe('CameraCredentialEncryption', () => {
  const mockOrgId = 'org-123';
  const mockCameraId = 'cam-456';
  const mockPassword = 'secure_password_123';

  it('should correctly encrypt and decrypt a password', () => {
    const encrypted = CameraCredentialEncryption.encrypt(mockPassword, mockOrgId, mockCameraId);
    
    expect(encrypted).toBeDefined();
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(CameraCredentialEncryption.isEncrypted(encrypted)).toBe(true);

    const decrypted = CameraCredentialEncryption.decrypt(encrypted, mockOrgId, mockCameraId);
    expect(decrypted).toBe(mockPassword);
  });

  it('should fail to decrypt if organization ID (AAD) does not match', () => {
    const encrypted = CameraCredentialEncryption.encrypt(mockPassword, mockOrgId, mockCameraId);
    
    expect(() => {
      CameraCredentialEncryption.decrypt(encrypted, 'wrong-org', mockCameraId);
    }).toThrow(/Decryption failed/);
  });

  it('should fail to decrypt if camera ID (AAD) does not match', () => {
    const encrypted = CameraCredentialEncryption.encrypt(mockPassword, mockOrgId, mockCameraId);
    
    expect(() => {
      CameraCredentialEncryption.decrypt(encrypted, mockOrgId, 'wrong-camera');
    }).toThrow(/Decryption failed/);
  });

  it('should return unencrypted value if isEncrypted returns false (legacy fallback handling)', () => {
    expect(CameraCredentialEncryption.isEncrypted('plain_text')).toBe(false);
    expect(CameraCredentialEncryption.decrypt('plain_text', mockOrgId, mockCameraId)).toBe('plain_text');
  });
});
