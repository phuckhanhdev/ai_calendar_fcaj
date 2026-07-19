"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { forgotPassword, resetPassword } from "@/config/auth-client";
import Link from "next/link";
import "../../auth.css";
import "./forgot_password.css";

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: email, 2: code + password
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSendCode(e) {
    e.preventDefault();
    setIsLoading(true);
    setErr("");

    if (email === "") {
      setErr("Vui lòng nhập địa chỉ email");
      setIsLoading(false);
      return;
    }

    try {
      await forgotPassword(email);
      setStep(2);
      setSuccessMsg("Mã xác nhận đã được gửi đến email của bạn");
    } catch (error) {
      setErr(error.message || "Không thể gửi mã. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setIsLoading(true);
    setErr("");
    setSuccessMsg("");

    if (code === "") {
      setErr("Vui lòng nhập mã xác nhận");
      setIsLoading(false);
      return;
    }
    if (password === "" || confirmPassword === "") {
      setErr("Vui lòng nhập đầy đủ mật khẩu");
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setErr("Mật khẩu phải có ít nhất 6 ký tự");
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setErr("Mật khẩu không khớp");
      setIsLoading(false);
      return;
    }

    try {
      await resetPassword(email, code, password);
      setSuccessMsg("Mật khẩu đã được đặt lại thành công!");
      setTimeout(() => router.push("/sign_in"), 2000);
    } catch (error) {
      setErr(error.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    setErr("");
    setSuccessMsg("");
    try {
      await forgotPassword(email);
      setSuccessMsg("Mã xác nhận mới đã được gửi đến email của bạn");
    } catch (error) {
      setErr("Không thể gửi lại mã. Vui lòng thử lại.");
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
        <div className="auth-card-body">
          {/* Step indicator */}
          <div className="forgot-steps">
            <div className={`forgot-step ${step >= 1 ? "active" : ""}`}>
              <span className="forgot-step-number">1</span>
              <span className="forgot-step-label">Nhập email</span>
            </div>
            <div className="forgot-step-line"></div>
            <div className={`forgot-step ${step >= 2 ? "active" : ""}`}>
              <span className="forgot-step-number">2</span>
              <span className="forgot-step-label">Đặt mật khẩu mới</span>
            </div>
          </div>

          {/* Step 1: Enter Email */}
          {step === 1 && (
            <>
              <div className="auth-icon-container">
                <div className="auth-icon-circle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>

              <div className="forgot-header">
                <h1>Quên mật khẩu?</h1>
                <p>Nhập email để nhận mã đặt lại mật khẩu</p>
              </div>

              <form className="auth-form" onSubmit={handleSendCode}>
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

                {err && <div className="auth-error">{err}</div>}

                <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="auth-spinner"></span>
                      Đang gửi...
                    </>
                  ) : (
                    "Gửi mã xác nhận"
                  )}
                </button>
              </form>

              <div className="auth-footer">
                <Link href="/sign_in" className="auth-back">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Quay lại đăng nhập
                </Link>
              </div>
            </>
          )}

          {/* Step 2: Enter Code + New Password */}
          {step === 2 && (
            <>
              <div className="forgot-header">
                <h1>Đặt lại mật khẩu</h1>
                <p>Nhập mã xác nhận và mật khẩu mới</p>
              </div>

              <form className="auth-form" onSubmit={handleResetPassword}>
                <div className="auth-form-group">
                  <label className="auth-form-label">Mã xác nhận</label>
                  <input
                    type="text"
                    className="auth-code-input"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                  <button type="button" className="forgot-resend" onClick={handleResendCode}>
                    Gửi lại mã
                  </button>
                </div>

                <div className="auth-form-group">
                  <label className="auth-form-label">Mật khẩu mới</label>
                  <div className="auth-input-wrapper">
                    <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type="password"
                      className="auth-form-input"
                      placeholder="Ít nhất 6 ký tự"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-form-group">
                  <label className="auth-form-label">Xác nhận mật khẩu</label>
                  <div className="auth-input-wrapper">
                    <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type="password"
                      className="auth-form-input"
                      placeholder="Nhập lại mật khẩu"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                {err && <div className="auth-error">{err}</div>}
                {successMsg && <div className="auth-success">{successMsg}</div>}

                <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="auth-spinner"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    "Đặt lại mật khẩu"
                  )}
                </button>
              </form>

              <div className="auth-footer">
                <button type="button" className="auth-back" onClick={() => setStep(1)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Quay lại
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
