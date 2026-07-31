import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import { getUserProfile } from "@/services/userService";
import { getUserEvents } from "@/services/calendarService";
import { saveMessage, getHistory, pruneOldMessages, clearAllMessages } from "@/models/chatModel";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { calculateDestinyMatrix } from "@/utils/matrixDestiny";
import { applyGuardList } from "@/config/ai-guardlist";
import { detectUserIntent } from "@/lib/intent-classifier";

function normalizeVietnamese(str) {
  if (!str) return "";
  let clean = str.toLowerCase().trim();
  clean = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  clean = clean.replace(/đ/g, "d");
  clean = clean.replace(/\bh\b|\bg\b/g, " gio ");
  clean = clean.replace(/\bp\b/g, " phut ");
  return clean.replace(/\s+/g, " ").trim();
}

function tryLocalNLPRouter(message) {
  const norm = normalizeVietnamese(message);
  const tomorrowPattern = /(?:them lich|len lich|dat lich)?\s*(.*?)\s*luc\s*(\d+)\s*(?:gio|phut)?\s*(sang|chieu|toi)?\s*(?:ngay\s*)?mai/i;
  const matchTomorrow = norm.match(tomorrowPattern);
  
  if (matchTomorrow) {
    let title = matchTomorrow[1].replace(/them lich|len lich|dat lich/gi, "").trim();
    if (!title) title = "Sự kiện mới";
    
    let hour = parseInt(matchTomorrow[2]);
    const period = matchTomorrow[3] || "";
    
    if (period.includes("chieu") || period.includes("toi")) {
      if (hour < 12) hour += 12;
    }
    
    const pad = (n) => n.toString().padStart(2, '0');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const y = tomorrow.getFullYear();
    const m = pad(tomorrow.getMonth() + 1);
    const d = pad(tomorrow.getDate());
    
    const startStr = `${y}${m}${d}T${pad(hour)}0000`;
    const endStr = `${y}${m}${d}T${pad(hour + 1)}0000`;
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${title}
DTSTART:${startStr}
DTEND:${endStr}
DESCRIPTION:Lịch trình được tự động tạo nhanh bằng NLP Router cục bộ.
END:VEVENT
END:VCALENDAR`;

    return {
      success: true,
      provider: "Local NLP Router",
      message: `Chào bạn! Tôi đã tự động bóc tách yêu cầu và lên lịch trình **"${title}"** vào lúc **${pad(hour)}:00 ngày mai** (${d}/${m}/${y}) thành công. Bạn hãy nhấn nút chèn lịch bên dưới nhé!

\`\`\`ics
${icsContent}
\`\`\``
    };
  }
  
  return null;
}

export const dynamic = "force-dynamic";

