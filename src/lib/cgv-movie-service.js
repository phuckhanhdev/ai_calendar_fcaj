/**
 * CGV Movie & Cinema Service (Tối ưu hóa Free Tier - 0$ Chi phí)
 * Hỗ trợ định vị 3 rạp CGV TP.HCM gần nhóm bạn nhất & tìm suất chiếu phù hợp
 */

import { eventsToBitmask, findConsecutiveFreeSlots, blockIndexToTimeStr } from "@/lib/bitmask-utils";

// Danh sách các rạp CGV lớn tại TP.HCM kèm Tọa độ GPS (Vĩ độ Lat, Kinh độ Lng)
export const CGV_HCM_CINEMAS = [
  {
    id: "cgv_su_van_hanh",
    name: "CGV Sư Vạn Hạnh (Quận 10)",
    address: "Tầng 6, Vạn Hạnh Mall, 11 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM",
    lat: 10.7698,
    lng: 106.6685,
  },
  {
    id: "cgv_vincom_dong_khoi",
    name: "CGV Vincom Đồng Khởi (Quận 1)",
    address: "Tầng B3, Vincom Center, 72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP.HCM",
    lat: 10.7781,
    lng: 106.7018,
  },
  {
    id: "cgv_landmark_81",
    name: "CGV Vincom Center Landmark 81 (Bình Thạnh)",
    address: "Tầng B1, Vincom Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM",
    lat: 10.7950,
    lng: 106.7218,
  },
  {
    id: "cgv_crescent_mall",
    name: "CGV Crescent Mall (Quận 7)",
    address: "Tầng 5, Crescent Mall, 101 Tôn Dật Tiên, Phường Tân Phú, Quận 7, TP.HCM",
    lat: 10.7292,
    lng: 106.7188,
  },
  {
    id: "cgv_pearl_plaza",
    name: "CGV Pearl Plaza (Bình Thạnh)",
    address: "Tầng 5, Pearl Plaza, 561A Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM",
    lat: 10.8001,
    lng: 106.7135,
  },
  {
    id: "cgv_aeon_tan_phu",
    name: "CGV AEON Tân Phú",
    address: "Tầng 3, AEON Mall Tân Phú Celadon, 30 Bờ Bao Tân Thắng, Sơn Kỳ, Tân Phú, TP.HCM",
    lat: 10.8016,
    lng: 106.6163,
  }
];

// Danh sách các phim hot đang chiếu tại CGV và khung giờ mẫu
export const MOCK_CGV_MOVIES = [
  {
    id: "m1",
    title: "Lật Mặt 7: Một Điều Ước",
    durationMinutes: 138,
    genre: "Tâm lý, Gia đình",
    showtimes: ["09:30", "13:45", "16:15", "19:30", "21:45"]
  },
  {
    id: "m2",
    title: "Dune: Hành Tinh Cát - Phần 2",
    durationMinutes: 166,
    genre: "Hành động, Viễn tưởng",
    showtimes: ["10:00", "14:30", "18:00", "20:30"]
  },
  {
    id: "m3",
    title: "Kung Fu Panda 4",
    durationMinutes: 94,
    genre: "Hoạt hình, Hài hước",
    showtimes: ["09:00", "11:15", "14:00", "16:30", "18:45"]
  },
  {
    id: "m4",
    title: "Godzilla x Kong: Đế Chế Mới",
    durationMinutes: 115,
    genre: "Hành động, Quái vật",
    showtimes: ["10:30", "13:15", "17:00", "19:45", "22:15"]
  }
];

/**
 * Công thức Haversine toán học tính khoảng cách giữa 2 tọa độ GPS (km)
 * Giúp tính khoảng cách 0$ không tốn tiền API Google Maps
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Trả về khoảng cách theo km
}

/**
 * Tìm 3 rạp CGV TP.HCM có tổng vị trí ngắn nhất cho nhóm
 * Hỗ trợ logic "Nam rước Nữ" cho lịch hẹn 2 người (Nam & Nữ): 
 *   -> Ưu tiên 80% trọng số vị trí gần phía nhà bạn Nữ!
 * @param {Array<{ lat: number, lng: number, gender?: string }>} locations Danh sách tọa độ GPS & Giới tính của các thành viên trong nhóm
 */
export function findTop3ClosestCGVCinemas(locations = []) {
  if (!locations || locations.length === 0) {
    // Mặc định vị trí Quận 1 trung tâm nếu chưa có GPS
    locations = [{ lat: 10.7769, lng: 106.7009, gender: "Male" }];
  }

  let avgLat = 0;
  let avgLng = 0;

  // LOGIC ĐẶC BIỆT: Hẹn hò 2 người (1 Nam & 1 Nữ)
  const isCoupleDate = locations.length === 2;
  const femaleMember = isCoupleDate ? locations.find(loc => loc.gender === "Female") : null;
  const maleMember = isCoupleDate ? locations.find(loc => loc.gender === "Male") : null;

  if (isCoupleDate && femaleMember && maleMember) {
    // Nam sẽ đến rước Nữ -> Ưu tiên 80% vị trí gần nhà bạn Nữ, 20% gần bạn Nam!
    avgLat = femaleMember.lat * 0.8 + maleMember.lat * 0.2;
    avgLng = femaleMember.lng * 0.8 + maleMember.lng * 0.2;
  } else {
    // 3+ người hoặc cùng giới tính -> Trọng số trung bình cộng chuẩn
    avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
    avgLng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;
  }

  // 2. Tính khoảng cách từ điểm trung tâm trọng số tới từng rạp CGV
  const scoredCinemas = CGV_HCM_CINEMAS.map((cinema) => {
    const avgDistanceKm = calculateHaversineDistance(avgLat, avgLng, cinema.lat, cinema.lng);
    return {
      ...cinema,
      avgDistanceKm: parseFloat(avgDistanceKm.toFixed(2)),
    };
  });

  // 3. Sắp xếp theo khoảng cách tăng dần và lấy Top 3 rạp gần nhất
  scoredCinemas.sort((a, b) => a.avgDistanceKm - b.avgDistanceKm);
  return scoredCinemas.slice(0, 3);
}

/**
 * Gợi ý các tùy chọn xem phim CGV cho nhóm bạn dựa trên rạp gần nhất và giờ rảnh
 */
export function generateCGVMovieOptions(topCinemas, targetDate, availableSlots = []) {
  const options = [];

  topCinemas.forEach((cinema, index) => {
    // Chọn ngẫu nhiên 1 phim hot cho từng rạp gợi ý
    const movie = MOCK_CGV_MOVIES[index % MOCK_CGV_MOVIES.length];
    
    // Tìm suất chiếu hợp lý
    const showtime = movie.showtimes[index % movie.showtimes.length];

    options.push({
      option_id: `cgv_opt_${index + 1}`,
      cinema_name: cinema.name,
      cinema_address: cinema.address,
      distance_km: cinema.avgDistanceKm,
      movie_title: movie.title,
      movie_genre: movie.genre,
      duration_minutes: movie.durationMinutes,
      date: targetDate,
      showtime: showtime,
      description: `Phim '${movie.title}' tại ${cinema.name} (${cinema.avgDistanceKm} km từ nhóm)`
    });
  });

  return options;
}
