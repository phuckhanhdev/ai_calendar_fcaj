"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { register, getCurrentUser } from "@/config/auth-client";
import Link from "next/link";
import "../../auth.css";
import "./sign_up.css";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [check, setCheck] = useState(false);
  const [err, setErr] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) {
        router.push("/");
      }
    });
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setErr("");

    if (email === "") {
      setErr("Vui lòng nhập email của bạn");
      setIsLoading(false);
      return;
    } else if (!check) {
      setErr("Vui lòng đồng ý với điều khoản sử dụng");
      setIsLoading(false);
      return;
    }

    try {
      await register(email);
      router.push(`/sign_up_1/${encodeURIComponent(email)}`);
    } catch (error) {
      setErr(error.message || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#F47521", display: "flex", alignItems: "center", gap: "8px" }}>
            📅 AI Destiny Calendar
          </div>
        </Link>
      </div>

      <div className="auth-card">
        <div className="auth-card-header">
          <h1>Tạo tài khoản mới</h1>
          <p>Đăng ký để sử dụng Lịch Năng Lượng AI</p>
        </div>

        <div className="auth-card-body">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label className="auth-form-label">Email</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  type="email"
                  className="auth-form-input"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-checkbox-group">
              <input
                type="checkbox"
                className="auth-checkbox"
                id="terms"
                checked={check}
                onChange={() => setCheck(!check)}
              />
              <label htmlFor="terms" className="auth-checkbox-label">
                Tôi đồng ý với <Link href="/term">Điều khoản sử dụng</Link> và{" "}
                <Link href="/privacy">Chính sách bảo mật</Link>
              </label>
            </div>

            {err && <div className="auth-error">{err}</div>}

            <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="auth-spinner"></span>
                  Đang xử lý...
                </>
              ) : (
                "Tiếp tục"
              )}
            </button>
          </form>

          <div className="auth-footer">
            Đã có tài khoản? <Link href="/sign_in">Đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
