const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dpos = await prisma.$queryRawUnsafe('SELECT id, full_name, (embedding IS NULL) as is_null FROM watchlist_persons WHERE is_active = true');
  console.log(dpos);
}

main().finally(() => prisma.$disconnect());
