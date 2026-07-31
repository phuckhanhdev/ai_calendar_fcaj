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
 * Lưu tin nhắn chat vào database
 */
export async function saveMessage(userId, sender, content) {
  const messageId = crypto.randomUUID();
  const sql = `
    INSERT INTO \`CHAT_MESSAGE\` (Message_ID, User_ID, Sender, Content)
    VALUES (?, ?, ?, ?)
  `;
  await runQuery(sql, [messageId, userId, sender, content]);
  return { id: messageId, userId, sender, content, created_at: new Date() };
}

/**
 * Lấy lịch sử chat của một User
 */
export async function getHistory(userId, limit = 50) {
  const sql = `
    SELECT Message_ID AS id, Sender AS sender, Content AS content, Created_at AS created_at
    FROM \`CHAT_MESSAGE\`
    WHERE User_ID = ?
    ORDER BY Created_at ASC
    LIMIT ?
  `;
  return await runQuery(sql, [userId, parseInt(limit)]);
}

/**
 * Tự động xóa bớt tin nhắn cũ hơn N ngày (Mặc định 3 ngày)
 */
export async function pruneOldMessages(userId, days = 3) {
  const sql = `
    DELETE FROM \`CHAT_MESSAGE\`
    WHERE User_ID = ? AND Created_at < NOW() - INTERVAL ? DAY
  `;
  return await runQuery(sql, [userId, parseInt(days)]);
}

/**
 * Xóa toàn bộ lịch sử chat của User (Xóa thủ công)
 */
export async function clearAllMessages(userId) {
  const sql = `DELETE FROM \`CHAT_MESSAGE\` WHERE User_ID = ?`;
  return await runQuery(sql, [userId]);
}
