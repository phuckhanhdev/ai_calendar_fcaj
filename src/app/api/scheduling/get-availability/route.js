import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import { getUserAvailabilityMasks } from "@/services/calendarService";

export const dynamic = "force-dynamic";

function getAuthenticatedUserId(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

/**
 * GET /api/scheduling/get-availability
 * Trả về chuỗi Bitmask bận/rảnh chuẩn UTC-0 cho danh sách user, đảm bảo ẩn danh hoàn toàn (Stealth Mode)
 */
export async function GET(req) {
  try {
    const requesterId = getAuthenticatedUserId(req);
    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userIdsStr = searchParams.get("userIds");
    const datesStr = searchParams.get("dates");
    const timezoneOffset = parseInt(searchParams.get("timezoneOffset") || "0");

    if (!userIdsStr || !datesStr) {
      return NextResponse.json({ error: "Missing userIds or dates" }, { status: 400 });
    }

    const userIds = userIdsStr.split(",").map(id => id.trim()).filter(Boolean);
    const dates = datesStr.split(",").map(d => d.trim()).filter(Boolean);

    // Fetch availability for all requested users in parallel
    const availabilityMap = {};
    const promises = userIds.map(async (uid) => {
      const masks = await getUserAvailabilityMasks(uid, dates, timezoneOffset);
      availabilityMap[uid] = masks;
    });

    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      availability: availabilityMap
    });

  } catch (error) {
    console.error("❌ GET /api/scheduling/get-availability error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
