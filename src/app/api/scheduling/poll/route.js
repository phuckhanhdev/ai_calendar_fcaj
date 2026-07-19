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
 * GET /api/scheduling/poll?id=...&since=...
 * API quét phòng bỏ phiếu định kỳ (Polling) tối ưu bằng Timestamp.
 */
export async function GET(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("id");
    const since = searchParams.get("since"); // Millisecond timestamp

    if (!requestId) {
      return NextResponse.json({ error: "Missing meeting request id" }, { status: 400 });
    }

    // 1. Get the latest update timestamp from MEETING_PARTICIPANT
    const sqlLastUpdate = `
      SELECT MAX(Updated_at) AS lastUpdate FROM \`MEETING_PARTICIPANT\`
      WHERE Meeting_Request_ID = ?
    `;
    const lastUpdateRows = await runQuery(sqlLastUpdate, [requestId]);
    const lastUpdate = lastUpdateRows[0]?.lastUpdate;
    const lastUpdateMs = lastUpdate ? new Date(lastUpdate).getTime() : 0;

    // 2. If 'since' is provided and no updates happened since then, return immediately
    if (since) {
      const sinceMs = parseInt(since, 10);
      if (!isNaN(sinceMs) && lastUpdateMs <= sinceMs) {
        return NextResponse.json({ success: true, changed: false });
      }
    }

    // 3. Otherwise, fetch full data and return changed: true
    const sqlRequest = `
      SELECT mr.Status AS status FROM \`MEETING_REQUEST\` mr
      WHERE mr.Meeting_Request_ID = ?
    `;
    const requestRows = await runQuery(sqlRequest, [requestId]);
    if (requestRows.length === 0) {
      return NextResponse.json({ error: "Meeting request not found" }, { status: 404 });
    }

    // Fetch participants status
    const sqlParticipants = `
      SELECT mp.User_ID AS userId, mp.Status AS status,
             u.Email AS email, CONCAT(u.FName, ' ', u.LName) AS name
      FROM \`MEETING_PARTICIPANT\` mp
      JOIN \`USER\` u ON u.User_ID = mp.User_ID
      WHERE mp.Meeting_Request_ID = ?
    `;
    const participants = await runQuery(sqlParticipants, [requestId]);

    // Fetch votes
    const sqlVotes = `
      SELECT User_ID AS userId, Meeting_Option_ID AS optionId
      FROM \`MEETING_VOTE\`
      WHERE Meeting_Request_ID = ?
    `;
    const votes = await runQuery(sqlVotes, [requestId]);

    return NextResponse.json({
      success: true,
      changed: true,
      lastUpdate: lastUpdateMs,
      meetingStatus: requestRows[0].status,
      participants,
      votes
    });

  } catch (error) {
    console.error("❌ GET /api/scheduling/poll error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
