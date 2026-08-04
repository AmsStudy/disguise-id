import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env before importing other modules
dotenv.config();

import { mlServiceV2Client } from '../src/utils/mlServiceV2Client';
import { mlServiceV2Config } from '../src/config/ml-service-v2.config';

async function main() {
  if (!mlServiceV2Config.enabled) {
    console.error('ERROR: ML_SERVICE_V2_ENABLED is false. Set it to true in .env');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const imageIndex = args.indexOf('--image');
  if (imageIndex === -1 || !args[imageIndex + 1]) {
    console.error('Usage: npm run test:ml-v2-shadow -- --image <path_to_image>');
    process.exit(1);
  }

  const imagePath = args[imageIndex + 1];
  const absImagePath = path.resolve(process.cwd(), imagePath);

  if (!fs.existsSync(absImagePath)) {
    console.error(`ERROR: Image file not found at ${absImagePath}`);
    process.exit(1);
  }

  console.log(`Testing ML V2 Shadow client with image: ${absImagePath}`);
  console.log(`URL: ${mlServiceV2Config.url}`);
  console.log(`API Key set: ${!!mlServiceV2Config.apiKey}`);

  const frameBuffer = await fs.promises.readFile(absImagePath);

  // Set failJob to true temporarily for testing so we can catch and display errors
  // (We use a dirty hack since config is frozen by default, but it's just a simple object)
  Object.assign(mlServiceV2Config, { failJob: true });

  const start = Date.now();
  const testJobId = `test-shadow-${Date.now()}`;
  try {
    await mlServiceV2Client.shadowInfer(
      testJobId,
      frameBuffer,
      {
        organization_id: 'test-org-123',
        camera_id: 'test-cam-456',
        camera_session_id: 'legacy-session-test-cam-456',
        track_id: `legacy-job-${testJobId}`,
        captured_at: new Date().toISOString(),
        frame_number: 1,
        bounding_box_json: JSON.stringify([0, 0, 100, 100]),
      }
    );

    const elapsed = Date.now() - start;
    console.log(`\nSUCCESS: Shadow request completed in ${elapsed}ms`);
    console.log(`Check ${mlServiceV2Config.shadowLogPath} for the JSONL output.`);
  } catch (error) {
    console.error('\nFAILED to run shadow inference:');
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
