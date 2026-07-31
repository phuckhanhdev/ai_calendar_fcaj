/**
 * Utility tính Cung Hoàng Đạo & Màu may mắn ngẫu nhiên cố định theo người dùng
 */

// Bảng màu may mắn chuẩn theo 12 Cung Hoàng Đạo
export const ZODIAC_PALETTES = {
  Aries: {
    name: "Bạch Dương",
    colors: ["#EF4444", "#38BDF8", "#F97316"] // Đỏ, Trắng/Xanh, Cam
  },
  Taurus: {
    name: "Kim Ngưu",
    colors: ["#10B981", "#EC4899", "#6366F1"] // Xanh lá, Hồng, Trắng
  },
  Gemini: {
    name: "Song Tử",
    colors: ["#EAB308", "#38BDF8", "#10B981"] // Vàng, Xanh lam nhạt, Xanh lục
  },
  Cancer: {
    name: "Cự Giải",
    colors: ["#94A3B8", "#0284C7", "#38BDF8"] // Bạc, Xanh lam
  },
  Leo: {
    name: "Sư Tử",
    colors: ["#EC4899", "#EAB308", "#F97316"] // Hồng, Vàng, Cam
  },
  Virgo: {
    name: "Xử Nữ",
    colors: ["#64748B", "#EAB308", "#3B82F6"] // Xám xanh, Vàng
  },
  Libra: {
    name: "Thiên Bình",
    colors: ["#FACC15", "#EC4899", "#3B82F6"] // Vàng tươi, Hồng, Xanh
  },
  Scorpio: {
    name: "Bọ Cạp",
    colors: ["#7E22CE", "#991B1B", "#8B5CF6"] // Tím, Đỏ trầm
  },
  Sagittarius: {
    name: "Nhân Mã",
    colors: ["#22C55E", "#86EFAC", "#A855F7"] // Xanh lá, Xanh nhạt, Tím
  },
  Capricorn: {
    name: "Ma Kết",
    colors: ["#475569", "#78350F", "#DC2626"] // Xám, Nâu đậm, Đỏ
  },
  Aquarius: {
    name: "Bảo Bình",
    colors: ["#1E40AF", "#A855F7", "#0F172A"] // Xanh nước biển đậm, Tím, Đen
  },
  Pisces: {
    name: "Song Ngư",
    colors: ["#10B981", "#93C5FD", "#8B5CF6"] // Xanh lá, Xanh nhạt, Tím
  }
};

/**
 * Xác định Cung Hoàng Đạo dựa trên Ngày Sinh (YYYY-MM-DD)
 */
export function getZodiacSign(dobStr) {
  if (!dobStr) return "Aries";

  const date = new Date(dobStr);
  const day = date.getDate();
  const month = date.getMonth() + 1; // 1 - 12

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
  return "Pisces";
}

/**
 * Tạo màu nền ngẫu nhiên CỐ ĐỊNH dựa trên User ID và Cung Hoàng Đạo
 * (Không bao giờ thay đổi khi F5 reload lại trang)
 */
export function getZodiacAvatarColor(userId, dobStr) {
  const signKey = getZodiacSign(dobStr);
  const palette = ZODIAC_PALETTES[signKey] || ZODIAC_PALETTES.Aries;
  
  if (!userId) return palette.colors[0];

  // Hash đơn giản từ chuỗi User_ID để lấy index cố định
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % palette.colors.length;
  
  return palette.colors[colorIndex];
}
