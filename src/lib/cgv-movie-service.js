/**
 * CGV Cinema Service (Tối ưu hóa Free Tier - 0$ Chi phí)
 * Hỗ trợ định vị 3 rạp CGV TP.HCM gần nhóm bạn nhất dựa trên công thức Haversine 
 * và Thuật toán Trọng số "Nam rước Nữ" (80% Nữ - 20% Nam).
 */

// Danh sách đầy đủ 15+ rạp CGV tại TP.HCM kèm Tọa độ GPS chuẩn xác
export const CGV_HCM_CINEMAS = [
  {
    "id": "cgv_vincom_dong_khoi",
    "name": "CGV Vincom Đồng Khởi",
    "address": "Tầng 3, Vincom Center Đồng Khởi, 72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM",
    "lat": 10.7779,
    "lng": 106.7021
  },
  {
    "id": "cgv_liberty_citypoint",
    "name": "CGV Liberty Citypoint",
    "address": "Tầng 1, Khách sạn Liberty Central Citypoint, 59-61 Pasteur, Bến Nghé, Quận 1, TP.HCM",
    "lat": 10.7744,
    "lng": 106.7005
  },
  {
    "id": "cgv_ly_chinh_thang",
    "name": "CGV Lý Chính Thắng",
    "address": "Tầng 3, Cao ốc Intresco Plaza, 83 Lý Chính Thắng, Phường Võ Thị Sáu, Quận 3, TP.HCM",
    "lat": 10.7876,
    "lng": 106.6851
  },
  {
    "id": "cgv_hung_vuong_plaza",
    "name": "CGV Hùng Vương Plaza",
    "address": "Tầng 7, Hùng Vương Plaza, 126 Hồng Bàng, Phường 12, Quận 5, TP.HCM",
    "lat": 10.7572,
    "lng": 106.6622
  },
  {
    "id": "cgv_sc_vivocity",
    "name": "CGV SC VivoCity",
    "address": "Tầng 5, SC VivoCity, 1058 Nguyễn Văn Linh, Tân Phong, Quận 7, TP.HCM",
    "lat": 10.7294,
    "lng": 106.7214
  },
  {
    "id": "cgv_crescent_mall",
    "name": "CGV Crescent Mall",
    "address": "Tầng 5, Crescent Mall, 101 Tôn Dật Tiên, Tân Phú, Quận 7, TP.HCM",
    "lat": 10.7288,
    "lng": 106.7196
  },
  {
    "id": "cgv_van_hanh_mall",
    "name": "CGV Vạn Hạnh Mall",
    "address": "Tầng 6, Vạn Hạnh Mall, 11 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM",
    "lat": 10.7762,
    "lng": 106.6675
  },
  {
    "id": "cgv_su_van_hanh",
    "name": "CGV Sư Vạn Hạnh",
    "address": "Tầng 6, Vạn Hạnh Mall, 11 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM",
    "lat": 10.7762,
    "lng": 106.6675
  },
  {
    "id": "cgv_landmark_81",
    "name": "CGV Vincom Center Landmark 81",
    "address": "Tầng B1, Vincom Center Landmark 81, 772 Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM",
    "lat": 10.7947,
    "lng": 106.7218
  },
  {
    "id": "cgv_pearl_plaza",
    "name": "CGV Pearl Plaza",
    "address": "Tầng 5, Pearl Plaza, 561A Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM",
    "lat": 10.7984,
    "lng": 106.7115
  },
  {
    "id": "cgv_saigonres_nguyen_xi",
    "name": "CGV Saigonres Nguyễn Xí",
    "address": "Tầng 4-5, Saigonres Plaza, 188 Nguyễn Xí, Phường 26, Bình Thạnh, TP.HCM",
    "lat": 10.8123,
    "lng": 106.7099
  },
  {
    "id": "cgv_vincom_go_vap",
    "name": "CGV Vincom Gò Vấp",
    "address": "Tầng 5, Vincom Plaza Gò Vấp, 12 Phan Văn Trị, Phường 7, Gò Vấp, TP.HCM",
    "lat": 10.8279,
    "lng": 106.6872
  },
  {
    "id": "cgv_vincom_phan_van_tri",
    "name": "CGV Vincom Plaza Phan Văn Trị",
    "address": "Tầng 5, Vincom Plaza, 12 Phan Văn Trị, Phường 7, Gò Vấp, TP.HCM",
    "lat": 10.8279,
    "lng": 106.6872
  },
  {
    "id": "cgv_hoang_van_thu",
    "name": "CGV Hoàng Văn Thụ",
    "address": "Tầng 1 và 2, Gala Center, 415 Hoàng Văn Thụ, Phường 2, Tân Bình, TP.HCM",
    "lat": 10.7972,
    "lng": 106.6575
  },
  {
    "id": "cgv_menas_mall",
    "name": "CGV Menas Mall Saigon Airport",
    "address": "Tầng 5, Menas Mall, 60A Trường Sơn, Phường 2, Tân Bình, TP.HCM",
    "lat": 10.8126,
    "lng": 106.6625
  },
  {
    "id": "cgv_aeon_tan_phu",
    "name": "CGV Celadon Tân Phú",
    "address": "Tầng 3, AEON Mall Tân Phú Celadon, 30 Bờ Bao Tân Thắng, Sơn Kỳ, Tân Phú, TP.HCM",
    "lat": 10.8032,
    "lng": 106.6157
  },
  {
    "id": "cgv_pandora_city",
    "name": "CGV Pandora City",
    "address": "Tầng 3, TTTM Pandora City, 1/1 Trường Chinh, Tây Thạnh, Tân Phú, TP.HCM",
    "lat": 10.8037,
    "lng": 106.6384
  },
  {
    "id": "cgv_aeon_binh_tan",
    "name": "CGV AEON Mall Bình Tân",
    "address": "Tầng 3, AEON Mall Bình Tân, Số 1 Đường số 17A, Bình Trị Đông B, Bình Tân, TP.HCM",
    "lat": 10.7436,
    "lng": 106.6111
  },
  {
    "id": "cgv_thao_dien_pearl",
    "name": "CGV Thảo Điền Pearl",
    "address": "Tầng 2, Thảo Điền Pearl, 12 Quốc Hương, Thảo Điền, TP. Thủ Đức, TP.HCM",
    "lat": 10.8042,
    "lng": 106.7352
  },
  {
    "id": "cgv_giga_mall_thu_duc",
    "name": "CGV Giga Mall Thủ Đức",
    "address": "Tầng 6, TTTM Gigamall, 240-242 Phạm Văn Đồng, Hiệp Bình Chánh, TP. Thủ Đức, TP.HCM",
    "lat": 10.8274,
    "lng": 106.7211
  },
  {
    "id": "cgv_vincom_thu_duc",
    "name": "CGV Vincom Thủ Đức",
    "address": "Tầng 5, Vincom Plaza Thủ Đức, 216 Võ Văn Ngân, Bình Thọ, TP. Thủ Đức, TP.HCM",
    "lat": 10.8512,
    "lng": 106.7584
  },
  {
    "id": "cgv_vincom_grand_park",
    "name": "CGV Vincom Mega Mall Grand Park",
    "address": "Tầng L5, Vincom Mega Mall Grand Park, 88 Phước Thiện, Long Bình, TP. Thủ Đức, TP.HCM",
    "lat": 10.8402,
    "lng": 106.8436
  },
  {
    "id": "cgv_satra_cu_chi",
    "name": "CGV Satra Củ Chi",
    "address": "Tầng 3, TTTM Satra Củ Chi, 1239 Tỉnh Lộ 8, Ấp Thạnh An, Xã Trung An, Huyện Củ Chi, TP.HCM",
    "lat": 10.9591,
    "lng": 106.5255
  }
]
  ;

