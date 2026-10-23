// =============================================================================
// STREAK ENGINE (Daily Consecutive Tracking, Multipliers & Weekly History)
// =============================================================================

function getLocalDayString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
window.getLocalDayString = getLocalDayString;

function getDaysDifference(dayStrA, dayStrB) {
  if (!dayStrA || !dayStrB) return 999;
  const [yA, mA, dA] = dayStrA.split('-').map(Number);
  const [yB, mB, dB] = dayStrB.split('-').map(Number);
  const dateA = new Date(yA, mA - 1, dA);
  const dateB = new Date(yB, mB - 1, dB);
  const diffTime = dateB.getTime() - dateA.getTime();
  return Math.round(diffTime / (24 * 60 * 60 * 1000));
}
window.getDaysDifference = getDaysDifference;

function getStreakBonusPercent(streak) {
  const s = Math.max(0, parseInt(streak, 10) || 0);
  if (s >= 30) return 20; // 30+ ngày: +20% (Bất Bại)
  if (s >= 14) return 15; // 14-29 ngày: +15% (Chuyên Cần)
  if (s >= 7) return 10;  // 7-13 ngày: +10% (Bền Bỉ)
  if (s >= 3) return 5;   // 3-6 ngày: +5% (Cần Mẫn)
  return 0;               // 0-2 ngày: +0% (Khởi Đầu)
}
window.getStreakBonusPercent = getStreakBonusPercent;

function getStreakTitle(streak) {
  const s = Math.max(0, parseInt(streak, 10) || 0);
  if (s >= 30) return 'Bất Bại 👑';
  if (s >= 14) return 'Chuyên Cần';
  if (s >= 7) return 'Bền Bỉ';
  if (s >= 3) return 'Cần Mẫn';
  return 'Khởi Đầu';
}
window.getStreakTitle = getStreakTitle;

function getNextStreakMilestone(streak) {
  const s = Math.max(0, parseInt(streak, 10) || 0);
  if (s < 3) return { days: 3, bonus: 5, label: 'Chuỗi 3 ngày: +5%' };
  if (s < 7) return { days: 7, bonus: 10, label: 'Chuỗi 7 ngày: +10%' };
  if (s < 14) return { days: 14, bonus: 15, label: 'Chuỗi 14 ngày: +15%' };
  if (s < 30) return { days: 30, bonus: 20, label: 'Chuỗi 30 ngày: +20% (Max)' };
  return { days: 30, bonus: 20, label: 'Đạt cấp tối đa (+20%)' };
}
window.getNextStreakMilestone = getNextStreakMilestone;

function getDailyStreakStatus(profile = appState.profile, now = new Date()) {
  if (!profile) return { status: 'new', streak: 0, daysDiff: 999 };
  const todayStr = getLocalDayString(now);
  const lastDate = profile.lastStreakDate || '';
  const currentStreak = Math.max(0, parseInt(profile.streak, 10) || 0);

  if (!lastDate) {
    return { status: currentStreak > 0 ? 'waiting_today' : 'new', streak: currentStreak, daysDiff: 1 };
  }

  const daysDiff = getDaysDifference(lastDate, todayStr);
  if (daysDiff === 0) {
    return { status: 'active_today', streak: currentStreak, daysDiff: 0 };
  } else if (daysDiff === 1) {
    return { status: 'waiting_today', streak: currentStreak, daysDiff: 1 };
  } else {
    return { status: 'broken', streak: currentStreak, daysDiff };
  }
}
window.getDailyStreakStatus = getDailyStreakStatus;

