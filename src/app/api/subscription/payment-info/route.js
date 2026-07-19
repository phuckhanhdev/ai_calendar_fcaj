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

function getAuthenticatedUserId(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

/**
 * GET /api/subscription/payment-info
 * Lấy cấu hình tài khoản ngân hàng nhận tiền công khai cho người dùng chuyển khoản
 */
export async function GET(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await runQuery("SELECT Setting_Key, Setting_Value FROM `SYSTEM_SETTING`");
    const config = {};
    settings.forEach((s) => {
      config[s.Setting_Key] = s.Setting_Value;
    });

    return NextResponse.json({
      success: true,
      bankId: config.ADMIN_BANK_ID || "OCB",
      accountNo: config.ADMIN_BANK_ACCOUNT || "0949191399",
      accountName: config.ADMIN_BANK_NAME || "NGUYEN PHUC KHANH",
      price: parseFloat(config.SUBSCRIPTION_PRICE || "99000")
    });

  } catch (error) {
    console.error("❌ GET /api/subscription/payment-info error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
