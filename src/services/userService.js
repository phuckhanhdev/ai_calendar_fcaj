import * as userModel from "@/models/userModel";

/**
 * Lấy thông tin hồ sơ của người dùng
 */
export async function getUserProfile(userId) {
  return await userModel.getUserById(userId);
}

/**
 * Cập nhật thông tin hồ sơ
 */
export async function updateUserProfile(userId, profileData) {
  const { FName, LName, Phone_Number, Date_of_birth, Birth_Time, Avatar_Url, Gender, Latitude, Longitude } = profileData;
  return await userModel.updateUserProfile(
    userId,
    FName,
    LName,
    Phone_Number,
    Date_of_birth,
    Birth_Time || null,
    Avatar_Url || null,
    Gender || null,
    Latitude || null,
    Longitude || null
  );
}

/**
 * Lấy thông tin user bằng email
 */
export async function getUserByEmail(email) {
  return await userModel.getUserByEmail(email);
}

/**
 * Đăng ký tài khoản người dùng mới
 */
export async function registerUser(email, hashedPassword, userData) {
  return await userModel.createUser(email, hashedPassword, userData);
}

/**
 * Đặt lại mật khẩu mới
 */
export async function changePassword(email, hashedPassword) {
  return await userModel.updateUserPassword(email, hashedPassword);
}

/**
 * Lưu mã OTP kích hoạt tài khoản
 */
export async function storeVerificationOTP(email, code) {
  return await userModel.storeVerificationCode(email, code);
}

/**
 * Xác thực mã OTP
 */
export async function verifyOTP(email, code, shouldDelete = true) {
  return await userModel.verifyCode(email, code, shouldDelete);
}

/**
 * Sử dụng và xóa mã OTP một lần duy nhất
 */
export async function consumeOTP(email, code) {
  return await userModel.consumeVerificationCode(email, code);
}
