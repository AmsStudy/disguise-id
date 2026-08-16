const { PrismaClient } = require('@prisma/client');

async function checkMatch() {
  const prisma = new PrismaClient();
  const persons = await prisma.watchlistPerson.findMany({
    select: { id: true, fullName: true, dangerLevel: true }
  });
  console.log('Watchlist Persons:', persons);

  const events = await prisma.detectionEvent.findMany({
    orderBy: { detectedAt: 'desc' },
    take: 5,
    select: { id: true, isMatch: true, bestMatchSim: true, metadata: true }
  });
  console.log('Recent Detection Events:', JSON.stringify(events, null, 2));

  const alerts = await prisma.alert.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, status: true, priority: true }
  });
  console.log('Recent Alerts:', alerts);

  process.exit(0);
}

checkMatch().catch(console.error);
