import * as userService from "@/services/userService";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/information
 * Cập nhật thông tin profile của User (Hỗ trợ ON DUPLICATE KEY INSERT nếu cần)
 */
export async function POST(req) {
  try {
    const data = await req.json();
    const { User_ID, Phone_Number, FName, LName, Date_of_birth } = data;

    if (!User_ID) {
      return NextResponse.json({ error: "Missing User_ID" }, { status: 400 });
    }

    // Cập nhật thông tin qua Service
    await userService.updateUserProfile(User_ID, {
      FName,
      LName,
      Phone_Number,
      Date_of_birth
    });

    return NextResponse.json({ message: "success" });
  } catch (error) {
    console.error("❌ POST /api/user/information error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

/**
 * GET /api/user/information
 * Lấy thông tin cá nhân của User
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const user = await userService.getUserProfile(user_id);

    return NextResponse.json({
      user: user || null,
    });
  } catch (error) {
    console.error("❌ GET /api/user/information error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

/**
 * PUT /api/user/information
 * Cập nhật hồ sơ thông tin cá nhân của User
 */
export async function PUT(req) {
  try {
    const data = await req.json();
    const { User_ID, Phone_Number, FName, LName, Date_of_birth } = data;

    if (!User_ID) {
      return NextResponse.json({ error: "Missing User_ID" }, { status: 400 });
    }

    await userService.updateUserProfile(User_ID, {
      FName,
      LName,
      Phone_Number,
      Date_of_birth
    });

    return NextResponse.json({ message: "success" });
  } catch (error) {
    console.error("❌ PUT /api/user/information error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
