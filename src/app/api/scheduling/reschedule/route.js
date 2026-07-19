import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import connectToDatabase from "@/database/connection";
import { getUserAvailabilityMasks } from "@/services/calendarService";
import { blockIndexToTimeStr } from "@/lib/bitmask-utils";

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
 * GET /api/scheduling/reschedule?requestId=...&optionId=...
 * Phân tích các xung đột lịch và đề xuất tự động dời lịch thông minh (AI Magic Rescheduler)
 */
export async function GET(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    const optionId = searchParams.get("optionId");

    if (!requestId || !optionId) {
      return NextResponse.json({ error: "Missing requestId or optionId" }, { status: 400 });
    }

    // 1. Fetch the option details
    const sqlOption = `
      SELECT Start_Time AS start, End_Time AS end
      FROM \`MEETING_OPTION\`
      WHERE Meeting_Option_ID = ? AND Meeting_Request_ID = ?
    `;
    const optRows = await runQuery(sqlOption, [optionId, requestId]);
    if (optRows.length === 0) {
      return NextResponse.json({ error: "Selected option not found" }, { status: 404 });
    }
    const option = optRows[0];

    // 2. Fetch all conflicting events in that period for participants
    const sqlConflicts = `
      SELECT e.Event_ID AS id, e.User_ID AS userId, e.Title AS title, e.Priority AS priority,
             DATE_FORMAT(e.Start_Time, '%Y-%m-%dT%H:%i:%s') AS start,
             DATE_FORMAT(e.End_Time, '%Y-%m-%dT%H:%i:%s') AS end,
             CONCAT(u.FName, ' ', u.LName) AS userName
      FROM \`EVENT\` e
      JOIN \`USER\` u ON u.User_ID = e.User_ID
      WHERE e.User_ID IN (
        SELECT User_ID FROM \`MEETING_PARTICIPANT\`
        WHERE Meeting_Request_ID = ? AND Status = 'ACCEPTED'
      )
      AND e.Start_Time < ? AND e.End_Time > ?
    `;
    const conflicts = await runQuery(sqlConflicts, [requestId, option.end, option.start]);

    const movable = [];
    const unmovable = [];

    // 3. Classify conflicts and find alternative slots for low/medium priority events
    for (const conf of conflicts) {
      const isMovable = conf.priority === "low" || conf.priority === "medium";
      
      if (isMovable) {
        // Find alternative slots on the same day for this user
        const dateStr = conf.start.substring(0, 10);
        // Let's use the local timezone offset
        const dateRange = [dateStr];
        const masks = await getUserAvailabilityMasks(conf.userId, dateRange, 0);
        const dayMaskVal = masks[dateStr] ? BigInt(masks[dateStr]) : 0n;
        const freeMask = (~dayMaskVal) & ((1n << 48n) - 1n);

        // Find a 1-hour (2 blocks) consecutive slot between 09:00 and 18:00
        let altStart = null;
        for (let i = 18; i < 36; i++) {
          if ((freeMask & (1n << BigInt(i))) !== 0n && (freeMask & (1n << BigInt(i + 1))) !== 0n) {
            altStart = blockIndexToTimeStr(i);
            break;
          }
        }

        movable.push({
          ...conf,
          alternativeSlot: altStart ? `${dateStr} ${altStart}` : "Không tìm thấy giờ rảnh khác cùng ngày"
        });
      } else {
        unmovable.push(conf);
      }
    }

    return NextResponse.json({
      success: true,
      conflictCount: conflicts.length,
      movable,
      unmovable
    });

  } catch (error) {
    console.error("❌ GET /api/scheduling/reschedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
