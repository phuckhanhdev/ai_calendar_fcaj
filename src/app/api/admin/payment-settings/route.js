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
 * GET /api/admin/payment-settings
 * Lấy cấu hình tài khoản ngân hàng nhận tiền
 */
export async function GET(req) {
  try {
    const isAuthorized = await checkAdmin(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await runQuery("SELECT Setting_Key, Setting_Value FROM `SYSTEM_SETTING`");
    const config = {};
    settings.forEach((s) => {
      config[s.Setting_Key] = s.Setting_Value;
    });

    return NextResponse.json({ success: true, settings: config });
  } catch (error) {
    console.error("❌ GET /api/admin/payment-settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/payment-settings
 * Lưu cấu hình tài khoản ngân hàng nhận tiền mới
 */
export async function PUT(req) {
  try {
    const isAuthorized = await checkAdmin(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { bankId, accountNo, accountName, amount } = body;

    const queries = [];
    if (bankId !== undefined) {
      queries.push(runQuery("UPDATE `SYSTEM_SETTING` SET `Setting_Value` = ? WHERE `Setting_Key` = 'ADMIN_BANK_ID'", [bankId]));
    }
    if (accountNo !== undefined) {
      queries.push(runQuery("UPDATE `SYSTEM_SETTING` SET `Setting_Value` = ? WHERE `Setting_Key` = 'ADMIN_BANK_ACCOUNT'", [accountNo]));
    }
    if (accountName !== undefined) {
      queries.push(runQuery("UPDATE `SYSTEM_SETTING` SET `Setting_Value` = ? WHERE `Setting_Key` = 'ADMIN_BANK_NAME'", [accountName.toUpperCase()]));
    }
    if (amount !== undefined) {
      queries.push(runQuery("UPDATE `SYSTEM_SETTING` SET `Setting_Value` = ? WHERE `Setting_Key` = 'SUBSCRIPTION_PRICE'", [amount.toString()]));
    }

    await Promise.all(queries);

    return NextResponse.json({ success: true, message: "Payment settings updated successfully" });
  } catch (error) {
    console.error("❌ PUT /api/admin/payment-settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
