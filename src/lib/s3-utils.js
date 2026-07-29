import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3ClientInstance = null;

export function getS3Client() {
  if (s3ClientInstance) return s3ClientInstance;

  const region = process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-1";
  
  const config = {
    region,
  };

  // If credentials are provided in process.env (either loaded from .env.local or Secrets Manager)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  s3ClientInstance = new S3Client(config);
  return s3ClientInstance;
}

/**
 * Sinh Presigned URL để upload file trực tiếp lên S3 từ browser
 * @param {string} key - Tên file / Đường dẫn lưu trên S3 (vd: avatars/user-123.jpg)
 * @param {string} contentType - Định dạng file (vd: image/jpeg)
 * @returns {Promise<string>} Upload URL
 */
export async function generateUploadPresignedUrl(key, contentType) {
  const client = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME || "aicalendar-attachments-bucket";

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  // Hạn dùng URL là 3600 giây (1 giờ)
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  return uploadUrl;
}
