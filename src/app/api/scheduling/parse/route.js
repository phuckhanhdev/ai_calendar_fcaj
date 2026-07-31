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

    // --- BƯỚC 1: AI MULTI-TASK PARSING DÙNG GEMINI/BEDROCK (OPENAI TOOL CALLING FORMAT) ---
    const todayStr = new Date().toISOString().substring(0, 10);
    const systemPrompt = `
Bạn là Trợ lý Lập lịch Khoa học Thông minh.
Nhiệm vụ của bạn là bóc tách câu lệnh đa mục tiêu của người dùng thành các tác vụ khoa học.
Hôm nay là: ngày ${todayStr}.

Hãy phân tích câu sau: "${text}"
Và trả về CHỈ duy nhất 1 chuỗi JSON theo định dạng sau (không chứa văn bản giải thích ngoài JSON):
{
  "tasks": [
    {
      "task_id": "task_1",
      "title": "Tên chi tiết hoạt động (ví dụ: 'Tập Gym')",
      "category": "study | fitness | date | general",
      "duration_minutes": 60,
      "is_hard_constraint": false,
      "fixed_start_time": "HH:MM (nếu có, hoặc null)",
      "fixed_end_time": "HH:MM (nếu có, hoặc null)",
      "location": "Tên địa điểm (nếu có, hoặc null)"
    }
  ]
}
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
          max_tokens: 600,
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

    // Gemini fallback (Multi-Key)
    const geminiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_BACKUP,
      process.env.GEMINI_API_KEY_2
    ].filter(k => k && k !== "" && k !== "YOUR_GEMINI_API_KEY");

    if (!aiOutput && geminiKeys.length > 0) {
      for (let i = 0; i < geminiKeys.length; i++) {
        try {
          console.log(`🔄 [Parsing] Calling Gemini Key ${i + 1}...`);
          const genAI = new GoogleGenerativeAI(geminiKeys[i]);
          const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
            systemInstruction: systemPrompt
          });
          const result = await model.generateContent("Bóc tách câu trên.");
          aiOutput = result.response.text();
          if (aiOutput) break;
        } catch (err) {
          console.warn(`⚠️ Gemini Key ${i + 1} error parsing scheduling request:`, err.message);
        }
      }
    }

    // Parse JSON
    let parsedTasks = [];
    try {
      const cleanJsonStr = aiOutput.replace(/```json|```/g, "").trim();
      const parsedData = JSON.parse(cleanJsonStr);
      parsedTasks = parsedData.tasks || [];
    } catch (e) {
      console.error("Failed to parse AI output:", aiOutput);
      parsedTasks = [
        {
          task_id: "t_default",
          title: text,
          category: "general",
          duration_minutes: 60,
          is_hard_constraint: false
        }
      ];
    }

    // --- BƯỚC 2: GIẢI BÀI TOÁN XẾP LỊCH KHOA HỌC QUA MASTER SCHEDULER ENGINE ---
    const { MasterScientificScheduler } = await import("@/lib/scientific-scheduler");
    const masterScheduler = new MasterScientificScheduler();
    const scientificSchedule = masterScheduler.schedule(parsedTasks);

    return NextResponse.json({
      success: true,
      target_date: todayStr,
      total_tasks_parsed: parsedTasks.length,
      scientific_schedule: scientificSchedule,
      raw_parsed_tasks: parsedTasks
    });

  } catch (error) {
    console.error("❌ POST /api/scheduling/parse error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
