import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3ClientInstance = null;

export function getS3Client() {
  if (s3ClientInstance) return s3ClientInstance;

  const region = process.env.APP_AWS_REGION || process.env.APP_AWS_S3_REGION || process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-1";
  
  const config = {
    region,
  };

  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    config.credentials = {
      accessKeyId,
      secretAccessKey,
    };
  }

  s3ClientInstance = new S3Client(config);
  return s3ClientInstance;
}

/**
 * Sinh Presigned URL để upload file trực tiếp lên S3 từ browser
 */
export async function generateUploadPresignedUrl(key, contentType) {
  const client = getS3Client();
  const bucketName = process.env.APP_AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || "aicalendar-attachments-bucket";

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  return uploadUrl;
}

/**
 * Sinh Presigned URL để xem/tải file từ S3 (vượt rào cản Block Public Access)
 */
export async function generateDownloadPresignedUrl(key) {
  const client = getS3Client();
  const bucketName = process.env.APP_AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || "aicalendar-attachments-bucket";

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const downloadUrl = await getSignedUrl(client, command, { expiresIn: 86400 });
  return downloadUrl;
}
