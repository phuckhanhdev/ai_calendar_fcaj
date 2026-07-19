"use client";

import React, { useState, useEffect, useRef } from "react";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AppLayout from "@/components/layouts/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Check, Loader2, Calendar, Vote, Users, Info, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import "./vote.css";

interface Meeting {
  id: string;
  title: string;
  duration: number;
  status: string;
  hostId: string;
  hostEmail: string;
  hostName: string;
}

interface Option {
  id: string;
  startTime: string;
  endTime: string;
  score: number;
  label?: string;
}

interface Participant {
  userId: string;
  votedOptionId: string | null;
  status: string;
  email: string;
  name: string;
}

export default function GroupSchedulingVotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = React.use(params);
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(0);

  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [voting, setVoting] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null); // holds optionId being confirmed
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedOptionToConfirm, setSelectedOptionToConfirm] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customLocation, setCustomLocation] = useState("");

  const fetchRequestDetails = async () => {
    try {
      const res = await fetch(`/api/scheduling/request?id=${requestId}`);
      const data = await res.json();
      if (data.success) {
        setMeeting(data.meeting);
        
        // Format option labels
        const formattedOpts = (data.options || []).map((opt: any) => {
          const d = new Date(opt.startTime);
          const weekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
          const dayLabel = weekdays[d.getDay()];
          return {
            ...opt,
            label: `${dayLabel}, ${d.getDate()}/${d.getMonth() + 1}`
          };
        });
        setOptions(formattedOpts);
        setParticipants(data.participants || []);
        setVotes(data.votes || []);
        setLastUpdateTimestamp(Date.now());

        // Find what options the current user voted for
        if (data.votes) {
          const myVotes = data.votes
            .filter((v: any) => v.userId === user?.User_ID)
            .map((v: any) => v.optionId);
          setSelectedOptionIds(myVotes);
        }
      } else {
        toast.error(data.error || "Không thể tải chi tiết phòng bình chọn");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  // Keep ref of lastUpdateTimestamp updated for polling interval
  const lastUpdateRef = useRef(lastUpdateTimestamp);
  useEffect(() => {
    lastUpdateRef.current = lastUpdateTimestamp;
  }, [lastUpdateTimestamp]);

  // Initial Fetch
  useEffect(() => {
    if (user) {
      fetchRequestDetails();
    }
  }, [user, requestId]);

  // Polling Interval
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/scheduling/poll?id=${requestId}&since=${lastUpdateRef.current}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.success && data.changed) {
          setParticipants(data.participants || []);
          setVotes(data.votes || []);
          setLastUpdateTimestamp(data.lastUpdate || Date.now());
          
          if (meeting && data.meetingStatus) {
            setMeeting(prev => prev ? { ...prev, status: data.meetingStatus } : null);
          }
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [user, requestId]);

  const handleVote = async () => {
    if (selectedOptionIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một khung giờ");
      return;
    }
    setVoting(true);
    try {
      const res = await fetch("/api/scheduling/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          optionIds: selectedOptionIds,
          status: "ACCEPTED"
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Bỏ phiếu bình chọn thành công!");
        fetchRequestDetails();
      } else {
        toast.error(data.error || "Bỏ phiếu thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setVoting(false);
    }
  };

  const handleDecline = async () => {
    setVoting(true);
    try {
      const res = await fetch("/api/scheduling/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          optionIds: [],
          status: "DECLINED"
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã báo bận thành công");
        setSelectedOptionIds([]);
        fetchRequestDetails();
      } else {
        toast.error(data.error || "Thực hiện thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setVoting(false);
    }
  };

  const handleOpenFinalizeModal = (optionId: string) => {
    setSelectedOptionToConfirm(optionId);
    setCustomTitle(meeting?.title ? `[Lịch hẹn] ${meeting.title}` : "Lịch hẹn nhóm");
    setCustomDescription("Lịch hẹn nhóm được lên lịch tự động bởi LifeSync AI.");
    setCustomLocation("Phòng họp nhóm LifeSync");
    setShowFinalizeModal(true);
  };

  const handleConfirmMeeting = async () => {
    if (!selectedOptionToConfirm) return;
    setConfirming(selectedOptionToConfirm);
    try {
      const res = await fetch("/api/scheduling/action", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          optionId: selectedOptionToConfirm,
          title: customTitle,
          description: customDescription,
          location: customLocation
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã chốt giờ họp và đồng bộ lịch thành công!");
        setShowFinalizeModal(false);
        fetchRequestDetails();
      } else {
        toast.error(data.error || "Chốt lịch thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setConfirming(null);
    }
  };

  const isHost = meeting?.hostId === user?.User_ID;
  const isConfirmed = meeting?.status === "CONFIRMED";

  return (
    <AppLayout>
      <PageHeader
        title="Phòng Bình chọn Lịch hẹn"
        description="Bỏ phiếu cho các khung giờ rảnh tốt nhất của bạn hoặc chốt lịch chính thức cho nhóm."
      />

      {loading ? (
        <div className="vote-loading-wrapper">
          <Loader2 className="vote-loading-spinner animate-spin" />
        </div>
      ) : !meeting ? (
        <div className="vote-empty-box">
          <p className="vote-empty-text">Không tìm thấy thông tin cuộc họp</p>
        </div>
      ) : (
        <div className="vote-grid-layout">
          {/* Options Panel */}
          <div className="vote-left-col">
            <Card title="Khung giờ đề xuất" icon={<Vote className="text-indigo-500" />}>
              <div className="space-y-6">
                {/* Meeting Context Header */}
                <div className="vote-summary-card">
                  <div className="vote-summary-row">
                    <div className="vote-summary-info">
                      <h4 className="vote-summary-title">{meeting.title}</h4>
                      <p className="vote-summary-host">Được tạo bởi: <span className="vote-host-highlight">{meeting.hostName}</span> ({meeting.hostEmail})</p>
                      <p className="vote-summary-duration">Thời lượng: {meeting.duration} phút</p>
                    </div>
                    <div className="vote-summary-actions">
                      <span className={`vote-status-badge ${
                        meeting.status === "CONFIRMED" ? "confirmed" : "pending"
                      }`}>
                        {meeting.status === "CONFIRMED" ? "Đã chốt lịch" : "Đang bình chọn"}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success("Đã sao chép liên kết bình chọn!");
                        }}
                        className="vote-copy-btn"
                      >
                        Sao chép liên kết
                      </button>
                    </div>
                  </div>
                </div>

                {/* Options List */}
                <div className="vote-options-list">
                  {options.map((opt) => {
                    const startHour = opt.startTime.substring(11, 16);
                    const endHour = opt.endTime.substring(11, 16);
                    const isSelected = selectedOptionIds.includes(opt.id);

                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          if (!isConfirmed) {
                            setSelectedOptionIds((prev) =>
                              prev.includes(opt.id) ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]
                            );
                          }
                        }}
                        className={`vote-option-card ${
                          isConfirmed && isSelected
                            ? "confirmed"
                            : isSelected
                            ? "checked"
                            : ""
                        }`}
                        style={!isConfirmed ? { cursor: "pointer" } : { cursor: "default" }}
                      >
                        <div className="vote-option-row">
                          {!isConfirmed && (
                            <span className={`vote-option-check ${isSelected ? "checked" : ""}`}>
                              {isSelected && <Check size={12} />}
                            </span>
                          )}
                          <div>
                            <p className="vote-option-title">{opt.label}</p>
                            <p className="vote-option-time">{startHour} - {endHour}</p>
                          </div>
                        </div>

                        <div className="vote-option-right">
                          {/* Score badge */}
                          <span className="vote-score-badge">
                            {opt.score} phiếu rảnh
                          </span>

                          {/* Host finalizing control */}
                          {isHost && !isConfirmed && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenFinalizeModal(opt.id);
                              }}
                              className="vote-finalize-btn"
                              disabled={confirming !== null}
                            >
                              {confirming === opt.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Chốt giờ này"
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vote Action Buttons */}
                {!isConfirmed && (
                  <div className="vote-actions-row">
                    <Button
                      onClick={handleVote}
                      disabled={voting || selectedOptionIds.length === 0}
                      className="vote-primary-btn"
                    >
                      {voting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Xác nhận giờ rảnh (Vote)"}
                    </Button>
                    <button
                      onClick={handleDecline}
                      disabled={voting}
                      className="vote-decline-btn"
                    >
                      Báo bận tất cả
                    </button>
                  </div>
                )}

                {isConfirmed && (
                  <div className="vote-confirmed-banner">
                    <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                    Lịch họp nhóm đã được chốt và đồng bộ trực tiếp vào Lịch cá nhân của tất cả những người tham gia!
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Participants Side Panel */}
          <div className="vote-right-col">
            <Card title="Trạng thái tham gia" icon={<Users className="text-indigo-500" />}>
              <div className="space-y-4">
                <div className="space-y-3">
                  {/* Host status */}
                  <div className="vote-participant-row">
                    <div>
                      <p className="text-xs font-bold text-slate-800 m-0">{meeting.hostName} (Host)</p>
                      <p className="text-[10px] text-slate-400 m-0 mt-0.5">{meeting.hostEmail}</p>
                    </div>
                    <span className="vote-participant-badge host">
                      Chủ trì
                    </span>
                  </div>

                  {/* Guests status list */}
                  {participants.map((p) => {
                    const userVotes = votes.filter(v => v.userId === p.userId);
                    const votedLabel = userVotes.length > 0 
                      ? `Đã chọn ${userVotes.length} giờ rảnh` 
                      : p.status === "DECLINED" ? "Báo bận tất cả" : "Chưa bỏ phiếu";

                    return (
                      <div key={p.userId} className="vote-participant-row">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 m-0 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400 m-0 mt-0.5 truncate">{votedLabel}</p>
                        </div>
                        <span className={`vote-participant-badge ${
                          p.status === "ACCEPTED"
                            ? "voted"
                            : p.status === "DECLINED"
                            ? "declined"
                            : "waiting"
                        }`}>
                          {p.status === "ACCEPTED" ? "Đã vote" : p.status === "DECLINED" ? "Báo bận" : "Chờ vote"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {showFinalizeModal && (
        <div className="vote-modal-overlay">
          <div className="vote-modal-card">
            <h3 className="vote-modal-title">Xác nhận chốt lịch nhóm</h3>
            <p className="vote-modal-desc">
              Vui lòng bổ sung nội dung và địa điểm hẹn chính thức để đồng bộ lên lịch của cả nhóm.
            </p>

            <div className="vote-modal-form">
              <div className="vote-modal-form-group">
                <label className="vote-modal-label">Hẹn làm gì? (Tên sự kiện) *</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Ví dụ: Họp dự án IELTS"
                  className="vote-modal-input"
                />
              </div>

              <div className="vote-modal-form-group">
                <label className="vote-modal-label">Mô tả lịch hẹn</label>
                <textarea
                  rows={2}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Mô tả ngắn gọn nội dung lịch hẹn..."
                  className="vote-modal-textarea"
                />
              </div>

              <div className="vote-modal-form-group">
                <label className="vote-modal-label">Hẹn ở đâu? (Bản đồ / Địa chỉ) *</label>
                <input
                  type="text"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  placeholder="Dán link Google Maps hoặc địa điểm họp..."
                  className="vote-modal-input"
                />
              </div>
            </div>

            <div className="vote-modal-actions">
              <Button
                variant="outline"
                onClick={() => setShowFinalizeModal(false)}
                className="text-xs py-2 px-4 font-bold border-slate-200 text-slate-500 hover:bg-slate-50 border border-solid"
              >
                Hủy bỏ
              </Button>
              <Button
                onClick={handleConfirmMeeting}
                disabled={!customTitle.trim() || !customLocation.trim() || confirming !== null}
                className="text-xs py-2 px-4 font-bold"
              >
                {confirming !== null ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Đang chốt...
                  </>
                ) : (
                  "Xác nhận chốt lịch"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
