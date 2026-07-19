"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import CalendarView from "@/components/calendar_view/CalendarView";
import PageHeader from "@/components/common/PageHeader";
import AppLayout from "@/components/layouts/AppLayout";
import Button from "@/components/ui/Button";
import { parseICS } from "@/utils/icsParser";
import { toast } from "react-toastify";
import { Upload } from "lucide-react";
import "./calendar.css";

export default function CalendarPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        toast.error("Không thể đọc tệp tin.");
        setImporting(false);
        return;
      }

      try {
        const parsedEvents = parseICS(text);
        if (parsedEvents.length === 0) {
          toast.error("Không tìm thấy sự kiện hợp lệ nào trong tệp ICS.");
          setImporting(false);
          return;
        }

        // Batch save to /api/event
        let successCount = 0;
        for (const evt of parsedEvents) {
          const res = await fetch("/api/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: evt.title,
              start: evt.start,
              end: evt.end,
              description: evt.description,
              color: "#6366f1"
            })
          });
          if (res.ok) {
            successCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Đã nhập thành công ${successCount} sự kiện từ Google Calendar!`);
          setRefreshKey((prev) => prev + 1); // Force FullCalendar refetch
        } else {
          toast.error("Không thể lưu các sự kiện đã tải lên.");
        }
      } catch (err) {
        console.error("Failed to parse/import ICS:", err);
        toast.error("Có lỗi xảy ra khi biên dịch tệp ICS.");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file selector
      }
    };

    reader.readAsText(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <AppLayout>
      <PageHeader
        title="Lịch cá nhân"
        description="Quản lý kế hoạch công việc và xem lời khuyên năng lượng tử vi từ AI"
        action={
          <>
            <input
              type="file"
              accept=".ics"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="calendar-file-input"
            />
            <Button
              onClick={triggerUpload}
              loading={importing}
              variant="outline"
              className="calendar-import-btn"
            >
              <Upload size={14} />
              Nhập từ Google Calendar (.ics)
            </Button>
          </>
        }
      />
      
      <div className="calendar-view-card">
        {user && <CalendarView key={refreshKey} user={user} />}
      </div>
    </AppLayout>
  );
}
