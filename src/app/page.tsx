"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { formatUserName } from "@/lib/name-utils";
import AppLayout from "@/components/layouts/AppLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Calendar, Sparkles, Compass, Users, ChevronRight } from "lucide-react";
import { ClipLoader } from "react-spinners";
import "./homepage.css";

// Hàm tính số chủ đạo (Life Path Number) trong Nhân số học
function calculateLifePath(dobString: string) {
  if (!dobString) return 7; // mặc định
  const digits = dobString.replace(/\D/g, "");
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits[i]);
  }
  
  // Rút gọn về 1 chữ số trừ khi là số Master (11, 22, 33) hoặc 10
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33 && sum !== 10) {
    let tempSum = 0;
    const sumStr = String(sum);
    for (let i = 0; i < sumStr.length; i++) {
      tempSum += parseInt(sumStr[i]);
    }
    sum = tempSum;
  }
  return sum;
}

// Lấy thông tin diễn giải về số chủ đạo
function getLifePathDescription(num: number) {
  switch (num) {
    case 1: return { title: "Người Tiên Phong", desc: "Độc lập, sáng tạo, quyết đoán và có tài dẫn dắt." };
    case 2: return { title: "Người Hoà Giải", desc: "Nhạy cảm, trực giác tốt, hợp tác và giàu lòng thấu cảm." };
    case 3: return { title: "Người Truyền Cảm Hứng", desc: "Giao tiếp xuất sắc, vui vẻ, giàu óc nghệ thuật." };
    case 4: return { title: "Người Kiến Thiết", desc: "Thực tế, có tính kỷ luật, vững chãi và đáng tin cậy." };
    case 5: return { title: "Người Tự Do", desc: "Thích phiêu lưu, thích nghi nhanh, năng động và ưa khám phá." };
    case 6: return { title: "Người Nuôi Dưỡng", desc: "Yêu thương, có trách nhiệm, hướng về gia đình." };
    case 7: return { title: "Nhà Thông Thái", desc: "Thích tự học, nghiên cứu, sâu sắc và giỏi phân tích." };
    case 8: return { title: "Nhà Điều Hành", desc: "Bản lĩnh, giỏi tài chính, tham vọng và thực tế." };
    case 9: return { title: "Nhà Nhân Ái", desc: "Giàu lòng nhân đạo, có hoài bão lớn và bao dung." };
    case 10: return { title: "Người Thích Nghi", desc: "Linh hoạt, tự tin, can đảm và có tiềm năng vô hạn." };
    case 11: return { title: "Nhà Khai Sáng (Master)", desc: "Trực giác siêu nhạy, tâm linh và tràn đầy cảm hứng." };
    case 22: return { title: "Người Kiến Tạo Vĩ Đại", desc: "Tầm nhìn lớn, hiện thực hoá những ước mơ vĩ đại." };
    default: return { title: "Nhà Khám Phá", desc: "Đang trên hành trình tìm kiếm năng lượng vũ trụ." };
  }
}