function updateStreakOnQuestComplete(profile = appState.profile, now = new Date()) {
  if (!profile) return { streak: 1, bonusPercent: 0, snapshot: null };

  const todayStr = getLocalDayString(now);
  const lastDate = profile.lastStreakDate || '';
  const initialStreak = Math.max(0, parseInt(profile.streak, 10) || 0);

  const snapshot = {
    streak: initialStreak,
    lastStreakDate: lastDate,
    streakHistory: Array.isArray(profile.streakHistory) ? [...profile.streakHistory] : []
  };

  let newStreak = initialStreak;
  const daysDiff = lastDate ? getDaysDifference(lastDate, todayStr) : 999;

  if (daysDiff === 0) {
    // Đã hoàn thành ít nhất 1 nhiệm vụ trong ngày hôm nay -> giữ nguyên chuỗi
    newStreak = Math.max(1, initialStreak);
  } else if (daysDiff === 1) {
    // Hoàn thành liên tiếp so với ngày hôm qua -> Tăng chuỗi +1
    newStreak = initialStreak + 1;
  } else {
    // Bỏ lỡ > 1 ngày hoặc mới bắt đầu -> Bắt đầu chuỗi mới từ 1
    newStreak = 1;
  }

  profile.streak = newStreak;
  profile.lastStreakDate = todayStr;

  if (!Array.isArray(profile.streakHistory)) {
    profile.streakHistory = [];
  }
  if (!profile.streakHistory.includes(todayStr)) {
    profile.streakHistory.push(todayStr);
    if (profile.streakHistory.length > 30) {
      profile.streakHistory = profile.streakHistory.slice(-30);
    }
  }

  const bonusPercent = getStreakBonusPercent(newStreak);
  return {
    streak: newStreak,
    isNewDay: daysDiff !== 0,
    bonusPercent,
    snapshot
  };
}
window.updateStreakOnQuestComplete = updateStreakOnQuestComplete;

/**
 * Tính toán số ngày chuỗi liên tiếp (Streak) của riêng một nhiệm vụ cụ thể dựa trên dữ liệu thực tế
 * (q.history, q.streak, q.status, q.completedAt, ledger)
 */
