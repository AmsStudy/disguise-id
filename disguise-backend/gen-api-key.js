const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = new PrismaClient();

function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

async function main() {
  // Get the active camera
  const camera = await prisma.cctvSource.findFirst({
    where: { deletedAt: null, status: 'online' },
    select: { id: true, name: true, organizationId: true }
  });

  if (!camera) {
    console.log('No active camera found');
    const allCams = await prisma.cctvSource.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, status: true }
    });
    console.log('Available cameras:', allCams);
    return;
  }

  console.log(`Generating API key for camera: ${camera.name} (${camera.id})`);
  
  const plainApiKey = generateApiKey();
  const apiKeyHash = await bcrypt.hash(plainApiKey, 12);

  await prisma.cctvSource.update({
    where: { id: camera.id },
    data: { apiKeyHash }
  });

  console.log('\n========================================');
  console.log('CAMERA API KEY (copy this, shown once):');
  console.log(plainApiKey);
  console.log('========================================');
  console.log(`\nCamera ID: ${camera.id}`);
  console.log(`Camera Name: ${camera.name}`);
  console.log('\nPaste this key into camera-agent/.env as: API_KEY=' + plainApiKey);
}

main().catch(console.error).finally(() => prisma.$disconnect());
