const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check cameras - do they have API keys set?
  const cameras = await prisma.cctvSource.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      streamUrl: true,
      apiKeyHash: true,
      deletedAt: true,
      lastSeenAt: true,
    }
  });
  
  console.log(`=== Found ${cameras.length} cameras ===`);
  for (const c of cameras) {
    console.log({
      id: c.id,
      name: c.name,
      status: c.status,
      hasStreamUrl: !!c.streamUrl,
      hasApiKey: !!c.apiKeyHash,
      isDeleted: !!c.deletedAt,
      lastSeenAt: c.lastSeenAt,
    });
  }

  // Check detection events count
  const eventCount = await prisma.detectionEvent.count();
  console.log(`\n=== Total detection events: ${eventCount} ===`);

  // Check ML service reachability
  const axios = require('axios');
  try {
    const res = await axios.get('http://127.0.0.1:8000/', { timeout: 3000 });
    console.log('\n=== ML Service V1 (port 8000) === ONLINE:', JSON.stringify(res.data));
  } catch (e) {
    console.log('\n=== ML Service V1 (port 8000) === OFFLINE:', e.message);
  }
  
  try {
    const res2 = await axios.get('http://127.0.0.1:8001/health', { timeout: 3000 });
    console.log('=== ML Service V2 (port 8001) === ONLINE:', res2.status);
  } catch (e) {
    console.log('=== ML Service V2 (port 8001) === OFFLINE:', e.message);
  }
  
  // Check MediaMTX
  try {
    const res3 = await axios.get('http://127.0.0.1:9997/v3/paths/list', { timeout: 3000 });
    const paths = res3.data.items || [];
    console.log(`\n=== MediaMTX Active Paths: ${paths.length} ===`);
    for (const p of paths) {
      console.log({ name: p.name, source: p.source?.type, ready: p.ready });
    }
  } catch (e) {
    console.log('\n=== MediaMTX API === OFFLINE:', e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
