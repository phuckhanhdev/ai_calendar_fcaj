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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dob: "",
    gender: "Male",
    latitude: 10.7769,
    longitude: 106.7009,
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
          gender: user.Gender || "Male",
          latitude: user.Latitude ? parseFloat(user.Latitude) : 10.7769,
          longitude: user.Longitude ? parseFloat(user.Longitude) : 106.7009,
        });
      }
    }
  }, [user, loading, router]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt của bạn không hỗ trợ định vị GPS");
      return;
    }

    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        toast.success(`Đã lấy vị trí GPS thành công: (${lat}, ${lng})`);
        setFetchingLocation(false);
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
        toast.info("Không lấy được vị trí GPS. Đã sử dụng vị trí mặc định (Quận 1, TP.HCM)");
        setFetchingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Avatar cropping modal state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSaveCroppedAvatar = async () => {
    if (!previewImage || !selectedFile) return;

    setUploadingAvatar(true);
    try {
      // Create offscreen canvas for crisp 400x400 circular crop export
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const size = 400;
      canvas.width = size;
      canvas.height = size;

      const img = new window.Image();
      img.src = previewImage;
      await new Promise((res) => { img.onload = res; });

      // Clip canvas to circle
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Calculate source and destination position based on zoom & offset
      const viewSize = 240; // Diameter of crop viewport in modal
      const ratio = size / viewSize;
      
      const drawWidth = img.width * zoom * ratio;
      const drawHeight = img.height * zoom * ratio;
      const drawX = (size / 2) - (drawWidth / 2) + (position.x * ratio);
      const drawY = (size / 2) - (drawHeight / 2) + (position.y * ratio);

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // Convert Canvas to PNG Blob
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png", 0.95)
      );

      if (!blob) throw new Error("Không thể cắt ảnh");

      // 1. Get presigned URL
      const res = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: `avatar_${Date.now()}.png`,
          fileType: "image/png",
          folder: "avatars",
        }),
      });

      if (!res.ok) throw new Error("Không lấy được presigned URL");
      const { uploadUrl, publicUrl } = await res.json();

      // 2. PUT cropped blob directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: blob,
      });

      if (!uploadRes.ok) throw new Error("Không thể upload ảnh lên S3");

      // 3. Update in Database
      const updateRes = await fetch("/api/user/information", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          User_ID: user?.User_ID,
          Phone_Number: formData.phone,
          FName: formData.firstName,
          LName: formData.lastName,
          Date_of_birth: formData.dob || null,
          Avatar_Url: publicUrl,
        }),
      });

      if (updateRes.ok) {
        toast.success("Cập nhật ảnh đại diện thành công!");
        setAvatarError(false);
        await refreshUser();
        setIsCropModalOpen(false);
      } else {
        toast.error("Không thể cập nhật ảnh đại diện mới");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(err.message || "Có lỗi xảy ra khi tải ảnh lên");
    } finally {
      setUploadingAvatar(false);
    }
  };

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
          Gender: formData.gender,
          Latitude: formData.latitude,
          Longitude: formData.longitude,
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

  const avatarSrc = user?.Avatar_URL || user?.Avatar_Url || FALLBACK_AVATAR;
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
              <div 
                className="user-avatar" 
                style={{ position: "relative", cursor: "pointer", borderRadius: "50%", overflow: "hidden" }} 
                onClick={() => document.getElementById("avatarInput").click()}
              >
                {uploadingAvatar ? (
                  <div style={{ width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", position: "absolute", zIndex: 2 }}>
                    <ClipLoader color="#ffffff" size={24} />
                  </div>
                ) : (
                  <div style={{ width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", position: "absolute", zIndex: 1, opacity: 0, transition: "opacity 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
                    <span style={{ color: "#fff", fontSize: "12px", fontWeight: "600" }}>Đổi ảnh</span>
                  </div>
                )}
                {(user?.Avatar_URL || user?.Avatar_Url) && !avatarError ? (
                  <img
                    src={user.Avatar_URL || user.Avatar_Url}
                    alt="Avatar"
                    onError={() => setAvatarError(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", backgroundColor: "#F47521", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "36px", fontWeight: "bold" }}>
                    {formData.lastName ? formData.lastName.charAt(0).toUpperCase() : (formData.firstName ? formData.firstName.charAt(0).toUpperCase() : "U")}
                  </div>
                )}
              </div>
              
              <input
                id="avatarInput"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileSelect}
                disabled={uploadingAvatar}
              />
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
                  <label className="form-label">Giới tính</label>
                  <select
                    className="form-input"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                    <option value="Other">Khác</option>
                  </select>
                </div>

                <div className="form-group user-form-full">
                  <label className="form-label">Vị trí mặc định (phục vụ gợi ý địa điểm xem phim & lập lịch)</label>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <input
                      type="text"
                      className="form-input"
                      value={`Tọa độ GPS: (${formData.latitude}, ${formData.longitude})`}
                      disabled
                      style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed", flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={fetchingLocation}
                      style={{
                        padding: "10px 16px",
                        borderRadius: "10px",
                        backgroundColor: "#6366f1",
                        color: "#ffffff",
                        border: "none",
                        fontWeight: "600",
                        fontSize: "13px",
                        cursor: fetchingLocation ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {fetchingLocation ? (
                        <>
                          <ClipLoader color="#ffffff" size={14} />
                          Đang định vị...
                        </>
                      ) : (
                        "📍 Lấy GPS hiện tại"
                      )}
                    </button>
                  </div>
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

      {/* Interactive Avatar Crop & Edit Modal */}
      {isCropModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(8px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "24px",
            padding: "28px",
            width: "100%",
            maxWidth: "420px",
            color: "#fff",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, color: "#f8fafc" }}>
                ✂️ Chỉnh sửa ảnh đại diện
              </h3>
              <button
                onClick={() => setIsCropModalOpen(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "20px" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "16px", textAlign: "center" }}>
              Kéo di chuyển vị trí và dùng thanh trượt để phóng to/thu nhỏ ảnh
            </p>

            {/* Interactive Crop Viewport Area */}
            <div
              style={{
                width: "240px",
                height: "240px",
                margin: "0 auto 20px auto",
                borderRadius: "50%",
                border: "3px solid #6366f1",
                overflow: "hidden",
                position: "relative",
                cursor: isDragging ? "grabbing" : "grab",
                boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.75)",
                backgroundColor: "#0f172a"
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              {previewImage && (
                <img
                  src={previewImage}
                  alt="Crop preview"
                  draggable={false}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
                    transformOrigin: "center center",
                    maxHeight: "none",
                    maxWidth: "none",
                    height: "100%",
                    pointerEvents: "none",
                    userSelect: "none"
                  }}
                />
              )}
            </div>

            {/* Zoom Slider Control */}
            <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "16px" }}>🔍-</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: "#6366f1",
                  cursor: "pointer",
                  height: "6px"
                }}
              />
              <span style={{ fontSize: "16px" }}>🔍+</span>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setIsCropModalOpen(false)}
                disabled={uploadingAvatar}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "1px solid #475569",
                  backgroundColor: "transparent",
                  color: "#cbd5e1",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleSaveCroppedAvatar}
                disabled={uploadingAvatar}
                style={{
                  flex: 2,
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: "#6366f1",
                  color: "#ffffff",
                  fontWeight: "600",
                  cursor: uploadingAvatar ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px 0 rgba(99, 102, 241, 0.39)"
                }}
              >
                {uploadingAvatar ? (
                  <>
                    <ClipLoader color="#ffffff" size={16} />
                    Đang lưu lên S3...
                  </>
                ) : (
                  "Cắt & Tải lên S3"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
