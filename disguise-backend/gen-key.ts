import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from './src/config/database';

async function run() {
  try {
    const cameraId = "b3e02619-0023-4086-a95e-35ebe15caff7"; // CCTV Pintu Masuk Utama
    
    // Generate new key
    const prefix = 'disguise_cam_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const plainApiKey = `${prefix}${randomBytes}`;
    
    // Hash key
    const apiKeyHash = await bcrypt.hash(plainApiKey, 12);
    
    // Update database directly bypassing auditLog
    await prisma.cctvSource.update({
      where: { id: cameraId },
      data: { apiKeyHash }
    });
    
    console.log("=== NEW API KEY ===");
    console.log(plainApiKey);
    console.log("===================");
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
