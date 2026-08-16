import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const persons = await prisma.watchlistPerson.findMany({ select: { id: true, fullName: true, photoUrl: true } });
  if (persons.length === 0) {
    console.log("No persons found");
    return;
  }
  for (const p of persons) {
    const res = await prisma.$queryRawUnsafe('SELECT id, CASE WHEN embedding IS NULL THEN 0 ELSE 1 END as has_embedding FROM watchlist_persons WHERE id = $1', p.id);
    console.log(p.fullName, res[0]);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
