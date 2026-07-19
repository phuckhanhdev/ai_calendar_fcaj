import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import { acceptFriend, deleteFriendship, updateShareLevel } from "@/models/friendModel";
import { createNotification } from "@/models/notificationModel";
import { getUserProfile } from "@/services/userService";

export const dynamic = 'force-dynamic';

function getAuthenticatedUserId(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

/**
 * POST /api/friends/action
 * Thực hiện các hành động: accept, reject, remove, update_permission
 */
export async function POST(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, friendId, shareLevel } = body;

    if (!action || !friendId) {
      return NextResponse.json({ error: "Missing required fields (action, friendId)" }, { status: 400 });
    }

    switch (action) {
      case "accept":
        await acceptFriend(userId, friendId, shareLevel || "free_busy");
        
        // Notify the user who sent the friend request
        try {
          const profile = await getUserProfile(userId);
          const name = profile ? `${profile.fname} ${profile.lname}` : "Bạn bè";
          await createNotification(
            friendId,
            "FRIEND_ACCEPTED",
            "Đã chấp nhận lời mời kết bạn",
            `${name} đã chấp nhận lời mời kết bạn của bạn.`,
            "/friends"
          );
        } catch (notifErr) {
          console.warn("Could not send friend acceptance notification:", notifErr.message);
        }

        return NextResponse.json({ success: true, message: "Friend request accepted" });
      case "reject":
      case "remove":
        await deleteFriendship(userId, friendId);
        return NextResponse.json({ success: true, message: "Friendship removed/rejected" });
      case "update_permission":
        if (!shareLevel) {
          return NextResponse.json({ error: "Missing shareLevel for permission update" }, { status: 400 });
        }
        await updateShareLevel(userId, friendId, shareLevel);
        return NextResponse.json({ success: true, message: "Share permission updated" });
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("❌ POST /api/friends/action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
