"use client";

import React, { useRef, useEffect } from "react";
import { Check, X, Bell, Users, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import "./notification-dropdown.css";

interface RequestItem {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface MeetingInvitation {
  id: string;
  title: string;
  duration: number;
  hostName: string;
  hostEmail: string;
}

interface HistoricalNotification {
  id: string;
  type: string;
  title: string;
  content: string;
  link?: string;
  isRead: number | boolean;
  createdAt: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  incomingRequests: RequestItem[];
  meetingInvitations?: MeetingInvitation[];
  historicalNotifications?: HistoricalNotification[];
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}

export default function NotificationDropdown({
  isOpen,
  onClose,
  incomingRequests,
  meetingInvitations = [],
  historicalNotifications = [],
  onAccept,
  onReject,
  onMarkRead,
  onMarkAllRead
}: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadHistoryCount = historicalNotifications.filter(n => !n.isRead).length;
  const totalUnread = incomingRequests.length + meetingInvitations.length + unreadHistoryCount;

  const handleInvitationClick = (id: string) => {
    onClose();
    router.push(`/friends/group-scheduling/vote/${id}`);
  };

  const handleNotifClick = async (notif: HistoricalNotification) => {
    if (!notif.isRead) {
      await onMarkRead(notif.id);
    }
    if (notif.link) {
      onClose();
      router.push(notif.link);
    }
  };

  const hasAnyNotifications = incomingRequests.length > 0 || meetingInvitations.length > 0 || historicalNotifications.length > 0;

  return (
    <div ref={dropdownRef} className="notif-dropdown">
      {/* Header */}
      <div className="notif-dropdown-header">
        <span className="notif-dropdown-title">
          <Bell size={14} className="text-indigo-500" />
          Thông báo
        </span>
        <div className="notif-dropdown-header-actions">
          {unreadHistoryCount > 0 && (
            <button onClick={onMarkAllRead} className="notif-dropdown-mark-all">
              Đọc tất cả
            </button>
          )}
          {totalUnread > 0 && (
            <span className="notif-dropdown-unread-badge">
              {totalUnread} mới
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="notif-dropdown-body">
        {hasAnyNotifications ? (
          <>
            {/* 1. Meeting Invitations */}
            {meetingInvitations.map((invite) => (
              <div
                key={invite.id}
                onClick={() => handleInvitationClick(invite.id)}
                className="notif-dropdown-item"
              >
                <span className="notif-dropdown-icon-wrapper unread">
                  <Calendar size={14} />
                </span>
                <div className="notif-dropdown-item-content">
                  <p className="notif-dropdown-item-title">
                    <span className="text-indigo-600 font-extrabold">{invite.hostName}</span> mời bình chọn lịch: <span className="font-extrabold text-slate-900">"{invite.title}"</span>
                  </p>
                  <p className="notif-dropdown-item-desc">{invite.duration} phút</p>
                </div>
              </div>
            ))}

            {/* 2. Friend Requests */}
            {incomingRequests.map((req) => (
              <div key={req.id} className="notif-dropdown-friend-item">
                <div className="notif-dropdown-friend-info">
                  <p className="notif-dropdown-item-title">
                    <span className="text-indigo-600 font-extrabold">{req.name}</span> gửi lời mời kết bạn
                  </p>
                  <p className="notif-dropdown-item-desc truncate">{req.email}</p>
                </div>
                <div className="notif-dropdown-friend-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAccept(req.id);
                    }}
                    className="notif-dropdown-btn-accept"
                    title="Đồng ý"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(req.id);
                    }}
                    className="notif-dropdown-btn-reject"
                    title="Từ chối"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}

            {/* 3. Historical Notifications */}
            {historicalNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                className={`notif-dropdown-item ${!notif.isRead ? "unread" : ""}`}
              >
                <span className={`notif-dropdown-icon-wrapper ${!notif.isRead ? "unread" : "read"}`}>
                  <Bell size={14} />
                </span>
                <div className="notif-dropdown-item-content">
                  <div className="notif-dropdown-item-title-row">
                    <p className="notif-dropdown-item-title">{notif.title}</p>
                    {!notif.isRead && (
                      <span className="notif-dropdown-unread-dot"></span>
                    )}
                  </div>
                  <p className="notif-dropdown-item-desc">{notif.content}</p>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="notif-dropdown-empty">
            <Users size={24} className="text-slate-300 mb-2" />
            <p className="notif-dropdown-empty-text">Không có thông báo mới nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
