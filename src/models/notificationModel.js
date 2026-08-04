import connectToDatabase from "@/database/connection";
import crypto from "crypto";

const db = connectToDatabase();

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

/**
 * Tạo thông báo mới cho User
 */
export async function createNotification(userId, type, title, content, link = null) {
  // Tự động chuyển đổi cột Link sang TEXT để tránh bị cắt chuỗi JSON ở 255 ký tự
  try {
    await runQuery("ALTER TABLE `NOTIFICATION` MODIFY COLUMN `Link` TEXT");
  } catch (e) {
    // Suppress if table alter not needed or fails on permission
  }

  const notificationId = crypto.randomUUID();
  const sql = `
    INSERT INTO \`NOTIFICATION\` (Notification_ID, User_ID, Type, Title, Content, Link, Is_Read)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `;
  await runQuery(sql, [notificationId, userId, type, title, content, link]);
  return {
    id: notificationId,
    userId,
    type,
    title,
    content,
    link,
    isRead: false
  };
}

/**
 * Lấy lịch sử thông báo của User
 */
export async function getUserNotifications(userId, limit = 50) {
  const sql = `
    SELECT Notification_ID AS id, Type AS type, Title AS title, Content AS content,
           Link AS link, Is_Read AS isRead, DATE_FORMAT(Created_at, '%Y-%m-%dT%H:%i:%sZ') AS createdAt
    FROM \`NOTIFICATION\`
    WHERE User_ID = ?
    ORDER BY Created_at DESC
    LIMIT ?
  `;
  return await runQuery(sql, [userId, limit]);
}

/**
 * Đánh dấu thông báo là đã đọc
 */
export async function markAsRead(notificationId, userId) {
  const sql = `
    UPDATE \`NOTIFICATION\`
    SET Is_Read = 1
    WHERE Notification_ID = ? AND User_ID = ?
  `;
  const result = await runQuery(sql, [notificationId, userId]);
  return result.affectedRows > 0;
}

/**
 * Đánh dấu toàn bộ thông báo của User là đã đọc
 */
export async function markAllAsRead(userId) {
  const sql = `
    UPDATE \`NOTIFICATION\`
    SET Is_Read = 1
    WHERE User_ID = ?
  `;
  const result = await runQuery(sql, [userId]);
  return result.affectedRows > 0;
}
