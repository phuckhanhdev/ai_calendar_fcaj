"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import "../auth.css";
import "./sign_in.css";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, loginUser, refreshUser } = useAuth();

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  // Load Google Identity Services script and initialize button
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    // Load SDK script dynamically
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("googleButton"),
          {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
            shape: "rectangular"
          }
        );
      }
    };

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  async function handleGoogleCredentialResponse(response) {
    setIsLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng nhập Google thất bại");
      }
      // Refresh Auth Context to set user state
      await refreshUser();
      router.push("/");
    } catch (error) {
      console.error("Google auth error:", error);
      setErr(error.message || "Không thể xác thực tài khoản Google");
      setIsLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setErr("");

    if (email === "") {
      setErr("Vui lòng nhập email của bạn");
      setIsLoading(false);
      return;
    } else if (password === "") {
      setErr("Vui lòng nhập mật khẩu");
      setIsLoading(false);
      return;
    }

    try {
      const result = await loginUser(email, password);
      
      if (result && result.userId && result.email) {
        router.push("/");
      } else {
        setErr("Đăng nhập thất bại. Vui lòng thử lại.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setErr(error.message || "Email hoặc mật khẩu không đúng");
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
          <h1>Chào mừng trở lại!</h1>
          <p>Đăng nhập để xem lịch năng lượng của bạn</p>
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

            <div className="auth-form-group">
              <label className="auth-form-label">Mật khẩu</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="password"
                  className="auth-form-input"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="signin-forgot">
              <Link href="/sign_in/forgot_password" className="auth-link">
                Quên mật khẩu?
              </Link>
            </div>

            {err && <div className="auth-error">{err}</div>}

            <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="auth-spinner"></span>
                  Đang đăng nhập...
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>

          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <div className="google-login-section" style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "10px" }}>
                <div style={{ flex: 1, height: "1px", backgroundColor: "#334155" }}></div>
                <span style={{ fontSize: "13px", color: "#64748b" }}>Hoặc</span>
                <div style={{ flex: 1, height: "1px", backgroundColor: "#334155" }}></div>
              </div>
              <div className="google-signin-wrapper" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                <div id="googleButton" style={{ width: "100%" }}></div>
              </div>
            </div>
          )}

          <div className="auth-footer">
            Chưa có tài khoản? <Link href="/sign_up_1">Đăng ký ngay</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
