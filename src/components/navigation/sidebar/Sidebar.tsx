"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { formatUserName } from "@/lib/name-utils";
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Compass,
  Users,
  CreditCard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  CalendarCheck
} from "lucide-react";
import "./sidebar.css";

interface MenuItem {
  title: string;
  icon: React.ComponentType<any>;
  path: string;
}

export default function Sidebar() {
  const { user, logoutUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems: MenuItem[] = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/" },
    { title: "Lịch cá nhân", icon: Calendar, path: "/calendar" },
    { title: "Trợ lý AI", icon: Sparkles, path: "/ai-assistant" },
    { title: "Bản mệnh học", icon: Compass, path: "/destiny" },
    { title: "Bạn bè", icon: Users, path: "/friends" },
    { title: "Hẹn lịch nhóm", icon: CalendarCheck, path: "/friends/group-scheduling" },
    { title: "Nâng cấp Premium", icon: CreditCard, path: "/subscription" }
  ];

  if (user?.Role === "admin") {
    menuItems.push({ title: "Cổng Admin", icon: Shield, path: "/admin" });
  }

  const handleLogout = async () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      await logoutUser();
      router.push("/sign_in");
    }
  };

  return (
    <aside className={`sidebar-aside ${isCollapsed ? "collapsed" : ""}`}>
      {/* Collapse Toggle Button */}
      <button onClick={() => setIsCollapsed(!isCollapsed)} className="sidebar-collapse-btn">
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header Logo */}
      <div className="sidebar-header">
        <span className="sidebar-logo-emoji">📅</span>
        {!isCollapsed && <h2 className="sidebar-logo-text">LifeSync AI</h2>}
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`sidebar-nav-btn ${isActive ? "active" : "inactive"}`}
            >
              <Icon size={18} className={isActive ? "text-indigo-600" : "text-slate-400"} />
              {!isCollapsed && <span>{item.title}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile Details */}
      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-profile-box">
            <div className="sidebar-avatar">
              {user.FName ? user.FName.charAt(0).toUpperCase() : "U"}
            </div>
            {!isCollapsed && (
              <div className="sidebar-profile-info">
                <p className="sidebar-profile-name">{formatUserName(user)}</p>
                <p className="sidebar-profile-email">{user.Email}</p>
              </div>
            )}
          </div>

          <button onClick={handleLogout} className="sidebar-logout-btn">
            <LogOut size={18} className="text-red-400" />
            {!isCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      )}
    </aside>
  );
}
