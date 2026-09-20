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