function getQuestStreak(quest, now = new Date()) {
  if (!quest) return 0;

  const history = (quest.history && typeof quest.history === 'object') ? quest.history : {};
  const activeDates = Object.keys(history).filter(d => (Number(history[d]) || 0) > 0);

  if (activeDates.length === 0) {
    if (typeof quest.streak === 'number' && quest.streak > 0) return quest.streak;
    if (quest.status === 'completed') return 1;
    return 0;
  }

  const todayStr = getLocalDayString(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = getLocalDayString(yesterday);

  let streak = 0;
  let checkDate = new Date(now);

  if ((history[todayStr] || 0) > 0) {
    // Đã hoàn thành trong ngày hôm nay -> Đếm lùi liên tiếp từ hôm nay
    while (true) {
      const dStr = getLocalDayString(checkDate);
      if ((history[dStr] || 0) > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  } else if ((history[yesterdayStr] || 0) > 0) {
    // Chưa làm hôm nay nhưng đã làm hôm qua -> Chuỗi vẫn được duy trì chờ người chơi làm tiếp hôm nay
    checkDate = new Date(yesterday);
    while (true) {
      const dStr = getLocalDayString(checkDate);
      if ((history[dStr] || 0) > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  } else {
    // Đã bỏ lỡ từ 2 ngày trở lên -> Chuỗi đứt về 0
    streak = 0;
  }

  if (streak === 0 && typeof quest.streak === 'number' && quest.streak > 0) {
    return quest.streak;
  }

  return streak;
}
window.getQuestStreak = getQuestStreak;

function getDaysInYear(year) {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  return isLeap ? 366 : 365;
}
window.getDaysInYear = getDaysInYear;

function getFrequencyGridData(historyMap = {}, period = 'yearly', targetDate = new Date()) {
  const now = new Date(targetDate);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayStr = getLocalDayString(now);

  const days = [];
  let totalPeriodDays = 0;
  let daysPassed = 0;
  let padStart = 0;

  if (period === 'weekly') {
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    totalPeriodDays = 7;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = getLocalDayString(d);
      const count = (historyMap && historyMap[dStr]) || 0;
      const isPastOrToday = dStr <= todayStr;
      if (isPastOrToday) daysPassed++;
      days.push({
        date: d,
        dateStr: dStr,
        count,
        isFuture: dStr > todayStr,
        isToday: dStr === todayStr,
        dayOfWeek: (d.getDay() + 6) % 7
      });
    }
  } else if (period === 'monthly') {
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    totalPeriodDays = endOfMonth.getDate();
    padStart = (startOfMonth.getDay() + 6) % 7;

    for (let i = 1; i <= totalPeriodDays; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const dStr = getLocalDayString(d);
      const count = (historyMap && historyMap[dStr]) || 0;
      const isPastOrToday = dStr <= todayStr;
      if (isPastOrToday) daysPassed++;
      days.push({
        date: d,
        dateStr: dStr,
        count,
        isFuture: dStr > todayStr,
        isToday: dStr === todayStr,
        dayOfWeek: (d.getDay() + 6) % 7
      });
    }
  } else {
    // Yearly: Jan 1 to Dec 31
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);
    totalPeriodDays = getDaysInYear(currentYear);
    padStart = (startOfYear.getDay() + 6) % 7; // Align to Monday

    const cur = new Date(startOfYear);
    while (cur <= endOfYear) {
      const dStr = getLocalDayString(cur);
      const count = (historyMap && historyMap[dStr]) || 0;
      const isPastOrToday = dStr <= todayStr;
      if (isPastOrToday) daysPassed++;
      days.push({
        date: new Date(cur),
        dateStr: dStr,
        count,
        isFuture: dStr > todayStr,
        isToday: dStr === todayStr,
        dayOfWeek: (cur.getDay() + 6) % 7
      });
      cur.setDate(cur.getDate() + 1);
    }
  }

  const activeDaysCount = days.filter(d => d.count > 0).length;
  const denominator = Math.max(1, daysPassed || totalPeriodDays);
  const percentage = Math.round((activeDaysCount / denominator) * 10000) / 100;

  return {
    period,
    year: currentYear,
    month: currentMonth + 1,
    padStart,
    days,
    activeDaysCount,
    totalPeriodDays,
    daysPassed,
    percentage
  };
}
window.getFrequencyGridData = getFrequencyGridData;

function backfillItemHistories() {
  if (typeof appState !== 'object' || !appState) return;

  // 1. Quests
  if (Array.isArray(appState.quests)) {
    appState.quests.forEach(q => {
      if (!q.history || typeof q.history !== 'object') q.history = {};

      // 1A. q.loanDeductions (each item is a completion record)
      if (Array.isArray(q.loanDeductions)) {
        const counts = {};
        q.loanDeductions.forEach(ld => {
          const dStr = ld.completedDate || (ld.timestamp ? getLocalDayString(ld.timestamp) : null);
          if (dStr) counts[dStr] = (counts[dStr] || 0) + 1;
        });
        Object.entries(counts).forEach(([dStr, cnt]) => {
          q.history[dStr] = Math.max(q.history[dStr] || 0, cnt);
        });
      }

      // 1B. appState.ledger (scan all earn transactions related to this quest)
      if (Array.isArray(appState.ledger)) {
        const counts = {};
        appState.ledger.forEach(l => {
          if (!l) return;
          const isMatch = (l.questId && l.questId === q.id) ||
                          (l.title && (l.title === q.title || l.title === `Hoàn thành: ${q.title}`)) ||
                          (l.description && (l.description.includes(q.title) || (l.questId && l.questId === q.id)));
          const isEarn = l.type === 'earn' || l.category === 'quest';
          const isUndo = l.category === 'quest_undo' || (l.title && l.title.startsWith('Hoàn tác'));
          if (isMatch && isEarn && !isUndo && l.timestamp) {
            const dStr = getLocalDayString(l.timestamp);
            counts[dStr] = (counts[dStr] || 0) + 1;
          }
        });
        Object.entries(counts).forEach(([dStr, cnt]) => {
          q.history[dStr] = Math.max(q.history[dStr] || 0, cnt);
        });
      }

      // 1C. appState.proofPhotos (photo proof submissions)
      if (Array.isArray(appState.proofPhotos)) {
        appState.proofPhotos.forEach(p => {
          if ((p.questId === q.id || p.questTitle === q.title) && p.timestamp) {
            const dStr = getLocalDayString(p.timestamp);
            q.history[dStr] = Math.max(q.history[dStr] || 0, 1);
          }
        });
      }

      // 1D. q.completedAt timestamp
      if (q.completedAt) {
        const dStr = getLocalDayString(q.completedAt);
        q.history[dStr] = Math.max(q.history[dStr] || 0, 1);
      }

      // 1E. q.lastCompletedAt timestamp
      if (q.lastCompletedAt) {
        const dStr = getLocalDayString(q.lastCompletedAt);
        q.history[dStr] = Math.max(q.history[dStr] || 0, 1);
      }

      // 1F. appState.completedQuestIds (historical completion IDs)
      if (Array.isArray(appState.completedQuestIds) && appState.completedQuestIds.includes(q.id)) {
        if (Object.keys(q.history).length === 0) {
          const dateVal = q.completedAt || q.lastCompletedAt || q.updatedAt || q.createdAt || Date.now();
          const dStr = getLocalDayString(dateVal);
          q.history[dStr] = Math.max(q.history[dStr] || 0, 1);
        }
      }

      // 1G. q.status === 'completed' or q.completed === true
      const isStatusCompleted = q.status === 'completed' || q.completed === true;
      if (isStatusCompleted && Object.keys(q.history).length === 0) {
        const dateVal = q.completedAt || q.lastCompletedAt || q.updatedAt || q.createdAt || Date.now();
        const dStr = getLocalDayString(dateVal);
        q.history[dStr] = Math.max(q.history[dStr] || 0, q.completedCount || 1);
      }

      // 1H. Consistency reconciliation: total completions in history must be at least q.completedCount
      const targetCount = Number(q.completedCount) || 0;
      const historySum = Object.values(q.history).reduce((sum, c) => sum + (Number(c) || 0), 0);
      if (targetCount > 0 && historySum < targetCount) {
        const dateVal = q.lastCompletedAt || q.completedAt || q.updatedAt || q.createdAt || Date.now();
        const dStr = getLocalDayString(dateVal);
        const diff = targetCount - historySum;
        q.history[dStr] = (q.history[dStr] || 0) + diff;
      }
      q.streak = getQuestStreak(q);
    });
  }

  // 2. Shop Items
  if (Array.isArray(appState.shopItems)) {
    appState.shopItems.forEach(item => {
      if (!item.history || typeof item.history !== 'object') item.history = {};

      // 2A. From Inventory
      if (Array.isArray(appState.inventory)) {
        appState.inventory.forEach(inv => {
          if (inv.shopItemId === item.id || inv.name === item.name) {
            const dateVal = inv.purchasedAt || inv.usedAt || inv.createdAt;
            if (dateVal) {
              const dStr = getLocalDayString(dateVal);
              item.history[dStr] = Math.max(item.history[dStr] || 0, 1);
            }
          }
        });
      }

      // 2B. From Ledger
      if (Array.isArray(appState.ledger)) {
        appState.ledger.forEach(l => {
          if (!l) return;
          const isMatch = (l.shopItemId && l.shopItemId === item.id) ||
                          (l.title && l.title.includes(item.name)) ||
                          (l.description && l.description.includes(item.name));
          const isSpend = l.type === 'spend' || l.category === 'reward';
          const isRefund = l.category === 'reward_refund' || (l.title && l.title.startsWith('Hoàn trả'));
          if (isMatch && isSpend && !isRefund && l.timestamp) {
            const dStr = getLocalDayString(l.timestamp);
            item.history[dStr] = Math.max(item.history[dStr] || 0, 1);
          }
        });
      }
    });
  }
}
window.backfillItemHistories = backfillItemHistories;

