const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('No organization found! Cannot create camera.');
    return;
  }

  const plainApiKey = 'cam_auto_xyz123';
  const apiKeyHash = await bcrypt.hash(plainApiKey, 12);

  let camera = await prisma.cctvSource.findFirst({
    where: { name: 'Auto Generated Camera' }
  });

  if (camera) {
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
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
