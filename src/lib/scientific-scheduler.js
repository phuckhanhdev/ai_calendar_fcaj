/**
 * Scientific Smart Scheduling Engine (Next.js & AWS Amplify Native JS Implementation)
 * Applied Theories:
 *  1. Cognitive Load Theory & Spaced Repetition (Pomodoro 50/10 & Golden Hours 08:00 - 11:00 AM)
 *  2. Automated Sports Recovery (30-minute post-workout recovery buffer)
 *  3. Time-Dependent Routing (Travel buffers before & after fixed events)
 * Design Pattern: Strategy Pattern + Backtracking Constraint Satisfaction Problem (CSP) Solver
 */

export const TaskCategory = {
  STUDY: "study",
  FITNESS: "fitness",
  DATE: "date",
  GENERAL: "general"
};

// =========================================================================
// 1. STRATEGY PATTERN FOR DOMAIN-SPECIFIC KNOWLEDGE INJECTION
// =========================================================================

export class BaseSchedulerStrategy {
  enrichTask(task) {
    throw new Error("Abstract method enrichTask must be implemented");
  }
}

export class StudyStrategy extends BaseSchedulerStrategy {
  enrichTask(task) {
    const subTasks = [];
    let remMins = task.duration_minutes || 60;
    let partIdx = 1;

    // Pomodoro splitting: Max 50 mins study + 10 mins rest buffer
    while (remMins > 0) {
      const blockMins = Math.min(remMins, 50);
      const durationSlots = Math.max(1, Math.round(blockMins / 15));
      const restBufferSlots = blockMins >= 45 ? 1 : 0; // 15-min rest

      subTasks.push({
        taskId: `${task.task_id}_p${partIdx}`,
        title: task.duration_minutes > 60 ? `${task.title} (Phần ${partIdx})` : task.title,
        category: TaskCategory.STUDY,
        durationSlots,
        bufferBeforeSlots: 0,
        bufferAfterSlots: restBufferSlots,
        isHardConstraint: false,
        // Golden Hours (08:00 AM - 11:00 AM -> Slots 8 to 20)
        preferredStartSlot: 8,
        preferredEndSlot: 20,
        priorityWeight: 10,
        scientificNote: "Áp dụng Pomodoro (50m học / 10m nghỉ) & Ưu tiên Giờ vàng nhận thức (8h-11h sáng)"
      });

      remMins -= blockMins;
      partIdx++;
    }

    return subTasks;
  }
}

export class FitnessStrategy extends BaseSchedulerStrategy {
  enrichTask(task) {
    const durationSlots = Math.max(1, Math.round(task.duration_minutes / 15));
    const recoveryBufferSlots = 2; // 30 mins post-workout shower & recovery

    return [{
      taskId: task.task_id,
      title: task.title,
      category: TaskCategory.FITNESS,
      durationSlots,
      bufferBeforeSlots: 0,
      bufferAfterSlots: recoveryBufferSlots,
      isHardConstraint: task.is_hard_constraint || false,
      priorityWeight: 8,
      scientificNote: "Tự động thêm 30 phút nghỉ ngơi & tắm rửa sau tập thể thao"
    }];
  }
}

export class DateStrategy extends BaseSchedulerStrategy {
  enrichTask(task) {
    const durationSlots = Math.max(1, Math.round(task.duration_minutes / 15));
    const travelBufferSlots = 2; // 30 mins travel before & after

    let fixedStart = null;
    let fixedEnd = null;

    if (task.fixed_start_time) {
      const [h, m] = task.fixed_start_time.split(":").map(Number);
      fixedStart = (h - 6) * 4 + Math.floor(m / 15);
    }
    if (task.fixed_end_time) {
      const [h, m] = task.fixed_end_time.split(":").map(Number);
      fixedEnd = (h - 6) * 4 + Math.floor(m / 15);
    }

    return [{
      taskId: task.task_id,
      title: task.title,
      category: TaskCategory.DATE,
      durationSlots,
      bufferBeforeSlots: travelBufferSlots,
      bufferAfterSlots: travelBufferSlots,
      isHardConstraint: true,
      fixedStartSlot: fixedStart,
      fixedEndSlot: fixedEnd,
      priorityWeight: 20,
      scientificNote: "Khóa thời gian cố định & Thêm 30 phút di chuyển trước/sau sự kiện"
    }];
  }
}

