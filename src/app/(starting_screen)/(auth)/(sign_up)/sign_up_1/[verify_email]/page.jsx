"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/config/auth-client";
import Link from "next/link";
import "../../../auth.css";
import "./sign_up_2.css";

export default function SignUp2({ params }) {
  const { verify_email: encodeEmail } = React.use(params);
  const email = decodeURIComponent(encodeEmail);
  const router = useRouter();
  const [code, setCode] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setErrMsg("");

    if (code === "") {
      setErrMsg("Vui lòng nhập mã xác nhận");
      setIsLoading(false);
      return;
    }

    try {
      // Verify/consume OTP first to prevent React Strict Mode race conditions on register_information page mount
      const res = await fetch("/api/auth/check-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Mã xác nhận không hợp lệ hoặc đã hết hạn");
      }

      router.push(`/sign_up_1/${encodeEmail}/register_information?code=${code}`);
    } catch (error) {
      setErrMsg(error.message || "Xác nhận thất bại. Vui lòng thử lại.");
      setIsLoading(false);
    }
  }

  async function resendCode() {
    setErrMsg("");
    setSuccessMsg("");
    try {
      await register(email);
      setSuccessMsg("Mã xác nhận mới đã được gửi đến email của bạn");
    } catch (error) {
      setErrMsg("Không thể gửi lại mã. Vui lòng thử lại.");
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
          <div className="auth-icon-container">
            <div className="auth-icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
          </div>

          <div className="verify-header">
            <h1>Xác nhận email</h1>
            <p>Chúng tôi đã gửi mã xác nhận đến</p>
            <p className="verify-email">{email}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
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
            </div>

            {errMsg && <div className="auth-error">{errMsg}</div>}
            {successMsg && <div className="auth-success">{successMsg}</div>}

            <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="auth-spinner"></span>
                  Đang xác nhận...
                </>
              ) : (
                "Xác nhận"
              )}
            </button>
          </form>

          <div className="verify-resend">
            <p>Không nhận được mã?</p>
            <button type="button" className="auth-btn auth-btn-ghost" onClick={resendCode}>
              Gửi lại mã
            </button>
          </div>

          <div className="auth-footer">
            <Link href="/sign_up_1" className="auth-back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Quay lại nhập email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