/**
 * Công thức Haversine toán học tính khoảng cách giữa 2 tọa độ GPS (km)
 * Giúp tính khoảng cách 0$ không tốn tiền API Google Maps Matrix
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
 * THUẬT TOÁN ĐẶC BIỆT: "Nam rước Nữ" cho lịch hẹn 2 người (1 Nam & 1 Nữ):
 *   -> Ưu tiên 80% trọng số vị trí gần nhà bạn Nữ, 20% gần bạn Nam!
 * @param {Array<{ lat: number, lng: number, gender?: string }>} locations Danh sách tọa độ GPS & Giới tính của các thành viên trong nhóm
 */
export function findTop3ClosestCGVCinemas(locations = []) {
  if (!locations || locations.length === 0) {
    // Mặc định vị trí Quận 1 trung tâm nếu chưa có GPS
    locations = [{ lat: 10.7769, lng: 106.7009, gender: "Male" }];
  }

  let avgLat = 0;
  let avgLng = 0;

  // 🔥 THUẬT TOÁN NAM RƯỚC NỮ (Hẹn hò 2 người: 1 Nam & 1 Nữ)
  const isCoupleDate = locations.length === 2;
  const femaleMember = isCoupleDate ? locations.find(loc => loc.gender === "Female") : null;
  const maleMember = isCoupleDate ? locations.find(loc => loc.gender === "Male") : null;

  if (isCoupleDate && femaleMember && maleMember) {
    // Nam sẽ đến rước Nữ -> Ưu tiên 80% vị trí gần nhà bạn Nữ, 20% gần nhà bạn Nam!
    avgLat = femaleMember.lat * 0.8 + maleMember.lat * 0.2;
    avgLng = femaleMember.lng * 0.8 + maleMember.lng * 0.2;
  } else {
    // 3+ người hoặc cùng giới tính -> Trọng số trung bình cộng chuẩn (Group Centroid)
    avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
    avgLng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;
  }

  // Tính khoảng cách từ điểm trung tâm trọng số tới từng rạp CGV
  const scoredCinemas = CGV_HCM_CINEMAS.map((cinema) => {
    const avgDistanceKm = calculateHaversineDistance(avgLat, avgLng, cinema.lat, cinema.lng);
    return {
      id: cinema.id,
      name: cinema.name,
      address: cinema.address,
      latitude: cinema.lat,
      longitude: cinema.lng,
      distance_km: parseFloat(avgDistanceKm.toFixed(2)),
      google_maps_link: `https://www.google.com/maps/search/?api=1&query=${cinema.lat},${cinema.lng}`
    };
  });

  // Sắp xếp theo khoảng cách tăng dần và lấy Top 3 rạp gần nhất
  scoredCinemas.sort((a, b) => a.distance_km - b.distance_km);
  return scoredCinemas.slice(0, 3);
}

export function getCGVCinemaRecommendations(locations = []) {
  return findTop3ClosestCGVCinemas(locations);
}
