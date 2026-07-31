"use client";

import React, { useState, useEffect, useRef } from "react";
import PageHeader from "@/components/common/PageHeader";
import FeatureContainer from "@/components/common/FeatureContainer";
import Button from "@/components/ui/Button";
import AppLayout from "@/components/layouts/AppLayout";
import { parseICS } from "@/utils/icsParser";
import { toast } from "react-toastify";
import { Calendar, Check, Send, Sparkles, User, Trash2 } from "lucide-react";
import "./ai-assistant.css";

interface ProposedEvent {
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  color?: string;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  content: string;
  proposedEvents?: ProposedEvent[];
  inserted?: boolean;
  timestamp?: string;
}

const parseInline = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-extrabold text-slate-800 bg-slate-100/50 px-1 rounded">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const renderMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split("\n");
  
  return lines.map((line, idx) => {
    const cleanLine = line.trim();
    
    if (cleanLine.startsWith("###")) {
      return <h4 key={idx} className="text-xs font-bold text-slate-800 mt-3 mb-1.5 flex items-center gap-1">{parseInline(cleanLine.replace(/^###\s*/, ""))}</h4>;
    }
    if (cleanLine.startsWith("##")) {
      return <h3 key={idx} className="text-sm font-black text-slate-900 mt-4 mb-2">{parseInline(cleanLine.replace(/^##\s*/, ""))}</h3>;
    }
    if (cleanLine.startsWith("#")) {
      return <h2 key={idx} className="text-base font-black text-slate-900 mt-4 mb-2">{parseInline(cleanLine.replace(/^#\s*/, ""))}</h2>;
    }
    if (cleanLine === "---") {
      return <hr key={idx} className="my-3 border-slate-200" />;
    }
    if (cleanLine.startsWith("* ") || cleanLine.startsWith("- ")) {
      const content = cleanLine.replace(/^[\*\-]\s*/, "");
      return (
        <ul key={idx} className="list-disc pl-4 my-1.5 space-y-1">
          <li className="text-xs leading-relaxed text-slate-600">{parseInline(content)}</li>
        </ul>
      );
    }
    if (/^\d+\.\s*/.test(cleanLine)) {
      const content = cleanLine.replace(/^\d+\.\s*/, "");
      return (
        <ol key={idx} className="list-decimal pl-4 my-1.5 space-y-1">
          <li className="text-xs leading-relaxed text-slate-650 font-semibold">{parseInline(content)}</li>
        </ol>
      );
    }
    if (!cleanLine) {
      return <div key={idx} className="h-2" />;
    }
    return <p key={idx} className="text-xs leading-relaxed text-slate-600 m-0 mb-1.5">{parseInline(line)}</p>;
  });
};

// Helper to extract and parse ICS calendar code blocks
const parseICSFromContent = (text: string): ProposedEvent[] | undefined => {
  if (text.includes("BEGIN:VEVENT") || text.includes("BEGIN:VCALENDAR")) {
    const startIndex = text.indexOf("BEGIN:");
    const endIndex = text.lastIndexOf("END:VEVENT") !== -1 
      ? text.lastIndexOf("END:VEVENT") + "END:VEVENT".length 
      : text.lastIndexOf("END:VCALENDAR") + "END:VCALENDAR".length;
      
    if (startIndex > -1 && endIndex > startIndex) {
      const icsContent = text.substring(startIndex, endIndex).trim();
      try {
        const parsed = parseICS(icsContent);
        // Map keys to make sure they match casing
        return parsed.map(evt => ({
          title: evt.title,
          start: evt.start,
          end: evt.end,
          description: evt.description,
          location: evt.location
        }));
      } catch (err) {
        console.error("Failed to parse ICS block from AI content:", err);
      }
    }
  }
  return undefined;
};

// Helper to clean raw text and remove the ICS block for user-friendly display
const getCleanDisplayMessage = (text: string): string => {
  let cleaned = text;
  
  // 1. Remove markdown code blocks like ```ics ... ``` (case insensitive, with or without language name)
  cleaned = cleaned.replace(/```(?:ics|ICS)?[\s\S]*?```/g, "");
  
  // 2. Remove raw ICS content blocks if they were not wrapped in code fences
  cleaned = cleaned.replace(/(?:BEGIN:VCALENDAR|BEGIN:VEVENT)[\s\S]*?(?:END:VCALENDAR|END:VEVENT)/g, "");
  
  // 3. Remove any orphaned backticks remaining
  cleaned = cleaned.replace(/```/g, "");
  
  return cleaned.trim();
};

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      content: "Xin chào! Tôi là Trợ lý Lịch Bản Mệnh LifeSync AI. Hãy cho tôi biết yêu cầu xếp lịch của bạn (Ví dụ: 'Tôi cần lên lịch ôn thi TOEIC trong tuần này...'). Tôi sẽ đọc các khoảng trống hiện tại trong lịch trình của bạn và sắp xếp thời gian hợp lý nhất!",
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  // Auto scroll to latest chat whenever messages or loading state changes
  useEffect(() => {
    scrollToBottom(true);
  }, [messages, loading]);

  // Load chat history from DB on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch("/api/ai/chat");
        if (res.ok) {
          const data = await res.json();
          if (data.history && data.history.length > 0) {
            const parsedHistory = data.history.map((msg: any) => {
              const rawContent = msg.content;
              let displayMessage = rawContent;
              let proposedEvents: ProposedEvent[] | undefined = undefined;

              if (msg.sender === "ai") {
                proposedEvents = parseICSFromContent(rawContent);
                displayMessage = getCleanDisplayMessage(rawContent);
              }

              return {
                id: msg.id.toString(),
                sender: msg.sender,
                content: displayMessage,
                proposedEvents,
                inserted: false,
                timestamp: msg.created_at ? new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""
              };
            });
            setMessages(parsedHistory);
            setTimeout(() => scrollToBottom(false), 100);
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện không?")) return;

    try {
      const res = await fetch("/api/ai/chat", { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xóa toàn bộ lịch sử trò chuyện!");
        setMessages([
          {
            id: "1",
            sender: "ai",
            content: "Đã dọn dẹp lịch sử trò chuyện. Tôi là Trợ lý Lịch Bản Mệnh LifeSync AI. Hãy cho tôi biết bạn cần lên lịch gì tiếp theo nhé!",
            timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      } else {
        toast.error("Không thể xóa lịch sử trò chuyện.");
      }
    } catch (err) {
      console.error("Failed to clear chat history:", err);
      toast.error("Có lỗi xảy ra khi dọn dẹp tin nhắn.");
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    const promptText = input;
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: promptText })
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.message;

        let displayMessage = rawContent;
        let proposedEvents: ProposedEvent[] | undefined = undefined;

        proposedEvents = parseICSFromContent(rawContent);
        displayMessage = getCleanDisplayMessage(rawContent);

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          content: displayMessage,
          proposedEvents,
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        };

        setMessages((prev) => [...prev, aiMsg]);
      } else {
        toast.error("Không nhận được phản hồi từ trợ lý AI.");
      }
    } catch (error) {
      console.error("AI Chat error:", error);
      toast.error("Có lỗi xảy ra khi kết nối AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleInsertEvents = async (events: ProposedEvent[], msgId: string) => {
    try {
      let successCount = 0;
      for (const event of events) {
        const response = await fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: event.title,
            start: event.start,
            end: event.end,
            description: event.description,
            location: event.location,
            color: event.color || "#6366f1"
          })
        });
        if (response.ok) {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Đã tự động thêm thành công ${successCount} sự kiện vào Lịch cá nhân!`);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, inserted: true } : m))
        );
      } else {
        toast.error("Không thể lưu sự kiện vào cơ sở dữ liệu.");
      }
    } catch (err) {
      console.error("Failed to auto-insert events:", err);
      toast.error("Có lỗi xảy ra khi lưu lịch trình.");
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between pr-4">
        <PageHeader
          title="Trợ lý AI"
          description="Trò chuyện và nhận đề xuất lập lịch trình thông minh tối ưu theo tử vi bản mệnh (Tự động lưu & xóa sau 3 ngày)"
        />
        <Button
          onClick={handleClearHistory}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
          title="Xóa toàn bộ lịch sử trò chuyện"
        >
          <Trash2 size={14} />
          <span className="hidden sm:inline">Xóa lịch sử</span>
        </Button>
      </div>

      <FeatureContainer className="assistant-page-container">
        {/* Chat Messages Area */}
        <div className="assistant-chat-history">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`assistant-msg-wrapper ${msg.sender === "user" ? "user" : ""}`}
            >
              <div className={`assistant-msg-row ${msg.sender === "user" ? "user" : ""}`}>
                <div className={`assistant-avatar ${msg.sender === "user" ? "user" : "ai"}`}>
                  {msg.sender === "user" ? <User size={16} /> : <Sparkles size={16} />}
                </div>
                <div className={`assistant-bubble ${msg.sender === "user" ? "user" : "ai"}`}>
                  <div className="space-y-1">
                    {msg.sender === "user" ? (
                      <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      renderMarkdown(msg.content)
                    )}
                  </div>
                  {msg.timestamp && (
                    <span className="assistant-timestamp">
                      {msg.timestamp}
                    </span>
                  )}
                </div>
              </div>

              {/* Proposed Schedule Block */}
              {msg.proposedEvents && msg.proposedEvents.length > 0 && (
                <div className="assistant-proposed-box">
                  <h4 className="assistant-proposed-header">
                    <Calendar size={14} className="text-indigo-500" />
                    Lịch trình đề xuất được AI tính toán:
                  </h4>
                  <div className="assistant-proposed-list">
                    {msg.proposedEvents.map((evt: any, idx) => {
                      const evtTitle = evt.title || "Sự kiện";
                      const evtStart = evt.start;
                      const evtEnd = evt.end || evtStart;
                      const evtDesc = evt.description || "";
                      const evtColor = evt.color || "#6366f1";

                      return (
                        <div key={idx} className="assistant-proposed-item">
                          <span className="assistant-proposed-color-indicator" style={{ backgroundColor: evtColor }}></span>
                          <div className="assistant-proposed-info">
                            <p className="assistant-proposed-title">{evtTitle}</p>
                            <p className="assistant-proposed-time">
                              {evtStart ? new Date(evtStart).toLocaleString("vi-VN", { weekday: 'long', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : "Chưa rõ thời gian"} - {evtEnd ? new Date(evtEnd).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : ""}
                            </p>
                            {evtDesc && <p className="assistant-proposed-desc">{evtDesc}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!msg.inserted ? (
                    <Button
                      onClick={() => handleInsertEvents(msg.proposedEvents!, msg.id)}
                      size="sm"
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold mt-2"
                    >
                      <Calendar size={14} />
                      Tự động chèn vào Lịch của tôi
                    </Button>
                  ) : (
                    <span className="assistant-success-badge">
                      <Check size={14} />
                      Đã thêm vào Lịch thành công!
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="assistant-loading-msg">
              <div className="assistant-avatar ai animate-pulse">
                <Sparkles size={16} />
              </div>
              <div className="assistant-loading-bubble">
                Đang phân tích tinh tú & xếp lịch trống...
              </div>
            </div>
          )}

          {/* Target for auto-scrolling to latest chat message */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="assistant-input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Hỏi AI để tự động tìm giờ trống và xếp lịch..."
            className="assistant-text-input"
          />
          <Button onClick={handleSend} size="md" className="assistant-send-btn">
            <Send size={16} />
          </Button>
        </div>
      </FeatureContainer>
    </AppLayout>
  );
}