function getAuthenticatedUserId(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

/**
 * GET /api/ai/chat
 */
export async function GET(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-prune messages older than 3 days
    try {
      await pruneOldMessages(userId, 3);
    } catch (pruneErr) {
      console.warn("⚠️ Prune old messages warning:", pruneErr.message);
    }

    const history = await getHistory(userId);
    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error("❌ GET /api/ai/chat history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/ai/chat (Clear chat history)
 */
export async function DELETE(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await clearAllMessages(userId);
    return NextResponse.json({ success: true, message: "Chat history cleared successfully" });
  } catch (error) {
    console.error("❌ DELETE /api/ai/chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/ai/chat
 */
export async function POST(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await req.json();
    
    // 1. Apply AI Guardlist validation
    const guardResult = applyGuardList(message);
    if (guardResult.blocked) {
      // Save blocked exchange to history for visual feedback in UI chat history
      await saveMessage(userId, "user", message || "[Tin nhắn trống]");
      await saveMessage(userId, "ai", guardResult.message);

      return NextResponse.json({
        success: true,
        provider: "System Guardlist",
        message: guardResult.message
      });
    }

    const sanitizedMessage = guardResult.sanitized;

    // 2. Save sanitized message to database
    await saveMessage(userId, "user", sanitizedMessage);

    // Try Local NLP Router matching to bypass LLM
    const localResult = tryLocalNLPRouter(sanitizedMessage);
    if (localResult) {
      await saveMessage(userId, "ai", localResult.message);
      return NextResponse.json({
        success: true,
        provider: localResult.provider,
        message: localResult.message
      });
    }

    // 3. Detect intent for optimized routing
    const intent = detectUserIntent(sanitizedMessage);
    
    // Check if the user is asking about past events
    const queryPast = /(lịch cũ|lịch sử|quá khứ|đã qua|hôm qua|tuần trước|tháng trước|đã làm|trước đây)/i.test(sanitizedMessage);
    // Default fromDate to today's start if not asking about the past
    const fromDate = queryPast ? null : new Date().toISOString().substring(0, 10) + " 00:00:00";
    
    let systemPrompt = "";
    let userPrompt = sanitizedMessage;
    
    // 4. Handle routing and parallelize database calls based on intent
    if (intent === "GREETING") {
      console.log("🎯 [AI Chat] Intent: GREETING - bypassing DB calls.");
      systemPrompt = `
Bạn là Trợ lý Lập lịch AI tên là LifeSync AI. Hãy chào hỏi người dùng thân thiện bằng tiếng Việt.
Hãy tự giới thiệu bạn có thể giúp họ:
1. Sắp xếp lịch trình tối ưu, tự động điền vào lịch.
2. Tư vấn năng lượng bản mệnh học, cung hoàng đạo và phong thủy dựa trên ngày sinh.
Hãy giữ câu trả lời ngắn gọn, cô đọng (2-3 câu). Không đề xuất lịch trình và không xuất mã code .ics.
      `;
    } 
    else if (intent === "DESTINY_INFO") {
      console.log("🎯 [AI Chat] Intent: DESTINY_INFO - fetching profile only.");
      const profile = await getUserProfile(userId);
      const dobStr = profile?.Date_of_birth ? new Date(profile.Date_of_birth).toISOString().substring(0, 10) : "";
      const destiny = calculateDestinyMatrix(dobStr);
      
      systemPrompt = `
Bạn là Trợ lý Lập lịch AI tên là LifeSync AI. Hãy tư vấn chi tiết về tử vi, số học bản mệnh, cung hoàng đạo và điểm năng lượng tâm của người dùng.
Thông tin người dùng:
- Họ tên: ${profile?.FName || ""} ${profile?.LName || ""}
- Ngày sinh: ${dobStr}
- Cung hoàng đạo: ${destiny.zodiac}
- Điểm năng lượng tâm: ${destiny.points.epoint}
Hãy trả lời bằng tiếng Việt thân thiện, súc tích, mang tính động viên và định hướng tích cực. Không đề xuất lịch và không xuất mã code .ics.
      `;
    } 
    else if (intent === "QUERY_CALENDAR") {
      console.log(`🎯 [AI Chat] Intent: QUERY_CALENDAR - fetching events only (fromDate: ${fromDate}).`);
      const events = await getUserEvents(userId, fromDate);
      const formattedEvents = events.map(e => ({
        Title: e.title,
        Start: e.start,
        End: e.end,
        Description: e.description
      }));
      
      systemPrompt = `
Bạn là Trợ lý Lập lịch AI tên là LifeSync AI. Hãy tóm tắt danh sách lịch bận hiện có của người dùng, cho họ biết hôm nay/sắp tới họ bận những việc gì.
Lịch bận hiện tại của người dùng:
${JSON.stringify(formattedEvents, null, 2)}
Hãy trả lời bằng tiếng Việt thân thiện, ngắn gọn và rõ ràng. Không đề xuất thêm lịch mới và không xuất mã code .ics.
      `;
    } 
    else {
      // intent === "SCHEDULE_CREATION" - Full flow
      console.log(`🎯 [AI Chat] Intent: SCHEDULE_CREATION - running full flow in parallel (fromDate: ${fromDate}).`);
      const [profile, events] = await Promise.all([
        getUserProfile(userId),
        getUserEvents(userId, fromDate)
      ]);
      
      const dobStr = profile?.Date_of_birth ? new Date(profile.Date_of_birth).toISOString().substring(0, 10) : "";
      const destiny = calculateDestinyMatrix(dobStr);
      const formattedEvents = events.map(e => ({
        Title: e.title,
        Start: e.start,
        End: e.end,
        Description: e.description
      }));

      const now = new Date();
      const currentYear = now.getFullYear();
      const todayFormatted = now.toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });

      systemPrompt = `
Bạn là Trợ lý Lập lịch AI tên là LifeSync AI. Nhiệm vụ của bạn là tư vấn và lập lịch trình tối ưu dựa trên thời gian biểu trống của người dùng.

Hôm nay là: ${todayFormatted} (Năm hiện tại của hệ thống là ${currentYear}). Khi lên lịch trình mới cho người dùng, bạn BẮT BUỘC phải dùng năm hiện tại là ${currentYear} (Trừ khi người dùng chỉ định rõ một năm khác).

Thông tin người dùng:
- Họ tên: ${profile?.FName || ""} ${profile?.LName || ""}
- Ngày sinh: ${dobStr}
- Cung hoàng đạo: ${destiny.zodiac}
- Điểm năng lượng tâm: ${destiny.points.epoint}

Lịch bận hiện tại của người dùng:
${JSON.stringify(formattedEvents, null, 2)}

YÊU CẦU BẮT BUỘC VỀ ĐẦU RA:
1. Đưa ra lời tư vấn giải thích thân thiện bằng tiếng Việt tại sao bạn chọn những khung giờ này dựa trên tử vi/lịch bận.
2. Bắt buộc phải đính kèm phần lịch trình đề xuất dưới dạng mã nguồn tệp iCalendar (.ics) chuẩn, được bao bọc trong khối mã markdown dạng:
\`\`\`ics
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Tên sự kiện
DTSTART:YYYYMMDDTHHmmss (Ví dụ: 20260713T090000)
DTEND:YYYYMMDDTHHmmss (Ví dụ: 20260713T110000)
DESCRIPTION:Mô tả lý do hoặc nội dung công việc
END:VEVENT
END:VCALENDAR
\`\`\`
      `;
      
      userPrompt = `
Yêu cầu lập lịch mới từ người dùng:
"${sanitizedMessage}"

Hãy chọn các khung giờ trống phù hợp trong lịch bận ở trên, sắp xếp thời gian hợp lý và trả về lời khuyên kèm mã .ics đúng quy định.
      `;
    }

    let aiOutput = null;
    let provider = null;

    const geminiKey = process.env.GEMINI_API_KEY;
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;

    // Call AWS Bedrock (Primary)
    if (awsAccessKey && awsSecretKey && awsAccessKey !== "test" && awsAccessKey !== "") {
      try {
        console.log("⚡ [AI Chat] Calling AWS Bedrock (Claude)...");
        const awsRegion = process.env.AWS_REGION || "us-east-1";
        const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

        const client = new BedrockRuntimeClient({
          region: awsRegion,
          credentials: {
            accessKeyId: awsAccessKey,
            secretAccessKey: awsSecretKey
          }
        });

        const payload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 1200,
          system: systemPrompt,
          messages: [{ role: "user", content: [{ type: "text", text: userPrompt }] }]
        };

        const command = new InvokeModelCommand({
          modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(payload)
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        aiOutput = responseBody.content?.[0]?.text;
        provider = "AWS Bedrock";
      } catch (err) {
        console.warn("⚠️ AWS Bedrock error:", err.message);
      }
    }

    // Call Gemini (Fallback)
    if (!aiOutput && geminiKey && geminiKey !== "" && geminiKey !== "YOUR_GEMINI_API_KEY") {
      try {
        console.log("🔄 [AI Chat] Calling Google Gemini...");
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
          systemInstruction: systemPrompt
        });

        const result = await model.generateContent(userPrompt);
        aiOutput = result.response.text();
        provider = "Google Gemini";
      } catch (err) {
        console.error("❌ Gemini error in chat:", err);
      }
    }

    // Static fallback when offline
    if (!aiOutput) {
      if (intent === "SCHEDULE_CREATION") {
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().substring(0, 10).replace(/-/g, "");
        aiOutput = `
Tôi đã chuẩn bị lịch đề xuất học TOEIC và đan len vào ngày mai cho bạn dựa trên lịch trống cục bộ.

\`\`\`ics
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Lên kế hoạch TOEIC & Đan len
DTSTART:${tomorrowStr}T090000
DTEND:${tomorrowStr}T110000
DESCRIPTION:Khung giờ trống ngày mai được sắp xếp tự động
END:VEVENT
END:VCALENDAR
\`\`\`
        `;
      } else if (intent === "QUERY_CALENDAR") {
        aiOutput = "Hiện tại tôi không thể kết nối với dịch vụ AI để tóm tắt lịch trình của bạn. Tuy nhiên bạn vẫn có thể tự kiểm tra lịch cá nhân của mình trên trang Lịch biểu.";
      } else if (intent === "DESTINY_INFO") {
        aiOutput = "Hiện tại dịch vụ AI đang bận. Bản mệnh của bạn mang những nguồn năng lượng độc đáo, hãy truy cập trang Bản mệnh học để xem chi tiết nhé!";
      } else {
        aiOutput = "Xin chào! Trợ lý Lập lịch LifeSync AI sẵn sàng hỗ trợ bạn. Bạn có muốn lên lịch trình gì hôm nay không?";
      }
      provider = "Mock Static Fallback";
    }

    // 5. Save AI reply to database
    await saveMessage(userId, "ai", aiOutput);

    return NextResponse.json({
      success: true,
      provider,
      message: aiOutput
    });

  } catch (error) {
    console.error("❌ POST /api/ai/chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
