import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import connectToDatabase from "@/database/connection";
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

async function checkAdmin(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return false;
  const decoded = verifyToken(token);
  if (!decoded) return false;
  
  const users = await runQuery("SELECT Role FROM `USER` WHERE User_ID = ?", [decoded.userId]);
  return users.length > 0 && users[0].Role === "admin";
}

/**
 * PUT /api/admin/transactions
 * Admin duyệt (approve) hoặc từ chối (reject) giao dịch chuyển khoản
 */
export async function PUT(req) {
  try {
    const isAuthorized = await checkAdmin(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { transactionId, action } = await req.json();
    if (!transactionId || !action) {
      return NextResponse.json({ error: "Missing transactionId or action" }, { status: 400 });
    }

    const txs = await runQuery("SELECT User_ID, Amount FROM `PAYMENT_TRANSACTION` WHERE Transaction_ID = ?", [transactionId]);
    if (txs.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const targetUserId = txs[0].User_ID;

    if (action === "approve") {
      await runQuery("UPDATE `PAYMENT_TRANSACTION` SET `Status` = 'completed' WHERE `Transaction_ID` = ?", [transactionId]);
      await runQuery("UPDATE `USER` SET `Subscription_Status` = 'premium' WHERE `User_ID` = ?", [targetUserId]);

      try {
        await createNotification(
          targetUserId,
          "SUBSCRIPTION_APPROVED",
          "🎉 Kích hoạt Premium thành công",
          "Chúc mừng! Giao dịch chuyển khoản của bạn đã được Admin phê duyệt. Tài khoản của bạn đã nâng cấp thành công lên gói Premium!",
          "/subscription"
        );
      } catch (notifErr) {
        console.warn("Could not send approval notification:", notifErr.message);
      }

      return NextResponse.json({ success: true, message: "Đã phê duyệt giao dịch và nâng cấp tài khoản Premium!" });
    } else if (action === "reject") {
      await runQuery("UPDATE `PAYMENT_TRANSACTION` SET `Status` = 'failed' WHERE `Transaction_ID` = ?", [transactionId]);
      await runQuery("UPDATE `USER` SET `Subscription_Status` = 'free' WHERE `User_ID` = ?", [targetUserId]);

      try {
        await createNotification(
          targetUserId,
          "SUBSCRIPTION_REJECTED",
          "⚠️ Giao dịch chuyển khoản chưa được duyệt",
          "Yêu cầu chuyển khoản Premium của bạn chưa thể xác nhận. Vui lòng kiểm tra lại ghi chú chuyển khoản hoặc liên hệ Admin.",
          "/subscription"
        );
      } catch (notifErr) {
        console.warn("Could not send rejection notification:", notifErr.message);
      }

      return NextResponse.json({ success: true, message: "Đã từ chối giao dịch thanh toán!" });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("❌ PUT /api/admin/transactions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
