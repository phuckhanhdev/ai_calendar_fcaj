"use client";

import Link from "next/link";

export default function TermsAndConditions() {
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
            href="/sign_up_1"
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
            Quay lại trang Đăng ký
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-400 to-indigo-600">
            Điều Khoản Sử Dụng
          </h1>
          <p className="text-slate-400 mt-3 text-sm">Cập nhật lần cuối: Ngày 31 tháng 07 năm 2026</p>
        </div>

        {/* Clauses */}
        <div className="space-y-10 text-slate-300 leading-relaxed">
          {/* Clause 1 */}
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono mr-3 text-sm">
                01
              </span>
              Chấp Thuận Các Điều Khoản
            </h2>
            <p className="pl-11">
              Bằng việc đăng ký tài khoản và sử dụng ứng dụng <strong>LifeSync AI Calendar</strong>, bạn
              đồng ý tuân thủ và bị ràng buộc bởi các điều khoản sử dụng này. Nếu bạn không đồng ý với bất kỳ phần
              nào của các điều khoản này, vui lòng không tiếp tục sử dụng ứng dụng.
            </p>
          </section>

          {/* Clause 2 */}
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono mr-3 text-sm">
                02
              </span>
              Đăng Ký & Bảo Mật Tài Khoản
            </h2>
            <div className="pl-11 space-y-3">
              <p>
                Để sử dụng các tính năng cá nhân hóa lịch trình và trợ lý AI, bạn cần đăng ký tài khoản thông qua
                email và xác thực bằng mã OTP. Bạn có trách nhiệm:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-400">
                <li>Cung cấp thông tin email chính xác và duy trì quyền sở hữu email đó.</li>
                <li>Bảo mật thông tin đăng nhập và mã xác thực cá nhân.</li>
                <li>Thông báo ngay cho quản trị viên nếu phát hiện bất kỳ hành vi truy cập trái phép nào vào tài khoản.</li>
              </ul>
            </div>
          </section>

          {/* Clause 3 */}
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono mr-3 text-sm">
                03
              </span>
              Quyền Riêng Tư & Bảo Mật Dữ Liệu
            </h2>
            <p className="pl-11">
              Chúng tôi cam kết bảo vệ dữ liệu cá nhân của bạn. Mọi dữ liệu về sự kiện lịch trình, danh sách bạn bè
              và các đoạn hội thoại trò chuyện với Trợ lý AI đều được mã hóa lưu trữ an toàn trên hạ tầng của Amazon Web Services (AWS).
              Thông tin của bạn sẽ không bao giờ được chia sẻ với bên thứ ba mà không có sự đồng ý của bạn.
            </p>
          </section>

          {/* Clause 4 */}
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono mr-3 text-sm">
                04
              </span>
              Sử Dụng Trợ Lý Trí Tuệ Nhân Tạo (AI)
            </h2>
            <p className="pl-11">
              Hệ thống tích hợp công nghệ xử lý ngôn ngữ tự nhiên thông minh của mô hình AI để hỗ trợ tự động phân
              tích sự kiện và gợi ý sắp xếp lịch trình. Bạn hiểu và đồng ý rằng các câu trả lời của AI chỉ mang tính chất
              tham khảo hỗ trợ ra quyết định cá nhân, và bạn hoàn toàn chịu trách nhiệm về lịch trình thực tế của mình.
            </p>
          </section>

          {/* Clause 5 */}
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono mr-3 text-sm">
                05
              </span>
              Gói Đăng Ký (Subscription) & Thanh Toán
            </h2>
            <p className="pl-11">
              Ứng dụng hỗ trợ nâng cấp gói tài khoản Premium thông qua quét mã VietQR để mở khóa thêm các tính năng
              nhóm và dung lượng đính kèm file S3 lớn hơn. Mọi giao dịch chuyển khoản sau khi được hệ thống tự động xác nhận
              thành công sẽ không được hoàn trả dưới bất kỳ hình thức nào.
            </p>
          </section>
        </div>

        {/* Footer Link */}
        <div className="mt-12 text-center">
          <Link
            href="/sign_up_1"
            className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/25 active:scale-[0.98]"
          >
            Đồng ý và Quay lại trang Đăng ký
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center text-xs text-slate-500">
          <p>© 2026 LifeSync AI Calendar. All rights reserved.</p>
          <p className="mt-1">Hệ thống Lịch thông minh phân tích thời gian thực tế hỗ trợ bởi Trí tuệ Nhân tạo AWS & Gemini.</p>
        </div>
      </footer>
    </div>
  );
}
