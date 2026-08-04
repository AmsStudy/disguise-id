import { camerasService } from './src/modules/cameras/cameras.service';

async function run() {
  try {
    console.log("Testing syncMediaMtxConfigAll...");
    // @ts-ignore
    await camerasService.syncMediaMtxConfigAll();
    console.log("Success!");
  } catch (err) {
    console.error("Crash:", err);
  }
}
run();
