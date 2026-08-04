"use client";

import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { toast } from "react-toastify";
import { formatUserName } from "@/lib/name-utils";
import { ClipLoader } from "react-spinners";
import { useRouter } from "next/navigation";
import "./calendar-view.css";

interface EventItem {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  color?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

function parseInlineFormatting(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} className="font-extrabold text-amber-950">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={idx} className="italic text-orange-950 font-semibold">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export default function CalendarView({ user }: { user: any }) {
  const router = useRouter();
  // Danh sách sự kiện
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Tải danh sách sự kiện từ API
  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await fetch("/api/event");
      const data = await response.json();
      if (response.ok && data.success) {
        setEvents(data.events);
      } else {
        console.error("Failed to fetch events:", data.error);
        toast.error("Không thể tải danh sách sự kiện.");
      }
    } catch (error) {
      console.error("Fetch events error:", error);
      toast.error("Đã xảy ra lỗi khi kết nối dữ liệu lịch.");
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  // Các State điều khiển Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  
  // State Form nhập liệu
  const [eventForm, setEventForm] = useState<EventItem>({
    id: "",
    title: "",
    start: "",
    end: "",
    location: "",
    description: "",
    color: "#6366f1",
    attachmentUrl: "",
    attachmentName: ""
  });

  // State lời khuyên AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState("");

  // Định dạng chuỗi ngày giờ phù hợp với input datetime-local (YYYY-MM-DDTHH:MM)
  const formatForDateTimeInput = (str: string) => {
    if (!str) return "";
    if (!str.includes("T")) {
      return `${str}T12:00`;
    }
    return str.slice(0, 16);
  };

  // Kích hoạt khi click vào một ô trống (tạo sự kiện mới)
  const handleDateSelect = (selectInfo: any) => {
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // Xóa vùng chọn bóng ma trên lịch

    const startFormatted = formatForDateTimeInput(selectInfo.startStr);
    const endFormatted = formatForDateTimeInput(selectInfo.endStr);

    const userDefaultLocation = (user as any)?.Address || (user as any)?.address || (user as any)?.location || "";

    setEventForm({
      id: "",
      title: "",
      start: startFormatted,
      end: endFormatted,
      location: userDefaultLocation,
      description: "",
      color: "#6366f1",
      attachmentUrl: "",
      attachmentName: ""
    });
    setModalMode("create");
    setIsModalOpen(true);

    // Nếu chưa có vị trí mặc định trong hồ sơ -> Tự động chạy GPS định vị
    if (!userDefaultLocation) {
      setTimeout(() => {
        handleGetMyLocation();
      }, 300);
    }
  };

  // Kích hoạt khi click vào một sự kiện có sẵn (hiển thị chi tiết)
  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event;
    const mappedEvent: EventItem = {
      id: event.id,
      title: event.title,
      start: event.startStr || event.start?.toISOString() || "",
      end: event.endStr || event.end?.toISOString() || event.startStr || "",
      location: event.extendedProps.location || "",
      description: event.extendedProps.description || "",
      color: event.extendedProps.color || event.backgroundColor || "#6366f1",
      attachmentUrl: event.extendedProps.attachmentUrl || "",
      attachmentName: event.extendedProps.attachmentName || ""
    };

    setSelectedEvent(mappedEvent);
    setIsDetailOpen(true);
    setAiAdvice("");
  };

