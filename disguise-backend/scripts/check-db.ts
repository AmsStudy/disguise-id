import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allResults = await prisma.mlV2InferenceResult.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });
  console.log('--- LATEST 10 INFERENCE RESULTS ---');
  console.log(allResults.map(r => ({
    id: r.id,
    status: r.status,
    requiresOperatorVerification: r.requiresOperatorVerification,
    frameDecision: r.frameDecision,
    score: r.score
  })));

  const countEligible = await prisma.mlV2InferenceResult.count({
    where: {
      status: 'SUCCESS',
      requiresOperatorVerification: true,
      frameDecision: { in: ['HIGH_PRIORITY_CANDIDATE', 'POSSIBLE_MATCH'] },
    }
  });
  console.log('--- COUNT ELIGIBLE FOR REVIEW ---');
  console.log(countEligible);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
