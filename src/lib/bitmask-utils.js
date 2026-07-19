/**
 * Hệ thống tiện ích xử lý Lịch trình dưới dạng Bitmask (Mảng bit)
 * Một ngày được chia thành 48 blocks, mỗi block tương ứng 30 phút.
 * Dùng 48 bit của số BIGINT để biểu diễn trạng thái Bận (1) hoặc Rảnh (0).
 */

/**
 * Lấy index của block (0 -> 47) từ thời gian (giờ, phút)
 */
export function timeToBlockIndex(hours, minutes) {
  return Math.floor((hours * 60 + minutes) / 30);
}

/**
 * Chuyển đổi index block thành chuỗi thời gian HH:MM
 */
export function blockIndexToTimeStr(blockIndex) {
  const totalMinutes = blockIndex * 30;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Chuyển đổi danh sách sự kiện thông thường thành Bitmask (BigInt) của ngày cụ thể
 */
export function eventsToBitmask(events, dateStr) {
  let mask = 0n;
  const targetDate = new Date(dateStr);
  const targetDateStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
  const targetDateEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

  for (const event of events) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end || event.start);

    // Kiểm tra sự kiện có đè lên ngày mục tiêu không
    if (eventStart <= targetDateEnd && eventEnd >= targetDateStart) {
      // Xác định khoảng thời gian bận đè lên ngày mục tiêu
      const startOnDay = eventStart < targetDateStart ? targetDateStart : eventStart;
      const endOnDay = eventEnd > targetDateEnd ? targetDateEnd : eventEnd;

      const startBlock = timeToBlockIndex(startOnDay.getHours(), startOnDay.getMinutes());
      
      // Xử lý block kết thúc (nếu kết thúc đúng 12:00, block sẽ là 24, nhưng bận thực tế là đến 11:59)
      let endBlock = timeToBlockIndex(endOnDay.getHours(), endOnDay.getMinutes());
      if (endOnDay.getMinutes() % 30 !== 0 || endBlock === startBlock) {
        endBlock += 1;
      }
      
      // Khống chế trong khoảng 0 -> 48
      const s = Math.max(0, Math.min(47, startBlock));
      const e = Math.max(0, Math.min(48, endBlock));

      // Đánh dấu bit 1 từ s đến e
      for (let i = s; i < e; i++) {
        mask |= (1n << BigInt(i));
      }
    }
  }

  return mask;
}

export function findConsecutiveFreeSlots(busyMask, blocksNeeded, startBlock = 12, endBlock = 44) {
  const freeSlots = [];
  
  // Duyệt qua các blocks từ startBlock đến endBlock
  for (let i = startBlock; i <= endBlock - blocksNeeded; i++) {
    let isFree = true;
    
    // Kiểm tra xem tất cả các block liên tiếp từ i đến i + blocksNeeded có rảnh (bit = 0) không
    for (let j = 0; j < blocksNeeded; j++) {
      const bitPosition = BigInt(i + j);
      if ((busyMask & (1n << bitPosition)) !== 0n) {
        isFree = false;
        break;
      }
    }
    
    if (isFree) {
      freeSlots.push({
        startBlock: i,
        endBlock: i + blocksNeeded
      });
    }
  }
  
  return freeSlots;
}
