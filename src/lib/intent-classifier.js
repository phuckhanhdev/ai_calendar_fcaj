/**
 * Phân tách Intent (Ý định người dùng) để tối ưu hóa truy vấn DB và prompts gửi cho AI
 */
export function detectUserIntent(message) {
  const msg = String(message || "").toLowerCase().trim();

  // 1. Nhóm Chào hỏi / Xã giao đơn giản
  const greetingKeywords = [
    "chào", "hi", "hello", "xin chào", "bạn là ai", "tên là gì", "chào bạn",
    "giới thiệu", "help", "trợ giúp", "cứu", "sử dụng thế nào"
  ];
  if (greetingKeywords.some(keyword => msg === keyword || msg.startsWith(keyword + " "))) {
    return "GREETING";
  }

  // 2. Nhóm Tra cứu lịch trình hiện tại
  const calendarKeywords = [
    "lịch gì", "lịch trình", "có hẹn gì", "hôm nay có gì", "ngày mai có gì", 
    "tuần này có gì", "xem lịch", "lịch cá nhân", "sự kiện hôm nay",
    "xem lịch của tôi", "có công việc gì", "danh sách lịch", "ngày mai bận lúc"
  ];
  if (calendarKeywords.some(keyword => msg.includes(keyword))) {
    return "QUERY_CALENDAR";
  }

  // 3. Nhóm Hỏi về phong thuỷ / số học / bản mệnh học
  const fengshuiKeywords = [
    "tử vi", "số học", "bản mệnh", "năng lượng", "cung hoàng đạo", 
    "ma trận định mệnh", "hợp màu gì", "phong thuỷ", "tính bản mệnh",
    "điểm năng lượng", "ngày sinh của tôi", "vận mệnh", "số mệnh"
  ];
  if (fengshuiKeywords.some(keyword => msg.includes(keyword))) {
    return "DESTINY_INFO";
  }

  // 4. Mặc định là yêu cầu lập lịch trình mới (cần tạo code .ics)
  return "SCHEDULE_CREATION";
}
