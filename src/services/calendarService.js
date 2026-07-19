import * as eventModel from "@/models/eventModel";

/**
 * Lấy danh sách toàn bộ sự kiện của người dùng
 */
export async function getUserEvents(userId, fromDate = null) {
  return await eventModel.getEventsByUser(userId, fromDate);
}

/**
 * Tạo sự kiện mới
 */
export async function createEvent(userId, eventData) {
  return await eventModel.createEvent(userId, eventData);
}

/**
 * Cập nhật sự kiện hiện có
 */
export async function updateEvent(eventId, userId, eventData) {
  return await eventModel.updateEvent(eventId, userId, eventData);
}

/**
 * Xóa sự kiện
 */
export async function deleteEvent(eventId, userId) {
  return await eventModel.deleteEvent(eventId, userId);
}

/**
 * Kiểm tra trùng lặp sự kiện
 */
export async function checkDuplicateEvent(userId, title, start, end) {
  return await eventModel.checkDuplicateEvent(userId, title, start, end);
}

/**
 * Lấy danh sách bitmask bận/rảnh chuẩn UTC-0
 */
export async function getUserAvailabilityMasks(userId, dateRange, timezoneOffset = 0) {
  return await eventModel.getUserAvailabilityMasks(userId, dateRange, timezoneOffset);
}
