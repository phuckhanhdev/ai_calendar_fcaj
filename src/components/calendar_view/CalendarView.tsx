"use client";

import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { toast } from "react-toastify";
import { formatUserName } from "@/lib/name-utils";
import "./calendar-view.css";

interface EventItem {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  color?: string;
}

export default function CalendarView({ user }: { user: any }) {
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
  
  // State Form nhập liệu
  const [eventForm, setEventForm] = useState<EventItem>({
    id: "",
    title: "",
    start: "",
    end: "",
    location: "",
    description: "",
    color: "#6366f1"
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

    setEventForm({
      id: "",
      title: "",
      start: startFormatted,
      end: endFormatted,
      location: "",
      description: "",
      color: "#6366f1"
    });
    setModalMode("create");
    setIsModalOpen(true);
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
      color: event.extendedProps.color || event.backgroundColor || "#6366f1"
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
            color: eventForm.color
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
            color: eventForm.color
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
            color: eventForm.color
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
      color: selectedEvent.color || "#6366f1"
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
                <input
                  type="text"
                  placeholder="Thêm vị trí/địa điểm..."
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="modal-input"
                />
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
          <div className="modal-card">
            <div 
              style={{ borderTop: `6px solid ${selectedEvent.color || "#6366f1"}` }}
              className="detail-header-container"
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

            <div className="modal-body" style={{ paddingTop: 0 }}>
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

              {/* Địa điểm */}
              {selectedEvent.location && (
                <div className="detail-body-row">
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {/* Mô tả */}
              <div className="detail-desc-box">
                <p className="detail-desc-title">Mô tả sự kiện</p>
                <p className="detail-desc-text">
                  {selectedEvent.description || "Không có mô tả chi tiết."}
                </p>
              </div>

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
                      <span>🔮</span> Lời khuyên của Thầy AI
                    </p>
                    <p className="ai-advice-content">"{aiAdvice}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
