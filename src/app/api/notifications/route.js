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
    } else if (action === "send_event_invite") {
      const { friendIds = [], eventData } = body;
      if (friendIds.length === 0 || !eventData) {
        return NextResponse.json({ error: "Missing friendIds or eventData" }, { status: 400 });
      }

      const { getUserProfile } = await import("@/services/userService");
      const { formatUserName } = await import("@/lib/name-utils");
      const { createNotification } = await import("@/models/notificationModel");

      const hostProfile = await getUserProfile(userId);
      const hostName = formatUserName(hostProfile, "Một người bạn");

      const startDateStr = new Date(eventData.start).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

      for (const friendId of friendIds) {
        const payload = JSON.stringify({
          action: "accept_event_invite",
          hostId: userId,
          eventData: {
            title: eventData.title,
            start: eventData.start,
            end: eventData.end || eventData.start,
            location: eventData.location || "",
            description: eventData.description ? eventData.description.slice(0, 150) : "",
            color: eventData.color || "#6366f1"
          }
        });

        await createNotification(
          friendId,
          "EVENT_INVITATION",
          `👥 Rủ đi chung: ${eventData.title}`,
          `${hostName} đã gửi lời mời bạn cùng tham gia sự kiện "${eventData.title}" vào lúc ${startDateStr}.`,
          payload
        );
      }

      return NextResponse.json({ success: true, count: friendIds.length });
    } else if (action === "accept_event_invite") {
      const { eventData, hostId, notificationId } = body;
      if (!eventData) {
        return NextResponse.json({ error: "Missing eventData" }, { status: 400 });
      }

      const { createEvent } = await import("@/models/eventModel");
      const { getUserProfile } = await import("@/services/userService");
      const { formatUserName } = await import("@/lib/name-utils");
      const { createNotification, markAsRead } = await import("@/models/notificationModel");

      // 1. Tự động thêm sự kiện vào Lịch cá nhân của người bạn được mời
      const newEvent = await createEvent(userId, {
        title: `[Lịch hẹn] ${eventData.title}`,
        description: eventData.description || `Sự kiện đi chung được rủ bởi bạn bè trên LifeSync AI`,
        location: eventData.location || "",
        start: eventData.start,
        end: eventData.end || eventData.start,
        color: eventData.color || "#6366f1",
        category: "general",
        priority: "medium",
        reminder: 30
      });

      // 2. Đánh dấu thông báo là đã đọc
      if (notificationId) {
        await markAsRead(notificationId, userId);
      }

      // 3. Gửi thông báo xác nhận ngược lại cho người mời (Host)
      if (hostId && hostId !== userId) {
        const guestProfile = await getUserProfile(userId);
        const guestName = formatUserName(guestProfile, "Bạn bè");
        await createNotification(
          hostId,
          "EVENT_ACCEPTED",
          `✅ Chấp nhận lời mời đi chung`,
          `${guestName} đã đồng ý tham gia sự kiện "${eventData.title}" và sự kiện đã được thêm vào Lịch của họ!`,
          `/calendar`
        );
      }

      return NextResponse.json({ success: true, event: newEvent });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("❌ POST /api/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
