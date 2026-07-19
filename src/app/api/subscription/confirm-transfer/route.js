import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import connectToDatabase from "@/database/connection";
import crypto from "crypto";

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

function getAuthenticatedUserId(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

/**
 * POST /api/subscription/confirm-transfer
 * Xác nhận giao dịch chuyển khoản thành công (Simulate webhook banking)
 * Lưu giao dịch và nâng cấp Premium tài khoản người dùng
 */
export async function POST(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Lấy thông tin giá tiền từ cấu hình
    const settings = await runQuery("SELECT Setting_Value FROM `SYSTEM_SETTING` WHERE Setting_Key = 'SUBSCRIPTION_PRICE'");
    const price = parseFloat(settings[0]?.Setting_Value || "99000");

    // 2. Ghi nhận giao dịch thanh toán
    const transactionId = crypto.randomUUID();
    const transferNote = `SUB PREMIUM_life_ai USER ${userId}`;
    
    await runQuery(`
      INSERT INTO \`PAYMENT_TRANSACTION\` (Transaction_ID, User_ID, Amount, Status, Transfer_Note)
      VALUES (?, ?, ?, 'completed', ?)
    `, [transactionId, userId, price, transferNote]);

    // 3. Nâng cấp tài khoản thành Premium
    await runQuery("UPDATE `USER` SET `Subscription_Status` = 'premium' WHERE `User_ID` = ?", [userId]);

    return NextResponse.json({
      success: true,
      message: "Tài khoản của bạn đã được nâng cấp lên gói Premium thành công!"
    });

  } catch (error) {
    console.error("❌ POST /api/subscription/confirm-transfer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
