import crypto from 'crypto';
import { cameraEncryptionConfig } from '../config/camera-encryption.config';

/**
 * Camera Credential Encryption using AES-256-GCM
 * Format: v1:<keyVersion>:<nonce>:<authTag>:<ciphertext>
 */

const ALGORITHM = 'aes-256-gcm';

export class CameraCredentialEncryption {
  /**
   * Encrypts plaintext using AES-256-GCM and returns the envelope string.
   * @param plaintext The password to encrypt
   * @param organizationId Used as AAD
   * @param cameraId Used as AAD
   * @returns Envelope string `v1:<keyVersion>:<nonce>:<authTag>:<ciphertext>`
   */
  static encrypt(plaintext: string, organizationId: string, cameraId: string): string {
    if (!cameraEncryptionConfig.enabled) {
      return plaintext; // Fallback if encryption is completely disabled
    }

    const key = Buffer.from(cameraEncryptionConfig.keyBase64, 'base64');
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, nonce);

    // Bind encryption strictly to organizationId and cameraId via AAD
    const aad = Buffer.from(`${organizationId}:${cameraId}`, 'utf8');
    cipher.setAAD(aad);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `v1:${cameraEncryptionConfig.keyVersion}:${nonce.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * Decrypts an envelope string back to plaintext.
   * @param envelope The formatted envelope string
   * @param organizationId Used as AAD (must match what was encrypted)
   * @param cameraId Used as AAD (must match what was encrypted)
   */
  static decrypt(envelope: string, organizationId: string, cameraId: string): string {
    if (!envelope || typeof envelope !== 'string') return envelope;
    if (!envelope.startsWith('v1:')) return envelope; // Not an envelope, might be legacy plaintext

    const parts = envelope.split(':');
    if (parts.length !== 5) {
      throw new Error('Invalid encryption envelope format.');
    }

    const [, keyVersion, nonceB64, authTagB64, ciphertextB64] = parts;

    // Currently we only have one key, but keyVersion allows rotation in the future
    if (keyVersion !== cameraEncryptionConfig.keyVersion) {
      throw new Error(`Unsupported key version: ${keyVersion}`);
    }

    const key = Buffer.from(cameraEncryptionConfig.keyBase64, 'base64');
    const nonce = Buffer.from(nonceB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, nonce);
    
    // Validate AAD
    const aad = Buffer.from(`${organizationId}:${cameraId}`, 'utf8');
    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);

    try {
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (err) {
      throw new Error('Decryption failed. Data might be tampered with or AAD mismatch (wrong org/camera).');
    }
  }

  /**
   * Checks if a string is encrypted in the expected envelope format.
   */
  static isEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;
    return value.startsWith('v1:');
  }
}
