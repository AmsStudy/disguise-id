import dotenv from 'dotenv';
dotenv.config();

export const cameraEncryptionConfig = {
  keyVersion: process.env.CAMERA_CREDENTIAL_KEY_VERSION || 'v1',
  keyBase64: process.env.CAMERA_CREDENTIAL_KEY_BASE64 || '',
  enabled: process.env.CAMERA_CREDENTIAL_ENCRYPTION_ENABLED !== 'false',
};

// Validate key on startup (Fail Fast)
if (!cameraEncryptionConfig.keyBase64) {
  throw new Error('FATAL: CAMERA_CREDENTIAL_KEY_BASE64 is not set in the environment.');
}

const keyBuffer = Buffer.from(cameraEncryptionConfig.keyBase64, 'base64');
if (keyBuffer.length !== 32) {
  throw new Error(`FATAL: CAMERA_CREDENTIAL_KEY_BASE64 must decode to exactly 32 bytes (got ${keyBuffer.length} bytes).`);
}
