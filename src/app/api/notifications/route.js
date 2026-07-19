import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import { getUserNotifications, markAsRead, markAllAsRead } from "@/models/notificationModel";

export const dynamic = "force-dynamic";

function getAuthenticatedUserId(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

/**
 * GET /api/notifications
 * Lấy danh sách lịch sử thông báo của người dùng hiện tại
 */
export async function GET(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const notifications = await getUserNotifications(userId, limit);

    return NextResponse.json({
      success: true,
      notifications
    });

  } catch (error) {
    console.error("❌ GET /api/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Đánh dấu đã đọc một hoặc tất cả thông báo
 */
export async function POST(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, notificationId } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 });
    }

    if (action === "read") {
      if (!notificationId) {
        return NextResponse.json({ error: "Missing notificationId for action read" }, { status: 400 });
      }
      const success = await markAsRead(notificationId, userId);
      return NextResponse.json({ success });
    } else if (action === "read_all") {
      const success = await markAllAsRead(userId);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("❌ POST /api/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
