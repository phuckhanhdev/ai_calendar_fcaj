import connectToDatabase from "@/database/connection";
import crypto from "crypto";

const db = connectToDatabase();

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}

/**
 * Lấy thông tin user bằng Email
 */
export async function getUserByEmail(email) {
  const sql = "SELECT * FROM `USER` WHERE Email = ?";
  const result = await runQuery(sql, [email]);
  return result && result.length > 0 ? result[0] : null;
}

/**
 * Lấy thông tin user bằng ID
 */
export async function getUserById(userId) {
  const sql = "SELECT * FROM `USER` WHERE User_ID = ?";
  const result = await runQuery(sql, [userId]);
  return result && result.length > 0 ? result[0] : null;
}

/**
 * Tạo mới user
 */
export async function createUser(email, hashedPassword, userData) {
  const userId = crypto.randomUUID();
  const sql = `
    INSERT INTO \`USER\` (User_ID, Email, Password, FName, LName, Phone_Number, Date_of_birth, Email_Verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `;
  
  await runQuery(sql, [
    userId,
    email,
    hashedPassword,
    userData.FName || "",
    userData.LName || "",
    userData.Phone_Number || "",
    userData.Date_of_birth || null
  ]);

  return { userId, email };
}

/**
 * Cập nhật thông tin profile của User
 */
export async function updateUserProfile(userId, FName, LName, Phone_Number, Date_of_birth, Birth_Time = null, Avatar_Url = null) {
  const sql = `
    UPDATE \`USER\`
    SET 
      FName = ?, 
      LName = ?, 
      Phone_Number = ?, 
      Date_of_birth = ?,
      Birth_Time = COALESCE(?, Birth_Time),
      Avatar_Url = COALESCE(?, Avatar_Url)
    WHERE User_ID = ?
  `;
  return await runQuery(sql, [FName, LName, Phone_Number, Date_of_birth, Birth_Time, Avatar_Url, userId]);
}

/**
 * Cập nhật mật khẩu của User
 */
export async function updateUserPassword(email, hashedPassword) {
  const sql = "UPDATE `USER` SET Password = ? WHERE Email = ?";
  return await runQuery(sql, [hashedPassword, email]);
}

/**
 * Lưu mã xác thực OTP gửi qua email
 */
export async function storeVerificationCode(email, code) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Hết hạn sau 1 giờ
  const sql = `
    INSERT INTO VERIFICATION_CODES (email, code, expires_at) 
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE code = ?, expires_at = ?
  `;
  return await runQuery(sql, [email, code, expiresAt, code, expiresAt]);
}

/**
 * Kiểm tra mã xác thực OTP
 */
export async function verifyCode(email, code, shouldDelete = true) {
  const sql = `
    SELECT * FROM VERIFICATION_CODES 
    WHERE email = ? AND code = ? AND expires_at > NOW()
  `;
  const result = await runQuery(sql, [email, code]);
  
  if (result && result.length > 0) {
    if (shouldDelete) {
      const deleteSql = `DELETE FROM VERIFICATION_CODES WHERE email = ? AND code = ?`;
      await runQuery(deleteSql, [email, code]);
    }
    return true;
  }
  return false;
}

/**
 * Xóa/Tiêu thụ mã xác thực một cách an toàn (Single-use)
 */
export async function consumeVerificationCode(email, code) {
  const sql = `
    DELETE FROM VERIFICATION_CODES
    WHERE email = ? AND code = ? AND expires_at > NOW()
    LIMIT 1
  `;
  const result = await runQuery(sql, [email, code]);
  return (result?.affectedRows || 0) > 0;
}
