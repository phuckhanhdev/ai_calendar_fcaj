export interface DestinyMatrixPoints {
  apoint: number; // Day of birth (Left)
  bpoint: number; // Month of birth (Top)
  cpoint: number; // Year of birth (Right)
  dpoint: number; // Karmic tail (Bottom)
  epoint: number; // Comfort zone (Center)
  fpoint: number; // Top-left diagonal
  gpoint: number; // Top-right diagonal
  hpoint: number; // Bottom-left diagonal
  ipoint: number; // Bottom-right diagonal
  jpoint: number; // Heart chakra (Comfort zone + Karmic tail)
  npoint: number; // Sacral chakra (Comfort zone + Year)
}

// Base-22 reduction system: if number > 22, sum the digits
export const reduceNumber = (number: number): number => {
  if (number <= 0) return 22; // fallback
  let num = number;
  while (num > 22) {
    let sum = 0;
    let temp = num;
    while (temp > 0) {
      sum += temp % 10;
      temp = Math.floor(temp / 10);
    }
    num = sum;
  }
  return num;
};

// Calculate Year value by summing its digits and reducing
export const calculateYearValue = (year: number): number => {
  let y = 0;
  let temp = year;
  while (temp > 0) {
    y += temp % 10;
    temp = Math.floor(temp / 10);
  }
  return reduceNumber(y);
};

// Main calculation orchestrator
export const calculateDestinyMatrix = (dobString: string): { points: DestinyMatrixPoints; zodiac: string; emoji: string } => {
  if (!dobString) {
    // Default fallback values if no date of birth is set
    return {
      points: {
        apoint: 11, bpoint: 6, cpoint: 7, dpoint: 9, epoint: 17,
        fpoint: 17, gpoint: 13, hpoint: 20, ipoint: 16, jpoint: 8, npoint: 12
      },
      zodiac: "Chưa cập nhật",
      emoji: "🔮"
    };
  }

  // Parse YYYY-MM-DD
  const parts = dobString.split("-");
  const year = parseInt(parts[0]) || 2000;
  const month = parseInt(parts[1]) || 1;
  const day = parseInt(parts[2]) || 1;

  // 1. Core nodes A, B, C
  const apoint = reduceNumber(day);
  const bpoint = reduceNumber(month);
  const cpoint = calculateYearValue(year);

  // 2. Center and diagonals
  const dpoint = reduceNumber(apoint + bpoint + cpoint);
  const epoint = reduceNumber(apoint + bpoint + cpoint + dpoint);
  
  const fpoint = reduceNumber(apoint + bpoint);
  const gpoint = reduceNumber(bpoint + cpoint);
  const hpoint = reduceNumber(dpoint + apoint);
  const ipoint = reduceNumber(cpoint + dpoint);

  const jpoint = reduceNumber(dpoint + epoint);
  const npoint = reduceNumber(cpoint + epoint);

  const points: DestinyMatrixPoints = {
    apoint, bpoint, cpoint, dpoint, epoint,
    fpoint, gpoint, hpoint, ipoint, jpoint, npoint
  };

  // 3. Zodiac sign detection
  const zodiacData = getZodiacSign(day, month);

  return {
    points,
    zodiac: zodiacData.name,
    emoji: zodiacData.emoji
  };
};

// Zodiac detector
const getZodiacSign = (day: number, month: number): { name: string; emoji: string } => {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { name: "Bạch Dương (Aries)", emoji: "♈" };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { name: "Kim Ngưu (Taurus)", emoji: "♉" };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return { name: "Song Tử (Gemini)", emoji: "♊" };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return { name: "Cự Giải (Cancer)", emoji: "♋" };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { name: "Sư Tử (Leo)", emoji: "♌" };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { name: "Xử Nữ (Virgo)", emoji: "♍" };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return { name: "Thiên Bình (Libra)", emoji: "♎" };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return { name: "Bọ Cạp (Scorpio)", emoji: "♏" };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { name: "Nhân Mã (Sagittarius)", emoji: "♐" };
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { name: "Ma Kết (Capricorn)", emoji: "♑" };
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { name: "Bảo Bình (Aquarius)", emoji: "♒" };
  return { name: "Song Ngư (Pisces)", emoji: "♓" };
};

