const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const plainApiKey = 'cam_auto_xyz123';
  const apiKeyHash = await bcrypt.hash(plainApiKey, 12);

  let camera = await prisma.cctvSource.findFirst({
    where: { deletedAt: null }
  });

  if (camera) {
    camera = await prisma.cctvSource.update({
      where: { id: camera.id },
      data: {
        apiKeyHash,
        status: 'online'
      }
    });
    console.log(`Updated active camera '${camera.name}' with API Key: ${plainApiKey}`);
  } else {
    console.log('No active cameras found!');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
