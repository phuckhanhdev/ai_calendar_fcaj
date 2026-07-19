import connectToDatabase from "@/database/connection";

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
 * Gửi yêu cầu kết bạn
 */
export async function sendRequest(userId1, userId2) {
  // Sắp xếp ID để tránh trùng lặp cặp khoá
  const id1 = userId1 < userId2 ? userId1 : userId2;
  const id2 = userId1 < userId2 ? userId2 : userId1;
  
  const sql = `
    INSERT INTO \`FRIENDSHIP\` (User_ID_1, User_ID_2, Status, Share_Level, Requester_ID)
    VALUES (?, ?, 'pending', 'none', ?)
    ON DUPLICATE KEY UPDATE Status = 'pending', Requester_ID = ?
  `;
  return await runQuery(sql, [id1, id2, userId1, userId1]);
}

/**
 * Chấp nhận kết bạn
 */
export async function acceptFriend(userId1, userId2, shareLevel = "free_busy") {
  const id1 = userId1 < userId2 ? userId1 : userId2;
  const id2 = userId1 < userId2 ? userId2 : userId1;

  const sql = `
    UPDATE \`FRIENDSHIP\`
    SET Status = 'accepted', Share_Level = ?
    WHERE User_ID_1 = ? AND User_ID_2 = ?
  `;
  return await runQuery(sql, [shareLevel, id1, id2]);
}

/**
 * Xoá/Từ chối kết bạn
 */
export async function deleteFriendship(userId1, userId2) {
  const id1 = userId1 < userId2 ? userId1 : userId2;
  const id2 = userId1 < userId2 ? userId2 : userId1;

  const sql = `
    DELETE FROM \`FRIENDSHIP\`
    WHERE User_ID_1 = ? AND User_ID_2 = ?
  `;
  return await runQuery(sql, [id1, id2]);
}

/**
 * Cập nhật mức độ chia sẻ lịch trình
 */
export async function updateShareLevel(userId1, userId2, shareLevel) {
  const id1 = userId1 < userId2 ? userId1 : userId2;
  const id2 = userId1 < userId2 ? userId2 : userId1;

  const sql = `
    UPDATE \`FRIENDSHIP\`
    SET Share_Level = ?
    WHERE User_ID_1 = ? AND User_ID_2 = ?
  `;
  return await runQuery(sql, [shareLevel, id1, id2]);
}

/**
 * Lấy danh sách bạn bè và lời mời của User kèm thông tin User chi tiết
 */
export async function getFriends(userId) {
  const sql = `
    SELECT 
      f.Status AS status,
      f.Share_Level AS share_level,
      f.Requester_ID AS requester_id,
      u.User_ID AS friend_id,
      u.Email AS email,
      u.FName AS fname,
      u.LName AS lname,
      u.Avatar_Url AS avatar_url
    FROM \`FRIENDSHIP\` f
    JOIN \`USER\` u ON u.User_ID = CASE WHEN f.User_ID_1 = ? THEN f.User_ID_2 ELSE f.User_ID_1 END
    WHERE (f.User_ID_1 = ? OR f.User_ID_2 = ?)
  `;
  return await runQuery(sql, [userId, userId, userId]);
}