  // Xử lý lưu sự kiện (Create hoặc Edit)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (modalMode === "create") {
        const response = await fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: eventForm.title,
            start: eventForm.start,
            end: eventForm.end,
            location: eventForm.location,
            description: eventForm.description,
            color: eventForm.color,
            attachmentUrl: eventForm.attachmentUrl,
            attachmentName: eventForm.attachmentName
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setEvents([...events, data.event]);
          toast.success("Tạo sự kiện thành công!");
        } else {
          toast.error(`Lỗi: ${data.error || "Không thể tạo sự kiện"}`);
        }
      } else {
        const response = await fetch("/api/event", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: eventForm.id,
            title: eventForm.title,
            start: eventForm.start,
            end: eventForm.end,
            location: eventForm.location,
            description: eventForm.description,
            color: eventForm.color,
            attachmentUrl: eventForm.attachmentUrl,
            attachmentName: eventForm.attachmentName
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setEvents(events.map(ev => ev.id === eventForm.id ? {
            ...ev,
            title: eventForm.title,
            start: eventForm.start,
            end: eventForm.end,
            location: eventForm.location,
            description: eventForm.description,
            color: eventForm.color,
            attachmentUrl: eventForm.attachmentUrl,
            attachmentName: eventForm.attachmentName
          } : ev));
          toast.success("Cập nhật sự kiện thành công!");
        } else {
          toast.error(`Lỗi: ${data.error || "Không thể cập nhật sự kiện"}`);
        }
      }
    } catch (err) {
      console.error("Save event error:", err);
      toast.error("Có lỗi xảy ra khi lưu sự kiện.");
    } finally {
      setIsModalOpen(false);
    }
  };

  // Kích hoạt chế độ sửa từ màn hình chi tiết
  const handleEditFromDetails = () => {
    if (!selectedEvent) return;
    setEventForm({
      id: selectedEvent.id,
      title: selectedEvent.title,
      start: formatForDateTimeInput(selectedEvent.start),
      end: formatForDateTimeInput(selectedEvent.end),
      location: selectedEvent.location || "",
      description: selectedEvent.description || "",
      color: selectedEvent.color || "#6366f1",
      attachmentUrl: selectedEvent.attachmentUrl || "",
      attachmentName: selectedEvent.attachmentName || ""
    });
    setModalMode("edit");
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  // Xóa sự kiện
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (confirm(`Bạn có chắc chắn muốn xóa sự kiện "${selectedEvent.title}" không?`)) {
      try {
        const response = await fetch(`/api/event?id=${encodeURIComponent(selectedEvent.id)}`, {
          method: "DELETE"
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setEvents(events.filter(ev => ev.id !== selectedEvent.id));
          toast.success("Xóa sự kiện thành công!");
          setIsDetailOpen(false);
          setAiAdvice("");
        } else {
          toast.error(`Lỗi: ${data.error || "Không thể xóa sự kiện"}`);
        }
      } catch (err) {
        console.error("Delete event error:", err);
        toast.error("Có lỗi xảy ra khi xóa sự kiện.");
      }
    }
  };

  // Cập nhật sự kiện khi kéo thả hoặc co giãn
  const handleEventDropOrResize = async (changeInfo: any) => {
    const event = changeInfo.event;
    try {
      const response = await fetch("/api/event", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event.id,
          title: event.title,
          start: event.startStr || event.start?.toISOString() || "",
          end: event.endStr || event.end?.toISOString() || event.startStr || "",
          location: event.extendedProps.location || "",
          description: event.extendedProps.description || "",
          color: event.extendedProps.color || event.backgroundColor || "#6366f1"
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setEvents(events.map(ev => ev.id === event.id ? {
          ...ev,
          start: event.startStr || event.start?.toISOString() || "",
          end: event.endStr || event.end?.toISOString() || event.startStr || ""
        } : ev));
        toast.success("Đã cập nhật thời gian sự kiện!");
      } else {
        toast.error(`Không thể lưu thay đổi: ${data.error || "Lỗi không xác định"}`);
        changeInfo.revert();
      }
    } catch (err) {
      console.error("Event update on drag/resize error:", err);
      toast.error("Có lỗi xảy ra khi cập nhật thời gian sự kiện.");
      changeInfo.revert();
    }
  };

  const handleGetMyLocation = () => {
    const userDefaultLocation = (user as any)?.Address || (user as any)?.address || (user as any)?.location || "";

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (userDefaultLocation) {
        setEventForm(prev => ({ ...prev, location: userDefaultLocation }));
        toast.success(`Đã tự động điền vị trí mặc định từ hồ sơ: ${userDefaultLocation}`);
        return;
      }
      toast.warning("Trình duyệt của bạn không hỗ trợ lấy vị trí GPS");
      return;
    }

    toast.info("Đang định vị GPS...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await res.json();
          const placeName = data.display_name?.split(",").slice(0, 3).join(",") || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setEventForm(prev => ({ ...prev, location: placeName }));
          toast.success("Đã định vị thành công địa điểm gần bạn!");
        } catch (err) {
          if (userDefaultLocation) {
            setEventForm(prev => ({ ...prev, location: userDefaultLocation }));
            toast.success(`Đã sử dụng vị trí mặc định: ${userDefaultLocation}`);
          } else {
            setEventForm(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
            toast.success("Đã lấy tọa độ GPS của bạn!");
          }
        }
      },
      (err) => {
        if (userDefaultLocation) {
          setEventForm(prev => ({ ...prev, location: userDefaultLocation }));
          toast.success(`Đã sử dụng vị trí mặc định từ hồ sơ: ${userDefaultLocation}`);
        } else {
          toast.error("Không thể lấy vị trí GPS. Vui lòng cấp quyền vị trí trên trình duyệt.");
        }
      }
    );
  };

  const handleOpenAttachment = async () => {
    if (!selectedEvent?.attachmentUrl) return;
    try {
      const res = await fetch(`/api/upload/presign?url=${encodeURIComponent(selectedEvent.attachmentUrl)}`);
      const data = await res.json();
      const openUrl = data.downloadUrl || selectedEvent.attachmentUrl;
      window.open(openUrl, "_blank");
    } catch (err) {
      window.open(selectedEvent.attachmentUrl, "_blank");
    }
  };

  // Share Event Friend Modal States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [sendingShareInvite, setSendingShareInvite] = useState(false);

  const handleOpenShareModal = async () => {
    if (!selectedEvent) return;
    setIsShareModalOpen(true);
    setLoadingFriends(true);
    setSelectedFriendIds([]);
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      if (res.ok && data.success) {
        setFriendsList(data.friends || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải danh sách bạn bè");
    } finally {
      setLoadingFriends(false);
    }
  };

  const toggleSelectFriend = (friendId: number) => {
    setSelectedFriendIds(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSendShareInvite = async () => {
    if (!selectedEvent || selectedFriendIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 người bạn để rủ đi chung!");
      return;
    }

    setSendingShareInvite(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_event_invite",
          friendIds: selectedFriendIds,
          eventData: {
            title: selectedEvent.title,
            start: selectedEvent.start,
            end: selectedEvent.end,
            location: selectedEvent.location,
            description: selectedEvent.description,
            color: selectedEvent.color
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Đã gửi lời mời đi chung đến ${selectedFriendIds.length} người bạn!`);
        setIsShareModalOpen(false);
        setSelectedFriendIds([]);
      } else {
        toast.error(data.error || "Gửi lời mời thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi máy chủ khi gửi lời mời");
    } finally {
      setSendingShareInvite(false);
    }
  };

  // Gọi API lấy lời khuyên từ Bedrock AI / Gemini
  const handleGetAiAdvice = async () => {
    if (!selectedEvent) return;
    setAiLoading(true);
    setAiAdvice("");

    try {
      const response = await fetch("/api/analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formatUserName(user, "Người dùng"),
          dob: user?.Date_of_birth ? user.Date_of_birth.substring(0, 10) : "2004-07-06",
          eventTitle: selectedEvent.title,
          eventDesc: selectedEvent.description || "",
          eventTime: selectedEvent.start.split("T")[1]?.slice(0, 5) || "00:00"
        })
      });
      const data = await response.json();
      if (data.success) {
        setAiAdvice(data.advice);
      } else {
        setAiAdvice(`Lỗi phân tích AI: ${data.error}`);
      }
    } catch (err: any) {
      console.error(err);
      setAiAdvice("Không thể kết nối đến máy chủ AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const res = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder: "attachments",
        }),
      });

      if (!res.ok) {
        throw new Error("Không lấy được presigned URL");
      }

      const { uploadUrl, publicUrl } = await res.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Không thể upload file lên S3");
      }

      setEventForm(prev => ({
        ...prev,
        attachmentUrl: publicUrl,
        attachmentName: file.name
      }));
      toast.success("Tải tệp đính kèm lên thành công!");
    } catch (err: any) {
      console.error("Attachment upload error:", err);
      toast.error(err.message || "Lỗi tải tệp đính kèm");
    } finally {
      setUploadingAttachment(false);
    }
  };

  return (
    <div className="calendar-container">
      {loadingEvents && (
        <div className="calendar-sync-indicator">
          <div className="calendar-sync-spinner animate-spin"></div>
          Đang đồng bộ...
        </div>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay"
        }}
        initialView="timeGridWeek" // Dạng tuần
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        events={events} // Nạp danh sách sự kiện
        select={handleDateSelect} // Bấm ô trống
        eventClick={handleEventClick} // Bấm sự kiện
        eventDrop={handleEventDropOrResize} // Kéo thả sự kiện
        eventResize={handleEventDropOrResize} // Thay đổi kích thước sự kiện
        eventColor="#6366f1"
        eventDidMount={(info) => {
          // Gán màu nền tuỳ chỉnh cho từng sự kiện dựa trên dữ liệu mẫu
          const color = info.event.extendedProps.color;
          if (color) {
            info.el.style.backgroundColor = color;
            info.el.style.borderColor = color;
          }
        }}
      />

      {/* ========================================================================= */}
      {/* 📝 MODAL: TẠO MỚI / CHỈNH SỬA SỰ KIỆN */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>
                {modalMode === "create" ? "Tạo sự kiện mới" : "Chỉnh sửa sự kiện"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close-btn">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="modal-body">
              <div className="modal-form-group">
                <label>Tiêu đề *</label>
                <input
                  type="text"
                  required
                  placeholder="Thêm tiêu đề..."
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="modal-input"
                />
              </div>

              <div className="modal-grid-2">
                <div className="modal-form-group">
                  <label>Bắt đầu *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.start}
                    onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })}
                    className="modal-input"
                  />
                </div>
                <div className="modal-form-group">
                  <label>Kết thúc *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.end}
                    onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })}
                    className="modal-input"
                  />
                </div>
              </div>

              <div className="modal-form-group">
                <label>Địa điểm</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Thêm vị trí/địa điểm..."
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    className="modal-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleGetMyLocation}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-300 transition-all flex items-center gap-1 whitespace-nowrap"
                    title="Định vị GPS địa điểm gần tôi"
                  >
                    📍 Vị trí gần tôi
                  </button>
                </div>
              </div>

              <div className="modal-form-group">
                <label>Mô tả</label>
                <textarea
                  placeholder="Thêm ghi chú/chi tiết sự kiện..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="modal-textarea"
                />
              </div>

              <div className="modal-form-group">
                <label>Tệp đính kèm (Lưu trữ S3)</label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="file"
                    onChange={handleAttachmentUpload}
                    disabled={uploadingAttachment}
                    className="modal-input"
                    style={{ flex: 1 }}
                  />
                  {uploadingAttachment && <ClipLoader color="#F47521" size={16} />}
                </div>
                {eventForm.attachmentName && (
                  <p style={{ fontSize: "12px", color: "#10b981", margin: "4px 0 0 0" }}>
                    ✓ Đã đính kèm: <b>{eventForm.attachmentName}</b>
                  </p>
                )}
              </div>

              <div className="modal-form-group">
                <label>Màu sắc nhãn sự kiện</label>
                <div className="color-picker-group">
                  {["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEventForm({ ...eventForm, color })}
                      style={{ backgroundColor: color }}
                      className={`color-dot ${eventForm.color === color ? 'active' : ''}`}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="modal-btn modal-btn-cancel"
                >
                  Hủy
                </button>
                <button type="submit" className="modal-btn modal-btn-save">
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔍 MODAL: CHI TIẾT SỰ KIỆN & PHÂN TÍCH TỬ VI AI */}
      {/* ========================================================================= */}
      {isDetailOpen && selectedEvent && (
        <div className="modal-overlay">
          <div className="modal-card max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div 
              style={{ borderTop: `6px solid ${selectedEvent.color || "#6366f1"}` }}
              className="detail-header-container shrink-0"
            >
              <div>
                <h2 style={{ margin: "0 0 6px 0", fontSize: "20px", fontWeight: "800", color: "#1e293b", lineHeight: "1.2" }}>
                  {selectedEvent.title}
                </h2>
                <p style={{ margin: 0, display: "inline-block", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "#e5651a", backgroundColor: "#fff8f5", border: "1px solid #ffe8de", padding: "2px 8px", borderRadius: "99px" }}>
                  🔮 Lịch Năng Lượng AI
                </p>
              </div>
              <div className="detail-actions-right">
                <button
                  onClick={handleOpenShareModal}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center gap-1"
                  title="Rủ bạn bè đi chung sự kiện này"
                  style={{ marginRight: "4px" }}
                >
                  👥 Rủ bạn đi chung
                </button>
                <button 
                  onClick={handleEditFromDetails}
                  className="detail-icon-btn"
                  title="Sửa sự kiện"
                >
                  <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button 
                  onClick={handleDeleteEvent}
                  className="detail-icon-btn delete"
                  title="Xóa sự kiện"
                >
                  <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    setIsDetailOpen(false);
                    setAiAdvice("");
                  }} 
                  className="modal-close-btn"
                  style={{ marginLeft: "8px" }}
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="modal-body overflow-y-auto flex-1 p-6 space-y-4" style={{ paddingTop: 0, maxHeight: "calc(90vh - 90px)" }}>
              {/* Thời gian */}
              <div className="detail-body-row">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>
                  {new Date(selectedEvent.start).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}
                  {" - "}
                  {new Date(selectedEvent.end || selectedEvent.start).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>

              {/* Địa điểm & Tự động gắn Google Maps Link */}
              {selectedEvent.location && (
                <div className="detail-body-row">
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                  >
                    {selectedEvent.location} 🗺️ (Mở Google Maps)
                  </a>
                </div>
              )}

              {/* Mô tả */}
              <div className="detail-desc-box">
                <p className="detail-desc-title">Mô tả sự kiện</p>
                <p className="detail-desc-text">
                  {selectedEvent.description || "Không có mô tả chi tiết."}
                </p>
              </div>

              {/* Tệp đính kèm (Fix lỗi Presigned URL 403) */}
              {selectedEvent.attachmentUrl && (
                <div className="detail-desc-box" style={{ marginTop: "12px", borderLeft: "4px solid #10b981" }}>
                  <p className="detail-desc-title" style={{ color: "#10b981" }}>📎 Tệp đính kèm (AWS S3)</p>
                  <button 
                    onClick={handleOpenAttachment}
                    style={{ fontSize: "13px", color: "#6366f1", fontWeight: "700", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "4px" }}
                  >
                    📥 {selectedEvent.attachmentName || "Xem & Tải tệp đính kèm"}
                  </button>
                </div>
              )}

              {/* Khu vực Gọi AI Tử Vi */}
              <div className="ai-advice-section">
                {!aiAdvice && !aiLoading ? (
                  <button onClick={handleGetAiAdvice} className="ai-btn-trigger">
                    <span>🔮</span> Nhận lời khuyên bản mệnh từ AI
                  </button>
                ) : null}

                {aiLoading && (
                  <div className="ai-loading-box">
                    <div className="ai-spinner-dot"></div>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#e5651a" }}>Thầy AI đang xem quẻ năng lượng ngày giờ...</p>
                  </div>
                )}

                {aiAdvice && (
                  <div className="ai-advice-box">
                    <p className="ai-advice-title">
                      <span>🔮</span> Lời khuyên Bản mệnh từ AI
                    </p>
                    <div className="ai-advice-content text-slate-800 text-xs sm:text-sm leading-relaxed space-y-2 mt-2 p-4 bg-gradient-to-b from-amber-50/90 to-orange-50/60 rounded-2xl border border-amber-200/90 shadow-inner">
                      {aiAdvice.split(/\n+/).map((line, idx) => {
                        const trimmed = line.trim();
                        if (!trimmed) return null;
                        if (trimmed === "---" || trimmed === "***") {
                          return <hr key={idx} className="border-t border-amber-200/90 my-2.5" />;
                        }
                        if (trimmed.startsWith("### ")) {
                          return (
                            <h3 key={idx} className="text-sm font-extrabold text-amber-950 border-b border-amber-200/80 pb-1 mt-3 mb-1">
                              {parseInlineFormatting(trimmed.replace(/^###\s+/, ""))}
                            </h3>
                          );
                        }
                        if (trimmed.startsWith("## ")) {
                          return (
                            <h2 key={idx} className="text-base font-black text-amber-950 mt-4 mb-1">
                              {parseInlineFormatting(trimmed.replace(/^##\s+/, ""))}
                            </h2>
                          );
                        }
                        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                          return (
                            <li key={idx} className="list-disc list-inside text-amber-950 font-medium my-1">
                              {parseInlineFormatting(trimmed.replace(/^[-*]\s+/, ""))}
                            </li>
                          );
                        }
                        return (
                          <p key={idx} className="m-0 text-slate-800">
                            {parseInlineFormatting(trimmed)}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 👥 MODAL: CHỌN BẠN BÈ ĐỂ RỦ ĐI CHUNG */}
      {/* ========================================================================= */}
      {isShareModalOpen && selectedEvent && (
        <div className="modal-overlay">
          <div className="modal-card max-w-md w-full p-6 bg-white rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 m-0">
                  👥 Rủ bạn bè đi chung
                </h3>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Sự kiện: <span className="font-bold text-indigo-600">"{selectedEvent.title}"</span>
                </p>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-black text-lg"
              >
                &times;
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 py-1">
              {loadingFriends ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Đang tải danh sách bạn bè...
                </div>
              ) : friendsList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  Bạn chưa có bạn bè nào trong danh sách. Hãy kết bạn ở mục <b>Bạn bè</b> trước nhé!
                </div>
              ) : (
                friendsList.map((friend: any) => {
                  const friendId = friend.id || friend.User_ID;
                  const friendName = formatUserName(friend, friend.email || "Bạn bè");
                  const isSelected = selectedFriendIds.includes(friendId);
                  return (
                    <div
                      key={friendId}
                      onClick={() => toggleSelectFriend(friendId)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50/70"
                          : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                          {friendName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-800 m-0">{friendName}</p>
                          <p className="text-[10px] text-slate-400 m-0">{friend.email}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleSendShareInvite}
                disabled={sendingShareInvite || selectedFriendIds.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow transition-all disabled:opacity-50 flex items-center gap-1"
              >
                {sendingShareInvite ? "Đang gửi..." : `✉️ Gửi lời mời (${selectedFriendIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
