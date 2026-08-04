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

// Load rich Tarot dataset from public/tarot_data/tarot-images.json
function loadTarotDataset() {
  try {
    const jsonPath = path.join(process.cwd(), "public", "tarot_data", "tarot-images.json");
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      const data = JSON.parse(raw);
      return data.cards || [];
    }
  } catch (err) {
    console.warn("⚠️ Could not load tarot-images.json:", err.message);
  }
  return [];
}

const SPREAD_TYPES = {
  single: {
    name: "Rút 1 lá (Single Card)",
    cardCount: 1,
    positions: [
      { title: "Lá 1: Thông điệp & Định hướng Năng lượng Trong Ngày", key: "single" }
    ]
  },
  three: {
    name: "Rút 3 lá (Three-Card Spread)",
    cardCount: 3,
    positions: [
      { title: "Lá 1: Quá Khứ / Nguồn Gốc Hoàn Cảnh", key: "past" },
      { title: "Lá 2: Hiện Tại / Thách Thức Hiển Hiện", key: "present" },
      { title: "Lá 3: Tương Lai / Lời Khuyên Thời Gian", key: "future" }
    ]
  },
  celtic: {
    name: "Trải bài Celtic Cross (10 lá)",
    cardCount: 10,
    positions: [
      { title: "Lá 1: Tâm điểm & Thực tại hiện tại", key: "pos1" },
      { title: "Lá 2: Thách thức trực tiếp tác động", key: "pos2" },
      { title: "Lá 3: Nền tảng tiềm thức & Nguyên nhân gốc rễ", key: "pos3" },
      { title: "Lá 4: Quá khứ vừa diễn ra", key: "pos4" },
      { title: "Lá 5: Mục tiêu & Tiềm năng hướng tới", key: "pos5" },
      { title: "Lá 6: Tương lai gần đang tới", key: "pos6" },
      { title: "Lá 7: Thái độ & Tâm thế cá nhân", key: "pos7" },
      { title: "Lá 8: Môi trường & Yếu tố tác động xung quanh", key: "pos8" },
      { title: "Lá 9: Hy vọng & Nỗi sợ thầm kín", key: "pos9" },
      { title: "Lá 10: Kết quả tổng quan & Lời khuyên hành động", key: "pos10" }
    ]
  },
  love: {
    name: "Trải bài Tình cảm (Relationship/Love Spread - 5 lá)",
    cardCount: 5,
    positions: [
      { title: "Lá 1: Cảm xúc & Suy nghĩ của Bạn", key: "you" },
      { title: "Lá 2: Cảm xúc & Suy nghĩ của Đối Phương", key: "partner" },
      { title: "Lá 3: Năng lượng Kết Nối giữa hai người", key: "connection" },
      { title: "Lá 4: Thử Thách & Rào Cản Chung", key: "obstacle" },
      { title: "Lá 5: Xu Hướng & Lời Khuyên Tương Lai", key: "outcome" }
    ]
  }
};

function drawCardsForMode(mode = "three") {
  const spreadConfig = SPREAD_TYPES[mode] || SPREAD_TYPES.three;
  const dataset = loadTarotDataset();

  if (dataset.length === 0) {
    return { spreadConfig, drawn: [] };
  }

  const shuffled = [...dataset].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, spreadConfig.cardCount);

  const drawn = selected.map((cardData, idx) => {
    const isReversed = Math.random() < 0.3; // 30% chance reversed
    const pos = spreadConfig.positions[idx] || { title: `Lá ${idx + 1}`, key: `pos_${idx + 1}` };
    const keywordsStr = Array.isArray(cardData.keywords) ? cardData.keywords.join(", ") : "";

    return {
      name: cardData.name,
      number: cardData.number,
      arcana: cardData.arcana,
      suit: cardData.suit,
      img: `/tarot_data/cards/${cardData.img}`,
      keywords: keywordsStr,
      position: pos.title,
      positionKey: pos.key,
      isReversed,
      orientation: isReversed ? "Ngược (Reversed)" : "Xuôi (Upright)",
      meanings: isReversed ? cardData.meanings?.shadow : cardData.meanings?.light
    };
  });

  return { spreadConfig, drawn };
}

