"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import AppLayout from "@/components/layouts/AppLayout";
import { formatUserName } from "@/lib/name-utils";
import { Compass, Sparkles, Star, Sun, Dices, Loader2 } from "lucide-react";
import { calculateDestinyMatrix, getDestinyMatrixDescription } from "@/utils/matrixDestiny";
import { toast } from "react-toastify";
import "./destiny.css";

function parseInlineFormatting(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={idx} className="italic text-indigo-700 font-medium">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function SimpleMarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;
  const blocks = content.split(/\n\n+/);
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (trimmed === "---" || trimmed === "***") {
          return <hr key={i} className="border-t border-slate-200/80 my-4" />;
        }
        if (trimmed.startsWith("#### ")) {
          return (
            <h4 key={i} className="text-xs font-extrabold text-indigo-800 uppercase tracking-wide mt-3 mb-1">
              {parseInlineFormatting(trimmed.replace(/^####\s+/, ""))}
            </h4>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} className="text-sm sm:text-base font-extrabold text-indigo-950 mt-4 mb-1 border-b border-indigo-100 pb-1">
              {parseInlineFormatting(trimmed.replace(/^###\s+/, ""))}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="text-base font-black text-indigo-900 mt-5 mb-1.5">
              {parseInlineFormatting(trimmed.replace(/^##\s+/, ""))}
            </h2>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const items = trimmed.split(/\n/).map(l => l.replace(/^[-*]\s+/, ""));
          return (
            <ul key={i} className="list-disc list-inside space-y-1.5 text-slate-700 text-xs sm:text-sm my-2">
              {items.map((it, idx) => (
                <li key={idx}>{parseInlineFormatting(it)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line m-0">
            {parseInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function getEasternZodiac(dobStr: string) {
  if (!dobStr) return { name: "Chưa rõ", hanzi: "☯️", element: "Kim/Mộc/Thủy/Hỏa/Thổ" };
  const year = new Date(dobStr).getFullYear();
  if (isNaN(year)) return { name: "Chưa rõ", hanzi: "☯️", element: "Kim/Mộc/Thủy/Hỏa/Thổ" };

  const ANIMALS = [
    { name: "Thân (Khỉ)", hanzi: "申", element: "Kim" },
    { name: "Dậu (Gà)", hanzi: "酉", element: "Kim" },
    { name: "Tuất (Chó)", hanzi: "戌", element: "Thổ" },
    { name: "Hợi (Heo)", hanzi: "亥", element: "Thủy" },
    { name: "Tý (Chuột)", hanzi: "子", element: "Thủy" },
    { name: "Sửu (Trâu)", hanzi: "丑", element: "Thổ" },
    { name: "Dần (Hổ)", hanzi: "寅", element: "Mộc" },
    { name: "Mão (Mèo)", hanzi: "卯", element: "Mộc" },
    { name: "Thìn (Rồng)", hanzi: "辰", element: "Thổ" },
    { name: "Tỵ (Rắn)", hanzi: "巳", element: "Hỏa" },
    { name: "Ngọ (Ngựa)", hanzi: "午", element: "Hỏa" },
    { name: "Mùi (Dê)", hanzi: "未", element: "Thổ" }
  ];

  const idx = (year - 4) % 12;
  return ANIMALS[idx >= 0 ? idx : idx + 12];
}

export default function DestinyPage() {
  const { user } = useAuth();
  const dobStr = user?.Date_of_birth?.substring(0, 10) || "";

  // Calculate real values based on user's birth details
  const { points, zodiac, emoji } = calculateDestinyMatrix(dobStr);
  const matrixDesc = getDestinyMatrixDescription(points.epoint);

  // Tarot AI states
  const [tarotMode, setTarotMode] = React.useState<"single" | "three" | "celtic" | "love">("three");
  const [tarotQuestion, setTarotQuestion] = React.useState("Năng lượng công việc và cơ hội của tôi trong tuần này thế nào?");
  const [drawingTarot, setDrawingTarot] = React.useState(false);
  const [syncingEvents, setSyncingEvents] = React.useState(false);
  const [tarotResult, setTarotResult] = React.useState<{ cards: any[]; reading: string; modeName?: string; suggestedEvents?: any[] } | null>(null);
  const [flippedCards, setFlippedCards] = React.useState<Record<number, boolean>>({});

  // I Ching states
  const [ichingQuestion, setIchingQuestion] = React.useState("Thời điểm này tôi có nên quyết định chuyển việc hoặc đầu tư dự án mới không?");
  const [castingIching, setCastingIching] = React.useState(false);
  const [syncingIchingEvents, setSyncingIchingEvents] = React.useState(false);
  const [ichingResult, setIchingResult] = React.useState<{ hexagram: any; reading: string; suggestedEvents?: any[] } | null>(null);

  const toggleCardFlip = (idx: number) => {
    setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Trigger sequential 3D card flip animation when cards load
  React.useEffect(() => {
    if (tarotResult?.cards && tarotResult.cards.length > 0) {
      setFlippedCards({});
      tarotResult.cards.forEach((_, idx) => {
        setTimeout(() => {
          setFlippedCards(prev => ({ ...prev, [idx]: true }));
        }, (idx + 1) * 350);
      });
    }
  }, [tarotResult]);

  const handleCastIching = async () => {
    if (!ichingQuestion.trim()) {
      toast.warning("Vui lòng nhập câu hỏi của bạn cho quẻ Kinh Dịch!");
      return;
    }
    setCastingIching(true);
    setIchingResult(null);
    try {
      const res = await fetch("/api/ai/iching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: ichingQuestion.trim(),
          dob: dobStr,
          birthTime: user?.Birth_Time
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIchingResult({ hexagram: data.hexagram, reading: data.reading, suggestedEvents: data.suggestedEvents });
        toast.success(`Gieo quẻ Kinh Dịch thành công! (${data.hexagram.definition})`);
      } else {
        toast.error(data.error || "Gieo quẻ thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi máy chủ khi gieo quẻ Kinh Dịch.");
    } finally {
      setCastingIching(false);
    }
  };

  const handleSyncIchingEvents = async () => {
    if (!ichingResult?.suggestedEvents || ichingResult.suggestedEvents.length === 0) {
      toast.warning("Không tìm thấy gợi ý lịch trình nào để đồng bộ");
      return;
    }

    setSyncingIchingEvents(true);
    try {
      const todayStr = new Date().toISOString().substring(0, 10);
      let count = 0;

      for (const ev of ichingResult.suggestedEvents) {
        const startTimeStr = `${todayStr}T${ev.start_time || "09:00"}:00`;
        const endTimeStr = `${todayStr}T${ev.end_time || "10:00"}:00`;

        const res = await fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: ev.title,
            description: ev.description || "Đồng bộ tự động từ Quẻ Kinh Dịch LifeSync AI",
            start: startTimeStr,
            end: endTimeStr,
            category: ev.category || "study",
            priority: "high",
            color: "#6366f1"
          })
        });
        if (res.ok) count++;
      }

      toast.success(`Đã đồng bộ thành công ${count} khung giờ chiến lược từ Kinh Dịch vào Calendar!`);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi đồng bộ lịch trình vào Calendar");
    } finally {
      setSyncingIchingEvents(false);
    }
  };

  const handleSyncTarotEvents = async () => {
    if (!tarotResult?.suggestedEvents || tarotResult.suggestedEvents.length === 0) {
      toast.warning("Không tìm thấy gợi ý lịch trình nào để đồng bộ");
      return;
    }

    setSyncingEvents(true);
    try {
      const todayStr = new Date().toISOString().substring(0, 10);
      let count = 0;

      for (const ev of tarotResult.suggestedEvents) {
        const startTimeStr = `${todayStr}T${ev.start_time || "09:00"}:00`;
        const endTimeStr = `${todayStr}T${ev.end_time || "10:00"}:00`;

        const res = await fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: ev.title,
            description: ev.description || "Đồng bộ tự động từ Trợ lý Tarot LifeSync AI",
            start: startTimeStr,
            end: endTimeStr,
            category: ev.category || "general",
            priority: "medium",
            color: "#8b5cf6"
          })
        });
        if (res.ok) count++;
      }

      toast.success(`Đã đồng bộ thành công ${count} sự kiện từ Tarot vào Lịch cá nhân!`);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi đồng bộ lịch trình vào Calendar");
    } finally {
      setSyncingEvents(false);
    }
  };

  const handleDrawTarot = async () => {
    if (!tarotQuestion.trim()) {
      toast.warning("Vui lòng nhập câu hỏi của bạn!");
      return;
    }
    setDrawingTarot(true);
    setTarotResult(null);
    try {
      const res = await fetch("/api/ai/tarot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: tarotQuestion.trim(),
          mode: tarotMode,
          dob: dobStr,
          birthTime: user?.Birth_Time
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTarotResult({
          cards: data.cards,
          reading: data.reading,
          modeName: data.modeName,
          suggestedEvents: data.suggestedEvents
        });
        toast.success(`Tráo bài ${data.modeName} thành công!`);
      } else {
        toast.error(data.error || "Rút bài thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi máy chủ khi trải bài Tarot.");
    } finally {
      setDrawingTarot(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Bản mệnh học"
        description="Khám phá bản đồ ma trận định mệnh, số chủ đạo thần số học và cung hoàng đạo cá nhân"
      />

      <div className="destiny-grid-layout">
        {/* Left Column: Birth profile and Zodiac details */}
        <div className="destiny-left-col">
          {/* Birth Profile Card */}
          <Card title="Hồ sơ ngày sinh" icon={<Sun className="text-orange-500" />}>
            <div className="space-y-4">
              <div className="destiny-profile-row">
                <span className="destiny-profile-label">Họ và tên</span>
                <span className="destiny-profile-value">{formatUserName(user)}</span>
              </div>
              <div className="destiny-profile-row">
                <span className="destiny-profile-label">Ngày sinh</span>
                <span className="destiny-profile-value">
                  {dobStr ? new Date(dobStr).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                </span>
              </div>
              <div className="destiny-profile-row no-border">
                <span className="destiny-profile-label">Giờ sinh</span>
                <span className="destiny-profile-value">
                  {user?.Birth_Time || "12:00 (Mặc định)"}
                </span>
              </div>
            </div>
          </Card>

          {/* Zodiac Details Card */}
          <Card title="Cung Hoàng Đạo & 12 Con Giáp" icon={<Star className="text-amber-500" />}>
            {dobStr ? (
              <div className="grid grid-cols-2 gap-3 my-2">
                <div className="destiny-zodiac-box">
                  <span className="destiny-zodiac-emoji">{emoji}</span>
                  <h4 className="destiny-zodiac-title">{zodiac}</h4>
                  <p className="text-[10px] text-amber-700 font-semibold m-0">Hoàng đạo Phương Tây</p>
                </div>

                <div className="destiny-zodiac-box bg-red-50/60 border-red-200">
                  <span className="destiny-zodiac-emoji">{getEasternZodiac(dobStr).hanzi}</span>
                  <h4 className="destiny-zodiac-title text-red-700">{getEasternZodiac(dobStr).name}</h4>
                  <p className="text-[10px] text-red-600 font-semibold m-0">Ngũ hành: {getEasternZodiac(dobStr).element}</p>
                </div>
              </div>
            ) : (
              <div className="destiny-zodiac-notice">
                <p className="destiny-zodiac-notice-text">
                  💡 Hãy cập nhật Ngày sinh trong hồ sơ cá nhân để khám phá Cung hoàng đạo & 12 Con giáp của bạn!
                </p>
              </div>
            )}
            <p className="destiny-zodiac-desc">
              Sự kết hợp giữa Cung Hoàng Đạo phương Tây và 12 Con Giáp phương Đông giúp định hình bức tranh năng lượng tự nhiên và xu hướng hành xử của bạn.
            </p>
          </Card>
        </div>

        {/* Right Column: Destiny Matrix Chart */}
        <div className="destiny-right-col">
          <Card
            title="Ma trận Định mệnh (Destiny Matrix)"
            subtitle="Sơ đồ năng lượng luân xa bản mệnh dựa trên ngày sinh"
            icon={<Compass className="text-indigo-500" />}
          >
            <div className="destiny-matrix-wrapper">
              {dobStr ? (
                <>
                  {/* Graphical matrix representation using styled nodes */}
                  <div className="destiny-octagram">
                    {/* Center node */}
                    <div className="destiny-center-node">
                      <span className="destiny-center-val">{points.epoint}</span>
                      <span className="destiny-center-label">Tâm</span>
                    </div>
                    
                    {/* Outer octagram points */}
                    {/* Top B */}
                    <div className="destiny-outer-node red">
                      {points.bpoint}
                    </div>
                    {/* Bottom D */}
                    <div className="destiny-outer-node orange">
                      {points.dpoint}
                    </div>
                    {/* Left A */}
                    <div className="destiny-outer-node emerald">
                      {points.apoint}
                    </div>
                    {/* Right C */}
                    <div className="destiny-outer-node purple">
                      {points.cpoint}
                    </div>
                    
                    {/* Diagonals */}
                    {/* Top-Left F */}
                    <div className="destiny-diagonal-node top-left">
                      {points.fpoint}
                    </div>
                    {/* Top-Right G */}
                    <div className="destiny-diagonal-node top-right">
                      {points.gpoint}
                    </div>
                    {/* Bottom-Left H */}
                    <div className="destiny-diagonal-node bottom-left">
                      {points.hpoint}
                    </div>
                    {/* Bottom-Right I */}
                    <div className="destiny-diagonal-node bottom-right">
                      {points.ipoint}
                    </div>

                    {/* SVG connection lines in background */}
                    <svg className="destiny-connections" viewBox="0 0 256 256">
                      <line x1="128" y1="20" x2="128" y2="236" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                      <line x1="20" y1="128" x2="236" y2="128" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                      <line x1="48" y1="48" x2="208" y2="208" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                      <line x1="208" y1="48" x2="48" y2="208" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                    </svg>
                  </div>

                  <div className="destiny-interpretation">
                    <h5 className="destiny-interpretation-title">
                      <Sparkles size={14} className="text-indigo-500" />
                      {matrixDesc.title}
                    </h5>
                    <p className="destiny-interpretation-desc">
                      {matrixDesc.desc}
                    </p>
                  </div>
                </>
              ) : (
                <div className="destiny-matrix-notice">
                  <p className="destiny-matrix-notice-title">💡 Khám phá Ma trận định mệnh</p>
                  <p className="destiny-matrix-notice-text">
                    Vui lòng cập nhật Ngày sinh trong hồ sơ cá nhân để hệ thống tính toán sơ đồ luân xa và giải nghĩa năng lượng bản mệnh của bạn.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Tarot Card AI Reading Section */}
      <div className="mt-8">
        <Card
          title="Bói bài Tarot AI & Lời khuyên Lập lịch"
          subtitle="Đặt câu hỏi và rút 3 lá bài ngẫu nhiên để AI giải mã năng lượng thời gian của bạn"
          icon={<Dices className="text-purple-500" />}
        >
          <div className="space-y-6">
            {/* Mode selection tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">
                Chọn kiểu trải bài Tarot:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => setTarotMode("single")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    tarotMode === "single"
                      ? "border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="font-bold text-xs text-slate-800 m-0">🃏 Rút 1 lá</p>
                  <p className="text-[10px] text-slate-400 m-0 mt-0.5">Câu hỏi nhanh trong ngày</p>
                </button>

                <button
                  onClick={() => setTarotMode("three")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    tarotMode === "three"
                      ? "border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="font-bold text-xs text-slate-800 m-0">🎴 Rút 3 lá</p>
                  <p className="text-[10px] text-slate-400 m-0 mt-0.5">Quá khứ - Hiện tại - Tương lai</p>
                </button>

                <button
                  onClick={() => setTarotMode("celtic")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    tarotMode === "celtic"
                      ? "border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="font-bold text-xs text-slate-800 m-0">⚔️ Celtic Cross (10 lá)</p>
                  <p className="text-[10px] text-slate-400 m-0 mt-0.5">Phân tích chuyên sâu 10 lá</p>
                </button>

                <button
                  onClick={() => setTarotMode("love")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    tarotMode === "love"
                      ? "border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="font-bold text-xs text-slate-800 m-0">💖 Tình cảm (5 lá)</p>
                  <p className="text-[10px] text-slate-400 m-0 mt-0.5">Cảm xúc & Kết nối 2 người</p>
                </button>
              </div>
            </div>

            <div className="destiny-tarot-input-group">
              <label className="block text-xs font-bold text-slate-600 mb-2">
                Nhập câu hỏi của bạn cho bộ bài Tarot:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tarotQuestion}
                  onChange={(e) => setTarotQuestion(e.target.value)}
                  placeholder="Ví dụ: Định hướng công việc tuần tới của tôi như thế nào?..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleDrawTarot}
                  disabled={drawingTarot}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {drawingTarot ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Đang tráo bài AI...
                    </>
                  ) : (
                    <>
                      <Dices size={16} />
                      Tráo & Trải bài
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Display drawn cards */}
            {tarotResult && (
              <div className="space-y-6 animate-fadeIn">
                <div className={`grid gap-4 ${
                  tarotResult.cards.length === 1
                    ? "grid-cols-1 max-w-xs mx-auto"
                    : tarotResult.cards.length <= 3
                    ? "grid-cols-1 md:grid-cols-3"
                    : tarotResult.cards.length <= 5
                    ? "grid-cols-2 md:grid-cols-5"
                    : "grid-cols-2 md:grid-cols-5"
                }`}>
                  {tarotResult.cards.map((c, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleCardFlip(idx)}
                      className={`tarot-card-container relative h-[340px] rounded-2xl transition-transform hover:-translate-y-1 ${
                        flippedCards[idx] ? "flipped" : ""
                      }`}
                    >
                      <div className="tarot-card-inner w-full h-full">
                        {/* Back of Card (Lá úp) */}
                        <div className="tarot-card-back p-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center mb-2">
                            <Sparkles className="text-indigo-300 animate-pulse" size={24} />
                          </div>
                          <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider line-clamp-1">
                            {c.position}
                          </p>
                          <p className="text-[9px] text-indigo-300/70 mt-1">Chạm để lật bài</p>
                        </div>

                        {/* Front of Card (Lá ngửa 3D) */}
                        <div className={`tarot-card-front p-3 rounded-2xl border bg-gradient-to-b from-white to-slate-50 shadow-md text-center relative overflow-hidden flex flex-col justify-between ${
                          c.isReversed ? "border-amber-300" : "border-indigo-300"
                        }`}>
                          <div>
                            <span className="text-[11px] font-bold text-indigo-600 block mb-1.5 line-clamp-1">
                              {c.position}
                            </span>
                            
                            {c.img ? (
                              <div className="relative overflow-hidden rounded-lg shadow-inner mb-2 bg-slate-950/90 p-1 flex items-center justify-center">
                                <img
                                  src={c.img}
                                  alt={c.name}
                                  className={`w-full h-48 object-contain rounded transition-transform duration-300 ${
                                    c.isReversed ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            ) : (
                              <div className="text-4xl my-3 transform transition-transform" style={{ transform: c.isReversed ? "rotate(180deg)" : "none" }}>
                                🃏
                              </div>
                            )}

                            <h4 className="font-extrabold text-slate-800 text-xs m-0 line-clamp-1">{c.name}</h4>
                            <p className="text-[9px] text-slate-400 font-semibold m-0">{c.arcana}</p>
                          </div>

                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                            c.isReversed ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {c.orientation}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Interpretation */}
                <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-slate-700 leading-relaxed text-sm prose max-w-none shadow-sm">
                  <SimpleMarkdownRenderer content={tarotResult.reading} />
                </div>

                {/* Auto Sync to Calendar Action Button */}
                {tarotResult.suggestedEvents && tarotResult.suggestedEvents.length > 0 && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900 to-purple-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg animate-fadeIn">
                    <div>
                      <h4 className="font-extrabold text-sm text-amber-300 m-0 flex items-center gap-1.5">
                        <Sparkles size={16} />
                        Đồng bộ gợi ý Tarot vào Calendar
                      </h4>
                      <p className="text-xs text-indigo-200 m-0 mt-1">
                        Tự động tạo {tarotResult.suggestedEvents.length} khung giờ làm việc & tĩnh tâm (Deep Work, Detox...) vào Lịch cá nhân.
                      </p>
                    </div>

                    <button
                      onClick={handleSyncTarotEvents}
                      disabled={syncingEvents}
                      className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition-all whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
                    >
                      {syncingEvents ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Đang đồng bộ...
                        </>
                      ) : (
                        <>
                          📅 Thêm vào Calendar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* I CHING HEXAGRAM CASTING CARD */}
        <Card
          title="Gieo Quẻ Kinh Dịch (I Ching 64 Quẻ)"
          subtitle="Định hướng chiến lược, quyết định lớn & chọn thời điểm hành động"
          icon={<Compass className="text-emerald-500" />}
        >
          <div className="space-y-5">
            {/* Question input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nhập câu hỏi chiến lược / quyết định lớn của bạn:
              </label>
              <textarea
                value={ichingQuestion}
                onChange={(e) => setIchingQuestion(e.target.value)}
                rows={2}
                placeholder="Ví dụ: Tôi có nên đầu tư dự án mới hoặc chuyển đổi công việc lúc này không?"
                className="w-full p-3 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Action Button */}
            <button
              onClick={handleCastIching}
              disabled={castingIching}
              className="w-full py-3 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {castingIching ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang gieo 6 đồng xu & lập quẻ Kinh Dịch...
                </>
              ) : (
                <>
                  ☯️ Gieo Quẻ Kinh Dịch (64 Quẻ)
                </>
              )}
            </button>

            {/* Hexagram Result Output */}
            {ichingResult && (
              <div className="space-y-4 pt-4 border-t border-slate-100 animate-fadeIn">
                {/* Hexagram Badge */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white text-center shadow-md flex flex-col items-center">
                  <span className="text-6xl mb-1 text-emerald-300 font-serif leading-none">
                    {ichingResult.hexagram?.hexagram}
                  </span>
                  <h3 className="font-extrabold text-base text-amber-300 m-0">
                    {ichingResult.hexagram?.definition}
                  </h3>
                  <p className="text-xs text-emerald-200 mt-1 max-w-lg m-0 italic">
                    "{ichingResult.hexagram?.description}"
                  </p>
                </div>

                {/* AI Interpretation */}
                <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-slate-700 leading-relaxed text-sm prose max-w-none shadow-sm">
                  <SimpleMarkdownRenderer content={ichingResult.reading} />
                </div>

                {/* Auto Sync I Ching Events Button */}
                {ichingResult.suggestedEvents && ichingResult.suggestedEvents.length > 0 && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg animate-fadeIn">
                    <div>
                      <h4 className="font-extrabold text-sm text-amber-300 m-0 flex items-center gap-1.5">
                        <Sparkles size={16} />
                        Đồng bộ khung giờ quẻ Dịch vào Calendar
                      </h4>
                      <p className="text-xs text-emerald-200 m-0 mt-1">
                        Thêm {ichingResult.suggestedEvents.length} khung giờ chiến lược (hành động, tĩnh tâm) vào Lịch cá nhân.
                      </p>
                    </div>

                    <button
                      onClick={handleSyncIchingEvents}
                      disabled={syncingIchingEvents}
                      className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition-all whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
                    >
                      {syncingIchingEvents ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Đang đồng bộ...
                        </>
                      ) : (
                        <>
                          📅 Thêm vào Calendar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
