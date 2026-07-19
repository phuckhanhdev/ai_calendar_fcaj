"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { verifyEmail } from "@/config/auth-client";
import styles from "./register.module.css";

export default function RegisterInformation({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verify_email: encodeEmail } = React.use(params);
  const email = decodeURIComponent(encodeEmail);
  const verificationCode = searchParams.get("code") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Form fields
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    phone: "",
    gender: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!verificationCode) {
      toast.error("Mã xác nhận không hợp lệ");
      router.push(`/sign_up_1/${encodeEmail}`);
      return;
    }
    fetch("/api/auth/check-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: verificationCode }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid code");
        setLoading(false);
      })
      .catch(() => {
        toast.error("Mã xác nhận không hợp lệ hoặc đã hết hạn");
        router.push(`/sign_up_1/${encodeEmail}`);
      });
  }, [verificationCode, email, encodeEmail, router]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

  const getAgeFromDob = (dob) => {
    if (!dob) return 0;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.lastName.trim()) nextErrors.lastName = "Vui lòng nhập họ";
    if (!form.firstName.trim()) nextErrors.firstName = "Vui lòng nhập tên";

    if (!form.dob) {
      nextErrors.dob = "Vui lòng chọn ngày sinh";
    } else {
      const age = getAgeFromDob(form.dob);
      if (age < 13) {
        nextErrors.dob = "Bạn cần từ 13 tuổi trở lên để đăng ký tài khoản";
      }
    }

    if (!form.phone) {
      nextErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^(\+84|0)\d{9,10}$/.test(form.phone)) {
      nextErrors.phone = "Số điện thoại không hợp lệ";
    }

    if (!form.gender) nextErrors.gender = "Vui lòng chọn giới tính";

    if (!form.password) {
      nextErrors.password = "Vui lòng nhập mật khẩu";
    } else if (!PASSWORD_REGEX.test(form.password)) {
      nextErrors.password =
        "Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt";
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = "Vui lòng nhập lại mật khẩu";
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin đã nhập");
      return;
    }

    setSubmitting(true);
    try {
      const result = await verifyEmail(email, verificationCode, form.password, {
        FName: form.firstName,
        LName: form.lastName,
        Phone_Number: form.phone.startsWith("+") ? form.phone : `+${form.phone}`,
        Date_of_birth: form.dob,
      });

      await fetch("/api/user/information", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          User_ID: result.userId,
          Phone_Number: form.phone.startsWith("+") ? form.phone : `+${form.phone}`,
          Email: email,
          FName: form.firstName,
          LName: form.lastName,
          Date_of_birth: form.dob,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Không thể lưu thông tin đăng ký");
        }
      });

      toast.success("Đăng ký thành công!");
      setTimeout(() => router.push("/sign_in"), 1500);
    } catch (error) {
      toast.error(error.message || "Đăng ký thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang xác thực...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Tạo tài khoản</h1>
          <p>Hoàn tất thông tin cá nhân của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            {/* Row 1: Name */}
            <div className={styles.field}>
              <label>Họ *</label>
              <input
                type="text"
                placeholder="Nguyễn"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                required
                className={errors.lastName ? styles.inputError : ""}
              />
              {errors.lastName ? <span className={styles.errorText}>{errors.lastName}</span> : null}
            </div>
            <div className={styles.field}>
              <label>Tên *</label>
              <input
                type="text"
                placeholder="Văn A"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                required
                className={errors.firstName ? styles.inputError : ""}
              />
              {errors.firstName ? <span className={styles.errorText}>{errors.firstName}</span> : null}
            </div>

            {/* Row 2: Email & Phone */}
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" value={email} disabled className={styles.disabled} />
            </div>
            <div className={styles.field}>
              <label>Số điện thoại *</label>
              <div className={styles.phoneWrapper}>
                <input
                  type="tel"
                  placeholder="0123456789"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  inputMode="numeric"
                  pattern="^(\+84|0)\d{9,10}$"
                  required
                  className={errors.phone ? `${styles.phoneInput} ${styles.inputError}` : styles.phoneInput}
                />
              </div>
              {errors.phone ? <span className={styles.errorText}>{errors.phone}</span> : null}
            </div>

            {/* Row 3: DOB & Gender */}
            <div className={styles.field}>
              <label>Ngày sinh *</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => update("dob", e.target.value)}
                required
                className={errors.dob ? styles.inputError : ""}
              />
              {errors.dob ? <span className={styles.errorText}>{errors.dob}</span> : null}
            </div>
            <div className={styles.field}>
              <label>Giới tính *</label>
              <div className={`${styles.genderGroup} ${errors.gender ? styles.genderError : ""}`}>
                {[
                  { value: "Male", label: "Nam" },
                  { value: "Female", label: "Nữ" },
                  { value: "Other", label: "Khác" },
                ].map((g) => (
                  <label key={g.value} className={styles.genderOption}>
                    <input
                      type="radio"
                      name="gender"
                      value={g.value}
                      checked={form.gender === g.value}
                      onChange={(e) => update("gender", e.target.value)}
                    />
                    <span>{g.label}</span>
                  </label>
                ))}
              </div>
              {errors.gender ? <span className={styles.errorText}>{errors.gender}</span> : null}
            </div>

            {/* Row 4: Password */}
            <div className={styles.field}>
              <label>Mật khẩu *</label>
              <input
                type="password"
                placeholder="Mật khẩu tối thiểu 8 ký tự"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className={errors.password ? styles.inputError : ""}
              />
              {errors.password ? <span className={styles.errorText}>{errors.password}</span> : null}
            </div>
            <div className={styles.field}>
              <label>Xác nhận mật khẩu *</label>
              <input
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                className={errors.confirmPassword ? styles.inputError : ""}
              />
              {errors.confirmPassword ? (
                <span className={styles.errorText}>{errors.confirmPassword}</span>
              ) : null}
            </div>
          </div>

          {/* Summary */}
          <div className={styles.summary}>
            <h3>Xác nhận thông tin</h3>
            <div className={styles.summaryGrid}>
              <span>Họ tên:</span>
              <span>{form.lastName} {form.firstName || "—"}</span>
              <span>Email:</span>
              <span>{email}</span>
              <span>SĐT:</span>
              <span>{form.phone || "—"}</span>
              <span>Ngày sinh:</span>
              <span>{form.dob || "—"}</span>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => router.push("/sign_in")}
            >
              Quay lại
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={submitting}
            >
              {submitting ? "Đang xử lý..." : "Hoàn tất đăng ký"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
