"use client";

import React, { useState, useEffect } from "react";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AppLayout from "@/components/layouts/AppLayout";
import { Users, Calendar, Sparkles, Loader2, Check, ArrowRight, Info } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import "./group-scheduling.css";

interface Friend {
  id: string;
  name: string;
  email: string;
}

interface ProposedOption {
  date: string;
  startTime: string;
  endTime: string;
  label: string;
}

export default function GroupSchedulingPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [inputText, setInputText] = useState("Tìm lịch trống cho nhóm mình đi xem phim cuối tuần này, khoảng 3 tiếng.");
  
  // Loading states
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(0);

  // Results
  const [meetingTitle, setMeetingTitle] = useState("");
  const [duration, setDuration] = useState(120);
  const [proposedOptions, setProposedOptions] = useState<ProposedOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]); // index of selected proposed options
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [useBuffer, setUseBuffer] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [friendsRes, schedRes] = await Promise.all([
          fetch("/api/friends"),
          fetch("/api/scheduling/invitations")
        ]);
        const friendsData = await friendsRes.json();
        const schedData = await schedRes.json();
        
        if (friendsData.success) {
          setFriends(friendsData.friends || []);
        } else {
          toast.error("Không thể tải danh sách bạn bè");
        }
        
        if (schedData.success) {
          setInvitations(schedData.invitations || []);
        }
      } catch (err) {
        console.error(err);
        toast.error("Lỗi kết nối máy chủ");
      } finally {
        setLoadingFriends(false);
      }
    };
    fetchData();
  }, []);

  const handleToggleFriend = (id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id]
    );
  };

  const handleSearchSchedule = async () => {
    if (!inputText.trim()) {
      toast.warning("Vui lòng nhập nội dung cuộc hẹn");
      return;
    }
    if (selectedFriends.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một người bạn");
      return;
    }

    setSearching(true);
    setSearchStep(1); // "AI đang phân tích..."

    // Simulate stepping loading text for good UX
    const timers = [
      setTimeout(() => setSearchStep(2), 1200), // "Đang quét lịch bận bitmask..."
      setTimeout(() => setSearchStep(3), 2400)  // "Đang tính toán giờ rảnh chung..."
    ];

    try {
      const timezoneOffset = new Date().getTimezoneOffset(); // e.g. -420 for GMT+7
      const res = await fetch("/api/scheduling/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText.trim(),
          users_invited: selectedFriends,
          timezoneOffset
        })
      });
      const data = await res.json();
      
      timers.forEach(clearTimeout);

      if (data.success) {
        setMeetingTitle(data.title);
        setDuration(data.duration_minutes);

        const dates = data.dates || [];
        const availability = data.availability || {};
        const durationMinutes = data.duration_minutes || 120;
        const blocksNeeded = Math.ceil(durationMinutes / 30);
        const uids = Object.keys(availability);

        const blockIndexToTimeStr = (block: number) => {
          const h = Math.floor(block / 2);
          const m = (block % 2) * 30;
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };

        const proposed: ProposedOption[] = [];

        if (dates.length > 0 && uids.length > 0) {
          const offsetBlocks = Math.round(timezoneOffset / 30);
          const userContiguousMasks: Record<string, bigint> = {};

          uids.forEach(uid => {
            let combined = BigInt(0);
            dates.forEach((dateStr: string, idx: number) => {
              const maskStr = availability[uid][dateStr] || "0";
              const mask = BigInt(maskStr);
              combined |= (mask << BigInt(idx * 48));
            });

            // Perform global timezone shift to align UTC to local
            let shifted = combined;
            if (offsetBlocks < 0) {
              shifted = combined << BigInt(-offsetBlocks);
            } else if (offsetBlocks > 0) {
              shifted = combined >> BigInt(offsetBlocks);
            }

            // Apply Smart Buffer Time (30 mins before & after)
            if (useBuffer) {
              shifted = shifted | (shifted << BigInt(1)) | (shifted >> BigInt(1));
            }

            userContiguousMasks[uid] = shifted;
          });

          // OR all participants contiguous busy masks
          let mergedContiguousBusy = BigInt(0);
          uids.forEach(uid => {
            mergedContiguousBusy |= userContiguousMasks[uid];
          });

          const mask48 = (BigInt(1) << BigInt(48)) - BigInt(1);
          const freeSlotsByDate: Record<string, bigint> = {};
          dates.forEach((dateStr: string, idx: number) => {
            const dayBusy = (mergedContiguousBusy >> BigInt(idx * 48)) & mask48;
            freeSlotsByDate[dateStr] = (~dayBusy) & mask48;
          });

          // Find consecutive free blocks (06:00 to 22:00)
          dates.forEach((dateStr: string) => {
            const freeMask = freeSlotsByDate[dateStr];
            let consecutive = 0;
            for (let i = 12; i < 44; i++) {
              if ((freeMask & (BigInt(1) << BigInt(i))) !== BigInt(0)) {
                consecutive++;
                if (consecutive >= blocksNeeded) {
                  const startBlock = i - blocksNeeded + 1;
                  const endBlock = i + 1;
                  const startStr = blockIndexToTimeStr(startBlock);
                  const endStr = blockIndexToTimeStr(endBlock);

                  proposed.push({
                    date: dateStr,
                    startTime: `${dateStr}T${startStr}:00`,
                    endTime: `${dateStr}T${endStr}:00`,
                    label: ""
                  });
                }
              } else {
                consecutive = 0;
              }
            }
          });
        }

        const weekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
        const sortedOptions = proposed.slice(0, 3).map(opt => {
          const d = new Date(opt.startTime);
          const dayLabel = weekdays[d.getDay()];
          return {
            ...opt,
            label: `${dayLabel}, ${d.getDate()}/${d.getMonth() + 1}`
          };
        });

        setProposedOptions(sortedOptions);
        setSelectedOptions(sortedOptions.map((_, idx) => idx));
      } else {
        toast.error(data.error || "Tìm kiếm lịch trống thất bại");
      }
    } catch (err) {
      timers.forEach(clearTimeout);
      console.error(err);
      toast.error("Lỗi máy chủ khi quét lịch");
    } finally {
      setSearching(false);
      setSearchStep(0);
    }
  };

  const handleCreatePoll = async () => {
    if (selectedOptions.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một khung giờ đề xuất");
      return;
    }
    setCreatingRequest(true);
    try {
      const optionsToSubmit = selectedOptions.map(idx => proposedOptions[idx]);
      const res = await fetch("/api/scheduling/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meetingTitle || "Cuộc hẹn nhóm",
          duration_minutes: duration,
          users_invited: selectedFriends,
          options: optionsToSubmit
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Tạo bình chọn nhóm thành công!");
        setRequestId(data.meetingRequestId);
        // Redirect to the vote page
        router.push(`/friends/group-scheduling/vote/${data.meetingRequestId}`);
      } else {
        toast.error(data.error || "Tạo bình chọn thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi máy chủ khi tạo phòng bình chọn");
    } finally {
      setCreatingRequest(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Hẹn lịch nhóm thông minh"
        description="Quét lịch bận nhị phân (Bitmask) và nhờ AI đề xuất giờ rảnh chung tối ưu nhất cho cả nhóm."
      />

      {loadingFriends ? (
        <div className="scheduling-loading-wrapper">
          <Loader2 className="scheduling-loading-spinner animate-spin" />
        </div>
      ) : (
        <div className="scheduling-grid-layout">
          {/* Left Inputs Column */}
          <div className="scheduling-left-col">
            <Card title="Yêu cầu hẹn lịch" icon={<Sparkles className="text-indigo-500" />}>
              <div className="space-y-4">
                <div className="scheduling-form-group">
                  <label className="scheduling-label">Mô tả lịch hẹn bằng giọng nói/chữ</label>
                  <textarea
                    rows={4}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ví dụ: Lên lịch cho nhóm mình đi họp dự án tuần sau, khoảng 2 tiếng..."
                    className="scheduling-textarea"
                  />
                </div>

                <div className="space-y-2">
                  <label className="scheduling-label flex">
                    <span>Chọn bạn bè tham gia *</span>
                    <span className="scheduling-count">{selectedFriends.length} đã chọn</span>
                  </label>
                  
                  <div className="scheduling-members-list">
                    {friends.length > 0 ? (
                      friends.map((friend) => (
                        <div
                          key={friend.id}
                          onClick={() => handleToggleFriend(friend.id)}
                          className={`scheduling-member-item ${
                            selectedFriends.includes(friend.id) ? "selected" : ""
                          }`}
                        >
                          <div className="scheduling-member-info">
                            <p className="scheduling-member-name">{friend.name}</p>
                            <p className="scheduling-member-email">{friend.email}</p>
                          </div>
                          {selectedFriends.includes(friend.id) && (
                            <span className="scheduling-check-badge">
                              <Check size={12} />
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="friends-empty-requests" style={{ padding: "1.5rem 0" }}>Không tìm thấy bạn bè nào</p>
                    )}
                  </div>
                </div>

                <div className="scheduling-checkbox-row">
                  <input
                    type="checkbox"
                    id="smart-buffer"
                    checked={useBuffer}
                    onChange={(e) => setUseBuffer(e.target.checked)}
                    className="scheduling-checkbox"
                  />
                  <label htmlFor="smart-buffer" className="scheduling-checkbox-label">
                    Thời gian đệm (Buffer: cách lịch cũ 30p)
                  </label>
                </div>

                <Button
                  onClick={handleSearchSchedule}
                  disabled={searching || selectedFriends.length === 0}
                  className="scheduling-action-btn"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Calendar size={14} />
                      Tìm lịch trống chung với AI
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Lời mời bình chọn đang chờ */}
            {invitations.length > 0 && (
              <Card title="Lời mời hẹn nhóm chờ bạn" icon={<Users className="text-indigo-500" />}>
                <div className="scheduling-invitations-list">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => router.push(`/friends/group-scheduling/vote/${inv.id}`)}
                      className="scheduling-invitation-card"
                    >
                      <p className="scheduling-invitation-title">"{inv.title}"</p>
                      <p className="scheduling-invitation-host">Người mời: <span className="scheduling-host-name">{inv.hostName}</span></p>
                      <p className="scheduling-invitation-duration">Thời lượng: {inv.duration} phút</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Results Column */}
          <div className="scheduling-right-col">
            {searching && (
              <div className="scheduling-status-box">
                <Loader2 className="scheduling-status-icon animate-spin" />
                <div>
                  <p className="scheduling-status-title">Hệ thống đang hoạt động...</p>
                  <p className="scheduling-status-desc">
                    {searchStep === 1 && "💡 AI đang phân tích yêu cầu lập lịch của bạn..."}
                    {searchStep === 2 && "⚡ Đang quét lịch bận bitmask nhị phân của 4 người..."}
                    {searchStep === 3 && "🔮 Đang thực hiện phép toán nhị phân tìm giờ rảnh chung..."}
                  </p>
                </div>
              </div>
            )}

            {!searching && proposedOptions.length > 0 && (
              <Card title="Khung giờ rảnh đề xuất được tìm thấy" icon={<Check className="text-emerald-500" />}>
                <div className="space-y-6">
                  {/* Summary Block */}
                  <div className="scheduling-summary-card">
                    <div className="scheduling-summary-info">
                      <h4 className="scheduling-summary-title">{meetingTitle}</h4>
                      <p className="scheduling-summary-desc">Độ dài dự kiến: {duration} phút ({Math.ceil(duration / 30)} blocks)</p>
                    </div>
                    <div className="scheduling-summary-badge">
                      <Info size={12} />
                      Tất cả đều rảnh
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="scheduling-options-list">
                    {proposedOptions.map((opt, idx) => {
                      const startHour = opt.startTime.substring(11, 16);
                      const endHour = opt.endTime.substring(11, 16);
                      const isChecked = selectedOptions.includes(idx);

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedOptions(prev =>
                              prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                            );
                          }}
                          className={`scheduling-option-card ${isChecked ? "checked" : ""}`}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`scheduling-option-badge-num ${isChecked ? "checked" : ""}`}>
                              {idx + 1}
                            </span>
                            <div>
                              <p className="scheduling-option-label">{opt.label}</p>
                              <p className="scheduling-option-time">{startHour} - {endHour}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="scheduling-option-match">
                              100% Phù hợp
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      onClick={handleCreatePoll}
                      disabled={creatingRequest || selectedOptions.length === 0}
                      className="scheduling-action-btn"
                    >
                      {creatingRequest ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          Tạo bình chọn nhóm (Poll)
                          <ArrowRight size={14} />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {!searching && proposedOptions.length === 0 && (
              <div className="scheduling-intro-box">
                <Users className="scheduling-intro-icon" />
                <p className="scheduling-intro-title">Hãy bắt đầu thiết lập cuộc hẹn!</p>
                <p className="scheduling-intro-desc">Chọn bạn bè bên trái và mô tả thời gian mong muốn, AI sẽ quét lịch nhị phân tìm giờ trống tốt nhất cho nhóm bạn.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
