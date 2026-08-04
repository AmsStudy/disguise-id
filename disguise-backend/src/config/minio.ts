import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from './logger';

const endpoint = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`;

export const s3Client = new S3Client({
  endpoint,
  region: 'us-east-1', // Required but ignored by MinIO
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true, // Required for MinIO compatibility
});

export const BUCKETS = {
  FRAMES: process.env.MINIO_BUCKET_FRAMES || 'cctv-frames',
  FACES: process.env.MINIO_BUCKET_FACES || 'face-crops',
  WATCHLIST: process.env.MINIO_BUCKET_WATCHLIST || 'watchlist-photos',
  MODELS: process.env.MINIO_BUCKET_MODELS || 'ml-models',
} as const;

const createBucketIfNotExists = async (bucket: string): Promise<void> => {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    logger.debug(`Bucket exists: ${bucket}`);
  } catch {
    await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
    logger.info(`✅ Created bucket: ${bucket}`);
    
    // Set public read policy for all buckets to allow frontend rendering
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
  }
};

export const ensureBuckets = async (): Promise<void> => {
  try {
    await Promise.all(Object.values(BUCKETS).map(createBucketIfNotExists));
    logger.info('✅ MinIO buckets ready');
  } catch (error) {
    logger.error('Failed to initialize MinIO buckets', { error });
    throw error;
  }
};

export const uploadFile = async (
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> => {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  const publicUrl = process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;
  return `${publicUrl}/${bucket}/${key}`;
};

export const deleteFile = async (bucket: string, key: string): Promise<void> => {
  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
};

export const getPresignedUrl = async (
  bucket: string,
  key: string,
  expiresIn = 3600
): Promise<string> => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
};

export const listFiles = async (bucket: string, prefix?: string) => {
  const response = await s3Client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  }));
  return response.Contents || [];
};
