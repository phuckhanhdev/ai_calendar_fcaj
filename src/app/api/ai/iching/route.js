import { NextResponse } from "next/server";
import { verifyToken } from "@/config/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getAuthenticatedUserId(req) {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

// Load hexagrams.json dataset
function loadHexagramsDataset() {
  try {
    const jsonPath = path.join(process.cwd(), "public", "hexagrams.json");
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      const data = JSON.parse(raw);
      return data.hexagrams || {};
    }
  } catch (err) {
    console.warn("⚠️ Could not load hexagrams.json:", err.message);
  }
  return {};
}

/**
 * Gieo quẻ 6 hào nhị phân (0: Âm, 1: Dương)
 */
function castHexagram() {
  const hexMap = loadHexagramsDataset();
  const keys = Object.keys(hexMap);

  if (keys.length === 0) {
    return {
      key: "111111",
      data: {
        definition: "01. Force (乾 qián); The Creative",
        hexagram: " ䷀ ",
        number: "1",
        description: "Heaven above and Heaven below: Heaven in constant motion."
      }
    };
  }

  // Pick random key from 64 hexagrams
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return {
    key: randomKey,
    data: hexMap[randomKey]
  };
}

export async function POST(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question, dob, birthTime } = await req.json();

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập câu hỏi của bạn để gieo quẻ Kinh Dịch!" }, { status: 400 });
    }

    // 1. Cast Hexagram
    const { key, data: hexData } = castHexagram();

    // 2. Prepare AI System Prompt
    const userContext = `Hồ sơ người dùng: Ngày sinh ${dob || "chưa rõ"}, Giờ sinh ${birthTime || "chưa rõ"}.`;
    const hexSummary = `Quẻ Dịch số ${hexData.number} (${hexData.hexagram}) - ${hexData.definition}. Mã nhị phân: ${key}. Tóm tắt: ${hexData.description}`;

    const systemPrompt = `
Bạn là Trợ lý Luận giải Kinh Dịch & Tối ưu Lập lịch Cá nhân LifeSync AI.
Nhiệm vụ của bạn là giải thích quẻ Dịch cho câu hỏi chiến lược của người dùng một cách sâu sắc, uyên thâm, sáng suốt và thiết thực.

${userContext}

Câu hỏi người dùng: "${question.trim()}"

Quẻ Kinh Dịch gieo được:
${hexSummary}

Hãy trả về bài luận giải bằng Markdown đẹp mắt với cấu trúc:
### ☯️ 1. Tên Quẻ & Ý Nghĩa Triết Lý
(Tên quẻ, biểu tượng quẻ, và thông điệp hành động ứng xử cốt lõi)

### ⚔️ 2. Luận Giải Cho Câu Hỏi
(Phân tích sâu câu hỏi của người dùng dưới góc nhìn Càn/Khôn/Âm/Dương và xu hướng phát triển)

### 🗓️ 3. Định Hướng Lập Lịch & Thời Điểm Hành Động
(Đưa ra 2-3 lời khuyên chọn thời điểm tiến/lùi, thời gian tập trung và hành động thực tế)

Ở CUỐI CÙNG PHẢN HỒI, hãy luôn đính kèm duy nhất 1 khối \`\`\`json_events chứa 2-3 gợi ý lịch trình để đồng bộ vào Calendar:
\`\`\`json_events
[
  { "title": "☯️ Khung giờ Chiến lược (Quẻ Dịch)", "start_time": "09:00", "end_time": "11:30", "category": "study", "description": "Thời điểm đại cát để ra quyết định lớn" },
  { "title": "🍃 Tĩnh tâm & Quan sát thế cục", "start_time": "15:00", "end_time": "15:30", "category": "general", "description": "Quan sát bối cảnh trước khi hành động" }
]
\`\`\`
`;

    let aiReading = "";
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
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: "user", content: [{ type: "text", text: "Hãy luận giải quẻ Kinh Dịch trên." }] }]
        };
        const command = new InvokeModelCommand({
          modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(payload)
        });
        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        aiReading = responseBody.content?.[0]?.text || "";
      } catch (err) {
        console.warn("Bedrock I Ching error:", err.message);
      }
    }

    // Gemini fallback (Multi-Key)
    const geminiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_BACKUP,
      process.env.GEMINI_API_KEY_2
    ].filter(k => k && k !== "" && k !== "YOUR_GEMINI_API_KEY");

    if (!aiReading && geminiKeys.length > 0) {
      for (let i = 0; i < geminiKeys.length; i++) {
        try {
          const genAI = new GoogleGenerativeAI(geminiKeys[i]);
          const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
            systemInstruction: systemPrompt
          });
          const result = await model.generateContent("Hãy luận giải quẻ Kinh Dịch trên.");
          aiReading = result.response.text();
          if (aiReading) break;
        } catch (err) {
          console.warn(`⚠️ Gemini Key ${i + 1} I Ching error:`, err.message);
        }
      }
    }

    if (!aiReading) {
      aiReading = `### ☯️ 1. Tên Quẻ & Ý Nghĩa Triết Lý\n${hexData.definition}\n\n### ⚔️ 2. Luận Giải Cho Câu Hỏi\n${hexData.description}\n\n### 🗓️ 3. Định Hướng Lập Lịch\nHãy kiên trì thực hiện kế hoạch đúng đắn của bạn!`;
    }

    let suggestedEvents = [];
    const eventsMatch = aiReading.match(/```json_events\s*([\s\S]*?)\s*```/);
    if (eventsMatch) {
      try {
        suggestedEvents = JSON.parse(eventsMatch[1].trim());
      } catch (e) {}
      aiReading = aiReading.replace(/```json_events[\s\S]*?```/, "").trim();
    }

    if (suggestedEvents.length === 0) {
      suggestedEvents = [
        { title: "☯️ Khung giờ Chiến lược (Quẻ Dịch)", start_time: "09:00", end_time: "11:30", category: "study", description: "Thời điểm đại cát để ra quyết định lớn" },
        { title: "🍃 Tĩnh tâm & Quan sát thế cục", start_time: "15:00", end_time: "15:30", category: "general", description: "Quan sát bối cảnh trước khi hành động" }
      ];
    }

    return NextResponse.json({
      success: true,
      hexagramKey: key,
      hexagram: hexData,
      reading: aiReading,
      suggestedEvents
    });

  } catch (error) {
    console.error("❌ POST /api/ai/iching error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
