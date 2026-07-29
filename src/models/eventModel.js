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
 * Lấy toàn bộ sự kiện của một User
 */
export async function getEventsByUser(userId, fromDate = null) {
  let sql = `
    SELECT 
      Event_ID AS id,
      Title AS title,
      Description AS description,
      Location AS location,
      DATE_FORMAT(Start_Time, '%Y-%m-%dT%H:%i:%s') AS start,
      DATE_FORMAT(End_Time, '%Y-%m-%dT%H:%i:%s') AS end,
      Color AS color,
      Category AS category,
      Priority AS priority,
      Reminder_Minutes AS reminder,
      Attachment_URL AS attachmentUrl,
      Attachment_Name AS attachmentName
    FROM \`EVENT\`
    WHERE User_ID = ?
  `;
  const params = [userId];

  if (fromDate) {
    sql += " AND Start_Time >= ?";
    params.push(fromDate);
  }

  sql += " ORDER BY Start_Time ASC LIMIT 150";
  return await runQuery(sql, params);
}

export async function checkDuplicateEvent(userId, title, start, end) {
  const formattedStart = formatMySQLDateTime(start);
  const formattedEnd = formatMySQLDateTime(end);
  const sql = `
    SELECT Event_ID FROM \`EVENT\`
    WHERE User_ID = ? AND Title = ? AND Start_Time = ? AND End_Time = ?
  `;
  const rows = await runQuery(sql, [userId, title, formattedStart, formattedEnd]);
  return rows.length > 0;
}

function formatMySQLDateTime(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr !== 'string') {
    try {
      const d = new Date(dateStr);
      const pad = (num) => num.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch (e) {
      return dateStr;
    }
  }

  // literal timezone-independent extraction
  const clean = dateStr.replace("T", " ");
  if (clean.length >= 19) {
    return clean.substring(0, 19);
  }
  return clean;
}

/**
 * Tạo sự kiện mới
 */
export async function createEvent(userId, eventData) {
  const { title, description, location, start, end, color, category, priority, reminder, isPrivate, attachmentUrl, attachmentName } = eventData;
  const eventId = crypto.randomUUID();
  
  // Chuẩn hóa thời gian sang dạng MySQL DATETIME
  const formattedStart = formatMySQLDateTime(start);
  const formattedEnd = formatMySQLDateTime(end);
  
  const sql = `
    INSERT INTO \`EVENT\` (
      Event_ID, User_ID, Title, Description, Location, 
      Start_Time, End_Time, Color, Category, Priority, Reminder_Minutes, Is_Private,
      Attachment_URL, Attachment_Name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await runQuery(sql, [
    eventId,
    userId,
    title,
    description || null,
    location || null,
    formattedStart,
    formattedEnd,
    color || "#6366f1",
    category || "general",
    priority || "medium",
    reminder !== undefined ? parseInt(reminder) : 30,
    isPrivate ? 1 : 0,
    attachmentUrl || null,
    attachmentName || null
  ]);

  return {
    id: eventId,
    title,
    description,
    location,
    start,
    end,
    color: color || "#6366f1",
    category: category || "general",
    priority: priority || "medium",
    reminder: reminder !== undefined ? parseInt(reminder) : 30,
    isPrivate: !!isPrivate,
    attachmentUrl: attachmentUrl || null,
    attachmentName: attachmentName || null
  };
}

/**
 * Cập nhật sự kiện có sẵn
 */
export async function updateEvent(eventId, userId, eventData) {
  const { title, description, location, start, end, color, category, priority, reminder, isPrivate, attachmentUrl, attachmentName } = eventData;
  
  // Chuẩn hóa thời gian sang dạng MySQL DATETIME
  const formattedStart = formatMySQLDateTime(start);
  const formattedEnd = formatMySQLDateTime(end);

  const sql = `
    UPDATE \`EVENT\`
    SET 
      Title = ?,
      Description = ?,
      Location = ?,
      Start_Time = ?,
      End_Time = ?,
      Color = ?,
      Category = ?,
      Priority = ?,
      Reminder_Minutes = ?,
      Is_Private = ?,
      Attachment_URL = ?,
      Attachment_Name = ?
    WHERE Event_ID = ? AND User_ID = ?
  `;

  const result = await runQuery(sql, [
    title,
    description || null,
    location || null,
    formattedStart,
    formattedEnd,
    color || "#6366f1",
    category || "general",
    priority || "medium",
    reminder !== undefined ? parseInt(reminder) : 30,
    isPrivate ? 1 : 0,
    attachmentUrl || null,
    attachmentName || null,
    eventId,
    userId
  ]);

  return result.affectedRows > 0;
}

/**
 * Xóa sự kiện
 */
export async function deleteEvent(eventId, userId) {
  const sql = `
    DELETE FROM \`EVENT\`
    WHERE Event_ID = ? AND User_ID = ?
  `;
  const result = await runQuery(sql, [eventId, userId]);
  return result.affectedRows > 0;
}

/**
 * Lấy danh sách bitmask bận/rảnh chuẩn UTC-0 cho một User
 */
export async function getUserAvailabilityMasks(userId, dateRange, timezoneOffset = 0) {
  if (dateRange.length === 0) return {};

  const minDate = dateRange[0] + " 00:00:00";
  const maxDate = dateRange[dateRange.length - 1] + " 23:59:59";

  // Query events. Expand interval slightly to account for timezone offset wrapping
  const sql = `
    SELECT Title, Start_Time AS start, End_Time AS end, Is_Private AS isPrivate
    FROM \`EVENT\`
    WHERE User_ID = ? AND End_Time >= ? - INTERVAL 1 DAY AND Start_Time <= ? + INTERVAL 1 DAY
  `;
  const events = await runQuery(sql, [userId, minDate, maxDate]);

  const offsetMs = timezoneOffset * 60 * 1000;
  const result = {};

  for (const dateStr of dateRange) {
    const dayStart = new Date(dateStr + "T00:00:00Z");
    const dayEnd = new Date(dateStr + "T23:59:59.999Z");
    
    let mask = 0n;

    for (const evt of events) {
      const utcStart = new Date(new Date(evt.start).getTime() + offsetMs);
      const utcEnd = new Date(new Date(evt.end).getTime() + offsetMs);

      if (utcStart >= dayEnd || utcEnd <= dayStart) {
        continue;
      }

      const startMs = Math.max(dayStart.getTime(), utcStart.getTime());
      const endMs = Math.min(dayEnd.getTime(), utcEnd.getTime());

      const startIdx = Math.max(0, Math.floor((startMs - dayStart.getTime()) / (30 * 60 * 1000)));
      const endIdx = Math.min(48, Math.ceil((endMs - dayStart.getTime()) / (30 * 60 * 1000)));

      for (let i = startIdx; i < endIdx; i++) {
        mask |= (1n << BigInt(i));
      }
    }

    result[dateStr] = mask.toString();
  }

  return result;
}