export async function POST(req) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question, mode = "three", dob, birthTime } = await req.json();

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập câu hỏi của bạn!" }, { status: 400 });
    }

    // 1. Draw cards based on requested spread mode
    const { spreadConfig, drawn } = drawCardsForMode(mode);
    if (drawn.length === 0) {
      return NextResponse.json({ error: "Không thể nạp bộ bài Tarot" }, { status: 500 });
    }

    // 2. Prepare AI Prompt
    const cardsSummary = drawn.map(c => `- ${c.position}: Lá ${c.name} (${c.arcana}) - Trạng thái: ${c.orientation}. Từ khóa: ${c.keywords}`).join("\n");
    const userContext = `Hồ sơ người dùng: Ngày sinh ${dob || "chưa rõ"}, Giờ sinh ${birthTime || "chưa rõ"}.`;

    const systemPrompt = `
Bạn là Trợ lý Luận giải Tarot & Tối ưu Lập lịch Cá nhân LifeSync AI.
Nhiệm vụ của bạn là giải bài Tarot cho kiểu trải bài "${spreadConfig.name}".
Hãy giải đáp câu hỏi của người dùng một cách sâu sắc, tinh tế, động viên và mang tính ứng dụng cao.
Hãy kết hợp thông điệp Tarot với gợi ý quản lý thời gian, nhịp sinh học và lập lịch trình công việc thực tế.

${userContext}

Câu hỏi người dùng: "${question.trim()}"

Danh sách các lá bài được rút (${drawn.length} lá):
${cardsSummary}

Hãy trả về bài luận giải bằng Markdown đẹp mắt với cấu trúc:
### 🔮 1. Thông điệp Tổng quan (${spreadConfig.name})
(Tóm tắt thần thái và thông điệp chính cho quẻ bài)

### 🎴 2. Chi tiết Các Lá Bài
(Phân tích ngắn gọn từng lá bài theo vị trí và trạng thái xuôi/ngược của nó)

### 🗓️ 3. Lời khuyên Lập lịch & Hành động Thực tế
(Đưa ra 2-3 lời khuyên hành động thực tế để người dùng sắp xếp lại lịch trình công việc và thói quen sinh hoạt)

Ở CUỐI CÙNG PHẢN HỒI, hãy luôn đính kèm duy nhất 1 khối \`\`\`json_events chứa 2-3 gợi ý lịch trình để đồng bộ vào Calendar:
\`\`\`json_events
[
  { "title": "⚡ Deep Work (Lời khuyên Tarot)", "start_time": "08:30", "end_time": "11:30", "category": "study", "description": "Tập trung cao độ làm việc không xao nhãng" },
  { "title": "🧘 Tĩnh tâm & Tái tạo năng lượng", "start_time": "12:00", "end_time": "12:30", "category": "general", "description": "Nghỉ ngơi tái tạo sức lao động" }
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
          messages: [{ role: "user", content: [{ type: "text", text: "Hãy luận giải bài Tarot trên." }] }]
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
        console.warn("Bedrock Tarot error:", err.message);
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
          const result = await model.generateContent("Hãy luận giải bài Tarot trên.");
          aiReading = result.response.text();
          if (aiReading) break;
        } catch (err) {
          console.warn(`⚠️ Gemini Key ${i + 1} Tarot error:`, err.message);
        }
      }
    }

    if (!aiReading) {
      aiReading = `### 🔮 1. Thông điệp Tổng quan\nCác lá bài mang lại năng lượng tích cực và cơ hội mới.\n\n### 🎴 2. Chi tiết Lá Bài\n${drawn.map(c => `- ${c.position}: ${c.name} (${c.orientation})`).join("\n")}\n\n### 🗓️ 3. Lời khuyên Quản lý Thời gian\nHãy ưu tiên thời gian cho những mục tiêu quan trọng nhất!`;
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
        { title: "⚡ Deep Work (Lời khuyên Tarot)", start_time: "08:30", end_time: "11:30", category: "study", description: "Làm việc tập trung cao độ" },
        { title: "🧘 Tĩnh tâm & Tái tạo năng lượng", start_time: "12:00", end_time: "12:30", category: "general", description: "Nghỉ ngơi tái tạo sức lao động" }
      ];
    }

    return NextResponse.json({
      success: true,
      mode,
      modeName: spreadConfig.name,
      cards: drawn,
      reading: aiReading,
      suggestedEvents
    });

  } catch (error) {
    console.error("❌ POST /api/ai/tarot error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
