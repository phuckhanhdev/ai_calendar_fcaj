"use client";

import React, { useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AppLayout from "@/components/layouts/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { Check, ShieldCheck, Zap, QrCode, AlertCircle, Copy } from "lucide-react";

interface PaymentInfo {
  bankId: string;
  accountNo: string;
  accountName: string;
  price: number;
}

export default function SubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [confirmingTransfer, setConfirmingTransfer] = useState(false);

  // Trigger QR generation and open payment modal
  const handleUpgrade = async () => {
    setLoadingUpgrade(true);
    try {
      const res = await fetch("/api/subscription/payment-info");
      if (res.ok) {
        const data = await res.json();
        setPaymentInfo({
          bankId: data.bankId,
          accountNo: data.accountNo,
          accountName: data.accountName,
          price: data.price
        });
        setShowQRModal(true);
      } else {
        toast.error("Không thể tải thông tin cổng thanh toán.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối cổng thanh toán.");
    } finally {
      setLoadingUpgrade(false);
    }
  };

  // Simulate payment confirmation callback (webhooks)
  const handleConfirmTransfer = async () => {
    setConfirmingTransfer(true);
    try {
      const res = await fetch("/api/subscription/confirm-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Tài khoản của bạn đã được nâng cấp lên gói Premium!");
        setShowQRModal(false);
        await refreshUser(); // Update frontend user session immediately
      } else {
        toast.error("Không thể xác nhận giao dịch.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi xác nhận chuyển khoản.");
    } finally {
      setConfirmingTransfer(false);
    }
  };

  // Helper to generate the VietQR image url
  const getQRUrl = () => {
    if (!paymentInfo || !user) return "";
    const description = encodeURIComponent(`SUB PREMIUM_life_ai USER ${user.User_ID || user.id}`);
    return `https://img.vietqr.io/image/${paymentInfo.bankId}-${paymentInfo.accountNo}-qr_only.jpg?amount=${paymentInfo.price}&addInfo=${description}`;
  };

  // Helper to copy text to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép vào bộ nhớ tạm!");
  };

  const isPremium = user?.Subscription_Status === "premium";

  return (
    <AppLayout>
      <PageHeader
        title="Nâng cấp Premium"
        description="Chọn gói dịch vụ phù hợp để mở khoá tính năng phân tích tử vi và trợ lý AI không giới hạn"
      />

      {/* Usage limits / subscription status banner */}
      {isPremium ? (
        <div className="bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-200 rounded-3xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ background: "linear-gradient(to right, rgba(16, 185, 129, 0.05), rgba(99, 102, 241, 0.05))" }}>
          <div>
            <h3 className="text-sm font-extrabold text-emerald-800 m-0 flex items-center gap-1.5">
              <span>🌟</span> Tài khoản của bạn đã được kích hoạt gói Premium!
            </h3>
            <p className="text-xs text-slate-500 m-0 mt-1 font-medium">Bạn có quyền truy cập không giới hạn mọi tính năng bản mệnh học và trợ lý lập lịch AI.</p>
          </div>
          <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-xs font-black uppercase tracking-wider select-none shadow-sm">
            Premium Active
          </span>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-indigo-50 to-orange-50 border border-slate-200 rounded-3xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ background: "linear-gradient(to right, rgba(99, 102, 241, 0.05), rgba(244, 117, 33, 0.05))" }}>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 m-0">Tài khoản miễn phí của bạn</h3>
            <p className="text-xs text-slate-500 m-0 mt-1 font-medium">Nâng cấp lên gói Premium để khám phá toàn bộ tiềm năng bản đồ ma trận định mệnh.</p>
          </div>
          <span className="px-4 py-1.5 bg-slate-200 text-slate-600 rounded-full text-xs font-black uppercase tracking-wider select-none border border-slate-350">
            Gói Free
          </span>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
        {/* Free Plan */}
        <Card title="Gói Miễn Phí (Free)" subtitle="Các tính năng lịch trình cơ bản">
          <div className="py-4">
            <span className="text-3xl font-black text-slate-800">0đ</span>
            <span className="text-xs text-slate-400 font-semibold ml-1">/ tháng</span>
          </div>
          <ul className="space-y-3.5 my-6 text-xs text-slate-600 pl-0 font-medium">
            <li className="flex items-center gap-2">
              <Check size={16} className="text-emerald-500 shrink-0" />
              Lịch cá nhân tiêu chuẩn
            </li>
            <li className="flex items-center gap-2">
              <Check size={16} className="text-emerald-500 shrink-0" />
              Xem bản mệnh & tử vi cơ bản
            </li>
            <li className="flex items-center gap-2 text-slate-300">
              <XIcon />
              Lập lịch nhóm thông minh
            </li>
            <li className="flex items-center gap-2 text-slate-300">
              <XIcon />
              Trợ lý AI tự động đề xuất lịch
            </li>
          </ul>
          <Button variant="secondary" className="w-full" disabled={!isPremium}>
            {!isPremium ? "Đang sử dụng" : "Miễn phí"}
          </Button>
        </Card>

        {/* Premium Plan */}
        <div className={`bg-white border-2 rounded-3xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 relative overflow-hidden ${
          isPremium ? "border-emerald-500" : "border-indigo-500"
        }`}>
          {/* Best value tag */}
          <div className={`absolute top-0 right-0 text-white text-[10px] uppercase font-black px-4 py-1 rounded-bl-xl tracking-wider flex items-center gap-1 ${
            isPremium ? "bg-emerald-500" : "bg-indigo-500"
          }`}>
            <Zap size={10} className="fill-white text-white" />
            {isPremium ? "Đang sở hữu" : "Khuyên dùng"}
          </div>
          
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4 mb-4">
            <span className="text-xl">🔮</span>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 m-0">Gói Bản Mệnh (Premium)</h3>
              <p className="text-xs text-slate-400 m-0 font-medium">Trọn bộ trợ năng AI và tử vi</p>
            </div>
          </div>

          <div className="py-4">
            <span className="text-3xl font-black text-indigo-650" style={{ color: "#4f46e5" }}>99.000đ</span>
            <span className="text-xs text-slate-400 font-semibold ml-1">/ tháng</span>
          </div>
          
          <ul className="space-y-3.5 my-6 text-xs text-slate-600 pl-0 font-medium">
            <li className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
              Toàn bộ tính năng Lịch cá nhân nâng cao
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
              Xem chi tiết Ma trận Định mệnh (luân xa năng lượng)
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
              Trợ lý AI tự động phân tích trống & chèn lịch trình
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
              Nhập lịch nhanh chóng từ Google Calendar (.ics)
            </li>
          </ul>
          
          <Button
            onClick={handleUpgrade}
            loading={loadingUpgrade}
            className="w-full"
            disabled={isPremium}
          >
            {isPremium ? "Gói đã kích hoạt" : "Nâng cấp ngay"}
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📥 MODAL THANH TOÁN CHUYỂN KHOẢN VIETQR */}
      {/* ========================================================================= */}
      {showQRModal && paymentInfo && user && (
        <div className="modal-overlay">
          <div className="modal-card max-w-lg p-6">
            <div className="modal-header border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 m-0 flex items-center gap-1.5">
                <QrCode size={18} className="text-indigo-500" />
                Thanh toán qua quét mã VietQR
              </h3>
              <button 
                onClick={() => setShowQRModal(false)} 
                className="modal-close-btn text-2xl font-semibold bg-transparent border-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="modal-body py-4 flex flex-col md:flex-row gap-6 items-center">
              {/* Left Column: QR Code Image */}
              <div className="flex flex-col items-center gap-2 shrink-0 bg-slate-50 p-4 border border-slate-150 rounded-2xl">
                <img 
                  src={getQRUrl()} 
                  alt="VietQR Payment Code" 
                  className="w-48 h-48 object-contain rounded-lg shadow-sm"
                />
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Quét qua App ngân hàng</span>
              </div>

              {/* Right Column: Transaction Details */}
              <div className="flex-1 space-y-3.5 text-xs text-slate-600 font-medium w-full">
                <div className="p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-xl space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Ngân hàng:</span>
                    <span className="font-extrabold text-slate-800">{paymentInfo.bankId}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Số tài khoản:</span>
                    <span className="font-extrabold text-slate-800">{paymentInfo.accountNo}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Chủ tài khoản:</span>
                    <span className="font-extrabold text-slate-800">{paymentInfo.accountName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Số tiền:</span>
                    <span className="font-black text-indigo-600">
                      {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(paymentInfo.price)}
                    </span>
                  </div>
                </div>

                {/* Transfer Note (Important) */}
                <div className="p-3 bg-orange-50 border border-orange-200/60 rounded-xl flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-orange-800 flex items-center gap-1">
                      <AlertCircle size={14} /> Nội dung ghi chú bắt buộc:
                    </span>
                    <button 
                      onClick={() => handleCopy(`SUB PREMIUM_life_ai USER ${user.User_ID || user.id}`)}
                      className="p-1 text-orange-600 hover:bg-orange-100 rounded cursor-pointer border-none bg-transparent"
                      title="Sao chép nội dung"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  <p className="font-mono text-center font-black text-sm text-orange-950 bg-white/80 border border-orange-150 py-1.5 rounded-lg m-0 select-all">
                    SUB PREMIUM_life_ai USER {user.User_ID || user.id}
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-actions border-t border-slate-100 pt-3 flex gap-3 justify-end">
              <Button
                onClick={() => setShowQRModal(false)}
                variant="secondary"
                className="text-xs font-bold px-4 py-2"
              >
                Hủy bỏ
              </Button>
              <Button
                onClick={handleConfirmTransfer}
                loading={confirmingTransfer}
                className="text-xs font-bold px-4 py-2"
              >
                Xác nhận đã chuyển khoản
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// X icon helper
function XIcon() {
  return (
    <svg className="h-4 w-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
