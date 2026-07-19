import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getUserEvents, getUserAvailabilityMasks } from "@/services/calendarService";
import { eventsToBitmask, findConsecutiveFreeSlots, blockIndexToTimeStr } from "@/lib/bitmask-utils";
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
 * Lấy lịch bận Bitmask của một User trên một ngày cụ thể
 * Tự động tạo và lưu cache vào USER_DAILY_SCHEDULE nếu chưa có
 */
async function getUserDailyBitmask(userId, dateStr) {
  // 1. Check in cache
  const sqlSelect = "SELECT Busy_Slots FROM `USER_DAILY_SCHEDULE` WHERE User_ID = ? AND Date = ?";
  const rows = await runQuery(sqlSelect, [userId, dateStr]);
  if (rows.length > 0) {
    return BigInt(rows[0].Busy_Slots);
  }

  // 2. Not in cache, compute from EVENT table
  const events = await getUserEvents(userId);
  const bitmask = eventsToBitmask(events, dateStr);

  // 3. Cache it
  const sqlInsert = "INSERT INTO `USER_DAILY_SCHEDULE` (User_ID, Date, Busy_Slots) VALUES (?, ?, ?)";
  await runQuery(sqlInsert, [userId, dateStr, bitmask.toString()]);

  return bitmask;
}

/**
 * POST /api/scheduling/parse
 * Payload: { text: string, users_invited: string[] }
 */
export async function POST(req) {
  try {
    const hostId = getAuthenticatedUserId(req);
    if (!hostId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text, users_invited = [] } = body;

    if (!text) {
      return NextResponse.json({ error: "Missing scheduling text" }, { status: 400 });
    }

    const allParticipants = [hostId, ...users_invited];

    // --- BƯỚC 1: AI PARSING DÙNG GEMINI/BEDROCK ---
    const todayStr = new Date().toISOString().substring(0, 10);
    const systemPrompt = `
Bạn là Trợ lý Lập lịch AI. Nhiệm vụ của bạn là bóc tách yêu cầu lập lịch hẹn nhóm bằng tiếng Việt.
Hôm nay là: ngày ${todayStr} (Chủ Nhật).

Hãy phân tích câu sau: "${text}"
Và trả về CHỈ duy nhất 1 chuỗi JSON định dạng sau (không chứa văn bản giải thích ngoài JSON):
{
  "title": "Nội dung cuộc hẹn ngắn gọn (ví dụ: 'Đi xem phim')",
  "duration_minutes": 180,
  "time_range_start": "YYYY-MM-DD (ngày bắt đầu tìm kiếm lịch trống)",
  "time_range_end": "YYYY-MM-DD (ngày kết thúc tìm kiếm lịch trống)"
}

Lưu ý tính toán ngày dựa trên "hôm nay" là ngày ${todayStr}. Ví dụ "cuối tuần này" là Thứ 7 và Chủ Nhật tuần này.
    `;

    let aiOutput = "";
    const geminiKey = process.env.GEMINI_API_KEY;
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;

    // Bedrock primary
    if (awsAccessKey && awsSecretKey && awsAccessKey !== "test" && awsAccessKey !== "") {
      try {
        const awsRegion = process.env.AWS_REGION || "us-east-1";
        const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";
        const client = new BedrockRuntimeClient({
          region: awsRegion,
          credentials: { accessKeyId: awsAccessKey, secretAccessKey: awsSecretKey }
        });
        const payload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: [{ type: "text", text: "Bóc tách câu trên." }] }]
        };
        const command = new InvokeModelCommand({
          modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(payload)
        });
        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        aiOutput = responseBody.content?.[0]?.text || "";
      } catch (err) {
        console.warn("Bedrock error parsing scheduling request:", err.message);
      }
    }

    // Gemini fallback
    if (!aiOutput && geminiKey && geminiKey !== "" && geminiKey !== "YOUR_GEMINI_API_KEY") {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
          systemInstruction: systemPrompt
        });
        const result = await model.generateContent("Bóc tách câu trên.");
        aiOutput = result.response.text();
      } catch (err) {
        console.error("Gemini error parsing scheduling request:", err);
      }
    }

    // Fallback static parsing if offline
    if (!aiOutput) {
      aiOutput = JSON.stringify({
        title: "Lịch hẹn nhóm",
        duration_minutes: 120,
        time_range_start: todayStr,
        time_range_end: new Date(Date.now() + 86400000 * 7).toISOString().substring(0, 10)
      });
    }

    // Parse JSON
    let parsedParams;
    try {
      const cleanJsonStr = aiOutput.replace(/```json|```/g, "").trim();
      parsedParams = JSON.parse(cleanJsonStr);
    } catch (e) {
      console.error("Failed to parse AI output:", aiOutput);
      parsedParams = {
        title: "Lịch hẹn nhóm",
        duration_minutes: 120,
        time_range_start: todayStr,
        time_range_end: new Date(Date.now() + 86400000 * 3).toISOString().substring(0, 10)
      };
    }

    const { title, duration_minutes, time_range_start, time_range_end } = parsedParams;
    const { timezoneOffset = 0 } = body;

    // --- BƯỚC 2: QUÉT LỊCH VÀ TRẢ VỀ RAW MASKS ---
    const dateList = [];
    let currentDate = new Date(time_range_start);
    const endDate = new Date(time_range_end);
    
    while (currentDate <= endDate) {
      dateList.push(currentDate.toISOString().substring(0, 10));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const availabilityMap = {};
    const promises = allParticipants.map(async (pId) => {
      const masks = await getUserAvailabilityMasks(pId, dateList, timezoneOffset);
      availabilityMap[pId] = masks;
    });

    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      title,
      duration_minutes,
      time_range_start,
      time_range_end,
      dates: dateList,
      availability: availabilityMap
    });

  } catch (error) {
    console.error("❌ POST /api/scheduling/parse error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
