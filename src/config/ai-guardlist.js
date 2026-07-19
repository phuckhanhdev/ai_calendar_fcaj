export const AI_GUARDLIST_RULES = [
  {
    id: "empty",
    type: "block",
    pattern: /^\s*$/,
    message: "Vui lòng nhập câu hỏi hoặc yêu cầu cụ thể để mình hỗ trợ xếp lịch trình nhé!",
  },
  {
    id: "too_long",
    type: "block",
    pattern: /^.{501,}$/s,
    message: "Câu hỏi quá dài. Bạn vui lòng rút ngắn câu hỏi dưới 500 ký tự nhé!",
  },
  {
    id: "prompt_injection",
    type: "block",
    pattern: /(ignore\s+previous|bypass|jailbreak|system\s+prompt|developer\s+mode)/i,
    message: "Yêu cầu không hợp lệ. Vui lòng nhập câu hỏi bình thường.",
  },
  {
    id: "sql_or_code_attack",
    type: "block",
    pattern: /(drop\s+table|union\s+select|<script|onerror=|javascript:)/i,
    message: "Nội dung có dấu hiệu không an toàn. Vui lòng kiểm tra lại câu hỏi.",
  },
  {
    id: "sensitive_or_harmful_topics",
    type: "block",
    pattern:
      /(tự tử|tu tu|giết người|giet nguoi|giết|giet|sát hại|sat hai|ám sát|am sat|đầu độc|dau doc|tra tấn|tra tan|chế bom|che bom|ma túy|ma tuy|vũ khí|vu khi|khủng bố|khung bo|rửa tiền|rua tien|lừa đảo|lua dao|hack|xâm nhập|xam nhap|đánh bạc|danh bac|18\+|khiêu dâm|khieu dam)/i,
    message:
      "Yêu cầu chứa nội dung không phù hợp với trợ lý Lập lịch LifeSync AI. Vui lòng thử lại với các câu hỏi liên quan đến lịch trình hoặc tử vi bản mệnh.",
  },
  {
    id: "sensitive_personal_data",
    type: "sanitize",
    pattern: /\b(\d{9,12}|(?:\d[ -]*?){13,19}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    replacement: "[redacted]",
  },
];

export function applyGuardList(question) {
  let text = String(question || "");
  for (const rule of AI_GUARDLIST_RULES) {
    if (rule.type === "block" && rule.pattern.test(text)) {
      return {
        blocked: true,
        rule_id: rule.id,
        message: rule.message,
        sanitized: null,
      };
    }
    if (rule.type === "sanitize") {
      text = text.replace(rule.pattern, rule.replacement || "");
    }
  }
  return {
    blocked: false,
    rule_id: null,
    message: null,
    sanitized: text.trim(),
  };
}
