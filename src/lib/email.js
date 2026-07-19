import nodemailer from "nodemailer";

/**
 * Khởi tạo Primary SMTP Transporter (AWS SES)
 */
function getPrimaryTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true cho 465, false cho các cổng khác
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 6000, // 6 giây timeout để chuyển fallback nhanh hơn
    greetingTimeout: 6000,
  });
}

/**
 * Khởi tạo Fallback SMTP Transporter (Google SMTP)
 */
function getFallbackTransporter() {
  if (!process.env.GOOGLE_SMTP_USER || !process.env.GOOGLE_SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.GOOGLE_SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.GOOGLE_SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.GOOGLE_SMTP_USER,
      pass: process.env.GOOGLE_SMTP_PASS,
    },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
  });
}

/**
 * Hàm gửi mail chung hỗ trợ chuyển đổi dự phòng (Failover)
 */
async function sendMailWithFailover(mailOptions) {
  // 1. Thử gửi bằng AWS SES (Primary)
  const primaryTransporter = getPrimaryTransporter();
  if (primaryTransporter) {
    try {
      console.log("⚡ [Email Service] Đang gửi email qua AWS SES SMTP (Primary)...");
      const info = await primaryTransporter.sendMail({
        ...mailOptions,
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
      });
      console.log("✅ [Email Service] Gửi qua AWS SES thành công. Message ID:", info.messageId);
      return { success: true, provider: "AWS SES (Primary)", messageId: info.messageId };
    } catch (error) {
      console.warn("⚠️ [Email Service] Gửi qua AWS SES thất bại. Lỗi:", error.message);
    }
  } else {
    console.log("ℹ️ [Email Service] Chưa cấu hình hoặc thiếu thông tin AWS SES SMTP.");
  }

  // 2. Thử gửi bằng Google SMTP (Fallback)
  const fallbackTransporter = getFallbackTransporter();
  if (fallbackTransporter) {
    try {
      console.log("🔄 [Email Service] Đang chuyển sang gửi dự phòng qua Google SMTP...");
      const info = await fallbackTransporter.sendMail({
        ...mailOptions,
        from: process.env.GOOGLE_SMTP_USER, // Gmail bắt buộc From khớp tài khoản gửi
      });
      console.log("✅ [Email Service] Gửi qua Google SMTP thành công. Message ID:", info.messageId);
      return { success: true, provider: "Google SMTP (Fallback)", messageId: info.messageId };
    } catch (error) {
      console.error("❌ [Email Service] Cả AWS SES và Google SMTP dự phòng đều thất bại. Lỗi cuối:", error.message);
      return { success: false, error: `Cả hai hệ thống gửi mail đều lỗi: ${error.message}` };
    }
  } else {
    console.warn("⚠️ [Email Service] Chưa cấu hình Google SMTP dự phòng trong .env.local.");
    return { success: false, error: "Hệ thống mail chính gặp lỗi và chưa cấu hình mail dự phòng." };
  }
}

/**
 * Gửi mã xác thực đăng ký tài khoản (OTP)
 */
export async function sendVerificationEmail(email, code) {
  const mailOptions = {
    to: email,
    subject: "[AI Destiny Calendar] Mã xác nhận đăng ký tài khoản",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #F47521 0%, #e5651a 100%); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">📅 AI Destiny Calendar</h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #333333; line-height: 1.6;">
          <h2 style="color: #1a1a1a; margin-top: 0; font-size: 20px; font-weight: 600;">Xác thực tài khoản của bạn</h2>
          <p>Cảm ơn bạn đã đăng ký sử dụng Lịch Năng Lượng AI. Mã OTP xác nhận đăng ký tài khoản của bạn là:</p>
          <div style="background-color: #fff5f0; border: 1px dashed #f47521; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <h1 style="color: #F47521; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold;">${code}</h1>
          </div>
          <p style="color: #666666; font-size: 14px;">Mã xác nhận này sẽ hết hiệu lực trong vòng <b>10 phút</b>.</p>
          <p style="color: #999999; font-size: 13px; margin-bottom: 0;">Nếu bạn không yêu cầu đăng ký tài khoản này, vui lòng bỏ qua email.</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 16px; text-align: center; border-top: 1px solid #eeeeee; color: #999999; font-size: 12px;">
          © AI Destiny Calendar Team
        </div>
      </div>
    `,
  };

  return sendMailWithFailover(mailOptions);
}

/**
 * Gửi mã đặt lại mật khẩu
 */
export async function sendPasswordResetEmail(email, code) {
  const mailOptions = {
    to: email,
    subject: "[AI Destiny Calendar] Mã khôi phục mật khẩu",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #F47521 0%, #e5651a 100%); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">📅 AI Destiny Calendar</h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #333333; line-height: 1.6;">
          <h2 style="color: #1a1a1a; margin-top: 0; font-size: 20px; font-weight: 600;">Khôi phục mật khẩu</h2>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Mã OTP để đặt lại mật khẩu là:</p>
          <div style="background-color: #fff5f0; border: 1px dashed #f47521; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <h1 style="color: #F47521; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold;">${code}</h1>
          </div>
          <p style="color: #666666; font-size: 14px;">Mã khôi phục này sẽ hết hiệu lực trong vòng <b>10 phút</b>.</p>
          <p style="color: #999999; font-size: 13px; margin-bottom: 0;">Nếu bạn không gửi yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này để bảo vệ tài khoản.</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 16px; text-align: center; border-top: 1px solid #eeeeee; color: #999999; font-size: 12px;">
          © AI Destiny Calendar Team
        </div>
      </div>
    `,
  };

  return sendMailWithFailover(mailOptions);
}
