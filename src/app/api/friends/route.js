import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import { getFriends, sendRequest } from "@/models/friendModel";

export const dynamic = 'force-dynamic';

function getAuthenticatedUserId(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

/**
 * GET /api/friends
 * Lấy danh sách bạn bè và danh sách lời mời chờ duyệt
 */
export async function GET(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawFriendships = await getFriends(userId);

    const friends = [];
    const incomingRequests = [];
    const outgoingRequests = [];

    for (const f of rawFriendships) {
      const friendObj = {
        id: f.friend_id,
        email: f.email,
        name: `${f.fname || ""} ${f.lname || ""}`.trim() || f.email,
        avatarUrl: f.avatar_url,
        shareLevel: f.share_level
      };

      if (f.status === "accepted") {
        friends.push(friendObj);
      } else if (f.status === "pending") {
        if (f.requester_id === userId) {
          outgoingRequests.push(friendObj);
        } else {
          incomingRequests.push(friendObj);
        }
      }
    }

    return NextResponse.json({
      success: true,
      friends,
      incomingRequests,
      outgoingRequests
    });
  } catch (error) {
    console.error("❌ GET /api/friends error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/friends
 * Gửi yêu cầu kết bạn
 */
export async function POST(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { friendId } = body;

    if (!friendId) {
      return NextResponse.json({ error: "Missing friendId" }, { status: 400 });
    }

    if (userId === friendId) {
      return NextResponse.json({ error: "Cannot add yourself as a friend" }, { status: 400 });
    }

    await sendRequest(userId, friendId);
    return NextResponse.json({ success: true, message: "Friend request sent" });
  } catch (error) {
    console.error("❌ POST /api/friends error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
