"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { formatUserName } from "@/lib/name-utils";
import { Bell, Search, User, Zap } from "lucide-react";
import NotificationDropdown from "@/components/navigation/notification_dropdown/NotificationDropdown";
import { toast } from "react-toastify";
import "./top-navbar.css";

export default function TopNavbar() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [incomingRequests, setIncomingRequests] = useState([]);
  const [meetingInvitations, setMeetingInvitations] = useState([]);
  const [historicalNotifications, setHistoricalNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const fetchRequests = async () => {
    try {
      const [friendsRes, schedRes, notifRes] = await Promise.all([
        fetch("/api/friends"),
        fetch("/api/scheduling/invitations"),
        fetch("/api/notifications?limit=20")
      ]);
      const friendsData = await friendsRes.json();
      const schedData = await schedRes.json();
      const notifData = await notifRes.json();
      
      if (friendsData.success) {
        setIncomingRequests(friendsData.incomingRequests || []);
      }
      if (schedData.success) {
        setMeetingInvitations(schedData.invitations || []);
      }
      if (notifData.success) {
        setHistoricalNotifications(notifData.notifications || []);
      }
    } catch (err) {
      // Gracefully log network warnings during page reloads or server restarts
      console.warn("Network notice when loading notifications:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
      // Poll every 30 seconds for new updates
      const interval = setInterval(fetchRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleAcceptRequest = async (id) => {
    try {
      const res = await fetch("/api/friends/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", friendId: id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã đồng ý kết bạn!");
        fetchRequests();
      } else {
        toast.error(data.error || "Thực hiện thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      const res = await fetch("/api/friends/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", friendId: id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã từ chối yêu cầu kết bạn");
        fetchRequests();
      } else {
        toast.error(data.error || "Thực hiện thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read_all" })
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", notificationId: id })
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tạo tiêu đề trang tương ứng với pathname
  const getPageTitle = (path: string) => {
    switch (path) {
      case "/":
        return { title: "Dashboard", subtitle: "Tổng quan lịch trình và bản mệnh của bạn" };
      case "/calendar":
        return { title: "Lịch cá nhân", subtitle: "Quản lý công việc và xem lời khuyên năng lượng" };
      case "/ai-assistant":
        return { title: "Trợ lý AI", subtitle: "Trò chuyện, hỏi đáp về kế hoạch cá nhân" };
      case "/destiny":
        return { title: "Bản mệnh học", subtitle: "Khám phá cung hoàng đạo và ma trận định mệnh" };
      case "/friends":
        return { title: "Bạn bè", subtitle: "Kết nối bạn bè và phân quyền chia sẻ lịch" };
      case "/subscription":
        return { title: "Nâng cấp Premium", subtitle: "Mở khoá toàn bộ tính năng và phân tích AI không giới hạn" };
      case "/user_information":
        return { title: "Hồ sơ cá nhân", subtitle: "Cập nhật ngày giờ sinh và thông tin tài khoản" };
      default:
        return { title: "LifeSync AI", subtitle: "Lịch số học thông minh tích hợp AWS Bedrock" };
    }
  };

  const pageMeta = getPageTitle(pathname);

  return (
    <header className="top-header">
      {/* Contextual Title */}
      <div>
        <h1 className="top-header-title">{pageMeta.title}</h1>
        <p className="top-header-subtitle">{pageMeta.subtitle}</p>
      </div>

      {/* Right Navbar Controls */}
      <div className="top-header-actions">
        {/* Mock Search Bar */}
        <div className="top-header-search-wrapper">
          <Search size={16} className="top-header-search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm sự kiện, bạn bè..."
            className="top-header-search-input"
          />
        </div>

        {/* Premium Badge for free users */}
        {user?.Subscription_Status !== "premium" ? (
          <button
            onClick={() => router.push("/subscription")}
            className="top-header-premium-btn"
          >
            <Zap size={14} className="fill-amber-600 text-amber-600" />
            Nâng cấp Premium
          </button>
        ) : (
          <span className="top-header-premium-badge">
            <Zap size={12} className="fill-indigo-600 text-indigo-600" />
            Premium
          </span>
        )}

        {/* Notifications Icon */}
        <div className="relative">
          <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="top-header-notif-btn">
            <Bell size={18} />
            {(incomingRequests.length > 0 || meetingInvitations.length > 0 || historicalNotifications.some((n: any) => !n.isRead)) && (
              <span className="top-header-notif-dot"></span>
            )}
          </button>
          
          <NotificationDropdown
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            incomingRequests={incomingRequests}
            meetingInvitations={meetingInvitations}
            historicalNotifications={historicalNotifications}
            onAccept={handleAcceptRequest}
            onReject={handleRejectRequest}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
          />
        </div>

        {/* Profile Details Trigger */}
        <div className="top-header-profile-trigger">
          <button
            onClick={() => router.push("/user_information")}
            className="top-header-profile-btn"
            title="Hồ sơ cá nhân"
          >
            <User size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
