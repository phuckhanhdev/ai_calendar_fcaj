"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import { formatUserName } from "@/lib/name-utils";
import { useAuth } from "@/context/AuthContext";
import "./user_infor.css";

const FALLBACK_AVATAR = "/user_icon.png";

export default function UserInformationPage() {
  const { user, loading, logoutUser, refreshUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dob: "",
  });

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/sign_in");
      } else {
        setFormData({
          firstName: user.FName || "",
          lastName: user.LName || "",
          phone: user.Phone_Number || "",
          email: user.Email || "",
          dob: user.Date_of_birth ? user.Date_of_birth.substring(0, 10) : "",
        });
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/user/information", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          User_ID: user?.User_ID,
          Phone_Number: formData.phone,
          FName: formData.firstName,
          LName: formData.lastName,
          Date_of_birth: formData.dob || null,
        }),
      });

      if (response.ok) {
        toast.success("Cập nhật thông tin thành công!");
        await refreshUser();
      } else {
        toast.error("Không thể cập nhật thông tin");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      router.push("/sign_in");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const avatarSrc = avatarError ? FALLBACK_AVATAR : (user?.Shop_image || FALLBACK_AVATAR);
  const fullName = formatUserName({ FName: formData.firstName, LName: formData.lastName }, "Chưa cập nhật");

  if (loading) {
    return (
      <div className="loading-container">
        <ClipLoader color="#F47521" size={50} />
        <p className="loading-text">Đang tải...</p>
      </div>
    );
  }

  return (
    <>
      <div className="user-page">
        <div className="user-header">
          <Link href="/" style={{ textDecoration: "none", color: "#666", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Quay lại Lịch Năng Lượng
          </Link>
          <h1 className="user-title">Tài khoản của tôi</h1>
        </div>

        <div className="user-grid">
          {/* Sidebar */}
          <aside className="user-sidebar">
            <div className="user-avatar-section">
              <div className="user-avatar">
                {/* Fallback image if user_icon doesn't exist */}
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1", fontSize: "36px", fontWeight: "bold" }}>
                  {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : "U"}
                </div>
              </div>
              <div>
                <p className="user-avatar-name">{fullName}</p>
                <p className="user-avatar-email">{formData.email}</p>
              </div>
            </div>

            <nav className="user-menu">
              <button className="user-menu-item active">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Thông tin cá nhân</span>
              </button>

              <button className="user-menu-item" onClick={handleSignOut}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Đăng xuất</span>
              </button>
            </nav>
          </aside>

          {/* Content */}
          <div className="user-content">
            <h2 className="user-content-title">Thông tin cá nhân</h2>

            <form onSubmit={handleSubmit}>
              <div className="user-form-grid">
                <div className="form-group">
                  <label className="form-label">Họ</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Nhập họ"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tên</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Nhập tên"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ngày sinh</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>

                <div className="form-group user-form-full">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    disabled
                    style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
                  />
                </div>
              </div>

              <div className="user-form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    if (user) {
                      setFormData({
                        firstName: user.FName || "",
                        lastName: user.LName || "",
                        phone: user.Phone_Number || "",
                        email: user.Email || "",
                        dob: user.Date_of_birth ? user.Date_of_birth.substring(0, 10) : "",
                      });
                    }
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
