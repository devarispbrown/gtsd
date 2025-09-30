import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

export const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

/**
 * Generate a presigned URL for uploading a file
 * @param key - The S3 object key (file path)
 * @param expiresIn - URL expiry time in seconds (default: 600 = 10 minutes)
 * @returns Presigned URL for upload
 */
export const getPresignedUploadUrl = async (
  key: string,
  expiresIn: number = 600
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Generate a presigned URL for downloading a file
 * @param key - The S3 object key (file path)
 * @param expiresIn - URL expiry time in seconds (default: 600 = 10 minutes)
 * @returns Presigned URL for download
 */
export const getPresignedDownloadUrl = async (
  key: string,
  expiresIn: number = 600
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};