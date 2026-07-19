import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import connectToDatabase from "@/database/connection";

export const dynamic = "force-dynamic";

const db = connectToDatabase();

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

async function checkAdmin(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return false;
  const decoded = verifyToken(token);
  if (!decoded) return false;
  
  const users = await runQuery("SELECT Role FROM `USER` WHERE User_ID = ?", [decoded.userId]);
  return users.length > 0 && users[0].Role === "admin";
}

/**
 * GET /api/admin/users
 * Lấy danh sách toàn bộ người dùng để quản lý
 */
export async function GET(req) {
  try {
    const isAuthorized = await checkAdmin(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await runQuery(`
      SELECT 
        User_ID AS id,
        FName AS firstName,
        LName AS lastName,
        Email AS email,
        Role AS role,
        Subscription_Status AS subscriptionStatus,
        DATE_FORMAT(Created_at, '%Y-%m-%d') AS joinDate
      FROM \`USER\`
      ORDER BY Created_at DESC
    `);

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("❌ GET /api/admin/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/users
 * Thay đổi vai trò hoặc gói cước người dùng
 */
export async function PUT(req) {
  try {
    const isAuthorized = await checkAdmin(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { targetUserId, role, subscriptionStatus } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
    }

    if (role !== undefined) {
      await runQuery("UPDATE `USER` SET `Role` = ? WHERE `User_ID` = ?", [role, targetUserId]);
    }

    if (subscriptionStatus !== undefined) {
      await runQuery("UPDATE `USER` SET `Subscription_Status` = ? WHERE `User_ID` = ?", [subscriptionStatus, targetUserId]);
    }

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("❌ PUT /api/admin/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
