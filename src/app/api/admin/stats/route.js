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
 * GET /api/admin/stats
 * Lấy số liệu thống kê tổng quan và lịch sử giao dịch chuyển khoản
 */
export async function GET(req) {
  try {
    const isAuthorized = await checkAdmin(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Tổng số lượng người dùng
    const userCountResult = await runQuery("SELECT COUNT(*) AS total FROM `USER`");
    const totalUsers = userCountResult[0]?.total || 0;

    // 2. Số lượng người dùng Premium
    const premiumCountResult = await runQuery("SELECT COUNT(*) AS total FROM `USER` WHERE Subscription_Status = 'premium'");
    const premiumUsers = premiumCountResult[0]?.total || 0;

    // 3. Tổng doanh thu đã thanh toán
    const revenueResult = await runQuery("SELECT SUM(Amount) AS total FROM `PAYMENT_TRANSACTION` WHERE Status = 'completed'");
    const totalRevenue = parseFloat(revenueResult[0]?.total || 0);

    // 4. Lịch sử doanh thu theo tháng (để vẽ biểu đồ)
    const revenueHistory = await runQuery(`
      SELECT 
        DATE_FORMAT(Created_at, '%Y-%m') AS month,
        SUM(Amount) AS amount
      FROM \`PAYMENT_TRANSACTION\`
      WHERE Status = 'completed'
      GROUP BY month
      ORDER BY month ASC
    `);

    // 5. Danh sách các giao dịch thanh toán kèm ghi chú chuyển khoản
    const transactions = await runQuery(`
      SELECT 
        t.Transaction_ID AS id,
        CONCAT(u.FName, ' ', u.LName) AS userName,
        u.Email AS userEmail,
        t.Amount AS amount,
        t.Status AS status,
        t.Transfer_Note AS transferNote,
        DATE_FORMAT(t.Created_at, '%Y-%m-%dT%H:%i:%s') AS date
      FROM \`PAYMENT_TRANSACTION\` t
      JOIN \`USER\` u ON t.User_ID = u.User_ID
      ORDER BY t.Created_at DESC
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        premiumUsers,
        totalRevenue
      },
      revenueHistory,
      transactions
    });

  } catch (error) {
    console.error("❌ GET /api/admin/stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
