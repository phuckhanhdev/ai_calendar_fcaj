import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import connectToDatabase from "@/database/connection";
import crypto from "crypto";
import { createNotification } from "@/models/notificationModel";

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

    // 2. Ghi nhận giao dịch thanh toán ở trạng thái chờ Admin duyệt (pending)
    const transactionId = crypto.randomUUID();
    const transferNote = `SUB PREMIUM_life_ai USER ${userId}`;
    
    await runQuery(`
      INSERT INTO \`PAYMENT_TRANSACTION\` (Transaction_ID, User_ID, Amount, Status, Transfer_Note)
      VALUES (?, ?, ?, 'pending', ?)
    `, [transactionId, userId, price, transferNote]);

    // 3. Cập nhật trạng thái chờ duyệt của User
    await runQuery("UPDATE `USER` SET `Subscription_Status` = 'pending_approval' WHERE `User_ID` = ?", [userId]);

    // 4. Tạo thông báo gửi cho người dùng
    try {
      await createNotification(
        userId,
        "SUBSCRIPTION_PENDING",
        "Yêu cầu nâng cấp Premium",
        "Yêu cầu nâng cấp Premium của bạn đã được tiếp nhận. Admin sẽ kiểm tra đối soát chuyển khoản và phê duyệt kích hoạt cho bạn.",
        "/subscription"
      );
    } catch (notifErr) {
      console.warn("Could not create subscription pending notification:", notifErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Yêu cầu chuyển khoản đã được ghi nhận! Hệ thống đang chờ Admin kiểm tra và duyệt kích hoạt tài khoản Premium cho bạn."
    });

  } catch (error) {
    console.error("❌ POST /api/subscription/confirm-transfer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
