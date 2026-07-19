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
 * GET /api/scheduling/invitations
 * Lấy danh sách các cuộc hẹn nhóm đang chờ bỏ phiếu của người dùng hiện tại
 */
export async function GET(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sql = `
      SELECT mr.Meeting_Request_ID AS id, mr.Title AS title, mr.Duration_Minutes AS duration,
             mr.Created_at AS createdAt, CONCAT(u.FName, ' ', u.LName) AS hostName, u.Email AS hostEmail,
             mp.Status AS participantStatus
      FROM \`MEETING_PARTICIPANT\` mp
      JOIN \`MEETING_REQUEST\` mr ON mr.Meeting_Request_ID = mp.Meeting_Request_ID
      JOIN \`USER\` u ON u.User_ID = mr.Host_ID
      WHERE mp.User_ID = ? AND mr.Status = 'PENDING'
      ORDER BY mr.Created_at DESC
    `;
    const invitations = await runQuery(sql, [userId]);

    return NextResponse.json({
      success: true,
      invitations
    });

  } catch (error) {
    console.error("❌ GET /api/scheduling/invitations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
