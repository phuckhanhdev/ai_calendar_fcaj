import { NextResponse } from "next/server";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { name, dob, eventTitle, eventDesc, eventTime } = await req.json();

    const geminiKey = process.env.GEMINI_API_KEY;
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;

    const systemPrompt = "Bạn là Thầy Tử Vi và Chuyên gia Số học AI. Hãy phân tích mức độ hòa hợp năng lượng của sự kiện với bản mệnh của người dùng, đưa ra lời khuyên ngắn gọn, hữu ích và mang tính động viên.";
    const userPrompt = `
Hãy phân tích sự kiện sau cho người dùng:
- Họ tên: ${name}
- Ngày sinh: ${dob}
- Tên sự kiện: ${eventTitle}
- Mô tả sự kiện: ${eventDesc || "Không có mô tả"}
- Thời gian diễn ra: ${eventTime || "00:00"}

Hãy đưa ra lời khuyên năng lượng số học/tử vi ngắn gọn, súc tích (khoảng 3-4 câu) bằng tiếng Việt.
`;

    let advice = null;
    let provider = null;

    // =========================================================================
    // 🛡️ BƯỚC 1: ƯU TIÊN GỌI AWS BEDROCK (PRIMARY)
    // =========================================================================
    if (awsAccessKey && awsSecretKey && awsAccessKey !== "test" && awsAccessKey !== "") {
      try {
        console.log("⚡ [AI Service] Đang thử kết nối AWS Bedrock (Primary)...");
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
          max_tokens: 500,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: userPrompt
                }
              ]
            }
          ]
        };

        const command = new InvokeModelCommand({
          modelId: modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(payload)
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const bedrockAdvice = responseBody.content?.[0]?.text;

        if (bedrockAdvice) {
          advice = bedrockAdvice;
          provider = "AWS Bedrock (Primary)";
          console.log("✅ [AI Service] Kết nối AWS Bedrock thành công.");
        }
      } catch (bedrockError) {
        console.warn("⚠️ [AI Service] AWS Bedrock gặp lỗi. Chuẩn bị kích hoạt phương án dự phòng. Lỗi chi tiết:", bedrockError.message);
      }
    }

    // =========================================================================
    // 🔄 BƯỚC 2: PHƯƠNG ÁN PHÒNG BỊ - GỌI GOOGLE GEMINI (FALLBACK)
    // =========================================================================
    if (!advice && geminiKey && geminiKey !== "" && geminiKey !== "YOUR_GEMINI_API_KEY") {
      try {
        console.log("🔄 [AI Service] Đang chuyển sang gọi Google Gemini (Fallback)...");
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ 
          model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
          systemInstruction: systemPrompt
        });

        const result = await model.generateContent(userPrompt);
        const geminiAdvice = result.response.text();

        if (geminiAdvice) {
          advice = geminiAdvice;
          provider = "Google Gemini (Fallback)";
          console.log("✅ [AI Service] Kết nối Google Gemini thành công.");
        }
      } catch (geminiError) {
        console.warn("⚠️ [AI Service] Google Gemini gặp lỗi. Lỗi chi tiết:", geminiError.message);
      }
    }

    // =========================================================================
    // 💡 BƯỚC 3: MOCK AI (FALLBACK CUỐI CÙNG NẾU CẢ HAI ĐỀU THẤT BẠI)
    // =========================================================================
    if (!advice) {
      console.log("💡 [AI Service] Cả Bedrock và Gemini đều lỗi hoặc chưa cấu hình. Trả về Mock AI...");
      return NextResponse.json({
        success: true,
        provider: "Mock AI (Fallback)",
        advice: `🔮 [MOCK AI] Xin chào ${name} (sinh ngày ${dob}). Về sự kiện "${eventTitle}" lúc ${eventTime || "00:00"}: Năng lượng hôm nay cho thấy việc giữ vững sự kiên nhẫn và cẩn trọng sẽ giúp bạn đón nhận nhiều thuận lợi lớn. Hãy tin tưởng vào năng lực của bản thân!`,
        isMock: true
      });
    }

    return NextResponse.json({
      success: true,
      provider: provider,
      advice: advice.trim()
    });

  } catch (error) {
    console.error("❌ [AI Service] Lỗi xử lý API tổng thể:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Lỗi xử lý phân tích AI tổng thể"
    }, { status: 500 });
  }
}
