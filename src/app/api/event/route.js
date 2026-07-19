import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import * as calendarService from "@/services/calendarService";

export const dynamic = 'force-dynamic';

// Lấy thông tin user ID từ session cookie
function getAuthenticatedUserId(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

/**
 * GET /api/event
 * Lấy toàn bộ sự kiện của người dùng hiện tại thông qua Service
 */
export async function GET(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const events = await calendarService.getUserEvents(userId);
    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error("❌ GET /api/event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/event
 * Tạo sự kiện mới cho người dùng thông qua Service
 */
export async function POST(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, start, end } = body;

    if (!title || !start || !end) {
      return NextResponse.json({ error: "Missing required fields (title, start, end)" }, { status: 400 });
    }

    const isDuplicate = await calendarService.checkDuplicateEvent(userId, title, start, end);
    if (isDuplicate) {
      return NextResponse.json({ success: true, event: { title, start, end }, message: "Duplicate skipped" });
    }

    const newEvent = await calendarService.createEvent(userId, body);
    return NextResponse.json({ success: true, event: newEvent });
  } catch (error) {
    console.error("❌ POST /api/event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/event
 * Cập nhật sự kiện hiện có của người dùng thông qua Service
 */
export async function PUT(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, start, end } = body;

    if (!id || !title || !start || !end) {
      return NextResponse.json({ error: "Missing required fields (id, title, start, end)" }, { status: 400 });
    }

    const success = await calendarService.updateEvent(id, userId, body);
    
    if (!success) {
      return NextResponse.json({ error: "Event not found or not owned by user" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ PUT /api/event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/event
 * Xóa sự kiện của người dùng thông qua Service
 */
export async function DELETE(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing event id" }, { status: 400 });
    }

    const success = await calendarService.deleteEvent(id, userId);

    if (!success) {
      return NextResponse.json({ error: "Event not found or not owned by user" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ DELETE /api/event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
