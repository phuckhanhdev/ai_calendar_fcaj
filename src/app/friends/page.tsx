"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AppLayout from "@/components/layouts/AppLayout";
import { Check, Shield, UserMinus, UserPlus, Users, X, Loader2, CalendarCheck } from "lucide-react";
import { toast } from "react-toastify";
import "./friends.css";

interface Friend {
  id: string;
  name: string;
  email: string;
  shareLevel: "none" | "free_busy" | "full";
  avatarUrl?: string;
}

interface Request {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Request[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<Request | null>(null);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Fetch friends and requests on mount
  const fetchFriendships = async () => {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      if (data.success) {
        setFriends(data.friends || []);
        setIncomingRequests(data.incomingRequests || []);
        setOutgoingRequests(data.outgoingRequests || []);
      } else {
        toast.error(data.error || "Không thể tải danh sách bạn bè");
      }
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendships();
  }, []);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(searchEmail.trim())}`);
      const data = await res.json();
      if (data.success) {
        if (data.user) {
          setSearchResult(data.user);
        } else {
          toast.info("Không tìm thấy người dùng với email này");
        }
      } else {
        toast.error(data.error || "Lỗi khi tìm kiếm người dùng");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;
    setSendingRequest(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId: searchResult.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã gửi yêu cầu kết bạn thành công!");
        setSearchResult(null);
        setSearchEmail("");
        fetchFriendships();
      } else {
        toast.error(data.error || "Không thể gửi yêu cầu kết bạn");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      const res = await fetch("/api/friends/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", friendId: id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã đồng ý kết bạn!");
        fetchFriendships();
      } else {
        toast.error(data.error || "Thực hiện thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      const res = await fetch("/api/friends/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", friendId: id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã từ chối yêu cầu kết bạn");
        fetchFriendships();
      } else {
        toast.error(data.error || "Thực hiện thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleRemoveFriend = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn huỷ kết bạn?")) return;
    try {
      const res = await fetch("/api/friends/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", friendId: id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã huỷ kết bạn thành công");
        fetchFriendships();
      } else {
        toast.error(data.error || "Thực hiện thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleUpdatePermission = async (id: string, level: "none" | "free_busy" | "full") => {
    try {
      const res = await fetch("/api/friends/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_permission", friendId: id, shareLevel: level }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã cập nhật quyền chia sẻ lịch");
        fetchFriendships();
      } else {
        toast.error(data.error || "Không thể cập nhật phân quyền");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Bạn bè"
        description="Kết nối bạn bè, phê duyệt yêu cầu và phân quyền chia sẻ lịch trình an toàn"
        action={
          <Button onClick={() => router.push("/friends/group-scheduling")} size="sm" variant="primary" className="friends-group-btn">
            <CalendarCheck size={14} />
            Hẹn lịch nhóm với AI
          </Button>
        }
      />

      {loading ? (
        <div className="friends-loading-wrapper">
          <Loader2 className="friends-loading-spinner animate-spin" />
        </div>
      ) : (
        <div className="friends-grid-layout">
          {/* Left Column: Search & Friend Requests */}
          <div className="friends-left-col">
            {/* Search Card */}
            <Card title="Tìm bạn bè" icon={<UserPlus className="text-indigo-500" />}>
              <div className="friends-search-form">
                <div className="friends-search-row">
                  <input
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="Nhập email người dùng..."
                    className="friends-search-input"
                  />
                  <Button onClick={handleSearch} size="sm" disabled={searching}>
                    {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Tìm"}
                  </Button>
                </div>
                
                {searchResult && (
                  <div className="friends-search-result-card">
                    <div className="friends-result-info">
                      <p className="friends-result-name">{searchResult.name}</p>
                      <p className="friends-result-email">{searchResult.email}</p>
                    </div>
                    <Button 
                      onClick={handleSendRequest} 
                      size="sm" 
                      variant="primary" 
                      className="friends-add-btn"
                      disabled={sendingRequest}
                    >
                      {sendingRequest ? <Loader2 className="w-3 h-3 animate-spin" /> : "Thêm bạn"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Pending Requests Card */}
            <Card title="Lời mời kết bạn" icon={<Users className="text-orange-500" />}>
              {incomingRequests.length > 0 ? (
                <div className="friends-request-list">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="friends-request-item">
                      <div className="friends-result-info">
                        <p className="friends-result-name">{req.name}</p>
                        <p className="friends-result-email">{req.email}</p>
                      </div>
                      <div className="friends-request-actions">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="friends-action-btn accept"
                          title="Đồng ý"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="friends-action-btn reject"
                          title="Từ chối"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="friends-empty-requests">Không có lời mời kết bạn nào</p>
              )}
            </Card>

            {/* Outgoing Requests Card */}
            {outgoingRequests.length > 0 && (
              <Card title="Đã gửi lời mời" icon={<UserPlus className="text-slate-500" />}>
                <div className="friends-request-list">
                  {outgoingRequests.map((req) => (
                    <div key={req.id} className="friends-request-item">
                      <div className="friends-result-info">
                        <p className="friends-result-name">{req.name}</p>
                        <p className="friends-result-email">{req.email}</p>
                      </div>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="friends-action-btn remove"
                        title="Thu hồi lời mời"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Active Friend List */}
          <div className="friends-right-col">
            <Card title="Danh sách bạn bè" icon={<Users className="text-indigo-600" />}>
              {friends.length > 0 ? (
                <div className="friends-list">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="friends-item-card"
                    >
                      <div className="friends-item-info">
                        <h4 className="friends-item-name">{friend.name}</h4>
                        <p className="friends-item-email">{friend.email}</p>
                      </div>
                      
                      <div className="friends-item-actions">
                        {/* Permission select */}
                        <div className="friends-permission-selector">
                          <Shield size={14} className="text-slate-400" />
                          <select
                            value={friend.shareLevel}
                            onChange={(e) => handleUpdatePermission(friend.id, e.target.value as any)}
                            className="friends-permission-select"
                          >
                            <option value="none">Không chia sẻ lịch</option>
                            <option value="free_busy">Chỉ xem Bận/Rảnh</option>
                            <option value="full">Xem toàn bộ lịch</option>
                          </select>
                        </div>

                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="friends-btn-delete"
                          title="Huỷ kết bạn"
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="friends-empty-requests" style={{ padding: "2rem 0" }}>Danh sách bạn bè trống</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
