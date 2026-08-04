import prisma from './src/config/database';
async function run() {
  const cameras = await prisma.cctvSource.findMany();
  console.log(cameras);
}
run();