// Numerology descriptions helper based on Central energy number
export const getDestinyMatrixDescription = (centerEnergy: number): { title: string; desc: string } => {
  const descriptions: Record<number, { title: string; desc: string }> = {
    1: { title: "Năng lượng Người Tiên Phong", desc: "Bạn có tài năng lãnh đạo bẩm sinh, khả năng sáng tạo độc lập và tự tin vạch ra con đường riêng của mình." },
    2: { title: "Năng lượng Người Kết Nối", desc: "Bạn nhạy bén, trực giác cực tốt, giỏi thương thuyết và luôn mang lại sự cân bằng, hài hoà cho tập thể." },
    3: { title: "Năng lượng Người Sáng Tạo", desc: "Năng lượng dồi dào về mặt ý tưởng, nghệ thuật và khả năng biểu đạt. Thích hợp với công việc truyền thông." },
    4: { title: "Năng lượng Người Xây Dựng", desc: "Tính cách vững chãi, kỷ luật cao, làm việc có tổ chức và luôn mang lại cảm giác an tâm cho mọi người." },
    5: { title: "Năng lượng Người Truyền Thụ", desc: "Bạn đam mê học hỏi, tích lũy tri thức và có khả năng chia sẻ, giảng dạy, định hướng cho người khác." },
    6: { title: "Năng lượng Người Hoà Giải", desc: "Trọng tình cảm, gu thẩm mỹ cao, yêu cái đẹp và có mong muốn mạnh mẽ trong việc chăm sóc gia đình, bạn bè." },
    7: { title: "Năng lượng Chiến Binh", desc: "Bạn có mục tiêu rõ ràng, nghị lực kiên cường và khả năng vượt qua mọi thử thách để hoàn thành sứ mệnh." },
    8: { title: "Năng lượng Công Lý", desc: "Có tư duy logic, thấu hiểu quy luật nhân quả, công bằng, minh bạch trong công việc và cuộc sống." },
    9: { title: "Năng lượng Nhà Thông Thái", desc: "Bạn thích nghiên cứu sâu sắc, chiêm nghiệm nội tâm và sở hữu trí tuệ tự nhiên vượt trội." },
    10: { title: "Năng lượng Vòng Quay May Mắn", desc: "Bạn linh hoạt, dễ thích nghi và luôn gặp may mắn khi thuận theo dòng chảy tự nhiên của cuộc sống." },
    11: { title: "Năng lượng Sức Mạnh", desc: "Sở hữu thể lực dồi dào, lòng nhiệt huyết cháy bỏng và sức chịu đựng phi thường để cống hiến cho công việc." },
    12: { title: "Năng lượng Người Phục Vụ", desc: "Sống vị tha, bao dung, có cái nhìn đa chiều mới lạ và thích giúp đỡ những người yếu thế." },
    13: { title: "Năng lượng Sự Tái Sinh", desc: "Bạn không ngại thay đổi, có khả năng buông bỏ cái cũ để bắt đầu chu kỳ phát triển mới mạnh mẽ." },
    14: { title: "Năng lượng Sự Tiết Chế", desc: "Sở hữu tâm hồn nghệ thuật nhạy cảm, điềm đạm, kiên nhẫn và luôn giữ được trạng thái trung dung." },
    15: { title: "Năng lượng Sức Hút Bản Năng", desc: "Bạn có tài thuyết phục, nhìn thấu điểm yếu của người khác và sở hữu sức hấp dẫn cá nhân cực lớn." },
    16: { title: "Năng lượng Sự Đổ Vỡ & Tái Thiết", desc: "Khả năng phục hồi mạnh mẽ sau biến cố, phá vỡ giới hạn cũ để xây dựng những giá trị vững bền hơn." },
    17: { title: "Năng lượng Ngôi Sao Tỏa Sáng", desc: "Năng lượng sáng tạo nghệ thuật vượt trội, có thiên hướng nổi tiếng và truyền cảm hứng cho đám đông." },
    18: { title: "Năng lượng Vầng Trăng Trực Giác", desc: "Trực giác huyền bí, khả năng thu hút điều mình mong muốn qua luật hấp dẫn và trí tưởng tượng phong phú." },
    19: { title: "Năng lượng Mặt Trời Rực Rỡ", desc: "Mang lại sự ấm áp, thịnh vượng, niềm vui và sự lạc quan to lớn cho những người xung quanh." },
    20: { title: "Năng lượng Phán Xét & Chuyển Hoá", desc: "Bạn có mối liên kết gia đình/dòng họ sâu sắc, có khả năng giải quyết các vấn đề nghiệp quả thế hệ." },
    21: { title: "Năng lượng Thế Giới Hoà Hợp", desc: "Bạn có tư duy toàn cầu, tầm nhìn rộng mở, thích đi du lịch và kết nối các nền văn hoá khác nhau." },
    22: { title: "Năng lượng Người Tự Do", desc: "Yêu thích sự tự do không ràng buộc, vui vẻ, lạc quan và coi cuộc sống như một cuộc phiêu lưu thú vị." }
  };

  return descriptions[centerEnergy] || {
    title: "Năng lượng Bản mệnh đặc biệt",
    desc: "Bạn sở hữu năng lượng luân xa độc đáo. Hãy duy trì lối sống lành mạnh để khai phá tiềm năng tối đa."
  };
};
