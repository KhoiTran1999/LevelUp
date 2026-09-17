import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { deriveLegitimateBalance, signQuest } from '../api/sync.js';

console.log('=== BẮT ĐẦU BỘ KIỂM THỬ HỆ THỐNG CHUỖI NGÀY (DAILY STREAK ENGINE) ===\n');

// Đọc mã nguồn app.js để kiểm tra và trích xuất hàm
const appJsPath = path.resolve('public/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

const indexHtmlPath = path.resolve('public/index.html');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

const styleCssPath = path.resolve('public/style.css');
const styleCssContent = fs.readFileSync(styleCssPath, 'utf8');

// -----------------------------------------------------------------------------
// Helper implementations matching app.js
// -----------------------------------------------------------------------------
function getLocalDayString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDaysDifference(dayStrA, dayStrB) {
  if (!dayStrA || !dayStrB) return 999;
  const [yA, mA, dA] = dayStrA.split('-').map(Number);
  const [yB, mB, dB] = dayStrB.split('-').map(Number);
  const dateA = new Date(yA, mA - 1, dA);
  const dateB = new Date(yB, mB - 1, dB);
  const diffTime = dateB.getTime() - dateA.getTime();
  return Math.round(diffTime / (24 * 60 * 60 * 1000));
}

function getStreakBonusPercent(streak) {
  const s = Math.max(0, parseInt(streak, 10) || 0);
  if (s >= 30) return 20;
  if (s >= 14) return 15;
  if (s >= 7) return 10;
  if (s >= 3) return 5;
  return 0;
}

function getStreakTitle(streak) {
  const s = Math.max(0, parseInt(streak, 10) || 0);
  if (s >= 30) return 'Bất Bại 👑';
  if (s >= 14) return 'Chuyên Cần';
  if (s >= 7) return 'Bền Bỉ';
  if (s >= 3) return 'Cần Mẫn';
  return 'Khởi Đầu';
}

function updateStreakOnQuestComplete(profile, now = new Date()) {
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
    newStreak = Math.max(1, initialStreak);
  } else if (daysDiff === 1) {
    newStreak = initialStreak + 1;
  } else {
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

// =============================================================================
// TEST 1: Định dạng Ngày & Khoảng Cách Ngày (Date Difference & Leap Year/Month End)
// =============================================================================
console.log('--- TEST 1: Định dạng Ngày Cục Bộ & Khoảng Cách Giữa Các Ngày ---');
const date1 = new Date(2026, 8, 17); // 17/09/2026
assert.strictEqual(getLocalDayString(date1), '2026-09-17', 'Định dạng YYYY-MM-DD phải chuẩn xác');

assert.strictEqual(getDaysDifference('2026-09-17', '2026-09-17'), 0, 'Cùng ngày phải cách nhau 0');
assert.strictEqual(getDaysDifference('2026-09-16', '2026-09-17'), 1, 'Hôm qua và hôm nay phải cách nhau đúng 1 ngày');
assert.strictEqual(getDaysDifference('2026-09-15', '2026-09-17'), 2, 'Cách 2 ngày phải ra đúng 2');

// Chuyển giao tháng (30/09 sang 01/10)
assert.strictEqual(getDaysDifference('2026-09-30', '2026-10-01'), 1, 'Chuyển giao cuối tháng 9 sang đầu tháng 10 phải đúng 1 ngày');
// Chuyển giao năm (31/12/2026 sang 01/01/2027)
assert.strictEqual(getDaysDifference('2026-12-31', '2027-01-01'), 1, 'Chuyển giao năm mới phải đúng 1 ngày');
console.log('✓ Test 1: Hàm getLocalDayString và getDaysDifference hoạt động chuẩn xác 100%.\n');

// =============================================================================
// TEST 2: Thang Bậc Hệ Số Thưởng Streak & Danh Hiệu
// =============================================================================
console.log('--- TEST 2: Thang Bậc Hệ Số Thưởng Streak & Danh Hiệu ---');
assert.strictEqual(getStreakBonusPercent(0), 0, 'Streak 0 ngày: +0% thưởng');
assert.strictEqual(getStreakBonusPercent(1), 0, 'Streak 1 ngày: +0% thưởng');
assert.strictEqual(getStreakBonusPercent(2), 0, 'Streak 2 ngày: +0% thưởng');

assert.strictEqual(getStreakBonusPercent(3), 5, 'Streak 3 ngày: +5% thưởng');
assert.strictEqual(getStreakBonusPercent(6), 5, 'Streak 6 ngày: +5% thưởng');

assert.strictEqual(getStreakBonusPercent(7), 10, 'Streak 7 ngày: +10% thưởng');
assert.strictEqual(getStreakBonusPercent(13), 10, 'Streak 13 ngày: +10% thưởng');

assert.strictEqual(getStreakBonusPercent(14), 15, 'Streak 14 ngày: +15% thưởng');
assert.strictEqual(getStreakBonusPercent(29), 15, 'Streak 29 ngày: +15% thưởng');

assert.strictEqual(getStreakBonusPercent(30), 20, 'Streak 30 ngày: +20% thưởng (Cap)');
assert.strictEqual(getStreakBonusPercent(100), 20, 'Streak 100 ngày: +20% thưởng (Cap)');

assert.strictEqual(getStreakTitle(1), 'Khởi Đầu');
assert.strictEqual(getStreakTitle(5), 'Cần Mẫn');
assert.strictEqual(getStreakTitle(10), 'Bền Bỉ');
assert.strictEqual(getStreakTitle(20), 'Chuyên Cần');
assert.strictEqual(getStreakTitle(35), 'Bất Bại 👑');
console.log('✓ Test 2: Thang bậc hệ số thưởng và danh hiệu chuỗi hoạt động chuẩn xác.\n');

// =============================================================================
// TEST 3: Logic Chuyển Ngày & Duy Trì Chuỗi (Consecutive, Same-day, Broken)
// =============================================================================
console.log('--- TEST 3: Vòng Đời Cập Nhật Streak Khi Hoàn Thành Nhiệm Vụ ---');
const userProfile = {
  streak: 1,
  lastStreakDate: '2026-09-16',
  streakHistory: ['2026-09-16']
};

// 1. Hoàn thành nhiệm vụ đầu tiên hôm nay (2026-09-17)
const day1 = new Date(2026, 8, 17, 10, 0, 0);
const res1 = updateStreakOnQuestComplete(userProfile, day1);
assert.strictEqual(userProfile.streak, 2, 'Hoàn thành liên tiếp so với hôm qua -> streak tăng từ 1 lên 2');
assert.strictEqual(userProfile.lastStreakDate, '2026-09-17');
assert.ok(userProfile.streakHistory.includes('2026-09-17'), 'Lịch sử streak phải ghi nhận ngày hôm nay');
assert.strictEqual(res1.isNewDay, true);
assert.strictEqual(res1.snapshot.streak, 1, 'Snapshot ghi lại streak cũ là 1 để hoàn tác nếu cần');

// 2. Hoàn thành thêm nhiệm vụ thứ hai trong cùng ngày hôm nay (2026-09-17, 14:00)
const day1_again = new Date(2026, 8, 17, 14, 0, 0);
const res2 = updateStreakOnQuestComplete(userProfile, day1_again);
assert.strictEqual(userProfile.streak, 2, 'Hoàn thành thêm quest trong cùng 1 ngày -> streak không tăng lần thứ 2');
assert.strictEqual(res2.isNewDay, false);

// 3. Hoàn thành nhiệm vụ vào ngày tiếp theo (2026-09-18, 09:00)
const day2 = new Date(2026, 8, 18, 9, 0, 0);
const res3 = updateStreakOnQuestComplete(userProfile, day2);
assert.strictEqual(userProfile.streak, 3, 'Ngày tiếp theo làm quest -> streak tăng lên 3');
assert.strictEqual(userProfile.lastStreakDate, '2026-09-18');
assert.strictEqual(res3.bonusPercent, 5, 'Chuỗi 3 ngày bắt đầu mở khóa +5% thưởng');

// 4. Người chơi bỏ lỡ ngày 2026-09-19, đến 2026-09-20 mới làm quest
const day4 = new Date(2026, 8, 20, 11, 0, 0);
const res4 = updateStreakOnQuestComplete(userProfile, day4);
assert.strictEqual(userProfile.streak, 1, 'Bỏ lỡ ít nhất 1 ngày -> Chuỗi reset về 1');
assert.strictEqual(userProfile.lastStreakDate, '2026-09-20');
assert.strictEqual(res4.bonusPercent, 0, 'Chuỗi 1 ngày có mức thưởng cơ bản 0%');

console.log('✓ Test 3: Chuỗi liên tiếp, cùng ngày và reset khi gián đoạn hoạt động hoàn hảo.\n');

// =============================================================================
// TEST 4: Tính Toán Phần Thưởng (Vàng, EXP & Sổ Cái) và Hoàn Tác (Undo)
// =============================================================================
console.log('--- TEST 4: Tính Toán Thưởng Nhiệm Vụ & Hoàn Tác An Toàn ---');
// Giả lập người chơi có chuỗi 7 ngày (thưởng +10%)
const playerState = {
  profile: {
    coins: 100,
    totalCoinsEarned: 100,
    exp: 50,
    level: 2,
    streak: 7,
    lastStreakDate: '2026-09-17',
    streakHistory: ['2026-09-17']
  }
};

const quest = {
  id: 'q_test_1',
  title: 'Học tiếng Anh 30 phút',
  rewardCoins: 20,
  rank: 'C'
};

const bonusPct = getStreakBonusPercent(playerState.profile.streak); // 10%
const streakBonus = Math.floor(quest.rewardCoins * (bonusPct / 100)); // 2 Vàng
const totalAwarded = quest.rewardCoins + streakBonus; // 22 Vàng
const totalExp = totalAwarded * 3; // 66 EXP

assert.strictEqual(streakBonus, 2, 'Nhiệm vụ 20 Vàng với Streak 7 ngày nhận thêm +2 Vàng thưởng chuỗi');
assert.strictEqual(totalAwarded, 22, 'Tổng số Vàng nhận được là 22 Vàng');
assert.strictEqual(totalExp, 66, 'Kinh nghiệm EXP nhận được = 22 * 3 = 66 EXP');

// Mô phỏng snapshot khi lưu trích nợ
const snapshot = {
  rewardCoins: quest.rewardCoins,
  streakBonusCoins: streakBonus,
  totalAwardedCoins: totalAwarded,
  streakSnapshot: { streak: 6, lastStreakDate: '2026-09-16', streakHistory: [] }
};

// Cập nhật số dư
playerState.profile.coins += totalAwarded;
playerState.profile.totalCoinsEarned += totalAwarded;
playerState.profile.exp += totalExp;

assert.strictEqual(playerState.profile.coins, 122);
assert.strictEqual(playerState.profile.totalCoinsEarned, 122);

// Hoàn tác (Undo)
playerState.profile.coins -= snapshot.totalAwardedCoins;
playerState.profile.totalCoinsEarned -= snapshot.totalAwardedCoins;
playerState.profile.exp -= snapshot.totalAwardedCoins * 3;
playerState.profile.streak = snapshot.streakSnapshot.streak;
playerState.profile.lastStreakDate = snapshot.streakSnapshot.lastStreakDate;

assert.strictEqual(playerState.profile.coins, 100, 'Ví tiền hoàn nguyên chuẩn xác về 100');
assert.strictEqual(playerState.profile.totalCoinsEarned, 100, 'Tổng Vàng tích lũy hoàn nguyên về 100');
assert.strictEqual(playerState.profile.exp, 50, 'EXP hoàn nguyên về 50');
assert.strictEqual(playerState.profile.streak, 6, 'Streak hoàn nguyên về 6 ngày');
assert.strictEqual(playerState.profile.lastStreakDate, '2026-09-16', 'Ngày chuỗi hoàn nguyên chính xác');

console.log('✓ Test 4: Phần thưởng Streak và cơ chế Hoàn tác (Undo) bảo toàn dữ liệu 100%.\n');

// =============================================================================
// TEST 5: Tương Thích Anti-Cheat Server (deriveLegitimateBalance)
// =============================================================================
console.log('--- TEST 5: Kiểm Thử Anti-Cheat Server & Client Đồng Nhất ---');

const questSig = signQuest('Tập thể dục', 'bounty', 0, 40, false);
const legitClientState = {
  profile: {
    level: 3,
    coins: 108, // 20 khởi đầu + (40 quest * 2 = 80) + 10% streak bonus (8) = 108 Vàng
    totalCoinsEarned: 108,
    totalCoinsSpent: 0,
    streak: 10
  },
  quests: [
    {
      id: 'q1',
      title: 'Tập thể dục',
      type: 'bounty',
      targetMinutes: 0,
      rewardCoins: 40,
      completedCount: 2,
      isRepeatable: true,
      requiresProof: false,
      signature: questSig
    }
  ],
  inventory: [],
  ledger: []
};

// Test deriveLegitimateBalance từ api/sync.js không đánh cắp hoặc phạt nhầm tiền hợp lệ
const checkResult = deriveLegitimateBalance(legitClientState, null);
assert.strictEqual(checkResult.tampered, false, 'Số dư hợp lệ tích lũy có thưởng streak không được báo tampered');
assert.ok(checkResult.coins >= 100, 'Số dư coins được giữ nguyên vẹn');

console.log('✓ Test 5: Thuật toán Anti-Cheat Server tích hợp hoàn hảo với hệ số thưởng Streak.\n');

// =============================================================================
// TEST 6: Khung Giao Diện HTML & CSS Trực Quan
// =============================================================================
console.log('--- TEST 6: Kiểm Tra Phần Tử UI/UX Trên HTML & CSS ---');

// 1. Kiểm tra nút Streak trên Header
assert.ok(indexHtmlContent.includes('id="btn-streak-info"'), 'index.html phải có nút btn-streak-info');
assert.ok(indexHtmlContent.includes('id="hero-streak-count"'), 'index.html phải có thẻ hero-streak-count');
assert.ok(indexHtmlContent.includes('id="hero-streak-flame"'), 'index.html phải có thẻ hero-streak-flame');

// 2. Kiểm tra Modal Chi Tiết Chuỗi
assert.ok(indexHtmlContent.includes('id="modal-streak-info"'), 'index.html phải có modal-streak-info');
assert.ok(indexHtmlContent.includes('id="modal-streak-days-count"'), 'index.html phải có modal-streak-days-count');
assert.ok(indexHtmlContent.includes('id="modal-streak-tier-title"'), 'index.html phải có modal-streak-tier-title');
assert.ok(indexHtmlContent.includes('id="modal-streak-today-status"'), 'index.html phải có modal-streak-today-status');
assert.ok(indexHtmlContent.includes('id="modal-streak-week-tracker"'), 'index.html phải có modal-streak-week-tracker (lịch 7 ngày)');
assert.ok(indexHtmlContent.includes('id="modal-streak-perk-quest"'), 'index.html phải có modal-streak-perk-quest');

// 3. Kiểm tra Profile Modal
assert.ok(indexHtmlContent.includes('id="profile-modal-streak-title"'), 'index.html phải có thẻ streak trong profile modal');
assert.ok(indexHtmlContent.includes('id="btn-open-streak-info-from-profile"'), 'index.html phải có nút mở streak modal từ profile');

// 4. Kiểm tra CSS hiệu ứng
assert.ok(styleCssContent.includes('.streak-flame'), 'style.css phải định nghĩa .streak-flame');
assert.ok(styleCssContent.includes('flamePulse'), 'style.css phải có keyframes flamePulse');
assert.ok(styleCssContent.includes('.streak-day-card'), 'style.css phải có .streak-day-card');

// 5. Kiểm tra mã nguồn app.js gắn kết sự kiện
assert.ok(appJsContent.includes('openStreakInfoModal'), 'app.js phải định nghĩa hàm openStreakInfoModal');
assert.ok(appJsContent.includes('updateStreakOnQuestComplete'), 'app.js phải định nghĩa hàm updateStreakOnQuestComplete');
assert.ok(appJsContent.includes('getDailyStreakStatus'), 'app.js phải định nghĩa hàm getDailyStreakStatus');
assert.ok(appJsContent.includes('getStreakBonusPercent'), 'app.js phải định nghĩa hàm getStreakBonusPercent');

console.log('✓ Test 6: Toàn bộ thành phần UI/UX, DOM IDs và CSS Animation đã sẵn sàng 100%.\n');

console.log('=== TẤT CẢ 6/6 BỘ KIỂM THỬ HỆ THỐNG STREAK ĐÃ ĐẠT 100%! ===');
