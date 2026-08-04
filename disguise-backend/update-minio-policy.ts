import {
  S3Client,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const endpoint = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`;

const s3Client = new S3Client({
  endpoint,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

async function run() {
  const buckets = ['cctv-frames', 'face-crops', 'watchlist-photos', 'ml-models'];
  for (const bucket of buckets) {
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetBucketLocation', 's3:ListBucket', 's3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`]
          }
        ]
      };
      await s3Client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(policy) }));
      console.log(`Policy updated for ${bucket}`);
    } catch (err: any) {
      console.error(`Failed to update ${bucket}:`, err.message);
    }
  }
}

run();
