import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { findTop3ClosestCGVCinemas } from "@/lib/cgv-movie-service";

export const dynamic = "force-dynamic";

function getAuthenticatedUserId(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

/**
 * POST /api/scheduling/movie-cgv
 * Request Body: {
 *   text: "Cuối tuần này rủ Nam đi xem phim CGV ở TPHCM",
 *   users_invited: [2, 3],
 *   locations: [ { lat: 10.77, lng: 106.69 }, { lat: 10.79, lng: 106.71 } ]
 * }
 */
export async function POST(req) {
  try {
    const hostId = getAuthenticatedUserId(req);
    if (!hostId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text, users_invited = [], locations = [] } = body;

    if (!text) {
      return NextResponse.json({ error: "Missing prompt text" }, { status: 400 });
    }

    // 1. AI Parsing Intent & Preferred Movie Date
    const todayStr = new Date().toISOString().substring(0, 10);
    const systemPrompt = `
Bạn là Trợ lý Lập lịch xem phim CGV TP.HCM.
Nhiệm vụ: Phân tích câu lệnh "${text}" của người dùng.
Hôm nay là: ngày ${todayStr}.

Hãy trả về CHỈ duy nhất 1 chuỗi JSON theo định dạng:
{
  "intent": "MOVIE_SCHEDULING",
  "brand": "CGV",
  "target_date": "YYYY-MM-DD (ngày muốn đi xem phim)",
  "preferred_movie": "Tên phim người dùng nhắc tới (nếu có, hoặc 'Tùy chọn')",
  "city": "TP.HCM"
}
`;

    let aiParsed = null;
    const geminiKey = process.env.GEMINI_API_KEY;
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;

    // Primary AWS Bedrock
    if (awsAccessKey && awsSecretKey && awsAccessKey !== "test" && awsAccessKey !== "") {
      try {
        const client = new BedrockRuntimeClient({
          region: process.env.AWS_REGION || "us-east-1",
          credentials: { accessKeyId: awsAccessKey, secretAccessKey: awsSecretKey }
        });
        const command = new InvokeModelCommand({
          modelId: process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0",
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 300,
            system: systemPrompt,
            messages: [{ role: "user", content: [{ type: "text", text: "Bóc tách câu trên." }] }]
          })
        });
        const response = await client.send(command);
        const resBody = JSON.parse(new TextDecoder().decode(response.body));
        const textOut = resBody.content?.[0]?.text || "";
        const jsonMatch = textOut.match(/\{[\s\S]*\}/);
        if (jsonMatch) aiParsed = JSON.parse(jsonMatch[0]);
      } catch (err) {
        console.warn("Bedrock error parsing movie request:", err.message);
      }
    }

    // Fallback Gemini (Multi-Key)
    const geminiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_BACKUP,
      process.env.GEMINI_API_KEY_2
    ].filter(k => k && k !== "" && k !== "YOUR_GEMINI_API_KEY");

    if (!aiParsed && geminiKeys.length > 0) {
      for (let i = 0; i < geminiKeys.length; i++) {
        try {
          console.log(`🔄 [Movie CGV] Calling Gemini Key ${i + 1}...`);
          const genAI = new GoogleGenerativeAI(geminiKeys[i]);
          const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
            systemInstruction: systemPrompt
          });
          const result = await model.generateContent("Bóc tách câu trên.");
          const textOut = result.response.text();
          const jsonMatch = textOut.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiParsed = JSON.parse(jsonMatch[0]);
            break;
          }
        } catch (err) {
          console.warn(`⚠️ Gemini Key ${i + 1} movie error:`, err.message);
        }
      }
    }

    // Default target date if parsing failed
    const targetDate = aiParsed?.target_date || todayStr;

    // 2. Tải vị trí GPS & Giới tính của Host + Bạn bè từ Database nếu client không truyền đủ
    let participantLocations = [...locations];

    if (participantLocations.length === 0) {
      try {
        const connectToDatabase = (await import("@/database/connection")).default;
        const db = connectToDatabase();

        const allUserIds = [hostId, ...users_invited];
        const placeholders = allUserIds.map(() => "?").join(",");
        const sql = `SELECT User_ID, Gender, Latitude, Longitude FROM \`USER\` WHERE User_ID IN (${placeholders})`;

        const rows = await new Promise((resolve, reject) => {
          db.query(sql, allUserIds, (err, res) => {
            if (err) return reject(err);
            resolve(res);
          });
        });

        if (rows && rows.length > 0) {
          participantLocations = rows.map((r) => ({
            userId: r.User_ID,
            gender: r.Gender || "Male",
            lat: parseFloat(r.Latitude) || 10.7769,
            lng: parseFloat(r.Longitude) || 106.7009,
          }));
        }
      } catch (err) {
        console.warn("Could not fetch user locations from DB:", err.message);
      }
    }

    // 3. Tìm 3 rạp CGV TP.HCM có tổng vị trí ngắn nhất (Có áp dụng trọng số Nam rước Nữ)
    const top3Cinemas = findTop3ClosestCGVCinemas(participantLocations);

    return NextResponse.json({
      success: true,
      data: {
        intent: "CGV_CINEMA_LOCATION_SCHEDULING",
        city: "TP.HCM",
        target_date: targetDate,
        total_participants: users_invited.length + 1,
        top_closest_cinemas: top3Cinemas
      }
    });
  } catch (error) {
    console.error("Movie CGV Scheduling Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