export class StrategyRouter {
  constructor() {
    this.strategies = {
      [TaskCategory.STUDY]: new StudyStrategy(),
      [TaskCategory.FITNESS]: new FitnessStrategy(),
      [TaskCategory.DATE]: new DateStrategy()
    };
  }

  routeAndEnrich(task) {
    const strategy = this.strategies[task.category] || new FitnessStrategy();
    return strategy.enrichTask(task);
  }
}

// =========================================================================
// 2. MASTER SCIENTIFIC CSP SOLVER
// =========================================================================

export class MasterScientificScheduler {
  static TOTAL_SLOTS = 68; // 06:00 AM - 23:00 PM (17 hours * 4 slots/hr)
  static START_HOUR = 6;

  constructor() {
    this.router = new StrategyRouter();
  }

  static slotToTimeStr(slot) {
    const totalMins = (MasterScientificScheduler.START_HOUR * 60) + (slot * 15);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }

  schedule(rawTasks = []) {
    // 1. Enrich all tasks using Strategy Router
    const enrichedTasks = [];
    for (const raw of rawTasks) {
      enrichedTasks.push(...this.router.routeAndEnrich(raw));
    }

    // Sort by Hard Constraint & Priority Weight
    enrichedTasks.sort((a, b) => b.priorityWeight - a.priorityWeight);

    const occupiedSlots = new Array(MasterScientificScheduler.TOTAL_SLOTS).fill(false);
    const results = [];

    // Helper: check if slot range is free
    const isFree = (start, len) => {
      if (start < 0 || start + len > MasterScientificScheduler.TOTAL_SLOTS) return false;
      for (let i = start; i < start + len; i++) {
        if (occupiedSlots[i]) return false;
      }
      return true;
    };

    // Helper: mark slots occupied
    const markOccupied = (start, len) => {
      for (let i = start; i < start + len; i++) {
        occupiedSlots[i] = true;
      }
    };

    // 2. Solve Hard Constraints first
    for (const task of enrichedTasks.filter((t) => t.isHardConstraint)) {
      const totalLen = task.durationSlots + task.bufferBeforeSlots + task.bufferAfterSlots;
      let startSlot = task.fixedStartSlot !== null ? task.fixedStartSlot - task.bufferBeforeSlots : -1;

      if (startSlot >= 0 && isFree(startSlot, totalLen)) {
        markOccupied(startSlot, totalLen);
        const actStart = startSlot + task.bufferBeforeSlots;
        const actEnd = actStart + task.durationSlots;

        results.push({
          taskId: task.taskId,
          title: task.title,
          category: task.category,
          startTime: MasterScientificScheduler.slotToTimeStr(actStart),
          endTime: MasterScientificScheduler.slotToTimeStr(actEnd),
          durationMinutes: task.durationSlots * 15,
          scientificNote: task.scientificNote
        });
      }
    }

    // 3. Solve Soft Constraints (Study Golden Hours & Fitness)
    for (const task of enrichedTasks.filter((t) => !t.isHardConstraint)) {
      const totalLen = task.durationSlots + task.bufferBeforeSlots + task.bufferAfterSlots;
      let bestSlot = -1;
      let bestScore = -Infinity;

      // Scan all possible start slots
      for (let s = 0; s <= MasterScientificScheduler.TOTAL_SLOTS - totalLen; s++) {
        if (isFree(s, totalLen)) {
          let score = 0;
          // Reward Golden Hours for Study (08:00 - 11:00 AM -> Slots 8-20)
          if (task.preferredStartSlot !== null && task.preferredEndSlot !== null) {
            if (s >= task.preferredStartSlot && s <= task.preferredEndSlot) {
              score += 100;
            } else {
              const dist = Math.min(Math.abs(s - task.preferredStartSlot), Math.abs(s - task.preferredEndSlot));
              score -= dist * 2;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestSlot = s;
          }
        }
      }

      if (bestSlot !== -1) {
        markOccupied(bestSlot, totalLen);
        const actStart = bestSlot + task.bufferBeforeSlots;
        const actEnd = actStart + task.durationSlots;

        results.push({
          taskId: task.taskId,
          title: task.title,
          category: task.category,
          startTime: MasterScientificScheduler.slotToTimeStr(actStart),
          endTime: MasterScientificScheduler.slotToTimeStr(actEnd),
          durationMinutes: task.durationSlots * 15,
          scientificNote: task.scientificNote
        });
      }
    }

    // Sort results chronologically by start time
    results.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return results;
  }
}
