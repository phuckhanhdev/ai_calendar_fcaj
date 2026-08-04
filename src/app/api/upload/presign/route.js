import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import { generateUploadPresignedUrl } from "@/lib/s3-utils";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function getAuthenticatedUserId(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

export async function POST(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileType, folder = "attachments" } = body;

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "Missing fileName or fileType" }, { status: 400 });
    }

    // Lấy phần mở rộng file (e.g. .jpg, .pdf)
    const fileExtension = fileName.substring(fileName.lastIndexOf("."));
    
    // Tạo tên file duy nhất để tránh ghi đè
    const uniqueFileName = `${userId}-${crypto.randomUUID()}${fileExtension}`;
    
    // Tạo Key lưu trên S3 (e.g. avatars/123-uuid.jpg)
    const s3Key = `${folder}/${uniqueFileName}`;

    // Sinh Presigned URL dùng để PUT file lên S3 từ browser
    const uploadUrl = await generateUploadPresignedUrl(s3Key, fileType);

    // Đường dẫn công khai truy cập file sau khi upload thành công
    const bucketName = process.env.AWS_S3_BUCKET_NAME || "aicalendar-attachments-bucket";
    const region = process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-1";
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;

    return NextResponse.json({
      success: true,
      uploadUrl,
      publicUrl,
      key: s3Key,
    });
  } catch (error) {
    console.error("❌ POST /api/upload/presign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const rawUrl = searchParams.get("url");

    if (!key && !rawUrl) {
      return NextResponse.json({ error: "Missing key or url parameter" }, { status: 400 });
    }

    let targetKey = key;
    if (!targetKey && rawUrl) {
      // Extract key from full S3 URL
      const match = rawUrl.match(/amazonaws\.com\/(.+)$/);
      if (match) targetKey = match[1];
    }

    if (!targetKey) {
      return NextResponse.json({ downloadUrl: rawUrl });
    }

    const { generateDownloadPresignedUrl } = await import("@/lib/s3-utils");
    const downloadUrl = await generateDownloadPresignedUrl(targetKey);

    return NextResponse.json({ success: true, downloadUrl });
  } catch (error) {
    console.error("❌ GET /api/upload/presign error:", error);
    return NextResponse.json({ downloadUrl: req.url });
  }
}
