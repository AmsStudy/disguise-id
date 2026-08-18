import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Find an organization
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('No organization found! Cannot create camera.');
    return;
  }

  // Create a known API key
  const plainApiKey = 'cam_auto_' + Math.random().toString(36).substring(2, 15);
  const apiKeyHash = await bcrypt.hash(plainApiKey, 12);

  // Check if camera already exists
  let camera = await prisma.cctvSource.findFirst({
    where: { name: 'Auto Generated Camera' }
  });

  if (camera) {
    // Update existing camera
    camera = await prisma.cctvSource.update({
      where: { id: camera.id },
      data: {
        apiKeyHash,
        streamUrl: 'rtsp://127.0.0.1:8554/cam',
        status: 'online'
      }
    });
    console.log(`Updated existing camera. API Key: ${plainApiKey}`);
  } else {
    // Create new camera
    camera = await prisma.cctvSource.create({
      data: {
        organizationId: org.id,
        name: 'Auto Generated Camera',
        locationName: 'Pintu Masuk Utama',
        streamUrl: 'rtsp://127.0.0.1:8554/cam',
        apiKeyHash,
        status: 'online',
        credentialsConfigured: false,
      }
    });
    console.log(`Created new camera. API Key: ${plainApiKey}`);
  }

  // Output JSON so we can parse it in bash
  console.log(JSON.stringify({ cameraId: camera.id, plainApiKey }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