export default function Home() {
  const { user, loading, logoutUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign_in");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push("/sign_in");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fafc" }}>
        <ClipLoader color="#F47521" size={50} />
        <p style={{ marginTop: "16px", color: "#64748b", fontSize: "14px", fontWeight: "600" }}>Đang kết nối vũ trụ...</p>
      </div>
    );
  }

  // Tính toán thần số học cho thanh bên
  const dobStr = user?.Date_of_birth?.substring(0, 10) || "";
  const lifePathNum = calculateLifePath(dobStr);
  const lpInfo = getLifePathDescription(lifePathNum);

  return (
    <AppLayout>
      <div className="dashboard-container" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        {/* Style tag to handle desktop sidebar responsiveness */}
        <style jsx>{`
          @media (min-width: 1024px) {
            .dashboard-container {
              grid-template-columns: 280px 1fr !important;
            }
          }
        `}</style>
        
        {/* 🔹 LEFT COLUMN: DESTINY SIDEBAR */}
        <aside className="dashboard-aside">
          <div className="destiny-card">
            {/* Profile Avatar & Name */}
            <div className="dashboard-text-center">
              <div className="profile-avatar-circle">
                {user?.FName ? user.FName.charAt(0).toUpperCase() : "U"}
              </div>
              <h3 className="destiny-profile-name">
                {formatUserName(user)}
              </h3>
              <p className="destiny-profile-dob">
                Ngày sinh: {dobStr ? new Date(dobStr).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
              </p>
            </div>

            {/* Numerology Life Path Number Circle */}
            {dobStr ? (
              <div className="profile-number-section">
                <div className="profile-number-circle">
                  <span className="profile-number-val">{lifePathNum}</span>
                  <span className="profile-number-lbl">Chủ đạo</span>
                </div>
                <h4 className="profile-number-title">
                  {lpInfo.title}
                </h4>
                <p className="profile-number-desc">
                  {lpInfo.desc}
                </p>
              </div>
            ) : (
              <div className="profile-notice-box">
                <p className="profile-notice-text">
                  💡 Hãy cập nhật Ngày sinh trong hồ sơ cá nhân để khám phá Số chủ đạo của bạn!
                </p>
              </div>
            )}

            {/* Energy meter */}
            <div className="destiny-meter">
              <div className="meter-header">
                <span className="meter-label">Mức năng lượng ngày</span>
                <span className="meter-val">85%</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: "85%" }}></div>
              </div>
            </div>
          </div>

          {/* Quick Tips card */}
          <div className="dashboard-tips-card">
            <h4 className="dashboard-tips-title">
              <span>💡</span> Hướng dẫn nhanh
            </h4>
            <p className="dashboard-tips-desc">
              Double-click vào ô giờ trên lịch để lên kế hoạch. Bấm vào bất kỳ sự kiện nào có sẵn và nhấn nút <b>🔮 Lời khuyên</b> để AI phân tích Tử vi xem ngày giờ đó có thuận bản mệnh của bạn không nhé!
            </p>
          </div>
        </aside>

        {/* 🔹 RIGHT COLUMN: DASHBOARD CONTENT */}
        <div className="dashboard-content">
          {/* Welcome Banner */}
          <div className="welcome-banner">
            <div className="welcome-banner-content">
              <span className="welcome-banner-tag">
                Tinh tú chỉ đường
              </span>
              <h2 className="welcome-banner-title">
                Xin chào, {formatUserName(user)}!
              </h2>
              <p className="welcome-banner-desc">
                Hôm nay là một ngày thích hợp để lập kế hoạch. Chỉ số năng lượng của bạn đạt mức tốt. Hãy kiểm tra Tử vi hôm nay của bạn trước khi lên kế hoạch.
              </p>
            </div>
            <div className="welcome-banner-bg-icon">
              🌌
            </div>
          </div>

          {/* Quick Feature Grid */}
          <div>
            <h3 className="dashboard-section-title">
              Tính năng nhanh
            </h3>
            <div className="dashboard-features-grid">
              {/* Card 1: Calendar */}
              <Card
                title="Lịch cá nhân"
                subtitle="Xem và lên kế hoạch ngày giờ lành"
                icon={<Calendar className="text-indigo-600" />}
                actions={
                  <Button onClick={() => router.push("/calendar")} size="sm" variant="outline" className="feature-card-btn">
                    Mở lịch <ChevronRight size={14} />
                  </Button>
                }
              >
                <p className="text-xs text-slate-500 m-0 leading-relaxed font-medium">
                  Quản lý cuộc họp, sự kiện công việc và nhận lời khuyên tử vi cho từng khung giờ sự kiện.
                </p>
              </Card>

              {/* Card 2: AI Advisor */}
              <Card
                title="Trợ lý AI"
                subtitle="Hỏi đáp tinh sao tử vi bản mệnh"
                icon={<Sparkles className="text-orange-500" />}
                actions={
                  <Button onClick={() => router.push("/ai-assistant")} size="sm" variant="outline" className="feature-card-btn">
                    Trò chuyện <ChevronRight size={14} />
                  </Button>
                }
              >
                <p className="text-xs text-slate-500 m-0 leading-relaxed font-medium">
                  Hỏi trợ lý ảo LifeSync AI về mức độ hòa hợp năng lượng hoặc tìm giờ lành tháng tốt.
                </p>
              </Card>

              {/* Card 3: Destiny Matrix */}
              <Card
                title="Bản mệnh học"
                subtitle="Khám phá ma trận định mệnh cá nhân"
                icon={<Compass className="text-emerald-500" />}
                actions={
                  <Button onClick={() => router.push("/destiny")} size="sm" variant="outline" className="feature-card-btn">
                    Xem bản đồ <ChevronRight size={14} />
                  </Button>
                }
              >
                <p className="text-xs text-slate-500 m-0 leading-relaxed font-medium">
                  Giải mã ý nghĩa con số chủ đạo, cung hoàng đạo và biểu đồ năng lượng luân xa của bạn.
                </p>
              </Card>

              {/* Card 4: Friends */}
              <Card
                title="Mạng bạn bè"
                subtitle="Xem lịch bận/rảnh của nhau"
                icon={<Users className="text-blue-500" />}
                actions={
                  <Button onClick={() => router.push("/friends")} size="sm" variant="outline" className="feature-card-btn">
                    Kết nối <ChevronRight size={14} />
                  </Button>
                }
              >
                <p className="text-xs text-slate-500 m-0 leading-relaxed font-medium">
                  Kết nối bạn bè, phân quyền chia sẻ lịch bận rảnh để dễ dàng lên lịch hẹn nhóm chung.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}