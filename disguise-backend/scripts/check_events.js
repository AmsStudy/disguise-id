const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const events = await prisma.detectionEvent.findMany({
    orderBy: { detectedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      isMatch: true,
      bestMatchId: true,
      bestMatchSim: true,
      metadata: true,
      detectedAt: true
    }
  });
  console.log(JSON.stringify(events, null, 2));
}

main().finally(() => prisma.$disconnect());
