import prisma from './src/config/database';
import { camerasService } from './src/modules/cameras/cameras.service';

async function run() {
  console.log("Starting sync...");
  // @ts-ignore
  await camerasService.syncMediaMtxConfigAll();
  console.log("Done.");
}
run();
