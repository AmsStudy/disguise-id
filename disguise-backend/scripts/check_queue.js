const { Queue } = require('bullmq');

async function checkQueue() {
  const queue = new Queue('inference-queue', {
    connection: { host: '127.0.0.1', port: 6379 }
  });

  const waiting = await queue.getWaitingCount();
  const active = await queue.getActiveCount();
  const delayed = await queue.getDelayedCount();
  const completed = await queue.getCompletedCount();
  const failed = await queue.getFailedCount();

  console.log(`Waiting: ${waiting}`);
  console.log(`Active: ${active}`);
  console.log(`Delayed: ${delayed}`);
  console.log(`Completed: ${completed}`);
  console.log(`Failed: ${failed}`);

  // get the last 2 failed jobs
  const failedJobs = await queue.getFailed(0, 2);
  for (const job of failedJobs) {
    console.log(`Failed Job ${job.id}: ${job.failedReason}`);
  }

  process.exit(0);
}

checkQueue().catch(console.error);
