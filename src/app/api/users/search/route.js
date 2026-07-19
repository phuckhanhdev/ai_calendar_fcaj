import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import { getUserByEmail } from "@/models/userModel";

export const dynamic = 'force-dynamic';

function getAuthenticatedUserId(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

/**
 * GET /api/users/search?email=...
 * Tìm kiếm người dùng bằng email chính xác
 */
export async function GET(req) {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Missing email parameter" }, { status: 400 });
    }

    const user = await getUserByEmail(email.trim());
    if (!user) {
      return NextResponse.json({ success: true, user: null });
    }

    // Do not return user password and do not allow adding oneself
    if (user.User_ID === currentUserId) {
      return NextResponse.json({ error: "Cannot search/add yourself" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.User_ID,
        email: user.Email,
        name: `${user.FName || ""} ${user.LName || ""}`.trim() || user.Email,
        avatarUrl: user.Avatar_Url
      }
    });
  } catch (error) {
    console.error("❌ GET /api/users/search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
