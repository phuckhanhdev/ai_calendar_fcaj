import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import connectToDatabase from "@/database/connection";
import { createEvent } from "@/models/eventModel";
import { createNotification } from "@/models/notificationModel";
import { getUserProfile } from "@/services/userService";

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
 * POST /api/scheduling/action
 * Guest bỏ phiếu (Vote) cho các Option
 */
export async function POST(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, optionIds = [], status = "ACCEPTED" } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    // 1. Update participant status
    const sqlStatus = `
      UPDATE \`MEETING_PARTICIPANT\`
      SET Status = ?
      WHERE Meeting_Request_ID = ? AND User_ID = ?
    `;
    await runQuery(sqlStatus, [status, requestId, userId]);

    // 2. Clear existing votes for this user & request
    const sqlClearVotes = `
      DELETE FROM \`MEETING_VOTE\`
      WHERE Meeting_Request_ID = ? AND User_ID = ?
    `;
    await runQuery(sqlClearVotes, [requestId, userId]);

    // 3. Insert new votes if status is ACCEPTED
    if (status === "ACCEPTED" && optionIds.length > 0) {
      for (const optId of optionIds) {
        const sqlInsertVote = `
          INSERT INTO \`MEETING_VOTE\` (Meeting_Request_ID, User_ID, Meeting_Option_ID)
          VALUES (?, ?, ?)
        `;
        await runQuery(sqlInsertVote, [requestId, userId, optId]);
      }
    }

    // 4. Re-calculate option scores based on MEETING_VOTE
    const sqlUpdateScores = `
      UPDATE \`MEETING_OPTION\` mo
      SET mo.Score = (
        SELECT COUNT(*)
        FROM \`MEETING_VOTE\` mv
        WHERE mv.Meeting_Option_ID = mo.Meeting_Option_ID
      )
      WHERE mo.Meeting_Request_ID = ?
    `;
    await runQuery(sqlUpdateScores, [requestId]);

    // Notify the host about the new vote
    try {
      const sqlHostInfo = `
        SELECT mr.Host_ID AS hostId, mr.Title AS title,
               COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.FName, ''), ' ', COALESCE(u.LName, ''))), ''), u.Email) AS guestName
        FROM \`MEETING_REQUEST\` mr
        JOIN \`USER\` u ON u.User_ID = ?
        WHERE mr.Meeting_Request_ID = ?
      `;
      const hostInfoRows = await runQuery(sqlHostInfo, [userId, requestId]);
      if (hostInfoRows.length > 0) {
        const { hostId, title, guestName } = hostInfoRows[0];
        if (hostId !== userId) {
          await createNotification(
            hostId,
            "MEETING_VOTED",
            "Có lượt biểu quyết mới",
            `${guestName} đã biểu quyết cho cuộc hẹn "${title}".`,
            `/friends/group-scheduling/vote/${requestId}`
          );
        }
      }
    } catch (notifErr) {
      console.warn("Could not send vote notification to host:", notifErr.message);
    }

    return NextResponse.json({ success: true, message: "Vote cast successfully" });

  } catch (error) {
    console.error("❌ POST /api/scheduling/action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/scheduling/action
 * Host chốt cuộc họp -> Tạo sự kiện chính thức trên Calendar cho cả nhóm
 */
export async function PUT(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, optionId, title, description, location } = body;

    if (!requestId || !optionId) {
      return NextResponse.json({ error: "Missing requestId or optionId" }, { status: 400 });
    }

    // 1. Verify user is Host
    const sqlRequest = `
      SELECT mr.Host_ID AS hostId, mr.Title AS title, mr.Duration_Minutes AS duration
      FROM \`MEETING_REQUEST\` mr
      WHERE mr.Meeting_Request_ID = ?
    `;
    const mrRows = await runQuery(sqlRequest, [requestId]);
    if (mrRows.length === 0) {
      return NextResponse.json({ error: "Meeting request not found" }, { status: 404 });
    }
    const meeting = mrRows[0];

    if (meeting.hostId !== userId) {
      return NextResponse.json({ error: "Only the Host can finalize the meeting" }, { status: 403 });
    }

    // 2. Fetch the selected option times
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

    // Start Transaction to ensure all calendar events are created atomically
    await runQuery("START TRANSACTION");
    try {
      // 3. Update MEETING_REQUEST to CONFIRMED
      const sqlConfirm = `
        UPDATE \`MEETING_REQUEST\`
        SET Status = 'CONFIRMED'
        WHERE Meeting_Request_ID = ?
      `;
      await runQuery(sqlConfirm, [requestId]);

      // 4. Fetch all participants (including host)
      const sqlParticipants = `
        SELECT User_ID AS userId FROM \`MEETING_PARTICIPANT\`
        WHERE Meeting_Request_ID = ? AND Status = 'ACCEPTED'
        UNION
        SELECT ? AS userId
      `;
      const participants = await runQuery(sqlParticipants, [requestId, meeting.hostId]);

      // 5. Create event in EVENT table for Host & all accepted Guests
      const eventPromises = participants.map((p) => {
        return createEvent(p.userId, {
          title: title || `[Lịch hẹn] ${meeting.title}`,
          description: description || `Lịch hẹn nhóm được lên lịch tự động bởi LifeSync AI. Chủ trì: ${meeting.hostId}`,
          location: location || "Phòng họp nhóm LifeSync",
          start: option.start,
          end: option.end,
          color: "#10b981", // Emerald green for group events
          category: "general",
          priority: "high",
          reminder: 30
        });
      });

      await Promise.all(eventPromises);
      await runQuery("COMMIT");

      // Notify all guests that the meeting has been finalized
      try {
        const sqlGuests = `
          SELECT User_ID AS userId FROM \`MEETING_PARTICIPANT\`
          WHERE Meeting_Request_ID = ? AND Status = 'ACCEPTED' AND User_ID != ?
        `;
        const guests = await runQuery(sqlGuests, [requestId, meeting.hostId]);
        for (const guest of guests) {
          await createNotification(
            guest.userId,
            "MEETING_FINALIZED",
            "Cuộc hẹn nhóm đã được chốt",
            `Cuộc hẹn "${meeting.title}" đã được chốt lịch thành công.`,
            "/calendar"
          );
        }
      } catch (notifErr) {
        console.warn("Could not send meeting finalized notifications:", notifErr.message);
      }
    } catch (txErr) {
      await runQuery("ROLLBACK");
      throw txErr;
    }

    return NextResponse.json({
      success: true,
      message: "Meeting finalized and synchronized to all calendars"
    });

  } catch (error) {
    console.error("❌ PUT /api/scheduling/action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
