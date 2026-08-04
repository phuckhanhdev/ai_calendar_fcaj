import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import connectToDatabase from "@/database/connection";
import crypto from "crypto";
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
 * POST /api/scheduling/request
 * Khởi tạo cuộc hẹn nhóm & lưu các đề xuất
 */
export async function POST(req) {
  try {
    const hostId = getAuthenticatedUserId(req);
    if (!hostId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, duration_minutes, users_invited = [], options = [] } = body;

    if (!title || !duration_minutes || options.length === 0) {
      return NextResponse.json({ error: "Missing required parameters (title, duration_minutes, options)" }, { status: 400 });
    }

    const meetingRequestId = crypto.randomUUID();

    // 1. Insert into MEETING_REQUEST
    const sqlRequest = `
      INSERT INTO \`MEETING_REQUEST\` (Meeting_Request_ID, Host_ID, Title, Duration_Minutes, Status)
      VALUES (?, ?, ?, ?, 'PENDING')
    `;
    await runQuery(sqlRequest, [meetingRequestId, hostId, title, duration_minutes]);

    // 2. Insert into MEETING_OPTION
    for (const opt of options) {
      const optionId = crypto.randomUUID();
      const sqlOption = `
        INSERT INTO \`MEETING_OPTION\` (Meeting_Option_ID, Meeting_Request_ID, Start_Time, End_Time, Score)
        VALUES (?, ?, ?, ?, 0)
      `;
      // Format start/end time for MySQL DATETIME
      const formattedStart = opt.startTime.replace("T", " ").substring(0, 19);
      const formattedEnd = opt.endTime.replace("T", " ").substring(0, 19);
      await runQuery(sqlOption, [optionId, meetingRequestId, formattedStart, formattedEnd]);
    }

    // 3. Insert into MEETING_PARTICIPANT for all invited users & send notifications
    const hostProfile = await getUserProfile(hostId);
    const hostName = hostProfile
      ? `${hostProfile.FName || hostProfile.fname || ""} ${hostProfile.LName || hostProfile.lname || ""}`.trim() || hostProfile.Email
      : "Một người bạn";

    for (const pId of users_invited) {
      const sqlParticipant = `
        INSERT INTO \`MEETING_PARTICIPANT\` (Meeting_Request_ID, User_ID, Status)
        VALUES (?, ?, 'INVITED')
      `;
      await runQuery(sqlParticipant, [meetingRequestId, pId]);

      // Notify participant
      try {
        await createNotification(
          pId,
          "MEETING_INVITATION",
          "Mời bình chọn lịch hẹn nhóm",
          `${hostName} đã mời bạn tham gia bình chọn cuộc hẹn "${title}".`,
          `/friends/group-scheduling/vote/${meetingRequestId}`
        );
      } catch (notifErr) {
        console.warn(`Could not send meeting invitation notification to ${pId}:`, notifErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Meeting request created successfully",
      meetingRequestId
    });

  } catch (error) {
    console.error("❌ POST /api/scheduling/request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/scheduling/request?id=...
 * Lấy chi tiết thông tin phòng họp nhóm
 */
export async function GET(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("id");

    if (!requestId) {
      return NextResponse.json({ error: "Missing meeting request id" }, { status: 400 });
    }

    // 1. Get meeting details
    const sqlRequest = `
      SELECT mr.Meeting_Request_ID AS id, mr.Title AS title, mr.Duration_Minutes AS duration, mr.Status AS status,
             mr.Host_ID AS hostId, u.Email AS hostEmail, CONCAT(u.FName, ' ', u.LName) AS hostName
      FROM \`MEETING_REQUEST\` mr
      JOIN \`USER\` u ON u.User_ID = mr.Host_ID
      WHERE mr.Meeting_Request_ID = ?
    `;
    const requestRows = await runQuery(sqlRequest, [requestId]);
    if (requestRows.length === 0) {
      return NextResponse.json({ error: "Meeting request not found" }, { status: 404 });
    }
    const meeting = requestRows[0];

    // 2. Get options
    const sqlOptions = `
      SELECT Meeting_Option_ID AS id, Start_Time AS startTime, End_Time AS endTime, Score AS score
      FROM \`MEETING_OPTION\`
      WHERE Meeting_Request_ID = ?
    `;
    const options = await runQuery(sqlOptions, [requestId]);

    // 3. Get participants
    const sqlParticipants = `
      SELECT mp.User_ID AS userId, mp.Status AS status,
             u.Email AS email, CONCAT(u.FName, ' ', u.LName) AS name
      FROM \`MEETING_PARTICIPANT\` mp
      JOIN \`USER\` u ON u.User_ID = mp.User_ID
      WHERE mp.Meeting_Request_ID = ?
    `;
    const participants = await runQuery(sqlParticipants, [requestId]);

    // 4. Get all votes for this meeting request
    const sqlVotes = `
      SELECT User_ID AS userId, Meeting_Option_ID AS optionId
      FROM \`MEETING_VOTE\`
      WHERE Meeting_Request_ID = ?
    `;
    const votes = await runQuery(sqlVotes, [requestId]);

    return NextResponse.json({
      success: true,
      meeting,
      options,
      participants,
      votes
    });

  } catch (error) {
    console.error("❌ GET /api/scheduling/request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
