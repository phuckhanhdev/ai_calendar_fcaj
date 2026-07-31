"use client";

import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-purple-500/30">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 relative z-10">
        {/* Header */}
        <div className="border-b border-slate-800 pb-8 mb-10 text-center md:text-left">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 transition-colors mb-6 group"
          >
            <svg
              className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại Trang chủ
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-400 to-indigo-600">
            Chính Sách Bảo Mật Quyền Riêng Tư
          </h1>
          <p className="text-slate-400 mt-3 text-sm">Cập nhật lần cuối: Ngày 31 tháng 07 năm 2026</p>
        </div>

        {/* Clauses */}
        <div className="space-y-10 text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono mr-3 text-sm">
                01
              </span>
              Thu Thập Thông Tin Cá Nhân
            </h2>
            <p className="pl-11">
              Ứng dụng <strong>LifeSync AI Calendar</strong> thu thập các thông tin tối thiểu cần thiết để phục vụ trải nghiệm người dùng bao gồm: Địa chỉ Email, Họ và tên, Ngày tháng năm sinh (để tính Cung Hoàng Đạo), Giới tính, Tọa độ vị trí GPS (khi được bạn cấp quyền) và Ảnh đại diện được lưu trữ an toàn trên Amazon S3.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono mr-3 text-sm">
                02
              </span>
              Mục Đích Sử Dụng Dữ Liệu
            </h2>
            <div className="pl-11 space-y-3 text-slate-300">
              <p>Dữ liệu của bạn chỉ được sử dụng cho các mục đích sau:</p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-400">
                <li>Phân tích thời gian trống và tối ưu lịch trình cá nhân bằng mô hình Trợ lý AI (Google Gemini & AWS Bedrock).</li>
                <li>Gợi ý Top 3 rạp CGV gần nhất dựa trên khoảng cách địa lý (Thuật toán Haversine & Nam rước Nữ).</li>
                <li>Hiển thị màu may mắn và Tử vi bản mệnh dựa trên ngày sinh.</li>
                <li>Gửi thông báo nhắc nhở sự kiện và đồng bộ lịch họp với bạn bè.</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono mr-3 text-sm">
                03
              </span>
              Bảo Mật Đa Lớp Trên AWS
            </h2>
            <p className="pl-11">
              Toàn bộ dữ liệu của bạn được bảo vệ bởi hạ tầng điện toán đám mây <strong>Amazon Web Services (AWS)</strong> với mã hóa SSL/TLS 1.3, Tường lửa ứng dụng web <strong>AWS WAF (Web Application Firewall)</strong> ngăn chặn SQL Injection/DDoS và Cơ sở dữ liệu <strong>Amazon RDS MySQL</strong> được mã hóa an toàn.
            </p>
          </section>

          {/* Section 4 */}
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono mr-3 text-sm">
                04
              </span>
              Quyền Kiểm Soát & Xóa Dữ Liệu
            </h2>
            <p className="pl-11">
              Bạn có toàn quyền xem, chỉnh sửa thông tin cá nhân, xóa ảnh đại diện hoặc dọn dẹp lịch sử trò chuyện AI bất kỳ lúc nào. Tin nhắn trò chuyện AI cũ sẽ tự động được hệ thống dọn dẹp sau 3 ngày để bảo vệ quyền riêng tư tuyệt đối.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono mr-3 text-sm">
                05
              </span>
              Liên Hệ Ban Quản Trị
            </h2>
            <p className="pl-11">
              Nếu bạn có bất kỳ thắc mắc hoặc yêu cầu đóng góp nào liên quan đến Chính sách bảo mật, vui lòng liên hệ bộ phận hỗ trợ LifeSync qua Email: <a href="mailto:support@phuckhanh.id.vn" className="text-purple-400 underline hover:text-purple-300">support@phuckhanh.id.vn</a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-8 text-center text-slate-500 text-sm relative z-10">
        <p>© 2026 LifeSync AI Calendar. Bảo lưu mọi quyền.</p>
        <div className="mt-2 space-x-4">
          <Link href="/term" className="text-slate-400 hover:text-white transition-colors">
            Điều Khoản Sử Dụng
          </Link>
          <span>•</span>
          <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">
            Chính Sách Bảo Mật
          </Link>
        </div>
      </footer>
    </div>
  );
}
