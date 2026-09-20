/**
 * LevelUp RPG Guild — Core Application Logic
 * Dual-Storage: LocalStorage + Redis Cloud Sync
 * Pure Web Audio 8-bit Sound Effects
 * Dual Light/Dark Theme & Mobile/Desktop Responsive Navigation
 */

// =============================================================================
// 1. SOUND SYNTHESIZER (Web Audio API — 0 External Assets Required)
// =============================================================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playCoin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  playGong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 1.2);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

const sfx = new SoundFX();
const COIN_ICON_HTML = '<span class="coin-icon"></span>';
const REWARD_TIER_COLORS = {
  common: 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20 shadow-xs',
  rare: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 shadow-xs',
  epic: 'bg-purple-500/25 text-purple-800 dark:text-purple-200 border-purple-500/40 shadow-xs font-bold',
  legendary: 'bg-purple-600 text-white border-purple-400 shadow-md font-black'
};
const REWARD_TIER_LABELS = {
  common: 'PHỔ THÔNG',
  rare: 'CAO CẤP',
  epic: 'QUÝ GIÁ',
  legendary: 'CỰC PHẨM'
};

// =============================================================================
// 2. DEFAULT STATE & SEED DATA
// =============================================================================
const DEFAULT_STATE = {
  profile: {
    nickname: 'HiepSi_' + Math.floor(1000 + Math.random() * 9000),
    avatar: '⚔️',
    level: 1,
    exp: 0,
    coins: 20,
    totalCoinsEarned: 20,
    totalCoinsSpent: 0,
    totalFocusSessions: 0,
    title: 'Tân Binh Cấp 1',
    streak: 1,
    lastStreakDate: '',
    streakHistory: [],
    soundEnabled: true,
    theme: 'dark',
    role: 'adventurer',
    token: '',
    googleId: '',
    googleEmail: '',
    googlePicture: '',
    googleToken: '',
    sessionToken: '',
    hasOnboarded: false,
    bank: {
      deposited: 0,
      depositInterest: 0,
      lastDepositAt: 0,
      loan: null,
      isFrozen: false
    }
  },
  quests: [
    {
      id: 'q_seed_1',
      title: 'Đọc 1 chương sách chuyên ngành',
      description: 'Ghi chú ít nhất 3 ý chính, không dùng điện thoại',
      type: 'focus',
      rank: 'C',
      rewardCoins: 12,
      targetMinutes: 25,
      icon: '📖',
      advice: 'Bật chế độ Không làm phiền trên điện thoại trước khi bấm giờ.',
      verdict: '25 phút tập trung sâu là khoảng thời gian chuẩn mực. Hãy hoàn thành đủ giờ để nhận thưởng!',
      isRepeatable: true,
      completedCount: 0,
      status: 'active',
      createdAt: Date.now()
    },
    {
      id: 'q_seed_2',
      title: 'Dọn sạch góc bàn làm việc & rửa sạch cốc',
      description: 'Không gian ngăn nắp giúp tinh thần thoải mái và tập trung tốt hơn',
      type: 'bounty',
      rank: 'E',
      rewardCoins: 5,
      targetMinutes: 0,
      icon: '🧹',
      advice: 'Làm dứt khoát trong 5 - 10 phút.',
      verdict: 'Công việc nhanh gọn có kết quả rõ ràng. Đánh dấu xong để nhận ngay 5 Vàng!',
      isRepeatable: false,
      completedCount: 0,
      status: 'active',
      createdAt: Date.now()
    }
  ],
  shopItems: [
    {
      id: 'shop_seed_1',
      name: '1 Ly Trà Sữa / Cà Phê Yêu Thích',
      description: 'Tự thưởng một cốc đồ uống ngon lành sau buổi học tập, làm việc',
      price: 35,
      tier: 'rare',
      icon: '🧋',
      targetMinutes: 0,
      verdict: 'Tương đương hơn 1 tiếng tập trung làm việc. Hãy thưởng thức thật ngon miệng!'
    },
    {
      id: 'shop_seed_2',
      name: 'Lướt Mạng Xã Hội / Xem Video 30 Phút',
      description: 'Giải trí thư giãn thoải mái sau khi hoàn thành mục tiêu',
      price: 20,
      tier: 'common',
      icon: '📱',
      targetMinutes: 30,
      verdict: 'Thư giãn hợp lý giúp nạp lại năng lượng cho những mục tiêu tiếp theo.'
    },
    {
      id: 'shop_seed_3',
      name: 'Đi Xem Phim Rạp Cuối Tuần',
      description: 'Một buổi tối thư giãn trọn vẹn tại rạp chiếu phim',
      price: 120,
      tier: 'epic',
      icon: '🍿',
      targetMinutes: 120,
      verdict: 'Mục tiêu lớn! Cần hoàn thành đều đặn nhiệm vụ cả tuần để đổi lấy món quà này.'
    }
  ],
  inventory: [],
  completedQuestIds: [],
  ledger: [
    {
      id: 'led_1',
      type: 'earn',
      category: 'bonus',
      amount: 20,
      title: 'Thưởng chào mừng gia nhập LevelUp',
      description: 'Thưởng chào mừng gia nhập LevelUp',
      timestamp: Date.now()
    }
  ],
  activeTimer: null,
  lastTimerClearedAt: 0,
  lastSyncedAt: 0
};

// =============================================================================
// 3. STORAGE, THEME & SYNC MANAGER
// =============================================================================
const CACHE_STORAGE_KEY = 'levelup_user_cache_v1';
let appState = { ...DEFAULT_STATE };
let syncTimeout = null;

function clearLegacyLocalStorage() {
  try {
    localStorage.removeItem('levelup_state_v1');
    localStorage.removeItem('levelup_onboarded');
  } catch (e) {}
}

function saveLocalCache() {
  // ponytail: Toàn bộ dữ liệu người dùng lưu trữ trực tiếp trên Redis, không lưu vào LocalStorage
  clearLocalCache();
}

function loadLocalCache() {
  // ponytail: Không đọc từ LocalStorage, toàn bộ dữ liệu tải trực tiếp từ Cloud/Redis
  return null;
}

function clearLocalCache() {
  try {
    localStorage.removeItem(CACHE_STORAGE_KEY);
    localStorage.removeItem('levelup_state_v1');
    localStorage.removeItem('levelup_onboarded');
  } catch (e) {}
}

function applyTheme(theme) {
  const root = document.documentElement;
  const themeBtn = document.getElementById('toggle-theme-btn');
  if (theme === 'light') {
    root.classList.remove('dark');
    if (themeBtn) themeBtn.textContent = '☀️';
  } else {
    root.classList.add('dark');
    if (themeBtn) themeBtn.textContent = '🌙';
  }
  appState.profile.theme = theme;
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';
  applyTheme(newTheme);
  sfx.playClick();
  triggerSave(false);
  showToast(newTheme === 'dark' ? 'Chế độ Tối (Dark Mode)' : 'Chế độ Sáng (Light Mode)', 'info');
}

function getOrCreateUserToken() {
  if (appState.profile.sessionToken && typeof appState.profile.sessionToken === 'string') {
    return appState.profile.sessionToken;
  }
  if (appState.profile.googleToken && typeof appState.profile.googleToken === 'string') {
    return appState.profile.googleToken;
  }
  if (appState.profile.token && typeof appState.profile.token === 'string' && appState.profile.token.length >= 16) {
    return appState.profile.token;
  }
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  appState.profile.token = token;
  return token;
}

function getAuthHeaders() {
  const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token || getOrCreateUserToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

function normalizeObjectNFC(obj) {
  if (typeof obj === 'string') return obj.normalize('NFC');
  if (Array.isArray(obj)) return obj.map(normalizeObjectNFC);
  if (obj !== null && typeof obj === 'object') {
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        obj[k] = normalizeObjectNFC(obj[k]);
      }
    }
  }
  return obj;
}

// Anti-Cheat: Hàm băm chữ ký kiểm định tính toàn vẹn của số Vàng & EXP trong LocalStorage
function computeStateIntegrity(profile) {
  const salt = 'lvlup_vault_2026';
  const str = `${salt}:${profile?.googleId || ''}:${profile?.coins ?? 0}:${profile?.totalCoinsEarned ?? 0}:${profile?.level ?? 1}:${profile?.exp ?? 0}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'sig_' + Math.abs(hash).toString(36);
}

// Anti-Cheat: Kiểm tra và tái tạo số dư Vàng hợp lệ dựa trên nhiệm vụ và kho đồ
function deriveLegitimateBalance(state) {
  const quests = Array.isArray(state?.quests) ? state.quests : [];
  const inventory = Array.isArray(state?.inventory) ? state.inventory : [];
  const ledger = Array.isArray(state?.ledger) ? state.ledger : [];

  let rawTotal = parseInt(state?.profile?.totalCoinsEarned, 10);
  let rawCoins = parseInt(state?.profile?.coins, 10);
  if (isNaN(rawTotal)) rawTotal = 20;
  if (isNaN(rawCoins)) rawCoins = rawTotal;

  let tampered = false;

  let questEarned = 20;
  for (const q of quests) {
    const reward = Math.max(1, parseInt(q.rewardCoins, 10) || 10);
    const count = q.isRepeatable
      ? Math.max(0, parseInt(q.completedCount, 10) || 0)
      : Math.max(
          parseInt(q.completedCount, 10) || 0,
          (q.status === 'completed' || q.completed === true) ? 1 : 0
        );
    questEarned += reward * count;
  }

  let ledgerEarned = 0;
  let bankInterestWithdrawn = 0;
  for (const entry of ledger) {
    if (entry && entry.type === 'earn') {
      if (entry.category === 'quest' || entry.category === 'admin') {
        ledgerEarned += Math.max(0, parseInt(entry.amount, 10) || 0);
      } else if (entry.category === 'bank_withdraw') {
        const amt = Math.max(0, parseInt(entry.amount, 10) || 0);
        let interestAmt = typeof entry.interestWithdrawn === 'number'
          ? Math.min(amt, Math.max(0, parseInt(entry.interestWithdrawn, 10) || 0))
          : 0;
        if (interestAmt <= 0) {
          const match = (entry.description || '').match(/(\d+)\s*lãi/i);
          if (match) {
            interestAmt = Math.min(amt, parseInt(match[1], 10) || 0);
          }
        }
        bankInterestWithdrawn += interestAmt;
        ledgerEarned += interestAmt;
      }
    }
  }
  const maxEarned = Math.max(questEarned, ledgerEarned, 20);

  let totalSpent = 0;
  for (const item of inventory) {
    totalSpent += Math.max(0, parseInt(item.price, 10) || 0);
  }
  let totalRefunded = 0;
  for (const item of ledger) {
    if (item && item.category === 'reward' && item.type === 'earn') {
      totalRefunded += Math.max(0, parseInt(item.amount, 10) || 0);
    }
  }
  const declaredSpent = parseInt(state?.profile?.totalCoinsSpent, 10) || 0;
  const storedTotalSpent = Math.max(0, declaredSpent);
  const effectiveTotalSpent = Math.max(storedTotalSpent, totalSpent);

  // ponytail: Khi Admin tinh chỉnh hoặc tài khoản có quyền Admin, cho phép số Vàng vượt trần nhiệm vụ thông thường
  const isAdminAdjusted = Boolean(state?.profile?.adminAdjusted || state?.profile?.role === 'admin');
  const storedEarned = parseInt(state?.profile?.totalCoinsEarned, 10) || 0;
  const completedIdsCount = Array.isArray(state?.completedQuestIds) ? state.completedQuestIds.length : 0;
  const userStreak = Math.max(0, parseInt(state?.profile?.streak, 10) || 0);
  const streakBonusRate = userStreak >= 30 ? 0.20 : (userStreak >= 14 ? 0.15 : (userStreak >= 7 ? 0.10 : (userStreak >= 3 ? 0.05 : 0)));
  let recordedStreakBonus = 0;
  for (const entry of ledger) {
    if (entry && entry.type === 'earn' && typeof entry.description === 'string') {
      const match = entry.description.match(/\+(\d+)\s*Vàng\s*thưởng\s*Streak/i);
      if (match) {
        recordedStreakBonus += parseInt(match[1], 10) || 0;
      }
    }
  }
  const actualQuestsHistorical = Math.max(0, questEarned - 20) + (completedIdsCount * 60);
  const maxStreakBonus = Math.max(recordedStreakBonus, Math.floor(actualQuestsHistorical * streakBonusRate));
  const maxSafeTracked = Math.max(maxEarned, questEarned + completedIdsCount * 60 + maxStreakBonus, storedEarned);
  const maxAllowedCeiling = isAdminAdjusted ? Math.max(rawTotal, maxSafeTracked) : maxSafeTracked + 500;

  if (rawTotal > maxAllowedCeiling) {
    rawTotal = maxSafeTracked;
    tampered = true;
  }
  if (rawTotal < 0) {
    rawTotal = 0;
    tampered = true;
  }

  // Tương thích tài sản Ngân Hàng (Khoản vay & Tiền gửi) để không phạt nhầm số dư hợp lệ
  const activeLoanPrincipal = Math.max(0, parseInt(state?.profile?.bank?.loan?.principal, 10) || 0);
  const depositedCoins = Math.max(0, parseInt(state?.profile?.bank?.deposited, 10) || 0);

  // ponytail: Bảo đảm tổng số Vàng kiếm được bao quát số dư hiện tại và chi tiêu khi được Admin cấp
  if (isAdminAdjusted && rawCoins > rawTotal - effectiveTotalSpent + activeLoanPrincipal - depositedCoins) {
    rawTotal = Math.max(rawTotal, rawCoins + effectiveTotalSpent + depositedCoins - activeLoanPrincipal);
  }
  const maxCurrent = Math.max(0, rawTotal - effectiveTotalSpent + activeLoanPrincipal - depositedCoins);
  if (rawCoins > maxCurrent) {
    rawCoins = maxCurrent;
    tampered = true;
  }
  if (rawCoins < 0) {
    rawCoins = 0;
    tampered = true;
  }

  let fine = 0;
  if (tampered) {
    fine = Math.min(rawCoins, Math.max(20, Math.floor(rawCoins * 0.5)));
    rawCoins = Math.max(0, rawCoins - fine);
  }

  return { coins: rawCoins, totalCoinsEarned: rawTotal, tampered, fine, totalCoinsSpent: effectiveTotalSpent };
}

const CURRENT_TAB_ID = 'tab_' + Math.random().toString(36).slice(2) + '_' + Date.now();
const CURRENT_RUNNER_ID = CURRENT_TAB_ID;
let isTimerActionPending = false;
let lastLocalTimerActionTime = 0;
const TIMER_MUTATION_GRACE_MS = 3500;

async function syncWithCloud(isManual = false, timerAction = null) {
  const syncDot = document.getElementById('sync-indicator');
  const modalSyncState = document.getElementById('modal-sync-state');
  const modalSyncTime = document.getElementById('modal-sync-time');

  if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
  if (modalSyncState) modalSyncState.textContent = 'Đang đồng bộ...';

  const nick = appState.profile.nickname;
  if (!appState.profile.googleId || !nick) {
    if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600';
    if (modalSyncState) modalSyncState.textContent = 'Chưa đăng nhập Google';
    return;
  }
  const token = appState.profile.sessionToken || appState.profile.googleToken || appState.profile.token || getOrCreateUserToken();

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        nickname: nick,
        oldNickname: appState.pendingOldNickname,
        token: token,
        idToken: appState.profile.googleToken || token,
        state: appState,
        timerAction: timerAction || undefined
      })
    });

    if (res.ok) {
      const data = await res.json();
      delete appState.pendingOldNickname;
      if (data.role) {
        appState.profile.role = data.role;
        updateAdminNavVisibility();
      }

      // Echo Reconciliation: Đồng bộ activeTimer ngay lập tức từ kết quả xác thực của server
      if (data.activeTimer !== undefined) {
        const isRecentLocalAction = (Date.now() - lastLocalTimerActionTime < TIMER_MUTATION_GRACE_MS);
        if (data.activeTimer === null && appState.activeTimer) {
          if (!isRecentLocalAction) {
            clearFocusTimerSession(false);
          }
        } else if (data.activeTimer) {
          // Revival Guard: Nếu thiết bị này vừa bấm Dừng / Hủy / Bảo lưu gần đây (trong grace period 3.5s) hoặc đã dọn dẹp timer cục bộ,
          // TUYỆT ĐỐI KHÔNG nhận activeTimer cũ từ server để tránh bị bật lại đồng hồ!
          const timerServerTime = Number(data.activeTimer.updatedAt || data.activeTimer.lastTickTime || 0);
          const isClearedLocally = (appState.lastTimerClearedAt || 0) >= timerServerTime;
          if ((isRecentLocalAction || isClearedLocally) && !isFocusRunning && !activeFocusQuest && !activeRewardItem) {
            // Giữ nguyên trạng thái đã bảo lưu/dừng tại local
          } else {
            appState.activeTimer = data.activeTimer;
            const isMyRunnerRunning = isFocusRunning && (!data.activeTimer.runnerId || data.activeTimer.runnerId === CURRENT_RUNNER_ID);
            if (!isMyRunnerRunning && appState.activeTimer) {
              restoreFocusTimer();
            }
          }
        }
      }

      // Xử lý xung đột đồng bộ đa thiết bị (Last-Write-Wins):
      // Nếu Cloud chứa dữ liệu mới hơn (do thiết bị khác vừa làm nhiệm vụ), cập nhật ngay
      if (data.conflict && data.state) {
        const isRecentLocalAction = (Date.now() - lastLocalTimerActionTime < TIMER_MUTATION_GRACE_MS);

        // Bảo tồn các savedTimer cục bộ không bị đè bởi snapshot cũ từ Cloud
        const localSavedQuests = new Map((appState.quests || []).filter(q => q.savedTimer).map(q => [q.id, q.savedTimer]));
        const localSavedItems = new Map((appState.inventory || []).filter(i => i.savedTimer).map(i => [i.id, i.savedTimer]));

        appState = normalizeObjectNFC({
          ...DEFAULT_STATE,
          ...data.state,
          profile: {
            ...DEFAULT_STATE.profile,
            ...(data.state.profile || {}),
            sessionToken: appState.profile.sessionToken || data.state.profile?.sessionToken,
            googleToken: appState.profile.googleToken || data.state.profile?.googleToken
          }
        });

        // Khôi phục lại savedTimer nếu cloud state chưa kịp lưu
        const conflictSnapshotTime = Number(data.state?.lastSyncedAt || data.state?.lastModified || 0);
        for (const q of (appState.quests || [])) {
          if (!q.savedTimer && localSavedQuests.has(q.id)) {
            const localSaved = localSavedQuests.get(q.id);
            const savedAt = Number(localSaved?.savedAt || 0);
            if (savedAt > conflictSnapshotTime || (Date.now() - savedAt < TIMER_MUTATION_GRACE_MS)) {
              q.savedTimer = localSaved;
            }
          }
        }
        for (const it of (appState.inventory || [])) {
          if (!it.savedTimer && localSavedItems.has(it.id)) {
            const localSaved = localSavedItems.get(it.id);
            const savedAt = Number(localSaved?.savedAt || 0);
            if (savedAt > conflictSnapshotTime || (Date.now() - savedAt < TIMER_MUTATION_GRACE_MS)) {
              it.savedTimer = localSaved;
            }
          }
        }

        const conflictTimerTime = Number(data.state?.activeTimer?.updatedAt || data.state?.activeTimer?.lastTickTime || 0);
        const isClearedLocally = (appState.lastTimerClearedAt || 0) >= conflictTimerTime;
        if ((isRecentLocalAction || isClearedLocally) && !isFocusRunning && !activeFocusQuest && !activeRewardItem) {
          appState.activeTimer = null;
        }

        const checked = deriveLegitimateBalance(appState);
        appState.profile.coins = checked.coins;
        appState.profile.totalCoinsEarned = checked.totalCoinsEarned;
        saveLocalCache();
        renderAll();
        if (appState.activeTimer && (!isRecentLocalAction || isFocusRunning || activeFocusQuest || activeRewardItem)) {
          restoreFocusTimer();
        }
        if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        if (modalSyncState) modalSyncState.textContent = 'Đã lưu trên Cloud';
        if (modalSyncTime) modalSyncTime.textContent = new Date(appState.lastSyncedAt || Date.now()).toLocaleTimeString();
        showToast('Đã tự động cập nhật dữ liệu mới nhất từ thiết bị khác!', 'info');
        return;
      }

      if (data.coins !== undefined) appState.profile.coins = data.coins;
      if (data.totalCoinsEarned !== undefined) appState.profile.totalCoinsEarned = data.totalCoinsEarned;
      if (data.adminAdjusted !== undefined) appState.profile.adminAdjusted = data.adminAdjusted;
      if (data.level !== undefined) appState.profile.level = data.level;
      if (data.title) appState.profile.title = data.title;
      if (Array.isArray(data.ledger)) {
        appState.ledger = data.ledger;
        renderLedger();
      }
      appState.lastSyncedAt = data.syncedAt || Date.now();
      saveLocalCache();

      if (data.penalty) {
        showToast(data.penalty, 'error');
        renderHeader();
      }

      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (modalSyncState) modalSyncState.textContent = 'Đã lưu trên Cloud';
      if (modalSyncTime) modalSyncTime.textContent = new Date(appState.lastSyncedAt).toLocaleTimeString();
      if (isManual && !data.penalty) showToast('Đồng bộ Cloud thành công!', 'success');
    } else {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 401) {
        if (modalSyncState) modalSyncState.textContent = 'Hết hạn Google Session';
        if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-rose-500';
        if (isManual) showToast('Phiên đăng nhập Google đã hết hạn. Vui lòng đăng nhập lại!', 'error');
      } else if (res.status === 409 || res.status === 403) {
        showToast(errData.error || 'Lỗi phân quyền hoặc trùng tên!', 'error');
        if (modalSyncState) modalSyncState.textContent = 'Trùng tên / Không có quyền';
        if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-rose-500';
      } else {
        throw new Error(errData.error || 'Sync endpoint failed');
      }
    }
  } catch (err) {
    console.warn('Sync failed (offline or redis unavailable):', err.message);
    if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600';
    if (modalSyncState) modalSyncState.textContent = 'Chỉ lưu cục bộ (Offline)';
  }
}

// ponytail: Tối ưu hóa dung lượng lưu trữ User State (Rolling Window an toàn)
function pruneStateForStorage(state) {
  if (!state || typeof state !== 'object') return state;

  // 1. Quests: Giữ 100% active quests + tối đa 30 completed quests gần nhất
  const quests = Array.isArray(state.quests) ? state.quests : [];
  const activeQuests = quests.filter(q => q.status !== 'completed');
  const completedQuests = quests.filter(q => q.status === 'completed');
  completedQuests.sort((a, b) => (Number(b.completedAt || b.createdAt || 0)) - (Number(a.completedAt || a.createdAt || 0)));
  state.quests = [...activeQuests, ...completedQuests.slice(0, 30)];

  // 2. Inventory: Giữ 100% unused items + tối đa 20 used items gần nhất
  const inventory = Array.isArray(state.inventory) ? state.inventory : [];
  const unusedItems = inventory.filter(i => !i.isUsed || (i.savedTimer && Number(i.savedTimer.remainingSeconds) > 0));
  const usedItems = inventory.filter(i => i.isUsed && (!i.savedTimer || Number(i.savedTimer.remainingSeconds) <= 0));
  usedItems.sort((a, b) => (Number(b.usedAt || b.purchasedAt || 0)) - (Number(a.usedAt || a.purchasedAt || 0)));
  state.inventory = [...unusedItems, ...usedItems.slice(0, 20)];

  // 3. Ledger: Giữ tối đa 100 giao dịch gần nhất
  if (Array.isArray(state.ledger) && state.ledger.length > 100) {
    state.ledger = state.ledger.slice(0, 100);
  }

  // 4. Completed Quest IDs (chống replay attack): Giữ tối đa 500 ID
  if (Array.isArray(state.completedQuestIds) && state.completedQuestIds.length > 500) {
    state.completedQuestIds = state.completedQuestIds.slice(0, 500);
  }

  return state;
}

function triggerSave(needsCloud = true, immediate = false, timerAction = null, skipFullRender = false) {
  pruneStateForStorage(appState);

  // Self-heal corrupted bounty targetMinutes if 0 was coerced to 25
  for (const q of (appState.quests || [])) {
    if (q.type === 'bounty' && (parseInt(q.targetMinutes, 10) || 0) === 25) {
      q.targetMinutes = 0;
    }
  }

  // Anti-cheat check: Ngăn chặn sửa đổi biến global qua DevTools Console
  const check = deriveLegitimateBalance(appState);
  if (check.tampered) {
    console.warn('Phát hiện can thiệp số Vàng. Đã tự động cân bằng về giá trị chuẩn:', check.coins);
    appState.profile.coins = check.coins;
    appState.profile.totalCoinsEarned = check.totalCoinsEarned;
  }
  appState.lastModified = Math.max(Date.now(), (Number(appState.lastSyncedAt) || 0) + 1);
  saveLocalCache();

  // Phát tín hiệu đồng bộ đa tab tức thì qua BroadcastChannel
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ch = new BroadcastChannel('levelup_sync_channel');
      ch.postMessage({
        type: 'STATE_UPDATED',
        tabId: CURRENT_TAB_ID,
        profile: {
          coins: appState.profile.coins,
          totalCoinsEarned: appState.profile.totalCoinsEarned,
          adminAdjusted: appState.profile.adminAdjusted,
          bank: appState.profile.bank
        }
      });
      ch.close();
    } catch (_) {}
  }

  if (skipFullRender) {
    // Bỏ qua renderAll khi thao tác timer để chống giật lag
  } else {
  try {
    renderAll();
  } catch (renderErr) {
    console.error('Lỗi giao diện khi renderAll trong triggerSave:', renderErr);
  }
  }

  if (needsCloud) {
    clearTimeout(syncTimeout);
    if (immediate) {
      syncTimeout = null;
      syncWithCloud(false, timerAction);
    } else {
      syncTimeout = setTimeout(() => {
        syncWithCloud(false, timerAction);
      }, 600);
    }
  }
}

let isHydrating = false;

async function hydrateFromCloud(isManual = false) {
  if (isHydrating) return;
  const nick = appState.profile?.nickname;
  const googleId = appState.profile?.googleId;
  const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token || getOrCreateUserToken();

  if (!googleId || !nick || !token) return;
  isHydrating = true;

  const syncDot = document.getElementById('sync-indicator');
  const modalSyncState = document.getElementById('modal-sync-state');
  const modalSyncTime = document.getElementById('modal-sync-time');

  if (isManual) {
    if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
    if (modalSyncState) modalSyncState.textContent = 'Đang kiểm tra dữ liệu Cloud...';
  }

  try {
    const res = await fetch('/api/sync', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-rose-500';
      if (modalSyncState) modalSyncState.textContent = 'Hết hạn Google Session';
      return;
    }

    if (!res.ok) return;

    const result = await res.json();
    if (!result.found || !result.data) {
      if (isManual) showToast('Chưa có dữ liệu trên Cloud. Dữ liệu sẽ được lưu khi bạn thao tác!', 'info');
      return;
    }

    const cloudData = result.data;
    const cloudTime = Number(cloudData.lastModified || cloudData.lastSyncedAt || 0);
    const localTime = Number(appState.lastModified || appState.lastSyncedAt || 0);
    const timerCloudTime = Number(cloudData.activeTimer?.updatedAt || cloudData.activeTimer?.lastTickTime || 0);
    const timerLocalTime = appState.activeTimer
      ? Number(appState.activeTimer?.updatedAt || 0)
      : Number(appState.lastTimerClearedAt || appState.lastModified || 0);
    const timerChanged = JSON.stringify(cloudData.activeTimer || null) !== JSON.stringify(appState.activeTimer || null);
    const isRecentLocalAction = (Date.now() - lastLocalTimerActionTime < TIMER_MUTATION_GRACE_MS);

    // Nếu một thiết bị khác đã tiếp quản quyền runner và đang chạy -> Dừng ngay lập tức trên thiết bị này
    // (Chỉ dừng nếu runnerId khác đó thực sự MỚI HƠN mốc thao tác của thiết bị này)
    if (isFocusRunning && cloudData.activeTimer?.runnerId && cloudData.activeTimer.runnerId !== CURRENT_RUNNER_ID) {
      if (timerCloudTime >= (lastLocalTimerActionTime || 0)) {
        isFocusRunning = false;
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
        releaseWakeLock();
        renderFocusStationUI();
        updateTimerDisplay();
        updateQuestCardTimerState(activeFocusQuest?.id, false, false);
        showToast('Phiên đếm giờ đã chuyển sang thiết bị khác.', 'info');
      }
    }

    // Nếu Cloud đã chuyển sang tạm dừng mà thiết bị này vẫn đang chạy -> Dừng ngay nếu lệnh pause thực sự mới hơn
    if (isFocusRunning && cloudData.activeTimer && !cloudData.activeTimer.isRunning) {
      if (!isRecentLocalAction && timerCloudTime > (lastLocalTimerActionTime || 0)) {
        isFocusRunning = false;
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
        releaseWakeLock();
        renderFocusStationUI();
        updateTimerDisplay();
        updateQuestCardTimerState(activeFocusQuest?.id, false, true);
      }
    }

    // Nếu trên Cloud đã hủy phiên (activeTimer = null) mà thiết bị này còn phiên -> Chỉ giải phóng nếu Cloud mới hơn
    if (cloudData.activeTimer === null && appState.activeTimer) {
      if (!isRecentLocalAction && cloudTime > Math.max(lastLocalTimerActionTime, timerLocalTime)) {
        clearFocusTimerSession(false);
      } else if (!isRecentLocalAction && cloudTime >= (lastLocalTimerActionTime || 0)) {
        clearFocusTimerSession(false);
      }
    }

    // Nếu Cloud mới hơn (do làm nhiệm vụ trên máy khác) HOẶC trạng thái Timer từ Cloud thực sự mới hơn:
    const isCloudTimerNewer = !isRecentLocalAction && timerChanged && (
      Boolean(cloudData.activeTimer && (!appState.activeTimer || timerCloudTime > timerLocalTime || timerCloudTime >= (lastLocalTimerActionTime || 0))) ||
      Boolean(!cloudData.activeTimer && appState.activeTimer && (cloudTime > timerLocalTime || cloudTime >= (lastLocalTimerActionTime || 0)))
    );

    if (cloudTime > localTime || isCloudTimerNewer) {
      const prevRunner = isFocusRunning && (!appState.activeTimer?.runnerId || appState.activeTimer.runnerId === CURRENT_RUNNER_ID);
      const prevRemaining = focusRemainingSeconds;
      const prevActiveQuest = activeFocusQuest;

      // Bảo tồn savedTimer cục bộ nếu cloudData snapshot chưa kịp cập nhật
      const localSavedQuests = new Map((appState.quests || []).filter(q => q.savedTimer).map(q => [q.id, q.savedTimer]));
      const localSavedItems = new Map((appState.inventory || []).filter(i => i.savedTimer).map(i => [i.id, i.savedTimer]));

      appState = normalizeObjectNFC({
        ...DEFAULT_STATE,
        ...cloudData,
        profile: {
          ...DEFAULT_STATE.profile,
          ...(cloudData.profile || {}),
          sessionToken: appState.profile.sessionToken || cloudData.profile?.sessionToken,
          googleToken: appState.profile.googleToken || cloudData.profile?.googleToken
        }
      });

      for (const q of (appState.quests || [])) {
        if (!q.savedTimer && localSavedQuests.has(q.id)) {
          const localSaved = localSavedQuests.get(q.id);
          const savedAt = Number(localSaved?.savedAt || 0);
          if (savedAt > cloudTime || (Date.now() - savedAt < TIMER_MUTATION_GRACE_MS)) {
            q.savedTimer = localSaved;
          }
        }
      }
      for (const it of (appState.inventory || [])) {
        if (!it.savedTimer && localSavedItems.has(it.id)) {
          const localSaved = localSavedItems.get(it.id);
          const savedAt = Number(localSaved?.savedAt || 0);
          if (savedAt > cloudTime || (Date.now() - savedAt < TIMER_MUTATION_GRACE_MS)) {
            it.savedTimer = localSaved;
          }
        }
      }

      const isClearedLocally = (appState.lastTimerClearedAt || 0) >= timerCloudTime;
      if ((isRecentLocalAction || isClearedLocally) && !isFocusRunning && !activeFocusQuest && !activeRewardItem) {
        appState.activeTimer = null;
      }

      const checked = deriveLegitimateBalance(appState);
      appState.profile.coins = checked.coins;
      appState.profile.totalCoinsEarned = checked.totalCoinsEarned;

      applyTheme(appState.profile.theme || 'dark');
      saveLocalCache();
      renderAll();

      // Nếu thiết bị này đang là runner chạy mượt mà và Cloud không có runnerId khác mới hơn, bảo toàn timer đang chạy
      const isCloudSameRunner = cloudData.activeTimer && cloudData.activeTimer.isRunning && (!cloudData.activeTimer.runnerId || cloudData.activeTimer.runnerId === CURRENT_RUNNER_ID);
      if (prevRunner && (!cloudData.activeTimer?.runnerId || cloudData.activeTimer.runnerId === CURRENT_RUNNER_ID) && isFocusRunning && (isRecentLocalAction || isCloudSameRunner)) {
        activeFocusQuest = prevActiveQuest;
        focusRemainingSeconds = prevRemaining;
        isFocusRunning = true;
        renderFocusStationUI();
        updateTimerDisplay();
        updateQuestCardTimerState(activeFocusQuest?.id, true, true);
      } else if (appState.activeTimer && (!isRecentLocalAction || isFocusRunning || activeFocusQuest || activeRewardItem)) {
        restoreFocusTimer();
      }

      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (modalSyncState) modalSyncState.textContent = 'Đã cập nhật từ Cloud';
      if (modalSyncTime) modalSyncTime.textContent = new Date(cloudData.lastSyncedAt || Date.now()).toLocaleTimeString();
      if (isManual) showToast('Đã tải dữ liệu mới nhất từ thiết bị khác thành công!', 'success');
    } else {
      if (timerChanged && !isRecentLocalAction) {
        if (cloudData.activeTimer === null) {
          if (cloudTime > timerLocalTime || cloudTime >= (lastLocalTimerActionTime || 0)) {
            clearFocusTimerSession(false);
          }
        } else if (timerCloudTime > timerLocalTime || timerCloudTime >= (lastLocalTimerActionTime || 0)) {
          const isClearedLocally = (appState.lastTimerClearedAt || 0) >= timerCloudTime;
          if ((isRecentLocalAction || isClearedLocally) && !isFocusRunning && !activeFocusQuest && !activeRewardItem) {
            // Local vừa dừng/bảo lưu, bỏ qua
          } else {
            appState.activeTimer = cloudData.activeTimer || null;
            const isMyRunnerRunning = isFocusRunning && (!cloudData.activeTimer.runnerId || cloudData.activeTimer.runnerId === CURRENT_RUNNER_ID);
            if (!isMyRunnerRunning && appState.activeTimer) {
              restoreFocusTimer();
            }
          }
        }
      }
      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (modalSyncState) modalSyncState.textContent = 'Đã lưu trên Cloud';
      if (modalSyncTime) modalSyncTime.textContent = new Date(appState.lastSyncedAt || Date.now()).toLocaleTimeString();
      if (isManual) showToast('Dữ liệu đã ở trạng thái mới nhất!', 'info');
    }
  } catch (err) {
    console.warn('Hydrate from cloud failed:', err.message);
  } finally {
    isHydrating = false;
  }
}

async function loadFromCloud(tokenOverride = null) {
  return hydrateFromCloud(true);
}

async function logoutGoogle() {
  const ok = await confirmAction({
    title: 'ĐĂNG XUẤT TÀI KHOẢN',
    message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Google này? Dữ liệu đã đồng bộ trên đám mây sẽ được bảo toàn nguyên vẹn.',
    confirmText: 'Đăng Xuất',
    icon: '🚪',
    btnColor: 'rose'
  });
  if (!ok) return;

  clearTimeout(syncTimeout);
  syncTimeout = null;

  const token = appState.profile?.sessionToken || appState.profile?.googleToken;
  try {
    await fetch('/api/sync?action=logout', {
      method: 'POST',
      credentials: 'include',
      ...(token ? { headers: { 'Authorization': `Bearer ${token}` } } : {})
    });
  } catch (_) {}

  if (window.google?.accounts?.id) {
    try { window.google.accounts.id.disableAutoSelect(); } catch (_) {}
  }
  clearLocalCache();
  clearLegacyLocalStorage();
  clearFocusTimerSession();
  appState = {
    ...DEFAULT_STATE,
    profile: {
      ...DEFAULT_STATE.profile,
      nickname: '',
      googleId: '',
      googleEmail: '',
      googlePicture: '',
      googleToken: '',
      sessionToken: '',
      hasOnboarded: false
    }
  };
  closeModal('modal-profile');
  renderAll();
  openModal('modal-welcome');
  const tabLogin = document.getElementById('btn-tab-welcome-login');
  if (tabLogin) tabLogin.click();
  else renderGoogleSignInButton();
  showToast('Đã đăng xuất tài khoản Google.', 'info');
}

async function switchGoogleAccount() {
  const ok = await confirmAction({
    title: 'ĐỔI TÀI KHOẢN GOOGLE',
    message: 'Hệ thống sẽ đăng xuất tài khoản hiện tại và đưa bạn về màn hình đăng nhập Google để chọn tài khoản khác.',
    confirmText: 'Đổi Tài Khoản',
    icon: '🔄',
    btnColor: 'amber'
  });
  if (!ok) return;

  clearTimeout(syncTimeout);
  syncTimeout = null;

  const token = appState.profile?.sessionToken || appState.profile?.googleToken;
  try {
    await fetch('/api/sync?action=logout', {
      method: 'POST',
      credentials: 'include',
      ...(token ? { headers: { 'Authorization': `Bearer ${token}` } } : {})
    });
  } catch (_) {}

  if (window.google?.accounts?.id) {
    try { window.google.accounts.id.disableAutoSelect(); } catch (_) {}
  }
  clearLocalCache();
  clearLegacyLocalStorage();
  clearFocusTimerSession();
  appState = {
    ...DEFAULT_STATE,
    profile: {
      ...DEFAULT_STATE.profile,
      nickname: '',
      googleId: '',
      googleEmail: '',
      googlePicture: '',
      googleToken: '',
      sessionToken: '',
      hasOnboarded: false
    }
  };
  closeModal('modal-profile');
  renderAll();
  openModal('modal-welcome');
  const tabLogin = document.getElementById('btn-tab-welcome-login');
  if (tabLogin) tabLogin.click();
  else renderGoogleSignInButton();
  showToast('Vui lòng đăng nhập tài khoản Google mới.', 'info');
}

// =============================================================================
// 4. TOAST NOTIFICATIONS & RPG HELPERS
// =============================================================================
// ponytail: single in-flight confirm modal; upgrade to queue if concurrent dialogs needed
let activeConfirmResolve = null;

function confirmAction({
  title = 'Xác Nhận',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  detail = '',
  confirmText = 'Xác Nhận',
  cancelText = 'Hủy',
  icon = '❓',
  btnColor = 'amber',
  onConfirm = null,
  onCancel = null
} = {}) {
  return new Promise((resolve) => {
    if (activeConfirmResolve) {
      activeConfirmResolve(false);
      activeConfirmResolve = null;
    }

    const modal = document.getElementById('modal-confirm');
    if (!modal) {
      const res = window.confirm(`${title}\n${message}`);
      if (res && typeof onConfirm === 'function') onConfirm();
      if (!res && typeof onCancel === 'function') onCancel();
      return resolve(res);
    }

    activeConfirmResolve = (result) => {
      if (result && typeof onConfirm === 'function') {
        try { onConfirm(); } catch (err) { console.error(err); }
      } else if (!result && typeof onCancel === 'function') {
        try { onCancel(); } catch (err) { console.error(err); }
      }
      resolve(result);
    };

    const iconEl = document.getElementById('confirm-modal-icon');
    const titleEl = document.getElementById('confirm-modal-title');
    const descEl = document.getElementById('confirm-modal-desc');
    const detailEl = document.getElementById('confirm-modal-detail');
    const cancelBtn = document.getElementById('btn-confirm-cancel');
    const okBtn = document.getElementById('btn-confirm-ok');

    if (iconEl) iconEl.textContent = icon;
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = message;

    if (detailEl) {
      if (detail) {
        detailEl.textContent = detail;
        detailEl.classList.remove('hidden');
      } else {
        detailEl.textContent = '';
        detailEl.classList.add('hidden');
      }
    }

    if (cancelBtn) cancelBtn.textContent = cancelText;

    if (okBtn) {
      okBtn.textContent = confirmText;
      okBtn.className = 'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-md active:scale-95 text-slate-950';
      if (btnColor === 'emerald') {
        okBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500', 'text-white', 'shadow-emerald-600/20');
      } else if (btnColor === 'rose') {
        okBtn.classList.add('bg-rose-600', 'hover:bg-rose-500', 'text-white', 'shadow-rose-600/20');
      } else if (btnColor === 'cyan') {
        okBtn.classList.add('bg-cyan-600', 'hover:bg-cyan-500', 'text-white', 'shadow-cyan-600/20');
      } else {
        okBtn.classList.add('bg-amber-500', 'hover:bg-amber-400', 'text-slate-950', 'shadow-amber-500/20');
      }
    }

    modal.classList.remove('hidden');
    sfx.playClick();
  });
}

function closeConfirmDialog(result = false) {
  const modal = document.getElementById('modal-confirm');
  if (modal) modal.classList.add('hidden');
  if (activeConfirmResolve) {
    const cb = activeConfirmResolve;
    activeConfirmResolve = null;
    cb(result);
  }
}

let lastToastMessage = '';
let lastToastTime = 0;

// ponytail: single action button per toast; upgrade to list if multiple concurrent actions needed
function showToast(message, type = 'info', action = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const now = Date.now();
  if (message === lastToastMessage && (now - lastToastTime < 3000)) {
    return; // Bỏ qua thông báo trùng lặp trong 3 giây
  }
  lastToastMessage = message;
  lastToastTime = now;

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-900/90 text-emerald-100 border-emerald-500/50 dark:bg-emerald-950/90 dark:text-emerald-200',
    gold: 'bg-amber-900/90 text-amber-100 border-amber-500/60 dark:bg-amber-950/90 dark:text-amber-200',
    error: 'bg-rose-900/90 text-rose-100 border-rose-500/50 dark:bg-rose-950/90 dark:text-rose-200',
    info: 'bg-slate-900/95 text-slate-100 border-slate-700 dark:bg-slate-900/95 dark:text-slate-200'
  };

  const icons = {
    success: '✅',
    gold: COIN_ICON_HTML,
    error: '❌',
    info: '📜'
  };

  toast.className = `p-3 rounded-xl border shadow-xl flex items-center justify-between gap-3 text-xs font-semibold backdrop-blur-md pointer-events-auto transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;

  const content = document.createElement('div');
  content.className = 'flex items-center gap-2.5 min-w-0';
  content.innerHTML = `<span>${icons[type] || '📜'}</span><span class="break-words">${escapeHtml(message)}</span>`;
  toast.appendChild(content);

  if (action && typeof action.onClick === 'function') {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm active:scale-95 flex items-center gap-1';
    actionBtn.innerHTML = `<span>↩️</span><span>${escapeHtml(action.label || 'Hoàn tác')}</span>`;
    actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toast.remove();
      action.onClick();
    });
    toast.appendChild(actionBtn);
  }

  container.appendChild(toast);

  // Trigger anim
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  const duration = action ? 6500 : 3500;
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function calculateRank(coins) {
  if (coins <= 5) return 'E';
  if (coins <= 12) return 'D';
  if (coins <= 25) return 'C';
  if (coins <= 45) return 'B';
  if (coins <= 75) return 'A';
  return 'S';
}

function addEXP(amount) {
  appState.profile.exp += amount;
  let leveledUp = false;
  while (appState.profile.exp >= appState.profile.level * 100) {
    appState.profile.exp -= appState.profile.level * 100;
    appState.profile.level += 1;
    leveledUp = true;
  }
  if (leveledUp) {
    sfx.playFanfare();
    showToast(`🎉 CHÚC MỪNG! BẠN ĐÃ LÊN CẤP ${appState.profile.level}!`, 'gold');
    updateTitleByLevel();
  }
}

// ponytail: Thu hồi EXP đa tầng, nếu EXP về âm thì hạ cấp độ tương ứng xuống và đổi phần dư
function deductEXP(amount) {
  let expToDeduct = Math.max(0, parseInt(amount, 10) || 0);
  while (expToDeduct > 0) {
    if (appState.profile.exp >= expToDeduct) {
      appState.profile.exp -= expToDeduct;
      expToDeduct = 0;
    } else {
      expToDeduct -= appState.profile.exp;
      if (appState.profile.level > 1) {
        appState.profile.level -= 1;
        appState.profile.exp = appState.profile.level * 100;
      } else {
        appState.profile.exp = 0;
        expToDeduct = 0;
      }
    }
  }
  updateTitleByLevel();
}

function updateTitleByLevel() {
  const isOverdue = Boolean(appState.profile?.bank?.loan?.isOverdue);
  if (isOverdue) {
    appState.profile.title = 'Con Nợ Quá Hạn ⚠️';
    return;
  }
  const lvl = appState.profile.level;
  if (lvl >= 20) appState.profile.title = 'Huyền Thoại Kỷ Luật';
  else if (lvl >= 15) appState.profile.title = 'Bậc Thầy Năng Suất';
  else if (lvl >= 10) appState.profile.title = 'Chuyên Gia Tập Trung';
  else if (lvl >= 6) appState.profile.title = 'Chiến Binh Kiên Trì';
  else if (lvl >= 3) appState.profile.title = 'Học Viên Chăm Chỉ';
  else appState.profile.title = 'Tân Binh Cấp 1';
}

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

// =============================================================================
// 5. FOCUS POMODORO COUNTDOWN TIMER (Delta-Time Engine, Wake Lock, Persistence)
// =============================================================================
const TIMER_STORAGE_KEY = 'levelup_focus_timer';

let activeFocusQuest = null;
let activeRewardItem = null;
let focusTimerInterval = null;
let focusRemainingSeconds = 0;
let focusTotalSeconds = 0;
let isFocusRunning = false;
let isBreakMode = false;
let lastTickTime = Date.now();
let wakeLock = null;
let lastFormattedTitle = '';
let actualFocusedSeconds = 0;

function extractDurationFromText(text) {
  if (!text || typeof text !== 'string') return 0;
  const t = text.toLowerCase();
  if (/\b(nửa\s*tiếng|nửa\s*giờ)\b/i.test(t)) return 30;
  const compoundMatch = t.match(/(\d+)\s*(?:tiếng|giờ|h)\s*(\d+)\s*(?:phút|p)?\b/i);
  if (compoundMatch) return parseInt(compoundMatch[1], 10) * 60 + parseInt(compoundMatch[2], 10);
  const halfHourMatch = t.match(/(\d+)\s*(?:tiếng|giờ)\s*rưỡi\b/i);
  if (halfHourMatch) return parseInt(halfHourMatch[1], 10) * 60 + 30;
  const hourMatch = t.match(/(\d+)\s*(tiếng|giờ|hour|h)\b/i);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
  const minMatch = t.match(/(\d+)\s*(phút|min|p)\b/i);
  if (minMatch) return parseInt(minMatch[1], 10);
  return 0;
}

function extractRewardDuration(item) {
  if (item && item.targetMinutes !== undefined && item.targetMinutes !== null) {
    const tm = parseInt(item.targetMinutes, 10);
    if (!isNaN(tm)) return Math.max(0, tm);
  }
  const textDuration = extractDurationFromText(`${item?.name || ''} ${item?.description || ''}`);
  if (textDuration > 0) return textDuration;
  if (item?.tier === 'common') return 15;
  if (item?.tier === 'rare') return 30;
  if (item?.tier === 'epic') return 60;
  if (item?.tier === 'legendary') return 90;
  return 25;
}

// Screen Wake Lock API
async function requestWakeLock() {
  if (!('wakeLock' in navigator) || !isFocusRunning || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
  } catch (_) {
    wakeLock = null;
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isFocusRunning) {
    requestWakeLock();
  }
});

let lastNotificationBody = '';
let lastNotificationTime = 0;

// Web Notifications API
function sendFocusNotification(title, body) {
  if (!('Notification' in window)) return;
  const now = Date.now();
  if (body === lastNotificationBody && (now - lastNotificationTime < 5000)) {
    return; // Bỏ qua push notification trùng lặp trong 5 giây
  }
  lastNotificationBody = body;
  lastNotificationTime = now;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚔️</text></svg>'
      });
      if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
    } catch (_) {}
  }
}

// LocalStorage & Redis Cloud State Persistence
let lastCloudTimerCheckpoint = Date.now();

// Kéo thông tin timer mới nhất từ Cloud của thiết bị đang chạy trước khi bắt đầu hoặc tiếp quản
async function pullLatestTimerFromCloud() {
  if (!appState.profile?.googleId || !appState.profile?.nickname) return null;
  try {
    const token = appState.profile.sessionToken || appState.profile.googleToken || appState.profile.token || getOrCreateUserToken();
    if (!token) return null;
    const res = await fetch(`/api/sync?token=${encodeURIComponent(token)}&nickname=${encodeURIComponent(appState.profile.nickname)}&ts=${Date.now()}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.ok) {
      const result = await res.json();
      if (result.found && result.data) {
        if (result.data.activeTimer === null) {
          clearFocusTimerSession(false);
          return null;
        }
        const remoteTimer = result.data.activeTimer;
        if (remoteTimer) {
          if (remoteTimer.isRunning) {
            const refTime = Number(remoteTimer.lastTickTime || remoteTimer.updatedAt || Date.now());
            const elapsed = Math.max(0, (Date.now() - refTime) / 1000);
            focusRemainingSeconds = Math.max(0, (remoteTimer.remainingSeconds || 0) - elapsed);
            actualFocusedSeconds = (remoteTimer.actualFocusedSeconds || 0) + (!remoteTimer.isBreakMode ? elapsed : 0);
          } else {
            focusRemainingSeconds = Math.max(0, remoteTimer.remainingSeconds || 0);
            actualFocusedSeconds = remoteTimer.actualFocusedSeconds || 0;
          }
          focusTotalSeconds = remoteTimer.totalSeconds || focusTotalSeconds;
          if (focusRemainingSeconds <= 0) {
            focusRemainingSeconds = 0;
            actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);
          }
          appState.activeTimer = {
            ...remoteTimer,
            remainingSeconds: focusRemainingSeconds,
            actualFocusedSeconds
          };

          if (remoteTimer.isBreakMode) {
            isBreakMode = true;
            activeFocusQuest = null;
            activeRewardItem = null;
          } else if (remoteTimer.isRewardMode && remoteTimer.rewardItemId) {
            if (Array.isArray(result.data.inventory)) {
              for (const inv of result.data.inventory) {
                if (!appState.inventory?.some(i => i.id === inv.id)) {
                  appState.inventory = appState.inventory || [];
                  appState.inventory.push(inv);
                }
              }
            }
            activeRewardItem = appState.inventory?.find(i => i.id === remoteTimer.rewardItemId) || null;
            activeFocusQuest = null;
            isBreakMode = false;
          } else if (remoteTimer.questId) {
            if (Array.isArray(result.data.quests)) {
              for (const q of result.data.quests) {
                if (!appState.quests?.some(item => item.id === q.id)) {
                  appState.quests = appState.quests || [];
                  appState.quests.push(q);
                }
              }
            }
            activeFocusQuest = appState.quests?.find(q => q.id === remoteTimer.questId) || null;
            activeRewardItem = null;
            isBreakMode = false;
          }

          return appState.activeTimer;
        }
      }
    }
  } catch (err) {
    console.warn('pullLatestTimerFromCloud error:', err);
  }
  return null;
}

function saveFocusTimerState(syncCloudNow = false, immediate = false, timerAction = null) {
  lastLocalTimerActionTime = Date.now();
  if (!activeFocusQuest && !isBreakMode && !activeRewardItem) {
    if (appState.activeTimer?.questId) {
      activeFocusQuest = appState.quests?.find(q => q.id === appState.activeTimer.questId) || null;
    } else if (appState.activeTimer?.isRewardMode && appState.activeTimer?.rewardItemId) {
      activeRewardItem = appState.inventory?.find(i => i.id === appState.activeTimer.rewardItemId) || null;
    } else if (appState.activeTimer?.isBreakMode) {
      isBreakMode = true;
    }
  }

  if (!activeFocusQuest && !isBreakMode && !activeRewardItem) {
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch (_) {}
    if (appState.activeTimer) {
      appState.activeTimer = null;
      appState.lastTimerClearedAt = Date.now();
      if (syncCloudNow) triggerSave(true, immediate, timerAction || 'cancel', true);
    }
    return;
  }

  // Nếu không phải runner đang chạy và không phải lệnh đồng bộ chủ động, không ghi đè timer lên Redis
  if (appState.activeTimer?.runnerId && appState.activeTimer.runnerId !== CURRENT_RUNNER_ID && !isFocusRunning && !syncCloudNow) {
    return;
  }

  const state = {
    questId: activeFocusQuest ? activeFocusQuest.id : null,
    questTitle: activeFocusQuest ? activeFocusQuest.title : null,
    questRank: activeFocusQuest ? activeFocusQuest.rank : null,
    rewardCoins: activeFocusQuest ? activeFocusQuest.rewardCoins : 0,
    targetMinutes: activeFocusQuest ? activeFocusQuest.targetMinutes : 0,
    rewardItemId: activeRewardItem ? activeRewardItem.id : null,
    rewardItemName: activeRewardItem ? activeRewardItem.name : null,
    rewardItemIcon: activeRewardItem ? activeRewardItem.icon : null,
    isRewardMode: Boolean(activeRewardItem),
    remainingSeconds: focusRemainingSeconds,
    totalSeconds: focusTotalSeconds,
    actualFocusedSeconds: actualFocusedSeconds,
    isRunning: isFocusRunning,
    isBreakMode: isBreakMode,
    runnerId: isFocusRunning ? CURRENT_RUNNER_ID : (appState.activeTimer?.runnerId || CURRENT_RUNNER_ID),
    lastTickTime: Date.now(),
    updatedAt: (timerAction || !appState.activeTimer?.updatedAt) ? Date.now() : appState.activeTimer.updatedAt
  };
  appState.activeTimer = state;
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}

  if (syncCloudNow) {
    triggerSave(true, immediate, timerAction, true);
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const syncChannel = new BroadcastChannel('levelup_sync_channel');
        syncChannel.postMessage({
          type: 'TIMER_SYNC_UPDATE',
          tabId: CURRENT_TAB_ID,
          runnerId: state.runnerId,
          isRunning: isFocusRunning,
          action: timerAction
        });
        syncChannel.close();
      } catch (_) {}
    }
  }
}

function restoreFocusTimer() {
  let state = appState.activeTimer;
  let localState = null;
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (raw) localState = JSON.parse(raw);
  } catch (_) {}

  // Reconcile Cloud vs Local: ưu tiên bản ghi có mốc thời gian cập nhật mới nhất
  if (state && localState) {
    const cloudTime = state.updatedAt || state.lastTickTime || 0;
    const localTime = localState.updatedAt || localState.lastTickTime || 0;
    if (localTime > cloudTime) {
      state = localState;
    }
  } else if (!state && localState) {
    // Chỉ dùng cache cục bộ nếu chưa từng đồng bộ với Cloud
    if (!appState.lastSyncedAt) {
      state = localState;
    }
  }

  if (!state) {
    if (activeFocusQuest || isBreakMode || activeRewardItem) {
      clearFocusTimerSession(false);
    }
    return;
  }

  try {
    if (state.isBreakMode) {
      isBreakMode = true;
      activeFocusQuest = null;
      activeRewardItem = null;
    } else if (state.isRewardMode && state.rewardItemId) {
      const invItem = appState.inventory?.find(i => i.id === state.rewardItemId);
      if (!invItem) {
        // Chưa load xong inventory từ cloud, giữ nguyên timer state tránh xóa nhầm khi reload trang
        return;
      }
      activeRewardItem = invItem;
      activeFocusQuest = null;
      isBreakMode = false;
    } else if (state.questId) {
      const quest = appState.quests?.find(q => q.id === state.questId);
      if (!quest) {
        // ponytail: Chưa load xong quests từ cloud, giữ nguyên timer state tránh xóa nhầm khi reload trang
        return;
      }
      if (quest.status === 'completed') {
        clearFocusTimerSession(false);
        return;
      }
      activeFocusQuest = quest;
      activeRewardItem = null;
      isBreakMode = false;
    } else {
      clearFocusTimerSession(false);
      return;
    }

    focusTotalSeconds = state.totalSeconds || (activeFocusQuest?.targetMinutes || (activeRewardItem ? extractRewardDuration(activeRewardItem) : 25)) * 60;
    actualFocusedSeconds = state.actualFocusedSeconds || 0;

    const isMyRunner = !state.runnerId || state.runnerId === CURRENT_RUNNER_ID;

    // Chỉ được chạy đếm giờ trên đúng 1 thiết bị sở hữu runnerId
    // Thiết bị này chạy thì thiết bị kia PHẢI NGỪNG (không chạy interval đếm ngược)
    if (state.isRunning && isMyRunner) {
      isFocusRunning = true;
      const refTime = state.lastTickTime || state.updatedAt || Date.now();
      const elapsed = Math.max(0, (Date.now() - refTime) / 1000);
      if (!isBreakMode) {
        actualFocusedSeconds += elapsed;
      }
      focusRemainingSeconds = Math.max(0, (state.remainingSeconds || 0) - elapsed);

      if (focusRemainingSeconds <= 0) {
        focusRemainingSeconds = 0;
        actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
        releaseWakeLock();
        updateTimerDisplay();
        if (isBreakMode) {
          breakTimerFinished();
        } else if (activeRewardItem) {
          rewardTimerFinished();
        } else {
          focusTimerFinished();
        }
        return;
      }

      lastTickTime = Date.now();
      requestWakeLock();
      clearInterval(focusTimerInterval);
      focusTimerInterval = setInterval(tickFocusTimer, 500);
    } else {
      // Thiết bị kia đang chạy HOẶC phiên đang tạm dừng -> Thiết bị này DỪNG đếm ngược
      isFocusRunning = false;
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
      releaseWakeLock();

      if (state.isRunning && !isMyRunner) {
        // Đồng bộ thời gian hiển thị tĩnh từ thiết bị đang chạy
        const refTime = state.lastTickTime || state.updatedAt || Date.now();
        const elapsed = Math.max(0, (Date.now() - refTime) / 1000);
        if (!isBreakMode) {
          actualFocusedSeconds += elapsed;
        }
        focusRemainingSeconds = Math.max(0, (state.remainingSeconds || 0) - elapsed);
      } else {
        focusRemainingSeconds = Math.max(0, state.remainingSeconds || 0);
      }

      // Cross-device auto-finish: Timer đã hết trên wall-clock nhưng chưa ai kết thúc
      if (focusRemainingSeconds <= 0 && state.isRunning) {
        focusRemainingSeconds = 0;
        actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);
        updateTimerDisplay();
        if (isBreakMode) {
          breakTimerFinished();
        } else if (activeRewardItem) {
          rewardTimerFinished();
        } else {
          focusTimerFinished();
        }
        return;
      }
    }

    renderFocusStationUI();
    updateTimerDisplay();
    renderQuests();
    renderInventory();
  } catch (e) {
    console.error('Failed to restore focus timer:', e);
    clearFocusTimerSession(false);
  }
}

// Delta-Time Tick Engine
function tickFocusTimer() {
  if (!isFocusRunning) return;

  // Nếu một thiết bị khác đã tiếp quản quyền runner, thiết bị này phải dừng lại ngay lập tức
  if (appState.activeTimer?.runnerId && appState.activeTimer.runnerId !== CURRENT_RUNNER_ID) {
    isFocusRunning = false;
    clearInterval(focusTimerInterval);
    focusTimerInterval = null;
    releaseWakeLock();
    renderFocusStationUI();
    updateTimerDisplay();
    return;
  }

  const now = Date.now();
  const deltaSec = Math.max(0, (now - lastTickTime) / 1000);
  lastTickTime = now;

  if (focusRemainingSeconds > 0) {
    if (!isBreakMode) {
      actualFocusedSeconds += deltaSec;
    }
    focusRemainingSeconds = Math.max(0, focusRemainingSeconds - deltaSec);
    updateTimerDisplay();

    // Checkpoint lên Cloud định kỳ mỗi 30s để các thiết bị khác nắm bắt tiến độ
    if (now - lastCloudTimerCheckpoint >= 30000) {
      lastCloudTimerCheckpoint = now;
      saveFocusTimerState(true);
    } else {
      saveFocusTimerState(false);
    }
  }

  // Completion check NGOÀI block if > 0 để xử lý cả trường hợp remaining đã là 0 khi tick bắt đầu
  if (focusRemainingSeconds <= 0) {
    focusRemainingSeconds = 0;
    actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);
    clearInterval(focusTimerInterval);
    focusTimerInterval = null;
    releaseWakeLock();
    if (isBreakMode) {
      breakTimerFinished();
    } else if (activeRewardItem) {
      rewardTimerFinished();
    } else {
      focusTimerFinished();
    }
  }
}

function updateTimerDisplay() {
  const totalSecs = Math.max(0, Math.round(focusRemainingSeconds));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const display = document.getElementById('timer-display');
  const zenDisplay = document.getElementById('zen-timer-display');
  const statusIcon = document.getElementById('focus-status-icon');

  if (display) display.textContent = timeStr;
  if (zenDisplay) zenDisplay.textContent = timeStr;
  if (statusIcon) {
    statusIcon.textContent = isBreakMode ? 'BREAK' : (activeRewardItem ? 'REWARD' : (isFocusRunning ? 'RUN' : 'PAUSE'));
  }

  // Circular progress ring (r=20, circumference = 2 * PI * 20 ≈ 125.66)
  const ratio = focusTotalSeconds > 0 ? Math.max(0, Math.min(1, focusRemainingSeconds / focusTotalSeconds)) : 0;
  const ring = document.getElementById('focus-progress-ring');
  if (ring) {
    ring.style.strokeDashoffset = String(125.66 * (1 - ratio));
    ring.classList.remove('text-amber-500', 'text-emerald-500', 'text-purple-500');
    if (isBreakMode) {
      ring.classList.add('text-emerald-500');
    } else if (activeRewardItem) {
      ring.classList.add('text-purple-500');
    } else {
      ring.classList.add('text-amber-500');
    }
  }

  // Zen progress ring (r=105, circumference = 2 * PI * 105 ≈ 659.73)
  const zenRing = document.getElementById('zen-progress-ring');
  if (zenRing) {
    zenRing.style.strokeDashoffset = String(659.73 * (1 - ratio));
    zenRing.setAttribute('stroke', isBreakMode ? '#10b981' : (activeRewardItem ? '#a855f7' : '#f59e0b'));
  }

  // Dynamic Browser Tab Title
  const titlePrefix = isBreakMode ? '☕' : (activeRewardItem ? '🎉' : (isFocusRunning ? '▶' : '⏸'));
  const sessionName = activeFocusQuest ? activeFocusQuest.title : (activeRewardItem ? activeRewardItem.name : (isBreakMode ? 'Nghỉ giải lao' : 'Tập trung'));
  const newTitle = `${titlePrefix} (${timeStr}) ${sessionName} | LevelUp`;
  if (newTitle !== lastFormattedTitle) {
    lastFormattedTitle = newTitle;
    document.title = newTitle;
  }
}

function renderFocusStationUI() {
  const station = document.getElementById('active-focus-banner');
  if (!station) return;

  if (!activeFocusQuest && !isBreakMode && !activeRewardItem) {
    station.classList.add('hidden');
    return;
  }

  station.classList.remove('hidden');

  const titleEl = document.getElementById('timer-quest-title');
  const rankEl = document.getElementById('timer-quest-rank');
  const modeLabel = document.getElementById('timer-mode-label');
  const coinsEl = document.getElementById('timer-quest-coins');
  const expEl = document.getElementById('timer-quest-exp');
  const toggleBtn = document.getElementById('btn-timer-toggle');
  const zenToggleBtn = document.getElementById('btn-zen-toggle');

  if (isBreakMode) {
    if (titleEl) titleEl.textContent = 'Nghỉ giải lao nạp năng lượng';
    if (rankEl) {
      rankEl.textContent = 'BREAK';
      rankEl.className = 'text-[10px] px-1.5 py-0.5 rounded font-bold font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
    }
    if (modeLabel) modeLabel.textContent = 'ĐANG NGHỈ GIẢI LAO';
    if (coinsEl) coinsEl.textContent = '+0';
    if (expEl) expEl.textContent = '+0';
  } else if (activeRewardItem) {
    if (titleEl) titleEl.textContent = `${activeRewardItem.icon || '🎁'} ${activeRewardItem.name}`;
    if (rankEl) {
      rankEl.textContent = (activeRewardItem.tier || 'REWARD').toUpperCase();
      rankEl.className = 'text-[10px] px-1.5 py-0.5 rounded font-bold font-mono bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30';
    }
    if (modeLabel) modeLabel.textContent = 'ĐANG TẬN HƯỞNG PHẦN THƯỞNG 🎉';
    if (coinsEl) coinsEl.textContent = `-${activeRewardItem.price}`;
    if (expEl) expEl.textContent = '🎉 Thư giãn';
  } else if (activeFocusQuest) {
    if (titleEl) titleEl.textContent = activeFocusQuest.title;
    if (rankEl) {
      rankEl.textContent = `HẠNG ${activeFocusQuest.rank}`;
      rankEl.className = `rank-badge-${activeFocusQuest.rank} text-[10px] px-1.5 py-0.5 rounded font-bold font-mono`;
    }
    if (modeLabel) modeLabel.textContent = 'ĐANG BẤM GIỜ TẬP TRUNG';
    if (coinsEl) coinsEl.textContent = `+${activeFocusQuest.rewardCoins}`;
    if (expEl) expEl.textContent = `+${activeFocusQuest.rewardCoins * 3}`;
  }

  const isRunningElsewhere = Boolean(
    appState.activeTimer?.isRunning &&
    appState.activeTimer?.runnerId &&
    appState.activeTimer.runnerId !== CURRENT_RUNNER_ID
  );

  const isPausedElsewhere = Boolean(
    !appState.activeTimer?.isRunning &&
    appState.activeTimer?.runnerId &&
    appState.activeTimer.runnerId !== CURRENT_RUNNER_ID
  );

  // Ưu tiên cao nhất: Timer đã hết thời gian -> Hiển thị nút hoàn thành
  const isTimeUp = focusRemainingSeconds <= 0 && Boolean(activeFocusQuest || activeRewardItem || isBreakMode);

  if (isTimeUp) {
    const isProofRequired = activeFocusQuest?.requiresProof && !activeFocusQuest?._proofVerified;
    if (modeLabel) modeLabel.textContent = '🎉 ĐÃ HOÀN THÀNH THỜI GIAN!';
    const toggleText = isBreakMode ? 'Kết Thúc Giờ Nghỉ ☕' : (activeRewardItem ? 'Kết Thúc Hưởng Thụ 🎮' : (isProofRequired ? 'Chụp Ảnh Nhận Vàng 📸' : 'Hoàn Thành & Nhận Thưởng 🎁'));
    if (toggleBtn) {
      toggleBtn.textContent = toggleText;
      toggleBtn.title = toggleText;
      toggleBtn.className = 'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-sm active:scale-95 animate-pulse';
    }
    if (zenToggleBtn) {
      zenToggleBtn.textContent = toggleText;
      zenToggleBtn.title = toggleText;
    }
  } else if (isRunningElsewhere) {
    if (modeLabel) modeLabel.textContent = 'ĐANG CHẠY TRÊN THIẾT BỊ KHÁC 📱';
    const toggleText = 'Tiếp Tục Ở Thiết Bị Này ⏱️';
    if (toggleBtn) {
      toggleBtn.textContent = toggleText;
      toggleBtn.title = 'Tiếp tục ở thiết bị này (Phím tắt: Space)';
      toggleBtn.className = 'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow-sm active:scale-95';
    }
    if (zenToggleBtn) {
      zenToggleBtn.textContent = toggleText;
      zenToggleBtn.title = 'Tiếp tục ở thiết bị này (Phím tắt: Space)';
    }
  } else if (isPausedElsewhere) {
    if (modeLabel) modeLabel.textContent = 'ĐANG TẠM DỪNG (MÁY KHÁC) ⏸️';
    const toggleText = 'Tiếp Tục Ở Thiết Bị Này ⏱️';
    if (toggleBtn) {
      toggleBtn.textContent = toggleText;
      toggleBtn.title = 'Tiếp tục ở thiết bị này (Phím tắt: Space)';
      toggleBtn.className = 'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow-sm active:scale-95';
    }
    if (zenToggleBtn) {
      zenToggleBtn.textContent = toggleText;
      zenToggleBtn.title = 'Tiếp tục ở thiết bị này (Phím tắt: Space)';
    }
  } else {
    if (modeLabel && !isBreakMode) {
      if (activeRewardItem) {
        modeLabel.textContent = isFocusRunning ? 'ĐANG TẬN HƯỞNG PHẦN THƯỞNG 🎉' : 'ĐANG TẠM DỪNG THƯỞNG ⏸️';
      } else {
        modeLabel.textContent = isFocusRunning ? 'ĐANG BẤM GIỜ TẬP TRUNG' : 'ĐANG TẠM DỪNG ⏸️';
      }
    }
    const toggleText = isFocusRunning ? 'Tạm Dừng' : 'Tiếp Tục';
    if (toggleBtn) {
      toggleBtn.textContent = toggleText;
      toggleBtn.title = isFocusRunning ? 'Tạm dừng đếm giờ (Phím tắt: Space)' : 'Tiếp tục đếm giờ (Phím tắt: Space)';
      toggleBtn.className = isFocusRunning
        ? 'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm active:scale-95'
        : 'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-sm active:scale-95';
    }
    if (zenToggleBtn) {
      zenToggleBtn.textContent = toggleText;
      zenToggleBtn.title = isFocusRunning ? 'Tạm dừng đếm giờ (Phím tắt: Space)' : 'Tiếp tục đếm giờ (Phím tắt: Space)';
    }
  }

  const isReward = Boolean(activeRewardItem || appState.activeTimer?.isRewardMode);
  station.querySelectorAll('.btn-timer-adjust').forEach((btn, idx) => {
    btn.textContent = isReward ? (idx === 0 ? '-1m' : '-5m') : (idx === 0 ? '+1m' : '+5m');
    btn.dataset.delta = isReward ? (idx === 0 ? '-60' : '-300') : (idx === 0 ? '60' : '300');
    btn.title = isReward ? (idx === 0 ? 'Giảm 1 phút hưởng thụ' : 'Giảm 5 phút hưởng thụ') : (idx === 0 ? 'Thêm 1 phút tập trung' : 'Thêm 5 phút tập trung');
  });
}

function updateQuestCardTimerState(questId, isRunning, isFocusing) {
  const cards = document.querySelectorAll('#quests-grid .rpg-card, #quests-container .rpg-card');
  cards.forEach(card => {
    const cid = card.dataset.questId;
    if (!cid) return;
    const isTarget = Boolean(questId && cid === questId && isFocusing);
    const startBtn = card.querySelector('.btn-start-focus');
    const headerLeft = card.querySelector('.flex.items-center.justify-between > .flex.items-center');
    let doingBadge = card.querySelector('.badge-quest-doing');

    if (isTarget) {
      card.classList.remove('ring-1', 'ring-sky-500/50', 'shadow-sky-500/10');
      card.classList.add('ring-2', 'ring-amber-500', 'shadow-xl', 'shadow-amber-500/20', 'bg-amber-500/5', 'border-amber-500/50');
      const savedBadge = card.querySelector('.badge-quest-saved');
      if (savedBadge) savedBadge.remove();
      if (!doingBadge && headerLeft) {
        doingBadge = document.createElement('span');
        doingBadge.className = 'badge-quest-doing inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950 shadow-xs animate-pulse';
        doingBadge.textContent = '⏱️ ĐANG LÀM';
        headerLeft.prepend(doingBadge);
      }
      if (startBtn) {
        startBtn.className = 'btn-start-focus w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25';
        const span = startBtn.querySelector('span');
        if (span) span.textContent = isRunning ? 'Đang Chạy...' : 'Tạm Dừng';
      }
    } else {
      if (card.classList.contains('ring-amber-500')) {
        card.classList.remove('ring-2', 'ring-amber-500', 'shadow-xl', 'shadow-amber-500/20', 'bg-amber-500/5', 'border-amber-500/50');
      }
      if (doingBadge) {
        doingBadge.remove();
      }
      const q = appState.quests?.find(x => x.id === cid);
      const hasSaved = Boolean(q?.savedTimer && q.savedTimer.remainingSeconds > 0);
      if (hasSaved) {
        card.classList.add('ring-1', 'ring-sky-500/50', 'shadow-md', 'shadow-sky-500/10');
        if (startBtn) {
          startBtn.className = 'btn-start-focus w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold';
          const span = startBtn.querySelector('span');
          if (span) span.textContent = `Tiếp Tục (${Math.ceil(q.savedTimer.remainingSeconds / 60)}p) ⏱️`;
        }
      } else if (startBtn && startBtn.classList.contains('bg-amber-500/15')) {
        startBtn.className = 'btn-start-focus w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold';
        const span = startBtn.querySelector('span');
        if (span) span.textContent = 'Bắt Đầu ⏱️';
      }
    }
  });
}

async function startFocusTimer(quest) {
  if (!quest) return;
  if (isTimerActionPending) return;
  isTimerActionPending = true;
  setTimeout(() => { isTimerActionPending = false; }, 300);

  // Edge case 1: Nhiệm vụ đã hoàn thành từ trước
  if (quest.status === 'completed') {
    showToast('Nhiệm vụ này đã được hoàn thành!', 'info');
    return;
  }

  // Edge case 1b: Nhiệm vụ lặp lại đang trong thời gian chờ (cooldown)
  const cooldownRemaining = getQuestRepeatCooldownRemaining(quest);
  if (cooldownRemaining > 0) {
    const mins = Math.ceil(cooldownRemaining / 60000);
    showToast(`Nhiệm vụ lặp lại cần cách nhau tối thiểu 10 phút giữa mỗi lần hoàn thành. Vui lòng chờ thêm ${mins} phút!`, 'warning');
    return;
  }

  // Edge case 1c: Nhiệm vụ đã đủ thời gian tập trung, đang chờ chụp ảnh nộp cho AI
  if (quest.focusTimerCompleted && quest.requiresProof && !quest._proofVerified) {
    showToast(`Nhiệm vụ "${quest.title}" đã hoàn thành đủ thời gian! Vui lòng chụp ảnh để AI duyệt nhận Vàng.`, 'info');
    openQuestProofModal(quest);
    return;
  }

  // Edge case 2: Nhấn "Bắt đầu" vào chính nhiệm vụ đang được bấm giờ
  if (activeFocusQuest && activeFocusQuest.id === quest.id) {
    // Timer đã hết -> Hoàn thành ngay lập tức
    if (focusRemainingSeconds <= 0) {
      actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);
      focusRemainingSeconds = 0;
      focusTimerFinished();
      return;
    }
    if (isFocusRunning) {
      showToast(`Nhiệm vụ "${quest.title}" đang được bấm giờ (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại)!`, 'info');
      document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    } else {
      await toggleFocusTimer();
      document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
  }

  // Edge case 2b: Đang trong phiên tận hưởng phần thưởng
  if (activeRewardItem) {
    const prevItem = activeRewardItem;
    const prevMins = Math.ceil(focusRemainingSeconds / 60);
    const ok = await confirmAction({
      title: 'Bảo Lưu Quà & Bắt Đầu Nhiệm Vụ?',
      message: `Bạn đang tận hưởng phần thưởng "${prevItem.name}" (${prevMins} phút còn lại). Bạn có muốn bảo lưu quà để bắt đầu nhiệm vụ "${quest.title}" ngay?`,
      detail: `✅ Thời gian còn lại của phần thưởng sẽ được BẢO LƯU trong Kho Quà để bạn dùng tiếp sau!`,
      confirmText: 'Bảo Lưu & Bắt Đầu ⚔️',
      cancelText: 'Tiếp Tục Dùng Quà 🎁',
      icon: '🎁',
      btnColor: 'cyan'
    });
    if (!ok) return;
    prevItem.savedTimer = {
      remainingSeconds: Math.max(0, focusRemainingSeconds),
      totalSeconds: focusTotalSeconds || (extractRewardDuration(prevItem) * 60),
      savedAt: Date.now()
    };
    activeRewardItem = null;
    renderInventory();
  }

  // Edge case 3: Đang trong phiên nghỉ giải lao
  if (isBreakMode) {
    const ok = await confirmAction({
      title: 'Kết Thúc Giờ Nghỉ?',
      message: `Bạn đang trong giờ nghỉ giải lao (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Bạn có muốn kết thúc nghỉ ngơi để bắt đầu nhiệm vụ "${quest.title}" ngay?`,
      confirmText: 'Bắt Đầu Ngay ⏱️',
      cancelText: 'Nghỉ Tiếp ☕',
      icon: '☕',
      btnColor: 'cyan'
    });
    if (!ok) return;
  } else if (activeFocusQuest && activeFocusQuest.id !== quest.id) {
    // Edge case 4: Đang có một nhiệm vụ khác đang chạy
    const prevQuest = activeFocusQuest;
    const prevMins = Math.ceil(focusRemainingSeconds / 60);
    const ok = await confirmAction({
      title: 'Đổi Nhiệm Vụ & Bảo Lưu?',
      message: `Nhiệm vụ "${prevQuest.title}" đang chạy (${prevMins} phút còn lại). Bạn có muốn chuyển sang "${quest.title}"?`,
      detail: `✅ Thời gian của "${prevQuest.title}" sẽ được BẢO LƯU tự động. Bạn có thể quay lại làm tiếp bất cứ lúc nào!`,
      confirmText: 'Bảo Lưu & Đổi ⏱️',
      cancelText: 'Giữ Nhiệm Vụ Cũ',
      icon: '⏸️',
      btnColor: 'cyan'
    });
    if (!ok) return;
    prevQuest.savedTimer = {
      remainingSeconds: Math.max(0, focusRemainingSeconds),
      actualFocusedSeconds: actualFocusedSeconds,
      totalSeconds: focusTotalSeconds || ((prevQuest.targetMinutes || 25) * 60),
      savedAt: Date.now()
    };
    renderQuests();
  }

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  lastLocalTimerActionTime = Date.now();
  const isResumingSaved = Boolean(quest.savedTimer && quest.savedTimer.remainingSeconds > 0);
  let initialRemainingSec = Math.max(1, (quest.targetMinutes || 25)) * 60;
  let initialTotalSec = initialRemainingSec;
  let initialActualFocusedSec = 0;

  if (isResumingSaved) {
    initialTotalSec = quest.savedTimer.totalSeconds || initialRemainingSec;
    initialRemainingSec = Math.max(1, quest.savedTimer.remainingSeconds);
    initialActualFocusedSec = quest.savedTimer.actualFocusedSeconds || 0;
    delete quest.savedTimer;
  }

  activeFocusQuest = quest;
  activeRewardItem = null;
  isBreakMode = false;
  focusTotalSeconds = initialTotalSec;
  focusRemainingSeconds = initialRemainingSec;
  actualFocusedSeconds = initialActualFocusedSec;
  isFocusRunning = true;
  lastTickTime = Date.now();

  // Optimistic UI updates - 0ms latency phản hồi ngay trên giao diện
  renderQuests();
  renderFocusStationUI();
  updateTimerDisplay();
  saveFocusTimerState(true, true, 'start');
  requestWakeLock();

  // Cuộn ngay đến thanh đếm giờ để người dùng nhìn thấy lập tức
  document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  clearInterval(focusTimerInterval);
  focusTimerInterval = setInterval(tickFocusTimer, 500);

  sfx.playGong();
  if (isResumingSaved) {
    showToast(`Tiếp tục nhiệm vụ "${quest.title}" (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại)! Chúc bạn tập trung cao độ.`, 'info');
  } else {
    showToast(`Bắt đầu đồng hồ tập trung: ${quest.targetMinutes || 25} phút! Chúc bạn tập trung cao độ.`, 'info');
  }
}

function startBreakTimer(breakMinutes = 5) {
  if (isTimerActionPending) return;
  isTimerActionPending = true;
  setTimeout(() => { isTimerActionPending = false; }, 300);

  lastLocalTimerActionTime = Date.now();
  isBreakMode = true;
  activeFocusQuest = null;
  activeRewardItem = null;
  focusTotalSeconds = breakMinutes * 60;
  focusRemainingSeconds = focusTotalSeconds;
  isFocusRunning = true;
  lastTickTime = Date.now();

  renderFocusStationUI();
  updateTimerDisplay();
  updateQuestCardTimerState(null, false, false);
  saveFocusTimerState(true, true, 'start');
  requestWakeLock();

  clearInterval(focusTimerInterval);
  focusTimerInterval = setInterval(tickFocusTimer, 500);

  sfx.playClick();
  showToast(`Bắt đầu nghỉ giải lao ${breakMinutes} phút! Hãy vươn vai và uống nước nhé.`, 'info');
}

async function toggleFocusTimer() {
  if (isTimerActionPending) return;
  isTimerActionPending = true;
  setTimeout(() => { isTimerActionPending = false; }, 300);

  if (!activeFocusQuest && !isBreakMode && !activeRewardItem && !appState.activeTimer) {
    showToast('Chưa có phiên nào đang chạy!', 'info');
    return;
  }

  const isMyRunner = !appState.activeTimer?.runnerId || appState.activeTimer.runnerId === CURRENT_RUNNER_ID;

  if (!isFocusRunning) {
    // Nếu phiên thuộc thiết bị khác, cần đồng bộ thời gian mới nhất từ Cloud trước khi chạy
    if (!isMyRunner) {
      await pullLatestTimerFromCloud();
    }

    // Timer đã hết thời gian -> Hoàn thành ngay lập tức thay vì chạy interval chết
    if (focusRemainingSeconds <= 0 && (activeFocusQuest || activeRewardItem || isBreakMode)) {
      focusRemainingSeconds = 0;
      actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);
      updateTimerDisplay();
      if (isBreakMode) {
        breakTimerFinished();
      } else if (activeRewardItem) {
        rewardTimerFinished();
      } else {
        focusTimerFinished();
      }
      return;
    }

    lastLocalTimerActionTime = Date.now();
    isFocusRunning = true;
    lastTickTime = Date.now();
    if (appState.activeTimer) {
      appState.activeTimer.runnerId = CURRENT_RUNNER_ID;
      appState.activeTimer.isRunning = true;
      appState.activeTimer.lastTickTime = lastTickTime;
      appState.activeTimer.updatedAt = lastTickTime;
    }

    requestWakeLock();
    clearInterval(focusTimerInterval);
    focusTimerInterval = setInterval(tickFocusTimer, 500);
    sfx.playClick();

    updateTimerDisplay();
    renderFocusStationUI();
    updateQuestCardTimerState(activeFocusQuest?.id, true, true);
    saveFocusTimerState(true, true, 'resume');
    showToast('Đã tiếp tục đếm giờ trên thiết bị này!', 'success');
    return;
  }

  // Đang chạy trên thiết bị này -> Bấm để Tạm dừng ngay trong 0ms
  lastLocalTimerActionTime = Date.now();
  isFocusRunning = false;
  lastTickTime = Date.now();
  if (appState.activeTimer) {
    appState.activeTimer.isRunning = false;
    appState.activeTimer.lastTickTime = lastTickTime;
    appState.activeTimer.updatedAt = lastTickTime;
  }
  releaseWakeLock();
  clearInterval(focusTimerInterval);
  focusTimerInterval = null;
  sfx.playClick();

  updateTimerDisplay();
  renderFocusStationUI();
  updateQuestCardTimerState(activeFocusQuest?.id, false, true);
  saveFocusTimerState(true, true, 'pause');
}

async function holdFocusTimer() {
  if (isTimerActionPending) return;
  isTimerActionPending = true;
  setTimeout(() => { isTimerActionPending = false; }, 300);

  if (!activeFocusQuest && !isBreakMode && !activeRewardItem && !appState.activeTimer) {
    showToast('Chưa có phiên nào đang chạy để bảo lưu!', 'info');
    return;
  }

  lastLocalTimerActionTime = Date.now();

  // 1. Giờ nghỉ giải lao
  if (isBreakMode) {
    clearFocusTimerSession(true);
    showToast('Đã dừng giờ nghỉ giải lao.', 'info');
    return;
  }

  // 2. Phần thưởng
  if (activeRewardItem) {
    const item = activeRewardItem;
    const remaining = Math.max(0, focusRemainingSeconds);
    const total = focusTotalSeconds || (extractRewardDuration(item) * 60);
    const minsLeft = Math.ceil(remaining / 60);

    item.savedTimer = {
      remainingSeconds: remaining,
      totalSeconds: total,
      savedAt: Date.now()
    };

    clearFocusTimerSession(false);
    sfx.playClick();
    showToast(`Đã bảo lưu phần thưởng "${item.name}" (còn ${minsLeft} phút). Bạn có thể quay lại dùng tiếp bất cứ lúc nào!`, 'purple');
    renderInventory();
    renderFocusStationUI();
    triggerSave(true, true, 'hold', true);
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const syncChannel = new BroadcastChannel('levelup_sync_channel');
        syncChannel.postMessage({
          type: 'TIMER_SYNC_UPDATE',
          tabId: CURRENT_TAB_ID,
          action: 'hold',
          rewardItemId: item.id,
          savedTimer: item.savedTimer
        });
        syncChannel.close();
      } catch (_) {}
    }
    return;
  }

  // 3. Nhiệm vụ tập trung
  if (activeFocusQuest) {
    const quest = activeFocusQuest;
    const remaining = Math.max(0, focusRemainingSeconds);
    const actual = actualFocusedSeconds;
    const total = focusTotalSeconds || ((quest.targetMinutes || 25) * 60);
    const minsLeft = Math.ceil(remaining / 60);

    quest.savedTimer = {
      remainingSeconds: remaining,
      actualFocusedSeconds: actual,
      totalSeconds: total,
      savedAt: Date.now()
    };

    clearFocusTimerSession(false);
    sfx.playClick();
    showToast(`Đã bảo lưu nhiệm vụ "${quest.title}" (còn ${minsLeft} phút). Bạn có thể làm việc khác và tiếp tục bất cứ lúc nào!`, 'info');
    renderQuests();
    renderFocusStationUI();
    triggerSave(true, true, 'hold', true);
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const syncChannel = new BroadcastChannel('levelup_sync_channel');
        syncChannel.postMessage({
          type: 'TIMER_SYNC_UPDATE',
          tabId: CURRENT_TAB_ID,
          action: 'hold',
          questId: quest.id,
          savedTimer: quest.savedTimer
        });
        syncChannel.close();
      } catch (_) {}
    }
    return;
  }

  // Fallback từ appState.activeTimer
  if (appState.activeTimer?.questId) {
    const q = appState.quests?.find(x => x.id === appState.activeTimer.questId);
    if (q) {
      q.savedTimer = {
        remainingSeconds: Math.max(0, appState.activeTimer.remainingSeconds || 0),
        actualFocusedSeconds: appState.activeTimer.actualFocusedSeconds || 0,
        totalSeconds: appState.activeTimer.totalSeconds || 1500,
        savedAt: Date.now()
      };
      clearFocusTimerSession(false);
      showToast(`Đã bảo lưu nhiệm vụ "${q.title}".`, 'info');
      renderQuests();
      renderFocusStationUI();
      triggerSave(true, true, 'hold', true);
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const syncChannel = new BroadcastChannel('levelup_sync_channel');
          syncChannel.postMessage({
            type: 'TIMER_SYNC_UPDATE',
            tabId: CURRENT_TAB_ID,
            action: 'hold',
            questId: q.id,
            savedTimer: q.savedTimer
          });
          syncChannel.close();
        } catch (_) {}
      }
      return;
    }
  } else if (appState.activeTimer?.rewardItemId) {
    const it = appState.inventory?.find(x => x.id === appState.activeTimer.rewardItemId);
    if (it) {
      it.savedTimer = {
        remainingSeconds: Math.max(0, appState.activeTimer.remainingSeconds || 0),
        totalSeconds: appState.activeTimer.totalSeconds || 1800,
        savedAt: Date.now()
      };
      clearFocusTimerSession(false);
      showToast(`Đã bảo lưu phần thưởng "${it.name}".`, 'purple');
      renderInventory();
      renderFocusStationUI();
      triggerSave(true, true, 'hold', true);
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const syncChannel = new BroadcastChannel('levelup_sync_channel');
          syncChannel.postMessage({
            type: 'TIMER_SYNC_UPDATE',
            tabId: CURRENT_TAB_ID,
            action: 'hold',
            rewardItemId: it.id,
            savedTimer: it.savedTimer
          });
          syncChannel.close();
        } catch (_) {}
      }
      return;
    }
  }

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const syncChannel = new BroadcastChannel('levelup_sync_channel');
      syncChannel.postMessage({ type: 'TIMER_SYNC_UPDATE', tabId: CURRENT_TAB_ID, action: 'hold' });
      syncChannel.close();
    } catch (_) {}
  }

  clearFocusTimerSession(true);
}

async function clearSavedQuestTimer(questId) {
  const quest = appState.quests?.find(q => q.id === questId);
  if (!quest || !quest.savedTimer) return;
  const ok = await confirmAction({
    title: 'Hủy Bảo Lưu Nhiệm Vụ?',
    message: `Bạn có chắc muốn hủy thời gian đã bảo lưu của "${quest.title}" để làm lại từ đầu?`,
    detail: '⚠️ Tiến độ tập trung đã tích lũy trước đó sẽ bị xóa bỏ.',
    confirmText: 'Hủy Bảo Lưu ⏹️',
    cancelText: 'Giữ Lại',
    icon: '⏹️',
    btnColor: 'rose'
  });
  if (!ok) return;
  lastLocalTimerActionTime = Date.now();
  delete quest.savedTimer;
  triggerSave(true, true, 'hold', true);
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const syncChannel = new BroadcastChannel('levelup_sync_channel');
      syncChannel.postMessage({
        type: 'TIMER_SYNC_UPDATE',
        tabId: CURRENT_TAB_ID,
        action: 'clearSaved',
        questId: quest.id
      });
      syncChannel.close();
    } catch (_) {}
  }
  renderQuests();
  showToast(`Đã hủy bảo lưu "${quest.title}".`, 'info');
}

async function clearSavedRewardTimer(invId) {
  const item = appState.inventory?.find(i => i.id === invId);
  if (!item || !item.savedTimer) return;
  const ok = await confirmAction({
    title: 'Kết Thúc Phần Thưởng?',
    message: `Bạn có chắc muốn kết thúc sớm phần thưởng "${item.name}"?`,
    detail: '⚠️ Thời gian còn lại sẽ không thể sử dụng tiếp.',
    confirmText: 'Kết Thúc Quà ⏹️',
    cancelText: 'Giữ Lại',
    icon: '🎁',
    btnColor: 'rose'
  });
  if (!ok) return;
  lastLocalTimerActionTime = Date.now();
  delete item.savedTimer;
  item.isUsed = true;
  triggerSave(true, true, 'hold', true);
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const syncChannel = new BroadcastChannel('levelup_sync_channel');
      syncChannel.postMessage({
        type: 'TIMER_SYNC_UPDATE',
        tabId: CURRENT_TAB_ID,
        action: 'clearSaved',
        rewardItemId: item.id
      });
      syncChannel.close();
    } catch (_) {}
  }
  renderInventory();
  showToast(`Đã kết thúc phần thưởng "${item.name}".`, 'info');
}

async function resetFocusTimer() {
  if (isTimerActionPending) return;
  isTimerActionPending = true;
  setTimeout(() => { isTimerActionPending = false; }, 300);

  if (!activeFocusQuest && !isBreakMode && !activeRewardItem && !appState.activeTimer) return;

  const isReward = Boolean(activeRewardItem || appState.activeTimer?.isRewardMode);
  const wasBreak = isBreakMode || Boolean(appState.activeTimer?.isBreakMode);
  const questTitle = activeFocusQuest?.title || appState.activeTimer?.questTitle || 'nhiệm vụ';

  const title = wasBreak
    ? 'Dừng Giờ Nghỉ?'
    : isReward
    ? 'Dừng Tận Hưởng Quà?'
    : 'Dừng Phiên Tập Trung?';

  const msg = wasBreak
    ? 'Bạn có chắc muốn kết thúc sớm giờ nghỉ giải lao?'
    : isReward
    ? `Bạn có chắc muốn kết thúc sớm thời gian tận hưởng phần thưởng "${activeRewardItem?.name || appState.activeTimer?.rewardItemName || 'phần thưởng'}"?`
    : `Bạn có chắc muốn dừng phiên tập trung cho "${questTitle}"? Thời gian đã đếm sẽ không được tính.`;

  const detail = isReward
    ? '💡 Mẹo: Bạn có thể nhấn nút "Bảo Lưu ⏸️" trên thanh đếm giờ để giữ lại số phút còn lại và dùng tiếp sau!'
    : wasBreak
    ? ''
    : '💡 Mẹo: Bạn có thể nhấn nút "Bảo Lưu ⏸️" trên thanh đếm giờ để giữ lại tiến độ và tiếp tục sau!\n⚠️ Nếu dừng hẳn, phiên tập trung sẽ bị hủy và thời gian đã đếm sẽ không được tính.';

  const ok = await confirmAction({
    title,
    message: msg,
    detail,
    confirmText: 'Dừng Phiên ⏹️',
    cancelText: 'Tiếp Tục Đếm',
    icon: isReward ? '🎁' : (wasBreak ? '☕' : '⏹️'),
    btnColor: 'rose'
  });

  if (ok) {
    clearFocusTimerSession(true);
    showToast(isReward ? 'Đã kết thúc phiên dùng quà.' : (wasBreak ? 'Đã dừng giờ nghỉ.' : 'Đã dừng phiên tập trung.'), 'info');
  }
}

function clearFocusTimerSession(syncToCloud = true) {
  lastLocalTimerActionTime = Date.now();
  appState.lastTimerClearedAt = Date.now();
  clearTimeout(syncTimeout);
  syncTimeout = null;
  clearInterval(focusTimerInterval);
  focusTimerInterval = null;
  releaseWakeLock();
  const hadActiveReward = Boolean(activeRewardItem);
  const hadActiveSession = Boolean(activeFocusQuest || isBreakMode || activeRewardItem || appState.activeTimer);
  const oldQuestId = activeFocusQuest ? activeFocusQuest.id : null;
  activeFocusQuest = null;
  activeRewardItem = null;
  isFocusRunning = false;
  isBreakMode = false;
  focusRemainingSeconds = 0;
  focusTotalSeconds = 0;
  actualFocusedSeconds = 0;
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch (_) {}
  document.title = 'LevelUp — Biến Công Việc & Thói Quen Thành Trò Chơi';

  const banner = document.getElementById('active-focus-banner');
  if (banner) banner.classList.add('hidden');

  const zenOverlay = document.getElementById('focus-zen-overlay');
  if (zenOverlay) zenOverlay.classList.add('hidden');

  if (appState.activeTimer || hadActiveSession) {
    appState.activeTimer = null;
    if (syncToCloud) {
      triggerSave(true, true, 'cancel', true);
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const syncChannel = new BroadcastChannel('levelup_sync_channel');
          syncChannel.postMessage({ type: 'TIMER_SYNC_UPDATE', tabId: CURRENT_TAB_ID, action: 'cancel' });
          syncChannel.close();
        } catch (_) {}
      }
    }
  }

  updateQuestCardTimerState(oldQuestId, false, false);
  if (hadActiveReward && typeof renderInventory === 'function') {
    renderInventory();
  }
}

function adjustTimer(deltaSec) {
  if (!activeFocusQuest && !isBreakMode && !activeRewardItem) return;
  const isReward = Boolean(activeRewardItem || appState.activeTimer?.isRewardMode);

  // ponytail: reward timers only allow decrementing; quest timers only allow incrementing. Add custom step rules if multi-tier rewards need it.
  if (isReward) {
    if (deltaSec > 0) {
      showToast('Thời gian hưởng thụ chỉ được trừ xuống, không thể cộng thêm!', 'error');
      sfx.playClick();
      return;
    }
    const newRemaining = focusRemainingSeconds + deltaSec;
    if (newRemaining <= 0) {
      focusRemainingSeconds = 0;
      updateTimerDisplay();
      rewardTimerFinished();
      return;
    }
    focusRemainingSeconds = newRemaining;
    updateTimerDisplay();
    saveFocusTimerState(true, true, 'adjust');
    sfx.playClick();
    showToast(`Đã giảm thời gian: -${Math.abs(deltaSec / 60)}p`, 'info');
    return;
  }

  // Anti-Cheat: Chặn mọi hành vi giảm thời gian
  if (deltaSec < 0) {
    showToast('Không thể giảm thời gian! Hãy giữ vững kỷ luật.', 'error');
    sfx.playClick();
    return;
  }

  focusRemainingSeconds += deltaSec;
  if (focusRemainingSeconds > focusTotalSeconds) {
    focusTotalSeconds = focusRemainingSeconds;
  }
  updateTimerDisplay();
  saveFocusTimerState(true, true, 'adjust');
  sfx.playClick();
  showToast(`Đã thêm thời gian: +${deltaSec / 60}p`, 'info');
}

function openEditTimerModal() {
  if (!activeFocusQuest && !isBreakMode && !activeRewardItem) return;
  const isReward = Boolean(activeRewardItem || appState.activeTimer?.isRewardMode);
  const minInput = document.getElementById('input-edit-minutes');
  const secInput = document.getElementById('input-edit-seconds');
  const titleEl = document.querySelector('#modal-edit-focus-timer h3 span:last-child');
  if (minInput && secInput) {
    const totalSecs = Math.round(focusRemainingSeconds);
    minInput.value = Math.floor(totalSecs / 60);
    secInput.value = totalSecs % 60;
    if (isReward) {
      minInput.min = 0;
      minInput.max = Math.floor(totalSecs / 60);
      if (titleEl) titleEl.textContent = 'Giảm Thời Gian Hưởng Thụ';
    } else {
      const minRequiredSecs = activeFocusQuest ? ((activeFocusQuest.targetMinutes || 1) * 60) : 60;
      const neededRemainingSecs = Math.max(0, minRequiredSecs - actualFocusedSeconds);
      minInput.min = Math.max(1, Math.ceil(neededRemainingSecs / 60));
      minInput.removeAttribute('max');
      if (titleEl) titleEl.textContent = 'Điều Chỉnh Thời Gian';
    }
  }
  openModal('modal-edit-focus-timer');
}

function saveEditTimer(mins, secs) {
  const total = Math.max(0, mins * 60 + secs);
  const isReward = Boolean(activeRewardItem || appState.activeTimer?.isRewardMode);

  if (isReward) {
    if (total > Math.round(focusRemainingSeconds)) {
      showToast('Thời gian hưởng thụ chỉ được trừ xuống, không thể cộng thêm!', 'error');
      return;
    }
    if (total <= 0) {
      closeModal('modal-edit-focus-timer');
      focusRemainingSeconds = 0;
      updateTimerDisplay();
      rewardTimerFinished();
      return;
    }
    focusRemainingSeconds = total;
    updateTimerDisplay();
    saveFocusTimerState(true, true, 'adjust');
    sfx.playClick();
    closeModal('modal-edit-focus-timer');
    showToast(`Đã giảm thời gian: ${mins}p ${secs}s`, 'success');
    return;
  }

  // Anti-Cheat: Không cho phép đặt thời gian sao cho tổng phiên thấp hơn mức cam kết của nhiệm vụ
  if (activeFocusQuest) {
    const minRequiredSecs = (activeFocusQuest.targetMinutes || 1) * 60;
    if ((actualFocusedSeconds + total) < (minRequiredSecs - 5)) {
      const neededMinutes = Math.ceil(Math.max(0, minRequiredSecs - actualFocusedSeconds) / 60);
      showToast(`Không thể đặt thời gian ít hơn ${neededMinutes} phút để đảm bảo đủ ${activeFocusQuest.targetMinutes} phút cam kết!`, 'error');
      return;
    }
  }

  focusRemainingSeconds = total;
  focusTotalSeconds = Math.max(focusTotalSeconds, actualFocusedSeconds + total);
  updateTimerDisplay();
  saveFocusTimerState(true, true, 'adjust');
  sfx.playClick();
  closeModal('modal-edit-focus-timer');
  showToast(`Đã lưu thời gian: ${mins}p ${secs}s`, 'success');
}

function toggleZenMode(show) {
  const overlay = document.getElementById('focus-zen-overlay');
  if (!overlay) return;
  if (show) {
    overlay.classList.remove('hidden');
    const zenTitle = document.getElementById('zen-quest-title');
    const zenRank = document.getElementById('zen-quest-rank');
    const zenProtocol = document.getElementById('zen-protocol-label');

    if (isBreakMode) {
      if (zenTitle) zenTitle.textContent = 'Nghỉ giải lao nạp năng lượng';
      if (zenRank) {
        zenRank.textContent = 'GIẢI LAO';
        zenRank.className = 'text-xs px-2.5 py-0.5 rounded font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      }
      if (zenProtocol) zenProtocol.textContent = 'NGHỈ NGƠI NẠP NĂNG LƯỢNG';
    } else if (activeRewardItem) {
      if (zenTitle) zenTitle.textContent = `${activeRewardItem.icon || '🎁'} ${activeRewardItem.name}`;
      if (zenRank) {
        const rawTier = (activeRewardItem.tier || 'rare').toLowerCase();
        zenRank.textContent = REWARD_TIER_LABELS[rawTier] || (activeRewardItem.tier || 'PHẦN THƯỞNG').toUpperCase();
        zenRank.className = 'text-xs px-2.5 py-0.5 rounded font-bold font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30';
      }
      if (zenProtocol) zenProtocol.textContent = 'TẬN HƯỞNG PHẦN THƯỞNG';
    } else if (activeFocusQuest) {
      if (zenTitle) zenTitle.textContent = activeFocusQuest.title;
      if (zenRank) {
        zenRank.textContent = `HẠNG ${activeFocusQuest.rank}`;
        zenRank.className = `rank-badge-${activeFocusQuest.rank} text-xs px-2.5 py-0.5 rounded font-bold font-mono`;
      }
      if (zenProtocol) zenProtocol.textContent = 'CHẾ ĐỘ TẬP TRUNG';
    }
  } else {
    overlay.classList.add('hidden');
  }
}

function focusTimerFinished() {
  const quest = activeFocusQuest;
  const elapsed = actualFocusedSeconds;
  clearFocusTimerSession();

  if (quest) {
    // Anti-Cheat: Xác thực thời gian thực tế người dùng đã giữ timer chạy
    const minRequired = (quest.targetMinutes || 1) * 60 - 5; // 5 giây dung sai
    if (elapsed < minRequired) {
      showToast(`⚠️ PHÁT HIỆN GIAN LẬN: Bạn mới chỉ chạy ${Math.floor(elapsed / 60)} phút trên ${quest.targetMinutes} phút cam kết. Không được nhận Vàng!`, 'error');
      sfx.playGong();
      return;
    }

    if (quest.requiresProof && !quest._proofVerified) {
      quest.focusTimerCompleted = true;
      triggerSave(true);
      sendFocusNotification(
        '⏳ HẾT GIỜ TẬP TRUNG!',
        `Bạn đã hoàn thành ${quest.targetMinutes} phút tập trung cho "${quest.title}". Hãy chụp ảnh bằng chứng để nhận Vàng nhé!`
      );
      openQuestProofModal(quest);
      return;
    }

    completeQuest(quest.id, true);
    sfx.playFanfare();
    sfx.playGong();

    sendFocusNotification(
      '🎉 HOÀN THÀNH TẬP TRUNG!',
      `Chúc mừng bạn đã xuất sắc hoàn thành ${quest.targetMinutes} phút tập trung: "${quest.title}"!`
    );

    openFocusCompleteModal(quest);
  }
}

function breakTimerFinished() {
  clearFocusTimerSession();
  sfx.playGong();
  sendFocusNotification(
    '☕ HẾT GIỜ NGHỈ GIẢI LAO!',
    'Đã hết 5 phút nghỉ ngơi. Hãy sẵn sàng cho nhiệm vụ tiếp theo!'
  );
  showToast('Hết giờ giải lao! Chúc bạn tràn đầy năng lượng cho nhiệm vụ mới.', 'success');
}

function rewardTimerFinished() {
  const item = activeRewardItem;
  if (item) delete item.savedTimer;
  clearFocusTimerSession();
  sfx.playFanfare();
  sfx.playGong();

  sendFocusNotification(
    '🎉 HẾT THỜI GIAN PHẦN THƯỞNG!',
    item ? `Đã hết thời gian tận hưởng phần thưởng: "${item.name}". Hãy sẵn sàng cho các nhiệm vụ mới!` : 'Đã hết thời gian phần thưởng.'
  );

  showToast(`🎉 Đã hoàn thành thời gian tận hưởng phần thưởng "${item?.name || ''}"! Chúc bạn nạp đầy năng lượng.`, 'purple');
}

function openFocusCompleteModal(quest) {
  const descEl = document.getElementById('focus-complete-desc');
  const coinsEl = document.getElementById('focus-complete-coins');
  const expEl = document.getElementById('focus-complete-exp');

  if (descEl) descEl.textContent = `Xuất sắc hoàn thành ${quest.targetMinutes} phút tập trung cho "${quest.title}"!`;
  if (coinsEl) coinsEl.textContent = `+${quest.rewardCoins} VÀNG`;
  if (expEl) expEl.textContent = `+${quest.rewardCoins * 3} EXP`;

  openModal('modal-focus-complete');
}

// =============================================================================
// 6. QUEST INTERACTIONS (Complete, Undo, Add, Delete)
// =============================================================================
// ponytail: lock set prevents fast double-taps on complete button; bounds to current session
const completingQuestIds = new Set();
// ponytail: cooldown 10m prevents coin farming by spamming complete on repeatable quests; upgrade to custom intervals if per-quest schedules needed
const QUEST_REPEAT_COOLDOWN_MS = 10 * 60 * 1000;

function getQuestRepeatCooldownRemaining(quest) {
  if (!quest?.isRepeatable || !quest?.lastCompletedAt) return 0;
  return Math.max(0, QUEST_REPEAT_COOLDOWN_MS - (Date.now() - quest.lastCompletedAt));
}

async function completeQuest(questId, skipConfirm = false) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest || (!quest.isRepeatable && quest.status === 'completed') || completingQuestIds.has(questId)) return;

  completingQuestIds.add(questId);
  try {
    const cooldownRemaining = getQuestRepeatCooldownRemaining(quest);
    if (cooldownRemaining > 0) {
      const mins = Math.ceil(cooldownRemaining / 60000);
      showToast(`Nhiệm vụ lặp lại cần cách nhau tối thiểu 10 phút giữa mỗi lần hoàn thành. Vui lòng chờ thêm ${mins} phút!`, 'warning');
      return;
    }

    // Yêu cầu nộp ảnh bằng chứng nếu nhiệm vụ yêu cầu và chưa được AI duyệt
    if (quest.requiresProof && !quest._proofVerified) {
      openQuestProofModal(quest);
      return;
    }

    // Nhiệm vụ focus có thời gian yêu cầu bắt buộc phải hoàn thành bấm giờ
    if (quest.type === 'focus' && (parseInt(quest.targetMinutes, 10) || 0) > 0 && !quest.focusTimerCompleted && !skipConfirm) {
      showToast(`Nhiệm vụ "${quest.title}" cần bấm giờ tập trung đủ ${quest.targetMinutes} phút trước khi hoàn thành!`, 'warning');
      return;
    }

    if (!skipConfirm) {
      const curStreak = Math.max(0, parseInt(appState.profile?.streak, 10) || 0);
      const streakBonusPct = getStreakBonusPercent(curStreak);
      const streakBonusCoins = Math.floor(quest.rewardCoins * (streakBonusPct / 100));
      const totalAwarded = quest.rewardCoins + streakBonusCoins;
      const ok = await confirmAction({
        title: 'Xác Nhận Hoàn Thành?',
        message: `Bạn đã thực hiện xong nhiệm vụ "${quest.title}"?`,
        detail: `💰 Phần thưởng: +${totalAwarded} Vàng${streakBonusCoins > 0 ? ` (gồm +${streakBonusCoins} Vàng thưởng Streak 🔥)` : ''} | ⚡ Kinh nghiệm: +${totalAwarded * 3} EXP`,
        confirmText: 'Hoàn Thành ✓',
        cancelText: 'Chưa Xong',
        icon: '🎉',
        btnColor: 'emerald'
      });
      if (!ok) return;
    }

    if (!quest.isRepeatable && quest.status === 'completed') return;
    if (getQuestRepeatCooldownRemaining(quest) > 0) return;

    if (activeFocusQuest && activeFocusQuest.id === questId) {
      clearFocusTimerSession();
    }

    if (quest._proofVerified) {
      delete quest._proofVerified;
    }
    if (quest.focusTimerCompleted) {
      delete quest.focusTimerCompleted;
    }
    delete quest.savedTimer;

    const previousLastCompletedAt = quest.lastCompletedAt || null;
    quest.completedCount = (quest.completedCount || 0) + 1;
    if (quest.isRepeatable) {
      quest.lastCompletedAt = Date.now();
    } else {
      quest.status = 'completed';
      quest.completedAt = Date.now();
    }

    // Cập nhật chuỗi Streak ngày liên tiếp & tính thưởng Streak
    const streakResult = updateStreakOnQuestComplete(appState.profile);
    const bonusPct = streakResult.bonusPercent;
    const streakBonusCoins = Math.floor(quest.rewardCoins * (bonusPct / 100));
    const totalAwardedCoins = quest.rewardCoins + streakBonusCoins;

    let earnedCoins = totalAwardedCoins;
    let deductedForLoan = 0;
    let principalDeducted = 0;
    let loanCleared = false;
    let loanBeforeDeduct = null;

    // Tự động trích nợ Ngân Hàng nếu người chơi có khoản vay đang hoạt động
    if (appState.profile?.bank?.loan && (parseInt(appState.profile.bank.loan.debt, 10) || 0) > 0) {
      const loan = appState.profile.bank.loan;
      const isOverdue = loan.isOverdue || (Date.now() - (parseInt(loan.borrowedAt, 10) || Date.now())) >= 7 * 24 * 60 * 60 * 1000;
      if (isOverdue) {
        loan.isOverdue = true;
        appState.profile.bank.isFrozen = true;
        appState.profile.title = 'Con Nợ Quá Hạn ⚠️';
      }
      const deductRate = isOverdue ? 1.0 : Math.min(0.80, Math.max(0.20, Number(loan.autoDeductPercent) || 0.50));
      deductedForLoan = Math.min(loan.debt, Math.floor(earnedCoins * deductRate));
      if (deductedForLoan > 0) {
        loanBeforeDeduct = {
          principal: loan.principal || 0,
          debt: loan.debt,
          interestRate: loan.interestRate || 0.05,
          borrowedAt: loan.borrowedAt || Date.now(),
          autoDeductPercent: loan.autoDeductPercent || 0.50,
          isOverdue: Boolean(loan.isOverdue)
        };
        const principalBefore = loan.principal || 0;
        principalDeducted = Math.min(principalBefore, deductedForLoan);
        loan.debt -= deductedForLoan;
        loan.principal = Math.max(0, principalBefore - principalDeducted);
        earnedCoins -= deductedForLoan;

        // Cập nhật bể thanh khoản ngân hàng hiển thị tức thì
        if (typeof currentBankPool === 'object' && currentBankPool) {
          currentBankPool.totalBorrowed = Math.max(0, (currentBankPool.totalBorrowed || 0) - principalDeducted);
          currentBankPool.poolGold = (currentBankPool.poolGold || 0) + deductedForLoan;
        }

        if (loan.debt <= 0) {
          loanCleared = true;
          appState.profile.bank.loan = null;
          appState.profile.bank.isFrozen = false;
          updateTitleByLevel();
        }
      }
    }

    // Lưu snapshot trích nợ & chuỗi streak để có thể hoàn tác chính xác
    if (!Array.isArray(quest.loanDeductions)) {
      quest.loanDeductions = [];
    }
    quest.loanDeductions.push({
      completedCount: quest.completedCount,
      rewardCoins: quest.rewardCoins,
      streakBonusCoins,
      totalAwardedCoins,
      deducted: deductedForLoan,
      principalDeducted,
      loanCleared,
      loanBeforeDeduct,
      loanSnapshot: loanBeforeDeduct,
      previousLastCompletedAt,
      streakSnapshot: streakResult?.snapshot || {
        streak: appState.profile.streak,
        lastStreakDate: appState.profile.lastStreakDate,
        streakHistory: Array.isArray(appState.profile.streakHistory) ? [...appState.profile.streakHistory] : []
      },
      timestamp: Date.now()
    });

    appState.profile.coins += earnedCoins;
    appState.profile.totalCoinsEarned += totalAwardedCoins;

    if (!Array.isArray(appState.completedQuestIds)) {
      appState.completedQuestIds = [];
    }
    if (!quest.isRepeatable && !appState.completedQuestIds.includes(quest.id)) {
      appState.completedQuestIds.unshift(quest.id);
      if (appState.completedQuestIds.length > 500) {
        appState.completedQuestIds.splice(500);
      }
    }

    if (quest.type === 'focus' && (parseInt(quest.targetMinutes, 10) || 0) >= 25) {
      appState.profile.totalFocusSessions = (parseInt(appState.profile.totalFocusSessions, 10) || 0) + 1;
    }

    addEXP(totalAwardedCoins * 3);

    addLedgerEntry({
      id: 'led_' + Date.now(),
      type: 'earn',
      category: 'quest',
      amount: totalAwardedCoins,
      title: quest.title,
      description: `Hoàn thành nhiệm vụ: ${quest.title} (+${quest.rewardCoins} Vàng${streakBonusCoins > 0 ? ` & +${streakBonusCoins} Vàng Streak 🔥` : ''})${deductedForLoan > 0 ? ` [🏦 Trích trả nợ: -${deductedForLoan} Vàng]` : ''}`,
      timestamp: Date.now()
    });

    if (deductedForLoan > 0) {
      addLedgerEntry({
        id: 'bank_deduct_' + Date.now(),
        type: 'spend',
        category: 'bank_deduct',
        amount: deductedForLoan,
        title: 'Trích nợ Ngân Hàng tự động',
        description: `🏦 Đã trích ${deductedForLoan} Vàng (${principalDeducted} gốc + ${deductedForLoan - principalDeducted} lãi) từ phần thưởng "${quest.title}".${loanCleared ? ' 🎉 Bạn đã thanh toán sạch nợ!' : ` Dư nợ còn lại: ${appState.profile.bank.loan.debt} Vàng.`}`,
        timestamp: Date.now()
      });
    }

    sfx.playCoin();
    sfx.playFanfare();

    triggerSave(true);
    renderHeader();
    renderQuests();
    renderLedger();

    if (loanCleared) {
      showToast('🎉 XUẤT SẮC! Bạn đã trả hết nợ Ngân Hàng qua quá trình làm việc chăm chỉ!', 'gold');
    }
    const bonusMsg = streakBonusCoins > 0 ? ` (gồm +${streakBonusCoins} Vàng thưởng Streak 🔥)` : '';
    const deductMsg = deductedForLoan > 0 ? ` (đã tự động trích ${deductedForLoan} Vàng trả nợ)` : '';
    showToast(
      `Đã hoàn thành "${quest.title}"! Nhận +${earnedCoins} Vàng vào ví${bonusMsg}${deductMsg} & +${totalAwardedCoins * 3} EXP!`,
      'gold',
      {
        label: 'Hoàn tác',
        onClick: () => undoCompleteQuest(quest.id)
      }
    );
  } finally {
    completingQuestIds.delete(questId);
  }
}

const undoingQuestIds = new Set();

async function undoCompleteQuest(questId) {
  if (undoingQuestIds.has(questId)) return;
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return;
  if (!quest.isRepeatable && quest.status !== 'completed') return;
  if (quest.isRepeatable && (!quest.completedCount || quest.completedCount <= 0)) return;

  undoingQuestIds.add(questId);
  try {
    const isRepeat = Boolean(quest.isRepeatable);

    // Lấy thông tin trích nợ của lần hoàn thành này (LIFO stack)
    let deductionInfo = null;
    if (Array.isArray(quest.loanDeductions) && quest.loanDeductions.length > 0) {
      deductionInfo = quest.loanDeductions[quest.loanDeductions.length - 1];
    } else {
      const lastBankDeduct = (appState.ledger || []).find(entry =>
        entry.category === 'bank_deduct' && entry.description && entry.description.includes(quest.title)
      );
      if (lastBankDeduct && lastBankDeduct.amount > 0) {
        deductionInfo = {
          rewardCoins: quest.rewardCoins,
          deducted: lastBankDeduct.amount,
          principalDeducted: lastBankDeduct.amount,
          loanSnapshot: null
        };
      }
    }

    const deductedAmount = deductionInfo ? (Number(deductionInfo.deducted) || 0) : 0;
    const principalDeducted = deductionInfo ? (Number(deductionInfo.principalDeducted) || 0) : 0;
    const originalReward = Number(quest.rewardCoins) || 0;
    const streakBonus = Number(deductionInfo?.streakBonusCoins) || 0;
    const totalAwarded = deductionInfo?.totalAwardedCoins !== undefined ? Number(deductionInfo.totalAwardedCoins) : (originalReward + streakBonus);
    const earnedCoinsToRevert = Math.max(0, totalAwarded - deductedAmount);

    if (appState.profile.coins < earnedCoinsToRevert) {
      showToast(`Không thể hoàn tác: Số dư Vàng hiện tại (${appState.profile.coins}) không đủ để thu hồi ${earnedCoinsToRevert} Vàng!`, 'warning');
      return;
    }

    const ok = await confirmAction({
      title: isRepeat ? 'Hoàn Tác Lần Nhận Thưởng?' : 'Hoàn Tác Nhiệm Vụ?',
      message: isRepeat
        ? `Bạn muốn hoàn tác lần làm gần nhất (Lần ${quest.completedCount}) của nhiệm vụ "${quest.title}"?`
        : `Đưa nhiệm vụ "${quest.title}" về trạng thái Chưa Xong?`,
      detail: `💰 Sẽ trừ ví: -${earnedCoinsToRevert} Vàng${deductedAmount > 0 ? ` | 🏦 Sẽ khôi phục nợ: +${deductedAmount} Vàng` : ''} | ⚡ Sẽ thu hồi: -${totalAwarded * 3} EXP`,
      confirmText: 'Hoàn Tác ↩️',
      cancelText: 'Giữ Nguyên',
      icon: '↩️',
      btnColor: 'amber'
    });
    if (!ok) return;

    if (Array.isArray(quest.loanDeductions) && quest.loanDeductions.length > 0) {
      quest.loanDeductions.pop();
    }

    // Hoàn nguyên trạng thái Streak từ snapshot
    if (deductionInfo?.streakSnapshot) {
      appState.profile.streak = deductionInfo.streakSnapshot.streak;
      appState.profile.lastStreakDate = deductionInfo.streakSnapshot.lastStreakDate;
      appState.profile.streakHistory = deductionInfo.streakSnapshot.streakHistory;
    }

    quest.completedCount = Math.max(0, (quest.completedCount || 1) - 1);
    delete quest.focusTimerCompleted;
    delete quest._proofVerified;
    if (quest.isRepeatable) {
      if (deductionInfo?.previousLastCompletedAt) {
        quest.lastCompletedAt = deductionInfo.previousLastCompletedAt;
      } else {
        delete quest.lastCompletedAt;
      }
    } else {
      quest.status = 'active';
      delete quest.completedAt;
      if (Array.isArray(appState.completedQuestIds)) {
        appState.completedQuestIds = appState.completedQuestIds.filter(id => id !== quest.id);
      }
    }

    if (quest.type === 'focus' && (parseInt(quest.targetMinutes, 10) || 0) >= 25) {
      appState.profile.totalFocusSessions = Math.max(0, (parseInt(appState.profile.totalFocusSessions, 10) || 0) - 1);
    }

    appState.profile.coins = Math.max(0, appState.profile.coins - earnedCoinsToRevert);
    appState.profile.totalCoinsEarned = Math.max(0, appState.profile.totalCoinsEarned - totalAwarded);
    deductEXP(totalAwarded * 3);

    if (deductedAmount > 0) {
      if (typeof currentBankPool === 'object' && currentBankPool) {
        currentBankPool.totalBorrowed = (currentBankPool.totalBorrowed || 0) + principalDeducted;
        currentBankPool.poolGold = Math.max(0, (currentBankPool.poolGold || 0) - deductedAmount);
      }
      if (appState.profile.bank.loan) {
        const loan = appState.profile.bank.loan;
        loan.debt = (loan.debt || 0) + deductedAmount;
        loan.principal = (loan.principal || 0) + principalDeducted;
        const snapshotLoan = deductionInfo?.loanSnapshot || deductionInfo?.loanBeforeDeduct;
        if (snapshotLoan?.isOverdue) {
          loan.isOverdue = true;
          appState.profile.bank.isFrozen = true;
          appState.profile.title = 'Con Nợ Quá Hạn ⚠️';
        }
      } else if (deductionInfo?.loanSnapshot || deductionInfo?.loanBeforeDeduct) {
        const snapshotLoan = deductionInfo?.loanSnapshot || deductionInfo?.loanBeforeDeduct;
        appState.profile.bank.loan = {
          ...snapshotLoan,
          debt: deductedAmount,
          principal: principalDeducted
        };
        if (snapshotLoan?.isOverdue) {
          appState.profile.bank.isFrozen = true;
          appState.profile.title = 'Con Nợ Quá Hạn ⚠️';
        }
      } else {
        appState.profile.bank.loan = {
          principal: principalDeducted,
          debt: deductedAmount,
          interestRate: 0.05,
          borrowedAt: Date.now(),
          autoDeductPercent: 0.50,
          isOverdue: false
        };
      }

      addLedgerEntry({
        id: 'bank_rev_' + Date.now(),
        type: 'spend',
        category: 'bank_revert',
        amount: deductedAmount,
        title: 'Hoàn tác trích nợ Ngân Hàng',
        description: `↩️ Đã khôi phục ${deductedAmount} Vàng vào dư nợ khoản vay do hoàn tác nhiệm vụ "${quest.title}".`,
        timestamp: Date.now()
      });
    }

    addLedgerEntry({
      id: 'led_' + Date.now(),
      type: 'spend',
      category: 'quest',
      amount: earnedCoinsToRevert,
      title: `Hoàn tác: ${quest.title}`,
      description: isRepeat
        ? `Hoàn tác lần làm gần nhất (${quest.title})`
        : `Hoàn tác hoàn thành: ${quest.title}`,
      timestamp: Date.now()
    });

    sfx.playClick();
    triggerSave(true);
    renderHeader();
    renderQuests();
    renderLedger();
    showToast(
      isRepeat
        ? `Đã hoàn tác lần làm gần nhất của nhiệm vụ "${quest.title}".`
        : `Đã đưa nhiệm vụ "${quest.title}" về trạng thái Chưa Xong.`,
      'info'
    );
  } finally {
    undoingQuestIds.delete(questId);
  }
}

async function restartQuest(questId) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return;

  const ok = await confirmAction({
    title: 'Làm Lại Nhiệm Vụ?',
    message: `Bạn muốn tạo lại nhiệm vụ "${quest.title}" để thực hiện một lần nữa?`,
    detail: '💡 Hệ thống sẽ tạo một phiên bản nhiệm vụ mới vào danh sách làm việc của bạn.',
    confirmText: 'Làm Lại 🔄',
    cancelText: 'Giữ Nguyên',
    icon: '🔄',
    btnColor: 'amber'
  });
  if (!ok) return;

  const newQuest = {
    ...quest,
    id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    canonicalId: quest.canonicalId || (quest.id && quest.id.startsWith('q_seed_') ? quest.id : undefined),
    status: 'active',
    completedCount: 0,
    createdAt: Date.now()
  };
  delete newQuest.completedAt;
  delete newQuest.focusTimerCompleted;
  delete newQuest._proofVerified;
  delete newQuest.savedTimer;
  delete newQuest.loanDeductions;
  delete newQuest.lastCompletedAt;

  const idx = appState.quests.findIndex(q => q.id === questId);
  if (idx >= 0) {
    appState.quests.splice(idx, 0, newQuest);
  } else {
    appState.quests.unshift(newQuest);
  }

  sfx.playClick();
  triggerSave(true);
  renderQuests();
  showToast(`Đã thêm nhiệm vụ "${newQuest.title}" vào danh sách làm việc!`, 'info');
}

function toggleQuestRepeatable(questId) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return;

  if (quest.status === 'completed' && !quest.isRepeatable) {
    showToast('Nhiệm vụ đã hoàn thành không thể đổi trạng thái lặp lại.', 'info');
    return;
  }

  if ((parseInt(quest.rewardCoins, 10) || 0) > 15) {
    showToast(`Nhiệm vụ "${quest.title}" có mức thưởng cao (${quest.rewardCoins} Vàng). Hãy dùng tính năng Đàm Phán / Tạo lại với AI để điều chỉnh chế độ lặp lại phù hợp.`, 'warning');
    return;
  }

  quest.isRepeatable = !quest.isRepeatable;
  if (!quest.isRepeatable) {
    quest.previousRepeatCount = quest.completedCount || 0;
    quest.completedCount = 0;
    delete quest.lastCompletedAt;
  } else if (quest.previousRepeatCount !== undefined) {
    quest.completedCount = quest.previousRepeatCount;
    delete quest.previousRepeatCount;
  }
  sfx.playClick();
  triggerSave(true);
  renderQuests();
  showToast(`Nhiệm vụ "${quest.title}": ${quest.isRepeatable ? 'Đã bật Lặp lại' : 'Chuyển sang Làm 1 lần'}`, 'info');
}

async function deleteQuest(questId) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return;

  const ok = await confirmAction({
    title: 'Xóa Nhiệm Vụ?',
    message: `Bạn có chắc muốn xóa nhiệm vụ "${quest.title}"?`,
    detail: '💡 Bạn có thể hoàn tác lại ngay sau khi xóa.',
    confirmText: 'Xóa 🗑️',
    cancelText: 'Giữ Lại',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!ok) return;

  if (activeFocusQuest && activeFocusQuest.id === questId) {
    clearFocusTimerSession();
  }

  const questIndex = appState.quests.findIndex(q => q.id === questId);
  const deletedQuest = { ...quest };
  appState.quests = appState.quests.filter(q => q.id !== questId);
  triggerSave(true);
  renderQuests();

  showToast(`Đã xóa nhiệm vụ "${deletedQuest.title}".`, 'info', {
    label: 'Hoàn tác',
    onClick: () => {
      if (questIndex >= 0 && questIndex <= appState.quests.length) {
        appState.quests.splice(questIndex, 0, deletedQuest);
      } else {
        appState.quests.unshift(deletedQuest);
      }
      triggerSave(true);
      renderQuests();
      sfx.playCoin();
      showToast(`Đã khôi phục nhiệm vụ "${deletedQuest.title}".`, 'success');
    }
  });
}

// =============================================================================
// 6.5. QUEST PROOF VERIFICATION (Camera Capture & AI Vision)
// =============================================================================
let currentProofQuest = null;
let currentProofBase64 = null;
let isSubmittingProof = false;
let pendingApprovedQuest = null;

// ponytail: Strict real-mobile detector. Blocks desktop browsers and DevTools mobile emulation (anti-cheat).
function isMobilePhone() {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || navigator.vendor || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const isMobileClientHint = Boolean(navigator.userAgentData?.mobile);

  // 1. Must match a mobile UA or client hint
  if (!isMobileUA && !isMobileClientHint) return false;

  // --- ANTI-CHEAT DEVTOOLS & DESKTOP SPOOFING GUARDS ---
  // 2. Desktop OS check: Host platform on Windows/Mac/Linux (DevTools keeps host platform)
  const platform = navigator.platform || '';
  if (/Win32|Win64|Windows|Linux x86_64/i.test(platform)) {
    return false;
  }
  // MacIntel host check: on desktop Mac running DevTools iPhone mode, platform is MacIntel but touchPoints <= 1
  if (/MacIntel/i.test(platform)) {
    const tp = navigator.maxTouchPoints || 0;
    if (tp <= 1 || !/iPad/i.test(ua)) {
      return false;
    }
  }

  // 3. UserAgentData host OS check (Chrome DevTools often leaks host OS)
  const clientPlatform = navigator.userAgentData?.platform || '';
  if (/Windows|macOS|Linux/i.test(clientPlatform)) {
    return false;
  }

  // 4. Pointer / Hover hardware check: PC/Laptop mouse is active even in DevTools
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(any-pointer: fine)').matches && window.matchMedia('(any-hover: hover)').matches) {
      return false;
    }
  }

  // 5. DevTools touch emulation check: Chrome DevTools sets maxTouchPoints = 1
  const touchPoints = navigator.maxTouchPoints || 0;
  if (touchPoints === 1) {
    return false;
  }

  // 6. DevTools viewport emulation check: Desktop browser window is much larger than emulated viewport.
  // ponytail: Guard by touchPoints <= 1 and devicePixelRatio so real phones rotated to landscape
  // (innerWidth > innerHeight) or high-DPI screens are never falsely blocked as desktop computers.
  if (typeof window !== 'undefined' && window.outerWidth && window.innerWidth) {
    const dpr = window.devicePixelRatio || 1;
    const normalizedOuterWidth = (window.outerWidth > window.innerWidth * 1.5 && dpr > 1)
      ? window.outerWidth / dpr
      : window.outerWidth;
    if (touchPoints <= 1 && (normalizedOuterWidth - window.innerWidth > 120)) {
      return false;
    }
  }

  return true;
}
if (typeof window !== 'undefined') {
  window.isMobilePhone = isMobilePhone;
}

// Client-side lightweight image compressor via HTML5 Canvas
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Tệp tải lên không phải là hình ảnh hợp lệ.'));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể phân tích dữ liệu ảnh.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function openQuestProofModal(quest) {
  if (!quest) return;
  currentProofQuest = quest;
  currentProofBase64 = null;
  isSubmittingProof = false;

  const isMobile = isMobilePhone();

  const rankEl = document.getElementById('proof-quest-rank');
  if (rankEl) {
    rankEl.textContent = `HẠNG ${quest.rank || 'B'}`;
    rankEl.className = `rank-badge-${quest.rank || 'B'} text-[10px] font-mono font-black px-2 py-0.5 rounded-md`;
  }

  const coinsEl = document.getElementById('proof-quest-coins');
  if (coinsEl) coinsEl.textContent = `+${quest.rewardCoins || 10} Vàng`;

  const titleEl = document.getElementById('proof-quest-title');
  if (titleEl) titleEl.textContent = quest.title;

  const guidanceContainer = document.getElementById('proof-guidance-container');
  const guidanceText = document.getElementById('proof-guidance-text');
  if (guidanceContainer && guidanceText) {
    if (quest.proofGuidance) {
      guidanceText.textContent = quest.proofGuidance;
      guidanceContainer.classList.remove('hidden');
    } else {
      guidanceContainer.classList.add('hidden');
    }
  }

  // Reset inputs and preview
  const fileInput = document.getElementById('input-quest-proof-file');
  if (fileInput) fileInput.value = '';

  const noteInput = document.getElementById('input-quest-proof-note');
  if (noteInput) {
    noteInput.value = '';
    noteInput.disabled = false;
  }

  const noteZone = document.getElementById('proof-note-zone');
  if (noteZone) {
    if (!isMobile) {
      noteZone.classList.add('hidden');
    } else {
      noteZone.classList.remove('hidden');
    }
  }

  const desktopNoticeZone = document.getElementById('proof-desktop-notice-zone');
  const captureZone = document.getElementById('proof-capture-zone');

  if (isMobile) {
    if (captureZone) captureZone.classList.remove('hidden');
    if (desktopNoticeZone) desktopNoticeZone.classList.add('hidden');
  } else {
    if (captureZone) captureZone.classList.add('hidden');
    if (desktopNoticeZone) desktopNoticeZone.classList.remove('hidden');
  }

  const previewZone = document.getElementById('proof-preview-zone');
  if (previewZone) previewZone.classList.add('hidden');

  const previewImg = document.getElementById('proof-preview-img');
  if (previewImg) previewImg.src = '';

  const evaluatingZone = document.getElementById('proof-evaluating-zone');
  if (evaluatingZone) evaluatingZone.classList.add('hidden');

  const resultBox = document.getElementById('proof-result-box');
  if (resultBox) resultBox.classList.add('hidden');

  const submitBtn = document.getElementById('btn-submit-proof');
  if (submitBtn) {
    submitBtn.disabled = true;
    if (!isMobile) {
      submitBtn.classList.add('hidden');
    } else {
      submitBtn.classList.remove('hidden');
      submitBtn.innerHTML = `<span>Gửi AI Duyệt</span><span>📸</span>`;
    }
  }

  openModal('modal-quest-proof');
}

async function submitQuestProofToAI() {
  if (!isMobilePhone()) {
    showToast('Chỉ cho phép chụp và nộp ảnh từ điện thoại để chống gian lận!', 'error');
    return;
  }
  if (!currentProofQuest || !currentProofBase64 || isSubmittingProof) return;

  const noteInput = document.getElementById('input-quest-proof-note');
  const userNote = noteInput ? noteInput.value.trim() : '';

  const submitBtn = document.getElementById('btn-submit-proof');
  const evaluatingZone = document.getElementById('proof-evaluating-zone');
  const resultBox = document.getElementById('proof-result-box');
  const resultIcon = document.getElementById('proof-result-icon');
  const resultTitle = document.getElementById('proof-result-title');
  const resultFeedback = document.getElementById('proof-result-feedback');

  isSubmittingProof = true;
  if (submitBtn) submitBtn.disabled = true;
  if (noteInput) noteInput.disabled = true;
  if (evaluatingZone) evaluatingZone.classList.remove('hidden');
  if (resultBox) resultBox.classList.add('hidden');

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'verify_proof',
        payload: {
          questId: currentProofQuest.id,
          title: currentProofQuest.title,
          description: currentProofQuest.description,
          userNote,
          imageBase64: currentProofBase64
        }
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.details || 'Lỗi kết nối AI');
    }

    const data = await res.json();
    if (evaluatingZone) evaluatingZone.classList.add('hidden');

    if (resultBox) {
      resultBox.classList.remove('hidden');
      if (data.approved) {
        pendingApprovedQuest = currentProofQuest;
        pendingApprovedQuest._proofVerified = true;
        triggerSave(true);

        closeModal('modal-quest-proof');

        const titleEl = document.getElementById('proof-approved-quest-title');
        const feedbackEl = document.getElementById('proof-approved-feedback');
        const coinsEl = document.getElementById('proof-approved-coins');
        const expEl = document.getElementById('proof-approved-exp');

        if (titleEl) titleEl.textContent = pendingApprovedQuest.title || '';
        if (feedbackEl) feedbackEl.textContent = data.feedback || 'Bằng chứng hợp lệ! Chúc mừng bạn đã hoàn thành nhiệm vụ.';
        if (coinsEl) coinsEl.textContent = `+${pendingApprovedQuest.rewardCoins || 10} VÀNG`;
        if (expEl) expEl.textContent = `+${(pendingApprovedQuest.rewardCoins || 10) * 3} EXP`;

        sfx.playFanfare();
        openModal('modal-proof-approved');
      } else {
        resultBox.className = 'p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200';
        if (resultIcon) resultIcon.textContent = '⚠️';
        if (resultTitle) resultTitle.textContent = 'AI CHƯA PHÊ DUYỆT';
        if (resultFeedback) resultFeedback.textContent = data.feedback || 'Ảnh chưa thấy rõ kết quả hoàn thành. Bạn vui lòng chụp lại nhé.';

        sfx.playGong();
        showToast('AI chưa phê duyệt bằng chứng. Vui lòng chụp lại ảnh rõ hơn nhé!', 'warning');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Gửi Lại AI Duyệt</span><span>📸</span>`;
        }
        if (noteInput) noteInput.disabled = false;
      }
    }
  } catch (err) {
    if (evaluatingZone) evaluatingZone.classList.add('hidden');
    showToast('Lỗi thẩm định ảnh: ' + (err.message || 'Vui lòng thử lại'), 'error');
    if (submitBtn) submitBtn.disabled = false;
    if (noteInput) noteInput.disabled = false;
  } finally {
    isSubmittingProof = false;
  }
}

// =============================================================================
// 7. SHOP & INVENTORY INTERACTIONS (Buy, Refund, Use, Undo, Delete)
// =============================================================================
async function deleteShopItem(itemId) {
  const item = appState.shopItems.find(i => i.id === itemId);
  if (!item) return;

  const ok = await confirmAction({
    title: 'Xóa Phần Thưởng?',
    message: `Bạn có chắc muốn xóa phần thưởng "${item.name}" khỏi Cửa Hàng?`,
    detail: '💡 Bạn có thể hoàn tác lại ngay sau khi xóa.',
    confirmText: 'Xóa 🗑️',
    cancelText: 'Giữ Lại',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!ok) return;

  const itemIndex = appState.shopItems.findIndex(i => i.id === itemId);
  const deletedItem = { ...item };
  appState.shopItems = appState.shopItems.filter(i => i.id !== itemId);
  triggerSave(true);
  renderShop();

  showToast(`Đã xóa phần thưởng "${deletedItem.name}".`, 'info', {
    label: 'Hoàn tác',
    onClick: () => {
      if (itemIndex >= 0 && itemIndex <= appState.shopItems.length) {
        appState.shopItems.splice(itemIndex, 0, deletedItem);
      } else {
        appState.shopItems.unshift(deletedItem);
      }
      triggerSave(true);
      renderShop();
      sfx.playFanfare();
      showToast(`Đã khôi phục phần thưởng "${deletedItem.name}".`, 'success');
    }
  });
}

async function buyShopItem(itemId) {
  const item = appState.shopItems.find(i => i.id === itemId);
  if (!item) return;

  // Đóng băng Cửa Hàng nếu có nợ quá hạn 7 ngày
  if (appState.profile?.bank?.isFrozen || (appState.profile?.bank?.loan && appState.profile.bank.loan.isOverdue)) {
    showToast('Tài khoản đang bị đóng băng do nợ quá hạn! Hãy hoàn thành nhiệm vụ để trả nợ trước khi đổi quà.', 'error');
    return;
  }

  const itemPrice = Math.max(0, parseInt(item.price, 10) || 0);
  if ((parseInt(appState.profile.coins, 10) || 0) < itemPrice) {
    showToast(`Chưa đủ vàng! Bạn cần thêm ${itemPrice - (parseInt(appState.profile.coins, 10) || 0)} Vàng nữa. Hãy hoàn thành thêm nhiệm vụ nhé!`, 'error');
    return;
  }

  const durationMinutes = extractRewardDuration(item);
  const hasTimer = durationMinutes > 0;

  // Nếu có hẹn giờ và đang trong nhiệm vụ tập trung, cảnh báo trước
  if (hasTimer && activeFocusQuest) {
    const okInterrupt = await confirmAction({
      title: 'Đang Trong Nhiệm Vụ Tập Trung',
      message: `Nhiệm vụ "${activeFocusQuest.title}" đang chạy (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Đổi quà này sẽ dừng nhiệm vụ để bắt đầu ${durationMinutes} phút tự thưởng cho bạn. Bạn có muốn tiếp tục?`,
      detail: '⚠️ Thời gian tập trung của nhiệm vụ đang làm dở sẽ không được tính.',
      confirmText: 'Đổi & Tự Thưởng Ngay 🎁',
      cancelText: 'Tiếp Tục Làm Việc ⚔️',
      icon: '🎁',
      btnColor: 'purple'
    });
    if (!okInterrupt) return;
  }

  const ok = await confirmAction({
    title: 'Đổi Phần Thưởng?',
    message: hasTimer
      ? `Bạn có chắc muốn dùng ${itemPrice} Vàng để đổi "${item.name}" và bắt đầu ${durationMinutes} phút tự thưởng?`
      : `Bạn có chắc muốn dùng ${itemPrice} Vàng để đổi phần thưởng "${item.name}"?`,
    detail: hasTimer
      ? `💰 Vàng hiện có: ${appState.profile.coins} | Còn lại: ${Math.max(0, appState.profile.coins - itemPrice)}\n⏱️ Đồng hồ đếm ngược ${durationMinutes} phút sẽ kích hoạt ngay trên màn hình!`
      : `💰 Vàng hiện có: ${appState.profile.coins} | Còn lại sau khi đổi: ${Math.max(0, appState.profile.coins - itemPrice)}`,
    confirmText: hasTimer ? `Đổi & Bấm Giờ (${durationMinutes}p) ⏱️` : 'Đổi Quà 🎁',
    cancelText: 'Để Sau',
    icon: item.icon || '🎁',
    btnColor: 'amber'
  });
  if (!ok) return;

  appState.profile.coins = Math.max(0, (parseInt(appState.profile.coins, 10) || 0) - itemPrice);
  appState.profile.totalCoinsSpent = Math.max(0, (parseInt(appState.profile.totalCoinsSpent, 10) || 0) + itemPrice);

  const newInvItem = {
    id: 'inv_' + Date.now(),
    shopItemId: item.id || item.shopItemId,
    name: item.name,
    description: item.description || '',
    price: itemPrice,
    tier: item.tier,
    icon: item.icon,
    targetMinutes: item.targetMinutes !== undefined ? item.targetMinutes : durationMinutes,
    signature: item.signature || '',
    purchasedAt: Date.now(),
    isUsed: false
  };

  appState.inventory.unshift(newInvItem);

  addLedgerEntry({
    id: 'led_' + Date.now(),
    type: 'spend',
    category: 'reward',
    amount: item.price,
    title: `Đổi quà: ${item.name}`,
    description: `Đổi quà: ${item.name}`,
    timestamp: Date.now()
  });

  sfx.playFanfare();
  showToast(`Đổi quà thành công! "${item.name}" đã được chuyển vào Kho Quà.`, 'success', {
    label: 'Hoàn tác',
    onClick: () => refundInventoryItem(newInvItem.id, true)
  });
  triggerSave(true);
  renderHeader();
  renderShop();
  renderInventory();
  renderLedger();

  if (hasTimer) {
    await useInventoryItem(newInvItem.id, true);
    document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    switchRewardSubtab('inventory');
  }
}

async function refundInventoryItem(invId, skipConfirm = false) {
  const item = appState.inventory.find(i => i.id === invId);
  if (!item) return;

  const isCurrentlyActive = Boolean(activeRewardItem && activeRewardItem.id === invId);
  if (item.isUsed && !skipConfirm && !isCurrentlyActive) return;

  if (!skipConfirm) {
    const ok = await confirmAction({
      title: 'Hoàn Trả Phần Thưởng?',
      message: `Bạn muốn hoàn trả "${item.name}" và nhận lại ${item.price} Vàng?`,
      detail: isCurrentlyActive ? '⚠️ Bộ đếm thời gian đang chạy sẽ được dừng và số Vàng sẽ được hoàn lại đầy đủ.' : '💰 Số Vàng sẽ được hoàn lại đầy đủ vào tài khoản của bạn.',
      confirmText: 'Hoàn Trả ↩️',
      cancelText: 'Giữ Lại',
      icon: '💰',
      btnColor: 'amber'
    });
    if (!ok) return;
  }

  if (activeRewardItem && activeRewardItem.id === invId) {
    clearFocusTimerSession();
  }

  appState.profile.coins += item.price;
  appState.profile.totalCoinsSpent = Math.max(0, (parseInt(appState.profile.totalCoinsSpent, 10) || 0) - item.price);
  appState.inventory = appState.inventory.filter(i => i.id !== invId);

  addLedgerEntry({
    id: 'led_' + Date.now(),
    type: 'earn',
    category: 'reward',
    amount: item.price,
    title: `Hoàn trả quà: ${item.name}`,
    description: `Hoàn trả quà: ${item.name}`,
    timestamp: Date.now()
  });

  sfx.playCoin();
  triggerSave(true);
  renderHeader();
  renderInventory();
  renderLedger();
  showToast(`Đã hoàn trả "${item.name}" (+${item.price} Vàng).`, 'gold');
}

async function useInventoryItem(invId, skipConfirm = false) {
  const item = appState.inventory.find(i => i.id === invId);
  if (!item) return;

  // Đóng băng Cửa Hàng & Kho Quà nếu nợ quá hạn
  if (appState.profile?.bank?.isFrozen || (appState.profile?.bank?.loan && appState.profile.bank.loan.isOverdue)) {
    showToast('Tài khoản đang bị đóng băng do nợ quá hạn! Hãy hoàn thành nhiệm vụ để trả nợ trước khi sử dụng quà.', 'error');
    return;
  }

  // Case 1: Quà này đang được đếm giờ
  if (activeRewardItem && activeRewardItem.id === invId) {
    if (isFocusRunning) {
      showToast(`Phần thưởng "${item.name}" đang được đếm giờ (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại)!`, 'info');
      document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    } else {
      const ok = await confirmAction({
        title: 'Tiếp Tục Đếm Giờ Quà?',
        message: `Phần thưởng "${item.name}" đang tạm dừng với ${Math.ceil(focusRemainingSeconds / 60)} phút còn lại. Bạn có muốn tiếp tục đếm giờ?`,
        confirmText: 'Tiếp Tục ⏱️',
        cancelText: 'Hủy',
        icon: item.icon || '🎁',
        btnColor: 'purple'
      });
      if (ok) {
        toggleFocusTimer();
      }
      return;
    }
  }

  const hasSavedTimer = Boolean(item.savedTimer && item.savedTimer.remainingSeconds > 0);

  // Case 2: Đã sử dụng và không chạy timer cũng như không có bảo lưu
  if (item.isUsed && !hasSavedTimer) {
    showToast('Phần thưởng này đã được sử dụng!', 'info');
    return;
  }

  const durationMinutes = hasSavedTimer
    ? Math.ceil(item.savedTimer.remainingSeconds / 60)
    : extractRewardDuration(item);

  if (!skipConfirm) {
    // Case 3: Xung đột với phiên tập trung nhiệm vụ
    if (activeFocusQuest) {
      const ok = await confirmAction({
        title: 'Bảo Lưu Nhiệm Vụ & Dùng Quà?',
        message: `Nhiệm vụ "${activeFocusQuest.title}" đang chạy (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Bạn có muốn chuyển sang dùng phần thưởng "${item.name}"?`,
        detail: `✅ Thời gian của "${activeFocusQuest.title}" sẽ được BẢO LƯU tự động. Bạn có thể quay lại làm tiếp bất cứ lúc nào!`,
        confirmText: 'Bảo Lưu & Dùng Quà 🎁',
        cancelText: 'Tiếp Tục Nhiệm Vụ ⚔️',
        icon: '🎁',
        btnColor: 'purple'
      });
      if (!ok) return;
      activeFocusQuest.savedTimer = {
        remainingSeconds: Math.max(0, focusRemainingSeconds),
        actualFocusedSeconds: actualFocusedSeconds,
        totalSeconds: focusTotalSeconds || ((activeFocusQuest.targetMinutes || 25) * 60),
        savedAt: Date.now()
      };
      activeFocusQuest = null;
      renderQuests();
    } else if (isBreakMode) {
      // Case 4: Xung đột với giờ nghỉ giải lao
      const ok = await confirmAction({
        title: 'Kết Thúc Giờ Nghỉ?',
        message: `Bạn đang trong giờ nghỉ giải lao (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Bạn có muốn kết thúc nghỉ ngơi để bắt đầu dùng phần thưởng "${item.name}" ngay?`,
        confirmText: 'Dùng Quà Ngay 🎁',
        cancelText: 'Nghỉ Tiếp ☕',
        icon: '☕',
        btnColor: 'purple'
      });
      if (!ok) return;
      isBreakMode = false;
    } else if (activeRewardItem && activeRewardItem.id !== invId) {
      // Case 5: Đang có một phần thưởng khác đang đếm giờ
      const prevReward = activeRewardItem;
      const ok = await confirmAction({
        title: 'Đổi Phần Thưởng & Bảo Lưu?',
        message: `Bạn đang trong phiên dùng quà "${prevReward.name}" (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Bạn có muốn chuyển sang dùng "${item.name}"?`,
        detail: `✅ Phần thưởng hiện tại sẽ được BẢO LƯU thời gian trong Kho Quà!`,
        confirmText: 'Bảo Lưu & Đổi Quà 🎁',
        cancelText: 'Giữ Quà Hiện Tại',
        icon: '🎁',
        btnColor: 'purple'
      });
      if (!ok) return;
      prevReward.savedTimer = {
        remainingSeconds: Math.max(0, focusRemainingSeconds),
        totalSeconds: focusTotalSeconds || (extractRewardDuration(prevReward) * 60),
        savedAt: Date.now()
      };
      activeRewardItem = null;
      renderInventory();
    } else if (hasSavedTimer) {
      // Case 6a: Xác nhận tiếp tục dùng quà đã bảo lưu
      const ok = await confirmAction({
        title: 'Tiếp Tục Dùng Quà Đã Bảo Lưu?',
        message: `Tiếp tục sử dụng "${item.name}" với ${durationMinutes} phút còn lại?`,
        detail: '🎉 Hãy thư giãn trọn vẹn và nạp lại năng lượng cho những thử thách tiếp theo!',
        confirmText: `Tiếp Tục Dùng (${durationMinutes}p) ⏱️`,
        cancelText: 'Để Sau',
        icon: item.icon || '🎁',
        btnColor: 'purple'
      });
      if (!ok) return;
    } else if (durationMinutes > 0) {
      // Case 6b: Xác nhận sử dụng quà kèm thời lượng đếm ngược
      const ok = await confirmAction({
        title: 'Sử Dụng Phần Thưởng & Bắt Đầu Đếm Giờ?',
        message: `Bắt đầu tận hưởng phần thưởng "${item.name}" trong ${durationMinutes} phút?`,
        detail: '🎉 Hãy thư giãn trọn vẹn và nạp lại năng lượng cho những thử thách tiếp theo!',
        confirmText: `Dùng & Bấm Giờ (${durationMinutes}p) ⏱️`,
        cancelText: 'Để Sau',
        icon: item.icon || '🎁',
        btnColor: 'purple'
      });
      if (!ok) return;
    } else {
      // Case 7: Quà nhận ngay không cần đếm giờ
      const ok = await confirmAction({
        title: 'Sử Dụng Phần Thưởng?',
        message: `Bạn muốn sử dụng phần thưởng "${item.name}" ngay bây giờ?`,
        detail: '🎉 Hãy tự thưởng cho bản thân sau những nỗ lực rèn luyện và làm việc chăm chỉ!',
        confirmText: 'Sử Dụng 🎁',
        cancelText: 'Để Sau',
        icon: item.icon || '🎁',
        btnColor: 'purple'
      });
      if (!ok) return;
    }
  } else {
    // Khi skipConfirm = true (ví dụ khi mua quà từ Cửa Hàng có timer): Tự động bảo lưu phiên cũ
    if (activeFocusQuest) {
      activeFocusQuest.savedTimer = {
        remainingSeconds: Math.max(0, focusRemainingSeconds),
        actualFocusedSeconds: actualFocusedSeconds,
        totalSeconds: focusTotalSeconds || ((activeFocusQuest.targetMinutes || 25) * 60),
        savedAt: Date.now()
      };
      activeFocusQuest = null;
      renderQuests();
    } else if (activeRewardItem && activeRewardItem.id !== invId) {
      activeRewardItem.savedTimer = {
        remainingSeconds: Math.max(0, focusRemainingSeconds),
        totalSeconds: focusTotalSeconds || (extractRewardDuration(activeRewardItem) * 60),
        savedAt: Date.now()
      };
      activeRewardItem = null;
      renderInventory();
    }
  }

  // Nếu quà không cần bấm giờ
  if (durationMinutes === 0 && !hasSavedTimer) {
    if (isFocusRunning || focusTimerInterval || activeFocusQuest || activeRewardItem) {
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
      releaseWakeLock();
      activeFocusQuest = null;
      activeRewardItem = null;
      isFocusRunning = false;
      isBreakMode = false;
      focusRemainingSeconds = 0;
      focusTotalSeconds = 0;
      actualFocusedSeconds = 0;
      appState.activeTimer = null;
      appState.lastTimerClearedAt = Date.now();
      try { localStorage.removeItem(TIMER_STORAGE_KEY); } catch (_) {}
      renderFocusStationUI();
    }

    item.isUsed = true;
    item.usedAt = Date.now();
    delete item.savedTimer;
    sfx.playFanfare();
    showToast(`🎉 Đã sử dụng phần thưởng "${item.name}"! Chúc mừng bạn!`, 'success', {
      label: 'Hoàn tác',
      onClick: () => undoUseInventoryItem(invId, true)
    });
    renderInventory();
    triggerSave(true);
    return;
  }

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  item.isUsed = true;
  item.usedAt = item.usedAt || Date.now();

  let initialRemainingSec = Math.max(1, durationMinutes) * 60;
  let initialTotalSec = initialRemainingSec;

  if (hasSavedTimer) {
    initialRemainingSec = Math.max(1, item.savedTimer.remainingSeconds);
    initialTotalSec = item.savedTimer.totalSeconds || initialRemainingSec;
    delete item.savedTimer;
  }

  lastLocalTimerActionTime = Date.now();
  activeRewardItem = item;
  activeFocusQuest = null;
  isBreakMode = false;
  focusTotalSeconds = initialTotalSec;
  focusRemainingSeconds = initialRemainingSec;
  actualFocusedSeconds = 0;
  isFocusRunning = true;
  lastTickTime = Date.now();

  renderFocusStationUI();
  updateTimerDisplay();
  saveFocusTimerState(true, true, 'start');
  requestWakeLock();
  renderQuests();
  renderInventory();

  clearInterval(focusTimerInterval);
  focusTimerInterval = setInterval(tickFocusTimer, 500);

  sfx.playFanfare();
  if (hasSavedTimer) {
    showToast(`Tiếp tục tận hưởng: "${item.name}" (${Math.ceil(initialRemainingSec / 60)} phút còn lại)! Chúc bạn thư giãn tuyệt vời.`, 'purple');
  } else {
    showToast(`Bắt đầu tận hưởng: "${item.name}" (${durationMinutes} phút)! Chúc bạn thư giãn tuyệt vời.`, 'purple', {
      label: 'Hoàn tác',
      onClick: () => undoUseInventoryItem(invId, true)
    });
  }
}

async function undoUseInventoryItem(invId, skipConfirm = false) {
  const item = appState.inventory.find(i => i.id === invId);
  if (!item || !item.isUsed) return;

  const isCurrentlyActive = Boolean(activeRewardItem && activeRewardItem.id === invId);
  if (!isCurrentlyActive && item.usedAt && (Date.now() - item.usedAt > 5 * 60 * 1000)) {
    showToast(`Phần thưởng "${item.name}" đã hoàn thành và quá thời hạn hoàn tác (5 phút).`, 'warning');
    return;
  }

  if (!skipConfirm) {
    const ok = await confirmAction({
      title: 'Hoàn Tác Sử Dụng?',
      message: `Đưa phần thưởng "${item.name}" về trạng thái Chưa Dùng?`,
      detail: activeRewardItem && activeRewardItem.id === invId ? '⚠️ Bộ đếm thời gian của phần thưởng này sẽ được dừng.' : '',
      confirmText: 'Hoàn Tác ↩️',
      cancelText: 'Giữ Nguyên',
      icon: '↩️',
      btnColor: 'amber'
    });
    if (!ok) return;
  }

  if (activeRewardItem && activeRewardItem.id === invId) {
    clearFocusTimerSession();
  }

  item.isUsed = false;
  delete item.usedAt;
  delete item.savedTimer;
  sfx.playClick();
  triggerSave(true);
  renderInventory();
  showToast(`Đã đưa "${item.name}" về trạng thái Chưa Dùng.`, 'info');
}

async function deleteInventoryItem(invId) {
  const item = appState.inventory.find(i => i.id === invId);
  if (!item) return;

  const ok = await confirmAction({
    title: 'Xóa Khỏi Kho Quà?',
    message: `Bạn có chắc muốn xóa lịch sử phần thưởng "${item.name}"?`,
    detail: '💡 Bạn có thể hoàn tác lại ngay sau khi xóa.',
    confirmText: 'Xóa 🗑️',
    cancelText: 'Giữ Lại',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!ok) return;

  if (activeRewardItem && activeRewardItem.id === invId) {
    clearFocusTimerSession();
  }

  const itemIndex = appState.inventory.findIndex(i => i.id === invId);
  const deletedItem = { ...item };
  appState.inventory = appState.inventory.filter(i => i.id !== invId);
  triggerSave(true);
  renderInventory();

  showToast(`Đã xóa "${deletedItem.name}" khỏi Kho Quà.`, 'info', {
    label: 'Hoàn tác',
    onClick: () => {
      if (itemIndex >= 0 && itemIndex <= appState.inventory.length) {
        appState.inventory.splice(itemIndex, 0, deletedItem);
      } else {
        appState.inventory.unshift(deletedItem);
      }
      triggerSave(true);
      renderInventory();
      sfx.playClick();
      showToast(`Đã khôi phục "${deletedItem.name}" vào Kho Quà.`, 'success');
    }
  });
}

// ponytail: infer an appropriate emoji icon based on quest title, description or category if not explicitly set
function getQuestIcon(q) {
  if (q?.icon && typeof q.icon === 'string' && q.icon.trim()) {
    return q.icon.trim();
  }
  const text = `${q?.title || ''} ${q?.description || ''}`.toLowerCase();
  const clean = text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

  if (/\b(doc|sach|bai|chuong|giao trinh|on thi|luyen de|viet|nghien cuu)\b/.test(clean)) return '📚';
  if (/\b(code|lap trinh|fix|bug|deploy|test|git|feature|refactor|dev|project|du an)\b/.test(clean)) return '💻';
  if (/\b(tap|gym|chay|the duc|hit dat|plank|squat|van dong|yoga|boi|dap xe)\b/.test(clean)) return '🏃';
  if (/\b(don|quet|lau|rua|giat|ve sinh|ngan nap|rac|nha cua|phong)\b/.test(clean)) return '🧹';
  if (/\b(nau|an|com|bep|cho|mon an|uong|nuoc)\b/.test(clean)) return '🍳';
  if (/\b(tieng anh|ielts|toeic|tu vung|nghe|ngu phap|flashcard|kanji|tieng nhat)\b/.test(clean)) return '🗣️';
  if (/\b(email|hop|meeting|bao cao|ke hoach|tai lieu|deadline|goi|call|khach hang)\b/.test(clean)) return '💼';
  if (/\b(ngu|nghi ngoi|thien|relax|thu gian|tam)\b/.test(clean)) return '🌿';
  if (/\b(ve|nhac|dan|hat|piano|guitar|sang tao|thiet ke|design)\b/.test(clean)) return '🎨';
  if (/\b(mua|sam|chi tieu|tien|ngan hang|tiet kiem)\b/.test(clean)) return '💰';

  if (q?.category === 'study') return '📚';
  if (q?.category === 'work') return '💻';
  if (q?.category === 'fitness') return '🏃';
  if (q?.category === 'chore') return '🧹';
  if (q?.type === 'focus') return '⏳';
  return '🎯';
}
window.getQuestIcon = getQuestIcon;

// =============================================================================
// 8. STRICT AI ARBITER EVALUATION & DEBATE
// =============================================================================
let currentPendingVerdict = null;
let currentDebateHistory = [];
let currentEditingQuestId = null;
let currentEditingRewardId = null;
// =============================================================================
// QUICK SMART AUTO-SUGGESTIONS (Nhiệm Vụ & Phần Thưởng Thông Minh)
// =============================================================================
let currentQuestSuggestions = [];
let currentRewardSuggestions = [];
let isFetchingQuestSuggestions = false;
let isFetchingRewardSuggestions = false;

function getClientQuestSuggestionsFallback(customQuests = null, customCoins = null, customLevel = null) {
  const quests = Array.isArray(customQuests) ? customQuests : (Array.isArray(appState?.quests) ? appState.quests : []);
  const existingNorms = quests.map(q => (q.title || '').toLowerCase().trim());
  const userCoins = customCoins !== null ? customCoins : (parseInt(appState?.profile?.coins, 10) || 0);
  const userLevel = customLevel !== null ? customLevel : (parseInt(appState?.profile?.level, 10) || 1);

  const QUEST_PILLARS = [
    {
      id: 'fitness',
      name: 'Vận động thể chất & Sức bền',
      keywords: ['tập', 'chạy', 'đi bộ', 'hít đất', 'squat', 'yoga', 'giãn cơ', 'thể dục', 'gym', 'vận động', 'bơi', 'plank', 'thể thao'],
      items: [
        {
          title: 'Tập 3 hiệp hít đất & squat tại chỗ',
          description: 'Khởi động cơ thể với 15 cái hít đất và 20 cái squat để kích hoạt cơ bắp.',
          type: 'focus',
          targetMinutes: 15,
          rewardCoins: 6,
          isRepeatable: true,
          icon: '🏋️',
          reason: 'Bổ sung vận động thể chất giúp kích hoạt trao đổi chất và xua tan uể oải.'
        },
        {
          title: 'Chạy bộ hoặc đi bộ nhanh 20 phút ngoài trời',
          description: 'Thay giày và vận động ngoài không gian mở để tăng cường sức bền tim mạch.',
          type: 'focus',
          targetMinutes: 20,
          rewardCoins: 8,
          isRepeatable: true,
          icon: '🏃',
          reason: 'Hít thở không khí tự nhiên, giải phóng endorphin tạo hưng phấn tích cực.'
        },
        {
          title: 'Giãn cơ cổ vai gáy & tập yoga 10 phút',
          description: 'Thả lỏng các nhóm cơ bị căng cứng do ngồi máy tính lâu, xoay hông và kéo giãn lưng.',
          type: 'focus',
          targetMinutes: 10,
          rewardCoins: 5,
          isRepeatable: true,
          icon: '🧘',
          reason: 'Phòng ngừa thoái hóa cột sống cổ và giảm căng thẳng tức thì.'
        }
      ]
    },
    {
      id: 'learning',
      name: 'Học tập & Kỹ năng tư duy',
      keywords: ['học', 'từ vựng', 'tiếng anh', 'ngoại ngữ', 'đọc', 'sách', 'tài liệu', 'bài tập', 'khóa học', 'ôn thi', 'lập trình', 'code'],
      items: [
        {
          title: 'Học 15 từ vựng hoặc 1 chủ điểm ngữ pháp mới',
          description: 'Ghi chú và đặt 3 câu ví dụ thực tế với cấu trúc vừa học.',
          type: 'focus',
          targetMinutes: 20,
          rewardCoins: 8,
          isRepeatable: false,
          icon: '🇬🇧',
          reason: 'Bổ sung vốn ngoại ngữ và tri thức liên tục mỗi ngày.'
        },
        {
          title: 'Đọc 10-15 trang sách hoặc tài liệu chuyên môn',
          description: 'Nạp kiến thức mới, gạch chân các ý tưởng tâm đắc để áp dụng vào thực tế.',
          type: 'focus',
          targetMinutes: 20,
          rewardCoins: 7,
          isRepeatable: false,
          icon: '📖',
          reason: 'Nuôi dưỡng thói quen đọc và làm giàu vốn hiểu biết mỗi ngày.'
        },
        {
          title: 'Xem 1 bài giảng TED hoặc video kiến thức chuyên sâu',
          description: 'Ghi chép lại 3 ý tưởng tâm đắc từ diễn giả hoặc chuyên gia.',
          type: 'focus',
          targetMinutes: 15,
          rewardCoins: 6,
          isRepeatable: false,
          icon: '🎓',
          reason: 'Mở rộng tầm nhìn và cập nhật xu hướng hiểu biết thế giới.'
        },
        {
          title: 'Giải 3 bài tập khó hoặc thử thách lập trình',
          description: 'Đào sâu tư duy logic để tìm ra lời giải tối ưu cho bài toán kỹ thuật.',
          type: 'focus',
          targetMinutes: 30,
          rewardCoins: 11,
          isRepeatable: false,
          icon: '🧠',
          reason: 'Rèn luyện khả năng giải quyết vấn đề và chịu đựng áp lực trí tuệ.'
        }
      ]
    },
    {
      id: 'deepwork',
      name: 'Tập trung sâu & Giải quyết việc cốt lõi',
      keywords: ['pomodoro', 'dự án', 'hoàn thành', 'việc khó', 'deep work', 'công việc', 'báo cáo', 'deadline', 'nhiệm vụ'],
      items: [
        {
          title: 'Phiên Pomodoro 25 phút tập trung sâu',
          description: 'Bật chế độ tập trung, cách ly mạng xã hội và dồn 100% năng lượng vào công việc.',
          type: 'focus',
          targetMinutes: 25,
          rewardCoins: 9,
          isRepeatable: false,
          icon: '⏱️',
          reason: 'Thiết lập nhịp tập trung chuẩn không xao nhãng để tạo đà bứt phá.'
        },
        {
          title: 'Xử lý dứt điểm 1 việc khó nhất đang trì hoãn',
          description: 'Áp dụng nguyên tắc Nuốt chửng con ếch (Eat That Frog), tập trung giải quyết ngay.',
          type: 'focus',
          targetMinutes: 30,
          rewardCoins: 12,
          isRepeatable: false,
          icon: '🎯',
          reason: 'Giải phóng áp lực tâm lý từ việc trì hoãn lâu ngày.'
        },
        {
          title: 'Luyện gõ bàn phím 10 ngón tốc độ cao 15 phút',
          description: 'Luyện tập trên Monkeytype hoặc TypeRacer để tăng tốc độ và độ chuẩn xác.',
          type: 'focus',
          targetMinutes: 15,
          rewardCoins: 6,
          isRepeatable: true,
          icon: '⌨️',
          reason: 'Nâng cao năng suất thao tác công việc và phản xạ ngón tay.'
        }
      ]
    },
    {
      id: 'wellness',
      name: 'Phục hồi cơ thể & Không gian sống',
      keywords: ['nước', 'dọn', 'nghỉ', 'bàn làm việc', 'inbox', 'mắt', 'hít thở', 'ngủ', 'ăn', 'rác', 'giường', 'phòng', 'cây'],
      items: [
        {
          title: 'Uống 1 ly nước ấm & hít thở sâu 5 phút',
          description: 'Uống từng ngụm nước ấm và thực hiện 10 nhịp thở bụng sâu đón năng lượng mới.',
          type: 'bounty',
          targetMinutes: 0,
          rewardCoins: 3,
          isRepeatable: true,
          icon: '💧',
          reason: 'Cấp nước cho não bộ và tái lập trạng thái bình tĩnh, cân bằng cơ thể.'
        },
        {
          title: 'Dọn dẹp bàn làm việc & sắp xếp tài liệu ngăn nắp',
          description: 'Lau sạch bụi bàn, cất gọn giấy tờ và chuẩn bị không gian làm việc sạch sẽ.',
          type: 'bounty',
          targetMinutes: 0,
          rewardCoins: 4,
          isRepeatable: true,
          icon: '🧹',
          reason: 'Không gian gọn gàng giúp tâm trí thông thoáng và tập trung cao độ.'
        },
        {
          title: 'Dọn sạch hộp thư đến & hủy đăng ký email rác',
          description: 'Đạt trạng thái Inbox Zero, phân loại thư quan trọng và xóa thư quảng cáo.',
          type: 'bounty',
          targetMinutes: 0,
          rewardCoins: 4,
          isRepeatable: true,
          icon: '📥',
          reason: 'Giảm ô nhiễm thông tin kỹ thuật số giúp đầu óc nhẹ nhõm.'
        },
        {
          title: 'Lập kế hoạch & chọn ra 3 ưu tiên cho ngày mai',
          description: 'Viết ra 3 mục tiêu đinh cho ngày kế tiếp để sáng mai bắt tay vào làm ngay.',
          type: 'focus',
          targetMinutes: 15,
          rewardCoins: 6,
          isRepeatable: true,
          icon: '📝',
          reason: 'Tạo đà chủ động, giúp bạn thức dậy với định hướng rõ ràng.'
        }
      ]
    }
  ];

  // 1. Phân tích số lượng nhiệm vụ người dùng đã có theo từng trụ cột
  const pillarStats = QUEST_PILLARS.map(pillar => {
    let count = 0;
    existingNorms.forEach(title => {
      if (pillar.keywords.some(kw => title.includes(kw))) {
        count++;
      }
    });
    return { pillar, count };
  });

  // 2. Sắp xếp theo trụ cột thiếu nhất (nhu cầu còn thiếu)
  pillarStats.sort((a, b) => a.count - b.count);

  const selected = [];
  const pickedTitles = new Set();

  for (const stat of pillarStats) {
    if (selected.length >= 3) break;
    const available = stat.pillar.items.filter(item => {
      const norm = item.title.toLowerCase().trim();
      const alreadyExists = existingNorms.some(t => t.includes(norm) || norm.includes(t));
      const alreadyPicked = pickedTitles.has(norm);
      return !alreadyExists && !alreadyPicked;
    });

    if (available.length > 0) {
      const best = (userLevel <= 2 && available.some(i => i.type === 'bounty' || i.targetMinutes <= 15))
        ? (available.find(i => i.targetMinutes <= 15) || available[0])
        : available[0];
      selected.push(best);
      pickedTitles.add(best.title.toLowerCase().trim());
    }
  }

  if (selected.length < 3) {
    const allPoolItems = QUEST_PILLARS.flatMap(p => p.items);
    for (const item of allPoolItems) {
      if (selected.length >= 3) break;
      const norm = item.title.toLowerCase().trim();
      const alreadyExists = existingNorms.some(t => t.includes(norm) || norm.includes(t));
      const alreadyPicked = pickedTitles.has(norm);
      if (!alreadyExists && !alreadyPicked) {
        selected.push(item);
        pickedTitles.add(norm);
      }
    }
  }

  if (selected.length === 0) {
    return QUEST_PILLARS[0].items.slice(0, 3);
  }

  return selected.slice(0, 3);
}

function getClientRewardSuggestionsFallback(customRewards = null, customQuests = null, customCoins = null) {
  const shop = Array.isArray(customRewards) ? customRewards : (Array.isArray(appState?.shopItems) ? appState.shopItems : []);
  const existingNames = shop.map(s => (s.name || '').toLowerCase().trim());
  const activeQuests = Array.isArray(customQuests) ? customQuests : (Array.isArray(appState?.quests) ? appState.quests.filter(q => q.status === 'active') : []);
  const activeQuestNorms = activeQuests.map(q => (q.title || '').toLowerCase().trim());
  const userCoins = customCoins !== null ? customCoins : (parseInt(appState?.profile?.coins, 10) || 0);

  const REWARD_PILLARS = [
    {
      id: 'treat',
      name: 'Ẩm thực & Thức uống thơm ngon',
      keywords: ['cà phê', 'trà sữa', 'bánh', 'ăn', 'uống', 'kem', 'nước ép', 'tráng miệng'],
      items: [
        {
          name: 'Thưởng thức 1 ly cà phê / trà thảo mộc tự pha',
          description: 'Nhâm nhi tách đồ uống thơm ngon trong 15 phút tĩnh lặng nạp năng lượng.',
          price: 20,
          targetMinutes: 15,
          tier: 'common',
          icon: '☕',
          reason: 'Khoảng lặng êm dịu tái tạo sự tỉnh táo mà không làm ngắt mạch năng suất.'
        },
        {
          name: 'Tự thưởng 1 ly trà sữa / nước ép hoa quả mát lạnh',
          description: 'Order một ly đồ uống mát lạnh yêu thích giải nhiệt sau giờ làm việc căng thẳng.',
          price: 30,
          targetMinutes: 20,
          tier: 'common',
          icon: '🧋',
          reason: 'Vị ngọt thanh mát kích thích dopamine tự nhiên, mang lại cảm giác sảng khoái.'
        },
        {
          name: 'Thưởng thức món bánh ngọt hoặc kem tươi yêu thích',
          description: 'Nhâm nhi một chiếc bánh tart, bánh sừng bò hoặc ly kem mát lạnh hảo hạng.',
          price: 25,
          targetMinutes: 15,
          tier: 'common',
          icon: '🍦',
          reason: 'Phần thưởng ngọt ngào xua tan mệt mỏi sau khi hoàn thành chuỗi việc.'
        }
      ]
    },
    {
      id: 'gaming_entertainment',
      name: 'Giải trí kỹ thuật số & Gaming',
      keywords: ['game', 'chơi game', 'anime', 'phim', 'video', 'truyện', 'lướt web', 'youtube', 'podcast'],
      items: [
        {
          name: '30 phút chơi tựa game yêu thích không áy náy',
          description: 'Thỏa sức phiêu lưu giải trí trong thế giới game sau chuỗi nhiệm vụ vất vả.',
          price: 35,
          targetMinutes: 30,
          tier: 'rare',
          icon: '🎮',
          reason: 'Phần thưởng xứng đáng cho những nỗ lực kỷ luật đã bỏ ra.'
        },
        {
          name: 'Xem 1 tập phim anime hoặc series phim mới',
          description: 'Thả lỏng cơ thể trên ghế sofa và thưởng thức một tập phim hấp dẫn.',
          price: 45,
          targetMinutes: 45,
          tier: 'rare',
          icon: '🎬',
          reason: 'Đắm chìm vào câu chuyện giải trí để khép lại một ngày học tập hiệu quả.'
        },
        {
          name: '20 phút xem video giải trí hoặc podcast hài hước',
          description: 'Bật video của sáng tạo nội dung yêu thích và cười sảng khoái.',
          price: 20,
          targetMinutes: 20,
          tier: 'common',
          icon: '📺',
          reason: 'Tiếng cười giúp giảm lượng cortisol và giải tỏa căng thẳng thần kinh.'
        }
      ]
    },
    {
      id: 'self_care',
      name: 'Thư giãn thể chất & Tự chăm sóc',
      keywords: ['tắm', 'ngủ', 'chợp mắt', 'dạo', 'hóng mát', 'nhạc', 'thư giãn', 'nghỉ ngơi'],
      items: [
        {
          name: 'Tắm nước nóng thư giãn xua tan mệt mỏi',
          description: 'Ngâm mình dưới làn nước ấm, thả lỏng toàn bộ cơ bắp và tinh thần.',
          price: 25,
          targetMinutes: 20,
          tier: 'common',
          icon: '🛁',
          reason: 'Kích thích tuần hoàn máu và giúp giấc ngủ sâu hơn.'
        },
        {
          name: 'Chợp mắt nghỉ trưa 20 phút phục hồi năng lượng',
          description: 'Một giấc ngủ ngắn (Power Nap) đúng nhịp sinh học giúp khởi động lại não bộ.',
          price: 20,
          targetMinutes: 20,
          tier: 'common',
          icon: '😴',
          reason: 'Nạp đầy năng lượng cho buổi chiều làm việc minh mẫn.'
        },
        {
          name: 'Đi dạo hóng mát ngoài trời không mang điện thoại',
          description: 'Tản bộ 20 phút trong công viên hoặc ngắm hoàng hôn để tâm trí tĩnh lặng.',
          price: 20,
          targetMinutes: 20,
          tier: 'common',
          icon: '🌅',
          reason: 'Tách biệt khỏi ánh sáng xanh và tái kết nối với thế giới xung quanh.'
        },
        {
          name: 'Nghe trọn vẹn 1 album nhạc acoustic hoặc lofi thư giãn',
          description: 'Đeo tai nghe và thả hồn vào những giai điệu yêu thích giúp xua tan căng thẳng.',
          price: 25,
          targetMinutes: 25,
          tier: 'common',
          icon: '🎧',
          reason: 'Nuôi dưỡng cảm xúc tích cực và xoa dịu tinh thần sau giờ làm việc.'
        }
      ]
    },
    {
      id: 'milestone',
      name: 'Trải nghiệm & Kết nối xã hội',
      keywords: ['bạn bè', 'sách', 'mua', 'quà', 'sở thích', 'đi chơi', 'dạo phố'],
      items: [
        {
          name: 'Một buổi tối dạo phố / gặp gỡ tán gẫu cùng bạn bè',
          description: 'Tự thưởng buổi đi chơi thoải mái bên những người bạn thân thiết.',
          price: 75,
          targetMinutes: 90,
          tier: 'epic',
          icon: '🌟',
          reason: 'Cân bằng giữa phát triển cá nhân và các mối quan hệ xã hội ấm áp.'
        },
        {
          name: 'Mua một cuốn sách mới hoặc món đồ yêu thích',
          description: 'Đầu tư cho bản thân một món quà vật lý lưu giữ kỷ niệm kỷ luật.',
          price: 80,
          targetMinutes: 0,
          tier: 'epic',
          icon: '🎁',
          reason: 'Cột mốc hữu hình đánh dấu sự kiên trì vượt trội của bạn.'
        },
        {
          name: 'Dành 45 phút cho sở thích cá nhân bỏ quên',
          description: 'Chăm sóc bể cá, xếp lego, tỉa cây cảnh hoặc làm đồ thủ công.',
          price: 40,
          targetMinutes: 45,
          tier: 'rare',
          icon: '🪴',
          reason: 'Kích thích niềm say mê tự nhiên bên ngoài công việc.'
        }
      ]
    }
  ];

  const pillarStats = REWARD_PILLARS.map(pillar => {
    let count = 0;
    existingNames.forEach(name => {
      if (pillar.keywords.some(kw => name.includes(kw))) {
        count++;
      }
    });

    const isStressful = activeQuestNorms.some(t => t.includes('án') || t.includes('khó') || t.includes('pomodoro') || t.includes('học') || t.includes('tập'));
    if (pillar.id === 'self_care' && isStressful) {
      count = Math.max(0, count - 1);
    }

    return { pillar, count };
  });

  pillarStats.sort((a, b) => a.count - b.count);

  const selected = [];
  const pickedNames = new Set();

  for (const stat of pillarStats) {
    if (selected.length >= 3) break;
    const available = stat.pillar.items.filter(item => {
      const norm = item.name.toLowerCase().trim();
      const alreadyExists = existingNames.some(n => n.includes(norm) || norm.includes(n));
      const alreadyPicked = pickedNames.has(norm);
      return !alreadyExists && !alreadyPicked;
    });

    if (available.length > 0) {
      const affordable = (userCoins < 30) ? available.filter(i => i.price <= 30) : available;
      const pick = affordable[0] || available[0];
      selected.push(pick);
      pickedNames.add(pick.name.toLowerCase().trim());
    }
  }

  if (selected.length < 3) {
    const allPoolItems = REWARD_PILLARS.flatMap(p => p.items);
    for (const item of allPoolItems) {
      if (selected.length >= 3) break;
      const norm = item.name.toLowerCase().trim();
      const alreadyExists = existingNames.some(n => n.includes(norm) || norm.includes(n));
      const alreadyPicked = pickedNames.has(norm);
      if (!alreadyExists && !alreadyPicked) {
        selected.push(item);
        pickedNames.add(norm);
      }
    }
  }

  if (selected.length === 0) {
    return REWARD_PILLARS[0].items.slice(0, 3);
  }

  return selected.slice(0, 3);
}

function renderQuestSuggestions(suggestions) {
  const container = document.getElementById('quest-suggestions-list');
  if (!container) return;
  container.innerHTML = '';

  const items = (suggestions || []).slice(0, 3);
  if (items.length === 0) {
    container.innerHTML = '<div class="text-[11px] text-slate-400 py-1 text-center italic">Đã có đủ các nhiệm vụ cân bằng!</div>';
    return;
  }

  items.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'suggestion-card quest-suggest';
    card.setAttribute('data-index', idx);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      <span class="text-sm sm:text-base shrink-0 select-none">${s.icon || '🎯'}</span>
      <span class="font-medium text-xs text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</span>
    `;

    const triggerApply = () => applyQuestSuggestion(s, card);
    card.addEventListener('click', triggerApply);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerApply();
      }
    });

    container.appendChild(card);
  });
}

function applyQuestSuggestion(s, activeCard) {
  if (typeof sfx?.playClick === 'function') sfx.playClick();
  const titleInput = document.getElementById('input-quest-title');
  const descInput = document.getElementById('input-quest-desc');
  const durationInput = document.getElementById('input-quest-duration');
  const estimateInput = document.getElementById('input-quest-estimate');

  if (titleInput) titleInput.value = s.title || '';
  if (descInput) descInput.value = s.description || '';
  if (durationInput) durationInput.value = (s.type === 'bounty' || s.targetMinutes === 0) ? '' : (s.targetMinutes || 25);
  if (estimateInput) estimateInput.value = s.rewardCoins || '';

  const radioValue = s.isRepeatable ? 'repeatable' : 'once';
  const radio = document.querySelector(`input[name="quest-repeat"][value="${radioValue}"]`);
  if (radio) radio.checked = true;

  document.querySelectorAll('#quest-suggestions-list .suggestion-card').forEach(c => {
    c.classList.remove('suggestion-card-active');
  });
  if (activeCard) {
    activeCard.classList.add('suggestion-card-active');
  }

  showToast(`Đã chọn: "${s.title}"`, 'info');
}

function renderRewardSuggestions(suggestions) {
  const container = document.getElementById('reward-suggestions-list');
  if (!container) return;
  container.innerHTML = '';

  const items = (suggestions || []).slice(0, 3);
  if (items.length === 0) {
    container.innerHTML = '<div class="text-[11px] text-slate-400 py-1 text-center italic">Đã có đủ các phần thưởng phong phú!</div>';
    return;
  }

  items.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'suggestion-card reward-suggest';
    card.setAttribute('data-index', idx);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      <span class="text-sm sm:text-base shrink-0 select-none">${s.icon || '🎁'}</span>
      <span class="font-medium text-xs text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</span>
    `;

    const triggerApply = () => applyRewardSuggestion(s, card);
    card.addEventListener('click', triggerApply);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerApply();
      }
    });

    container.appendChild(card);
  });
}

function applyRewardSuggestion(s, activeCard) {
  if (typeof sfx?.playClick === 'function') sfx.playClick();
  const nameInput = document.getElementById('input-reward-name');
  const descInput = document.getElementById('input-reward-desc');
  const estimateInput = document.getElementById('input-reward-estimate');
  const durationInput = document.getElementById('input-reward-duration');

  if (nameInput) nameInput.value = s.name || '';
  if (descInput) descInput.value = s.description || '';
  if (estimateInput) estimateInput.value = s.price || '';
  if (durationInput) durationInput.value = (s.targetMinutes && s.targetMinutes > 0) ? s.targetMinutes : '';

  document.querySelectorAll('#reward-suggestions-list .suggestion-card').forEach(c => {
    c.classList.remove('suggestion-card-active');
  });
  if (activeCard) {
    activeCard.classList.add('suggestion-card-active');
  }

  showToast(`Đã chọn: "${s.name}"`, 'info');
}

function loadQuestSuggestions() {
  const container = document.getElementById('quest-suggestions-list');
  if (!container) return;

  const existingQuests = Array.isArray(appState?.quests) ? appState.quests : [];
  const userCoins = parseInt(appState?.profile?.coins, 10) || 0;
  const userLevel = parseInt(appState?.profile?.level, 10) || 1;

  currentQuestSuggestions = getClientQuestSuggestionsFallback(existingQuests, userCoins, userLevel);
  renderQuestSuggestions(currentQuestSuggestions);
}

function loadRewardSuggestions() {
  const container = document.getElementById('reward-suggestions-list');
  if (!container) return;

  const existingRewards = Array.isArray(appState?.shopItems) ? appState.shopItems : [];
  const activeQuests = (appState?.quests || []).filter(q => q.status === 'active');
  const userCoins = parseInt(appState?.profile?.coins, 10) || 0;

  currentRewardSuggestions = getClientRewardSuggestionsFallback(existingRewards, activeQuests, userCoins);
  renderRewardSuggestions(currentRewardSuggestions);
}

window.loadQuestSuggestions = loadQuestSuggestions;
window.loadRewardSuggestions = loadRewardSuggestions;
window.applyQuestSuggestion = applyQuestSuggestion;
window.applyRewardSuggestion = applyRewardSuggestion;

async function submitQuestToAI() {
  const title = document.getElementById('input-quest-title').value.trim();
  const desc = document.getElementById('input-quest-desc').value.trim();
  const estimate = parseInt(document.getElementById('input-quest-estimate').value, 10) || 0;
  let duration = parseInt(document.getElementById('input-quest-duration')?.value, 10) || 0;
  if (duration <= 0) {
    const textDur = extractDurationFromText(`${title} ${desc}`);
    if (textDur > 0) duration = textDur;
  }
  const isRepeatable = document.querySelector('input[name="quest-repeat"]:checked')?.value === 'repeatable';

  if (!title) {
    showToast('Vui lòng nhập tên nhiệm vụ!', 'error');
    return;
  }

  document.getElementById('quest-form-step').classList.add('hidden');
  document.getElementById('quest-evaluating-step').classList.remove('hidden');

  try {
    const currentRewards = (appState.shopItems || []).slice(0, 10).map(item => ({
      name: item.name,
      price: item.price,
      tier: item.tier
    }));

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'evaluate_quest',
        payload: {
          title,
          description: desc,
          isRepeatable: Boolean(isRepeatable),
          userEstimateCoins: estimate,
          userEstimateDuration: duration,
          currentRewards,
          userCoins: appState.profile?.coins || 0
        }
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.details || err.error || 'AI Server Error');
    }

    const data = await res.json();
    const finalTitle = (data.title && typeof data.title === 'string') ? data.title.trim() : title;
    const finalDesc = (data.description !== undefined && typeof data.description === 'string') ? data.description.trim() : desc;
    const isModified = Boolean(data.isModified) || (finalTitle.toLowerCase() !== title.trim().toLowerCase());

    currentPendingVerdict = {
      title: finalTitle,
      description: finalDesc,
      isModified,
      modificationReason: data.modificationReason || (isModified ? 'AI đã điều chỉnh lại tên và khối lượng công việc để đảm bảo tính khả thi và hiệu quả tập trung.' : ''),
      type: data.type || 'focus',
      rewardCoins: data.rewardCoins || 10,
      targetMinutes: data.targetMinutes !== undefined ? Number(data.targetMinutes) : (data.type === 'bounty' ? 0 : 25),
      signature: data.signature || '',
      rank: data.rank || calculateRank(data.rewardCoins || 10),
      verdict: data.verdict || 'Nhiệm vụ hợp lý, đã được tính mức thưởng chuẩn.',
      advice: data.advice || 'Tập trung hoàn thành từng bước một.',
      icon: (data.icon && typeof data.icon === 'string') ? data.icon.trim() : '',
      isRepeatable: Boolean(isRepeatable),
      requiresProof: Boolean(data.requiresProof),
      proofGuidance: data.proofGuidance || ''
    };
    currentDebateHistory = [];

    renderVerdictStep();
  } catch (err) {
    showToast('Không thể kết nối với AI: ' + err.message, 'error');
    document.getElementById('quest-evaluating-step').classList.add('hidden');
    document.getElementById('quest-form-step').classList.remove('hidden');
  }
}

function updateVerdictDisplay() {
  if (!currentPendingVerdict) return;

  const rankBadge = document.getElementById('verdict-rank');
  if (rankBadge) {
    rankBadge.textContent = `HẠNG ${currentPendingVerdict.rank}`;
    rankBadge.className = `rank-badge-${currentPendingVerdict.rank} text-xs font-mono font-black px-2.5 py-1 rounded-lg`;
  }

  const typeBadge = document.getElementById('verdict-type-badge');
  const timeBox = document.getElementById('verdict-target-time-box');
  const minutesEl = document.getElementById('verdict-minutes');
  const lockedTimeBox = document.getElementById('verdict-locked-time-box');

  if (currentPendingVerdict.type === 'focus') {
    if (typeBadge) {
      typeBadge.textContent = '⏳ HẸN GIỜ TẬP TRUNG';
      typeBadge.className = 'text-xs px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30';
    }
    if (timeBox) timeBox.classList.remove('hidden');
    if (minutesEl) minutesEl.textContent = `${currentPendingVerdict.targetMinutes} Phút`;
    if (lockedTimeBox) lockedTimeBox.classList.remove('hidden');
  } else {
    if (typeBadge) {
      typeBadge.textContent = '⚡ KHÔNG CẦN BẤM GIỜ';
      typeBadge.className = 'text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30';
    }
    if (timeBox) timeBox.classList.add('hidden');
    if (lockedTimeBox) lockedTimeBox.classList.add('hidden');
  }

  const repeatText = document.getElementById('verdict-repeat-text');
  if (repeatText) {
    repeatText.textContent = currentPendingVerdict.isRepeatable ? '🔁 Lặp lại' : '🎯 Làm một lần';
  }

  const proofBadge = document.getElementById('verdict-proof-badge');
  const proofGuidanceBox = document.getElementById('verdict-proof-guidance-box');
  const proofGuidanceText = document.getElementById('verdict-proof-guidance-text');

  if (currentPendingVerdict.requiresProof) {
    if (proofBadge) {
      proofBadge.textContent = '📸 Cần chụp ảnh';
      proofBadge.className = 'font-bold text-xs px-2 py-0.5 rounded-lg border bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    }
    if (proofGuidanceBox && proofGuidanceText) {
      if (currentPendingVerdict.proofGuidance) {
        proofGuidanceText.textContent = currentPendingVerdict.proofGuidance;
        proofGuidanceBox.classList.remove('hidden');
      } else {
        proofGuidanceBox.classList.add('hidden');
      }
    }
  } else {
    if (proofBadge) {
      proofBadge.textContent = '⚡ Không cần chụp ảnh';
      proofBadge.className = 'font-bold text-xs px-2 py-0.5 rounded-lg border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    }
    if (proofGuidanceBox) {
      proofGuidanceBox.classList.add('hidden');
    }
  }

  const btnProofSuggest = document.getElementById('btn-suggest-proof');
  if (btnProofSuggest) {
    if (currentPendingVerdict.requiresProof) {
      btnProofSuggest.textContent = '📸 Xin miễn chụp ảnh';
      btnProofSuggest.setAttribute('data-suggest', 'Công việc này mình làm trên điện thoại hoặc không tiện chụp ảnh thực tế, bạn giúp mình miễn chụp ảnh được không?');
    } else {
      btnProofSuggest.textContent = '📸 Thêm yêu cầu chụp ảnh';
      btnProofSuggest.setAttribute('data-suggest', 'Mình muốn thêm yêu cầu chụp ảnh bằng chứng khi hoàn thành để tự rèn luyện kỷ luật hơn, bạn cập nhật giúp mình nhé!');
    }
  }

  const verdictCoins = document.getElementById('verdict-coins');
  if (verdictCoins) verdictCoins.innerHTML = `${COIN_ICON_HTML} ${currentPendingVerdict.rewardCoins} Vàng`;

  // AI-locked display card
  const lockedIcon = document.getElementById('verdict-locked-icon');
  if (lockedIcon) lockedIcon.textContent = getQuestIcon(currentPendingVerdict);

  const lockedTitle = document.getElementById('verdict-locked-title');
  if (lockedTitle) lockedTitle.textContent = currentPendingVerdict.title;

  const lockedDesc = document.getElementById('verdict-locked-desc');
  const lockedDescContainer = document.getElementById('verdict-locked-desc-container');
  if (lockedDesc && lockedDescContainer) {
    if (currentPendingVerdict.description) {
      lockedDesc.textContent = currentPendingVerdict.description;
      lockedDescContainer.classList.remove('hidden');
    } else {
      lockedDescContainer.classList.add('hidden');
    }
  }

  const lockedCoins = document.getElementById('verdict-locked-coins');
  if (lockedCoins) lockedCoins.innerHTML = `${COIN_ICON_HTML} ${currentPendingVerdict.rewardCoins} Vàng`;

  const lockedMinutes = document.getElementById('verdict-locked-minutes');
  if (lockedMinutes) lockedMinutes.textContent = `${currentPendingVerdict.targetMinutes} Phút`;

  const speechEl = document.getElementById('verdict-speech');
  if (speechEl && currentPendingVerdict.verdict) {
    speechEl.textContent = `"${currentPendingVerdict.verdict}"`;
  }
}

function renderVerdictStep() {
  document.getElementById('quest-evaluating-step').classList.add('hidden');
  document.getElementById('quest-verdict-step').classList.remove('hidden');

  updateVerdictDisplay();

  document.getElementById('verdict-speech').textContent = `"${currentPendingVerdict.verdict}"`;
  document.getElementById('verdict-advice').textContent = currentPendingVerdict.advice;

  // AI Modification Notice
  const modNotice = document.getElementById('verdict-modified-notice');
  const modReason = document.getElementById('verdict-modified-reason');
  if (modNotice && modReason) {
    if (currentPendingVerdict.isModified && currentPendingVerdict.modificationReason) {
      modNotice.classList.remove('hidden');
      modReason.textContent = currentPendingVerdict.modificationReason;
    } else {
      modNotice.classList.add('hidden');
    }
  }

  document.getElementById('debate-container').classList.add('hidden');
  document.getElementById('debate-chat-logs').innerHTML = '';
}

function openQuestRenegotiateModal(questId) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return;

  if (quest.status === 'completed' && !quest.isRepeatable) {
    showToast('Nhiệm vụ đã hoàn thành không thể thương lượng lại.', 'info');
    return;
  }

  if (activeFocusQuest && activeFocusQuest.id === quest.id && isFocusRunning) {
    showToast('Vui lòng tạm dừng phiên tập trung trước khi thương lượng lại nhiệm vụ này.', 'info');
    return;
  }

  currentEditingQuestId = quest.id;
  currentPendingVerdict = {
    title: quest.title,
    description: quest.description || '',
    type: quest.type || 'focus',
    rank: quest.rank || calculateRank(quest.rewardCoins || 10),
    rewardCoins: quest.rewardCoins || 10,
    targetMinutes: quest.targetMinutes !== undefined ? Number(quest.targetMinutes) : (quest.type === 'bounty' ? 0 : 25),
    signature: quest.signature || '',
    advice: quest.advice || 'Tập trung hoàn thành từng bước một.',
    icon: quest.icon || getQuestIcon(quest),
    verdict: quest.verdict || 'Nhiệm vụ hợp lý, đã được tính mức thưởng chuẩn.',
    isRepeatable: Boolean(quest.isRepeatable),
    requiresProof: Boolean(quest.requiresProof),
    proofGuidance: quest.proofGuidance || ''
  };
  currentDebateHistory = [];

  const titleEl = document.getElementById('modal-quest-title');
  const subEl = document.getElementById('modal-quest-subtitle');
  if (titleEl) titleEl.textContent = 'THƯƠNG LƯỢNG LẠI NHIỆM VỤ';
  if (subEl) subEl.textContent = 'Trực tiếp trao đổi với AI để điều chỉnh độ khó, thời gian hoặc phần thưởng';

  const acceptBtn = document.getElementById('btn-accept-verdict');
  if (acceptBtn) acceptBtn.textContent = '✓ Cập Nhật Nhiệm Vụ';

  document.getElementById('quest-form-step').classList.add('hidden');
  document.getElementById('quest-evaluating-step').classList.add('hidden');
  document.getElementById('quest-verdict-step').classList.remove('hidden');

  updateVerdictDisplay();
  document.getElementById('verdict-speech').textContent = `"${currentPendingVerdict.verdict}"`;
  document.getElementById('verdict-advice').textContent = currentPendingVerdict.advice;

  const modNotice = document.getElementById('verdict-modified-notice');
  if (modNotice) modNotice.classList.add('hidden');

  const debateBox = document.getElementById('debate-container');
  if (debateBox) debateBox.classList.remove('hidden');

  initQuestDebateChat(true);

  const argInput = document.getElementById('input-debate-arg');
  if (argInput) argInput.value = '';

  openModal('modal-quest');
  if (argInput) setTimeout(() => argInput.focus(), 150);
}

async function acceptVerdictAndCreateQuest() {
  if (!currentPendingVerdict) return;

  const isEditing = Boolean(currentEditingQuestId);
  const questTitle = currentPendingVerdict.title || 'Nhiệm vụ mới';
  const questCoins = currentPendingVerdict.rewardCoins || 10;
  const questTime = currentPendingVerdict.type === 'focus' ? `${currentPendingVerdict.targetMinutes || 25}p tập trung` : 'Không cần bấm giờ';
  const repeatText = currentPendingVerdict.isRepeatable ? '🔁 Lặp lại' : '🎯 Làm một lần';
  const proofText = currentPendingVerdict.requiresProof ? '📸 Cần chụp ảnh' : '⚡ Không cần chụp ảnh';

  const ok = await confirmAction({
    title: isEditing ? 'Xác Nhận Cập Nhật Nhiệm Vụ?' : 'Xác Nhận Nhận Nhiệm Vụ?',
    message: isEditing
      ? `Bạn có chắc muốn lưu các thay đổi cho nhiệm vụ "${questTitle}"?`
      : `Bạn có chắc chắn muốn nhận nhiệm vụ "${questTitle}" vào danh sách?`,
    detail: `💰 Thưởng: ${questCoins} Vàng • ⏱️ ${questTime}\n📌 ${repeatText} • ${proofText}`,
    confirmText: isEditing ? 'Cập Nhật' : 'Nhận Nhiệm Vụ',
    cancelText: 'Xem Lại',
    icon: '⚔️',
    btnColor: 'amber'
  });

  if (!ok) return;

  if (currentEditingQuestId) {
    const targetQuest = appState.quests.find(q => q.id === currentEditingQuestId);
    if (targetQuest) {
      targetQuest.title = currentPendingVerdict.title;
      targetQuest.description = currentPendingVerdict.description || '';
      targetQuest.type = currentPendingVerdict.type;
      targetQuest.rank = currentPendingVerdict.rank || calculateRank(currentPendingVerdict.rewardCoins);
      targetQuest.rewardCoins = currentPendingVerdict.rewardCoins;
      targetQuest.targetMinutes = currentPendingVerdict.targetMinutes !== undefined ? Number(currentPendingVerdict.targetMinutes) : 0;
      targetQuest.signature = currentPendingVerdict.signature || targetQuest.signature || '';
      targetQuest.icon = currentPendingVerdict.icon || targetQuest.icon || getQuestIcon(targetQuest);
      targetQuest.advice = currentPendingVerdict.advice;
      targetQuest.verdict = currentPendingVerdict.verdict;
      targetQuest.isRepeatable = Boolean(currentPendingVerdict.isRepeatable);
      targetQuest.requiresProof = Boolean(currentPendingVerdict.requiresProof);
      targetQuest.proofGuidance = currentPendingVerdict.proofGuidance || '';
      delete targetQuest.focusTimerCompleted;
      delete targetQuest._proofVerified;

      if (activeFocusQuest && activeFocusQuest.id === targetQuest.id) {
        activeFocusQuest.title = targetQuest.title;
        activeFocusQuest.targetMinutes = targetQuest.targetMinutes;
        activeFocusQuest.rewardCoins = targetQuest.rewardCoins;
        renderActiveFocusBanner();
      }

      sfx.playClick();
      showToast(`Đã cập nhật nhiệm vụ [Hạng ${targetQuest.rank}]: "${targetQuest.title}"!`, 'success');
      closeModal('modal-quest');
      currentEditingQuestId = null;
      currentPendingVerdict = null;
      renderQuests();
      triggerSave(true);
      return;
    }
  }

  const newQuest = {
    id: 'q_' + Date.now(),
    title: currentPendingVerdict.title,
    description: currentPendingVerdict.description || '',
    type: currentPendingVerdict.type,
    rank: currentPendingVerdict.rank || calculateRank(currentPendingVerdict.rewardCoins),
    rewardCoins: currentPendingVerdict.rewardCoins,
    targetMinutes: currentPendingVerdict.targetMinutes !== undefined ? Number(currentPendingVerdict.targetMinutes) : 0,
    signature: currentPendingVerdict.signature || '',
    icon: currentPendingVerdict.icon || getQuestIcon(currentPendingVerdict),
    advice: currentPendingVerdict.advice,
    verdict: currentPendingVerdict.verdict,
    isRepeatable: Boolean(currentPendingVerdict.isRepeatable),
    requiresProof: Boolean(currentPendingVerdict.requiresProof),
    proofGuidance: currentPendingVerdict.proofGuidance || '',
    completedCount: 0,
    status: 'active',
    createdAt: Date.now()
  };

  appState.quests.unshift(newQuest);
  sfx.playClick();
  showToast(`Đã thêm nhiệm vụ [Hạng ${newQuest.rank}]: "${newQuest.title}"!`, 'success');
  closeModal('modal-quest');
  currentEditingQuestId = null;
  currentPendingVerdict = null;
  renderQuests();
  triggerSave(true);
}

// =============================================================================
// AI NEGOTIATION CHAT UI HELPERS & STATE
// =============================================================================
let isDebatingQuest = false;
let isDebatingReward = false;

function renderUserMiniAvatar() {
  const avatar = appState.profile?.avatar || '👤';
  if (isAvatarUrl(avatar)) {
    return `<img src="${escapeHtml(avatar)}" referrerpolicy="no-referrer" alt="Avatar" class="w-full h-full rounded-full object-cover">`;
  }
  return escapeHtml(avatar);
}

function appendUserChatBubble(container, text) {
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'flex justify-end items-end gap-2 message-fade-in';
  row.innerHTML = `
    <div class="max-w-[88%] sm:max-w-[90%] bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-medium px-4 py-2.5 sm:py-3 rounded-2xl rounded-tr-xs text-xs sm:text-[13px] shadow-sm whitespace-pre-wrap leading-relaxed">
      ${escapeHtml(text)}
    </div>
    <div class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs overflow-hidden select-none mb-0.5">
      ${renderUserMiniAvatar()}
    </div>
  `;
  container.appendChild(row);
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function createDebateLoadingBubble(modeOrText = 'quest') {
  const row = document.createElement('div');
  row.className = 'flex justify-start items-start gap-2 message-fade-in mb-3';

  let mode = 'quest';
  let initialText = '';
  if (modeOrText === 'reward' || modeOrText === 'loan' || modeOrText === 'quest') {
    mode = modeOrText;
  } else if (typeof modeOrText === 'string') {
    initialText = modeOrText;
    if (/phần thưởng|quà/i.test(modeOrText)) mode = 'reward';
    else if (/khoản vay|ngân hàng|lãi/i.test(modeOrText)) mode = 'loan';
  }

  const stepsConfig = {
    quest: [
      { icon: '🔍', text: 'Đang tra cứu hồ sơ cá nhân & dữ liệu hiệp sĩ...' },
      { icon: '⏱️', text: 'Đang phân tích thời gian thực hiện & mức Vàng đề xuất...' },
      { icon: '⚖️', text: 'Đang đối chiếu nỗ lực thực tế và cân bằng hệ thống...' },
      { icon: '⚡', text: 'Đang chọn công cụ cập nhật thông số nhiệm vụ...' },
      { icon: '🛡️', text: 'Đang đóng dấu xác thực bảo mật & hoàn tất phản hồi...' }
    ],
    reward: [
      { icon: '🔍', text: 'Đang kiểm tra số Vàng tích lũy & kho phần thưởng...' },
      { icon: '🎁', text: 'Đang xem xét giá trị quà & thời gian giải trí...' },
      { icon: '⚖️', text: 'Đang cân đối động lực để bạn hoàn thành nhiệm vụ...' },
      { icon: '⚡', text: 'Đang gọi công cụ cập nhật giá & phân hạng quà...' },
      { icon: '🛡️', text: 'Đang ký duyệt thông số và hoàn tất phản hồi...' }
    ],
    loan: [
      { icon: '🔍', text: 'Đang tra cứu dư nợ, chuỗi chăm chỉ & điểm tín dụng...' },
      { icon: '🏦', text: 'Đang kiểm tra thanh khoản kho bạc & trần lãi suất...' },
      { icon: '📊', text: 'Đang tính toán hạn mức vay & tỷ lệ trích nợ an toàn...' },
      { icon: '⚡', text: 'Đang gọi công cụ thiết lập gói vay ưu đãi...' },
      { icon: '🛡️', text: 'Đang đóng dấu hợp đồng tín dụng & hoàn tất lời khuyên...' }
    ]
  };

  const steps = stepsConfig[mode] || stepsConfig.quest;
  if (initialText) {
    steps[0] = { icon: '🔍', text: initialText };
  }
  let currentStepIdx = 0;

  row.innerHTML = `
    <div class="w-7 h-7 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-xs select-none">🤖</div>
    <div class="max-w-[88%] sm:max-w-[90%] bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-slate-800 rounded-2xl rounded-tl-xs p-3 sm:p-3.5 text-xs sm:text-[13px] text-amber-900 dark:text-amber-200 shadow-sm flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2 border-b border-amber-200/50 dark:border-slate-800 pb-1.5 text-[10px] sm:text-[11px] font-semibold text-amber-700 dark:text-amber-400 select-none">
        <span class="flex items-center gap-1.5">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span class="tracking-wide">AI Đang Xử Lý Thời Gian Thực</span>
        </span>
        <span class="step-badge font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-slate-800 text-amber-800 dark:text-amber-300">
          Bước 1/${steps.length}
        </span>
      </div>

      <div class="flex items-center gap-2.5 py-0.5 min-h-[28px]">
        <span class="step-icon text-base shrink-0 animate-pulse">${steps[0].icon}</span>
        <span class="step-text font-medium text-slate-800 dark:text-slate-100 transition-all duration-300 leading-snug">
          ${steps[0].text}
        </span>
      </div>

      <div class="w-full bg-amber-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
        <div class="step-progress bg-gradient-to-r from-amber-500 to-amber-600 h-1 rounded-full transition-all duration-500" style="width: ${(1 / steps.length) * 100}%"></div>
      </div>
    </div>
  `;

  const badgeEl = row.querySelector('.step-badge');
  const iconEl = row.querySelector('.step-icon');
  const textEl = row.querySelector('.step-text');
  const progressEl = row.querySelector('.step-progress');

  const intervalId = setInterval(() => {
    if (currentStepIdx < steps.length - 1) {
      currentStepIdx++;
      const s = steps[currentStepIdx];
      if (badgeEl) badgeEl.textContent = `Bước ${currentStepIdx + 1}/${steps.length}`;
      if (iconEl) iconEl.textContent = s.icon;
      if (textEl) {
        textEl.style.opacity = '0';
        setTimeout(() => {
          textEl.textContent = s.text;
          textEl.style.opacity = '1';
        }, 150);
      }
      if (progressEl) {
        const pct = Math.min(95, Math.round(((currentStepIdx + 1) / steps.length) * 100));
        progressEl.style.width = `${pct}%`;
      }
    }
  }, 2200);

  // Nhận sự kiện thời gian thực từ luồng Server-Sent Events
  row.updateStep = (stepData) => {
    if (!stepData) return;
    if (intervalId) clearInterval(intervalId); // Tắt bộ đếm giả lập khi đã có sự kiện thật
    if (stepData.icon && iconEl) iconEl.textContent = stepData.icon;
    if (stepData.text && textEl) {
      textEl.style.opacity = '0';
      setTimeout(() => {
        textEl.textContent = stepData.text;
        textEl.style.opacity = '1';
      }, 120);
    }
    if (badgeEl && stepData.step) {
      badgeEl.textContent = `Bước ${stepData.step}/${stepData.totalSteps || steps.length}`;
    }
    if (progressEl && stepData.pct !== undefined) {
      progressEl.style.width = `${Math.min(100, Math.max(5, stepData.pct))}%`;
    }
  };

  row.cleanup = () => {
    if (intervalId) clearInterval(intervalId);
  };

  return row;
}

// Bộ đọc luồng Server-Sent Events (SSE) thời gian thực cho thương lượng AI
async function fetchDebateStream(url, options, onStep) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errJson = null;
    try { errJson = await res.json(); } catch (_) {}
    throw new Error(errJson?.error || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    // Tương thích ngược nếu server trả JSON tĩnh thông thường
    return await res.json();
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalResult = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop();

    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split('\n');
      let event = 'message';
      let dataStr = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
      }
      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          if (event === 'step') {
            if (typeof onStep === 'function') onStep(parsed);
          } else if (event === 'result') {
            finalResult = parsed;
          } else if (event === 'error') {
            throw new Error(parsed?.error || 'Lỗi xử lý luồng AI');
          }
        } catch (e) {
          if (event === 'error') throw e;
        }
      }
    }
  }

  if (!finalResult) {
    throw new Error('Không nhận được dữ liệu kết quả từ luồng streaming.');
  }
  return finalResult;
}

function parseDebateOptionsFromText(text, type = 'reward') {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  const rawOptions = [];
  let current = null;

  const keywordRegex = /^\s*(?:[-*•]|\d+[.)])?\s*(Phương\s*án|Phương\s*thức|Cách|Gợi\s*ý|Lựa\s*chọn|Giải\s*pháp|Hướng|Option|Opt|PA)\s*([1-9]|A|B|C|Một|Hai|Ba)[:.-]?\s*(.*)$/i;
  const numberRegex = /^\s*[-*•]?\s*([1-9])[:.)]\s+(.*)$/i;

  for (const line of lines) {
    const kwMatch = line.match(keywordRegex);
    const numMatch = !kwMatch ? line.match(numberRegex) : null;
    const match = kwMatch || numMatch;

    if (match) {
      if (current) rawOptions.push(current);
      const prefix = kwMatch ? kwMatch[1].trim() : 'Phương án';
      const id = kwMatch ? kwMatch[2] : numMatch[1];
      const rest = (kwMatch ? kwMatch[3] : numMatch[2]).trim();
      current = {
        id,
        title: `${prefix} ${id}`,
        text: rest
      };
    } else if (!line.trim()) {
      if (current) {
        rawOptions.push(current);
        current = null;
      }
    } else if (current && !line.match(/^\s*[-*•]/)) {
      current.text += ' ' + line.trim();
    } else if (current && line.match(/^\s*[-*•]/)) {
      rawOptions.push(current);
      current = null;
    }
  }
  if (current) rawOptions.push(current);

  return rawOptions.map(opt => {
    let mins = 0;
    const isBounty = /(?:không\s*(?:cần\s*)?bấm\s*giờ|hoàn\s*thành\s*ngay|bounty)/i.test(opt.text);
    const mentionsProofReq = /(?:cần|yêu\s*cầu|chụp)\s*ảnh/i.test(opt.text);
    const mentionsProofWaive = /(?:miễn|không\s*cần|bỏ)\s*ảnh/i.test(opt.text);
    if (type === 'reward' && /(?:nhiệm\s*vụ|làm\s*(?:thêm|nốt)).*?\d+\s*phút/i.test(opt.text)) {
      const rewardDurMatch = opt.text.match(/(?:đổi|thời\s*(?:lượng|gian)|xem|chơi|thành).*?(\d+)\s*phút/i);
      if (rewardDurMatch) {
        mins = parseInt(rewardDurMatch[1], 10);
      } else if (/nửa\s*(?:tiếng|giờ)/i.test(opt.text)) {
        mins = 30;
      }
    } else {
      mins = extractDurationFromText(opt.text);
    }

    let gold = undefined;
    let loanRate = undefined;
    let loanDeduct = undefined;
    let loanLimit = undefined;

    if (type === 'loan') {
      const loanGoldMatch = opt.text.match(/(?:vay|mức\s*vay|khoản\s*vay|số\s*vàng(?:\s*vay)?|còn)[:\s]*(\d+)\s*vàng/i) || opt.text.match(/(\d+)\s*vàng/i);
      if (loanGoldMatch) gold = parseInt(loanGoldMatch[1], 10);

      const rateMatch = opt.text.match(/(?:lãi\s*suất|lãi|phí)[:\s]*(\d+(?:[.,]\d+)?)\s*%/i) || opt.text.match(/(\d+(?:[.,]\d+)?)\s*%(?:\/ngày)?/i);
      if (rateMatch) loanRate = parseFloat(rateMatch[1].replace(',', '.')) / 100;

      const deductMatch = opt.text.match(/(?:trích|trích\s*nợ|tỷ\s*lệ)[:\s]*(\d+)\s*%/i);
      if (deductMatch) loanDeduct = parseInt(deductMatch[1], 10) / 100;

      const limitMatch = opt.text.match(/(?:hạn\s*mức(?:\s*(?:lên|mới))?|cấp\s*hạn\s*mức)[:\s]*(\d+)\s*vàng/i);
      if (limitMatch) loanLimit = parseInt(limitMatch[1], 10);
    } else {
      const explicitPriceMatch = opt.text.match(/(?:mức\s*giá|giá(?:\s*vàng)?|giảm\s*(?:còn|xuống)|đổi\s*(?:ngay\s*)?(?:với\s*)?(?:mức\s*)?giá)[:\s]*(\d+)\s*vàng/i);
      if (explicitPriceMatch) {
        gold = parseInt(explicitPriceMatch[1], 10);
      } else if (type === 'quest') {
        const questCoinMatch = opt.text.match(/(?:thưởng|mức\s*thưởng|nâng\s*lên|tăng\s*lên|giảm\s*xuống)[:\s]*(\d+)\s*vàng/i) || opt.text.match(/(\d+)\s*vàng/i);
        if (questCoinMatch) gold = parseInt(questCoinMatch[1], 10);
      } else if (!/(?:tích\s*lũy|có\s*sẵn|thêm\s*\d+\s*vàng|làm\s*nốt|làm\s*thêm)/i.test(opt.text)) {
        const genericGoldMatch = opt.text.match(/(\d+)\s*vàng/i);
        if (genericGoldMatch) gold = parseInt(genericGoldMatch[1], 10);
      }
    }

    let newName = undefined;
    const nameMatch = opt.text.match(/(?:thành|tên\s*(?:mới\s*)?(?:là)?)\s*["“]?([^"”\n,.]+?)["”]?\s*(?:nha|nhé|nè|\.|$)/i);
    if (nameMatch) {
      const candidate = nameMatch[1].trim();
      if (candidate.length >= 3 && !/^\s*\d+\s*(?:vàng|phút|tiếng|giờ|min|p)\s*$/i.test(candidate) && !/^\s*mức\s*giá/i.test(candidate)) {
        newName = candidate;
      }
    }

    let label = opt.title;
    const details = [];
    if (type === 'loan') {
      if (gold !== undefined) details.push(`Vay ${gold} Vàng`);
      if (loanRate !== undefined) details.push(`Lãi ${(loanRate * 100).toFixed(1)}%/ngày`);
      if (loanDeduct !== undefined) details.push(`Trích ${(loanDeduct * 100).toFixed(0)}%`);
      if (loanLimit !== undefined) details.push(`Hạn mức ${loanLimit} Vàng`);
    } else {
      if (mins > 0) {
        details.push(`${mins} phút`);
      } else if (isBounty) {
        details.push('Không cần bấm giờ');
      }
      if (gold !== undefined) details.push(`${gold} Vàng`);
      if (type === 'quest') {
        if (mentionsProofReq) details.push('Cần ảnh');
        else if (mentionsProofWaive) details.push('Miễn ảnh');
      }
    }
    if (details.length > 0) {
      label += ` (${details.join(' • ')})`;
    } else if (opt.text.length < 40) {
      label += `: ${opt.text}`;
    }

    let argument = `Chốt ${opt.title.toLowerCase()}`;
    if (details.length > 0) {
      argument += `: ${details.join(', ')}`;
    }

    const payload = {};
    if (type === 'loan') {
      if (gold !== undefined) payload.newAmount = gold;
      if (loanRate !== undefined) payload.newBorrowRate = loanRate;
      if (loanDeduct !== undefined) payload.newAutoDeductPercent = loanDeduct;
      if (loanLimit !== undefined) payload.newCreditLimit = loanLimit;
    } else if (type === 'reward') {
      if (gold !== undefined) payload.newPrice = gold;
      if (mins > 0) payload.newTargetMinutes = mins;
      else if (isBounty) payload.newTargetMinutes = 0;
      if (gold !== undefined && gold < 30) payload.newTier = 'common';
      if (newName) payload.newName = newName;
    } else {
      if (gold !== undefined) payload.newRewardCoins = gold;
      if (mins > 0) {
        payload.newTargetMinutes = mins;
        payload.newType = 'focus';
      } else if (isBounty) {
        payload.newTargetMinutes = 0;
        payload.newType = 'bounty';
      }
      if (mentionsProofReq) payload.newRequiresProof = true;
      else if (mentionsProofWaive) payload.newRequiresProof = false;
      if (newName) payload.newTitle = newName;
    }

    return {
      id: opt.id,
      label,
      argument,
      text: opt.text,
      ...payload
    };
  });
}

function appendAiChatBubble(container, {
  reply,
  accepted,
  diffTags = [],
  botName = 'Trọng Tài AI',
  botIcon = '🤖',
  options = [],
  onSelectOption = null,
  mode = 'quest',
  toolsExecuted = []
}) {
  if (!container) return;

  // Unpack if reply is a JSON string (failsafe in case backend or raw model returned json)
  if (typeof reply === 'string' && (reply.trim().startsWith('{') || reply.trim().startsWith('```json'))) {
    try {
      let raw = reply.trim();
      if (raw.startsWith('```json')) raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      else if (raw.startsWith('```')) raw = raw.replace(/^```\s*/i, '').replace(/```\s*$/, '');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.reply === 'string') {
        reply = parsed.reply;
        if ((!options || options.length === 0) && Array.isArray(parsed.options)) {
          options = parsed.options;
        }
      }
    } catch (_) {}
  }

  const row = document.createElement('div');
  row.className = 'flex justify-start items-start gap-2 message-fade-in';

  const statusBadge = accepted
    ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 shrink-0">
        <span>✓</span><span>ĐÃ ĐỒNG Ý & CẬP NHẬT</span>
      </span>`
    : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-slate-700 shrink-0">
        <span>⚖️</span><span>GIỮ NGUYÊN THÔNG SỐ</span>
      </span>`;

  let diffTagsHtml = '';
  if (accepted && diffTags.length > 0) {
    diffTagsHtml = `
      <div class="mt-2 pt-2 border-t border-emerald-200/80 dark:border-emerald-900/60 flex flex-wrap gap-1.5">
        ${diffTags.map(tag => `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-400/50">${escapeHtml(tag)}</span>`).join('')}
      </div>
    `;
  }

  let toolsHtml = '';
  if (Array.isArray(toolsExecuted) && toolsExecuted.length > 0) {
    const executedPills = toolsExecuted.map(t => {
      if (t === 'get_my_user_data') return '🔍 Đã đọc hồ sơ';
      if (t === 'get_bank_market_status') return '🏦 Kiểm tra kho bạc';
      if (t === 'update_quest_parameters') return '⚡ Cập nhật nhiệm vụ';
      if (t === 'update_reward_parameters') return '🎁 Chốt giá quà';
      if (t === 'update_loan_terms') return '📜 Chốt khoản vay';
      if (t === 'suggest_negotiation_options') return '💡 Gợi ý phương án';
      return null;
    }).filter(Boolean);
    if (executedPills.length > 0) {
      toolsHtml = `
        <div class="mt-1 flex flex-wrap items-center gap-1 opacity-75 text-[10px] text-slate-500 dark:text-slate-400">
          <span class="font-medium">🛠️ AI Tools:</span>
          ${executedPills.map(p => `<span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">${escapeHtml(p)}</span>`).join('')}
        </div>
      `;
    }
  }

  // Parse options if not provided directly
  const effectiveOptions = (Array.isArray(options) && options.length > 0)
    ? options
    : parseDebateOptionsFromText(reply, mode);

  let optionsHtml = '';
  if (effectiveOptions && effectiveOptions.length > 0) {
    optionsHtml = `
      <div class="mt-2.5 pt-2.5 border-t border-amber-200/70 dark:border-slate-800/80 space-y-1.5 debate-options-wrapper">
        <div class="text-[11px] font-bold text-amber-700 dark:text-amber-400 tracking-wide flex items-center gap-1.5">
          <span>💡</span><span>Chọn phương án đề xuất:</span>
        </div>
        <div class="flex flex-col sm:flex-row flex-wrap gap-1.5 debate-options-list">
          ${effectiveOptions.map((opt, idx) => `
            <button type="button" data-option-idx="${idx}" class="debate-option-btn group text-left px-3 py-2 rounded-xl text-xs font-semibold bg-white/90 dark:bg-slate-800/90 hover:bg-amber-100 dark:hover:bg-amber-950/60 active:scale-95 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 transition-all flex items-center gap-2 shadow-xs cursor-pointer">
              <span class="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center text-[11px] font-black shrink-0 group-hover:scale-110 transition-transform">👉</span>
              <span class="font-medium">${escapeHtml(opt.label || `Phương án ${opt.id || idx + 1}`)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  const bubbleThemeClass = accepted
    ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-800/60 text-slate-800 dark:text-slate-200'
    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200';

  row.innerHTML = `
    <div class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">${botIcon}</div>
    <div class="max-w-[90%] sm:max-w-[92%] ${bubbleThemeClass} border rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-xs sm:text-[13px] shadow-xs leading-relaxed space-y-2">
      <div class="flex items-center justify-between gap-2">
        <span class="font-bold text-xs sm:text-[13px] text-amber-600 dark:text-amber-400">${botName}</span>
        ${statusBadge}
      </div>
      <div class="text-xs sm:text-[13px] leading-relaxed break-words">${renderMarkdown(reply)}</div>
      ${toolsHtml}
      ${diffTagsHtml}
      ${optionsHtml}
    </div>
  `;
  container.appendChild(row);

  // Attach click listener to option buttons
  const optionButtons = row.querySelectorAll('.debate-option-btn');
  optionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-option-idx'), 10);
      const selected = effectiveOptions[idx];
      if (!selected) return;

      optionButtons.forEach(b => {
        b.disabled = true;
        b.classList.add('opacity-50', 'pointer-events-none');
      });
      btn.classList.remove('opacity-50');
      btn.classList.add('ring-2', 'ring-amber-500', 'bg-amber-100', 'dark:bg-amber-900/40');

      if (typeof onSelectOption === 'function') {
        onSelectOption(selected);
      }
    });
  });

  // Cuộn dừng ở ĐẦU tin nhắn của AI thay vì cuối tin nhắn để người đọc bắt đầu ngay từ dòng đầu
  requestAnimationFrame(() => {
    setTimeout(() => {
      const containerRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const targetTop = Math.max(0, rowRect.top - containerRect.top + container.scrollTop - 8);
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
    }, 40);
  });
}

function initQuestDebateChat(forceReset = false) {
  const chatLogs = document.getElementById('debate-chat-logs');
  if (!chatLogs) return;
  if (!forceReset && chatLogs.children.length > 0) return;

  const quest = currentPendingVerdict || {};
  const modeText = quest.type === 'focus' ? `${quest.targetMinutes || 25}p tập trung` : 'không cần bấm giờ';
  const proofText = quest.requiresProof ? ' • 📸 Yêu cầu chụp ảnh' : ' • ⚡ Không cần ảnh';
  const isRenegotiate = Boolean(currentEditingQuestId);

  const btnProofSuggest = document.getElementById('btn-suggest-proof');
  if (btnProofSuggest) {
    if (quest.requiresProof) {
      btnProofSuggest.textContent = '📸 Xin miễn chụp ảnh';
      btnProofSuggest.setAttribute('data-suggest', 'Công việc này mình làm trên điện thoại hoặc không tiện chụp ảnh thực tế, bạn giúp mình miễn chụp ảnh được không?');
    } else {
      btnProofSuggest.textContent = '📸 Thêm yêu cầu chụp ảnh';
      btnProofSuggest.setAttribute('data-suggest', 'Mình muốn thêm yêu cầu chụp ảnh bằng chứng khi hoàn thành để tự rèn luyện kỷ luật hơn, bạn cập nhật giúp mình nhé!');
    }
  }

  chatLogs.innerHTML = `
    <div class="flex justify-start items-start gap-2 message-fade-in">
      <div class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">🤖</div>
      <div class="max-w-[90%] sm:max-w-[92%] bg-amber-50/80 dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-xs sm:text-[13px] text-amber-950 dark:text-amber-200/90 shadow-xs leading-relaxed space-y-2">
        <div class="font-bold text-xs sm:text-[13px] text-amber-600 dark:text-amber-400">Trọng Tài AI:</div>
        <div>
          ${isRenegotiate ? 'Bạn đang thương lượng lại nhiệm vụ' : 'Bạn đang xem xét nhiệm vụ'} <strong>"${escapeHtml(quest.title || 'Nhiệm vụ')}"</strong> (${quest.rewardCoins || 10} Vàng, ${modeText}${proofText}).
        </div>
        <div class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
          💡 Chọn một gợi ý nhanh bên dưới hoặc nhập đề xuất để mình điều chỉnh thông số cho phù hợp nhé!
        </div>
      </div>
    </div>
  `;
  chatLogs.scrollTo({ top: 0, behavior: 'smooth' });
}

function initRewardDebateChat(forceReset = false) {
  const chatLogs = document.getElementById('reward-debate-chat-logs');
  if (!chatLogs) return;
  if (!forceReset && chatLogs.children.length > 0) return;

  const reward = currentPendingReward || {};
  const isRenegotiate = Boolean(currentEditingRewardId);

  chatLogs.innerHTML = `
    <div class="flex justify-start items-start gap-2 message-fade-in">
      <div class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">🎁</div>
      <div class="max-w-[90%] sm:max-w-[92%] bg-amber-50/80 dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-xs sm:text-[13px] text-amber-950 dark:text-amber-200/90 shadow-xs leading-relaxed space-y-2">
        <div class="font-bold text-xs sm:text-[13px] text-amber-600 dark:text-amber-400">Trợ Lý Cửa Hàng AI:</div>
        <div>
          ${isRenegotiate ? 'Bạn đang thương lượng lại phần thưởng' : 'Bạn đang xem xét phần thưởng'} <strong>"${escapeHtml(reward.name || 'Phần thưởng')}"</strong> (Giá: ${reward.price || 30} Vàng, Hạng: ${(reward.tier || 'rare').toUpperCase()}).
        </div>
        <div class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
          💡 Chọn một gợi ý nhanh bên dưới hoặc nhập đề xuất để mình điều chỉnh giá hoặc tên phần thưởng nhé!
        </div>
      </div>
    </div>
  `;
  chatLogs.scrollTo({ top: 0, behavior: 'smooth' });
}

async function sendDebateArgument(customArg = null, selectedOption = null) {
  if (isDebatingQuest) return;

  const argInput = document.getElementById('input-debate-arg');
  const argument = (typeof customArg === 'string' && customArg.trim())
    ? customArg.trim()
    : (argInput ? argInput.value.trim() : '');
  if (!argument) return;

  const chatLogs = document.getElementById('debate-chat-logs');
  const btnSend = document.getElementById('btn-send-debate');

  isDebatingQuest = true;
  if (argInput) {
    argInput.disabled = true;
    argInput.value = '';
  }
  if (btnSend) {
    btnSend.disabled = true;
    btnSend.innerHTML = `<span class="inline-flex gap-1 items-center"><span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-bounce" style="animation-delay: 0ms"></span><span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-bounce" style="animation-delay: 150ms"></span><span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-bounce" style="animation-delay: 300ms"></span></span>`;
  }

  appendUserChatBubble(chatLogs, argument);

  const loadingBubble = createDebateLoadingBubble('quest');
  chatLogs.appendChild(loadingBubble);
  chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });

  try {
    const currentRewards = (appState.shopItems || []).slice(0, 10).map(item => ({
      name: item.name,
      price: item.price,
      tier: item.tier
    }));

    const prevVerdict = { ...currentPendingVerdict };

    const data = await fetchDebateStream('/api/ai', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        action: 'debate_quest',
        payload: {
          quest: currentPendingVerdict,
          argument,
          history: currentDebateHistory,
          currentRewards,
          userCoins: appState.profile?.coins || 0,
          selectedOption,
          stream: true
        }
      })
    }, (stepData) => {
      if (loadingBubble && loadingBubble.updateStep) loadingBubble.updateStep(stepData);
    });

    if (loadingBubble && loadingBubble.cleanup) loadingBubble.cleanup();
    loadingBubble.remove();

    if (data && typeof data.reply === 'string' && (data.reply.trim().startsWith('{') || data.reply.trim().startsWith('```json'))) {
      try {
        let raw = data.reply.trim();
        if (raw.startsWith('```json')) raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        else if (raw.startsWith('```')) raw = raw.replace(/^```\s*/i, '').replace(/```\s*$/, '');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.reply === 'string') {
          data.reply = parsed.reply;
          if ((!data.options || data.options.length === 0) && Array.isArray(parsed.options)) {
            data.options = parsed.options;
          }
        }
      } catch (_) {}
    }

    const diffTags = [];
    if (data.accepted) {
      if (data.newRewardCoins && data.newRewardCoins !== prevVerdict.rewardCoins) {
        diffTags.push(`💰 Thưởng: ${prevVerdict.rewardCoins} ➔ ${data.newRewardCoins} Vàng`);
      }
      if (data.newTargetMinutes !== undefined && Number(data.newTargetMinutes) !== Number(prevVerdict.targetMinutes)) {
        diffTags.push(`⏱️ Thời gian: ${prevVerdict.targetMinutes || 0}p ➔ ${data.newTargetMinutes}p`);
      }
      if (data.newType && data.newType !== prevVerdict.type) {
        diffTags.push(`⚡ Loại: ${prevVerdict.type === 'focus' ? 'Hẹn giờ' : 'Không bấm giờ'} ➔ ${data.newType === 'focus' ? 'Hẹn giờ' : 'Không bấm giờ'}`);
      }
      if (data.newTitle && data.newTitle !== prevVerdict.title) {
        diffTags.push(`📝 Tên mới: "${data.newTitle}"`);
      }
      if (data.newRequiresProof !== undefined && Boolean(data.newRequiresProof) !== Boolean(prevVerdict.requiresProof)) {
        diffTags.push(data.newRequiresProof ? '📸 Yêu cầu chụp ảnh bằng chứng' : '⚡ Miễn chụp ảnh (Hoàn thành 1 chạm)');
      }
    }

    appendAiChatBubble(chatLogs, {
      reply: data.reply,
      accepted: data.accepted,
      diffTags,
      botName: 'Trọng Tài AI',
      botIcon: '🤖',
      options: data.options,
      mode: 'quest',
      toolsExecuted: data.toolsExecuted,
      onSelectOption: (opt) => sendDebateArgument(opt.argument || `Chốt phương án ${opt.id}`, opt)
    });

    currentDebateHistory.push({ user: argument, arbiter: data.reply });

    if (data.accepted) {
      if (data.newTitle) currentPendingVerdict.title = data.newTitle;
      if (data.newDescription !== undefined) currentPendingVerdict.description = data.newDescription;
      if (data.newRewardCoins !== undefined && Number(data.newRewardCoins) > 0) currentPendingVerdict.rewardCoins = Number(data.newRewardCoins);
      if (data.newTargetMinutes !== undefined) currentPendingVerdict.targetMinutes = Number(data.newTargetMinutes);
      if (data.signature) currentPendingVerdict.signature = data.signature;
      if (data.newType) {
        currentPendingVerdict.type = data.newType;
      } else if (data.newTargetMinutes !== undefined) {
        currentPendingVerdict.type = data.newTargetMinutes > 0 ? 'focus' : 'bounty';
      }
      if (data.newRequiresProof !== undefined) {
        currentPendingVerdict.requiresProof = Boolean(data.newRequiresProof);
      }
      if (data.newProofGuidance !== undefined) {
        currentPendingVerdict.proofGuidance = data.newProofGuidance;
      }
      if (data.newIcon) {
        currentPendingVerdict.icon = data.newIcon;
      }
      currentPendingVerdict.rank = data.newRank || calculateRank(currentPendingVerdict.rewardCoins);
      if (data.reply) currentPendingVerdict.verdict = data.reply;

      const verdictModNotice = document.getElementById('verdict-modified-notice');
      if (verdictModNotice) verdictModNotice.classList.add('hidden');

      // Refresh locked specs display card and badges
      updateVerdictDisplay();

      showToast('Thương lượng thành công! AI đã cập nhật thông số nhiệm vụ.', 'gold');
      sfx.playFanfare();
    }
  } catch (err) {
    if (loadingBubble && loadingBubble.cleanup) loadingBubble.cleanup();
    loadingBubble.remove();
    const errRow = document.createElement('div');
    errRow.className = 'flex justify-start items-start gap-2 message-fade-in';
    errRow.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">⚠️</div>
      <div class="max-w-[85%] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl rounded-tl-xs p-3 text-xs text-rose-700 dark:text-rose-300 shadow-xs">
        <strong>Lỗi thương lượng:</strong> ${escapeHtml(err.message || 'Không thể kết nối với AI. Vui lòng thử lại.')}
      </div>
    `;
    chatLogs.appendChild(errRow);
    chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });
    showToast('Lỗi thương lượng: ' + (err.message || 'Vui lòng thử lại'), 'error');
  } finally {
    isDebatingQuest = false;
    if (argInput) {
      argInput.disabled = false;
      argInput.focus();
    }
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.innerHTML = `<span>Gửi</span><span class="text-[10px]">➤</span>`;
    }
  }
}

// =============================================================================
// 9. AI REWARD APPRAISAL & CREATION
// =============================================================================
let currentPendingReward = null;
let currentRewardDebateHistory = [];

function updateRewardVerdictDisplay() {
  if (!currentPendingReward) return;

  const tier = (currentPendingReward.tier || 'rare').toLowerCase();
  const tierUpper = tier.toUpperCase();

  const evalTier = document.getElementById('eval-tier');
  if (evalTier) {
    evalTier.textContent = tierUpper;
    evalTier.className = `text-xs font-mono font-black px-2.5 py-1 rounded-lg border ${
      tier === 'legendary' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40' :
      tier === 'epic' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40' :
      tier === 'rare' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40' :
      'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/40'
    }`;
  }

  const evalPrice = document.getElementById('eval-price');
  if (evalPrice) {
    evalPrice.innerHTML = `${COIN_ICON_HTML} ${currentPendingReward.price} Vàng`;
  }

  const targetMinutes = parseInt(currentPendingReward.targetMinutes, 10) || 0;
  const timeText = targetMinutes > 0 ? `${targetMinutes} Phút` : 'Không cần bấm giờ';

  const evalTargetMinutes = document.getElementById('eval-target-minutes');
  if (evalTargetMinutes) {
    evalTargetMinutes.textContent = timeText;
  }

  const evalVerdict = document.getElementById('eval-verdict');
  if (evalVerdict && currentPendingReward.verdict) {
    evalVerdict.textContent = `"${currentPendingReward.verdict}"`;
  }

  const evalCatBadge = document.getElementById('eval-category-badge');
  if (evalCatBadge && currentPendingReward.category) {
    const catMap = {
      entertainment: '🎮 GIẢI TRÍ',
      treat: '🥤 ĂN UỐNG',
      item: '📦 VẬT PHẨM',
      milestone: '🏆 CỘT MỐC',
      harmful: '⚠️ SỨC KHỎE'
    };
    evalCatBadge.textContent = catMap[currentPendingReward.category] || '🎁 TỰ THƯỞNG';
  }

  const lockedIcon = document.getElementById('reward-locked-icon');
  if (lockedIcon) lockedIcon.textContent = currentPendingReward.icon || '🎁';

  const lockedName = document.getElementById('reward-locked-name');
  if (lockedName) lockedName.textContent = currentPendingReward.name;

  const lockedDesc = document.getElementById('reward-locked-desc');
  const lockedDescContainer = document.getElementById('reward-locked-desc-container');
  if (lockedDesc && lockedDescContainer) {
    if (currentPendingReward.description) {
      lockedDesc.textContent = currentPendingReward.description;
      lockedDescContainer.classList.remove('hidden');
    } else {
      lockedDescContainer.classList.add('hidden');
    }
  }

  const lockedTier = document.getElementById('reward-locked-tier-label');
  if (lockedTier) lockedTier.textContent = tierUpper;

  const lockedTimeLabel = document.getElementById('reward-locked-time-label');
  if (lockedTimeLabel) lockedTimeLabel.textContent = timeText;

  const lockedPrice = document.getElementById('reward-locked-price-label');
  if (lockedPrice) lockedPrice.innerHTML = `${COIN_ICON_HTML} ${currentPendingReward.price} Vàng`;
}

function renderRewardVerdictStep() {
  document.getElementById('reward-evaluating-step').classList.add('hidden');
  document.getElementById('reward-verdict-step').classList.remove('hidden');

  updateRewardVerdictDisplay();

  const evalVerdict = document.getElementById('eval-verdict');
  if (evalVerdict) evalVerdict.textContent = `"${currentPendingReward.verdict || 'Phần thưởng đã được định giá phù hợp.'}"`;

  const evalAdvice = document.getElementById('eval-advice');
  if (evalAdvice) evalAdvice.textContent = currentPendingReward.advice || 'Tự thưởng có chừng mực sau khi nỗ lực để duy trì động lực bền vững.';

  // AI Modification Notice
  const rewardModNotice = document.getElementById('reward-modified-notice');
  const rewardModReason = document.getElementById('reward-modified-reason');
  if (rewardModNotice && rewardModReason) {
    if (currentPendingReward.isModified && currentPendingReward.modificationReason) {
      rewardModNotice.classList.remove('hidden');
      rewardModReason.textContent = currentPendingReward.modificationReason;
    } else {
      rewardModNotice.classList.add('hidden');
    }
  }

  const rewardDebateBox = document.getElementById('reward-debate-container');
  if (rewardDebateBox) rewardDebateBox.classList.add('hidden');
  const rewardChatLogs = document.getElementById('reward-debate-chat-logs');
  if (rewardChatLogs) rewardChatLogs.innerHTML = '';
}

async function evaluateRewardItem() {
  const name = document.getElementById('input-reward-name').value.trim();
  const desc = document.getElementById('input-reward-desc').value.trim();
  const estimate = Math.max(0, parseInt(document.getElementById('input-reward-estimate')?.value, 10) || 0);
  let duration = Math.max(0, parseInt(document.getElementById('input-reward-duration')?.value, 10) || 0);
  if (duration <= 0) {
    const textDur = extractDurationFromText(`${name} ${desc}`);
    if (textDur > 0) duration = textDur;
  }

  if (!name) {
    showToast('Vui lòng nhập tên phần thưởng!', 'error');
    return;
  }

  document.getElementById('reward-form-step').classList.add('hidden');
  document.getElementById('reward-evaluating-step').classList.remove('hidden');

  try {
    const currentQuests = (appState.quests || []).filter(q => q.status === 'active').slice(0, 10).map(q => ({
      title: q.title,
      rewardCoins: q.rewardCoins,
      type: q.type,
      targetMinutes: q.targetMinutes
    }));

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'evaluate_reward',
        payload: {
          name,
          description: desc,
          userEstimatePrice: estimate,
          userEstimateDuration: duration,
          currentQuests,
          userCoins: appState.profile?.coins || 0
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.error || 'AI Error');
    }
    const data = await res.json();

    const finalName = (data.name && typeof data.name === 'string') ? data.name.trim() : name;
    const finalDesc = (data.description !== undefined && typeof data.description === 'string') ? data.description.trim() : desc;
    const isModified = Boolean(data.isModified) || (finalName.toLowerCase() !== name.trim().toLowerCase());

    currentPendingReward = {
      id: 'shop_' + Date.now(),
      name: finalName,
      description: finalDesc,
      isModified,
      modificationReason: data.modificationReason || (isModified ? 'AI đã điều chỉnh phần thưởng để lành mạnh và duy trì động lực tốt hơn.' : ''),
      price: data.price || 30,
      tier: data.tier || 'rare',
      targetMinutes: data.targetMinutes !== undefined ? data.targetMinutes : duration,
      icon: data.icon || '🎁',
      signature: data.signature || '',
      verdict: data.verdict || 'Phần thưởng đã được định giá phù hợp.',
      advice: data.advice || 'Tự thưởng có chừng mực sau khi nỗ lực để duy trì động lực bền vững.'
    };
    currentRewardDebateHistory = [];

    renderRewardVerdictStep();
  } catch (err) {
    showToast('Không thể kết nối với AI: ' + err.message, 'error');
    document.getElementById('reward-evaluating-step').classList.add('hidden');
    document.getElementById('reward-form-step').classList.remove('hidden');
  }
}

async function sendRewardDebateArgument(customArg = null, selectedOption = null) {
  if (isDebatingReward) return;

  const argInput = document.getElementById('input-reward-debate-arg');
  const argument = (typeof customArg === 'string' && customArg.trim())
    ? customArg.trim()
    : (argInput ? argInput.value.trim() : '');
  if (!argument || !currentPendingReward) return;

  const chatLogs = document.getElementById('reward-debate-chat-logs');
  const btnSend = document.getElementById('btn-send-reward-debate');

  isDebatingReward = true;
  if (argInput) {
    argInput.disabled = true;
    argInput.value = '';
  }
  if (btnSend) {
    btnSend.disabled = true;
    btnSend.innerHTML = `<span class="inline-flex gap-1 items-center"><span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-bounce" style="animation-delay: 0ms"></span><span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-bounce" style="animation-delay: 150ms"></span><span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-bounce" style="animation-delay: 300ms"></span></span>`;
  }

  appendUserChatBubble(chatLogs, argument);

  const loadingBubble = createDebateLoadingBubble('reward');
  chatLogs.appendChild(loadingBubble);
  chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });

  try {
    const currentQuests = (appState.quests || []).filter(q => q.status === 'active').slice(0, 10).map(q => ({
      title: q.title,
      rewardCoins: q.rewardCoins,
      type: q.type,
      targetMinutes: q.targetMinutes
    }));

    const prevReward = { ...currentPendingReward };

    const data = await fetchDebateStream('/api/ai', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        action: 'debate_reward',
        payload: {
          reward: currentPendingReward,
          argument,
          history: currentRewardDebateHistory,
          currentQuests,
          userCoins: appState.profile?.coins || 0,
          selectedOption,
          stream: true
        }
      })
    }, (stepData) => {
      if (loadingBubble && loadingBubble.updateStep) loadingBubble.updateStep(stepData);
    });

    if (loadingBubble && loadingBubble.cleanup) loadingBubble.cleanup();
    loadingBubble.remove();

    if (data && typeof data.reply === 'string' && (data.reply.trim().startsWith('{') || data.reply.trim().startsWith('```json'))) {
      try {
        let raw = data.reply.trim();
        if (raw.startsWith('```json')) raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        else if (raw.startsWith('```')) raw = raw.replace(/^```\s*/i, '').replace(/```\s*$/, '');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.reply === 'string') {
          data.reply = parsed.reply;
          if ((!data.options || data.options.length === 0) && Array.isArray(parsed.options)) {
            data.options = parsed.options;
          }
        }
      } catch (_) {}
    }

    const diffTags = [];
    if (data.accepted) {
      if (data.newPrice && data.newPrice !== prevReward.price) {
        diffTags.push(`💰 Giá: ${prevReward.price} ➔ ${data.newPrice} Vàng`);
      }
      if (data.newTier && data.newTier !== prevReward.tier) {
        diffTags.push(`⭐ Hạng: ${(prevReward.tier || 'rare').toUpperCase()} ➔ ${(data.newTier || '').toUpperCase()}`);
      }
      if (data.newTargetMinutes !== undefined && data.newTargetMinutes !== prevReward.targetMinutes) {
        const oldM = prevReward.targetMinutes ? `${prevReward.targetMinutes}p` : 'Không bấm giờ';
        const newM = data.newTargetMinutes ? `${data.newTargetMinutes}p` : 'Không bấm giờ';
        diffTags.push(`⏱️ Thời gian: ${oldM} ➔ ${newM}`);
      }
      if (data.newName && data.newName !== prevReward.name) {
        diffTags.push(`🎁 Tên mới: "${data.newName}"`);
      }
    }

    appendAiChatBubble(chatLogs, {
      reply: data.reply,
      accepted: data.accepted,
      diffTags,
      botName: 'Trợ Lý Cửa Hàng AI',
      botIcon: '🎁',
      options: data.options,
      mode: 'reward',
      toolsExecuted: data.toolsExecuted,
      onSelectOption: (opt) => sendRewardDebateArgument(opt.argument || `Chốt phương án ${opt.id}`, opt)
    });

    currentRewardDebateHistory.push({ user: argument, arbiter: data.reply });

    if (data.accepted) {
      if (data.newName) currentPendingReward.name = data.newName;
      if (data.newDescription !== undefined) currentPendingReward.description = data.newDescription;
      if (data.newPrice !== undefined && Number(data.newPrice) > 0) currentPendingReward.price = Number(data.newPrice);
      if (data.newTier) currentPendingReward.tier = data.newTier;
      if (data.newTargetMinutes !== undefined) currentPendingReward.targetMinutes = data.newTargetMinutes;
      if (data.signature) currentPendingReward.signature = data.signature;
      if (data.reply) currentPendingReward.verdict = data.reply;

      const rewardModNotice = document.getElementById('reward-modified-notice');
      if (rewardModNotice) rewardModNotice.classList.add('hidden');

      updateRewardVerdictDisplay();

      showToast('Thương lượng thành công! AI đã cập nhật phần thưởng.', 'gold');
      sfx.playFanfare();
    }
  } catch (err) {
    if (loadingBubble && loadingBubble.cleanup) loadingBubble.cleanup();
    loadingBubble.remove();
    const errRow = document.createElement('div');
    errRow.className = 'flex justify-start items-start gap-2 message-fade-in';
    errRow.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">⚠️</div>
      <div class="max-w-[85%] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl rounded-tl-xs p-3 text-xs text-rose-700 dark:text-rose-300 shadow-xs">
        <strong>Lỗi thương lượng:</strong> ${escapeHtml(err.message || 'Không thể kết nối với AI. Vui lòng thử lại.')}
      </div>
    `;
    chatLogs.appendChild(errRow);
    chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });
    showToast('Lỗi thương lượng: ' + (err.message || 'Vui lòng thử lại'), 'error');
  } finally {
    isDebatingReward = false;
    if (argInput) {
      argInput.disabled = false;
      argInput.focus();
    }
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.innerHTML = `<span>Gửi</span><span class="text-[10px]">➤</span>`;
    }
  }
}

function openRewardRenegotiateModal(itemId) {
  const item = appState.shopItems.find(i => i.id === itemId);
  if (!item) return;

  currentEditingRewardId = item.id;
  currentPendingReward = {
    id: item.id,
    name: item.name,
    description: item.description || '',
    price: item.price,
    tier: item.tier || 'rare',
    targetMinutes: item.targetMinutes !== undefined ? item.targetMinutes : extractRewardDuration(item),
    icon: item.icon || '🎁',
    signature: item.signature || '',
    verdict: item.verdict || 'Phần thưởng hợp lý.',
    advice: item.advice || 'Tự thưởng có chừng mực sau khi nỗ lực để duy trì động lực bền vững.'
  };
  currentRewardDebateHistory = [];

  const titleEl = document.getElementById('modal-reward-title');
  const subEl = document.getElementById('modal-reward-subtitle');
  if (titleEl) titleEl.textContent = 'THƯƠNG LƯỢNG LẠI PHẦN THƯỞNG';
  if (subEl) subEl.textContent = 'Thương lượng với AI để điều chỉnh tên, mô tả hoặc mức giá Vàng';

  const saveBtn = document.getElementById('btn-save-reward');
  if (saveBtn) saveBtn.textContent = '✓ Cập Nhật Phần Thưởng';

  document.getElementById('reward-form-step').classList.add('hidden');
  document.getElementById('reward-evaluating-step').classList.add('hidden');
  document.getElementById('reward-verdict-step').classList.remove('hidden');

  updateRewardVerdictDisplay();

  const evalVerdict = document.getElementById('eval-verdict');
  if (evalVerdict) evalVerdict.textContent = `"Bạn đang thương lượng lại phần thưởng '${item.name}' với AI."`;

  const evalAdvice = document.getElementById('eval-advice');
  if (evalAdvice) evalAdvice.textContent = currentPendingReward.advice;

  const rewardModNotice = document.getElementById('reward-modified-notice');
  if (rewardModNotice) rewardModNotice.classList.add('hidden');

  const debateBox = document.getElementById('reward-debate-container');
  if (debateBox) debateBox.classList.remove('hidden');

  initRewardDebateChat(true);

  const argInput = document.getElementById('input-reward-debate-arg');
  if (argInput) argInput.value = '';

  openModal('modal-reward');
  if (argInput) setTimeout(() => argInput.focus(), 150);
}

async function savePendingReward() {
  if (!currentPendingReward) return;

  const isEditing = Boolean(currentEditingRewardId);
  const rewardName = currentPendingReward.name || 'Phần thưởng mới';
  const rewardPrice = currentPendingReward.price || 30;
  const rewardTier = (currentPendingReward.tier || 'rare').toUpperCase();
  const rewardIcon = currentPendingReward.icon || '🎁';
  const targetMinutes = parseInt(currentPendingReward.targetMinutes, 10) || 0;
  const timeInfo = targetMinutes > 0 ? ` • ⏱️ ${targetMinutes} Phút` : ' • ⚡ Không bấm giờ';

  const ok = await confirmAction({
    title: isEditing ? 'Xác Nhận Cập Nhật Phần Thưởng?' : 'Xác Nhận Thêm Phần Thưởng?',
    message: isEditing
      ? `Bạn có chắc muốn lưu các thay đổi cho phần thưởng "${rewardName}"?`
      : `Bạn có chắc chắn muốn thêm phần thưởng "${rewardName}" vào Cửa Hàng?`,
    detail: `💰 Giá: ${rewardPrice} Vàng • ⭐ Hạng: ${rewardTier}${timeInfo} • Biểu tượng: ${rewardIcon}`,
    confirmText: isEditing ? 'Cập Nhật' : 'Thêm Vào Cửa Hàng',
    cancelText: 'Xem Lại',
    icon: rewardIcon,
    btnColor: 'amber'
  });

  if (!ok) return;

  if (currentEditingRewardId) {
    const targetItem = appState.shopItems.find(i => i.id === currentEditingRewardId);
    if (targetItem) {
      targetItem.name = currentPendingReward.name;
      targetItem.description = currentPendingReward.description || '';
      targetItem.price = currentPendingReward.price;
      targetItem.tier = currentPendingReward.tier || 'rare';
      targetItem.targetMinutes = targetMinutes;
      if (currentPendingReward.icon) targetItem.icon = currentPendingReward.icon;
      targetItem.signature = currentPendingReward.signature || targetItem.signature || '';

      sfx.playFanfare();
      showToast(`Đã cập nhật phần thưởng "${targetItem.name}"!`, 'success');
      closeModal('modal-reward');
      currentEditingRewardId = null;
      currentPendingReward = null;
      renderShop();
      triggerSave(true);
      return;
    }
  }

  const finalItem = {
    ...currentPendingReward,
    price: currentPendingReward.price,
    targetMinutes: targetMinutes,
    signature: currentPendingReward.signature || ''
  };

  appState.shopItems.unshift(finalItem);
  sfx.playFanfare();
  showToast(`Đã thêm món "${finalItem.name}" vào Cửa Hàng!`, 'success');
  closeModal('modal-reward');
  currentEditingRewardId = null;
  currentPendingReward = null;
  renderShop();
  triggerSave(true);
}

// =============================================================================
// 10. LEADERBOARD FETCHER & PRESENCE
// =============================================================================
let currentLeaderboardData = [];
let currentLeaderboardSearch = '';

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'trước đó';
  const diffSec = Math.floor((Date.now() - Number(timestamp)) / 1000);
  if (diffSec < 60) return 'vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}p trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  const d = new Date(Number(timestamp));
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function renderLeaderboardPodium(list) {
  const podiumEl = document.getElementById('leaderboard-podium');
  if (!podiumEl) return;
  if (!list || list.length === 0) {
    podiumEl.innerHTML = '';
    podiumEl.classList.add('hidden');
    return;
  }
  podiumEl.classList.remove('hidden');

  const top1 = list[0];
  const top2 = list[1] || null;
  const top3 = list[2] || null;

  function getCoins(u) {
    const isMe = (appState.profile.googleId && (u.key === appState.profile.googleId || u.googleId === appState.profile.googleId)) ||
                 (u.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase());
    return isMe ? (appState.profile?.coins ?? 0) : (typeof u.coins === 'number' ? u.coins : (u.totalCoinsEarned || 0));
  }

  function getPodiumAvatar(u, sizeClass, ringClass = '') {
    const isMe = (appState.profile.googleId && (u.key === appState.profile.googleId || u.googleId === appState.profile.googleId)) ||
                 (u.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase());
    const isOnline = isMe ? true : Boolean(u.isOnline);
    const statusColor = isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400/60';
    const avatarImg = isAvatarUrl(u.avatar)
      ? `<img referrerpolicy="no-referrer" src="${escapeHtml(u.avatar)}" alt="${escapeHtml(u.nickname || 'Avatar')}" class="${sizeClass} rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 ${ringClass} inline-block" onerror="this.onerror=null;this.outerHTML='<span class=\\'text-xl sm:text-2xl\\'>⚔️</span>'">`
      : `<span class="text-xl sm:text-2xl">${escapeHtml(u.avatar || '⚔️')}</span>`;

    return `
      <div class="relative inline-flex items-center justify-center">
        ${avatarImg}
        <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${statusColor}"></span>
      </div>
    `;
  }

  let html = '';

  // Rank 2 Card (Left / Bạc)
  if (top2) {
    html += `
      <div class="order-1 flex flex-col items-center text-center p-2 sm:p-3.5 rounded-2xl rpg-panel leaderboard-podium-card podium-rank-2 relative">
        <div class="absolute -top-2.5 sm:-top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-xs flex items-center gap-0.5 whitespace-nowrap">
          <span>🥈</span><span>#2</span>
        </div>
        <div class="mt-2 sm:mt-2.5 mb-1 sm:mb-1.5">
          ${getPodiumAvatar(top2, 'w-9 h-9 sm:w-12 sm:h-12')}
        </div>
        <div class="font-bold text-[11px] sm:text-sm text-slate-900 dark:text-slate-100 truncate max-w-[85px] sm:max-w-[130px] md:max-w-[160px]" title="${escapeHtml(top2.nickname)}">
          ${escapeHtml(top2.nickname)}
        </div>
        <div class="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full">
          <span class="font-mono font-semibold text-amber-600 dark:text-amber-400">Lv.${top2.level || 1}</span>
          <span class="hidden md:inline">• ${escapeHtml(top2.title || 'Hiệp Sĩ')}</span>
        </div>
        <div class="mt-1.5 sm:mt-2 font-mono font-bold text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
          ${COIN_ICON_HTML} <span>${getCoins(top2).toLocaleString('vi-VN')}</span>
        </div>
      </div>
    `;
  } else {
    html += `<div class="order-1"></div>`;
  }

  // Rank 1 Card (Center / Vàng) - Taller Elevated
  if (top1) {
    html += `
      <div class="order-2 flex flex-col items-center text-center p-2.5 sm:p-5 rounded-2xl rpg-panel leaderboard-podium-card podium-rank-1 relative -mt-2 sm:-mt-4">
        <div class="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 shadow-sm border border-yellow-300 flex items-center gap-1 whitespace-nowrap">
          <span class="crown-float text-xs sm:text-sm">👑</span><span>#1 QUÁN QUÂN</span>
        </div>
        <div class="mt-2.5 sm:mt-3 mb-1 sm:mb-1.5">
          ${getPodiumAvatar(top1, 'w-11 h-11 sm:w-15 sm:h-15', 'ring-2 sm:ring-4 ring-yellow-400/80 shadow-md')}
        </div>
        <div class="font-black text-xs sm:text-base text-yellow-600 dark:text-yellow-400 truncate max-w-[95px] sm:max-w-[150px] md:max-w-[190px]" title="${escapeHtml(top1.nickname)}">
          ${escapeHtml(top1.nickname)}
        </div>
        <div class="text-[10px] sm:text-xs text-amber-700/90 dark:text-amber-300/90 mt-0.5 truncate max-w-full">
          <span class="font-mono font-bold">Lv.${top1.level || 1}</span>
          <span class="hidden md:inline">• ${escapeHtml(top1.title || 'Vua Đấu Xếp Hạng')}</span>
        </div>
        <div class="mt-1.5 sm:mt-2 font-mono font-extrabold text-xs sm:text-sm text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 bg-amber-500/15 px-2 sm:px-3 py-0.5 rounded-full">
          ${COIN_ICON_HTML} <span>${getCoins(top1).toLocaleString('vi-VN')}</span>
        </div>
      </div>
    `;
  }

  // Rank 3 Card (Right / Đồng)
  if (top3) {
    html += `
      <div class="order-3 flex flex-col items-center text-center p-2 sm:p-3.5 rounded-2xl rpg-panel leaderboard-podium-card podium-rank-3 relative">
        <div class="absolute -top-2.5 sm:-top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs flex items-center gap-0.5 whitespace-nowrap">
          <span>🥉</span><span>#3</span>
        </div>
        <div class="mt-2 sm:mt-2.5 mb-1 sm:mb-1.5">
          ${getPodiumAvatar(top3, 'w-9 h-9 sm:w-12 sm:h-12')}
        </div>
        <div class="font-bold text-[11px] sm:text-sm text-slate-900 dark:text-slate-100 truncate max-w-[85px] sm:max-w-[130px] md:max-w-[160px]" title="${escapeHtml(top3.nickname)}">
          ${escapeHtml(top3.nickname)}
        </div>
        <div class="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full">
          <span class="font-mono font-semibold text-amber-600 dark:text-amber-400">Lv.${top3.level || 1}</span>
          <span class="hidden md:inline">• ${escapeHtml(top3.title || 'Hiệp Sĩ')}</span>
        </div>
        <div class="mt-1.5 sm:mt-2 font-mono font-bold text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
          ${COIN_ICON_HTML} <span>${getCoins(top3).toLocaleString('vi-VN')}</span>
        </div>
      </div>
    `;
  } else {
    html += `<div class="order-3"></div>`;
  }

  podiumEl.innerHTML = html;
}

function renderLeaderboardTable(list) {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;

  const searchQuery = (currentLeaderboardSearch || '').trim().toLowerCase();
  const displayList = searchQuery
    ? list.filter(u => (u.nickname || '').toLowerCase().includes(searchQuery))
    : list;

  if (displayList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs font-medium">🔍 Không tìm thấy hiệp sĩ nào phù hợp với "${escapeHtml(searchQuery)}"</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  displayList.forEach((u, idx) => {
    const isMe = (appState.profile.googleId && (u.key === appState.profile.googleId || u.googleId === appState.profile.googleId)) ||
                 (u.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase());
    const tr = document.createElement('tr');
    tr.className = `hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition ${isMe ? 'bg-amber-500/10 font-bold' : ''}`;

    const actualRank = list.indexOf(u);
    const rankIndex = actualRank >= 0 ? actualRank : idx;
    const medal = rankIndex === 0 ? '🥇' : rankIndex === 1 ? '🥈' : rankIndex === 2 ? '🥉' : `#${rankIndex + 1}`;

    const avatarHtml = isAvatarUrl(u.avatar)
      ? `<img referrerpolicy="no-referrer" src="${escapeHtml(u.avatar)}" alt="${escapeHtml(u.nickname || 'Avatar')}" class="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 inline-block" onerror="this.onerror=null;this.outerHTML='<span class=\\'text-base sm:text-lg shrink-0\\'>⚔️</span>'">`
      : `<span class="text-base sm:text-lg shrink-0">${escapeHtml(u.avatar || '⚔️')}</span>`;

    // Trạng thái trực tuyến & mốc thời gian hoạt động gần nhất
    const isOnline = isMe ? true : Boolean(u.isOnline);
    const lastActiveTime = isMe ? Date.now() : u.lastActive;
    const statusColor = isOnline
      ? 'bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse'
      : 'bg-slate-400/60 ring-2 ring-white dark:ring-slate-900';
    const statusTitle = isOnline
      ? 'Đang trực tuyến'
      : (lastActiveTime ? `Offline (Hoạt động ${formatTimeAgo(lastActiveTime)})` : 'Ngoại tuyến');

    const avatarWithPresence = `
      <div class="relative shrink-0 inline-flex items-center justify-center">
        ${avatarHtml}
        <span class="absolute -bottom-0.5 -right-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full ${statusColor}" title="${escapeHtml(statusTitle)}"></span>
      </div>
    `;

    const statusSubtext = isOnline
      ? '<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-none mt-0.5">Đang online</span>'
      : `<span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-none mt-0.5">Online ${escapeHtml(formatTimeAgo(lastActiveTime))}</span>`;

    const displayCoins = isMe ? (appState.profile?.coins ?? 0) : (typeof u.coins === 'number' ? u.coins : (u.totalCoinsEarned || 0));

    tr.innerHTML = `
      <td class="py-2.5 sm:py-3 px-2 sm:px-4 text-center sm:text-left font-mono whitespace-nowrap ${rankIndex < 3 ? 'text-base sm:text-lg' : 'text-slate-500 text-xs sm:text-sm'}">${medal}</td>
      <td class="py-2.5 sm:py-3 px-2 sm:px-4">
        <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
          ${avatarWithPresence}
          <div class="min-w-0 flex flex-col justify-center">
            <div class="min-w-0 flex items-center flex-wrap gap-1">
              <span class="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[110px] sm:max-w-[180px] md:max-w-[240px]">${escapeHtml(u.nickname)}</span>
              ${u.role === 'admin' ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-purple-500 text-white font-bold whitespace-nowrap">👑 ADMIN</span>' : ''}
              ${isMe ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-bold whitespace-nowrap">BẠN</span>' : ''}
              ${appState.profile.role === 'admin' && !isMe ? `<button class="btn-admin-del text-rose-500 hover:text-rose-700 ml-1 text-xs" data-nick="${escapeHtml(u.nickname || u.key)}" data-key="${escapeHtml(u.key || u.nickname)}" title="Xóa tài khoản này (Quyền Admin)">🗑️</button>` : ''}
            </div>
            <!-- Dòng phụ hiển thị trên mobile -->
            <div class="sm:hidden text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <span class="font-mono font-semibold text-amber-600 dark:text-amber-400">Lv.${u.level || 1}</span>
              <span>•</span>
              <span class="truncate max-w-[100px]">${escapeHtml(u.title || 'Thành viên')}</span>
            </div>
            <!-- Dòng trạng thái online trên desktop / tablet -->
            <div class="hidden sm:block">
              ${statusSubtext}
            </div>
          </div>
        </div>
      </td>
      <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs text-amber-600 dark:text-amber-400/90 hidden sm:table-cell whitespace-nowrap">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">${escapeHtml(u.title || 'Thành viên')}</span>
      </td>
      <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center font-mono text-xs text-slate-600 dark:text-slate-300 hidden sm:table-cell whitespace-nowrap">
        <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold">Lv. ${u.level || 1}</span>
      </td>
      <td class="py-2.5 sm:py-3 px-2 sm:px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap"><span class="inline-flex items-center gap-1 justify-end">${COIN_ICON_HTML} ${displayCoins.toLocaleString('vi-VN')}</span></td>
    `;
    tbody.appendChild(tr);
  });

  if (appState.profile.role === 'admin') {
    tbody.querySelectorAll('.btn-admin-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetNick = btn.dataset.nick;
        const targetKey = btn.dataset.key || targetNick;
        const ok = await confirmAction({
          title: 'Xóa Tài Khoản Leaderboard',
          message: `Bạn có chắc chắn muốn xóa tài khoản "${targetNick}" khỏi Bảng Xếp Hạng?`,
          detail: 'Hành động này có hiệu lực ngay lập tức trên Redis Cloud.',
          confirmText: 'Xóa Vĩnh Viễn',
          cancelText: 'Giữ Lại',
          icon: '🗑️',
          btnColor: 'rose'
        });
        if (!ok) return;
        try {
          const token = appState.profile.googleToken || appState.profile.token || getOrCreateUserToken();
          const res = await fetch('/api/sync?action=admin_remove', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              nickname: appState.profile.nickname,
              targetNickname: targetNick,
              targetSub: targetKey
            })
          });
          if (res.ok) {
            showToast(`Đã xóa "${targetNick}" khỏi hệ thống!`, 'success');
            fetchLeaderboard();
          } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.error || 'Lỗi khi xóa tài khoản', 'error');
          }
        } catch (err) {
          showToast('Lỗi: ' + err.message, 'error');
        }
      });
    });
  }
}

async function fetchLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  const podiumEl = document.getElementById('leaderboard-podium');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs">Đang tải bảng xếp hạng...</td></tr>';

  try {
    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch('/api/sync?action=leaderboard', { headers, credentials: 'include' });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    const list = data.leaderboard || [];
    currentLeaderboardData = list;

    // Cập nhật số lượng người online trên badge
    const onlineBadgeCount = document.getElementById('leaderboard-online-count');
    if (onlineBadgeCount) {
      onlineBadgeCount.textContent = (data.onlineCount || 0).toLocaleString('vi-VN');
    }

    if (list.length === 0) {
      if (podiumEl) { podiumEl.innerHTML = ''; podiumEl.classList.add('hidden'); }
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs">Chưa có ai trên Bảng Xếp Hạng. Hãy đồng bộ tên của bạn để là người đầu tiên!</td></tr>';
      return;
    }

    renderLeaderboardPodium(list);
    renderLeaderboardTable(list);

    updateCheatersBadge();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs">Không thể kết nối với Redis Cloud (${err.message}). Bảng xếp hạng tạm thời offline.</td></tr>`;
  }
}

// =============================================================================
// 10.1 CHEATERS HALL OF SHAME FETCHER & SUB-TABS
// =============================================================================
async function updateCheatersBadge() {
  const badge = document.getElementById('badge-cheaters-count');
  if (!badge) return;
  try {
    const res = await fetch('/api/sync?action=cheaters');
    if (!res.ok) return;
    const data = await res.json();
    const count = data.count ?? (data.cheaters ? data.cheaters.length : 0);
    badge.textContent = count;
    if (count > 0) {
      badge.classList.remove('hidden');
      badge.classList.add('inline-flex');
    } else {
      badge.classList.add('hidden');
      badge.classList.remove('inline-flex');
    }
  } catch (e) {}
}

async function fetchCheaters() {
  const tbody = document.getElementById('cheaters-tbody');
  const badge = document.getElementById('badge-cheaters-count');
  const thAdmin = document.getElementById('th-admin-actions');
  const isAdmin = appState.profile.role === 'admin';
  const colSpan = isAdmin ? 5 : 4;

  if (thAdmin) {
    if (isAdmin) {
      thAdmin.classList.remove('hidden');
    } else {
      thAdmin.classList.add('hidden');
    }
  }

  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-8 text-slate-500 text-xs">Đang tải danh sách vi phạm...</td></tr>`;

  try {
    const res = await fetch('/api/sync?action=cheaters');
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    const list = data.cheaters || [];

    if (badge) {
      badge.textContent = list.length;
      if (list.length > 0) {
        badge.classList.remove('hidden');
        badge.classList.add('inline-flex');
      } else {
        badge.classList.add('hidden');
        badge.classList.remove('inline-flex');
      }
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-8 text-slate-500 text-xs font-medium">🕊️ Không có tài khoản nào trong Sổ Đen. Toàn thể hiệp sĩ đều giữ vững kỷ luật và danh dự!</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    list.forEach(c => {
      const isMe = (appState.profile.googleId && (c.key === appState.profile.googleId || c.googleId === appState.profile.googleId)) ||
                   (c.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase());
      const tr = document.createElement('tr');
      tr.className = `hover:bg-rose-500/5 transition ${isMe ? 'bg-rose-500/10 font-bold' : ''}`;

      const avatarHtml = isAvatarUrl(c.avatar)
        ? `<img referrerpolicy="no-referrer" src="${escapeHtml(c.avatar)}" alt="${escapeHtml(c.nickname || 'Avatar')}" class="w-6 h-6 rounded-full object-cover shrink-0 border border-rose-500/30 inline-block" onerror="this.onerror=null;this.outerHTML='<span class=\\'text-base sm:text-lg shrink-0\\'>⚠️</span>'">`
        : `<span class="text-base sm:text-lg shrink-0">${escapeHtml(c.avatar || '⚠️')}</span>`;

      const formattedTime = c.cheatedAt
        ? new Date(c.cheatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
        : 'Gần đây';

      const adminActionHtml = isAdmin ? `
        <td class="py-2.5 sm:py-3 px-2 sm:px-4 text-center whitespace-nowrap">
          <button type="button" class="btn-pardon-row inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm active:scale-95" data-nick="${escapeHtml(c.nickname || c.key)}" data-key="${escapeHtml(c.key || c.nickname)}" title="Ân xá cho tài khoản này">
            <span>🕊️</span>
            <span>Ân Xá</span>
          </button>
        </td>
      ` : '';

      tr.innerHTML = `
        <td class="py-2.5 sm:py-3 px-2 sm:px-4">
          <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
            ${avatarHtml}
            <div class="min-w-0 flex flex-col justify-center">
              <div class="min-w-0 flex items-center flex-wrap gap-1.5">
                <span class="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[120px] sm:max-w-[190px]">${escapeHtml(c.nickname)}</span>
                ${isMe ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold whitespace-nowrap">BẠN</span>' : ''}
              </div>
              <div class="sm:hidden text-[10px] text-rose-500/90 font-mono mt-0.5">
                ${c.cheatStrikes || 1} lần vi phạm • ${formattedTime}
              </div>
            </div>
          </div>
        </td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs whitespace-nowrap hidden sm:table-cell">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            ${escapeHtml(c.title || 'Kẻ Gian Lận ⚠️')}
          </span>
        </td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center font-mono text-xs font-bold text-rose-500 whitespace-nowrap hidden sm:table-cell">
          ${c.cheatStrikes || 1} lần
        </td>
        <td class="py-2.5 sm:py-3 px-2 sm:px-4 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
          ${formattedTime}
        </td>
        ${adminActionHtml}
      `;
      tbody.appendChild(tr);
    });

    if (isAdmin) {
      tbody.querySelectorAll('.btn-pardon-row').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const targetNick = btn.dataset.nick;
          const targetKey = btn.dataset.key || targetNick;
          const ok = await confirmAction({
            title: 'Ân Xá Tài Khoản Gian Lận',
            message: `Bạn có muốn ân xá cho hiệp sĩ "${targetNick}" không?`,
            detail: 'Tài khoản sẽ được xóa trạng thái Kẻ Gian Lận, khôi phục danh hiệu hiệp sĩ và được phép xuất hiện lại trên Bảng Xếp Hạng.',
            confirmText: 'Ân Xá Ngay',
            cancelText: 'Hủy',
            icon: '🕊️',
            btnColor: 'purple'
          });
          if (!ok) return;

          try {
            const token = appState.profile.googleToken || appState.profile.token || getOrCreateUserToken();
            const res = await fetch('/api/sync?action=admin_pardon', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                targetNickname: targetNick,
                targetSub: targetKey
              })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              showToast(data.message || `Đã ân xá cho hiệp sĩ "${targetNick}"!`, 'success');
              await fetchCheaters();
              fetchLeaderboard();
            } else {
              showToast(data.error || 'Không thể ân xá cho tài khoản này', 'error');
            }
          } catch (err) {
            showToast('Lỗi kết nối: ' + err.message, 'error');
          }
        });
      });
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-8 text-slate-500 text-xs">Không thể kết nối danh sách Sổ Đen (${err.message}).</td></tr>`;
  }
}

function switchLeaderboardSubtab(subtab) {
  const btnRanking = document.getElementById('btn-subtab-ranking');
  const btnCheaters = document.getElementById('btn-subtab-cheaters');
  const viewRanking = document.getElementById('view-leaderboard-ranking');
  const viewCheaters = document.getElementById('view-leaderboard-cheaters');

  if (subtab === 'cheaters') {
    if (btnRanking) {
      btnRanking.className = 'px-3.5 py-2 rounded-xl text-xs font-bold transition bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-yellow-500/20 hover:text-yellow-600 dark:hover:text-yellow-400 flex items-center gap-1.5 shrink-0';
    }
    if (btnCheaters) {
      btnCheaters.className = 'px-3.5 py-2 rounded-xl text-xs font-bold transition bg-rose-500 text-white shadow-sm flex items-center gap-1.5 shrink-0';
    }
    if (viewRanking) viewRanking.classList.add('hidden');
    if (viewCheaters) viewCheaters.classList.remove('hidden');
    fetchCheaters();
  } else {
    if (btnRanking) {
      btnRanking.className = 'px-3.5 py-2 rounded-xl text-xs font-black transition bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 shadow-sm shadow-yellow-500/20 flex items-center gap-1.5 shrink-0';
    }
    if (btnCheaters) {
      btnCheaters.className = 'px-3.5 py-2 rounded-xl text-xs font-bold transition bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-500/20 hover:text-rose-500 flex items-center gap-1.5 shrink-0';
    }
    if (viewRanking) viewRanking.classList.remove('hidden');
    if (viewCheaters) viewCheaters.classList.add('hidden');
    fetchLeaderboard();
  }
}
window.switchLeaderboardSubtab = switchLeaderboardSubtab;
window.fetchCheaters = fetchCheaters;

// =============================================================================
// 11. ADMIN DASHBOARD & USER MANAGEMENT
// =============================================================================
let adminUsersList = [];
let adminSearchQuery = '';
let adminCurrentFilter = 'all';

function getAdminAuthToken() {
  return appState?.profile?.sessionToken || appState?.profile?.googleToken || appState?.profile?.token || getOrCreateUserToken();
}

function isUserAdmin() {
  if (appState?.profile?.role === 'admin') return true;
  const nick = (appState?.profile?.nickname || '').toLowerCase().trim();
  const email = (appState?.profile?.googleEmail || '').toLowerCase().trim();
  const adminNicks = ['admin', 'guildmaster', 'khoitran', 'khoi tran', 'khôi trần'];
  const adminEmails = ['admin@gmail.com', 'guildmaster@gmail.com', 'tranquockhoi1999@gmail.com', 'khoitran200199@gmail.com'];
  if (adminNicks.includes(nick) || adminEmails.includes(email)) {
    if (appState?.profile) appState.profile.role = 'admin';
    return true;
  }
  return false;
}

function updateAdminNavVisibility() {
  const isAdmin = isUserAdmin();
  const navAdmin = document.getElementById('nav-tab-admin');
  const mobileNavAdmin = document.getElementById('mobile-nav-admin');
  if (navAdmin) {
    navAdmin.classList.toggle('hidden', !isAdmin);
    navAdmin.classList.toggle('flex', isAdmin);
  }
  if (mobileNavAdmin) {
    mobileNavAdmin.classList.toggle('hidden', !isAdmin);
    mobileNavAdmin.classList.toggle('flex', isAdmin);
  }
}

async function fetchAdminUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-500 text-xs">Đang tải danh sách người chơi...</td></tr>';

  try {
    const token = getAdminAuthToken();
    const res = await fetch('/api/sync?action=admin_list_users', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 403) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-rose-500 text-xs font-bold">⚠️ Bạn không có quyền truy cập Bảng Điều Khiển Quản Trị Viên.</td></tr>';
      showToast('Bạn không có quyền quản trị viên.', 'error');
      return;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    adminUsersList = Array.isArray(data.users) ? data.users : [];

    // Cập nhật 4 thẻ KPI Stats
    const totalUsers = adminUsersList.length;
    let totalCoins = 0;
    let totalLevels = 0;
    let cheatersCount = 0;
    let overdueCount = 0;

    adminUsersList.forEach(u => {
      totalCoins += (typeof u.coins === 'number' ? u.coins : 0);
      totalLevels += (u.level || 1);
      if (u.isCheater) cheatersCount++;
      if (u.bank?.loan?.isOverdue || u.bank?.isFrozen) overdueCount++;
    });

    const statTotalUsers = document.getElementById('admin-stat-total-users');
    const statTotalCoins = document.getElementById('admin-stat-total-coins');
    const statAvgLevel = document.getElementById('admin-stat-avg-level');
    const statCheaters = document.getElementById('admin-stat-cheaters-count');
    const elAdminOverdue = document.getElementById('admin-bank-overdue-count');

    if (statTotalUsers) statTotalUsers.textContent = totalUsers.toLocaleString('vi-VN');
    if (statTotalCoins) statTotalCoins.textContent = totalCoins.toLocaleString('vi-VN');
    if (statAvgLevel) statAvgLevel.textContent = `Lv. ${totalUsers > 0 ? (totalLevels / totalUsers).toFixed(1) : 1}`;
    if (statCheaters) statCheaters.textContent = cheatersCount.toString();
    if (elAdminOverdue) elAdminOverdue.textContent = overdueCount.toString();

    // Tải thông tin tài chính Ngân hàng và Kho bạc cho Admin
    try {
      const bankRes = await fetch('/api/sync?action=bank_state', { credentials: 'include' });
      if (bankRes.ok) {
        const bData = await bankRes.json();
        if (bData.pool) {
          renderAdminBankTelemetry(bData.pool, bData.rates);
        }
      }
    } catch (_) {}

    renderAdminDashboard();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-rose-500 text-xs">Lỗi khi tải dữ liệu: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function handleAdminSearch(query) {
  adminSearchQuery = (query || '').trim().toLowerCase();
  renderAdminDashboard();
}

function setAdminFilter(filter) {
  adminCurrentFilter = filter;
  document.querySelectorAll('.admin-filter-btn').forEach(btn => {
    btn.className = 'admin-filter-btn px-3 py-1 rounded-xl text-xs font-semibold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white';
  });
  const activeBtn = document.getElementById(`admin-filter-${filter}`);
  if (activeBtn) {
    activeBtn.className = 'admin-filter-btn px-3 py-1 rounded-xl text-xs font-bold transition bg-purple-600 text-white shadow-xs';
  }
  renderAdminDashboard();
}

function renderAdminDashboard() {
  const tbody = document.getElementById('admin-users-tbody');
  const cardsContainer = document.getElementById('admin-users-cards');
  const emptyEl = document.getElementById('admin-users-empty');
  if (!tbody && !cardsContainer) return;

  // Lọc theo search & category filter
  const filtered = adminUsersList.filter(u => {
    // 1. Category Filter
    if (adminCurrentFilter === 'adventurer' && (u.role === 'admin' || u.isCheater)) return false;
    if (adminCurrentFilter === 'admin' && u.role !== 'admin') return false;
    if (adminCurrentFilter === 'cheater' && !u.isCheater) return false;

    // 2. Search Query
    if (adminSearchQuery) {
      const nick = (u.nickname || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const sub = (u.sub || '').toLowerCase();
      if (!nick.includes(adminSearchQuery) && !email.includes(adminSearchQuery) && !sub.includes(adminSearchQuery)) {
        return false;
      }
    }
    return true;
  });

  if (emptyEl) emptyEl.classList.toggle('hidden', filtered.length > 0);

  if (filtered.length === 0) {
    if (tbody) tbody.innerHTML = '';
    if (cardsContainer) cardsContainer.innerHTML = '';
    return;
  }

  if (tbody) tbody.innerHTML = '';
  if (cardsContainer) cardsContainer.innerHTML = '';

  filtered.forEach(u => {
    const isMe = (appState.profile.googleId && u.sub === appState.profile.googleId) ||
                 (u.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase());

    const avatarHtml = isAvatarUrl(u.avatar)
      ? `<img referrerpolicy="no-referrer" src="${escapeHtml(u.avatar)}" alt="${escapeHtml(u.nickname || 'Avatar')}" class="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700" onerror="this.onerror=null;this.outerHTML='<span class=\\'text-xl shrink-0\\'>⚔️</span>'">`
      : `<span class="text-xl shrink-0">${escapeHtml(u.avatar || '⚔️')}</span>`;

    const statusBadge = u.isCheater
      ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap">⚠️ Gian Lận</span>'
      : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">✅ Hiệp Sĩ</span>';

    const roleBadge = u.role === 'admin'
      ? '<span class="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-bold whitespace-nowrap">👑 ADMIN</span>'
      : '';

    const youBadge = isMe
      ? '<span class="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold whitespace-nowrap">BẠN</span>'
      : '';

    // 1. Render Table Row (Desktop & Tablet / iPad)
    if (tbody) {
      const tr = document.createElement('tr');
      tr.className = `hover:bg-slate-50 dark:hover:bg-slate-900/60 transition ${isMe ? 'bg-purple-500/5 dark:bg-purple-950/20' : ''}`;
      tr.innerHTML = `
        <td class="py-2.5 sm:py-3 px-3 sm:px-4">
          <div class="flex items-center gap-2.5 min-w-0">
            ${avatarHtml}
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px] md:max-w-[180px] lg:max-w-[240px]">${escapeHtml(u.nickname || 'Chưa đặt tên')}</span>
                ${roleBadge}
                ${youBadge}
              </div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[150px] md:max-w-[200px] lg:max-w-[260px]">${escapeHtml(u.email || u.sub || '')}</div>
            </div>
          </div>
        </td>
        <td class="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
          Lv. ${u.level || 1}
        </td>
        <td class="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
          <span class="inline-flex items-center gap-1 justify-end">${COIN_ICON_HTML} ${(u.coins ?? 0).toLocaleString('vi-VN')}</span>
        </td>
        <td class="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
          📜 ${u.ledgerCount ?? 0}
        </td>
        <td class="py-2.5 sm:py-3 px-3 sm:px-4 text-center whitespace-nowrap">
          ${statusBadge}
        </td>
        <td class="py-2.5 sm:py-3 px-3 sm:px-4 text-center whitespace-nowrap">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="openAdminEditUserModal('${escapeHtml(u.sub)}')" class="p-2 rounded-xl text-purple-600 hover:bg-purple-500/10 border border-purple-500/20 transition active:scale-95 cursor-pointer" title="Tinh chỉnh Vàng & Level">
              ✏️
            </button>
            <button onclick="openAdminUserLedgerModal('${escapeHtml(u.sub)}')" class="p-2 rounded-xl text-amber-600 hover:bg-amber-500/10 border border-amber-500/20 transition active:scale-95 cursor-pointer" title="Xem & Xóa Lịch sử thu chi">
              📜
            </button>
            ${!isMe ? `<button onclick="adminDeleteUser('${escapeHtml(u.sub)}', '${escapeHtml(u.nickname || u.sub)}')" class="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition active:scale-95 cursor-pointer" title="Xóa tài khoản khỏi hệ thống">🗑️</button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    }

    // 2. Render Mobile Card (Phone View < md)
    if (cardsContainer) {
      const card = document.createElement('div');
      card.className = `rpg-panel p-3.5 rounded-2xl space-y-2.5 border transition ${isMe ? 'border-purple-500/40 bg-purple-500/5 dark:bg-purple-950/20' : 'border-slate-200 dark:border-slate-800/80'}`;
      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            ${avatarHtml}
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate max-w-[140px]">${escapeHtml(u.nickname || 'Chưa đặt tên')}</span>
                ${roleBadge}
                ${youBadge}
              </div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[180px]">${escapeHtml(u.email || u.sub || '')}</div>
            </div>
          </div>
          <div class="shrink-0">
            ${statusBadge}
          </div>
        </div>

        <div class="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-center">
          <div>
            <div class="text-[9px] text-slate-400 font-medium">Cấp Độ</div>
            <div class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">Lv. ${u.level || 1}</div>
          </div>
          <div class="border-x border-slate-200 dark:border-slate-800">
            <div class="text-[9px] text-slate-400 font-medium">Vàng</div>
            <div class="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">${(u.coins ?? 0).toLocaleString('vi-VN')}</div>
          </div>
          <div>
            <div class="text-[9px] text-slate-400 font-medium">Sổ Cái</div>
            <div class="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">${u.ledgerCount ?? 0} mục</div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 pt-0.5">
          <button onclick="openAdminEditUserModal('${escapeHtml(u.sub)}')" class="flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/25 transition active:scale-95 cursor-pointer">
            <span>✏️</span> <span>Tinh Chỉnh</span>
          </button>
          <button onclick="openAdminUserLedgerModal('${escapeHtml(u.sub)}')" class="flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/25 transition active:scale-95 cursor-pointer">
            <span>📜</span> <span>Lịch Sử</span>
          </button>
          ${!isMe ? `
            <button onclick="adminDeleteUser('${escapeHtml(u.sub)}', '${escapeHtml(u.nickname || u.sub)}')" class="flex items-center justify-center py-2 px-3 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 transition active:scale-95 cursor-pointer" title="Xóa tài khoản">
              <span>🗑️</span>
            </button>
          ` : ''}
        </div>
      `;
      cardsContainer.appendChild(card);
    }
  });
}

function openAdminEditUserModal(sub) {
  const user = adminUsersList.find(u => u.sub === sub);
  if (!user) {
    showToast('Không tìm thấy thông tin người chơi.', 'error');
    return;
  }

  const subInput = document.getElementById('admin-edit-sub');
  const avatarEl = document.getElementById('admin-edit-avatar');
  const nickEl = document.getElementById('admin-edit-nickname');
  const roleBadge = document.getElementById('admin-edit-role-badge');
  const emailEl = document.getElementById('admin-edit-email');
  const titleEl = document.getElementById('admin-edit-badge-title');
  const statsEl = document.getElementById('admin-edit-current-stats');
  const coinsInput = document.getElementById('admin-edit-coins');
  const levelInput = document.getElementById('admin-edit-level');
  const expInput = document.getElementById('admin-edit-exp');
  const reasonInput = document.getElementById('admin-edit-reason');

  if (subInput) subInput.value = user.sub;
  if (nickEl) nickEl.textContent = user.nickname || 'Chưa đặt tên';
  if (roleBadge) {
    roleBadge.textContent = user.role === 'admin' ? '👑 Admin' : 'Hiệp sĩ';
    roleBadge.className = user.role === 'admin'
      ? 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600 text-white'
      : 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  }
  if (emailEl) emailEl.textContent = user.email || user.sub || '';
  if (titleEl) titleEl.textContent = user.title || 'Hiệp sĩ';
  if (statsEl) statsEl.textContent = `Lv. ${user.level || 1} • ${(user.coins ?? 0).toLocaleString('vi-VN')} Vàng`;

  if (avatarEl) {
    if (isAvatarUrl(user.avatar)) {
      avatarEl.innerHTML = `<img referrerpolicy="no-referrer" src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.nickname || 'Avatar')}" class="w-full h-full object-cover" onerror="this.onerror=null;this.parentElement.textContent='⚔️'">`;
    } else {
      avatarEl.textContent = user.avatar || '⚔️';
    }
  }

  if (coinsInput) coinsInput.value = user.coins ?? 0;
  if (levelInput) levelInput.value = user.level || 1;
  if (expInput) expInput.value = user.exp || 0;
  if (reasonInput) reasonInput.value = '';

  const cheaterRadios = document.querySelectorAll('input[name="admin-edit-cheater"]');
  cheaterRadios.forEach(radio => {
    radio.checked = (radio.value === (user.isCheater ? 'true' : 'false'));
  });

  openModal('modal-admin-edit-user');
}

function adminQuickAddCoins(delta) {
  const input = document.getElementById('admin-edit-coins');
  if (!input) return;
  const current = Math.max(0, parseInt(input.value, 10) || 0);
  input.value = current + delta;
  sfx.playClick();
}

function adminQuickAddLevel(delta) {
  const input = document.getElementById('admin-edit-level');
  if (!input) return;
  const current = Math.max(1, parseInt(input.value, 10) || 1);
  input.value = Math.min(100, current + delta);
  sfx.playClick();
}

async function submitAdminUserEdit() {
  const targetSub = document.getElementById('admin-edit-sub')?.value;
  const coins = parseInt(document.getElementById('admin-edit-coins')?.value, 10);
  const level = parseInt(document.getElementById('admin-edit-level')?.value, 10);
  const exp = parseInt(document.getElementById('admin-edit-exp')?.value, 10);
  const reason = document.getElementById('admin-edit-reason')?.value.trim();
  const cheaterRadio = document.querySelector('input[name="admin-edit-cheater"]:checked');
  const isCheater = cheaterRadio ? cheaterRadio.value === 'true' : false;

  if (!targetSub) {
    showToast('Thiếu thông tin người chơi.', 'error');
    return;
  }
  if (isNaN(coins) || coins < 0) {
    showToast('Số Vàng phải là số nguyên lớn hơn hoặc bằng 0.', 'error');
    return;
  }
  if (isNaN(level) || level < 1 || level > 100) {
    showToast('Cấp độ phải từ 1 đến 100.', 'error');
    return;
  }

  const btnSave = document.getElementById('btn-admin-save-user');
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.innerHTML = '<span>⏳</span> Đang lưu...';
  }

  try {
    const token = getAdminAuthToken();
    const res = await fetch('/api/sync?action=admin_update_user', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        targetSub,
        coins,
        level,
        exp: isNaN(exp) ? 0 : exp,
        isCheater,
        reason: reason || '👑 Quản trị viên tinh chỉnh chỉ số'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi cập nhật người chơi.');
    }

    // Nếu sửa chính tài khoản đang đăng nhập của Admin: Cập nhật live UI ngay lập tức
    const mySub = appState.profile.googleId || appState.profile.sub;
    const myNick = (appState.profile.nickname || '').toLowerCase().trim();
    const myEmail = (appState.profile.email || '').toLowerCase().trim();
    const targetUser = Array.isArray(adminUsersList) ? adminUsersList.find(u => u.sub === targetSub) : null;
    const isSelf = Boolean(
      (mySub && targetSub === mySub) ||
      (targetUser && mySub && targetUser.sub === mySub) ||
      (targetUser && myNick && targetUser.nickname?.toLowerCase().trim() === myNick) ||
      (targetUser && myEmail && targetUser.email?.toLowerCase().trim() === myEmail) ||
      (myNick && targetSub.toLowerCase().trim() === myNick)
    );
    if (isSelf) {
      appState.profile.coins = coins;
      appState.profile.level = level;
      appState.profile.exp = isNaN(exp) ? 0 : exp;
      appState.profile.totalCoinsEarned = Math.max(coins, appState.profile.totalCoinsEarned || 20);
      appState.profile.adminAdjusted = true;
      const now = Date.now();
      appState.lastModified = now;
      appState.lastSyncedAt = now;
      if (isCheater) {
        appState.profile.isCheater = true;
        appState.profile.title = 'Kẻ Gian Lận ⚠️';
      } else {
        appState.profile.isCheater = false;
        updateTitleByLevel();
      }
      renderAll();
    }

    // Gửi tín hiệu thông báo đa tab qua BroadcastChannel để các tab khác tự động nạp dữ liệu mới
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const syncChannel = new BroadcastChannel('levelup_sync_channel');
        syncChannel.postMessage({
          type: 'ADMIN_SYNC_UPDATE',
          targetSub,
          timestamp: Date.now()
        });
        syncChannel.close();
      } catch (_) {}
    }

    showToast(data.message || 'Cập nhật chỉ số người chơi thành công!', 'success');
    closeModal('modal-admin-edit-user');
    fetchAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerHTML = '<span>💾</span> Lưu Tinh Chỉnh';
    }
  }
}

let adminSelectedLedgerIds = new Set();

function updateAdminLedgerBulkBar() {
  const bulkBar = document.getElementById('admin-ledger-bulk-bar');
  const countEl = document.getElementById('admin-ledger-selected-count');
  const textEl = document.getElementById('btn-admin-delete-selected-text');
  const selectAllCb = document.getElementById('admin-ledger-select-all');
  const count = adminSelectedLedgerIds.size;

  if (countEl) countEl.textContent = count.toString();
  if (textEl) textEl.textContent = `Xóa ${count} mục đã chọn`;
  if (bulkBar) bulkBar.classList.toggle('hidden', count === 0);

  const allCbs = document.querySelectorAll('.admin-ledger-cb');
  if (selectAllCb && allCbs.length > 0) {
    selectAllCb.checked = allCbs.length === count;
    selectAllCb.indeterminate = count > 0 && count < allCbs.length;
  } else if (selectAllCb) {
    selectAllCb.checked = false;
    selectAllCb.indeterminate = false;
  }
}

function onAdminLedgerItemCheck(cb, entryId) {
  if (cb.checked) {
    adminSelectedLedgerIds.add(entryId);
  } else {
    adminSelectedLedgerIds.delete(entryId);
  }
  updateAdminLedgerBulkBar();
}

function toggleAdminLedgerSelectAll(checked) {
  const allCbs = document.querySelectorAll('.admin-ledger-cb');
  allCbs.forEach(cb => {
    cb.checked = checked;
    const id = cb.dataset.id;
    if (id) {
      if (checked) {
        adminSelectedLedgerIds.add(id);
      } else {
        adminSelectedLedgerIds.delete(id);
      }
    }
  });
  updateAdminLedgerBulkBar();
}

function clearAdminLedgerSelection() {
  adminSelectedLedgerIds.clear();
  const allCbs = document.querySelectorAll('.admin-ledger-cb');
  allCbs.forEach(cb => { cb.checked = false; });
  const selectAllCb = document.getElementById('admin-ledger-select-all');
  if (selectAllCb) {
    selectAllCb.checked = false;
    selectAllCb.indeterminate = false;
  }
  updateAdminLedgerBulkBar();
}

async function adminDeleteSelectedLedgerEntries() {
  const sub = document.getElementById('admin-ledger-sub')?.value;
  if (!sub) return;

  const count = adminSelectedLedgerIds.size;
  if (count === 0) {
    showToast('Chưa chọn giao dịch nào để xóa.', 'info');
    return;
  }

  const ok = await confirmAction({
    title: `Xóa ${count} Giao Dịch`,
    message: `Bạn có chắc chắn muốn xóa đồng loạt ${count} bản ghi giao dịch đã chọn khỏi sổ cái?`,
    detail: 'Hành động này sẽ xóa vĩnh viễn các bản ghi được chọn trên Redis Cloud.',
    confirmText: `Xóa ${count} Bản Ghi`,
    cancelText: 'Hủy',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!ok) return;

  try {
    const token = getAdminAuthToken();
    const res = await fetch('/api/sync?action=admin_clear_user_ledger', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        targetSub: sub,
        entryIds: Array.from(adminSelectedLedgerIds)
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi khi xóa giao dịch đã chọn.');

    showToast(data.message || `Đã xóa thành công ${count} giao dịch đã chọn!`, 'success');
    adminSelectedLedgerIds.clear();
    openAdminUserLedgerModal(sub);
    fetchAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openAdminUserLedgerModal(sub) {
  const user = adminUsersList.find(u => u.sub === sub);
  const titleEl = document.getElementById('admin-ledger-title');
  const subInput = document.getElementById('admin-ledger-sub');
  const container = document.getElementById('admin-ledger-container');
  const countEl = document.getElementById('admin-ledger-total-count');
  const emptyEl = document.getElementById('admin-ledger-empty');

  clearAdminLedgerSelection();

  if (subInput) subInput.value = sub;
  if (titleEl) titleEl.textContent = `LỊCH SỬ THU CHI: ${user?.nickname || sub}`;
  if (container) container.innerHTML = '<div class="p-8 text-center text-slate-500 text-xs">Đang tải lịch sử giao dịch...</div>';
  if (emptyEl) emptyEl.classList.add('hidden');

  openModal('modal-admin-user-ledger');

  try {
    const token = getAdminAuthToken();
    const res = await fetch(`/api/sync?action=admin_get_user_ledger&targetSub=${encodeURIComponent(sub)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const ledger = Array.isArray(data.ledger) ? data.ledger : [];
    if (countEl) countEl.textContent = ledger.length.toString();

    if (ledger.length === 0) {
      if (container) container.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }

    if (container) {
      container.innerHTML = '';
      ledger.forEach(entry => {
        const itemEl = document.createElement('div');
        itemEl.className = 'p-3 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs hover:border-purple-500/30 transition';

        const isEarn = entry.type === 'earn';
        const isSpend = entry.type === 'spend';
        const typeBadge = isEarn
          ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">+ Thu</span>'
          : (isSpend ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">- Chi</span>' : '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap">👑 Admin</span>');

        const dateStr = entry.timestamp ? new Date(entry.timestamp).toLocaleString('vi-VN') : 'Giao dịch cũ';
        const amountStr = entry.amount !== undefined ? `${isSpend ? '-' : '+'}${entry.amount} Vàng` : '';

        itemEl.innerHTML = `
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <label class="p-1 -m-1 cursor-pointer shrink-0 flex items-center">
              <input type="checkbox" class="admin-ledger-cb w-4 h-4 sm:w-5 sm:h-5 rounded text-purple-600 accent-purple-600 cursor-pointer shrink-0" data-id="${escapeHtml(entry.id)}" onchange="onAdminLedgerItemCheck(this, '${escapeHtml(entry.id)}')">
            </label>
            ${typeBadge}
            <div class="min-w-0 flex-1">
              <div class="font-bold text-slate-800 dark:text-slate-200 truncate">${escapeHtml(entry.title || 'Giao dịch')}</div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate">${escapeHtml(entry.description || '')}</div>
              <div class="text-[9px] text-slate-400 font-mono mt-0.5">${dateStr}</div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="font-mono font-bold text-xs sm:text-sm ${isSpend ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">${amountStr}</span>
            <button onclick="adminDeleteLedgerEntry('${escapeHtml(sub)}', '${escapeHtml(entry.id)}')" class="p-1.5 sm:p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition active:scale-95 cursor-pointer" title="Xóa bản ghi này">
              🗑️
            </button>
          </div>
        `;
        container.appendChild(itemEl);
      });
    }
  } catch (err) {
    if (container) container.innerHTML = `<div class="p-8 text-center text-rose-500 text-xs font-semibold">Lỗi tải lịch sử: ${escapeHtml(err.message)}</div>`;
  }
}

async function adminDeleteLedgerEntry(sub, entryId) {
  const ok = await confirmAction({
    title: 'Xóa Giao Dịch',
    message: 'Bạn có chắc chắn muốn xóa bản ghi giao dịch này khỏi sổ cái người chơi?',
    detail: 'Hành động này sẽ được áp dụng trực tiếp lên Redis Cloud.',
    confirmText: 'Xóa Bản Ghi',
    cancelText: 'Hủy',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!ok) return;

  try {
    const token = getAdminAuthToken();
    const res = await fetch('/api/sync?action=admin_clear_user_ledger', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        targetSub: sub,
        entryId
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi xóa giao dịch.');

    showToast(data.message || 'Đã xóa bản ghi thành công.', 'success');
    openAdminUserLedgerModal(sub);
    fetchAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function adminPurgeUserLedger() {
  const sub = document.getElementById('admin-ledger-sub')?.value;
  if (!sub) return;

  const ok = await confirmAction({
    title: 'Xóa Sạch Lịch Sử Thu Chi',
    message: 'Bạn có chắc chắn muốn XÓA SẠCH toàn bộ lịch sử thu chi của người chơi này?',
    detail: 'Toàn bộ giao dịch sẽ bị xóa và thay thế bằng 1 bản ghi hệ thống mới.',
    confirmText: 'Xóa Sạch Ngay',
    cancelText: 'Giữ Lại',
    icon: '🧹',
    btnColor: 'rose'
  });
  if (!ok) return;

  try {
    const token = getAdminAuthToken();
    const res = await fetch('/api/sync?action=admin_clear_user_ledger', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        targetSub: sub,
        entryId: 'all'
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi dọn dẹp lịch sử.');

    showToast(data.message || 'Đã dọn dẹp sạch toàn bộ lịch sử thu chi!', 'success');
    openAdminUserLedgerModal(sub);
    fetchAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function adminDeleteUser(sub, nickname) {
  const ok = await confirmAction({
    title: 'Xóa Tài Khoản Khỏi Hệ Thống',
    message: `Bạn có chắc chắn muốn XÓA HOÀN TOÀN tài khoản "${nickname}" khỏi hệ thống LevelUp?`,
    detail: 'Hồ sơ người dùng, điểm Leaderboard và toàn bộ dữ liệu trên Redis sẽ bị xóa vĩnh viễn.',
    confirmText: 'Xóa Vĩnh Viễn',
    cancelText: 'Hủy',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!ok) return;

  try {
    const token = getAdminAuthToken();
    const res = await fetch('/api/sync?action=admin_remove', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        targetSub: sub,
        targetNickname: nickname
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi khi xóa tài khoản.');

    showToast(`Đã xóa thành công tài khoản "${nickname}".`, 'success');
    fetchAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.fetchAdminUsers = fetchAdminUsers;
window.handleAdminSearch = handleAdminSearch;
window.setAdminFilter = setAdminFilter;
window.openAdminEditUserModal = openAdminEditUserModal;
window.adminQuickAddCoins = adminQuickAddCoins;
window.adminQuickAddLevel = adminQuickAddLevel;
window.submitAdminUserEdit = submitAdminUserEdit;
window.openAdminUserLedgerModal = openAdminUserLedgerModal;
window.toggleAdminLedgerSelectAll = toggleAdminLedgerSelectAll;
window.onAdminLedgerItemCheck = onAdminLedgerItemCheck;
window.clearAdminLedgerSelection = clearAdminLedgerSelection;
window.adminDeleteSelectedLedgerEntries = adminDeleteSelectedLedgerEntries;
window.adminDeleteLedgerEntry = adminDeleteLedgerEntry;
window.adminPurgeUserLedger = adminPurgeUserLedger;
window.adminDeleteUser = adminDeleteUser;
window.updateAdminNavVisibility = updateAdminNavVisibility;

// =============================================================================
// 12. RENDER FUNCTIONS (Theme-aware & High Contrast)
// =============================================================================
let currentQuestFilter = 'active';

function renderHeader() {
  const p = appState.profile;
  const heroAvatar = document.getElementById('hero-avatar');
  if (heroAvatar) {
    if (isAvatarUrl(p.avatar)) {
      heroAvatar.innerHTML = `<img referrerpolicy="no-referrer" src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.nickname || 'Avatar')}" class="w-full h-full object-cover rounded-lg" onerror="this.onerror=null;this.parentElement.textContent='⚔️'">`;
    } else {
      heroAvatar.textContent = p.avatar || '⚔️';
    }
  }
  document.getElementById('hero-nickname').textContent = p.nickname;
  document.getElementById('hero-title').textContent = p.title;
  document.getElementById('hero-level-badge').textContent = `LV. ${p.level}`;
  document.getElementById('hero-coins').textContent = p.coins;

  const expNeeded = p.level * 100;
  document.getElementById('hero-exp-text').textContent = `${p.exp}/${expNeeded}`;
  const pct = Math.min(100, Math.round((p.exp / expNeeded) * 100));
  document.getElementById('hero-exp-bar').style.width = `${pct}%`;

  const soundBtn = document.getElementById('toggle-sound-btn');
  if (soundBtn) soundBtn.textContent = p.soundEnabled ? '🔊' : '🔇';
  sfx.enabled = p.soundEnabled;

  const modalSoundIcon = document.getElementById('modal-sound-icon');
  const modalSoundText = document.getElementById('modal-sound-text');
  if (modalSoundIcon) modalSoundIcon.textContent = p.soundEnabled ? '🔊' : '🔇';
  if (modalSoundText) modalSoundText.textContent = p.soundEnabled ? 'Đang bật' : 'Đang tắt';

  const themeBtn = document.getElementById('toggle-theme-btn');
  if (themeBtn) {
    themeBtn.textContent = document.documentElement.classList.contains('dark') ? '🌙' : '☀️';
  }

  const syncTime = document.getElementById('modal-sync-time');
  if (syncTime && appState.lastSyncedAt) {
    syncTime.textContent = new Date(appState.lastSyncedAt).toLocaleTimeString();
  }

  const profLevelTitle = document.getElementById('profile-modal-level-title');
  if (profLevelTitle) profLevelTitle.textContent = `LV. ${p.level} • ${p.title || 'Tân Binh Cấp 1'}`;
  const profExpText = document.getElementById('profile-modal-exp-text');
  if (profExpText) profExpText.textContent = `${p.exp}/${expNeeded} EXP (${pct}%)`;

  if (!p.lastStreakDate && (parseInt(p.streak, 10) || 0) > 0) {
    p.lastStreakDate = getLocalDayString(new Date(Date.now() - 86400000));
  }
  const statusInfo = getDailyStreakStatus(p);
  if (statusInfo.status === 'broken' && p.streak > 0) {
    p.streak = 0;
  }

  const streak = Math.max(0, parseInt(p.streak, 10) || 0);
  const heroStreakCount = document.getElementById('hero-streak-count');
  if (heroStreakCount) {
    heroStreakCount.innerHTML = `${streak}<span class="hidden sm:inline text-[10px] font-medium ml-0.5">ngày</span>`;
  }
  const heroStreakFlame = document.getElementById('hero-streak-flame');
  if (heroStreakFlame) {
    if (streak >= 30) {
      heroStreakFlame.className = 'text-sm sm:text-base streak-flame streak-flame-legendary transition-transform group-hover:scale-110';
      heroStreakFlame.textContent = '👑';
    } else if (streak >= 7) {
      heroStreakFlame.className = 'text-sm sm:text-base streak-flame streak-flame-high transition-transform group-hover:scale-110';
      heroStreakFlame.textContent = '🔥';
    } else {
      heroStreakFlame.className = 'text-sm sm:text-base streak-flame transition-transform group-hover:scale-110';
      heroStreakFlame.textContent = '🔥';
    }
  }

  const profStreakTitle = document.getElementById('profile-modal-streak-title');
  if (profStreakTitle) profStreakTitle.textContent = `Chuỗi Chăm Chỉ: ${streak} ngày (${getStreakTitle(streak)})`;
  const profStreakPerk = document.getElementById('profile-modal-streak-perk');
  if (profStreakPerk) profStreakPerk.textContent = `Thưởng nhiệm vụ: +${getStreakBonusPercent(streak)}% Vàng & EXP`;
}

/**
 * Tự động đo đạc và quản lý nút "...xem thêm" / "Thu gọn ▲" cho thẻ Nhiệm vụ và Phần thưởng.
 * Mặc định: 1 dòng (line-clamp-1).
 * Chỉ hiện nút toggle khi nội dung vượt quá 1 dòng (từ dòng 2 trở lên).
 * Khi mở rộng: giới hạn chiều cao tối đa (max-height) và kích hoạt thanh cuộn dọc (overflow-y-auto).
 */
function setupCardDescToggle(card, descSelector) {
  const descP = card.querySelector(descSelector);
  const toggleBtn = card.querySelector('.btn-toggle-desc');
  if (!descP || !toggleBtn) return;

  const checkOverflow = () => {
    if (descP.classList.contains('expanded')) return;
    const isVisible = descP.clientHeight > 0;
    // Kiểm tra tràn 1 dòng:
    // Nếu phần tử hiển thị: so sánh scrollHeight vs clientHeight (có dung sai 1px cho subpixel rendering)
    // Nếu phần tử đang ở tab ẩn: kiểm tra có chứa ký tự xuống dòng hoặc độ dài văn bản
    const isMultiLine = isVisible
      ? (descP.scrollHeight > descP.clientHeight + 1)
      : (descP.textContent.includes('\n') || descP.textContent.trim().length > 38);

    if (isMultiLine) {
      toggleBtn.classList.remove('hidden');
    } else {
      toggleBtn.classList.add('hidden');
    }
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isClamped = descP.classList.contains('line-clamp-1');
    if (isClamped) {
      descP.classList.remove('line-clamp-1');
      descP.classList.add('expanded');
      toggleBtn.textContent = 'Thu gọn ▲';
    } else {
      descP.classList.remove('expanded');
      descP.classList.add('line-clamp-1');
      descP.scrollTop = 0;
      toggleBtn.textContent = '...xem thêm';
    }
  });

  checkOverflow();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(checkOverflow);
  }
}
window.setupCardDescToggle = setupCardDescToggle;

function refreshAllCardDescToggles() {
  const activeTabPane = document.querySelector('.tab-pane:not(.hidden)');
  if (!activeTabPane) return;
  const cards = activeTabPane.querySelectorAll('.rpg-card');
  cards.forEach(card => {
    const descP = card.querySelector('.quest-desc-text, .reward-desc-text');
    const toggleBtn = card.querySelector('.btn-toggle-desc');
    if (!descP || !toggleBtn) return;
    if (descP.classList.contains('expanded')) return;
    if (descP.clientHeight > 0) {
      if (descP.scrollHeight > descP.clientHeight + 1) {
        toggleBtn.classList.remove('hidden');
      } else {
        toggleBtn.classList.add('hidden');
      }
    }
  });

  // Đo đạc lại cho thẻ Lịch Sử nếu đang ở tab Ledger
  if (activeTabPane.id === 'tab-ledger') {
    setupLedgerDescToggles();
  }
}
window.refreshAllCardDescToggles = refreshAllCardDescToggles;

/**
 * Đóng toàn bộ các menu dropdown thao tác của các thẻ và hạ tầng z-index
 */
function closeAllCardDropdowns() {
  document.querySelectorAll('.quest-dropdown-menu:not(.hidden)').forEach(m => {
    m.classList.add('hidden');
    m.closest('.rpg-card')?.classList.remove('card-menu-open');
  });
}
window.closeAllCardDropdowns = closeAllCardDropdowns;

function renderQuests() {
  const grid = document.getElementById('quests-grid');
  const empty = document.getElementById('quests-empty');
  const activeCountBadge = document.getElementById('badge-active-quests');

  let filtered = appState.quests;
  if (currentQuestFilter === 'active') {
    filtered = appState.quests.filter(q => q.status === 'active');
  } else if (currentQuestFilter === 'completed') {
    filtered = appState.quests.filter(q => q.status === 'completed' || (q.isRepeatable && (q.completedCount || 0) > 0));
  }

  // Sắp xếp nhiệm vụ: Ghim việc đang làm lên đầu, việc active trước completed, theo Rank & Vàng từ cao xuống thấp
  const rankScores = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
  filtered = [...filtered].sort((a, b) => {
    const aFocus = (activeFocusQuest && activeFocusQuest.id === a.id) ? 1 : 0;
    const bFocus = (activeFocusQuest && activeFocusQuest.id === b.id) ? 1 : 0;
    if (aFocus !== bFocus) return bFocus - aFocus;

    const aActive = a.status === 'active' ? 1 : 0;
    const bActive = b.status === 'active' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;

    const scoreA = rankScores[(a.rank || 'E').toUpperCase()] ?? 1;
    const scoreB = rankScores[(b.rank || 'E').toUpperCase()] ?? 1;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (b.rewardCoins || 0) - (a.rewardCoins || 0);
  });

  const activeQuests = appState.quests.filter(q => q.status === 'active');
  const activeCount = activeQuests.length;
  if (activeCountBadge) activeCountBadge.textContent = activeCount;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = '';
  // ponytail: batch DOM card insertion via DocumentFragment to eliminate layout thrashing
  const fragment = document.createDocumentFragment();

  filtered.forEach(q => {
    const isCompleted = q.status === 'completed';
    const isCurrentlyFocusing = activeFocusQuest && activeFocusQuest.id === q.id;
    const isTimerDone = isCurrentlyFocusing && focusRemainingSeconds <= 0;
    const isSessionOnOtherDevice = Boolean(
      isCurrentlyFocusing &&
      !isTimerDone &&
      appState.activeTimer?.runnerId &&
      appState.activeTimer.runnerId !== CURRENT_RUNNER_ID
    );
    const hasSavedTimer = Boolean(q.savedTimer && q.savedTimer.remainingSeconds > 0);
    const cooldownRemainingMs = getQuestRepeatCooldownRemaining(q);
    const rank = (q.rank || 'E').toUpperCase();
    const card = document.createElement('div');
    card.dataset.questId = q.id;
    card.className = `rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 relative quest-card-rank-${rank} ${
      isCurrentlyFocusing
        ? 'ring-2 ring-amber-500 shadow-xl shadow-amber-500/20 bg-amber-500/5 border-amber-500/50'
        : isCompleted
          ? 'opacity-70 bg-slate-100/50 dark:bg-slate-950/30'
          : (hasSavedTimer ? 'ring-1 ring-sky-500/50 shadow-md shadow-sky-500/10' : '')
    }`;

    card.innerHTML = `
      <div>
        <!-- Zone 1: Header (Streamlined: Status & Value with Action Menu "⋮") -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-1.5 sm:gap-2">
            ${isCurrentlyFocusing ? (isTimerDone ? `
              <span class="badge-quest-doing inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-slate-950 shadow-xs animate-pulse">
                🎉 ĐÃ XONG
              </span>
            ` : `
              <span class="badge-quest-doing inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950 shadow-xs animate-pulse">
                ⏱️ ĐANG LÀM
              </span>
            `) : (hasSavedTimer ? `
              <span class="badge-quest-saved inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500 text-slate-950 shadow-xs" title="Thời gian đang được bảo lưu">
                ⏸️ BẢO LƯU (${Math.ceil(q.savedTimer.remainingSeconds / 60)}p)
              </span>
            ` : '')}
          </div>
          <div class="flex items-center gap-1.5 relative">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-mono font-black text-xs shadow-xs" title="Phần thưởng Vàng khi hoàn thành">
              ${COIN_ICON_HTML} <span>+${q.rewardCoins}</span>
            </div>
            <button type="button" class="btn-quest-menu text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 rounded-lg p-1.5 transition-colors leading-none cursor-pointer" title="Tùy chọn thao tác" aria-label="Tùy chọn thao tác">
              <svg class="w-4 h-4 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </button>
            <div class="quest-dropdown-menu hidden">
              <div class="quest-dropdown-item cursor-default text-slate-600 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60 pb-1.5 mb-1">
                <span>Phân cấp:</span>
                <span class="rank-badge-${q.rank} text-[10px] font-mono font-black px-2 py-0.5 rounded ml-auto tracking-wider shadow-xs whitespace-nowrap shrink-0">HẠNG ${q.rank}</span>
              </div>
              ${q.requiresProof ? `
                <div class="quest-dropdown-item cursor-default text-slate-600 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60 pb-1.5 mb-1">
                  <span>Bằng chứng:</span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ml-auto whitespace-nowrap shrink-0 ${q.focusTimerCompleted ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 animate-pulse' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'}">
                    ${q.focusTimerCompleted ? 'CHỜ NỘP ẢNH' : 'CẦN ẢNH'}
                  </span>
                </div>
              ` : ''}
              ${hasSavedTimer ? `
                <button type="button" class="btn-clear-saved-timer quest-dropdown-item text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 cursor-pointer" title="Hủy thời gian bảo lưu để làm lại từ đầu">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>Hủy bảo lưu (Bắt đầu lại)</span>
                </button>
              ` : ''}
              ${!isCompleted ? `
                <button type="button" class="btn-debate-quest quest-dropdown-item text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 cursor-pointer" title="Thương lượng lại nhiệm vụ với AI">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                  <span>Thương lượng AI</span>
                </button>
              ` : ''}
              ${q.isRepeatable && q.completedCount > 0 ? `
                <button type="button" class="btn-undo-repeat-quest quest-dropdown-item text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 cursor-pointer" title="Hoàn tác lần làm gần nhất">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
                  <span>Hoàn tác lần vừa làm (-${q.rewardCoins} Vàng)</span>
                </button>
              ` : ''}
              ${!isCompleted ? `
                <button type="button" class="btn-toggle-repeat quest-dropdown-item text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title="Nhấn để đổi giữa Lặp lại và Làm 1 lần">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>${q.isRepeatable ? 'Đổi sang 1 lần' : 'Đổi sang Lặp lại'}</span>
                </button>
              ` : ''}
              <button type="button" class="btn-del-quest quest-dropdown-item text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 cursor-pointer" title="Xóa nhiệm vụ">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                <span>Xóa nhiệm vụ</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Zone 2: Body (Title & Standardized Clamped Context) -->
        <div class="flex items-start gap-3 my-2">
          <div class="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl shadow-xs shrink-0 ${isCompleted ? 'opacity-60 grayscale' : ''}">
            ${escapeHtml(getQuestIcon(q))}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-sm sm:text-base leading-snug line-clamp-2 ${isCompleted ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}">${escapeHtml(q.title)}</h3>
            ${q.description ? `
              <div class="mt-1">
                <p class="quest-desc-text text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed break-words">${escapeHtml(q.description)}</p>
                <button type="button" class="btn-toggle-desc hidden text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer block mt-0.5">...xem thêm</button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div>
        <!-- Zone 3: Meta & Progress Strip (Operational Status) -->
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
            ${(q.type === 'focus' && q.targetMinutes > 0) ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${q.focusTimerCompleted ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold' : (hasSavedTimer ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300')} font-mono">
                ${q.focusTimerCompleted ? `
                  <svg class="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
                  <span>Đã đủ ${q.targetMinutes}p</span>
                ` : `
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
                  <span>${q.targetMinutes}p${hasSavedTimer ? ` (còn ${Math.ceil(q.savedTimer.remainingSeconds / 60)}p)` : ''}</span>
                `}
              </span>
            ` : ''}
          </div>

          <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            ${q.isRepeatable ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold" title="Nhiệm vụ lặp lại hàng ngày">
                <span>🔁 Lặp lại${q.completedCount ? ` (${q.completedCount})` : ''}</span>
              </span>
            ` : `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" title="Nhiệm vụ làm 1 lần">
                <span>1 lần</span>
              </span>
            `}
          </div>
        </div>

        <!-- Zone 4: Footer (Action Command Zone) -->
        ${isCompleted ? `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
              <span>Hoàn thành</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button class="btn-restart-quest px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 active:scale-95 cursor-pointer" title="Làm lại nhiệm vụ này">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                <span>Làm lại</span>
              </button>
              <button class="btn-undo-quest px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 active:scale-95 cursor-pointer" title="Hoàn tác trạng thái hoàn thành">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
                <span>Hoàn tác</span>
              </button>
            </div>
          </div>
        ` : `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
            ${q.focusTimerCompleted && q.requiresProof ? `
              <button class="btn-submit-quest-proof w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 bg-amber-600 hover:bg-amber-500 text-white cursor-pointer" title="Đã đủ thời gian tập trung! Bấm để chụp ảnh gửi AI duyệt nhận Vàng">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="4" stroke-width="2"/></svg>
                <span>Chụp Ảnh Nhận Vàng 📸</span>
              </button>
            ` : (q.type === 'focus' ? (isTimerDone ? `
              <button class="btn-complete-focus-done w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold animate-pulse">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
                <span>${q.requiresProof && !q._proofVerified ? 'Chụp Ảnh Nhận Vàng 📸' : 'Hoàn Thành & Nhận Thưởng 🎉'}</span>
              </button>
            ` : (cooldownRemainingMs > 0 && !isCurrentlyFocusing && !hasSavedTimer ? `
              <button class="w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-none bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700/60 cursor-not-allowed" disabled title="Đang trong thời gian chờ 10 phút giữa các lần nhận thưởng">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
                <span>Chờ ${Math.ceil(cooldownRemainingMs / 60000)}p</span>
              </button>
            ` : `
              <button class="btn-start-focus w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer ${isSessionOnOtherDevice ? 'bg-amber-700 hover:bg-amber-600 text-white' : (isCurrentlyFocusing ? 'bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25' : (hasSavedTimer ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold' : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold'))}">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
                <span>${isSessionOnOtherDevice ? 'Tiếp Tục Ở Thiết Bị Này ⏱️' : (isCurrentlyFocusing ? (isFocusRunning ? 'Đang Chạy...' : 'Tạm Dừng') : (hasSavedTimer ? `Tiếp Tục (${Math.ceil(q.savedTimer.remainingSeconds / 60)}p) ⏱️` : 'Bắt Đầu ⏱️'))}</span>
              </button>
            `)) : `
              <button class="btn-complete-bounty w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer ${cooldownRemainingMs > 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700/60 cursor-not-allowed shadow-none' : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold'}" ${cooldownRemainingMs > 0 ? 'title="Đang trong thời gian chờ 10 phút giữa các lần nhận thưởng"' : ''}>
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
                <span>${cooldownRemainingMs > 0 ? `Chờ ${Math.ceil(cooldownRemainingMs / 60000)}p` : 'Hoàn Thành'}</span>
              </button>
            `)}
          </div>
        `}
      </div>
    `;

    // Dropdown Action Menu Toggle
    const menuBtn = card.querySelector('.btn-quest-menu');
    const dropdown = card.querySelector('.quest-dropdown-menu');
    if (menuBtn && dropdown) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = dropdown.classList.contains('hidden');
        closeAllCardDropdowns();
        if (willOpen) {
          dropdown.classList.remove('hidden');
          card.classList.add('card-menu-open');
        }
      });
    }

    // Toggle description expand / collapse
    setupCardDescToggle(card, '.quest-desc-text');

    const toggleRepeatBtn = card.querySelector('.btn-toggle-repeat');
    if (toggleRepeatBtn) {
      toggleRepeatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        toggleQuestRepeatable(q.id);
      });
    }

    card.querySelector('.btn-del-quest').addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllCardDropdowns();
      deleteQuest(q.id);
    });

    const debateQuestBtn = card.querySelector('.btn-debate-quest');
    if (debateQuestBtn) {
      debateQuestBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        openQuestRenegotiateModal(q.id);
      });
    }

    const clearSavedBtn = card.querySelector('.btn-clear-saved-timer');
    if (clearSavedBtn) {
      clearSavedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        clearSavedQuestTimer(q.id);
      });
    }

    const restartBtn = card.querySelector('.btn-restart-quest');
    if (restartBtn) {
      restartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        restartQuest(q.id);
      });
    }

    const undoBtn = card.querySelector('.btn-undo-quest');
    if (undoBtn) {
      undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        undoCompleteQuest(q.id);
      });
    }

    const undoRepeatBtn = card.querySelector('.btn-undo-repeat-quest');
    if (undoRepeatBtn) {
      undoRepeatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        undoCompleteQuest(q.id);
      });
    }

    const submitProofBtn = card.querySelector('.btn-submit-quest-proof');
    if (submitProofBtn) {
      submitProofBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        openQuestProofModal(q);
      });
    }

    const startBtn = card.querySelector('.btn-start-focus');
    if (startBtn) {
      startBtn.addEventListener('click', () => startFocusTimer(q));
    }

    const completeFocusDoneBtn = card.querySelector('.btn-complete-focus-done');
    if (completeFocusDoneBtn) {
      completeFocusDoneBtn.addEventListener('click', () => {
        actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);
        focusRemainingSeconds = 0;
        if (isBreakMode) {
          breakTimerFinished();
        } else if (activeRewardItem) {
          rewardTimerFinished();
        } else {
          focusTimerFinished();
        }
      });
    }

    const completeBtn = card.querySelector('.btn-complete-bounty');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => completeQuest(q.id));
    }

    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(refreshAllCardDescToggles);
  }
}

function renderShop() {
  const grid = document.getElementById('shop-grid');
  const countBadge = document.getElementById('badge-shop-count');
  if (countBadge) countBadge.textContent = appState.shopItems.length;
  updateRewardsNavBadge();

  grid.innerHTML = '';

  if (appState.shopItems.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12 sm:py-16 px-4">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-3xl shadow-xs">
          🏪
        </div>
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Cửa Hàng Chưa Bày Bán Phần Thưởng Nào!</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto mb-5">Hãy tạo những phần thưởng bạn yêu thích (ly cà phê, xem phim, mua sách...) và để AI định giá Vàng hợp lý nhé.</p>
        <div class="flex justify-center">
          <button onclick="window.openRewardModal ? window.openRewardModal() : document.getElementById('btn-open-add-reward-nav')?.click()" class="btn-action-reward flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md">
            <span class="text-sm">🎁</span>
            <span>+ Thêm Phần Thưởng Ngay</span>
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Sắp xếp phần thưởng Cửa Hàng: Cực phẩm -> Phổ thông, Giá cao -> thấp
  let items = [...appState.shopItems];
  const tierScores = { legendary: 4, epic: 3, rare: 2, common: 1 };
  items.sort((a, b) => {
    const rawTierA = (a.tier || 'rare').toLowerCase();
    const rawTierB = (b.tier || 'rare').toLowerCase();
    const scoreA = tierScores[rawTierA] ?? 1;
    const scoreB = tierScores[rawTierB] ?? 1;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (b.price || 0) - (a.price || 0);
  });

  // ponytail: batch DOM card insertion via DocumentFragment to eliminate layout thrashing
  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const canAfford = appState.profile.coins >= item.price;
    const coinsNeeded = Math.max(0, item.price - appState.profile.coins);
    const durationMins = extractRewardDuration(item);
    const rawTier = (item.tier || 'rare').toLowerCase();
    const card = document.createElement('div');
    card.className = `rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 relative group reward-card-tier-${rawTier}`;

    const tierColors = REWARD_TIER_COLORS;
    const tierLabels = REWARD_TIER_LABELS;

    card.innerHTML = `
      <div>
        <!-- Zone 1: Header (Value/Price & Operations Menu) -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <div>
            ${durationMins > 0 ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 font-mono text-[11px] font-medium border border-purple-500/20 shadow-xs">
                ⏱️ ${durationMins}p
              </span>
            ` : ''}
          </div>
          <div class="flex items-center gap-1.5 relative">
            <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/25 text-purple-700 dark:text-purple-300 font-mono font-bold text-xs shadow-xs" title="Giá đổi phần thưởng">
              <span class="text-[11px] font-bold text-purple-500">Giá:</span>
              ${COIN_ICON_HTML} <span>${item.price} Vàng</span>
            </div>
            <button type="button" class="btn-shop-menu text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 rounded-lg p-1.5 transition-colors leading-none cursor-pointer" title="Tùy chọn thao tác" aria-label="Tùy chọn thao tác">
              <svg class="w-4 h-4 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </button>
            <div class="shop-dropdown-menu quest-dropdown-menu hidden">
              <div class="quest-dropdown-item cursor-default text-slate-600 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60 pb-1.5 mb-1">
                <span>Phân cấp:</span>
                <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded ml-auto font-bold border tracking-wider shadow-xs whitespace-nowrap shrink-0 ${tierColors[rawTier] || tierColors.rare}">
                  ${tierLabels[rawTier] || (item.tier || 'CAO CẤP').toUpperCase()}
                </span>
              </div>
              <button type="button" class="btn-debate-shop-item quest-dropdown-item text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 dark:hover:bg-purple-500/20 cursor-pointer" title="Thương lượng lại phần thưởng với AI">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span>Thương lượng AI</span>
              </button>
              <button type="button" class="btn-del-shop-item quest-dropdown-item text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 cursor-pointer" title="Xóa phần thưởng khỏi Cửa Hàng">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                <span>Xóa phần thưởng</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Zone 2: Body (Title & Standardized Clamped Context) -->
        <div class="flex items-start gap-3 my-2">
          <div class="w-11 h-11 rounded-xl bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/25 flex items-center justify-center text-2xl shadow-xs shrink-0">
            ${escapeHtml(item.icon || '🎁')}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">${escapeHtml(item.name)}</h3>
            ${item.description ? `
              <div class="mt-1">
                <p class="reward-desc-text text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed break-words">${escapeHtml(item.description)}</p>
                <button type="button" class="btn-toggle-desc hidden text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer block mt-0.5">...xem thêm</button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div>
        <!-- Zone 3: Meta & Progress Strip (Affordability) -->
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <span class="text-[11px] font-medium ${canAfford ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-500 dark:text-rose-400'} inline-flex items-center gap-1">
            ${canAfford ? `
              <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
              <span>Đủ Vàng đổi ngay</span>
            ` : `
              <svg class="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/><line x1="12" y1="16" x2="12.01" stroke-width="2"/></svg>
              <span>Còn thiếu ${coinsNeeded} Vàng</span>
            `}
          </span>
        </div>

        <!-- Zone 4: Footer (Action Command Zone) -->
        <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800">
          <button class="btn-buy-item w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer ${canAfford ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200/60 dark:border-slate-700/60'}" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' : ''}
            <span>${canAfford ? (durationMins > 0 ? `Đổi & Bấm Giờ (${durationMins}p)` : 'Đổi Quà Ngay') : 'Chưa Đủ Vàng'}</span>
          </button>
        </div>
      </div>
    `;

    // Dropdown Action Menu Toggle
    const menuBtn = card.querySelector('.btn-shop-menu');
    const dropdown = card.querySelector('.shop-dropdown-menu');
    if (menuBtn && dropdown) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = dropdown.classList.contains('hidden');
        closeAllCardDropdowns();
        if (willOpen) {
          dropdown.classList.remove('hidden');
          card.classList.add('card-menu-open');
        }
      });
    }

    // Toggle description expand / collapse
    setupCardDescToggle(card, '.reward-desc-text');

    card.querySelector('.btn-del-shop-item').addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllCardDropdowns();
      deleteShopItem(item.id);
    });

    const debateShopBtn = card.querySelector('.btn-debate-shop-item');
    if (debateShopBtn) {
      debateShopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        openRewardRenegotiateModal(item.id);
      });
    }

    card.querySelector('.btn-buy-item').addEventListener('click', () => {
      buyShopItem(item.id);
    });

    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(refreshAllCardDescToggles);
  }
}

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  const empty = document.getElementById('inventory-empty');
  const countBadge = document.getElementById('badge-inventory-count');

  const totalInvCount = Array.isArray(appState.inventory) ? appState.inventory.length : 0;
  if (countBadge) countBadge.textContent = totalInvCount;
  updateRewardsNavBadge();

  if (appState.inventory.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = '';

  // Sắp xếp Kho Quà: Đang dùng ghim đầu, Chưa dùng xếp trước Đã dùng, Quà chưa dùng xếp Tier cao -> thấp
  let invItems = [...appState.inventory];
  const tierScores = { legendary: 4, epic: 3, rare: 2, common: 1 };
  invItems.sort((a, b) => {
    const aActive = (activeRewardItem && activeRewardItem.id === a.id) ? 1 : 0;
    const bActive = (activeRewardItem && activeRewardItem.id === b.id) ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;

    const aUsed = a.isUsed ? 1 : 0;
    const bUsed = b.isUsed ? 1 : 0;
    if (aUsed !== bUsed) return aUsed - bUsed;

    if (!a.isUsed && !b.isUsed) {
      const scoreA = tierScores[(a.tier || 'rare').toLowerCase()] ?? 1;
      const scoreB = tierScores[(b.tier || 'rare').toLowerCase()] ?? 1;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (b.price || 0) - (a.price || 0);
    }
    return (b.purchasedAt || 0) - (a.purchasedAt || 0);
  });

  // ponytail: batch DOM card insertion via DocumentFragment to eliminate layout thrashing
  const fragment = document.createDocumentFragment();
  invItems.forEach(item => {
    const isThisActiveReward = Boolean(activeRewardItem && activeRewardItem.id === item.id);
    const hasSavedTimer = Boolean(item.savedTimer && item.savedTimer.remainingSeconds > 0);
    const durationMins = extractRewardDuration(item);
    const rawTier = (item.tier || 'rare').toLowerCase();
    const canUndo = isThisActiveReward || (item.isUsed && item.usedAt && (Date.now() - item.usedAt <= 5 * 60 * 1000));
    const card = document.createElement('div');
    card.className = `rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 relative group reward-card-tier-${rawTier} ${
      isThisActiveReward
        ? 'ring-2 ring-purple-500 shadow-xl shadow-purple-500/20 bg-purple-500/5 border-purple-500/50'
        : (hasSavedTimer
          ? 'ring-1 ring-sky-500/50 shadow-md shadow-sky-500/10'
          : (item.isUsed ? 'opacity-70 bg-slate-100/50 dark:bg-slate-950/30' : ''))
    }`;

    card.innerHTML = `
      <div>
        <!-- Zone 1: Header (Status & Operations Menu) -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2">
            ${isThisActiveReward ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500 text-white shadow-xs animate-pulse">
                ĐANG DÙNG
              </span>
            ` : hasSavedTimer ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-500 text-slate-950 shadow-xs" title="Thời gian đang được bảo lưu">
                ⏸️ BẢO LƯU (${Math.ceil(item.savedTimer.remainingSeconds / 60)}P)
              </span>
            ` : item.isUsed ? `
              <span class="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300/40 dark:border-slate-700/40">
                ĐÃ DÙNG
              </span>
            ` : `
              <span class="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 tracking-wider">
                CHƯA DÙNG
              </span>
            `}
          </div>
          <div class="flex items-center gap-1.5 relative">
            <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/25 text-purple-700 dark:text-purple-300 font-mono font-bold text-xs shadow-xs" title="Giá trị phần thưởng">
              <span class="text-[11px] font-bold text-purple-500">Trị giá:</span>
              ${COIN_ICON_HTML} <span>${item.price} Vàng</span>
            </div>
            <button type="button" class="btn-inv-menu text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 rounded-lg p-1.5 transition-colors leading-none cursor-pointer" title="Tùy chọn thao tác" aria-label="Tùy chọn thao tác">
              <svg class="w-4 h-4 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </button>
            <div class="inv-dropdown-menu quest-dropdown-menu hidden">
              <div class="quest-dropdown-item cursor-default text-slate-600 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60 pb-1.5 mb-1">
                <span>Phân cấp:</span>
                <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded ml-auto font-bold border tracking-wider shadow-xs whitespace-nowrap shrink-0 ${REWARD_TIER_COLORS[rawTier] || REWARD_TIER_COLORS.rare}">
                  ${REWARD_TIER_LABELS[rawTier] || (item.tier || 'CAO CẤP').toUpperCase()}
                </span>
              </div>
              ${hasSavedTimer ? `
                <button type="button" class="btn-clear-saved-reward quest-dropdown-item text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 cursor-pointer" title="Hủy bảo lưu (Kết thúc quà)">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
                  <span>Kết thúc quà (Hủy bảo lưu)</span>
                </button>
              ` : (!item.isUsed ? `
                <button type="button" class="btn-refund-inv quest-dropdown-item text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 cursor-pointer" title="Hoàn trả và nhận lại Vàng">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
                  <span>Trả quà nhận lại Vàng</span>
                </button>
              ` : (canUndo ? `
                <button type="button" class="btn-undo-inv quest-dropdown-item text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 cursor-pointer" title="Đánh dấu chưa sử dụng">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
                  <span>Hoàn tác (Đánh dấu chưa dùng)</span>
                </button>
              ` : ''))}
              <button type="button" class="btn-del-inv quest-dropdown-item text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 cursor-pointer" title="Xóa khỏi Kho Quà">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                <span>Xóa khỏi kho</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Zone 2: Body (Title & Readable Context) -->
        <div class="flex items-start gap-3 my-2">
          <div class="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl shadow-xs shrink-0">
            ${escapeHtml(item.icon || '🎁')}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 ${(item.isUsed && !isThisActiveReward && !hasSavedTimer) ? 'text-slate-400 dark:text-slate-500' : ''}">${escapeHtml(item.name)}</h4>
            ${item.description ? `
              <div class="mt-1">
                <p class="reward-desc-text text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed break-words">${escapeHtml(item.description)}</p>
                <button type="button" class="btn-toggle-desc hidden text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer block mt-0.5">...xem thêm</button>
              </div>
            ` : ''}
            <p class="mt-1 text-xs text-slate-400 dark:text-slate-500 font-mono">Đã đổi: ${new Date(item.purchasedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div>
        <!-- Zone 3: Meta & Progress Strip (Duration info) -->
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <span class="text-[11px] font-medium text-purple-700 dark:text-purple-300 font-mono inline-flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
            <span>Hiệu lực: <strong class="font-bold">${durationMins > 0 ? `${durationMins} phút` : 'Dùng ngay'}</strong>${hasSavedTimer ? ` <span class="text-sky-600 dark:text-sky-400 font-bold">(còn ${Math.ceil(item.savedTimer.remainingSeconds / 60)}p)</span>` : ''}</span>
          </span>
          ${item.isUsed && !isThisActiveReward && !hasSavedTimer ? `<span class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">${durationMins > 0 ? 'Đã kết thúc' : 'Đã sử dụng'}</span>` : ''}
        </div>

        <!-- Zone 4: Footer (Action Command Zone) -->
        ${isThisActiveReward ? `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <button class="btn-scroll-timer flex-1 py-2 px-3 rounded-lg bg-purple-600/15 border border-purple-500/30 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer" title="Xem bộ đếm thời gian">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
              <span>${isFocusRunning ? 'Đang Đếm Giờ' : 'Tạm Dừng'}</span>
            </button>
            <button class="btn-undo-inv px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 active:scale-95 cursor-pointer" title="Đánh dấu chưa sử dụng">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
              <span>Hoàn tác</span>
            </button>
          </div>
        ` : hasSavedTimer ? `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <button class="btn-use-inv flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer" title="Tiếp tục sử dụng phần thưởng đã bảo lưu">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Tiếp Tục Dùng (${Math.ceil(item.savedTimer.remainingSeconds / 60)}p)</span>
            </button>
            <button class="btn-clear-saved-reward px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 active:scale-95 cursor-pointer" title="Kết thúc quà (hủy thời gian bảo lưu)">
              <span>Kết thúc</span>
            </button>
          </div>
        ` : item.isUsed ? `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
              <span>${durationMins > 0 ? 'Đã kết thúc' : 'Đã sử dụng'}</span>
            </span>
            ${canUndo ? `
              <button class="btn-undo-inv px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 active:scale-95 cursor-pointer" title="Đánh dấu chưa sử dụng">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
                <span>Hoàn tác</span>
              </button>
            ` : ''}
          </div>
        ` : `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800">
            <button class="btn-use-inv w-full py-2 px-3 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>${durationMins > 0 ? `Dùng Quà (${durationMins}p)` : 'Dùng Quà'}</span>
            </button>
          </div>
        `}
      </div>
    `;

    // Dropdown Action Menu Toggle
    const menuBtn = card.querySelector('.btn-inv-menu');
    const dropdown = card.querySelector('.inv-dropdown-menu');
    if (menuBtn && dropdown) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = dropdown.classList.contains('hidden');
        closeAllCardDropdowns();
        if (willOpen) {
          dropdown.classList.remove('hidden');
          card.classList.add('card-menu-open');
        }
      });
    }

    const scrollTimerBtn = card.querySelector('.btn-scroll-timer');
    if (scrollTimerBtn) {
      scrollTimerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

    const delInvBtn = card.querySelector('.btn-del-inv');
    if (delInvBtn) {
      delInvBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        deleteInventoryItem(item.id);
      });
    }

    const refundBtn = card.querySelector('.btn-refund-inv');
    if (refundBtn) {
      refundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        refundInventoryItem(item.id);
      });
    }

    card.querySelectorAll('.btn-undo-inv').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        undoUseInventoryItem(item.id);
      });
    });

    const useBtn = card.querySelector('.btn-use-inv');
    if (useBtn) {
      useBtn.addEventListener('click', () => useInventoryItem(item.id));
    }

    card.querySelectorAll('.btn-clear-saved-reward').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        clearSavedRewardTimer(item.id);
      });
    });

    // Toggle description expand / collapse
    setupCardDescToggle(card, '.reward-desc-text');

    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(refreshAllCardDescToggles);
  }
}

function addLedgerEntry(entry) {
  if (!Array.isArray(appState.ledger)) appState.ledger = [];
  appState.ledger.unshift(entry);
  // ponytail: Giới hạn 100 bản ghi để giữ payload đồng bộ < 50KB và tránh đầy localStorage
  if (appState.ledger.length > 100) {
    appState.ledger = appState.ledger.slice(0, 100);
  }
}

let currentLedgerFilter = 'all';
let currentLedgerPage = 1;
const LEDGER_PAGE_SIZE = 10; // ponytail: Cố định 10 giao dịch/trang, nâng cấp dropdown chọn page size nếu người dùng yêu cầu

function changeLedgerPage(delta) {
  currentLedgerPage += delta;
  renderLedger();
}
window.changeLedgerPage = changeLedgerPage;

function setLedgerFilter(filter) {
  currentLedgerFilter = filter;
  currentLedgerPage = 1;
  const filterBtns = {
    all: document.getElementById('ledger-filter-all'),
    earn: document.getElementById('ledger-filter-earn'),
    spend: document.getElementById('ledger-filter-spend'),
    bank: document.getElementById('ledger-filter-bank')
  };
  Object.entries(filterBtns).forEach(([k, btn]) => {
    if (!btn) return;
    if (k === filter) {
      btn.className = 'ledger-filter-btn px-3 py-1 rounded-xl text-xs font-bold transition bg-sky-500 text-white shadow-xs shadow-sky-500/20 cursor-pointer';
    } else {
      btn.className = 'ledger-filter-btn px-3 py-1 rounded-xl text-xs font-semibold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer';
    }
  });
  renderLedger();
}
window.setLedgerFilter = setLedgerFilter;

function groupLedgerByDate(entries) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  return entries.reduce((groups, item) => {
    const ts = parseInt(item.timestamp, 10) || Date.now();
    const d = new Date(ts).toDateString();
    const label = d === today ? 'Hôm nay' : (d === yesterday ? 'Hôm qua' : new Date(ts).toLocaleDateString('vi-VN'));
    (groups[label] = groups[label] || []).push(item);
    return groups;
  }, {});
}

function renderLedger() {
  const list = document.getElementById('ledger-list');
  if (!list) return;

  // ponytail: Tự động dọn dẹp các bản ghi "Khôi phục Danh dự" bị duplicate nếu có trong bộ nhớ
  if (Array.isArray(appState.ledger)) {
    const hasPenalty = (appState.profile?.cheatStrikes || 0) > 0 || appState.ledger.some(l => l.category === 'penalty' || l.id?.startsWith('penalty_'));
    let seenHonor = false;
    appState.ledger = appState.ledger.filter(item => {
      const isHonor = item.title === 'Khôi phục Danh dự' || item.id?.startsWith('honor_restored_');
      if (!isHonor) return true;
      if (!hasPenalty) return false;
      if (seenHonor) return false;
      seenHonor = true;
      return true;
    });
  }

  const ledger = Array.isArray(appState.ledger) ? appState.ledger : [];

  // 1. Cập nhật thống kê nhanh trong ngày & Ngân Hàng
  const todayStr = new Date().toDateString();
  let todayEarn = 0;
  let todaySpend = 0;
  ledger.forEach(e => {
    if (new Date(e.timestamp || 0).toDateString() === todayStr) {
      const amt = Math.max(0, parseInt(e.amount, 10) || 0);
      if (e.type === 'earn') todayEarn += amt;
      else if (e.type === 'spend') todaySpend += amt;
    }
  });

  const earnEl = document.getElementById('ledger-stat-earn');
  const spendEl = document.getElementById('ledger-stat-spend');
  if (earnEl) earnEl.innerHTML = `+${todayEarn} ${COIN_ICON_HTML}`;
  if (spendEl) spendEl.innerHTML = `-${todaySpend} ${COIN_ICON_HTML}`;

  const bankDepositEl = document.getElementById('ledger-stat-bank-deposit');
  const bankDebtEl = document.getElementById('ledger-stat-bank-debt');
  const userBank = appState.profile?.bank || {};
  if (bankDepositEl) {
    const totalSaving = (parseInt(userBank.deposited, 10) || 0) + (parseInt(userBank.depositInterest, 10) || 0);
    bankDepositEl.innerHTML = `${totalSaving} ${COIN_ICON_HTML}`;
  }
  if (bankDebtEl) {
    const currentDebt = parseInt(userBank.loan?.debt, 10) || 0;
    bankDebtEl.innerHTML = `${currentDebt} ${COIN_ICON_HTML}`;
  }

  // 2. Lọc theo danh mục (Tất cả / Thu / Chi / Ngân Hàng)
  const filtered = ledger.filter(e => {
    if (currentLedgerFilter === 'all') return true;
    if (currentLedgerFilter === 'bank') {
      return typeof e.category === 'string' && (e.category.startsWith('bank_') || ['bank_deposit', 'bank_withdraw', 'bank_borrow', 'bank_repay', 'bank_deduct'].includes(e.category));
    }
    return e.type === currentLedgerFilter;
  });
  const paginationEl = document.getElementById('ledger-pagination');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="text-center py-8 text-slate-500 text-xs">Chưa có giao dịch vàng nào được ghi nhận.</div>';
    if (paginationEl) paginationEl.classList.add('hidden');
    return;
  }

  const totalPages = Math.ceil(filtered.length / LEDGER_PAGE_SIZE) || 1;
  if (currentLedgerPage > totalPages) currentLedgerPage = totalPages;
  if (currentLedgerPage < 1) currentLedgerPage = 1;

  const startIdx = (currentLedgerPage - 1) * LEDGER_PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + LEDGER_PAGE_SIZE);

  // 3. Gom nhóm theo ngày và hiển thị
  const grouped = groupLedgerByDate(pageItems);
  list.innerHTML = Object.entries(grouped).map(([dateLabel, items]) => `
    <div>
      <div class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
        <span>📅</span> <span>${dateLabel}</span>
      </div>
      <div class="space-y-2">
        ${items.map(entry => {
          const isEarn = entry.type === 'earn';
          const isBank = typeof entry.category === 'string' && entry.category.startsWith('bank_');

          // ponytail: Phân loại icon và badge trực quan cho giao dịch Ngân Hàng, Nhiệm vụ và Đổi quà
          let icon = isEarn ? '📥' : '📤';
          let categoryBadge = '';
          if (entry.category === 'bank_deposit') {
            icon = '🏦';
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Tiết Kiệm</span>';
          } else if (entry.category === 'bank_withdraw') {
            icon = '💰';
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">Rút Tiền</span>';
          } else if (entry.category === 'bank_borrow') {
            icon = '⚡';
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">Vay Vàng</span>';
          } else if (entry.category === 'bank_repay') {
            icon = '💳';
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">Trả Nợ</span>';
          } else if (entry.category === 'bank_deduct') {
            icon = '✂️';
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400">Trích Nợ</span>';
          } else if (entry.category === 'quest') {
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">Nhiệm Vụ</span>';
          } else if (entry.category === 'reward') {
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">Đổi Quà</span>';
          }

          const timeStr = new Date(entry.timestamp || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const displayTitle = entry.title || entry.description || 'Giao dịch';
          const displayDesc = entry.description && entry.description !== entry.title ? entry.description : '';

          return `
            <div class="ledger-item p-3 rounded-xl bg-white dark:bg-slate-900/60 border ${isBank ? 'border-amber-500/20' : 'border-slate-200 dark:border-slate-800'} flex items-start justify-between gap-3 text-xs shadow-xs transition-all">
              <div class="flex items-start gap-2.5 min-w-0 flex-1">
                <span class="text-base shrink-0 mt-0.5">${icon}</span>
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                    ${categoryBadge}
                    <span class="truncate">${escapeHtml(displayTitle)}</span>
                  </div>
                  <div class="ledger-desc-container mt-0.5">
                    <div class="ledger-desc-content text-[10px] text-slate-400 truncate cursor-pointer transition-colors hover:text-slate-600 dark:hover:text-slate-300" title="Nhấn để xem thêm / thu gọn">
                      <span class="font-mono">${timeStr}</span>${displayDesc ? ` · <span class="ledger-desc-text">${escapeHtml(displayDesc)}</span>` : ''}
                    </div>
                    ${displayDesc ? `<button type="button" class="btn-toggle-ledger-desc hidden text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer block mt-0.5">...xem thêm</button>` : ''}
                  </div>
                </div>
              </div>
              <div class="font-mono font-bold text-sm shrink-0 inline-flex items-center gap-1 ${isEarn ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'} pt-0.5">
                <span>${isEarn ? '+' : '-'}${entry.amount || 0}</span> ${COIN_ICON_HTML}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  // 4. Cập nhật thanh phân trang
  if (paginationEl) {
    if (totalPages <= 1) {
      paginationEl.classList.add('hidden');
    } else {
      paginationEl.classList.remove('hidden');
      const prevBtn = document.getElementById('ledger-prev-btn');
      const nextBtn = document.getElementById('ledger-next-btn');
      const pageInfo = document.getElementById('ledger-page-info');
      if (prevBtn) prevBtn.disabled = currentLedgerPage <= 1;
      if (nextBtn) nextBtn.disabled = currentLedgerPage >= totalPages;
      if (pageInfo) pageInfo.textContent = `Trang ${currentLedgerPage} / ${totalPages} (${filtered.length} giao dịch)`;
    }
  }

  // 5. Kích hoạt cơ chế Xem thêm / Thu gọn cho các thẻ lịch sử
  setupLedgerDescToggles();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(setupLedgerDescToggles);
  }
}

/**
 * Tự động đo đạc và quản lý nút "...xem thêm" / "Thu gọn ▲" cho thẻ Lịch sử (Ledger).
 * Mặc định: 1 dòng (truncate).
 * Chỉ hiện nút toggle khi nội dung vượt quá 1 dòng trên màn hình thiết bị.
 * Cho phép nhấn nút toggle hoặc nhấn trực tiếp vào dòng mô tả để mở rộng / thu gọn.
 */
function setupLedgerDescToggles() {
  const list = document.getElementById('ledger-list');
  if (!list) return;
  const items = list.querySelectorAll('.ledger-item');
  items.forEach(item => {
    const descContent = item.querySelector('.ledger-desc-content');
    const toggleBtn = item.querySelector('.btn-toggle-ledger-desc');
    if (!descContent || !toggleBtn) return;

    const checkOverflow = () => {
      if (descContent.classList.contains('expanded')) return;
      const isVisible = descContent.clientWidth > 0;
      // Tràn khi độ rộng thực tế vượt quá độ rộng nhìn thấy (dung sai 1px cho subpixel rendering),
      // hoặc nếu tab đang ẩn thì dựa vào độ dài ký tự (> 35 ký tự)
      const isOverflowing = isVisible
        ? (descContent.scrollWidth > descContent.clientWidth + 1)
        : (descContent.textContent.trim().length > 35);

      if (isOverflowing) {
        toggleBtn.classList.remove('hidden');
      } else {
        toggleBtn.classList.add('hidden');
      }
    };

    if (!item.dataset.toggleBound) {
      item.dataset.toggleBound = 'true';
      const toggleExpand = (e) => {
        if (e) e.stopPropagation();
        const isExpanded = descContent.classList.contains('expanded');
        if (isExpanded) {
          descContent.classList.remove('expanded');
          descContent.classList.add('truncate');
          toggleBtn.textContent = '...xem thêm';
        } else {
          descContent.classList.remove('truncate');
          descContent.classList.add('expanded');
          toggleBtn.textContent = 'Thu gọn ▲';
        }
      };

      toggleBtn.addEventListener('click', toggleExpand);
      descContent.addEventListener('click', (e) => {
        if (!toggleBtn.classList.contains('hidden')) {
          toggleExpand(e);
        }
      });
    }

    checkOverflow();
  });
}
window.setupLedgerDescToggles = setupLedgerDescToggles;

function renderAll() {
  renderHeader();
  renderQuests();
  renderShop();
  renderInventory();
  renderLedger();
  updateAdminNavVisibility();
}

function renderSkeletons() {
  const heroAvatar = document.getElementById('hero-avatar');
  const heroNick = document.getElementById('hero-nickname');
  const heroTitle = document.getElementById('hero-title');
  const heroLvl = document.getElementById('hero-level-badge');
  const heroExp = document.getElementById('hero-exp-text');
  const heroCoins = document.getElementById('hero-coins');

  if (heroAvatar) heroAvatar.innerHTML = '<div class="w-full h-full bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg"></div>';
  if (heroNick) heroNick.innerHTML = '<span class="inline-block w-16 h-3.5 bg-slate-200 dark:bg-slate-700 animate-pulse rounded"></span>';
  if (heroTitle) heroTitle.innerHTML = '<span class="inline-block w-20 h-2.5 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></span>';
  if (heroLvl) heroLvl.innerHTML = '<span class="inline-block w-8 h-3.5 bg-slate-200 dark:bg-slate-700 animate-pulse rounded"></span>';
  if (heroExp) heroExp.innerHTML = '<span class="inline-block w-10 h-2.5 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></span>';
  if (heroCoins) heroCoins.innerHTML = '<span class="inline-block w-8 h-4 bg-slate-200 dark:bg-slate-700 animate-pulse rounded"></span>';

  // ponytail: Khởi tạo skeleton cards chuẩn cấu trúc RPG Card để chống chớp nháy và lệch layout (Anti-FOUC)
  const questSkeletonCard = `
    <div class="rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between animate-pulse min-h-[220px]">
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="h-6 w-16 bg-slate-200 dark:bg-slate-800/80 rounded-lg"></div>
          <div class="h-6 w-20 bg-slate-200 dark:bg-slate-800/80 rounded-lg"></div>
        </div>
        <div class="space-y-2 my-2">
          <div class="h-5 w-4/5 bg-slate-200 dark:bg-slate-800/80 rounded-md"></div>
          <div class="h-3.5 w-full bg-slate-100 dark:bg-slate-800/50 rounded"></div>
          <div class="h-3.5 w-2/3 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
        </div>
      </div>
      <div>
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <div class="h-4 w-24 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
          <div class="h-4 w-12 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
        </div>
        <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
          <div class="h-9 flex-1 bg-slate-200 dark:bg-slate-800/80 rounded-xl"></div>
          <div class="h-9 flex-1 bg-slate-200 dark:bg-slate-800/80 rounded-xl"></div>
        </div>
      </div>
    </div>
  `;

  const questsGrid = document.getElementById('quests-grid') || document.getElementById('quest-list');
  const questsEmpty = document.getElementById('quests-empty');
  if (questsEmpty) questsEmpty.classList.add('hidden');
  if (questsGrid) {
    questsGrid.innerHTML = Array(6).fill(questSkeletonCard).join('');
  }

  const shopSkeletonCard = `
    <div class="rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between animate-pulse min-h-[220px]">
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="h-6 w-16 bg-slate-200 dark:bg-slate-800/80 rounded-lg"></div>
          <div class="h-6 w-20 bg-slate-200 dark:bg-slate-800/80 rounded-lg"></div>
        </div>
        <div class="flex items-start gap-3 my-2">
          <div class="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800/80 shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="h-5 w-4/5 bg-slate-200 dark:bg-slate-800/80 rounded-md"></div>
            <div class="h-3.5 w-full bg-slate-100 dark:bg-slate-800/50 rounded"></div>
          </div>
        </div>
      </div>
      <div>
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <div class="h-4 w-28 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
        </div>
        <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800">
          <div class="h-9 w-full bg-slate-200 dark:bg-slate-800/80 rounded-xl"></div>
        </div>
      </div>
    </div>
  `;

  const shopGrid = document.getElementById('shop-grid') || document.getElementById('shop-list');
  const shopEmpty = document.getElementById('shop-empty');
  if (shopEmpty) shopEmpty.classList.add('hidden');
  if (shopGrid) {
    shopGrid.innerHTML = Array(6).fill(shopSkeletonCard).join('');
  }

  const inventoryGrid = document.getElementById('inventory-grid');
  const inventoryEmpty = document.getElementById('inventory-empty');
  if (inventoryEmpty) inventoryEmpty.classList.add('hidden');
  if (inventoryGrid) {
    inventoryGrid.innerHTML = Array(3).fill(shopSkeletonCard).join('');
  }

  const ledgerList = document.getElementById('ledger-list');
  if (ledgerList) {
    ledgerList.innerHTML = Array(3).fill(0).map(() => `
      <div class="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-pulse flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          <div class="space-y-1.5">
            <div class="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div class="h-2.5 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
        </div>
        <div class="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>
    `).join('');
  }

  const earnEl = document.getElementById('ledger-stat-earn');
  const spendEl = document.getElementById('ledger-stat-spend');
  if (earnEl) earnEl.innerHTML = '<span class="inline-block w-12 h-4 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></span>';
  if (spendEl) spendEl.innerHTML = '<span class="inline-block w-12 h-4 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></span>';
}

// =============================================================================
// 13. MODAL & NAVIGATION CONTROLLERS (Mobile Bottom Bar + Desktop Top Tabs)
// =============================================================================
function updateRewardsNavBadge() {
  const totalRewardsBadge = document.getElementById('badge-rewards-total');
  const unusedCount = Array.isArray(appState.inventory) ? appState.inventory.length : 0;
  if (totalRewardsBadge) totalRewardsBadge.textContent = unusedCount;
  const countBadge = document.getElementById('badge-inventory-count');
  if (countBadge) countBadge.textContent = unusedCount;
}

function switchRewardSubtab(subtab) {
  const btnShop = document.getElementById('subtab-btn-shop');
  const btnInv = document.getElementById('subtab-btn-inventory');
  const paneShop = document.getElementById('subtab-pane-shop');
  const paneInv = document.getElementById('subtab-pane-inventory');

  const baseClass = 'reward-subtab flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs transition';
  const activeClass = `${baseClass} active font-bold bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm`;
  const inactiveClass = `${baseClass} font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200`;

  if (subtab === 'inventory') {
    if (btnShop) btnShop.className = inactiveClass;
    if (btnInv) btnInv.className = activeClass;
    if (paneShop) paneShop.classList.add('hidden');
    if (paneInv) paneInv.classList.remove('hidden');
    if (typeof renderInventory === 'function') {
      renderInventory();
    }
  } else {
    if (btnShop) btnShop.className = activeClass;
    if (btnInv) btnInv.className = inactiveClass;
    if (paneShop) paneShop.classList.remove('hidden');
    if (paneInv) paneInv.classList.add('hidden');
    if (typeof renderShop === 'function') {
      renderShop();
    }
  }

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(refreshAllCardDescToggles);
  }
}
window.switchRewardSubtab = switchRewardSubtab;

function openLevelInfoModal() {
  const p = appState.profile;
  const expNeeded = p.level * 100;
  const expRemaining = Math.max(0, expNeeded - p.exp);
  const pct = Math.min(100, Math.round((p.exp / expNeeded) * 100));

  const curBadge = document.getElementById('modal-level-current-badge');
  const curTitle = document.getElementById('modal-level-current-title');
  const expRatio = document.getElementById('modal-level-exp-ratio');
  const expBar = document.getElementById('modal-level-exp-bar');
  const neededText = document.getElementById('modal-level-needed-text');

  if (curBadge) curBadge.textContent = `LV. ${p.level}`;
  if (curTitle) curTitle.textContent = p.title || 'Tân Binh Cấp 1';
  if (expRatio) expRatio.textContent = `${p.exp}/${expNeeded} EXP (${pct}%)`;
  if (expBar) expBar.style.width = `${pct}%`;
  if (neededText) {
    neededText.textContent = `Cần thêm ${expRemaining} EXP nữa để lên LV. ${p.level + 1}`;
  }

  const modal = document.getElementById('modal-level-info');
  if (modal) modal.classList.remove('hidden');
}
window.openLevelInfoModal = openLevelInfoModal;

function openStreakInfoModal() {
  const p = appState.profile;
  if (!p) return;

  const streak = Math.max(0, parseInt(p.streak, 10) || 0);
  const streakStatusInfo = getDailyStreakStatus(p);
  const bonusPct = getStreakBonusPercent(streak);
  const streakTitle = getStreakTitle(streak);
  const nextMilestone = getNextStreakMilestone(streak);

  const daysCountEl = document.getElementById('modal-streak-days-count');
  if (daysCountEl) daysCountEl.textContent = streak;

  const titleEl = document.getElementById('modal-streak-tier-title');
  if (titleEl) titleEl.textContent = streakTitle;

  const statusEl = document.getElementById('modal-streak-today-status');
  if (statusEl) {
    if (streakStatusInfo.status === 'active_today') {
      statusEl.className = 'p-2.5 rounded-xl text-[11px] font-medium flex items-center gap-2 border bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300';
      statusEl.innerHTML = `
        <span class="text-base shrink-0">✅</span>
        <div class="min-w-0">
          <div class="font-bold">Chuỗi hôm nay đã được bảo vệ an toàn!</div>
          <div class="text-[10px] text-slate-500 dark:text-slate-400">Bạn đã hoàn thành nhiệm vụ hôm nay. Hãy quay lại vào ngày mai để tiếp tục nâng chuỗi nhé!</div>
        </div>
      `;
    } else if (streakStatusInfo.status === 'waiting_today') {
      statusEl.className = 'p-2.5 rounded-xl text-[11px] font-medium flex items-center gap-2 border bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300';
      statusEl.innerHTML = `
        <span class="text-base shrink-0">⏳</span>
        <div class="min-w-0">
          <div class="font-bold">Chưa hoàn thành nhiệm vụ hôm nay!</div>
          <div class="text-[10px] text-slate-500 dark:text-slate-400">Hãy hoàn thành ít nhất 1 nhiệm vụ trước 23:59 để tăng chuỗi lên ${streak + 1} ngày và nhận thưởng.</div>
        </div>
      `;
    } else {
      statusEl.className = 'p-2.5 rounded-xl text-[11px] font-medium flex items-center gap-2 border bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300';
      statusEl.innerHTML = `
        <span class="text-base shrink-0">⚠️</span>
        <div class="min-w-0">
          <div class="font-bold">Chuỗi đã bị gián đoạn!</div>
          <div class="text-[10px] text-slate-500 dark:text-slate-400">Bạn đã bỏ lỡ ngày hôm qua. Hoàn thành 1 nhiệm vụ hôm nay để thắp lại ngọn lửa chuỗi mới!</div>
        </div>
      `;
    }
  }

  const perkQuestEl = document.getElementById('modal-streak-perk-quest');
  if (perkQuestEl) perkQuestEl.textContent = `+${bonusPct}% Vàng & EXP`;

  const perkQuestNextEl = document.getElementById('modal-streak-perk-quest-next');
  if (perkQuestNextEl) perkQuestNextEl.textContent = nextMilestone.label;

  const perkCreditEl = document.getElementById('modal-streak-perk-credit');
  if (perkCreditEl) perkCreditEl.textContent = `+${streak * 5} Vàng`;

  // Render weekly 7-day dots tracker
  const trackerEl = document.getElementById('modal-streak-week-tracker');
  if (trackerEl) {
    const today = new Date();
    const history = Array.isArray(p.streakHistory) ? p.streakHistory : [];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    let html = '';

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = getLocalDayString(d);
      const dayOfWeek = dayNames[d.getDay()];
      const isToday = i === 0;
      const isCompleted = history.includes(dayStr);

      html += `
        <div class="flex flex-col items-center gap-1 p-1 sm:p-1.5 rounded-xl border transition-all ${
          isToday
            ? 'streak-day-card today bg-orange-500/15 border-orange-500/50'
            : isCompleted
              ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              : 'bg-slate-100/60 dark:bg-slate-950/60 border-slate-200/50 dark:border-slate-800/50 opacity-60'
        }">
          <span class="text-[9px] font-bold ${isToday ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}">${dayOfWeek}</span>
          <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs ${
            isCompleted
              ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm'
              : isToday
                ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-dashed border-orange-500/50 animate-pulse'
                : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400'
          }">
            ${isCompleted ? '🔥' : isToday ? '⏳' : '·'}
          </div>
          <span class="text-[8px] font-mono text-slate-400">${d.getDate()}/${d.getMonth() + 1}</span>
        </div>
      `;
    }
    trackerEl.innerHTML = html;
  }

  const modal = document.getElementById('modal-streak-info');
  if (modal) modal.classList.remove('hidden');
}
window.openStreakInfoModal = openStreakInfoModal;

function switchTab(tabId) {
  // Graceful fallback / redirect for legacy 'inventory' tab links
  if (tabId === 'inventory') {
    tabId = 'shop';
    switchRewardSubtab('inventory');
  }

  const isAdmin = isUserAdmin();
  const isMoreTab = ['leaderboard', 'ledger', 'bank', 'admin'].includes(tabId);

  // Full Archetype RPG Color Matrix
  const tabColorTheme = {
    quests: {
      desktop: 'active bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs font-bold',
      mobile: 'active bg-amber-500/15 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
    },
    shop: {
      desktop: 'active bg-purple-500/15 dark:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/40 shadow-xs font-bold',
      mobile: 'active bg-purple-500/15 dark:bg-purple-400/20 text-purple-700 dark:text-purple-300 font-bold shadow-xs'
    },
    leaderboard: {
      desktop: 'active bg-yellow-500/15 dark:bg-yellow-500/25 text-yellow-700 dark:text-yellow-300 border border-yellow-500/40 shadow-xs font-bold',
      mobile: 'active bg-yellow-500/15 dark:bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 font-bold shadow-xs',
      itemDesktop: 'active bg-yellow-500/15 dark:bg-yellow-500/25 text-yellow-700 dark:text-yellow-300 font-bold',
      itemMobile: 'active bg-yellow-500/15 dark:bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 font-bold'
    },
    ledger: {
      desktop: 'active bg-sky-500/15 dark:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-500/40 shadow-xs font-bold',
      mobile: 'active bg-sky-500/15 dark:bg-sky-400/20 text-sky-700 dark:text-sky-300 font-bold shadow-xs',
      itemDesktop: 'active bg-sky-500/15 dark:bg-sky-500/25 text-sky-700 dark:text-sky-300 font-bold',
      itemMobile: 'active bg-sky-500/15 dark:bg-sky-400/20 text-sky-700 dark:text-sky-300 font-bold'
    },
    bank: {
      desktop: 'active bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-xs font-bold',
      mobile: 'active bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs',
      itemDesktop: 'active bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold',
      itemMobile: 'active bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 font-bold'
    },
    admin: {
      desktop: 'active bg-fuchsia-500/15 dark:bg-fuchsia-500/25 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-500/40 shadow-xs font-bold',
      mobile: 'active bg-fuchsia-500/15 dark:bg-fuchsia-400/20 text-fuchsia-700 dark:text-fuchsia-300 font-bold shadow-xs',
      itemDesktop: 'active bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 font-bold',
      itemMobile: 'active bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 font-bold'
    }
  };

  // Close any open more menus
  document.getElementById('nav-more-menu')?.classList.add('hidden');
  document.getElementById('mobile-more-menu')?.classList.add('hidden');

  // Sync desktop more toggle button with current tab vibe
  const btnNavMore = document.getElementById('btn-nav-more');
  if (btnNavMore) {
    const currentTheme = tabColorTheme[tabId] || tabColorTheme.leaderboard;
    btnNavMore.className = `nav-more-toggle flex items-center gap-1 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-semibold text-xs transition border shrink-0 whitespace-nowrap cursor-pointer ${
      isMoreTab
        ? currentTheme.desktop
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border-transparent'
    }`;
  }

  // Sync mobile more toggle button with current tab vibe
  const btnMobileMore = document.getElementById('btn-mobile-more');
  if (btnMobileMore) {
    const currentTheme = tabColorTheme[tabId] || tabColorTheme.leaderboard;
    btnMobileMore.className = `mobile-more-btn flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-1 sm:px-2 rounded-xl transition cursor-pointer ${
      isMoreTab
        ? currentTheme.mobile
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
    }`;
  }

  // Sync desktop tabs
  document.querySelectorAll('.nav-tab').forEach(b => {
    const tabKey = b.dataset.tab;
    const isActive = tabKey === tabId;
    const isAdminBtn = b.id === 'nav-tab-admin' || tabKey === 'admin';
    const theme = tabColorTheme[tabKey] || tabColorTheme.quests;

    if (b.classList.contains('nav-more-item')) {
      if (isAdminBtn && !isAdmin) {
        b.className = 'nav-tab nav-more-item hidden items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg transition text-left';
        return;
      }
      b.className = `nav-tab nav-more-item flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg transition text-left ${
        isActive
          ? (theme.itemDesktop || theme.desktop)
          : (isAdminBtn ? 'text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/40' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')
      }`;
      return;
    }

    if (isAdminBtn && !isAdmin) {
      b.className = 'nav-tab hidden items-center gap-1 sm:gap-1.5 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-semibold text-xs transition shrink-0 whitespace-nowrap';
      return;
    }

    b.className = `nav-tab flex items-center gap-1 sm:gap-1.5 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-semibold text-xs transition shrink-0 whitespace-nowrap ${
      isActive
        ? theme.desktop
        : (isAdminBtn
            ? 'text-fuchsia-600 dark:text-fuchsia-400 hover:text-fuchsia-900 dark:hover:text-fuchsia-200 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/40 border border-fuchsia-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent')
    }`;
  });

  // Sync mobile bottom bar buttons
  document.querySelectorAll('.mobile-nav-btn').forEach(b => {
    const tabKey = b.dataset.tab;
    const isActive = tabKey === tabId;
    const isAdminBtn = b.id === 'mobile-nav-admin' || tabKey === 'admin';
    const theme = tabColorTheme[tabKey] || tabColorTheme.quests;

    if (b.classList.contains('mobile-more-item')) {
      if (isAdminBtn && !isAdmin) {
        b.className = 'mobile-nav-btn mobile-more-item hidden items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left';
        return;
      }
      b.className = `mobile-nav-btn mobile-more-item flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
        isActive
          ? (theme.itemMobile || theme.mobile)
          : (isAdminBtn ? 'text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/40' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')
      }`;
      return;
    }

    if (isAdminBtn && !isAdmin) {
      b.className = 'mobile-nav-btn hidden flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-1 px-1 sm:px-2 rounded-xl transition';
      return;
    }

    b.className = `mobile-nav-btn flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-1 px-1 sm:px-2 rounded-xl transition ${
      isActive
        ? theme.mobile
        : (isAdminBtn
            ? 'text-fuchsia-500/70 dark:text-fuchsia-400/70 hover:bg-fuchsia-500/5 font-medium'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium')
    }`;
  });

  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.add('hidden');
    p.classList.remove('block');
  });

  const targetPane = document.getElementById(`tab-${tabId}`);
  if (targetPane) {
    targetPane.classList.remove('hidden');
    targetPane.classList.add('block');
  }

  if (tabId === 'leaderboard') {
    const viewCheaters = document.getElementById('view-leaderboard-cheaters');
    if (viewCheaters && !viewCheaters.classList.contains('hidden')) {
      fetchCheaters();
    } else {
      fetchLeaderboard();
    }
    updateCheatersBadge();
  } else if (tabId === 'admin') {
    fetchAdminUsers();
  } else if (tabId === 'bank') {
    loadBankState();
  }

  if (['quests', 'shop'].includes(tabId) || tabId === 'ledger') {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(refreshAllCardDescToggles);
    }
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  if (id === 'modal-welcome') {
    if (!checkIsOnboarded()) return;
  }
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

function isAvatarUrl(avatar) {
  return typeof avatar === 'string' && /^(https?:\/\/|\/\/|data:image\/)/i.test(avatar.trim());
}

function escapeHtml(text) {
  if (!text) return '';
  return text.toString()
    .normalize('NFC')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdown(text) {
  if (!text) return '';

  // 1. First escape raw HTML to prevent XSS attacks
  let safe = escapeHtml(text);

  // 2. Fenced code blocks ```code```
  safe = safe.replace(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_match, code) => {
    return `<pre class="my-2 p-2.5 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-700/50"><code>${code.trim()}</code></pre>`;
  });

  // 3. Inline code `code`
  safe = safe.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-violet-700 dark:text-violet-300 rounded text-[11px] font-mono">$1</code>');

  // 4. Split into lines to process block-level Markdown cleanly
  const lines = safe.split(/\r?\n/);
  const processed = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for Headings: #, ##, ###, ####
    const h4Match = trimmed.match(/^####\s+(.*)$/);
    const h3Match = trimmed.match(/^###\s+(.*)$/);
    const h2Match = trimmed.match(/^##\s+(.*)$/);
    const h1Match = trimmed.match(/^#\s+(.*)$/);

    // Check for Horizontal Rule
    const hrMatch = trimmed.match(/^(\*{3,}|-{3,}|_{3,})$/);

    // Check for Blockquote
    const quoteMatch = trimmed.match(/^>\s+(.*)$/);

    // Check for Unordered List Item: * item, - item, + item
    const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);

    // Check for Ordered List Item: 1. item, 2. item
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);

    if (ulMatch) {
      if (inOl) { processed.push('</ol>'); inOl = false; }
      if (!inUl) { processed.push('<ul class="my-1.5 space-y-1">'); inUl = true; }
      processed.push(`<li class="flex items-start gap-2 ml-1"><span class="text-amber-500 font-bold shrink-0 select-none">•</span><span>${ulMatch[1]}</span></li>`);
      continue;
    } else if (inUl) {
      processed.push('</ul>');
      inUl = false;
    }

    if (olMatch) {
      if (inUl) { processed.push('</ul>'); inUl = false; }
      if (!inOl) { processed.push('<ol class="my-1.5 space-y-1">'); inOl = true; }
      processed.push(`<li class="flex items-start gap-1.5 ml-1"><span class="text-indigo-500 dark:text-indigo-400 font-bold shrink-0 text-xs select-none">${olMatch[1]}.</span><span>${olMatch[2]}</span></li>`);
      continue;
    } else if (inOl) {
      processed.push('</ol>');
      inOl = false;
    }

    if (h1Match) {
      processed.push(`<h1 class="text-base sm:text-lg font-extrabold text-violet-800 dark:text-violet-200 mt-3 mb-1.5">${h1Match[1]}</h1>`);
    } else if (h2Match) {
      processed.push(`<h2 class="text-sm sm:text-base font-bold text-violet-700 dark:text-violet-300 mt-2.5 mb-1">${h2Match[1]}</h2>`);
    } else if (h3Match) {
      processed.push(`<h3 class="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 mt-2 mb-1">${h3Match[1]}</h3>`);
    } else if (h4Match) {
      processed.push(`<h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5 mb-0.5">${h4Match[1]}</h4>`);
    } else if (hrMatch) {
      processed.push('<hr class="my-2 border-slate-200 dark:border-slate-700">');
    } else if (quoteMatch) {
      processed.push(`<blockquote class="border-l-2 border-violet-500 pl-2.5 py-0.5 my-1 text-slate-600 dark:text-slate-400 italic">${quoteMatch[1]}</blockquote>`);
    } else {
      processed.push(line);
    }
  }

  if (inUl) processed.push('</ul>');
  if (inOl) processed.push('</ol>');

  // Join back with line breaks
  let result = processed.join('\n');

  // Inline formatting: Bold (**text** or __text__)
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-amber-700 dark:text-amber-400">$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong class="font-bold text-amber-700 dark:text-amber-400">$1</strong>');

  // Inline formatting: Italics (*text* or _text_)
  result = result.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  result = result.replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>');

  // Inline formatting: Strikethrough (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, '<del class="line-through opacity-75">$1</del>');

  // Convert remaining line breaks to <br>
  result = result.replace(/\r\n|\n/g, '<br>');

  // Clean up excessive <br> tags adjacent to block-level elements
  result = result
    .replace(/(?:<br>\s*)*(<(?:h[1-6]|ul|ol|pre|blockquote|hr))/gi, '$1')
    .replace(/(<\/(?:h[1-6]|ul|ol|pre|blockquote)>|<hr[^>]*>)(?:\s*<br>)*/gi, '$1')
    .replace(/<ul([^>]*)><br>/gi, '<ul$1>')
    .replace(/<ol([^>]*)><br>/gi, '<ol$1>')
    .replace(/<br><\/ul>/gi, '</ul>')
    .replace(/<br><\/ol>/gi, '</ol>')
    .replace(/<\/li><br><li/gi, '</li><li')
    .replace(/(?:<br>\s*){3,}/gi, '<br><br>');

  return result;
}

function renderStreamingMarkdown(text) {
  if (!text) return '<span class="assistant-typing-cursor"></span>';
  // Chèn placeholder caret trực tiếp vào cuối chuỗi trước khi render markdown
  // Điều này đảm bảo caret luôn nằm bên trong thẻ dòng cuối cùng (heading, list item, bold...),
  // hoàn toàn không bao giờ bị rơi xuống dòng mới phía dưới block element!
  let str = text + '%%ASSISTANT_CARET%%';
  const boldMatches = str.match(/\*\*/g);
  if (boldMatches && boldMatches.length % 2 === 1) {
    str += '**';
  }
  const backtickMatches = str.match(/(?<!\\)`/g);
  if (backtickMatches && backtickMatches.length % 2 === 1) {
    str += '`';
  }
  const rendered = renderMarkdown(str);
  return rendered.replace(/%%ASSISTANT_CARET%%/g, '<span class="assistant-typing-cursor"></span>');
}

function checkIsOnboarded() {
  return Boolean(appState.profile && appState.profile.googleId && appState.profile.nickname);
}

let googleClientIdCache = null;

async function fetchGoogleClientId() {
  if (googleClientIdCache !== null) return googleClientIdCache;
  try {
    const res = await fetch('/api/sync?action=auth_config');
    if (res.ok) {
      const data = await res.json();
      googleClientIdCache = (data.googleClientId || '').trim();
      return googleClientIdCache;
    }
  } catch (err) {
    console.warn('Failed to fetch auth config:', err);
  }
  googleClientIdCache = '';
  return googleClientIdCache;
}

async function handleGoogleCredentialResponse(response) {
  const idToken = response?.credential;
  if (!idToken) {
    showToast('Không nhận được mã xác thực từ Google!', 'error');
    return;
  }

  const errEl = document.getElementById('welcome-google-error');
  const loadingEl = document.getElementById('google-signin-loading');
  if (errEl) errEl.classList.add('hidden');
  if (loadingEl) {
    loadingEl.classList.remove('hidden');
    const loadingText = loadingEl.querySelector('span:last-child');
    if (loadingText) loadingText.textContent = 'Đang xác thực với máy chủ...';
  }

  try {
    const res = await fetch('/api/sync?action=google_auth', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data.error || 'Xác thực Google thất bại. Vui lòng thử lại!';
      if (errEl) {
        errEl.textContent = errMsg;
        errEl.classList.remove('hidden');
      }
      showToast(errMsg, 'error');
      if (loadingEl) loadingEl.classList.add('hidden');
      return;
    }

    const { isNew, role, googleUser, state, sessionToken } = data;

    if (state) {
      appState = normalizeObjectNFC({
        ...DEFAULT_STATE,
        ...state,
        profile: {
          ...DEFAULT_STATE.profile,
          ...(state.profile || {}),
          googleId: googleUser.sub,
          googleEmail: googleUser.email,
          googlePicture: googleUser.picture || state.profile?.googlePicture || '',
          googleToken: idToken,
          sessionToken: sessionToken || state.profile?.sessionToken || '',
          role: role || 'adventurer',
          hasOnboarded: true
        }
      });
      const oldPic = state.profile?.googlePicture;
      const curAvatar = appState.profile.avatar;
      if (googleUser.picture && (!curAvatar || curAvatar === '⚔️' || curAvatar === oldPic || isAvatarUrl(curAvatar))) {
        appState.profile.avatar = googleUser.picture;
      }
    } else {
      appState.profile.googleId = googleUser.sub;
      appState.profile.googleEmail = googleUser.email;
      appState.profile.googlePicture = googleUser.picture;
      appState.profile.googleToken = idToken;
      appState.profile.sessionToken = sessionToken || '';
      appState.profile.role = role || 'adventurer';
      appState.profile.hasOnboarded = true;
      if (!appState.profile.nickname) {
        appState.profile.nickname = googleUser.name || googleUser.email.split('@')[0];
      }
      const curAvatar = appState.profile.avatar;
      if (googleUser.picture && (!curAvatar || curAvatar === '⚔️' || isAvatarUrl(curAvatar))) {
        appState.profile.avatar = googleUser.picture;
      }
    }

    clearLegacyLocalStorage();
    saveLocalCache();
    applyTheme(appState.profile.theme || 'dark');
    renderAll();
    closeModal('modal-welcome');
    fetchLeaderboard();

    if (loadingEl) loadingEl.classList.add('hidden');

    if (isNew) {
      showToast(`Chào mừng Hiệp Sĩ ${appState.profile.nickname} gia nhập LevelUp!`, 'success');
      setTimeout(() => startInteractiveTour(true), 350);
    } else {
      showToast(`Chào mừng trở lại, ${appState.profile.nickname}!`, 'success');
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = 'Lỗi kết nối khi xác thực: ' + err.message;
      errEl.classList.remove('hidden');
    }
    showToast('Lỗi kết nối: ' + err.message, 'error');
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

async function renderGoogleSignInButton() {
  const container = document.getElementById('google-signin-btn-container');
  const loadingEl = document.getElementById('google-signin-loading');
  const errEl = document.getElementById('welcome-google-error');

  if (!container) return;
  container.innerHTML = '';
  if (loadingEl) loadingEl.classList.remove('hidden');
  if (errEl) errEl.classList.add('hidden');

  const clientId = await fetchGoogleClientId();

  if (!clientId) {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errEl) {
      errEl.innerHTML = '<strong>Chưa cấu hình GOOGLE_CLIENT_ID:</strong><br>Vui lòng điền <code>GOOGLE_CLIENT_ID</code> vào file <code>.env</code> để kích hoạt đăng nhập Google Identity Services.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  let attempts = 0;
  const checkGis = setInterval(() => {
    attempts++;
    if (window.google?.accounts?.id) {
      clearInterval(checkGis);
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false
        });

        window.google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: Math.min(280, window.innerWidth - 64)
        });

        if (loadingEl) loadingEl.classList.add('hidden');
      } catch (e) {
        if (loadingEl) loadingEl.classList.add('hidden');
        if (errEl) {
          errEl.textContent = 'Không thể hiển thị nút Google Sign-In: ' + e.message;
          errEl.classList.remove('hidden');
        }
      }
    } else if (attempts > 30) {
      clearInterval(checkGis);
      if (loadingEl) loadingEl.classList.add('hidden');
      if (errEl) {
        errEl.innerHTML = 'Không thể tải Google Identity Services SDK.<br>Vui lòng kiểm tra kết nối mạng hoặc thử lại.';
        errEl.classList.remove('hidden');
      }
    }
  }, 100);
}

function initWelcomeModal() {
  // Anti-DevTools 1: MutationObserver theo dõi thời gian thực nếu modal bị xóa class hidden bằng F12
  const welcomeModal = document.getElementById('modal-welcome');
  if (welcomeModal && window.MutationObserver) {
    const observer = new MutationObserver(() => {
      if (!checkIsOnboarded() && welcomeModal.classList.contains('hidden')) {
        welcomeModal.classList.remove('hidden');
      }
    });
    observer.observe(welcomeModal, { attributes: true, attributeFilter: ['class', 'style'] });
  }

  // Anti-DevTools 2: Event Capture toàn trang - Chặn đứng mọi cú click vào ứng dụng nếu chưa onboard
  document.addEventListener('click', (e) => {
    if (checkIsOnboarded()) return;
    if (e.target.closest && e.target.closest('#modal-welcome')) return;

    e.preventDefault();
    e.stopPropagation();
    openModal('modal-welcome');
    showToast('Vui lòng đăng nhập bằng Google để tiếp tục!', 'error');
  }, true);

  // Anti-DevTools 3: Chặn phím tắt gõ vào trang nếu chưa onboard
  document.addEventListener('keydown', (e) => {
    if (checkIsOnboarded()) return;
    if (e.target.closest && e.target.closest('#modal-welcome')) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  const tabLogin = document.getElementById('btn-tab-welcome-login');
  const tabIntro = document.getElementById('btn-tab-welcome-intro');
  const panelLogin = document.getElementById('welcome-panel-login');
  const panelIntro = document.getElementById('welcome-panel-intro');
  const btnGotoLogin = document.getElementById('btn-welcome-goto-login');

  function setWelcomeTab(tab) {
    if (tab === 'login') {
      if (tabLogin) tabLogin.className = 'py-2 sm:py-2.5 rounded-xl text-center transition bg-amber-500 text-slate-950 shadow-sm font-bold';
      if (tabIntro) tabIntro.className = 'py-2 sm:py-2.5 rounded-xl text-center transition text-slate-400 hover:text-slate-200';
      if (panelLogin) panelLogin.classList.remove('hidden');
      if (panelIntro) panelIntro.classList.add('hidden');
      renderGoogleSignInButton();
    } else {
      if (tabLogin) tabLogin.className = 'py-2 sm:py-2.5 rounded-xl text-center transition text-slate-400 hover:text-slate-200';
      if (tabIntro) tabIntro.className = 'py-2 sm:py-2.5 rounded-xl text-center transition bg-amber-500 text-slate-950 shadow-sm font-bold';
      if (panelLogin) panelLogin.classList.add('hidden');
      if (panelIntro) panelIntro.classList.remove('hidden');
    }
  }

  if (tabLogin) tabLogin.addEventListener('click', () => setWelcomeTab('login'));
  if (tabIntro) tabIntro.addEventListener('click', () => setWelcomeTab('intro'));
  if (btnGotoLogin) btnGotoLogin.addEventListener('click', () => setWelcomeTab('login'));
}

// =============================================================================
// 13.5. ONBOARDING INTERACTIVE TOUR ENGINE
// =============================================================================
let currentTourStep = 0;
let isTourActive = false;
let tourResizeScrollHandler = null;
let tourKeydownHandler = null;

const TOUR_STEPS = [
  {
    id: 'profile',
    title: 'Hồ Sơ & Trạng Thái Hiệp Sĩ',
    icon: '🛡️',
    tab: 'quests',
    getTarget: () => document.getElementById('open-profile-btn'),
    desc: 'Theo dõi Cấp độ, EXP và Vàng tích lũy. Dữ liệu tự động đồng bộ qua Google. Nhấn vào đây để đổi Avatar, biệt danh hoặc xem lịch sử giao dịch.'
  },
  {
    id: 'add-quest',
    title: 'Giao Nhiệm Vụ & Trợ Lý AI',
    icon: '⚔️',
    tab: 'quests',
    getTarget: () => {
      const mobBtn = document.getElementById('btn-open-add-quest-mobile');
      if (window.innerWidth < 768 && mobBtn && mobBtn.offsetParent !== null) return mobBtn;
      return document.getElementById('btn-open-add-quest');
    },
    desc: 'Tạo nhiệm vụ mới (phím tắt Q). Trợ lý AI sẽ tự động định Hạng (S/A/B/C/D), thưởng Vàng và EXP tương xứng với độ khó nhiệm vụ.'
  },
  {
    id: 'focus-timer',
    title: 'Đồng Hồ Đếm Giờ Tập Trung',
    icon: '⏱️',
    tab: 'quests',
    getTarget: () => {
      const banner = document.getElementById('active-focus-banner');
      if (banner && !banner.classList.contains('hidden') && banner.offsetParent !== null) return banner;
      const questList = document.getElementById('quests-grid') || document.getElementById('quest-list');
      if (questList && questList.offsetParent !== null) return questList;
      return document.getElementById('tab-quests');
    },
    desc: 'Bấm "Bắt Đầu" trên nhiệm vụ bất kỳ để chạy đếm giờ tập trung (phím tắt Space để tạm dừng/tiếp tục). Kích hoạt Chế độ Toàn màn hình giúp tập trung tối đa và loại bỏ xao nhãng.'
  },
  {
    id: 'shop',
    title: 'Cửa Hàng & Kho Phần Thưởng',
    icon: '🎁',
    tab: 'shop',
    getTarget: () => {
      if (window.innerWidth < 768) {
        return document.querySelector('.mobile-nav-btn[data-tab="shop"]');
      }
      return document.querySelector('.nav-tab[data-tab="shop"]');
    },
    desc: 'Dùng Vàng đổi các phần thưởng giải trí yêu thích (chơi game, xem phim, cà phê...). Bấm "Dùng Quà" để đếm ngược thời gian thư giãn mà không sợ quá đà.'
  },
  {
    id: 'leaderboard',
    title: 'Bảng Xếp Hạng Hiệp Sĩ',
    icon: '🏆',
    tab: 'leaderboard',
    getTarget: () => {
      if (window.innerWidth < 768) {
        return document.querySelector('.mobile-nav-btn[data-tab="leaderboard"]');
      }
      return document.querySelector('.nav-tab[data-tab="leaderboard"]');
    },
    desc: 'Vinh danh Top người chăm chỉ nhất dựa trên Cấp độ và EXP kiếm được. Hãy hoàn thành nhiệm vụ hàng ngày để thăng hạng và vươn lên dẫn đầu!'
  }
];

function updateTourPosition() {
  if (!isTourActive) return;
  const overlay = document.getElementById('tour-overlay');
  const card = document.getElementById('tour-card');
  const targetBox = document.getElementById('tour-target-box');
  const tourHole = document.getElementById('tour-hole');
  const tourArrow = document.getElementById('tour-arrow');
  if (!overlay || !card || !targetBox || !tourHole) return;

  const step = TOUR_STEPS[currentTourStep];
  if (!step) return;

  const targetEl = step.getTarget ? step.getTarget() : null;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  if (targetEl && targetEl.offsetParent !== null) {
    const rect = targetEl.getBoundingClientRect();
    const pad = 6;
    const tTop = Math.max(0, rect.top - pad);
    const tLeft = Math.max(0, rect.left - pad);
    const tWidth = Math.min(viewportW - tLeft, rect.width + pad * 2);
    const tHeight = Math.min(viewportH - tTop, rect.height + pad * 2);

    // Cập nhật lỗ cắt spotlight trên mặt nạ SVG
    tourHole.setAttribute('x', tLeft);
    tourHole.setAttribute('y', tTop);
    tourHole.setAttribute('width', tWidth);
    tourHole.setAttribute('height', tHeight);
    tourHole.setAttribute('rx', '14');

    // Cập nhật khung viền phát sáng bám theo phần tử
    targetBox.style.display = 'block';
    targetBox.style.top = `${tTop}px`;
    targetBox.style.left = `${tLeft}px`;
    targetBox.style.width = `${tWidth}px`;
    targetBox.style.height = `${tHeight}px`;

    // Định vị hộp thoại popover card
    const cardW = Math.min(viewportW - 32, 420);
    card.style.width = `${cardW}px`;
    const cardH = card.offsetHeight || 220;

    const spaceBelow = viewportH - (tTop + tHeight);
    const spaceAbove = tTop;

    let cardTop = 0;
    let cardLeft = 0;
    let arrowPlacement = 'top';

    if (viewportW < 640) {
      cardLeft = Math.max(16, (viewportW - cardW) / 2);
      if (spaceBelow >= cardH + 16) {
        cardTop = tTop + tHeight + 12;
        arrowPlacement = 'top';
      } else if (spaceAbove >= cardH + 16) {
        cardTop = Math.max(16, tTop - cardH - 12);
        arrowPlacement = 'bottom';
      } else {
        cardTop = Math.max(16, (viewportH - cardH) / 2);
        arrowPlacement = 'none';
      }
    } else {
      if (spaceBelow >= cardH + 20) {
        cardTop = tTop + tHeight + 14;
        arrowPlacement = 'top';
      } else if (spaceAbove >= cardH + 20) {
        cardTop = Math.max(16, tTop - cardH - 14);
        arrowPlacement = 'bottom';
      } else {
        cardTop = Math.max(20, (viewportH - cardH) / 2);
        arrowPlacement = 'none';
      }

      const targetCenter = tLeft + tWidth / 2;
      cardLeft = targetCenter - cardW / 2;
      cardLeft = Math.max(16, Math.min(viewportW - cardW - 16, cardLeft));
    }

    cardTop = Math.max(16, Math.min(viewportH - cardH - 16, cardTop));
    card.style.top = `${cardTop}px`;
    card.style.left = `${cardLeft}px`;

    if (tourArrow) {
      if (arrowPlacement === 'top') {
        tourArrow.classList.remove('hidden');
        tourArrow.style.top = '-6px';
        tourArrow.style.bottom = 'auto';
        const arrowLeft = Math.max(16, Math.min(cardW - 24, (tLeft + tWidth / 2) - cardLeft - 6));
        tourArrow.style.left = `${arrowLeft}px`;
      } else if (arrowPlacement === 'bottom') {
        tourArrow.classList.remove('hidden');
        tourArrow.style.bottom = '-6px';
        tourArrow.style.top = 'auto';
        const arrowLeft = Math.max(16, Math.min(cardW - 24, (tLeft + tWidth / 2) - cardLeft - 6));
        tourArrow.style.left = `${arrowLeft}px`;
      } else {
        tourArrow.classList.add('hidden');
      }
    }
  } else {
    tourHole.setAttribute('width', '0');
    tourHole.setAttribute('height', '0');
    targetBox.style.display = 'none';
    if (tourArrow) tourArrow.classList.add('hidden');

    const cardW = Math.min(viewportW - 32, 420);
    card.style.width = `${cardW}px`;
    const cardH = card.offsetHeight || 220;
    card.style.top = `${Math.max(20, (viewportH - cardH) / 2)}px`;
    card.style.left = `${Math.max(16, (viewportW - cardW) / 2)}px`;
  }
}

function renderTourStep(index) {
  if (index < 0 || index >= TOUR_STEPS.length) {
    finishTour(true);
    return;
  }

  currentTourStep = index;
  const step = TOUR_STEPS[index];

  const card = document.getElementById('tour-card');
  if (card) card.classList.remove('hidden');

  if (step.tab) {
    switchTab(step.tab);
  }

  const pill = document.getElementById('tour-step-pill');
  if (pill) pill.textContent = `Bước ${index + 1} / ${TOUR_STEPS.length}`;

  const icon = document.getElementById('tour-step-icon');
  if (icon) icon.textContent = step.icon;

  const title = document.getElementById('tour-step-title');
  if (title) title.textContent = step.title;

  const desc = document.getElementById('tour-step-desc');
  if (desc) desc.textContent = step.desc;

  const dotsContainer = document.getElementById('tour-dots');
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    TOUR_STEPS.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `tour-dot ${i === index ? 'active' : ''}`;
      dot.setAttribute('title', `Bước ${i + 1}: ${TOUR_STEPS[i].title}`);
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        renderTourStep(i);
      });
      dotsContainer.appendChild(dot);
    });
  }

  const prevBtn = document.getElementById('btn-tour-prev');
  if (prevBtn) {
    if (index > 0) {
      prevBtn.classList.remove('hidden');
    } else {
      prevBtn.classList.add('hidden');
    }
  }

  const nextBtnText = document.getElementById('btn-tour-next-text');
  const nextBtnIcon = document.getElementById('btn-tour-next-icon');
  if (nextBtnText) {
    nextBtnText.textContent = (index === TOUR_STEPS.length - 1) ? 'Bắt Đầu Ngay' : 'Tiếp theo';
  }
  if (nextBtnIcon) {
    nextBtnIcon.textContent = (index === TOUR_STEPS.length - 1) ? '🚀' : '➡️';
  }

  requestAnimationFrame(() => {
    const targetEl = step.getTarget ? step.getTarget() : null;
    if (targetEl && targetEl.offsetParent !== null) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    setTimeout(updateTourPosition, 120);
  });
}

function startInteractiveTour(force = false) {
  if (!force && localStorage.getItem('levelup_tour_completed') === 'true') {
    return;
  }

  const welcomeModal = document.getElementById('modal-welcome');
  if (welcomeModal && !welcomeModal.classList.contains('hidden')) {
    return;
  }

  // Đóng các modal khác nếu đang mở trước khi bắt đầu tour
  const openModals = Array.from(document.querySelectorAll('.fixed[id^="modal-"]:not(#modal-welcome):not(.hidden)'));
  for (const m of openModals) m.classList.add('hidden');

  const overlay = document.getElementById('tour-overlay');
  if (!overlay) return;

  const card = document.getElementById('tour-card');
  if (card) card.classList.remove('hidden');

  isTourActive = true;
  currentTourStep = 0;
  overlay.classList.remove('hidden');

  renderTourStep(0);

  if (!tourResizeScrollHandler) {
    let ticking = false;
    tourResizeScrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateTourPosition();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('resize', tourResizeScrollHandler, { passive: true });
    window.addEventListener('scroll', tourResizeScrollHandler, { passive: true });
  }

  if (!tourKeydownHandler) {
    tourKeydownHandler = (e) => {
      if (!isTourActive) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        nextTourStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevTourStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishTour(false);
      }
    };
    window.addEventListener('keydown', tourKeydownHandler);
  }
}

function nextTourStep() {
  if (!isTourActive) return;
  sfx.playClick();
  if (currentTourStep < TOUR_STEPS.length - 1) {
    renderTourStep(currentTourStep + 1);
  } else {
    finishTour(true);
  }
}

function prevTourStep() {
  if (!isTourActive) return;
  sfx.playClick();
  if (currentTourStep > 0) {
    renderTourStep(currentTourStep - 1);
  }
}

function finishTour(completed = true) {
  if (!isTourActive) return;
  isTourActive = false;

  const overlay = document.getElementById('tour-overlay');
  if (overlay) overlay.classList.add('hidden');

  if (tourResizeScrollHandler) {
    window.removeEventListener('resize', tourResizeScrollHandler);
    window.removeEventListener('scroll', tourResizeScrollHandler);
    tourResizeScrollHandler = null;
  }

  if (tourKeydownHandler) {
    window.removeEventListener('keydown', tourKeydownHandler);
    tourKeydownHandler = null;
  }

  switchTab('quests');

  try {
    localStorage.setItem('levelup_tour_completed', 'true');
  } catch (_) {}

  if (completed) {
    if (sfx && typeof sfx.playLevelUp === 'function') {
      sfx.playLevelUp();
    }
    showToast('🎉 Chúc mừng bạn đã hoàn thành tour giới thiệu! Hãy tạo nhiệm vụ đầu tiên nào!', 'success');
  } else {
    showToast('Bạn có thể xem lại tour hướng dẫn bất kỳ lúc nào trong Hồ Sơ (Profile).', 'info');
  }
}

function initTourControls() {
  const nextBtn = document.getElementById('btn-tour-next');
  if (nextBtn) nextBtn.addEventListener('click', nextTourStep);

  const prevBtn = document.getElementById('btn-tour-prev');
  if (prevBtn) prevBtn.addEventListener('click', prevTourStep);

  const skipBtn = document.getElementById('btn-tour-skip');
  if (skipBtn) skipBtn.addEventListener('click', () => finishTour(false));

  const skipTopBtn = document.getElementById('btn-tour-skip-top');
  if (skipTopBtn) skipTopBtn.addEventListener('click', () => finishTour(false));

  const replayBtn = document.getElementById('btn-replay-tour');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      closeModal('modal-profile');
      startInteractiveTour(true);
    });
  }
}

async function initStartupFlow() {
  clearLegacyLocalStorage();
  clearLocalCache();

  // ponytail: Sử dụng skeleton loading khi chờ dữ liệu từ Redis thay vì load default data gây chớp nháy (Anti-FOUC)
  renderSkeletons();

  restoreFocusTimer();
  initWelcomeModal();
  initTourControls();

  try {
    const res = await fetch('/api/sync', {
      method: 'GET',
      credentials: 'include'
    });

    if (res.status === 200) {
      const result = await res.json().catch(() => ({}));
      if (result.found && result.data) {
        appState = normalizeObjectNFC({
          ...DEFAULT_STATE,
          ...result.data,
          profile: {
            ...DEFAULT_STATE.profile,
            ...(result.data.profile || {})
          }
        });
        const balance = deriveLegitimateBalance(appState);
        appState.profile.coins = balance.coins;
        appState.profile.totalCoinsEarned = balance.totalCoinsEarned;
        applyTheme(appState.profile.theme || 'dark');
        closeModal('modal-welcome');
        renderAll();
        restoreFocusTimer();
        const pendingProofQuest = (appState.quests || []).find(q => q.focusTimerCompleted && q.requiresProof && !q._proofVerified && q.status !== 'completed');
        if (pendingProofQuest) {
          const proofModal = document.getElementById('modal-quest-proof');
          const isModalOpen = proofModal && !proofModal.classList.contains('hidden');
          if (!isModalOpen) {
            showToast(`📸 Nhiệm vụ "${pendingProofQuest.title}" đã hoàn thành thời gian! Hãy bấm "Chụp Ảnh Nhận Vàng" để AI duyệt thưởng.`, 'info');
          }
        }
        return;
      }
    } else if (res.status === 401) {
      clearLocalCache();
      appState = { ...DEFAULT_STATE };
      applyTheme(appState.profile.theme || 'dark');
      renderAll();
      openModal('modal-welcome');
      renderGoogleSignInButton();
      return;
    }
  } catch (err) {
    console.warn('Startup sync check failed:', err.message);
  }

  applyTheme(appState.profile.theme || 'dark');
  renderAll();
  openModal('modal-welcome');
  renderGoogleSignInButton();
}

// =============================================================================
// 13.6. BANKING FINANCIAL ENGINE & AMM STATE MANAGEMENT (AI Central Bank)
// =============================================================================

let currentBankPool = {
  poolGold: 500,
  totalBorrowed: 0,
  reserveFund: 150,
  totalDeposited: 0,
  bailoutDebt: 0
};

let bankCommentaryCache = { text: '', timestamp: 0 };

function calculateLocalBankRates(poolState) {
  const poolGold = Math.max(0, parseInt(poolState?.poolGold, 10) || 0);
  const totalBorrowed = Math.max(0, parseInt(poolState?.totalBorrowed, 10) || 0);
  const totalLiquidity = poolGold + totalBorrowed;
  const utilization = totalLiquidity > 0 ? Math.min(1.0, Math.max(0.0, totalBorrowed / totalLiquidity)) : 0;
  const depositRate = Math.min(0.08, Math.max(0.01, 0.02 + 0.04 * utilization));
  const borrowRate = Math.min(0.18, Math.max(0.04, 0.05 + 0.10 * utilization));
  return {
    utilization,
    depositRate,
    borrowRate,
    spread: borrowRate - depositRate
  };
}

function calculateLocalCreditLimit(profile, autoDeductPercent = 0.50) {
  const level = Math.max(1, parseInt(profile?.level, 10) || 1);
  const streak = Math.max(0, parseInt(profile?.streak, 10) || 0);
  const totalEarned = Math.max(20, parseInt(profile?.totalCoinsEarned, 10) || 20);
  const rawBase = level * 25 + streak * 5 + Math.floor(totalEarned * 0.1);
  const baseLimit = Math.min(400, rawBase);
  const rate = Math.min(0.80, Math.max(0.20, Number(autoDeductPercent) || 0.50));
  const kDeduct = 0.7 + ((Math.max(0.30, rate) - 0.30) / 0.50) * 0.8;
  return Math.max(20, Math.floor(baseLimit * kDeduct));
}

function accrueLocalUserBank(bank, pool, now = Date.now()) {
  if (!bank || typeof bank !== 'object') return bank;
  const deposited = Math.max(0, parseInt(bank.deposited, 10) || 0);
  if (deposited <= 0) return bank;

  const lastDep = parseInt(bank.lastDepositAt, 10) || now;
  const elapsedDays = Math.max(0, (now - lastDep) / (24 * 60 * 60 * 1000));
  if (elapsedDays <= 0) return bank;

  const rates = pool?.depositRate !== undefined ? pool : calculateLocalBankRates(pool);
  const depRate = Number(rates?.depositRate) || 0.02;
  const standardEarned = Math.floor(deposited * depRate * elapsedDays);
  // Floor rule: gửi >= 10 Vàng và qua >= 24h thì tối thiểu 1 Vàng/ngày
  const minFloorEarned = (deposited >= 10 && elapsedDays >= 1) ? Math.floor(elapsedDays) : 0;
  const interestEarned = Math.max(standardEarned, minFloorEarned);

  if (interestEarned > 0) {
    bank.depositInterest = (parseInt(bank.depositInterest, 10) || 0) + interestEarned;
    const effectiveDailyRate = Math.max(deposited * depRate, deposited >= 10 ? 1 : 0);
    const daysConsumed = effectiveDailyRate > 0
      ? Math.min(elapsedDays, interestEarned / effectiveDailyRate)
      : Math.floor(elapsedDays);
    const timeConsumedMs = Math.round(daysConsumed * 24 * 60 * 60 * 1000);
    bank.lastDepositAt = Math.min(now, lastDep + timeConsumedMs);
  }
  return bank;
}

function ensureUserBankProfile() {
  if (!appState.profile) appState.profile = {};
  if (!appState.profile.bank) {
    appState.profile.bank = {
      deposited: 0,
      depositInterest: 0,
      lastDepositAt: Date.now(),
      loan: null,
      isFrozen: false
    };
  }
  accrueLocalUserBank(appState.profile.bank, currentBankPool);
  return appState.profile.bank;
}

async function loadBankState() {
  const isManual = Boolean(arguments[0]);
  const btnRefresh = document.getElementById('btn-refresh-bank');
  const icon = document.getElementById('btn-refresh-bank-icon');
  if (isManual && btnRefresh) {
    btnRefresh.disabled = true;
    if (icon) icon.classList.add('animate-spin');
  }

  const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
  ensureUserBankProfile();

  let poolData = currentBankPool;
  let userBank = appState.profile.bank;
  let creditLimit = calculateLocalCreditLimit(appState.profile, userBank.loan?.autoDeductPercent || 0.50);

  let fetchSuccess = false;
  try {
    const res = await fetch(`/api/sync?action=bank_state&token=${encodeURIComponent(token || '')}&ts=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.pool) {
        currentBankPool = data.pool;
        poolData = data.pool;
      }
      if (data.userBank) {
        appState.profile.bank = data.userBank;
        userBank = data.userBank;
      }
      if (data.creditLimit) {
        creditLimit = data.creditLimit;
      }
      fetchSuccess = true;
    } else {
      userBank = accrueLocalUserBank(appState.profile.bank, currentBankPool);
    }
  } catch (err) {
    console.warn('Không thể kết nối đến máy chủ Ngân Hàng, sử dụng dữ liệu cục bộ:', err);
    userBank = accrueLocalUserBank(appState.profile.bank, currentBankPool);
  } finally {
    if (isManual && btnRefresh) {
      setTimeout(() => {
        btnRefresh.disabled = false;
        if (icon) icon.classList.remove('animate-spin');
      }, 350);
    }
  }

  renderBankUI(poolData, userBank, creditLimit);
  renderLedger();
  loadBankAiCommentary(poolData);

  if (isManual) {
    if (fetchSuccess) {
      showToast('Đã cập nhật dữ liệu Ngân Hàng mới nhất!', 'info');
    } else {
      showToast('Không thể kết nối máy chủ Ngân Hàng, đang sử dụng dữ liệu lưu tạm.', 'warning');
    }
  }
}

function renderBankUI(pool, userBank, creditLimit) {
  // 1. Kiểm tra nợ quá hạn 7 ngày
  const isOverdue = userBank?.loan?.isOverdue || (userBank?.loan && (Date.now() - (parseInt(userBank.loan.borrowedAt, 10) || Date.now())) >= 7 * 24 * 60 * 60 * 1000);
  if (isOverdue && userBank?.loan) {
    userBank.loan.isOverdue = true;
    userBank.isFrozen = true;
    appState.profile.title = 'Con Nợ Quá Hạn ⚠️';
  }

  const overdueBanner = document.getElementById('bank-overdue-banner');
  if (overdueBanner) {
    if (userBank?.isFrozen || isOverdue) {
      overdueBanner.classList.remove('hidden');
    } else {
      overdueBanner.classList.add('hidden');
    }
  }

  // 2. Chỉ số AMM Bể Vàng & Lãi suất động
  const rates = pool.depositRate !== undefined ? pool : calculateLocalBankRates(pool);

  const elPoolGold = document.getElementById('bank-pool-gold');
  if (elPoolGold) elPoolGold.textContent = (pool.poolGold ?? 500).toLocaleString('vi-VN');

  const elBorrowed = document.getElementById('bank-total-borrowed');
  if (elBorrowed) elBorrowed.textContent = (pool.totalBorrowed ?? 0).toLocaleString('vi-VN');

  const elUtil = document.getElementById('bank-utilization-pct');
  if (elUtil) elUtil.textContent = Math.round((rates.utilization || 0) * 100) + '%';

  const elDepRate = document.getElementById('bank-deposit-rate');
  if (elDepRate) elDepRate.textContent = ((rates.depositRate || 0.02) * 100).toFixed(1) + '%/ngày';

  const elBorRate = document.getElementById('bank-borrow-rate');
  if (elBorRate) elBorRate.textContent = ((rates.borrowRate || 0.05) * 100).toFixed(1) + '%/ngày';

  const elReserve = document.getElementById('bank-reserve-fund');
  if (elReserve) elReserve.textContent = (pool.reserveFund ?? 150).toLocaleString('vi-VN');

  const elBailout = document.getElementById('bank-bailout-status');
  if (elBailout) {
    if ((pool.bailoutDebt || 0) > 0) {
      elBailout.className = 'text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 flex items-center gap-1';
      elBailout.innerHTML = `<span>⚠️</span> <span class="inline-flex items-center gap-1">Kho Bạc bảo lãnh (${pool.bailoutDebt} ${COIN_ICON_HTML})</span>`;
    } else {
      elBailout.className = 'text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1';
      elBailout.innerHTML = `<span>🛡️</span> <span>Kho Bạc an toàn</span>`;
    }
  }

  // 3. Sổ Tiết Kiệm (Depositor)
  userBank = accrueLocalUserBank(userBank, rates);
  const elUserDep = document.getElementById('bank-user-deposited');
  if (elUserDep) elUserDep.textContent = (userBank?.deposited || 0).toLocaleString('vi-VN');

  const elUserInt = document.getElementById('bank-user-interest');
  if (elUserInt) elUserInt.textContent = '+' + (userBank?.depositInterest || 0).toLocaleString('vi-VN');

  updateDepositCalculator(rates.depositRate);

  // 4. Quầy Vay Vàng (Borrower)
  const isNegotiated = Boolean(bankNegotiatedTerms && bankNegotiatedTerms.creditLimit);
  const effectiveLimit = isNegotiated
    ? Math.max(bankNegotiatedTerms.creditLimit, creditLimit)
    : creditLimit;
  const elBadge = document.getElementById('bank-credit-limit-badge');
  if (elBadge) {
    if (isNegotiated) {
      elBadge.innerHTML = `<span>Hạn mức: ${effectiveLimit}</span> ${COIN_ICON_HTML} <span class="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded font-bold ml-1">Ưu đãi</span>`;
    } else {
      elBadge.innerHTML = `<span>Hạn mức: ${effectiveLimit}</span> ${COIN_ICON_HTML} <span class="opacity-70 text-[11px] ml-0.5">ℹ️</span>`;
    }
  }

  const negotiatedBadge = document.getElementById('bank-negotiated-badge');
  const negotiatedTermsSpan = document.getElementById('bank-negotiated-terms');
  if (negotiatedBadge && negotiatedTermsSpan && bankNegotiatedTerms) {
    negotiatedTermsSpan.textContent = `Lãi ${(bankNegotiatedTerms.borrowRate * 100).toFixed(1)}%/ngày • Hạn mức ${bankNegotiatedTerms.creditLimit} Vàng • Trích ${Math.round(bankNegotiatedTerms.autoDeductPercent * 100)}%`;
    negotiatedBadge.classList.remove('hidden');
  }

  const activeBox = document.getElementById('bank-loan-active-box');
  const formBox = document.getElementById('bank-loan-form-box');
  const btnBorrow = document.getElementById('btn-bank-borrow');
  const btnRepay = document.getElementById('btn-bank-repay');

  if (userBank?.loan && (userBank.loan.debt || 0) > 0) {
    if (activeBox) activeBox.classList.remove('hidden');
    if (formBox) formBox.classList.add('hidden');
    if (btnBorrow) {
      btnBorrow.disabled = true;
      btnBorrow.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (btnRepay) {
      btnRepay.disabled = false;
      btnRepay.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    const elDebt = document.getElementById('bank-current-debt');
    if (elDebt) elDebt.innerHTML = `${userBank.loan.debt} ${COIN_ICON_HTML}`;

    const elDeductRate = document.getElementById('bank-active-deduct-rate');
    if (elDeductRate) elDeductRate.textContent = `${Math.round((userBank.loan.autoDeductPercent || 0.5) * 100)}%`;

    const elDaysLeft = document.getElementById('bank-loan-days-left');
    if (elDaysLeft) {
      const daysPassed = Math.floor((Date.now() - (parseInt(userBank.loan.borrowedAt, 10) || Date.now())) / (24 * 60 * 60 * 1000));
      const daysLeft = Math.max(0, 7 - daysPassed);
      if (userBank.loan.isOverdue || daysLeft === 0) {
        elDaysLeft.textContent = 'Đã quá hạn ⚠️';
        elDaysLeft.className = 'font-bold text-rose-600';
      } else {
        elDaysLeft.textContent = `${daysLeft} ngày`;
        elDaysLeft.className = 'font-semibold text-amber-600';
      }
    }

    const elPenalty = document.getElementById('bank-early-repay-penalty-label');
    if (elPenalty) {
      elPenalty.textContent = userBank.loan.isOverdue
        ? 'Đã quá hạn (Không phạt tất toán sớm)'
        : '5% phí trả trước hạn';
    }
  } else {
    if (activeBox) activeBox.classList.add('hidden');
    if (formBox) formBox.classList.remove('hidden');
    if (btnBorrow) {
      btnBorrow.disabled = false;
      btnBorrow.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    if (btnRepay) {
      btnRepay.disabled = true;
      btnRepay.classList.add('opacity-50', 'cursor-not-allowed');
    }
  }

  // 5. Cập nhật bảng đo lường vĩ mô AMM chi tiết trong Admin Dashboard (nếu có)
  renderAdminBankTelemetry(pool, rates);
}

function renderAdminBankTelemetry(pool, rates) {
  if (!pool) return;
  const pRates = rates || (pool.depositRate !== undefined ? pool : calculateLocalBankRates(pool));

  const elAdminPool = document.getElementById('admin-bank-pool-gold');
  if (elAdminPool) elAdminPool.textContent = (pool.poolGold ?? 500).toLocaleString('vi-VN');

  const elAdminBorrowed = document.getElementById('admin-bank-total-borrowed');
  if (elAdminBorrowed) elAdminBorrowed.textContent = (pool.totalBorrowed ?? 0).toLocaleString('vi-VN');

  const uPct = Math.round((pRates.utilization || 0) * 100);
  const elAdminUtil = document.getElementById('admin-bank-utilization-pct');
  if (elAdminUtil) elAdminUtil.textContent = `${uPct}%`;

  const elAdminUtilBar = document.getElementById('admin-bank-utilization-bar');
  if (elAdminUtilBar) {
    elAdminUtilBar.style.width = `${Math.min(100, Math.max(0, uPct))}%`;
    if (uPct > 80) {
      elAdminUtilBar.className = 'bg-rose-500 h-1.5 rounded-full transition-all duration-300';
    } else if (uPct > 50) {
      elAdminUtilBar.className = 'bg-amber-500 h-1.5 rounded-full transition-all duration-300';
    } else {
      elAdminUtilBar.className = 'bg-blue-600 h-1.5 rounded-full transition-all duration-300';
    }
  }

  const elAdminReserve = document.getElementById('admin-bank-reserve-fund');
  if (elAdminReserve) elAdminReserve.textContent = (pool.reserveFund ?? 150).toLocaleString('vi-VN');

  const elAdminBailoutDebt = document.getElementById('admin-bank-bailout-debt');
  if (elAdminBailoutDebt) elAdminBailoutDebt.textContent = (pool.bailoutDebt ?? 0).toLocaleString('vi-VN');

  const elAdminBailoutText = document.getElementById('admin-bank-bailout-status-text');
  const elAdminHealth = document.getElementById('admin-bank-health-badge');
  if ((pool.bailoutDebt || 0) > 0) {
    if (elAdminBailoutText) {
      elAdminBailoutText.innerHTML = `Kho Bạc Đang Cứu Trợ (${pool.bailoutDebt} ${COIN_ICON_HTML})`;
      elAdminBailoutText.className = 'text-[9px] text-amber-600 dark:text-amber-400 font-bold inline-flex items-center gap-1';
    }
    if (elAdminHealth) {
      elAdminHealth.className = 'text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1';
      elAdminHealth.innerHTML = '<span>⚠️</span> <span>Cứu Trợ Kích Hoạt</span>';
    }
  } else {
    if (elAdminBailoutText) {
      elAdminBailoutText.textContent = 'Kho Bạc An Toàn';
      elAdminBailoutText.className = 'text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold';
    }
    if (elAdminHealth) {
      elAdminHealth.className = 'text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1';
      elAdminHealth.innerHTML = '<span>🛡️</span> <span>Hệ Thống An Toàn</span>';
    }
  }

  const elAdminDepRate = document.getElementById('admin-bank-deposit-rate');
  if (elAdminDepRate) elAdminDepRate.textContent = ((pRates.depositRate || 0.02) * 100).toFixed(1) + '%/ngày';

  const elAdminBorRate = document.getElementById('admin-bank-borrow-rate');
  if (elAdminBorRate) elAdminBorRate.textContent = ((pRates.borrowRate || 0.05) * 100).toFixed(1) + '%/ngày';

  const elAdminSpread = document.getElementById('admin-bank-spread');
  if (elAdminSpread) {
    const spreadVal = pRates.spread !== undefined ? pRates.spread : ((pRates.borrowRate || 0.05) - (pRates.depositRate || 0.02));
    elAdminSpread.textContent = (spreadVal * 100).toFixed(1) + '%';
  }

  const elAdminTotalDep = document.getElementById('admin-bank-total-deposited');
  if (elAdminTotalDep) elAdminTotalDep.textContent = (pool.totalDeposited ?? 0).toLocaleString('vi-VN');
}

async function loadBankAiCommentary(pool) {
  const elCommentary = document.getElementById('bank-ai-commentary');
  if (!elCommentary || elCommentary.closest('.hidden')) return;

  // Cache bản tin trong 2 phút để tối ưu hiệu năng
  if (bankCommentaryCache.text && Date.now() - bankCommentaryCache.timestamp < 120000) {
    elCommentary.textContent = bankCommentaryCache.text;
    return;
  }

  try {
    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        action: 'bank_market_commentary',
        payload: { poolState: pool }
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.commentary) {
        bankCommentaryCache = { text: data.commentary, timestamp: Date.now() };
        elCommentary.textContent = data.commentary;
        return;
      }
    }
  } catch (_) {}

  const rates = calculateLocalBankRates(pool);
  let fallback = '';
  if ((pool.bailoutDebt || 0) > 0) {
    fallback = `Kho Bạc Hệ Thống đang bảo trợ ${pool.bailoutDebt} Vàng an toàn 100%! Hãy hoàn thành nhiệm vụ và gửi tiết kiệm để nhận mức lãi suất hấp dẫn ${(rates.depositRate * 100).toFixed(1)}%/ngày!`;
  } else if (rates.utilization > 0.6) {
    fallback = `Quỹ Vàng đang có nhu cầu vốn cao! Lãi suất gửi tiết kiệm đang ở mức tốt ${(rates.depositRate * 100).toFixed(1)}%/ngày. Cơ hội thuận lợi để bạn gửi Vàng tích lũy!`;
  } else {
    fallback = `Quỹ Vàng đang rất dồi dào! Lãi suất vay ưu đãi chỉ ${(rates.borrowRate * 100).toFixed(1)}%/ngày. Bạn có thể vay Vàng nhẹ nhàng nếu cần đổi quà nạp lại năng lượng!`;
  }
  bankCommentaryCache = { text: fallback, timestamp: Date.now() };
  elCommentary.textContent = fallback;
}

function updateDepositCalculator(overrideRate) {
  const inputCoins = document.getElementById('calc-deposit-coins');
  const inputDays = document.getElementById('calc-deposit-days');
  const elRateLabel = document.getElementById('calc-deposit-rate-label');
  const elInterest = document.getElementById('calc-deposit-result-interest');
  const elTotal = document.getElementById('calc-deposit-result-total');

  const coins = Math.max(0, parseInt(inputCoins?.value, 10) || 0);
  const days = Math.max(0, parseInt(inputDays?.value, 10) || 0);

  const rates = currentBankPool?.depositRate !== undefined ? currentBankPool : calculateLocalBankRates(currentBankPool);
  const rate = typeof overrideRate === 'number' ? overrideRate : (rates.depositRate || 0.02);

  if (elRateLabel) {
    elRateLabel.textContent = `${(rate * 100).toFixed(1)}%/ngày`;
  }

  const interest = Math.floor(coins * rate * days);
  const total = coins + interest;

  if (elInterest) elInterest.textContent = interest.toLocaleString('vi-VN');
  if (elTotal) elTotal.textContent = total.toLocaleString('vi-VN');
}

function setCalcDays(days) {
  const inputDays = document.getElementById('calc-deposit-days');
  if (inputDays) {
    inputDays.value = days;
    updateDepositCalculator();
  }
}

function onDepositAmountInput(val) {
  const coins = parseInt(val, 10);
  const calcCoins = document.getElementById('calc-deposit-coins');
  if (calcCoins && !isNaN(coins) && coins > 0) {
    calcCoins.value = coins;
    updateDepositCalculator();
  }
}

function setDepositAmount(amount) {
  const input = document.getElementById('input-deposit-amount');
  if (input) {
    input.value = amount;
    onDepositAmountInput(amount);
  }
}

function setDepositMax() {
  const input = document.getElementById('input-deposit-amount');
  const maxCoins = Math.max(0, appState.profile?.coins || 0);
  if (input) {
    input.value = maxCoins;
    onDepositAmountInput(maxCoins);
  }
}

let isBankActionPending = false;

async function executeBankDeposit() {
  if (isBankActionPending) return;
  isBankActionPending = true;
  const input = document.getElementById('input-deposit-amount');
  try {
    const amount = parseInt(input?.value, 10);
    if (!amount || amount <= 0) {
      showToast('Vui lòng nhập số Vàng muốn gửi hợp lệ (> 0)!', 'error');
      return;
    }
    if (amount > (appState.profile?.coins || 0)) {
      showToast(`Số dư không đủ! Bạn chỉ có ${appState.profile?.coins || 0} Vàng trong ví.`, 'error');
      return;
    }

    const ok = await confirmAction({
      title: 'Gửi Tiết Kiệm Ngân Hàng?',
      message: `Bạn có chắc muốn gửi ${amount} Vàng vào Bể thanh khoản để nhận lãi thụ động mỗi ngày?`,
      detail: `💰 Vàng trong ví: ${appState.profile.coins} ➔ Còn lại: ${appState.profile.coins - amount}\n🛡️ Vốn được bảo lãnh 100%, có thể rút bất kỳ lúc nào.`,
      confirmText: 'Gửi Ngay 📥',
      cancelText: 'Hủy',
      icon: '🌱',
      btnColor: 'emerald'
    });
    if (!ok) return;

    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    if (!token) {
      showToast('Vui lòng đăng nhập tài khoản Google để gửi tiết kiệm và bảo toàn tài sản!', 'warning');
      return;
    }
    let serverSuccess = false;

    if (token) {
      try {
        const res = await fetch('/api/sync?action=bank_deposit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount })
        });
        if (res.ok) {
          const data = await res.json();
          appState.profile.coins = data.coins;
          appState.profile.bank = data.userBank;
          currentBankPool = data.pool;
        if (Array.isArray(data.ledger)) {
          appState.ledger = data.ledger;
        }
          serverSuccess = true;
          showToast(data.message || `Đã gửi ${amount} Vàng vào sổ tiết kiệm!`, 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Giao dịch thất bại trên máy chủ!', 'error');
          return;
        }
      } catch (e) {
        console.warn('Lỗi kết nối khi gửi tiết kiệm, thực hiện lưu cục bộ:', e);
      }
    }

    if (!serverSuccess) {
      ensureUserBankProfile();
      const oldDep = Math.max(0, parseInt(appState.profile.bank.deposited, 10) || 0);
      appState.profile.coins -= amount;
      appState.profile.bank.deposited = oldDep + amount;
      appState.profile.bank.lastDepositAt = Date.now();

      currentBankPool.poolGold = (currentBankPool.poolGold || 0) + amount;
      currentBankPool.totalDeposited = (currentBankPool.totalDeposited || 0) + amount;

      addLedgerEntry({
        id: 'bank_dep_' + Date.now(),
        type: 'spend',
        category: 'bank_deposit',
        amount: amount,
        title: 'Gửi tiết kiệm Ngân Hàng',
        description: `🏦 Đã gửi ${amount} Vàng vào Bể thanh khoản (Chế độ cục bộ).`,
        timestamp: Date.now()
      });
      showToast(`Đã gửi ${amount} Vàng vào sổ tiết kiệm!`, 'success');
    }

    sfx.playCoin();
    if (input) input.value = '';
    triggerSave(true);
    renderHeader();
    renderLedger();
    loadBankState();
  } finally {
    isBankActionPending = false;
  }
}

function openBankWithdrawModal() {
  ensureUserBankProfile();
  const bank = appState.profile.bank || {};
  const deposited = Math.max(0, parseInt(bank.deposited, 10) || 0);
  const interest = Math.max(0, parseInt(bank.depositInterest, 10) || 0);
  const totalAvailable = deposited + interest;

  if (totalAvailable <= 0) {
    showToast('Bạn không có Vàng gửi tiết kiệm hoặc tiền lãi để rút!', 'info');
    return;
  }

  const elDeposited = document.getElementById('withdraw-modal-deposited');
  const elInterest = document.getElementById('withdraw-modal-interest');
  const elTotal = document.getElementById('withdraw-modal-total');
  const inputAmt = document.getElementById('input-withdraw-amount');

  if (elDeposited) elDeposited.textContent = deposited.toLocaleString('vi-VN');
  if (elInterest) elInterest.textContent = interest.toLocaleString('vi-VN');
  if (elTotal) elTotal.textContent = totalAvailable.toLocaleString('vi-VN');
  if (inputAmt) {
    inputAmt.max = totalAvailable;
    inputAmt.value = '';
  }

  onWithdrawAmountInput(0);
  openModal('modal-bank-withdraw');
}
window.openBankWithdrawModal = openBankWithdrawModal;

function onWithdrawAmountInput(val) {
  ensureUserBankProfile();
  const bank = appState.profile.bank || {};
  const deposited = Math.max(0, parseInt(bank.deposited, 10) || 0);
  const interest = Math.max(0, parseInt(bank.depositInterest, 10) || 0);
  const totalAvailable = deposited + interest;

  let amount = parseInt(val, 10);
  if (isNaN(amount) || amount < 0) amount = 0;

  const withdrawAmt = Math.min(totalAvailable, amount);

  // Phân tách thông minh: Ưu tiên rút hết lãi trước, vượt quá mới trừ vào gốc
  let interestWithdrawn = 0;
  let principalWithdrawn = 0;
  if (withdrawAmt >= totalAvailable) {
    interestWithdrawn = interest;
    principalWithdrawn = deposited;
  } else if (withdrawAmt <= interest) {
    interestWithdrawn = withdrawAmt;
    principalWithdrawn = 0;
  } else {
    interestWithdrawn = interest;
    principalWithdrawn = withdrawAmt - interest;
  }

  const remainingPrincipal = Math.max(0, deposited - principalWithdrawn);

  const elAllocInterest = document.getElementById('withdraw-alloc-interest');
  const elAllocPrincipal = document.getElementById('withdraw-alloc-principal');
  const elAllocTotal = document.getElementById('withdraw-alloc-total');
  const elRemaining = document.getElementById('withdraw-remaining-principal');
  const elNote = document.getElementById('withdraw-explanation-note');

  if (elAllocInterest) elAllocInterest.textContent = `+${interestWithdrawn.toLocaleString('vi-VN')} Vàng`;
  if (elAllocPrincipal) elAllocPrincipal.textContent = `${principalWithdrawn.toLocaleString('vi-VN')} Vàng`;
  if (elAllocTotal) elAllocTotal.textContent = `${withdrawAmt.toLocaleString('vi-VN')} Vàng`;
  if (elRemaining) elRemaining.textContent = remainingPrincipal.toLocaleString('vi-VN');

  if (elNote) {
    if (amount <= 0) {
      elNote.innerHTML = '💡 <strong>Hướng dẫn:</strong> Nhập số Vàng bạn muốn rút hoặc nhấn các nút chọn nhanh bên trên để xem bảng phân bổ chi tiết.';
    } else if (amount > totalAvailable) {
      elNote.innerHTML = `<span class="text-rose-500 font-bold">⚠️ Chú ý:</span> Số Vàng bạn nhập (${amount}) vượt quá tổng số dư khả dụng (${totalAvailable} Vàng)! Tối đa có thể rút là ${totalAvailable} Vàng.`;
    } else if (principalWithdrawn === 0) {
      elNote.innerHTML = `💡 <strong>Ưu đãi bảo toàn vốn:</strong> Bạn đang rút <strong class="text-emerald-500 font-bold">${interestWithdrawn} Vàng</strong> từ Tiền Lãi tích lũy. Toàn bộ <strong class="text-amber-400 font-bold">${remainingPrincipal} Vàng</strong> Vốn Gốc được bảo toàn 100% để tiếp tục sinh lời mỗi ngày!`;
    } else {
      elNote.innerHTML = `💡 <strong>Phân bổ thông minh:</strong> Hệ thống rút hết <strong class="text-emerald-500 font-bold">${interestWithdrawn} Vàng</strong> tiền lãi và trích thêm <strong class="text-slate-200 font-bold">${principalWithdrawn} Vàng</strong> từ vốn gốc. ${remainingPrincipal > 0 ? `Phần gốc còn lại <strong class="text-amber-400 font-bold">${remainingPrincipal} Vàng</strong> vẫn tiếp tục sinh lãi!` : 'Bạn đã chọn tất toán toàn bộ gốc và lãi.'}`;
    }
  }
}
window.onWithdrawAmountInput = onWithdrawAmountInput;

function setWithdrawAmountPreset(preset) {
  ensureUserBankProfile();
  const bank = appState.profile.bank || {};
  const deposited = Math.max(0, parseInt(bank.deposited, 10) || 0);
  const interest = Math.max(0, parseInt(bank.depositInterest, 10) || 0);
  const totalAvailable = deposited + interest;

  if (totalAvailable <= 0) return;

  let targetAmt = 0;
  if (preset === 'interest') {
    if (interest <= 0) {
      showToast('Hiện tại bạn chưa có tiền lãi tích lũy để rút!', 'info');
      return;
    }
    targetAmt = interest;
  } else if (preset === 'all') {
    targetAmt = totalAvailable;
  } else if (typeof preset === 'number') {
    targetAmt = Math.max(1, Math.round(totalAvailable * preset));
  }

  const input = document.getElementById('input-withdraw-amount');
  if (input) {
    input.value = targetAmt;
    onWithdrawAmountInput(targetAmt);
  }
}
window.setWithdrawAmountPreset = setWithdrawAmountPreset;

function confirmAndExecuteWithdraw() {
  const input = document.getElementById('input-withdraw-amount');
  const amount = parseInt(input?.value, 10);
  ensureUserBankProfile();
  const bank = appState.profile.bank || {};
  const totalAvailable = (bank.deposited || 0) + (bank.depositInterest || 0);

  if (!amount || amount <= 0) {
    showToast('Vui lòng nhập số Vàng muốn rút hợp lệ (> 0)!', 'error');
    return;
  }
  if (amount > totalAvailable) {
    showToast(`Số Vàng muốn rút (${amount}) vượt quá số dư khả dụng (${totalAvailable} Vàng)!`, 'error');
    return;
  }

  const modal = document.getElementById('modal-bank-withdraw');
  if (modal) modal.classList.add('hidden');

  executeBankWithdraw(amount);
}
window.confirmAndExecuteWithdraw = confirmAndExecuteWithdraw;

async function executeBankWithdraw() {
  if (isBankActionPending) return;
  isBankActionPending = true;
  try {
    const reqAmt = arguments[0] !== undefined ? arguments[0] : 'all';
    ensureUserBankProfile();
    const bank = appState.profile.bank || {};
    const deposited = Math.max(0, parseInt(bank.deposited, 10) || 0);
    const interest = Math.max(0, parseInt(bank.depositInterest, 10) || 0);
    const totalAvailable = deposited + interest;

    if (totalAvailable <= 0) {
      showToast('Bạn không có Vàng gửi hoặc tiền lãi để rút!', 'info');
      return;
    }

    const withdrawAmt = (reqAmt === 'all' || !reqAmt)
      ? totalAvailable
      : Math.min(totalAvailable, Math.max(1, parseInt(reqAmt, 10) || totalAvailable));

    let interestWithdrawn = 0;
    let principalWithdrawn = 0;
    if (withdrawAmt >= totalAvailable) {
      interestWithdrawn = interest;
      principalWithdrawn = deposited;
    } else if (withdrawAmt <= interest) {
      interestWithdrawn = withdrawAmt;
      principalWithdrawn = 0;
    } else {
      interestWithdrawn = interest;
      principalWithdrawn = withdrawAmt - interest;
    }

    const isFull = withdrawAmt >= totalAvailable;
    const remainingPrincipal = Math.max(0, deposited - principalWithdrawn);

    const ok = await confirmAction({
      title: isFull ? 'Rút Toàn Bộ Tiết Kiệm?' : 'Rút Một Phần Tiết Kiệm?',
      message: isFull
        ? `Rút toàn bộ ${totalAvailable} Vàng (${deposited} Vàng gốc + ${interest} Vàng lãi) về ví?`
        : `Rút ${withdrawAmt} Vàng (${principalWithdrawn} gốc + ${interestWithdrawn} lãi) về ví?`,
      detail: `💰 Số dư ví: ${appState.profile.coins} ➔ ${appState.profile.coins + withdrawAmt} Vàng.\n${remainingPrincipal > 0 ? `🌱 Vốn gốc còn lại: ${remainingPrincipal} Vàng vẫn tiếp tục sinh lãi thụ động!` : 'Đã tất toán toàn bộ sổ tiết kiệm.'}`,
      confirmText: isFull ? 'Rút Toàn Bộ 📤' : 'Rút Về Ví 📤',
      cancelText: 'Giữ Lại Sinh Lời',
      icon: '📤',
      btnColor: 'emerald'
    });
    if (!ok) return;

    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    if (!token) {
      showToast('Vui lòng đăng nhập tài khoản Google để rút tiền tiết kiệm!', 'warning');
      return;
    }
    let serverSuccess = false;

    if (token) {
      try {
        const res = await fetch('/api/sync?action=bank_withdraw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount: withdrawAmt })
        });
        if (res.ok) {
          const data = await res.json();
          appState.profile.coins = data.coins;
          appState.profile.bank = data.userBank;
          if (data.totalCoinsEarned !== undefined) {
            appState.profile.totalCoinsEarned = data.totalCoinsEarned;
          } else {
            appState.profile.totalCoinsEarned += interestWithdrawn;
          }
          currentBankPool = data.pool;
          if (Array.isArray(data.ledger)) {
            appState.ledger = data.ledger;
          }
          serverSuccess = true;
          showToast(data.message || `Đã rút thành công ${withdrawAmt} Vàng!`, 'gold');
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Rút tiền thất bại trên máy chủ!', 'error');
          return;
        }
      } catch (e) {
        console.warn('Lỗi kết nối khi rút tiết kiệm, thực hiện lưu cục bộ:', e);
      }
    }

    if (!serverSuccess) {
      let bailoutInjected = 0;
      if (currentBankPool.poolGold < withdrawAmt) {
        bailoutInjected = withdrawAmt - currentBankPool.poolGold;
        currentBankPool.bailoutDebt = (currentBankPool.bailoutDebt || 0) + bailoutInjected;
        currentBankPool.poolGold += bailoutInjected;
      }
      currentBankPool.poolGold = Math.max(0, currentBankPool.poolGold - withdrawAmt);
      currentBankPool.totalDeposited = Math.max(0, (currentBankPool.totalDeposited || 0) - principalWithdrawn);

      appState.profile.coins += withdrawAmt;
      appState.profile.totalCoinsEarned += interestWithdrawn;
      bank.deposited = Math.max(0, deposited - principalWithdrawn);
      bank.depositInterest = Math.max(0, interest - interestWithdrawn);
      bank.lastDepositAt = Date.now();

      const bailoutNotice = bailoutInjected > 0 ? ` (Bảo lãnh 100% từ Kho Bạc Hệ Thống: Cứu trợ ${bailoutInjected} Vàng)` : '';
      addLedgerEntry({
        id: 'bank_wit_' + Date.now(),
        type: 'earn',
        category: 'bank_withdraw',
        amount: withdrawAmt,
        title: 'Rút tiền gửi Ngân Hàng',
        description: `🏦 Đã rút ${withdrawAmt} Vàng (${principalWithdrawn} gốc + ${interestWithdrawn} lãi) từ Ngân Hàng.${bailoutNotice}`,
        timestamp: Date.now()
      });
      showToast(`Đã rút thành công ${withdrawAmt} Vàng!${bailoutInjected > 0 ? ' Kho Bạc đã bảo lãnh 100% thanh khoản!' : ''}`, 'gold');
    }

    sfx.playCoin();
    triggerSave(true);
    renderHeader();
    renderLedger();
    loadBankState();
  } finally {
    isBankActionPending = false;
  }
}

function openCreditLimitModal() {
  const profile = appState.profile || {};
  const inputDeduct = document.getElementById('input-deduct-percent');
  const deductVal = parseInt(inputDeduct?.value, 10) || (profile.bank?.loan?.autoDeductPercent ? Math.round(profile.bank.loan.autoDeductPercent * 100) : 50);
  const autoDeduct = deductVal / 100;

  const level = Math.max(1, parseInt(profile.level, 10) || 1);
  const streak = Math.max(0, parseInt(profile.streak, 10) || 0);
  const totalEarned = Math.max(20, parseInt(profile.totalCoinsEarned, 10) || 20);

  const levelPoints = level * 25;
  const streakPoints = streak * 5;
  const earnedPoints = Math.floor(totalEarned * 0.1);

  const rawBase = levelPoints + streakPoints + earnedPoints;
  const baseLimit = Math.min(400, rawBase);

  const clampedRate = Math.min(0.80, Math.max(0.20, autoDeduct));
  const kDeduct = 0.7 + ((Math.max(0.30, clampedRate) - 0.30) / 0.50) * 0.8;
  const totalLimit = Math.max(20, Math.floor(baseLimit * kDeduct));

  const elTotal = document.getElementById('modal-credit-limit-total');
  const elKDeduct = document.getElementById('modal-credit-limit-kdeduct');
  const elLevel = document.getElementById('modal-credit-calc-level');
  const elLevelVal = document.getElementById('modal-credit-calc-level-val');
  const elStreak = document.getElementById('modal-credit-calc-streak');
  const elStreakVal = document.getElementById('modal-credit-calc-streak-val');
  const elEarned = document.getElementById('modal-credit-calc-earned');
  const elEarnedVal = document.getElementById('modal-credit-calc-earned-val');
  const elBase = document.getElementById('modal-credit-calc-base');
  const elDeductRate = document.getElementById('modal-credit-calc-deduct-rate');

  if (elTotal) elTotal.innerHTML = `${totalLimit} ${COIN_ICON_HTML}`;
  if (elKDeduct) elKDeduct.textContent = `x${kDeduct.toFixed(2)}`;
  if (elLevel) elLevel.textContent = `LV. ${level}`;
  if (elLevelVal) elLevelVal.textContent = `+${levelPoints} Vàng`;
  if (elStreak) elStreak.textContent = `${streak} ngày`;
  if (elStreakVal) elStreakVal.textContent = `+${streakPoints} Vàng`;
  if (elEarned) elEarned.textContent = (profile.totalCoinsEarned || 0).toLocaleString('vi-VN');
  if (elEarnedVal) elEarnedVal.textContent = `+${earnedPoints} Vàng`;
  if (elBase) elBase.textContent = `${baseLimit} Vàng${rawBase > 400 ? ' (Đạt trần 400)' : ''}`;
  if (elDeductRate) elDeductRate.textContent = `${deductVal}% thưởng nhiệm vụ`;

  if (typeof sfx !== 'undefined' && sfx.playClick) {
    sfx.playClick();
  }
  const modal = document.getElementById('modal-credit-limit-info');
  if (modal) modal.classList.remove('hidden');
}
window.openCreditLimitModal = openCreditLimitModal;

function onDeductPercentChange(val) {
  const numVal = parseInt(val, 10) || 50;
  const label = document.getElementById('deduct-percent-label');
  if (label) label.textContent = `${numVal}%`;

  const standardLimit = calculateLocalCreditLimit(appState.profile, numVal / 100);
  const isNegotiated = Boolean(bankNegotiatedTerms && bankNegotiatedTerms.creditLimit);
  const finalLimit = isNegotiated
    ? Math.max(bankNegotiatedTerms.creditLimit, standardLimit)
    : standardLimit;

  const badge = document.getElementById('bank-credit-limit-badge');
  if (badge) {
    if (isNegotiated) {
      badge.innerHTML = `<span>Hạn mức: ${finalLimit}</span> ${COIN_ICON_HTML} <span class="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded font-bold ml-1">Ưu đãi</span>`;
    } else {
      badge.innerHTML = `<span>Hạn mức: ${finalLimit}</span> ${COIN_ICON_HTML} <span class="opacity-70 text-[11px] ml-0.5">ℹ️</span>`;
    }
  }

  const appraisal = document.getElementById('bank-appraisal-box');
  if (appraisal) {
    if (numVal >= 70) {
      appraisal.innerHTML = `🔥 <strong>Tuyệt vời!</strong> Bạn cam kết trích ${numVal}% tiền thưởng nhiệm vụ để trả hết nợ nhanh. AI cấp cho bạn hạn mức cao nhất (${finalLimit} Vàng)!`;
    } else if (numVal <= 40) {
      appraisal.innerHTML = `🌿 Trích nhẹ nhàng ${numVal}% tiền thưởng giúp bạn thong thả làm việc. Hạn mức khả dụng là ${finalLimit} Vàng.`;
    } else {
      appraisal.innerHTML = `💡 <em>Tỷ lệ ${numVal}% cân bằng lý tưởng giữa việc trả nợ và giữ lại Vàng tiêu xài cho các nhiệm vụ tiếp theo! Hạn mức: ${finalLimit} ${COIN_ICON_HTML}</em>`;
    }
  }
}

// ==========================================
// BANK AI LOAN ASSISTANT & NEGOTIATION
// ==========================================
let bankNegotiatedTerms = null; // { amount, borrowRate, autoDeductPercent, creditLimit, signature }
let currentBankDebateHistory = [];
let isDebatingBankLoan = false;
let bankConsultationCache = { data: null, timestamp: 0 };

function calculateUserEarningsCapacity() {
  const ledger = Array.isArray(appState.ledger) ? appState.ledger : [];
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  let todayEarned = 0;
  let last3DaysEarned = 0;
  let last7DaysEarned = 0;
  let recentCompletedQuests = 0;

  for (const entry of ledger) {
    if (entry.type === 'earn') {
      const amt = parseInt(entry.amount, 10) || 0;
      const ts = parseInt(entry.timestamp, 10) || now;
      if (ts >= todayMs) todayEarned += amt;
      if (ts >= threeDaysAgo) last3DaysEarned += amt;
      if (ts >= sevenDaysAgo) last7DaysEarned += amt;
      if (entry.category === 'quest_reward' || (entry.title && entry.title.includes('nhiệm vụ'))) {
        recentCompletedQuests++;
      }
    }
  }

  const profile = appState.profile || {};
  const totalEarned = parseInt(profile.totalCoinsEarned, 10) || 0;
  const streak = Math.max(1, parseInt(profile.streak, 10) || 1);

  let avgDailyIncome = 0;
  if (last7DaysEarned > 0) {
    avgDailyIncome = Math.round(last7DaysEarned / 7);
  } else if (last3DaysEarned > 0) {
    avgDailyIncome = Math.round(last3DaysEarned / 3);
  } else if (totalEarned > 0) {
    avgDailyIncome = Math.max(15, Math.round(totalEarned / Math.min(30, streak)));
  } else {
    avgDailyIncome = 15;
  }

  return {
    todayEarned,
    last3DaysEarned,
    last7DaysEarned,
    avgDailyIncome: Math.max(10, avgDailyIncome),
    recentCompletedQuests
  };
}

async function loadBankLoanConsultation(forceRefresh = true) {
  const consultCard = document.getElementById('bank-ai-consult-card');
  const incomeTag = document.getElementById('bank-ai-daily-income-tag');
  const inputBorrow = document.getElementById('input-borrow-amount');
  const inputDeduct = document.getElementById('input-deduct-percent');
  const btnAnalyze = document.getElementById('btn-analyze-loan-roadmap');
  const btnText = document.getElementById('btn-analyze-loan-text');

  if (!consultCard) return;

  if (btnAnalyze) {
    btnAnalyze.disabled = true;
    btnAnalyze.classList.add('opacity-75', 'cursor-wait');
  }
  if (btnText) {
    btnText.textContent = 'Đang phân tích ví Vàng & nhiệm vụ...';
  }

  const earnings = calculateUserEarningsCapacity();
  if (incomeTag) incomeTag.textContent = `Thu nhập: ~${earnings.avgDailyIncome} Vàng/ngày`;

  if (!forceRefresh && bankConsultationCache.data && (Date.now() - bankConsultationCache.timestamp < 120000)) {
    applyBankConsultationData(bankConsultationCache.data);
    return;
  }

  const profile = appState.profile || {};
  const activeQuests = (appState.quests || []).filter(q => q.status === 'active').slice(0, 8).map(q => ({
    title: q.title,
    rewardCoins: q.rewardCoins,
    type: q.type,
    targetMinutes: q.targetMinutes,
    isRepeatable: q.isRepeatable,
    timesCompleted: q.timesCompleted
  }));

  const shopItems = (appState.shopItems || []).slice(0, 6).map(s => ({
    name: s.name,
    price: s.price,
    tier: s.tier
  }));

  const deductVal = parseInt(inputDeduct?.value, 10) || 50;
  const currentReqAmt = parseInt(inputBorrow?.value, 10) || 0;

  try {
    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        action: 'bank_consult_loan',
        payload: {
          profile,
          autoDeductPercent: deductVal / 100,
          requestedAmount: currentReqAmt,
          poolState: currentBankPool,
          quests: activeQuests,
          shopItems,
          earningsStats: earnings
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      bankConsultationCache = { data, timestamp: Date.now() };
      applyBankConsultationData(data);
      return;
    }
  } catch (err) {
    console.warn('Không thể tải tư vấn AI khoản vay từ máy chủ:', err);
  }

  // Fallback local consultation
  const creditLimit = calculateLocalCreditLimit(profile, deductVal / 100);
  const userCoins = parseInt(profile.coins, 10) || 0;
  const shouldBorrow = userCoins < 40;
  const recommendedAmount = Math.min(creditLimit, Math.max(15, Math.floor(earnings.avgDailyIncome * 2)));
  const borrowRate = 0.05;
  const autoDeduct = deductVal / 100;
  const estDays = Math.min(5, Math.max(2, Math.ceil(recommendedAmount / Math.max(5, earnings.avgDailyIncome * autoDeduct))));
  const estimatedInterest = Math.ceil(recommendedAmount * borrowRate * estDays);
  const totalDebt = recommendedAmount + estimatedInterest;

  let fallbackPlan = '';
  if (activeQuests.length > 0) {
    const q1 = activeQuests[0];
    const coinsNeeded = Math.ceil(totalDebt / autoDeduct);
    const times = Math.max(1, Math.ceil(coinsNeeded / Math.max(1, q1.rewardCoins || 10)));
    fallbackPlan = `Bạn chỉ cần hoàn thành nhiệm vụ "${q1.title}" khoảng ${times} lần trong ${estDays} ngày (thu về ~${coinsNeeded} Vàng, trích ra trả ~${totalDebt} Vàng gồm ${recommendedAmount} Vàng gốc + ${estimatedInterest} Vàng phí lãi) là sạch nợ nhẹ nhàng!`;
  } else {
    fallbackPlan = `Khoản vay ${recommendedAmount} Vàng dự kiến thêm ${estimatedInterest} Vàng phí lãi trong ${estDays} ngày (tổng ~${totalDebt} Vàng). Bạn hãy tạo 1-2 nhiệm vụ và làm đều đặn trong ${estDays} ngày, hệ thống sẽ tự động trích thưởng trả hết nhé!`;
  }

  const localData = {
    shouldBorrow,
    creditLimit,
    recommendedAmount,
    borrowRate,
    autoDeductPercent: autoDeduct,
    estimatedDaysToRepay: estDays,
    estimatedInterest,
    totalEstimatedDebt: totalDebt,
    repaymentPlan: fallbackPlan,
    advice: shouldBorrow
      ? `Bạn đang có chuỗi chăm chỉ ${profile.streak || 0} ngày. Vay ${recommendedAmount} Vàng là mức vừa vặn giúp bạn đạt mục tiêu mà không bị áp lực nợ!`
      : `Bạn đang có ${userCoins} Vàng trong ví, đủ để đổi các món quà nhỏ mà không cần vay mượn. Nếu cần món lớn hơn thì hãy vay một khoản nhỏ nhé!`,
    options: [
      {
        id: 1,
        label: `Gói an toàn: Vay ${Math.max(15, Math.floor(recommendedAmount * 0.7))} Vàng (Trích 50%)`,
        argument: `Mình chọn gói an toàn vay ${Math.max(15, Math.floor(recommendedAmount * 0.7))} Vàng với tỷ lệ trích 50%`,
        newAmount: Math.max(15, Math.floor(recommendedAmount * 0.7)),
        newBorrowRate: 0.05,
        newAutoDeductPercent: 0.50,
        newCreditLimit: creditLimit
      },
      {
        id: 2,
        label: `Gói tăng tốc: Vay ${Math.min(creditLimit, Math.floor(recommendedAmount * 1.3))} Vàng (Trích 70%)`,
        argument: `Mình chọn gói tăng tốc vay ${Math.min(creditLimit, Math.floor(recommendedAmount * 1.3))} Vàng với tỷ lệ trích 70%`,
        newAmount: Math.min(creditLimit, Math.floor(recommendedAmount * 1.3)),
        newBorrowRate: 0.05,
        newAutoDeductPercent: 0.70,
        newCreditLimit: creditLimit
      }
    ]
  };

  bankConsultationCache = { data: localData, timestamp: Date.now() };
  applyBankConsultationData(localData);
}

function applyBankConsultationData(data) {
  if (!data) return;
  const btnAnalyze = document.getElementById('btn-analyze-loan-roadmap');
  const btnText = document.getElementById('btn-analyze-loan-text');
  const hintText = document.getElementById('bank-ai-consult-hint');
  const adviceText = document.getElementById('bank-ai-advice-text');
  const roadmapBox = document.getElementById('bank-ai-roadmap-box');
  const planText = document.getElementById('bank-ai-repayment-plan');
  const estDaysEl = document.getElementById('bank-ai-est-days');
  const recommendTag = document.getElementById('bank-ai-recommend-tag');
  const inputBorrow = document.getElementById('input-borrow-amount');

  if (btnAnalyze) {
    btnAnalyze.disabled = false;
    btnAnalyze.classList.remove('opacity-75', 'cursor-wait');
  }
  if (btnText) {
    btnText.textContent = 'Phân tích lại lộ trình';
  }
  if (hintText) {
    hintText.classList.add('hidden');
  }
  if (adviceText) {
    adviceText.classList.remove('hidden');
    if (data.advice) adviceText.textContent = data.advice;
  }
  if (roadmapBox) {
    roadmapBox.classList.remove('hidden');
  }

  if (recommendTag) {
    recommendTag.classList.remove('hidden');
    if (data.shouldBorrow) {
      recommendTag.textContent = 'Nên vay vừa sức';
      recommendTag.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30';
    } else {
      recommendTag.textContent = 'Chưa cần vay';
      recommendTag.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30';
    }
  }

  if (planText && data.repaymentPlan) planText.textContent = data.repaymentPlan;
  if (estDaysEl && data.estimatedDaysToRepay) estDaysEl.textContent = `${data.estimatedDaysToRepay} ngày`;

  if (inputBorrow && (!inputBorrow.value || parseInt(inputBorrow.value, 10) === 0)) {
    if (data.recommendedAmount) inputBorrow.value = data.recommendedAmount;
  }
}

function toggleBankAiDebate() {
  const container = document.getElementById('bank-debate-container');
  const btnText = document.getElementById('btn-toggle-bank-ai-text');
  if (!container) return;

  const isHidden = container.classList.contains('hidden');
  if (isHidden) {
    container.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Thu Gọn';
    initBankDebateChat();
  } else {
    container.classList.add('hidden');
    if (btnText) btnText.textContent = 'Thương Lượng';
  }
}
window.toggleBankAiDebate = toggleBankAiDebate;

function initBankDebateChat(forceReset = false) {
  const chatLogs = document.getElementById('bank-debate-chat-logs');
  if (!chatLogs) return;
  if (!forceReset && chatLogs.children.length > 0) return;

  const consultData = bankConsultationCache.data;
  const initialOptions = consultData?.options || [];
  const rates = calculateLocalBankRates(currentBankPool);
  const currentRatePct = ((rates.borrowRate || 0.05) * 100).toFixed(1);

  chatLogs.innerHTML = `
    <div class="flex justify-start items-start gap-2 message-fade-in">
      <div class="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">🤖</div>
      <div class="max-w-[90%] sm:max-w-[92%] bg-blue-50/80 dark:bg-slate-900 border border-blue-200/80 dark:border-slate-800 rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 shadow-xs leading-relaxed space-y-2">
        <div class="font-bold text-xs sm:text-[13px] text-blue-600 dark:text-blue-400">Trợ Lý Vay Vàng AI:</div>
        <div>
          Chào bạn! Mình là Trợ Lý Vay Vàng của Ngân Hàng LevelUp. Lãi suất niêm yết hiện tại là <strong>${currentRatePct}%/ngày</strong>.
        </div>
        <div class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
          💡 Bạn có thể chọn một phương án định sẵn bên dưới, bấm vào các gợi ý nhanh hoặc đưa ra lý do (như chuỗi chăm chỉ, cam kết trả nợ sớm) để thương lượng giảm lãi suất và nâng hạn mức nhé!
        </div>
        ${initialOptions.length > 0 ? `
          <div class="mt-2 pt-2 border-t border-blue-200/70 dark:border-slate-800/80 space-y-1.5">
            <div class="text-[11px] font-bold text-blue-700 dark:text-blue-400 tracking-wide flex items-center gap-1">
              <span>💡</span><span>Phương án đề xuất sẵn cho bạn:</span>
            </div>
            <div class="flex flex-col sm:flex-row flex-wrap gap-1.5">
              ${initialOptions.map((opt, idx) => `
                <button type="button" data-bank-opt-idx="${idx}" class="bank-debate-option-btn group text-left px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950/60 active:scale-95 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700/80 transition-all flex items-center gap-2 shadow-xs cursor-pointer">
                  <span class="w-5 h-5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[11px] font-black shrink-0 group-hover:scale-110 transition-transform">👉</span>
                  <span class="font-medium">${escapeHtml(opt.label || `Gói ${idx + 1}`)}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  chatLogs.querySelectorAll('.bank-debate-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-bank-opt-idx'), 10);
      const opt = initialOptions[idx];
      if (opt) {
        chatLogs.querySelectorAll('.bank-debate-option-btn').forEach(b => {
          b.disabled = true;
          b.classList.add('opacity-50', 'pointer-events-none');
        });
        btn.classList.remove('opacity-50');
        btn.classList.add('ring-2', 'ring-blue-500', 'bg-blue-100', 'dark:bg-blue-900/40');
        sendBankDebateMessage(opt.argument || `Chốt ${opt.label || ('Gói ' + (idx + 1))}`, opt);
      }
    });
  });

  chatLogs.scrollTo({ top: 0, behavior: 'smooth' });
}

async function sendBankDebateMessage(customArg = null, selectedOption = null) {
  if (isDebatingBankLoan) return;

  const argInput = document.getElementById('input-bank-debate-arg');
  const argument = (typeof customArg === 'string' && customArg.trim())
    ? customArg.trim()
    : (argInput ? argInput.value.trim() : '');
  if (!argument) return;

  const chatLogs = document.getElementById('bank-debate-chat-logs');
  const btnSend = document.getElementById('btn-send-bank-debate');

  isDebatingBankLoan = true;
  if (argInput) {
    argInput.disabled = true;
    argInput.value = '';
  }
  if (btnSend) {
    btnSend.disabled = true;
    btnSend.innerHTML = `<span class="inline-flex gap-1 items-center"><span class="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style="animation-delay: 0ms"></span><span class="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style="animation-delay: 150ms"></span><span class="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style="animation-delay: 300ms"></span></span>`;
  }

  appendUserChatBubble(chatLogs, argument);

  const loadingBubble = createDebateLoadingBubble('loan');
  chatLogs.appendChild(loadingBubble);
  chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });

  try {
    const profile = appState.profile || {};
    const inputBorrow = document.getElementById('input-borrow-amount');
    const inputDeduct = document.getElementById('input-deduct-percent');
    const currentAmount = parseInt(inputBorrow?.value, 10) || 30;
    const currentDeduct = (parseInt(inputDeduct?.value, 10) || 50) / 100;
    const rates = calculateLocalBankRates(currentBankPool);
    const currentRate = bankNegotiatedTerms?.borrowRate ?? rates.borrowRate;
    const currentLimit = bankNegotiatedTerms?.creditLimit ?? calculateLocalCreditLimit(profile, currentDeduct);

    const activeQuests = (appState.quests || []).filter(q => q.status === 'active').slice(0, 8).map(q => ({
      title: q.title,
      rewardCoins: q.rewardCoins,
      type: q.type,
      targetMinutes: q.targetMinutes
    }));

    const shopItems = (appState.shopItems || []).slice(0, 6).map(s => ({
      name: s.name,
      price: s.price
    }));

    const earnings = calculateUserEarningsCapacity();

    const currentLoanState = {
      amount: currentAmount,
      borrowRate: currentRate,
      autoDeductPercent: currentDeduct,
      creditLimit: currentLimit
    };

    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    const data = await fetchDebateStream('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        action: 'bank_debate_loan',
        payload: {
          loan: currentLoanState,
          argument,
          history: currentBankDebateHistory,
          profile,
          poolState: currentBankPool,
          quests: activeQuests,
          shopItems,
          earningsStats: earnings,
          selectedOption,
          stream: true
        }
      })
    }, (stepData) => {
      if (loadingBubble && loadingBubble.updateStep) loadingBubble.updateStep(stepData);
    });

    if (loadingBubble && loadingBubble.cleanup) loadingBubble.cleanup();
    loadingBubble.remove();

    if (data && typeof data.reply === 'string' && (data.reply.trim().startsWith('{') || data.reply.trim().startsWith('```json'))) {
      try {
        let raw = data.reply.trim();
        if (raw.startsWith('```json')) raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        else if (raw.startsWith('```')) raw = raw.replace(/^```\s*/i, '').replace(/```\s*$/, '');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.reply === 'string') {
          data.reply = parsed.reply;
          if ((!data.options || data.options.length === 0) && Array.isArray(parsed.options)) {
            data.options = parsed.options;
          }
        }
      } catch (_) {}
    }

    const diffTags = [];
    if (data.accepted) {
      if (data.newBorrowRate !== undefined && Number(data.newBorrowRate) > 0.30) {
        data.newBorrowRate = Number(data.newBorrowRate) / 100;
      }
      if (data.newAutoDeductPercent !== undefined && Number(data.newAutoDeductPercent) > 1.0) {
        data.newAutoDeductPercent = Number(data.newAutoDeductPercent) / 100;
      }

      if (data.newBorrowRate && Number(data.newBorrowRate) !== currentRate) {
        diffTags.push(`📉 Lãi suất: ${(currentRate * 100).toFixed(1)}% ➔ ${(Number(data.newBorrowRate) * 100).toFixed(1)}%/ngày`);
      }
      if (data.newCreditLimit && Number(data.newCreditLimit) !== currentLimit) {
        diffTags.push(`🚀 Hạn mức: ${currentLimit} ➔ ${data.newCreditLimit} Vàng`);
      }
      if (data.newAmount && Number(data.newAmount) !== currentAmount) {
        diffTags.push(`💰 Vay: ${currentAmount} ➔ ${data.newAmount} Vàng`);
      }
      if (data.newAutoDeductPercent && Number(data.newAutoDeductPercent) !== currentDeduct) {
        diffTags.push(`✂️ Trích nợ: ${Math.round(currentDeduct * 100)}% ➔ ${Math.round(Number(data.newAutoDeductPercent) * 100)}%`);
      }
    }

    appendAiChatBubble(chatLogs, {
      reply: data.reply,
      accepted: data.accepted,
      diffTags,
      botName: 'Trợ Lý Vay Vàng AI',
      botIcon: '🤖',
      options: data.options,
      mode: 'loan',
      toolsExecuted: data.toolsExecuted,
      onSelectOption: (opt) => sendBankDebateMessage(opt.argument || `Chốt phương án ${opt.id}`, opt)
    });

    currentBankDebateHistory.push({ user: argument, arbiter: data.reply });

    if (data.accepted) {
      bankNegotiatedTerms = {
        amount: data.newAmount,
        borrowRate: data.newBorrowRate,
        autoDeductPercent: data.newAutoDeductPercent,
        creditLimit: data.newCreditLimit,
        signature: data.signature
      };

      if (inputBorrow && data.newAmount) {
        inputBorrow.value = data.newAmount;
      }
      if (inputDeduct && data.newAutoDeductPercent) {
        const pct = Math.round(data.newAutoDeductPercent * 100);
        inputDeduct.value = pct;
        onDeductPercentChange(pct);
      }

      const badge = document.getElementById('bank-negotiated-badge');
      const termsSpan = document.getElementById('bank-negotiated-terms');
      if (badge && termsSpan) {
        termsSpan.textContent = `Lãi ${(data.newBorrowRate * 100).toFixed(1)}%/ngày • Hạn mức ${data.newCreditLimit} Vàng • Trích ${Math.round(data.newAutoDeductPercent * 100)}%`;
        badge.classList.remove('hidden');
      }

      const elLimitBadge = document.getElementById('bank-credit-limit-badge');
      if (elLimitBadge && data.newCreditLimit) {
        elLimitBadge.innerHTML = `<span>Hạn mức: ${data.newCreditLimit}</span> ${COIN_ICON_HTML} <span class="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded font-bold ml-1">Ưu đãi</span>`;
      }

      showToast('Thương lượng thành công! AI đã áp dụng điều khoản ưu đãi.', 'gold');
      if (typeof sfx !== 'undefined' && sfx.playFanfare) sfx.playFanfare();
    }
  } catch (err) {
    if (loadingBubble && loadingBubble.cleanup) loadingBubble.cleanup();
    loadingBubble.remove();
    const errRow = document.createElement('div');
    errRow.className = 'flex justify-start items-start gap-2 message-fade-in';
    errRow.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">⚠️</div>
      <div class="max-w-[85%] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl rounded-tl-xs p-3 text-xs text-rose-700 dark:text-rose-300 shadow-xs">
        <strong>Lỗi thương lượng:</strong> ${escapeHtml(err.message || 'Không thể kết nối với AI. Vui lòng thử lại.')}
      </div>
    `;
    chatLogs.appendChild(errRow);
    chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });
    showToast('Lỗi thương lượng: ' + (err.message || 'Vui lòng thử lại'), 'error');
  } finally {
    isDebatingBankLoan = false;
    if (argInput) {
      argInput.disabled = false;
      argInput.focus();
    }
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.innerHTML = `<span>Gửi</span><span class="text-[10px]">➤</span>`;
    }
  }
}
window.sendBankDebateMessage = sendBankDebateMessage;
window.loadBankLoanConsultation = loadBankLoanConsultation;

async function executeBankBorrow() {
  if (isBankActionPending) return;
  isBankActionPending = true;
  try {
    ensureUserBankProfile();
    const bank = appState.profile.bank;
    if (bank.loan && (bank.loan.debt || 0) > 0) {
      showToast('Bạn đang có khoản vay chưa thanh toán! Vui lòng trả hết nợ trước khi vay thêm.', 'error');
      return;
    }

    const inputAmount = document.getElementById('input-borrow-amount');
    const inputDeduct = document.getElementById('input-deduct-percent');
    const borrowAmt = parseInt(inputAmount?.value, 10);
    const deductPct = parseInt(inputDeduct?.value, 10) || 50;
    const autoDeduct = deductPct / 100;

    if (!borrowAmt || borrowAmt <= 0) {
      showToast('Vui lòng nhập số Vàng muốn vay hợp lệ (> 0)!', 'error');
      return;
    }

    const standardLimit = calculateLocalCreditLimit(appState.profile, autoDeduct);
    const effectiveLimit = bankNegotiatedTerms?.creditLimit || standardLimit;
    if (borrowAmt > effectiveLimit) {
      showToast(`Số Vàng vay (${borrowAmt}) vượt quá hạn mức tối đa (${effectiveLimit}) của bạn!`, 'error');
      return;
    }

    const negotiatedRateText = bankNegotiatedTerms?.borrowRate
      ? `\n📉 Lãi suất ưu đãi đã chốt: ${(bankNegotiatedTerms.borrowRate * 100).toFixed(1)}%/ngày`
      : '';

    const ok = await confirmAction({
      title: 'Xác Nhận Vay Vàng Tức Thời?',
      message: `Vay ${borrowAmt} Vàng từ Ngân Hàng Hệ Thống?`,
      detail: `⚡ Nhận ngay: +${borrowAmt} Vàng vào ví\n✂️ Tự động trích: ${deductPct}% Vàng thưởng mỗi khi hoàn thành nhiệm vụ${negotiatedRateText}\n⏱️ Thời hạn: 7 ngày (sau 7 ngày sẽ tạm khóa Cửa Hàng để thu hồi nợ)\n💡 Phí phạt tất toán sớm: 5% nếu tự trả nợ bằng ví Vàng trước hạn (làm việc trả dần được miễn 100% phí phạt).`,
      confirmText: 'Vay Ngay ⚡',
      cancelText: 'Hủy',
      icon: '⚡',
      btnColor: 'blue'
    });
    if (!ok) return;

    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    if (!token) {
      showToast('Vui lòng đăng nhập tài khoản Google để vay Vàng và lưu trữ an toàn!', 'warning');
      return;
    }
    let serverSuccess = false;

    if (token) {
      try {
        const res = await fetch('/api/sync?action=bank_borrow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: borrowAmt,
            autoDeductPercent: autoDeduct,
            loanSignature: bankNegotiatedTerms?.signature,
            borrowRate: bankNegotiatedTerms?.borrowRate,
            negotiatedRate: bankNegotiatedTerms?.borrowRate,
            creditLimit: bankNegotiatedTerms?.creditLimit,
            negotiatedLimit: bankNegotiatedTerms?.creditLimit
          })
        });
        if (res.ok) {
          const data = await res.json();
          appState.profile.coins = data.coins;
          appState.profile.bank.loan = data.loan;
          appState.profile.bank.isFrozen = false;
          currentBankPool = data.pool;
          if (Array.isArray(data.ledger)) {
            appState.ledger = data.ledger;
          }
          serverSuccess = true;
          showToast(data.message || `Giải ngân thành công ${borrowAmt} Vàng!`, 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Vay Vàng thất bại trên máy chủ!', 'error');
          return;
        }
      } catch (e) {
        console.warn('Lỗi kết nối khi vay Vàng, thực hiện lưu cục bộ:', e);
      }
    }

    if (!serverSuccess) {
      const rates = calculateLocalBankRates(currentBankPool);
      const finalRate = bankNegotiatedTerms?.borrowRate ?? rates.borrowRate;
      let bailoutInjected = 0;
      if (currentBankPool.poolGold < borrowAmt) {
        bailoutInjected = borrowAmt - currentBankPool.poolGold;
        currentBankPool.bailoutDebt = (currentBankPool.bailoutDebt || 0) + bailoutInjected;
        currentBankPool.poolGold += bailoutInjected;
      }
      currentBankPool.poolGold = Math.max(0, currentBankPool.poolGold - borrowAmt);
      currentBankPool.totalBorrowed = (currentBankPool.totalBorrowed || 0) + borrowAmt;

      appState.profile.coins += borrowAmt;
      appState.profile.bank.loan = {
        principal: borrowAmt,
        debt: borrowAmt,
        borrowRate: finalRate,
        autoDeductPercent: autoDeduct,
        borrowedAt: Date.now(),
        lastAccruedAt: Date.now(),
        isOverdue: false
      };
      appState.profile.bank.isFrozen = false;

      addLedgerEntry({
        id: 'bank_bor_' + Date.now(),
        type: 'earn',
        category: 'bank_borrow',
        amount: borrowAmt,
        title: 'Vay Vàng Ngân Hàng',
        description: `🏦 Đã vay ${borrowAmt} Vàng (Lãi suất: ${(finalRate * 100).toFixed(1)}%/ngày, trích nợ: ${deductPct}% mỗi nhiệm vụ).`,
        timestamp: Date.now()
      });
      showToast(`Giải ngân thành công ${borrowAmt} Vàng!`, 'success');
    }

    bankNegotiatedTerms = null;
    const negBadge = document.getElementById('bank-negotiated-badge');
    if (negBadge) negBadge.classList.add('hidden');

    sfx.playFanfare();
    if (inputAmount) inputAmount.value = '';
    triggerSave(true);
    renderHeader();
    renderLedger();
    loadBankState();
  } finally {
    isBankActionPending = false;
  }
}

async function executeBankRepay() {
  if (isBankActionPending) return;
  isBankActionPending = true;
  try {
    ensureUserBankProfile();
    const loan = appState.profile.bank.loan;
    const currentDebt = loan?.debt || 0;
    if (!loan || currentDebt <= 0) {
      showToast('Bạn không có khoản nợ nào cần thanh toán!', 'info');
      return;
    }
    const userCoins = appState.profile.coins || 0;
    if (userCoins <= 0) {
      showToast('Ví của bạn không còn Vàng để trả nợ!', 'error');
      return;
    }

    // Lãi suất phạt tất toán sớm (5% phí trả trước hạn, tối thiểu 1 Vàng khi chưa quá hạn)
    const isOverdue = Boolean(loan.isOverdue);
    const penaltyRate = isOverdue ? 0 : 0.05;
    let payAmt = Math.min(userCoins, currentDebt);
    let penaltyFee = (!isOverdue && payAmt > 0) ? Math.max(1, Math.round(payAmt * penaltyRate)) : 0;

    if (payAmt + penaltyFee > userCoins) {
      // Điều chỉnh payAmt sao cho tổng chi (payAmt + penaltyFee) <= userCoins
      payAmt = Math.max(1, Math.floor((userCoins - (penaltyRate > 0 ? 1 : 0)) / (1 + penaltyRate)));
      penaltyFee = (!isOverdue && payAmt > 0) ? Math.max(1, Math.round(payAmt * penaltyRate)) : 0;
      while (payAmt > 0 && payAmt + penaltyFee > userCoins) {
        payAmt--;
        penaltyFee = (!isOverdue && payAmt > 0) ? Math.max(1, Math.round(payAmt * penaltyRate)) : 0;
      }
    }

    const totalDeduct = payAmt + penaltyFee;
    if (totalDeduct <= 0 || totalDeduct > userCoins) {
      showToast('Số Vàng trong ví không đủ để thanh toán nợ kèm phí phạt tất toán sớm!', 'error');
      return;
    }

    const isFullSettlement = payAmt >= currentDebt;
    const ok = await confirmAction({
      title: isFullSettlement ? 'Tất Toán Nợ Sớm?' : 'Trả Nợ Sớm?',
      message: isFullSettlement
        ? (penaltyFee > 0
            ? `Tất toán toàn bộ ${payAmt} Vàng nợ với phí phạt tất toán sớm 5% (+${penaltyFee} Vàng)?`
            : `Tất toán toàn bộ ${payAmt} Vàng nợ quá hạn?`)
        : (penaltyFee > 0
            ? `Dùng ${payAmt} Vàng trả nợ + ${penaltyFee} Vàng phí phạt tất toán sớm (5%)?`
            : `Dùng ${payAmt} Vàng trong ví để trả bớt khoản nợ?`),
      detail: `💰 Vàng trong ví: ${userCoins} ➔ ${userCoins - totalDeduct}\n💳 Số nợ thanh toán: -${payAmt} Vàng${penaltyFee > 0 ? `\n⚡ Phí phạt tất toán sớm (5%): +${penaltyFee} Vàng` : ''}\n📉 Nợ còn lại: ${Math.max(0, currentDebt - payAmt)} Vàng.${penaltyFee > 0 ? '\n\n💡 Mẹo: Bạn có thể tiếp tục hoàn thành nhiệm vụ để hệ thống tự trích nợ dần hoàn toàn miễn phí phạt (0%)!' : ''}`,
      confirmText: `Trả Nợ (${totalDeduct} 🪙)`,
      cancelText: 'Hủy',
      icon: '💳',
      btnColor: 'amber'
    });
    if (!ok) return;

    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    if (!token) {
      showToast('Vui lòng đăng nhập tài khoản Google để trả nợ Ngân Hàng!', 'warning');
      return;
    }
    let serverSuccess = false;

    if (token) {
      try {
        const res = await fetch('/api/sync?action=bank_repay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: payAmt,
            penaltyFee
          })
        });
        if (res.ok) {
          const data = await res.json();
          appState.profile.coins = data.coins;
          appState.profile.bank.loan = data.loan;
          appState.profile.bank.isFrozen = false;
          currentBankPool = data.pool;
          if (Array.isArray(data.ledger)) {
            appState.ledger = data.ledger;
          }
          serverSuccess = true;
          showToast(data.message || `Đã thanh toán ${payAmt} Vàng nợ!`, 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Thanh toán nợ thất bại trên máy chủ!', 'error');
          return;
        }
      } catch (e) {
        console.warn('Lỗi kết nối khi thanh toán nợ, thực hiện lưu cục bộ:', e);
      }
    }

    if (!serverSuccess) {
      appState.profile.coins -= totalDeduct;

      const principal = Math.max(0, parseInt(loan.principal, 10) || 0);
      const accruedInterest = Math.max(0, (parseInt(loan.debt, 10) || 0) - principal);
      const interestPaid = Math.min(accruedInterest, payAmt);
      const principalPaid = Math.min(principal, Math.max(0, payAmt - interestPaid));

      loan.debt = Math.max(0, (parseInt(loan.debt, 10) || 0) - payAmt);
      loan.principal = Math.max(0, principal - principalPaid);
      currentBankPool.totalBorrowed = Math.max(0, (currentBankPool.totalBorrowed || 0) - principalPaid);

      // Hoàn nợ kho bạc nếu có
      let treasuryRepay = 0;
      if (currentBankPool.bailoutDebt > 0) {
        treasuryRepay = Math.min(currentBankPool.bailoutDebt, Math.floor(payAmt * 0.5) + penaltyFee);
        currentBankPool.bailoutDebt -= treasuryRepay;
      }
      const remainingPaid = totalDeduct - treasuryRepay;
      const goldToPool = Math.min(principalPaid, remainingPaid);
      currentBankPool.poolGold = (currentBankPool.poolGold || 0) + goldToPool;
      const goldToReserve = remainingPaid - goldToPool;
      if (goldToReserve > 0) {
        currentBankPool.reserveFund = (currentBankPool.reserveFund || 0) + goldToReserve;
      }

      let loanCleared = false;
      if (loan.debt <= 0) {
        loanCleared = true;
        appState.profile.bank.loan = null;
        appState.profile.bank.isFrozen = false;
        if (appState.profile.title === 'Con Nợ Quá Hạn ⚠️') {
          updateTitleByLevel();
        }
      }

      addLedgerEntry({
        id: 'bank_rep_' + Date.now(),
        type: 'spend',
        category: 'bank_repay',
        amount: totalDeduct,
        title: 'Trả nợ sớm Ngân Hàng',
        description: `🏦 Đã trả ${payAmt} Vàng nợ${penaltyFee > 0 ? ` + ${penaltyFee} Vàng phí phạt tất toán sớm (5%)` : ''}.${loanCleared ? ' Khoản nợ đã được tất toán!' : ` Nợ còn lại: ${loan.debt} Vàng.`}`,
        timestamp: Date.now()
      });
      showToast(`Đã trả thành công ${payAmt} Vàng${penaltyFee > 0 ? ` (phí phạt: ${penaltyFee} Vàng)` : ''}!${loanCleared ? ' Chúc mừng bạn đã tất toán toàn bộ nợ!' : ''}`, 'success');
    }

    sfx.playCoin();
    triggerSave(true);
    renderHeader();
    renderLedger();
    loadBankState();
  } finally {
    isBankActionPending = false;
  }
}

window.loadBankState = loadBankState;
window.renderAdminBankTelemetry = renderAdminBankTelemetry;
window.updateDepositCalculator = updateDepositCalculator;
window.setCalcDays = setCalcDays;
window.onDepositAmountInput = onDepositAmountInput;
window.setDepositAmount = setDepositAmount;
window.setDepositMax = setDepositMax;
window.executeBankDeposit = executeBankDeposit;
window.executeBankWithdraw = executeBankWithdraw;
window.openBankWithdrawModal = openBankWithdrawModal;
window.setWithdrawAmountPreset = setWithdrawAmountPreset;
window.onWithdrawAmountInput = onWithdrawAmountInput;
window.confirmAndExecuteWithdraw = confirmAndExecuteWithdraw;
window.onDeductPercentChange = onDeductPercentChange;
window.executeBankBorrow = executeBankBorrow;
window.executeBankRepay = executeBankRepay;

// =============================================================================
// 14. EVENT LISTENERS ATTACHMENT
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initStartupFlow();

  // Tự động kiểm tra và đồng bộ khi người dùng quay lại tab hoặc mở lại ứng dụng trên máy khác
  window.addEventListener('focus', () => {
    if (appState.profile?.googleId && appState.profile?.nickname) {
      hydrateFromCloud(false);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && appState.profile?.googleId && appState.profile?.nickname) {
      hydrateFromCloud(false);
    }
  });

  // Đánh dấu ngoại tuyến tức thì khi người dùng đóng tab hoặc chuyển trang
  const sendOfflineBeacon = () => {
    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    if (token && navigator.sendBeacon) {
      navigator.sendBeacon(`/api/sync?action=offline&token=${encodeURIComponent(token)}`);
    }
  };
  window.addEventListener('beforeunload', sendOfflineBeacon);
  window.addEventListener('pagehide', sendOfflineBeacon);

  // Lắng nghe tín hiệu đồng bộ đa tab từ BroadcastChannel khi Admin tinh chỉnh chỉ số hoặc đếm giờ
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const syncChannel = new BroadcastChannel('levelup_sync_channel');
      syncChannel.onmessage = (event) => {
        if (event.data?.tabId === CURRENT_TAB_ID) return; // Bỏ qua thông điệp phát từ chính tab này
        if (event.data?.type === 'TIMER_SYNC_UPDATE') {
          // Nếu tab khác đã giành quyền runner, dừng ngay lập tức tại tab này (0ms delay)
          if (event.data.runnerId && event.data.runnerId !== CURRENT_RUNNER_ID && isFocusRunning) {
            isFocusRunning = false;
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
            releaseWakeLock();
          }
          if (event.data.action === 'cancel' || event.data.action === 'hold') {
            lastLocalTimerActionTime = Date.now();
            appState.lastTimerClearedAt = Date.now();
            clearFocusTimerSession(false);
            if (event.data.action === 'hold') {
              if (event.data.questId && event.data.savedTimer) {
                const q = appState.quests?.find(x => x.id === event.data.questId);
                if (q) q.savedTimer = event.data.savedTimer;
                renderQuests();
              } else if (event.data.rewardItemId && event.data.savedTimer) {
                const it = appState.inventory?.find(x => x.id === event.data.rewardItemId);
                if (it) it.savedTimer = event.data.savedTimer;
                renderInventory();
              }
            }
          } else if (event.data.action === 'clearSaved') {
            lastLocalTimerActionTime = Date.now();
            if (event.data.questId) {
              const q = appState.quests?.find(x => x.id === event.data.questId);
              if (q) delete q.savedTimer;
              renderQuests();
            } else if (event.data.rewardItemId) {
              const it = appState.inventory?.find(x => x.id === event.data.rewardItemId);
              if (it) delete it.savedTimer;
              renderInventory();
            }
          } else if (event.data.action === 'pause' && isFocusRunning) {
            lastLocalTimerActionTime = Date.now();
            isFocusRunning = false;
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
            releaseWakeLock();
            renderFocusStationUI();
            updateTimerDisplay();
          } else if (event.data.action === 'start' || event.data.action === 'resume') {
            if (appState.profile?.googleId && appState.profile?.nickname) {
              hydrateFromCloud(false);
            }
          }
        } else if (event.data?.type === 'ADMIN_SYNC_UPDATE') {
          if (appState.profile?.googleId && appState.profile?.nickname) {
            hydrateFromCloud(false);
          }
        } else if (event.data?.type === 'STATE_UPDATED') {
          if (event.data.profile) {
            if (event.data.profile.coins !== undefined) appState.profile.coins = event.data.profile.coins;
            if (event.data.profile.totalCoinsEarned !== undefined) appState.profile.totalCoinsEarned = event.data.profile.totalCoinsEarned;
            if (event.data.profile.adminAdjusted !== undefined) appState.profile.adminAdjusted = event.data.profile.adminAdjusted;
            if (event.data.profile.bank) appState.profile.bank = event.data.profile.bank;
            renderHeader();
          }
        }
      };
    } catch (_) {}
  }

  // Polling định kỳ mỗi 10 giây nếu tab đang mở để tự động bắt kịp đồng hồ đếm ngược giữa các thiết bị
  setInterval(() => {
    if (!document.hidden && appState.profile?.googleId && appState.profile?.nickname) {
      hydrateFromCloud(false);
    }
  }, 10000);

  // Polling tần suất cao 2.5 giây khi có phiên đếm giờ đang hoạt động để dừng thiết bị cũ và nhận diện kịp thời
  setInterval(() => {
    if (!document.hidden && (isFocusRunning || appState.activeTimer) && appState.profile?.googleId && appState.profile?.nickname) {
      // Nếu thiết bị này đang là runner đang chạy, nó là nguồn sự thật và đã có checkpoint 30s, không cần poll đè lên chính nó
      const isCurrentActiveRunner = isFocusRunning && (!appState.activeTimer?.runnerId || appState.activeTimer.runnerId === CURRENT_RUNNER_ID);
      if (!isCurrentActiveRunner) {
        hydrateFromCloud(false);
      }
    }
  }, 2500);

  // Navigation Tab buttons (Desktop & Mobile)
  document.querySelectorAll('.nav-tab, .mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.playClick();
      switchTab(btn.dataset.tab);
    });
  });

  // More Tabs Dropdown / Popover (Desktop & Mobile)
  const btnNavMore = document.getElementById('btn-nav-more');
  const navMoreMenu = document.getElementById('nav-more-menu');
  if (btnNavMore && navMoreMenu) {
    btnNavMore.addEventListener('click', (e) => {
      e.stopPropagation();
      navMoreMenu.classList.toggle('hidden');
    });
  }

  const btnMobileMore = document.getElementById('btn-mobile-more');
  const mobileMoreMenu = document.getElementById('mobile-more-menu');
  if (btnMobileMore && mobileMoreMenu) {
    btnMobileMore.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMoreMenu.classList.toggle('hidden');
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#nav-more-dropdown-container')) {
      navMoreMenu?.classList.add('hidden');
    }
    if (!e.target.closest('#btn-mobile-more') && !e.target.closest('#mobile-more-menu')) {
      mobileMoreMenu?.classList.add('hidden');
    }
    if (!e.target.closest('.btn-quest-menu') && !e.target.closest('.btn-shop-menu') && !e.target.closest('.btn-inv-menu') && !e.target.closest('.quest-dropdown-menu')) {
      closeAllCardDropdowns();
    }
  });

  // Leaderboard Sub-tabs (Bảng Hiệp Sĩ & Sổ Đen Gian Lận)
  const btnSubtabRanking = document.getElementById('btn-subtab-ranking');
  if (btnSubtabRanking) {
    btnSubtabRanking.addEventListener('click', () => {
      sfx.playClick();
      switchLeaderboardSubtab('ranking');
    });
  }
  const btnSubtabCheaters = document.getElementById('btn-subtab-cheaters');
  if (btnSubtabCheaters) {
    btnSubtabCheaters.addEventListener('click', () => {
      sfx.playClick();
      switchLeaderboardSubtab('cheaters');
    });
  }

  // Leaderboard Refresh & Search Controls
  const btnRefreshLeaderboard = document.getElementById('btn-refresh-leaderboard');
  if (btnRefreshLeaderboard) {
    btnRefreshLeaderboard.addEventListener('click', () => {
      sfx.playClick();
      btnRefreshLeaderboard.classList.add('animate-spin');
      fetchLeaderboard().finally(() => {
        setTimeout(() => btnRefreshLeaderboard.classList.remove('animate-spin'), 600);
      });
    });
  }

  const inputSearchLeaderboard = document.getElementById('leaderboard-search-input');
  if (inputSearchLeaderboard) {
    inputSearchLeaderboard.addEventListener('input', (e) => {
      currentLeaderboardSearch = e.target.value || '';
      renderLeaderboardTable(currentLeaderboardData);
    });
  }

  // Quest filters
  document.querySelectorAll('.quest-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quest-filter').forEach(b => {
        b.className = 'quest-filter px-2 sm:px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium whitespace-nowrap shrink-0';
      });
      btn.className = 'quest-filter active px-2 sm:px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold whitespace-nowrap shrink-0';
      currentQuestFilter = btn.dataset.filter;
      renderQuests();
    });
  });

  // Theme Toggle Button
  const themeToggle = document.getElementById('toggle-theme-btn');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Sound FX Toggle Buttons (Header + Profile Modal)
  function toggleSound() {
    appState.profile.soundEnabled = !appState.profile.soundEnabled;
    sfx.enabled = appState.profile.soundEnabled;
    renderHeader();
    if (sfx.enabled) sfx.playCoin();
    triggerSave(false);
  }

  const soundBtn = document.getElementById('toggle-sound-btn');
  if (soundBtn) soundBtn.addEventListener('click', toggleSound);

  const modalSoundBtn = document.getElementById('modal-sound-btn');
  if (modalSoundBtn) modalSoundBtn.addEventListener('click', toggleSound);

  // Focus Station Banner & Focus Timer controls
  const btnTimerToggle = document.getElementById('btn-timer-toggle');
  if (btnTimerToggle) btnTimerToggle.addEventListener('click', toggleFocusTimer);

  const btnTimerReset = document.getElementById('btn-timer-reset');
  if (btnTimerReset) btnTimerReset.addEventListener('click', resetFocusTimer);

  const btnTimerHold = document.getElementById('btn-timer-hold');
  if (btnTimerHold) btnTimerHold.addEventListener('click', holdFocusTimer);

  // Quick adjust buttons (-5m, +1m, +5m)
  document.querySelectorAll('.btn-timer-adjust').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.dataset.delta, 10) || 0;
      adjustTimer(delta);
    });
  });

  // Clickable time display to open direct editor
  const btnOpenEditTimer = document.getElementById('btn-open-edit-timer');
  if (btnOpenEditTimer) {
    btnOpenEditTimer.addEventListener('click', openEditTimerModal);
  }

  // Preset time chips in edit modal
  document.querySelectorAll('.btn-preset-time').forEach(btn => {
    btn.addEventListener('click', () => {
      const mins = parseInt(btn.dataset.mins, 10) || 25;
      const isReward = Boolean(activeRewardItem || appState.activeTimer?.isRewardMode);
      if (activeFocusQuest && mins < activeFocusQuest.targetMinutes) {
        showToast(`Không thể chọn mốc thấp hơn ${activeFocusQuest.targetMinutes} phút do AI đã định giá!`, 'error');
        sfx.playClick();
        return;
      }
      if (isReward && mins * 60 > focusRemainingSeconds) {
        showToast('Thời gian hưởng thụ chỉ được trừ xuống, không thể cộng thêm!', 'error');
        sfx.playClick();
        return;
      }
      const minInput = document.getElementById('input-edit-minutes');
      const secInput = document.getElementById('input-edit-seconds');
      if (minInput) minInput.value = mins;
      if (secInput) secInput.value = 0;
      sfx.playClick();
    });
  });

  // Save button in edit modal
  const btnSaveEdit = document.getElementById('btn-save-edit-timer');
  if (btnSaveEdit) {
    btnSaveEdit.addEventListener('click', () => {
      const minInput = document.getElementById('input-edit-minutes');
      const secInput = document.getElementById('input-edit-seconds');
      const mins = Math.max(0, parseInt(minInput ? minInput.value : 25, 10) || 0);
      const secs = Math.max(0, Math.min(59, parseInt(secInput ? secInput.value : 0, 10) || 0));
      saveEditTimer(mins, secs);
    });
  }
  ['input-edit-minutes', 'input-edit-seconds'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('btn-save-edit-timer')?.click();
        }
      });
    }
  });

  // Fullscreen Focus Overlay controls
  const btnZen = document.getElementById('btn-timer-zen');
  if (btnZen) btnZen.addEventListener('click', () => toggleZenMode(true));

  const btnZenExit = document.getElementById('btn-zen-exit');
  if (btnZenExit) btnZenExit.addEventListener('click', () => toggleZenMode(false));

  const btnZenToggle = document.getElementById('btn-zen-toggle');
  if (btnZenToggle) btnZenToggle.addEventListener('click', toggleFocusTimer);

  const btnZenHold = document.getElementById('btn-zen-hold');
  if (btnZenHold) {
    btnZenHold.addEventListener('click', () => {
      toggleZenMode(false);
      holdFocusTimer();
    });
  }

  // Focus Complete celebration modal actions
  const btnCompleteClaim = document.getElementById('btn-focus-complete-claim');
  if (btnCompleteClaim) {
    btnCompleteClaim.addEventListener('click', () => {
      closeModal('modal-focus-complete');
    });
  }

  const btnCompleteBreak = document.getElementById('btn-focus-complete-break');
  if (btnCompleteBreak) {
    btnCompleteBreak.addEventListener('click', () => {
      closeModal('modal-focus-complete');
      startBreakTimer(5);
    });
  }

  // Multi-tab Focus Timer Sync
  window.addEventListener('storage', (e) => {
    if (e.key === TIMER_STORAGE_KEY) {
      if (!e.newValue) {
        clearFocusTimerSession(false);
      } else {
        try {
          const syncState = JSON.parse(e.newValue);
          if (syncState) {
            const isRecentLocalAction = (Date.now() - lastLocalTimerActionTime < TIMER_MUTATION_GRACE_MS);
            if (isRecentLocalAction && !isFocusRunning && !activeFocusQuest && !activeRewardItem) {
              // Tab này vừa chủ động dừng/hủy/bảo lưu, bỏ qua phục hồi từ tab khác
              return;
            }
            const syncTime = Number(syncState.updatedAt || syncState.lastTickTime || 0);
            if (syncTime < (appState.lastTimerClearedAt || 0) || (isRecentLocalAction && syncTime <= lastLocalTimerActionTime)) {
              return;
            }
            appState.activeTimer = syncState;
            restoreFocusTimer();
          }
        } catch (_) {}
      }
    }
  });

  function highlightSelectedAvatar(selectedAvatar) {
    const current = selectedAvatar || appState.profile.avatar || '⚔️';
    document.querySelectorAll('.avatar-opt').forEach(b => {
      const isSelected = b.dataset.avatar === current;
      if (isSelected) {
        b.classList.remove('border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800');
        b.classList.add(
          'border-amber-500',
          'dark:border-amber-500',
          'bg-amber-500/20',
          'dark:bg-amber-500/20',
          'ring-2',
          'ring-amber-500',
          'ring-offset-2',
          'ring-offset-white',
          'dark:ring-offset-slate-900',
          'scale-105'
        );
      } else {
        b.classList.remove(
          'border-amber-500',
          'dark:border-amber-500',
          'bg-amber-500/20',
          'dark:bg-amber-500/20',
          'ring-2',
          'ring-amber-500',
          'ring-offset-2',
          'ring-offset-white',
          'dark:ring-offset-slate-900',
          'scale-105'
        );
        b.classList.add('border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800');
      }
    });
  }

  // Level & EXP Info Modal Triggers
  const btnLevelInfo = document.getElementById('btn-level-info');
  if (btnLevelInfo) {
    btnLevelInfo.addEventListener('click', () => {
      sfx.playClick();
      openLevelInfoModal();
    });
  }

  const btnLevelFromProfile = document.getElementById('btn-open-level-info-from-profile');
  if (btnLevelFromProfile) {
    btnLevelFromProfile.addEventListener('click', () => {
      sfx.playClick();
      openLevelInfoModal();
    });
  }

  // Streak Info Modal Triggers
  const btnStreakInfo = document.getElementById('btn-streak-info');
  if (btnStreakInfo) {
    btnStreakInfo.addEventListener('click', () => {
      sfx.playClick();
      openStreakInfoModal();
    });
  }

  const btnStreakFromProfile = document.getElementById('btn-open-streak-info-from-profile');
  if (btnStreakFromProfile) {
    btnStreakFromProfile.addEventListener('click', () => {
      sfx.playClick();
      openStreakInfoModal();
    });
  }

  // Profile Modal & Avatar Picker
  document.getElementById('open-profile-btn').addEventListener('click', () => {
    document.getElementById('input-hero-nickname').value = appState.profile.nickname;

    const roleBadge = document.getElementById('profile-role-badge');
    if (roleBadge) {
      const isAdmin = isUserAdmin();
      roleBadge.textContent = isAdmin ? '👑 Quản Trị Viên (Admin)' : '👤 Hiệp Sĩ';
      roleBadge.className = isAdmin
        ? 'font-bold px-2 py-0.5 rounded text-[11px] bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
        : 'font-bold px-2 py-0.5 rounded text-[11px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
    }

    const emailEl = document.getElementById('profile-google-email');
    const nameEl = document.getElementById('profile-google-name');
    const avatarImg = document.getElementById('profile-google-avatar');
    const avatarPlaceholder = document.getElementById('profile-google-avatar-placeholder');

    const email = appState.profile.googleEmail || '';
    const name = appState.profile.nickname || (email ? email.split('@')[0] : 'Hiệp Sĩ');
    const picture = appState.profile.googlePicture || (isAvatarUrl(appState.profile.avatar) ? appState.profile.avatar : '');

    if (emailEl) emailEl.textContent = email || 'Chưa liên kết';
    if (nameEl) nameEl.textContent = name;
    if (avatarImg && avatarPlaceholder) {
      if (picture) {
        avatarImg.referrerPolicy = 'no-referrer';
        avatarImg.src = picture;
        avatarImg.classList.remove('hidden');
        avatarPlaceholder.classList.add('hidden');
        avatarImg.onerror = () => {
          avatarImg.classList.add('hidden');
          avatarPlaceholder.classList.remove('hidden');
        };
      } else {
        avatarImg.classList.add('hidden');
        avatarPlaceholder.classList.remove('hidden');
        avatarPlaceholder.textContent = (email ? email[0] : 'G').toUpperCase();
      }
    }

    const googleAvatarOpt = document.getElementById('avatar-opt-google');
    const googleAvatarOptImg = document.getElementById('avatar-opt-google-img');
    if (googleAvatarOpt && googleAvatarOptImg) {
      if (picture) {
        googleAvatarOpt.dataset.avatar = picture;
        googleAvatarOptImg.referrerPolicy = 'no-referrer';
        googleAvatarOptImg.src = picture;
        googleAvatarOpt.classList.remove('hidden');
      } else {
        googleAvatarOpt.classList.add('hidden');
        googleAvatarOpt.dataset.avatar = '';
      }
    }

    // Cập nhật trạng thái avatar được chọn
    highlightSelectedAvatar(appState.profile.avatar);

    openModal('modal-profile');
  });

  const btnSwitchGoogle = document.getElementById('btn-switch-google-account');
  if (btnSwitchGoogle) {
    btnSwitchGoogle.addEventListener('click', switchGoogleAccount);
  }

  const btnLogoutGoogle = document.getElementById('btn-logout-google');
  if (btnLogoutGoogle) {
    btnLogoutGoogle.addEventListener('click', logoutGoogle);
  }

  document.querySelectorAll('.avatar-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const val = btn.dataset.avatar;
      if (!val) return;
      appState.profile.avatar = val;
      highlightSelectedAvatar(val);
      if (sfx && typeof sfx.playClick === 'function') sfx.playClick();
    });
  });

  document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const nick = document.getElementById('input-hero-nickname').value.trim();
    if (!nick) {
      showToast('Nickname không được để trống!', 'error');
      return;
    }

    const token = appState.profile.googleToken || '';
    const currentNick = appState.profile.nickname;

    // Kiểm tra tính khả dụng của nickname nếu người dùng đổi sang tên mới
    if (currentNick && currentNick !== nick) {
      try {
        const checkRes = await fetch(`/api/sync?action=check_nickname&nickname=${encodeURIComponent(nick)}&token=${encodeURIComponent(token)}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (!checkData.available) {
            showToast(`Nickname "${nick}" đã có người sở hữu. Vui lòng chọn tên khác!`, 'error');
            return;
          }
        }
      } catch (e) {
        // Tiếp tục nếu offline
      }
      appState.pendingOldNickname = appState.pendingOldNickname || currentNick;
    }

    if (nick === appState.pendingOldNickname) {
      delete appState.pendingOldNickname;
    }

    appState.profile.nickname = nick;
    closeModal('modal-profile');
    showToast('Đã lưu hồ sơ và bắt đầu đồng bộ...', 'info');
    triggerSave(true);
  });

  const inputHeroNick = document.getElementById('input-hero-nickname');
  if (inputHeroNick) {
    inputHeroNick.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btn-save-profile')?.click();
      }
    });
  }

  const btnForceCloud = document.getElementById('btn-force-cloud-load');
  if (btnForceCloud) {
    btnForceCloud.addEventListener('click', () => {
      loadFromCloud();
    });
  }

  // Open Quest Modal (Desktop & Mobile buttons)
  const openQuestHandler = () => {
    currentEditingQuestId = null;
    sfx.playClick();
    const titleEl = document.getElementById('modal-quest-title');
    const subEl = document.getElementById('modal-quest-subtitle');
    if (titleEl) titleEl.textContent = 'THÊM NHIỆM VỤ MỚI (AI TÍNH THƯỞNG)';
    if (subEl) subEl.textContent = 'Nhập việc cần làm, AI sẽ ước lượng độ khó và tính số Vàng thưởng công bằng';
    const acceptBtn = document.getElementById('btn-accept-verdict');
    if (acceptBtn) acceptBtn.textContent = '✓ Đồng Ý & Thêm Nhiệm Vụ';

    document.getElementById('quest-form-step').classList.remove('hidden');
    document.getElementById('quest-evaluating-step').classList.add('hidden');
    document.getElementById('quest-verdict-step').classList.add('hidden');
    document.getElementById('input-quest-title').value = '';
    document.getElementById('input-quest-desc').value = '';
    document.getElementById('input-quest-estimate').value = '';
    const questDurEl = document.getElementById('input-quest-duration');
    if (questDurEl) questDurEl.value = '';
    const repeatOnceRadio = document.querySelector('input[name="quest-repeat"][value="once"]');
    if (repeatOnceRadio) repeatOnceRadio.checked = true;
    const modNotice = document.getElementById('verdict-modified-notice');
    if (modNotice) modNotice.classList.add('hidden');
    const questSuggestBox = document.getElementById('quest-suggestions-container');
    if (questSuggestBox) questSuggestBox.classList.remove('hidden');
    loadQuestSuggestions(false);
    openModal('modal-quest');
  };
  window.openQuestModal = openQuestHandler;
  window.openQuestRenegotiateModal = openQuestRenegotiateModal;
  const desktopAddQuestBtn = document.getElementById('btn-open-add-quest');
  if (desktopAddQuestBtn) desktopAddQuestBtn.addEventListener('click', openQuestHandler);
  const mobileAddQuestBtn = document.getElementById('btn-open-add-quest-mobile');
  if (mobileAddQuestBtn) mobileAddQuestBtn.addEventListener('click', openQuestHandler);



  const btnToggleQuestSug = document.getElementById('btn-toggle-quest-suggestions');
  if (btnToggleQuestSug) {
    btnToggleQuestSug.addEventListener('click', (e) => {
      e.stopPropagation();
      const listEl = document.getElementById('quest-suggestions-list');
      const iconEl = document.getElementById('icon-toggle-quest-suggestions');
      if (!listEl) return;
      const isHidden = listEl.classList.toggle('hidden');
      if (iconEl) iconEl.textContent = isHidden ? '▼' : '▲';
    });
  }

  document.getElementById('btn-submit-to-ai').addEventListener('click', submitQuestToAI);
  ['input-quest-title', 'input-quest-estimate', 'input-quest-duration'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitQuestToAI();
        }
      });
    }
  });
  document.getElementById('btn-accept-verdict').addEventListener('click', acceptVerdictAndCreateQuest);

  const verdictRepeatToggle = document.getElementById('verdict-repeat-toggle');
  if (verdictRepeatToggle) {
    verdictRepeatToggle.addEventListener('click', () => {
      if (!currentPendingVerdict) return;
      const targetState = !currentPendingVerdict.isRepeatable;
      if (targetState && (parseInt(currentPendingVerdict.rewardCoins, 10) || 0) > 15) {
        showToast(`Nhiệm vụ có mức thưởng cao (${currentPendingVerdict.rewardCoins} Vàng). Để chuyển sang lặp lại an toàn, hãy dùng tính năng Thương Lượng AI để cân đối lại!`, 'warning');
        return;
      }
      currentPendingVerdict.isRepeatable = targetState;
      sfx.playClick();
      updateVerdictDisplay();
    });
  }

  // Quest Debate features
  document.getElementById('btn-open-debate').addEventListener('click', () => {
    const debateBox = document.getElementById('debate-container');
    const isOpening = debateBox.classList.contains('hidden');
    debateBox.classList.toggle('hidden');
    if (isOpening) {
      initQuestDebateChat();
      const argInput = document.getElementById('input-debate-arg');
      if (argInput) {
        setTimeout(() => {
          argInput.focus();
          debateBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      }
    }
  });
  document.getElementById('btn-send-debate').addEventListener('click', sendDebateArgument);
  const inputDebateArg = document.getElementById('input-debate-arg');
  if (inputDebateArg) {
    inputDebateArg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendDebateArgument();
      }
    });
  }
  document.querySelectorAll('.quick-suggest-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const suggestText = btn.getAttribute('data-suggest');
      const input = document.getElementById('input-debate-arg');
      if (input && suggestText) {
        input.value = suggestText;
        input.focus();
        input.classList.add('ring-2', 'ring-amber-500');
        setTimeout(() => input.classList.remove('ring-2', 'ring-amber-500'), 500);
        sfx.playClick();
      }
    });
  });

  // Quest Proof Verification Camera & Modal Handlers
  const btnTriggerCamera = document.getElementById('btn-trigger-camera');
  const inputProofFile = document.getElementById('input-quest-proof-file');
  if (btnTriggerCamera && inputProofFile) {
    btnTriggerCamera.addEventListener('click', () => {
      if (!isMobilePhone()) {
        showToast('Chỉ cho phép chụp ảnh trực tiếp bằng điện thoại (chống gian lận)!', 'warning');
        return;
      }
      sfx.playClick();
      inputProofFile.click();
    });
  }

  if (inputProofFile) {
    inputProofFile.addEventListener('change', async (e) => {
      if (!isMobilePhone()) {
        e.target.value = '';
        showToast('Không cho phép đính kèm ảnh từ máy tính! Vui lòng dùng điện thoại chụp ảnh.', 'error');
        return;
      }
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        showToast('Đang xử lý ảnh...', 'info');
        const compressed = await compressImage(file);
        currentProofBase64 = compressed;

        const previewImg = document.getElementById('proof-preview-img');
        if (previewImg) previewImg.src = compressed;

        document.getElementById('proof-capture-zone')?.classList.add('hidden');
        document.getElementById('proof-preview-zone')?.classList.remove('hidden');

        const submitBtn = document.getElementById('btn-submit-proof');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.add('animate-pulse');
          setTimeout(() => submitBtn.classList.remove('animate-pulse'), 800);
        }
        sfx.playClick();
      } catch (err) {
        showToast(err.message || 'Lỗi xử lý ảnh!', 'error');
      }
    });
  }

  const btnRetakePhoto = document.getElementById('btn-retake-photo');
  if (btnRetakePhoto) {
    btnRetakePhoto.addEventListener('click', () => {
      if (!isMobilePhone()) {
        showToast('Chỉ hỗ trợ chụp ảnh trên điện thoại!', 'warning');
        return;
      }
      sfx.playClick();
      currentProofBase64 = null;
      if (inputProofFile) inputProofFile.value = '';
      document.getElementById('proof-preview-zone')?.classList.add('hidden');
      document.getElementById('proof-capture-zone')?.classList.remove('hidden');
      const submitBtn = document.getElementById('btn-submit-proof');
      if (submitBtn) submitBtn.disabled = true;
      inputProofFile?.click();
    });
  }

  const btnSubmitProof = document.getElementById('btn-submit-proof');
  if (btnSubmitProof) {
    btnSubmitProof.addEventListener('click', () => {
      sfx.playClick();
      submitQuestProofToAI();
    });
  }
  const inputProofNote = document.getElementById('input-quest-proof-note');
  if (inputProofNote) {
    inputProofNote.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-proof');
        if (submitBtn && !submitBtn.disabled) {
          sfx.playClick();
          submitQuestProofToAI();
        }
      }
    });
  }

  // Claim reward button on AI Proof Approved celebration modal
  const btnClaimProofReward = document.getElementById('btn-claim-proof-reward');
  if (btnClaimProofReward) {
    btnClaimProofReward.addEventListener('click', () => {
      closeModal('modal-proof-approved');
      if (pendingApprovedQuest) {
        const questId = pendingApprovedQuest.id;
        pendingApprovedQuest = null;
        completeQuest(questId, true);
      }
    });
  }

  const btnCloseProofApproved = document.getElementById('btn-close-proof-approved');
  if (btnCloseProofApproved) {
    btnCloseProofApproved.addEventListener('click', () => {
      closeModal('modal-proof-approved');
      if (pendingApprovedQuest) {
        const questId = pendingApprovedQuest.id;
        pendingApprovedQuest = null;
        completeQuest(questId, true);
      }
    });
  }

  // Handle live window resize / DevTools toggling while proof modal is open
  window.addEventListener('resize', () => {
    const modal = document.getElementById('modal-quest-proof');
    if (modal && !modal.classList.contains('hidden') && currentProofQuest) {
      const isMobile = isMobilePhone();
      const captureZone = document.getElementById('proof-capture-zone');
      const desktopNoticeZone = document.getElementById('proof-desktop-notice-zone');
      const submitBtn = document.getElementById('btn-submit-proof');
      const noteZone = document.getElementById('proof-note-zone');

      if (isMobile) {
        if (captureZone && !currentProofBase64) captureZone.classList.remove('hidden');
        if (desktopNoticeZone) desktopNoticeZone.classList.add('hidden');
        if (submitBtn) submitBtn.classList.remove('hidden');
        if (noteZone) noteZone.classList.remove('hidden');
      } else {
        if (captureZone) captureZone.classList.add('hidden');
        if (desktopNoticeZone) desktopNoticeZone.classList.remove('hidden');
        if (submitBtn) submitBtn.classList.add('hidden');
        if (noteZone) noteZone.classList.add('hidden');
      }
    }
  });

  // Tự động đo đạc lại nút Xem thêm/Thu gọn khi co giãn cửa sổ hoặc xoay màn hình thiết bị
  let cardDescResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(cardDescResizeTimer);
    cardDescResizeTimer = setTimeout(refreshAllCardDescToggles, 150);
  });

  // Open Shop Reward Modal (Desktop, Mobile & Global)
  const openRewardHandler = () => {
    currentEditingRewardId = null;
    currentPendingReward = null;
    sfx.playClick();
    const titleEl = document.getElementById('modal-reward-title');
    const subEl = document.getElementById('modal-reward-subtitle');
    if (titleEl) titleEl.textContent = 'THÊM PHẦN THƯỞNG MỚI';
    if (subEl) subEl.textContent = 'AI tính giá Vàng tương xứng để bạn tự thưởng sau khi nỗ lực';

    const saveBtn = document.getElementById('btn-save-reward');
    if (saveBtn) saveBtn.textContent = '✓ Đồng Ý & Thêm Vào Cửa Hàng';

    document.getElementById('reward-form-step').classList.remove('hidden');
    document.getElementById('reward-evaluating-step').classList.add('hidden');
    document.getElementById('reward-verdict-step').classList.add('hidden');

    document.getElementById('input-reward-name').value = '';
    document.getElementById('input-reward-desc').value = '';
    const estimateInput = document.getElementById('input-reward-estimate');
    if (estimateInput) estimateInput.value = '';
    const durationInput = document.getElementById('input-reward-duration');
    if (durationInput) durationInput.value = '';

    const rewardModNotice = document.getElementById('reward-modified-notice');
    if (rewardModNotice) rewardModNotice.classList.add('hidden');
    const rewardDebateBox = document.getElementById('reward-debate-container');
    if (rewardDebateBox) rewardDebateBox.classList.add('hidden');
    const rewardChatLogs = document.getElementById('reward-debate-chat-logs');
    if (rewardChatLogs) rewardChatLogs.innerHTML = '';
    currentRewardDebateHistory = [];

    const rewardSuggestBox = document.getElementById('reward-suggestions-container');
    if (rewardSuggestBox) rewardSuggestBox.classList.remove('hidden');
    loadRewardSuggestions(false);
    openModal('modal-reward');
  };
  window.openRewardModal = openRewardHandler;
  window.openRewardRenegotiateModal = openRewardRenegotiateModal;
  const navAddRewardBtn = document.getElementById('btn-open-add-reward-nav');
  if (navAddRewardBtn) navAddRewardBtn.addEventListener('click', openRewardHandler);
  const mobileAddRewardBtn = document.getElementById('btn-open-add-reward-mobile');
  if (mobileAddRewardBtn) mobileAddRewardBtn.addEventListener('click', openRewardHandler);



  const btnToggleRewardSug = document.getElementById('btn-toggle-reward-suggestions');
  if (btnToggleRewardSug) {
    btnToggleRewardSug.addEventListener('click', (e) => {
      e.stopPropagation();
      const listEl = document.getElementById('reward-suggestions-list');
      const iconEl = document.getElementById('icon-toggle-reward-suggestions');
      if (!listEl) return;
      const isHidden = listEl.classList.toggle('hidden');
      if (iconEl) iconEl.textContent = isHidden ? '▼' : '▲';
    });
  }

  // Power User Keyboard Shortcuts: [Q] to Add Quest, [R] to Add Reward, [Space] to Pause/Resume Focus Timer
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const activeTag = activeEl?.tagName;
    const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || activeEl?.isContentEditable;
    if (isEditing || e.ctrlKey || e.metaKey || e.altKey) return;

    // Phím Space: Dừng / Tiếp tục đếm ngược thời gian (hoạt động trên cả màn hình chính và Chế độ Toàn màn hình Zen)
    if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
      if (e.repeat) return;
      const hasActiveTimer = Boolean(activeFocusQuest || isBreakMode || activeRewardItem || appState?.activeTimer);
      const isOtherModalOpen = Boolean(document.querySelector('.fixed.inset-0:not(.hidden):not(#focus-zen-overlay)'));
      if (hasActiveTimer && !isOtherModalOpen) {
        e.preventDefault();
        if (activeEl && typeof activeEl.blur === 'function') {
          activeEl.blur();
        }
        toggleFocusTimer();
        return;
      }
    }

    const isModalOpen = Boolean(document.querySelector('.fixed.inset-0:not(.hidden)'));
    if (isModalOpen) return;

    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      openQuestHandler();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      openRewardHandler();
    }
  });

  document.getElementById('btn-eval-reward').addEventListener('click', evaluateRewardItem);
  ['input-reward-name', 'input-reward-estimate', 'input-reward-duration'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          evaluateRewardItem();
        }
      });
    }
  });
  document.getElementById('btn-save-reward').addEventListener('click', savePendingReward);

  // Reward Debate features
  const btnOpenRewardDebate = document.getElementById('btn-open-reward-debate');
  if (btnOpenRewardDebate) {
    btnOpenRewardDebate.addEventListener('click', () => {
      const debateBox = document.getElementById('reward-debate-container');
      if (debateBox) {
        const isOpening = debateBox.classList.contains('hidden');
        debateBox.classList.toggle('hidden');
        if (isOpening) {
          initRewardDebateChat();
          const argInput = document.getElementById('input-reward-debate-arg');
          if (argInput) {
            setTimeout(() => {
              argInput.focus();
              debateBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 120);
          }
        }
      }
    });
  }
  const btnSendRewardDebate = document.getElementById('btn-send-reward-debate');
  if (btnSendRewardDebate) {
    btnSendRewardDebate.addEventListener('click', sendRewardDebateArgument);
  }
  const inputRewardDebateArg = document.getElementById('input-reward-debate-arg');
  if (inputRewardDebateArg) {
    inputRewardDebateArg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendRewardDebateArgument();
      }
    });
  }
  document.querySelectorAll('.quick-suggest-reward-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const suggestText = btn.getAttribute('data-suggest');
      const input = document.getElementById('input-reward-debate-arg');
      if (input && suggestText) {
        input.value = suggestText;
        input.focus();
        input.classList.add('ring-2', 'ring-amber-500');
        setTimeout(() => input.classList.remove('ring-2', 'ring-amber-500'), 500);
        sfx.playClick();
      }
    });
  });

  // Bank Loan Debate controls
  const inputBankDebateArg = document.getElementById('input-bank-debate-arg');
  if (inputBankDebateArg) {
    inputBankDebateArg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendBankDebateMessage();
      }
    });
  }
  document.querySelectorAll('.quick-suggest-bank-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const suggestText = btn.getAttribute('data-suggest');
      const input = document.getElementById('input-bank-debate-arg');
      if (input && suggestText) {
        input.value = suggestText;
        input.focus();
        input.classList.add('ring-2', 'ring-blue-500');
        setTimeout(() => input.classList.remove('ring-2', 'ring-blue-500'), 500);
        if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
      }
    });
  });

  // Bank deposit, borrow & withdraw Enter key submit listeners
  const inputDepositAmt = document.getElementById('input-deposit-amount');
  if (inputDepositAmt) {
    inputDepositAmt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeBankDeposit();
      }
    });
  }
  const inputBorrowAmt = document.getElementById('input-borrow-amount');
  if (inputBorrowAmt) {
    inputBorrowAmt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeBankBorrow();
      }
    });
  }
  const inputWithdrawAmt = document.getElementById('input-withdraw-amount');
  if (inputWithdrawAmt) {
    inputWithdrawAmt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmAndExecuteWithdraw();
      }
    });
  }

  // Admin edit user form Enter key submit listeners
  ['admin-edit-coins', 'admin-edit-level', 'admin-edit-exp', 'admin-edit-reason'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitAdminUserEdit();
        }
      });
    }
  });

  // Confirmation Dialog controls
  const btnConfirmOk = document.getElementById('btn-confirm-ok');
  if (btnConfirmOk) {
    btnConfirmOk.addEventListener('click', () => {
      sfx.playClick();
      closeConfirmDialog(true);
    });
  }

  const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
  if (btnConfirmCancel) {
    btnConfirmCancel.addEventListener('click', () => {
      sfx.playClick();
      closeConfirmDialog(false);
    });
  }

  // ponytail: modal close strictly restricted to close button ('x'); upgrade to Esc/backdrop if user preferences requested
  // Global Close Modal on close button (chỉ tắt khi nhấn dấu x)
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.fixed');
      if (modal) {
        if (modal.id === 'modal-confirm') {
          closeConfirmDialog(false);
          return;
        }
        if (modal.id === 'modal-ai-assistant') {
          closeAssistantModal();
          return;
        }
        if (modal.id === 'modal-reward') {
          currentEditingRewardId = null;
          currentPendingReward = null;
        }
        if (modal.id === 'modal-quest' || modal.id === 'modal-verdict') {
          currentEditingQuestId = null;
          currentPendingVerdict = null;
        }
        modal.classList.add('hidden');
      }
    });
  });

  // Chặn đóng modal khi click ra ngoài backdrop (kể cả Phù Thủy); chỉ cho phép thoát khi nhấn dấu x
  document.querySelectorAll('.fixed').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal.id === 'tour-overlay') return;
        if (modal.id === 'modal-welcome') {
          showToast('Vui lòng đăng nhập bằng Google để tiếp tục!', 'info');
        }
        const panel = modal.querySelector('.rpg-panel') || modal.querySelector('#assistant-panel');
        if (panel) {
          panel.classList.add('ring-4', 'ring-amber-500/60');
          setTimeout(() => panel.classList.remove('ring-4', 'ring-amber-500/60'), 400);
        }
      }
    });
  });

  // Phím Escape: chặn đóng tất cả modal (kể cả Phù Thủy); chỉ cho phép thoát khi nhấn dấu x
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isTourActive) {
        e.preventDefault();
        finishTour(false);
        return;
      }
      const openModal = document.querySelector('.fixed[id^="modal-"]:not(.hidden)');
      if (openModal) {
        e.preventDefault();
        const panel = openModal.querySelector('.rpg-panel') || openModal.querySelector('#assistant-panel');
        if (panel) {
          panel.classList.add('ring-4', 'ring-amber-500/60');
          setTimeout(() => panel.classList.remove('ring-4', 'ring-amber-500/60'), 400);
        }
      }
    }
  });

  // Phím tắt Alt+A mở/đóng Trợ Lý AI
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      const modal = document.getElementById('modal-ai-assistant');
      if (modal && !modal.classList.contains('hidden')) {
        closeAssistantModal();
      } else {
        openAssistantModal();
      }
    }
  });
});

// =============================================================================
// AI ASSISTANT / GUILD COMPANION (MODEL BRAIN & MODEL WORKER)
// =============================================================================

let assistantChatHistory = [];
let isAssistantBusy = false;
let currentAssistantAbortCtrl = null;
let assistantAnimTimer = null;

function updateAssistantTransformOrigin(sourceEl = null) {
  const modal = document.getElementById('modal-ai-assistant');
  const panel = modal ? (modal.querySelector('#assistant-panel') || modal.querySelector('.rpg-panel')) : null;
  const fab = document.getElementById('btn-floating-assistant');
  const triggerEl = (sourceEl && typeof sourceEl.getBoundingClientRect === 'function') ? sourceEl : fab;
  if (!modal || !panel) return;

  if (triggerEl) {
    const triggerRect = triggerEl.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    // Tọa độ tâm icon phù thủy tương đối so với panel
    const originX = triggerRect.left + triggerRect.width / 2 - panelRect.left;
    const originY = triggerRect.top + triggerRect.height / 2 - panelRect.top;
    panel.style.transformOrigin = `${originX}px ${originY}px`;
  } else {
    panel.style.transformOrigin = 'calc(100% - 2rem) calc(100% - 2rem)';
  }
}

function openAssistantModal(sourceEl = null) {
  const modal = document.getElementById('modal-ai-assistant');
  if (!modal) return;
  const panel = modal.querySelector('#assistant-panel') || modal.querySelector('.rpg-panel');

  if (assistantAnimTimer) {
    clearTimeout(assistantAnimTimer);
    assistantAnimTimer = null;
  }

  // Gỡ bỏ trạng thái đóng nếu trước đó đang đóng dở
  modal.classList.remove('assistant-modal-closing');
  if (panel) panel.classList.remove('assistant-panel-closing');

  // Mở modal và gắn class animation bung lên từ Phù Thủy
  modal.classList.remove('hidden');
  modal.classList.add('assistant-modal-opening');
  if (panel) panel.classList.add('assistant-panel-opening');

  // Tính tọa độ icon phù thủy để bung nở chính xác từ vị trí icon
  updateAssistantTransformOrigin(sourceEl);

  // Hiệu ứng nảy ma thuật trên icon phù thủy nổi
  const fabIcon = document.querySelector('#btn-floating-assistant img');
  if (fabIcon) {
    fabIcon.classList.remove('assistant-fab-burst');
    void fabIcon.offsetWidth;
    fabIcon.classList.add('assistant-fab-burst');
    setTimeout(() => fabIcon.classList.remove('assistant-fab-burst'), 500);
  }

  const chatLogs = document.getElementById('assistant-chat-logs');
  if (chatLogs && assistantChatHistory.length === 0) {
    initAssistantWelcomeMessage();
  }

  assistantAnimTimer = setTimeout(() => {
    modal.classList.remove('assistant-modal-opening');
    if (panel) panel.classList.remove('assistant-panel-opening');
    assistantAnimTimer = null;
    const input = document.getElementById('input-assistant-query');
    if (input) input.focus({ preventScroll: true });
    scrollAssistantToBottom(true);
  }, 350);
}

function closeAssistantModal() {
  const modal = document.getElementById('modal-ai-assistant');
  if (!modal || modal.classList.contains('hidden')) return;

  if (isAssistantBusy && currentAssistantAbortCtrl) {
    try { currentAssistantAbortCtrl.abort(); } catch (_) {}
  }

  const panel = modal.querySelector('#assistant-panel') || modal.querySelector('.rpg-panel');

  if (assistantAnimTimer) {
    clearTimeout(assistantAnimTimer);
    assistantAnimTimer = null;
  }

  // Cập nhật transform-origin chuẩn xác trước khi thu nhỏ về phù thủy
  updateAssistantTransformOrigin();

  modal.classList.remove('assistant-modal-opening');
  modal.classList.add('assistant-modal-closing');
  if (panel) {
    panel.classList.remove('assistant-panel-opening');
    panel.classList.add('assistant-panel-closing');
  }

  // Hiệu ứng hấp thụ ma thuật vào lại icon phù thủy
  const fabIcon = document.querySelector('#btn-floating-assistant img');
  if (fabIcon) {
    setTimeout(() => {
      fabIcon.classList.remove('assistant-fab-burst');
      void fabIcon.offsetWidth;
      fabIcon.classList.add('assistant-fab-burst');
      setTimeout(() => fabIcon.classList.remove('assistant-fab-burst'), 450);
    }, 100);
  }

  assistantAnimTimer = setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('assistant-modal-closing');
    if (panel) panel.classList.remove('assistant-panel-closing');
    assistantAnimTimer = null;
  }, 260);
}

function initAssistantWelcomeMessage() {
  const chatLogs = document.getElementById('assistant-chat-logs');
  if (!chatLogs) return;

  const nickname = appState.profile?.nickname || 'Hiệp Sĩ';
  const level = appState.profile?.level || 1;
  const coins = appState.profile?.coins || 0;
  const streak = appState.profile?.streak || 0;
  const activeQuestsCount = (appState.quests || []).filter(q => q.status === 'active').length;

  chatLogs.innerHTML = `
    <div class="assistant-msg-ai flex gap-3 items-start animate-fade-in">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center p-1.5 shrink-0 shadow-sm border border-violet-400/40">
        <img src="wizard.svg" alt="Phù Thủy" class="w-full h-full object-contain pointer-events-none select-none" />
      </div>
      <div class="flex-1 assistant-bubble-ai p-3.5 sm:p-4 text-slate-800 dark:text-slate-100 leading-relaxed text-xs sm:text-[13px] space-y-2">
        <div class="font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
          <span>Chào mừng bạn, hiệp sĩ ${escapeHtml(nickname)}!</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-700 dark:text-violet-300 font-mono">Cấp ${level}</span>
        </div>
        <p>Ta là <strong>Phù Thủy</strong> của LevelUp RPG 🧙‍♂️. Ta luôn sẵn sàng lắng nghe, phân tích chiến thuật, chia sẻ mẹo năng suất và hỗ trợ bạn cày cấp, làm nhiệm vụ mỗi ngày!</p>
        <div class="p-2 rounded-xl bg-violet-500/10 dark:bg-violet-950/30 border border-violet-500/20 text-[11px] text-violet-800 dark:text-violet-200">
          📊 <strong>Tình trạng của bạn:</strong> ${coins} Vàng • ${streak} ngày streak • ${activeQuestsCount} nhiệm vụ đang mở.
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 italic">
          Bấm các gợi ý nhanh phía trên hoặc nhập câu hỏi bất kỳ để ta hỗ trợ bạn nhé! ✨
        </p>
      </div>
    </div>
  `;
}

function scrollAssistantToBottom(force = false) {
  const chatLogs = document.getElementById('assistant-chat-logs');
  if (!chatLogs) return;
  if (force) {
    chatLogs.scrollTop = chatLogs.scrollHeight;
    return;
  }
  const isNearBottom = chatLogs.scrollHeight - chatLogs.scrollTop - chatLogs.clientHeight < 140;
  if (isNearBottom) {
    chatLogs.scrollTop = chatLogs.scrollHeight;
  }
}

function scrollAssistantToMessage(messageEl, smooth = true) {
  const chatLogs = document.getElementById('assistant-chat-logs');
  if (!chatLogs || !messageEl) return;

  const containerRect = chatLogs.getBoundingClientRect();
  const targetRect = messageEl.getBoundingClientRect();
  // Tính vị trí tương đối của phần đầu tin nhắn trong khung cuộn
  const relativeTop = targetRect.top - containerRect.top + chatLogs.scrollTop;
  const targetScrollTop = Math.max(0, relativeTop - 12);

  if (smooth && typeof chatLogs.scrollTo === 'function') {
    chatLogs.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  } else {
    chatLogs.scrollTop = targetScrollTop;
  }
}

async function clearAssistantChat() {
  const confirmed = await confirmAction({
    title: 'Làm Mới Trò Chuyện',
    message: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này không?',
    detail: 'Toàn bộ nội dung trò chuyện với Phù Thủy trong phiên này sẽ được đặt lại từ đầu.',
    confirmText: 'Xóa & Làm Mới',
    cancelText: 'Giữ Lại',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!confirmed) return;

  assistantChatHistory = [];
  initAssistantWelcomeMessage();
  showToast('Đã làm mới cuộc trò chuyện với Phù Thủy.', 'info');
}

function sendQuickAssistantPrompt(text) {
  const input = document.getElementById('input-assistant-query');
  if (input) input.value = text;
  sendAssistantMessage(text);
}

function handleAssistantSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('input-assistant-query');
  if (!input) return;
  const message = input.value.trim();
  if (!message || isAssistantBusy) return;
  input.value = '';
  sendAssistantMessage(message);
}

async function sendAssistantMessage(userQuery) {
  if (!userQuery || isAssistantBusy) return;

  const chatLogs = document.getElementById('assistant-chat-logs');
  const stepContainer = document.getElementById('assistant-step-container');
  const stepMsg = document.getElementById('assistant-step-msg');
  const stepPct = document.getElementById('assistant-step-pct');
  const stepBar = document.getElementById('assistant-step-bar');
  const sendBtn = document.getElementById('btn-send-assistant');
  const input = document.getElementById('input-assistant-query');

  isAssistantBusy = true;
  if (sendBtn) sendBtn.disabled = true;
  if (input) input.readOnly = true;

  // Append user bubble
  if (chatLogs) {
    const userMsgHtml = `
      <div class="flex justify-end gap-2.5 items-end animate-fade-in">
        <div class="assistant-bubble-user max-w-[85%] sm:max-w-[75%] px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm">
          ${escapeHtml(userQuery)}
        </div>
        <div class="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-xs shrink-0 select-none overflow-hidden">
          ${renderUserMiniAvatar()}
        </div>
      </div>
    `;
    chatLogs.insertAdjacentHTML('beforeend', userMsgHtml);

    // Append initial streaming AI bubble with gentle speaking aura
    const streamBubbleHtml = `
      <div id="active-assistant-msg" class="assistant-msg-ai flex gap-3 items-start animate-fade-in">
        <div class="assistant-avatar-el w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center p-1.5 shrink-0 shadow-sm border border-violet-400/40 mt-0.5 select-none assistant-avatar-speaking">
          <img src="wizard.svg" alt="Phù Thủy" class="w-full h-full object-contain pointer-events-none select-none" />
        </div>
        <div class="assistant-bubble-container flex-1 assistant-bubble-ai assistant-bubble-speaking p-3.5 sm:p-4 text-slate-800 dark:text-slate-100 leading-relaxed text-xs sm:text-[13px] space-y-2.5 transition-all duration-300">
          <div id="active-assistant-status" class="flex items-center gap-2 py-0.5">
            <div class="assistant-thinking-indicator inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100/80 dark:bg-violet-950/50 border border-violet-200/80 dark:border-violet-800/60 text-violet-700 dark:text-violet-300">
              <span class="flex items-center gap-1">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
              </span>
              <span id="active-assistant-status-text" class="text-xs font-medium tracking-wide">Phù Thủy đang suy nghĩ...</span>
            </div>
          </div>
          <div id="active-assistant-thought"></div>
          <div id="active-assistant-worker"></div>
          <div id="active-assistant-text" class="assistant-markdown prose prose-sm dark:prose-invert max-w-none text-xs sm:text-[13px] leading-relaxed break-words hidden cursor-pointer" title="Bấm vào để hiện ngay toàn bộ">
            <span class="assistant-stream-body"><span class="assistant-typing-cursor"></span></span>
          </div>
          <div id="active-assistant-actions" class="space-y-2"></div>
          <div id="active-assistant-options"></div>
        </div>
      </div>
    `;
    chatLogs.insertAdjacentHTML('beforeend', streamBubbleHtml);
    // Cưỡng chế cuộn ngay xuống đáy khi vừa gửi tin để không bị kẹt ở trên
    scrollAssistantToBottom(true);
    requestAnimationFrame(() => {
      scrollAssistantToBottom(true);
    });
    setTimeout(() => {
      scrollAssistantToBottom(true);
    }, 60);
  }

  // Show Step Progress
  if (stepContainer) {
    stepContainer.classList.remove('hidden');
    if (stepMsg) stepMsg.textContent = 'Phù Thủy đang suy nghĩ & phân tích...';
    if (stepPct) stepPct.textContent = '25%';
    if (stepBar) stepBar.style.width = '25%';
    requestAnimationFrame(() => {
      scrollAssistantToBottom(true);
    });
  }

  currentAssistantAbortCtrl = new AbortController();

  const draftContext = {
    profile: appState.profile,
    quests: (appState.quests || []).slice(0, 10),
    shopItems: (appState.shopItems || []).slice(0, 10),
    bank: appState.profile?.bank || { deposited: 0, depositInterest: 0, loan: null }
  };

  // Quản lý cuộn thông minh trong lúc streaming
  let userScrolledUp = false;
  const handleUserScroll = () => {
    if (!chatLogs) return;
    const distFromBottom = chatLogs.scrollHeight - chatLogs.scrollTop - chatLogs.clientHeight;
    if (distFromBottom > 160) {
      userScrolledUp = true;
    } else if (distFromBottom < 50) {
      userScrolledUp = false;
    }
  };
  chatLogs?.addEventListener('scroll', handleUserScroll, { passive: true });

  // Bộ điều khiển hiệu ứng dòng chảy chữ (fluid stream) mượt mà, liên tục
  let targetReplyText = '';
  let renderedChars = 0;
  let streamTimer = null;
  let isServerDone = false;
  let notifyDoneResolve = null;
  const typingCompletedPromise = new Promise(resolve => { notifyDoneResolve = resolve; });

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      signal: currentAssistantAbortCtrl.signal,
      headers: {
        ...getAuthHeaders(),
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        action: 'ask_assistant',
        payload: {
          message: userQuery,
          history: assistantChatHistory.slice(-8),
          draftContext,
          stream: true
        }
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${response.status}`);
    }

    let finalResult = null;
    const contentType = response.headers.get('content-type') || '';

    const activeMsg = document.getElementById('active-assistant-msg');
    const activeStatus = document.getElementById('active-assistant-status');
    const activeStatusText = document.getElementById('active-assistant-status-text');
    const activeThought = document.getElementById('active-assistant-thought');
    const activeWorker = document.getElementById('active-assistant-worker');
    const activeText = document.getElementById('active-assistant-text');
    const streamBody = activeText ? activeText.querySelector('.assistant-stream-body') : null;

    function tickStream() {
      if (renderedChars < targetReplyText.length) {
        const pending = targetReplyText.length - renderedChars;
        // Tốc độ mượt mà: 1-2 ký tự mỗi frame (16ms) khi gõ đều đặn
        // Tự thích ứng nhịp nhàng nếu lượng chữ dồn về để không bị chậm
        let step = 1;
        if (pending > 150) {
          step = 6;
        } else if (pending > 60) {
          step = 3;
        } else if (pending > 15) {
          step = 2;
        } else {
          step = 1;
        }

        renderedChars = Math.min(targetReplyText.length, renderedChars + step);
        const currentSlice = targetReplyText.slice(0, renderedChars);

        if (streamBody) {
          streamBody.innerHTML = renderStreamingMarkdown(currentSlice);
        }

        // Tự động bám sát đáy khi đang sinh chữ trừ khi người dùng chủ động kéo lên đọc
        if (!userScrolledUp && chatLogs) {
          chatLogs.scrollTop = chatLogs.scrollHeight;
        }
        streamTimer = setTimeout(tickStream, 16);
      } else {
        streamTimer = null;
        if (isServerDone && notifyDoneResolve) {
          notifyDoneResolve();
          notifyDoneResolve = null;
        }
      }
    }

    function appendToStream(delta) {
      targetReplyText += delta;
      if (!streamTimer) {
        tickStream();
      }
    }

    // Hỗ trợ người dùng bấm vào tin nhắn để hiện ngay toàn bộ nội dung
    if (activeText) {
      activeText.addEventListener('click', () => {
        if (streamTimer) {
          clearTimeout(streamTimer);
          streamTimer = null;
        }
        renderedChars = targetReplyText.length;
        if (streamBody) {
          streamBody.innerHTML = renderStreamingMarkdown(targetReplyText);
        }
        if (!userScrolledUp && chatLogs) {
          chatLogs.scrollTop = chatLogs.scrollHeight;
        }
        if (isServerDone && notifyDoneResolve) {
          notifyDoneResolve();
          notifyDoneResolve = null;
        }
      });
    }

    if (contentType.includes('text/event-stream') && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // Giữ lại phần chưa kết thúc dòng

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7).trim();
          } else if (trimmed.startsWith('data: ')) {
            const rawData = trimmed.slice(6).trim();
            try {
              const parsed = JSON.parse(rawData);
              if (currentEvent === 'step') {
                if (stepMsg) stepMsg.textContent = parsed.text || 'Đang xử lý...';
                if (stepPct) stepPct.textContent = `${parsed.pct || 50}%`;
                if (stepBar) stepBar.style.width = `${parsed.pct || 50}%`;
                if (activeStatusText) {
                  activeStatusText.textContent = parsed.text || 'Đang xử lý...';
                }
              } else if (currentEvent === 'reply_start') {
                if (activeStatus) activeStatus.classList.add('hidden');
                if (activeThought && parsed.thought) {
                  activeThought.innerHTML = renderAssistantThoughtBlock(parsed.thought);
                }
                if (activeWorker && Array.isArray(parsed.workerResults) && parsed.workerResults.length > 0) {
                  activeWorker.innerHTML = renderAssistantWorkerBlock(parsed.workerResults);
                }
                if (activeText) activeText.classList.remove('hidden');
                if (streamBody && !renderedChars) {
                  streamBody.innerHTML = '<span class="assistant-typing-cursor"></span>';
                }
                if (!userScrolledUp) {
                  scrollAssistantToBottom(true);
                }
              } else if (currentEvent === 'chunk') {
                if (activeStatus) activeStatus.classList.add('hidden');
                if (activeText) activeText.classList.remove('hidden');
                if (parsed.delta) {
                  appendToStream(parsed.delta);
                }
              } else if (currentEvent === 'result') {
                finalResult = parsed;
                if (finalResult.reply && finalResult.reply.length > targetReplyText.length) {
                  targetReplyText = finalResult.reply;
                  if (!streamTimer) {
                    tickStream();
                  }
                }
                isServerDone = true;
                if (renderedChars >= targetReplyText.length && notifyDoneResolve) {
                  notifyDoneResolve();
                  notifyDoneResolve = null;
                }
              } else if (currentEvent === 'error') {
                throw new Error(parsed.error || 'Lỗi xử lý');
              }
            } catch (jsonErr) {
              if (currentEvent === 'error') throw jsonErr;
            }
          }
        }
      }
    } else {
      finalResult = await response.json();
      if (finalResult?.reply) {
        appendToStream(finalResult.reply);
      }
      isServerDone = true;
      if (renderedChars >= targetReplyText.length && notifyDoneResolve) {
        notifyDoneResolve();
        notifyDoneResolve = null;
      }
    }

    if (!finalResult) {
      throw new Error('Không nhận được phản hồi từ Phù Thủy.');
    }

    // Đợi hiệu ứng dòng chảy hoàn tất (kèm safety timeout chống kẹt stream)
    await Promise.race([
      typingCompletedPromise,
      new Promise(resolve => setTimeout(resolve, 3500))
    ]);

    // Hoàn tất hiển thị trong bubble active
    if (activeMsg) {
      if (activeStatus) activeStatus.classList.add('hidden');
      if (activeText) activeText.classList.remove('hidden');

      // Tắt hào quang đang nói và con trỏ
      const cursor = activeMsg.querySelector('.assistant-typing-cursor');
      if (cursor) cursor.remove();
      const bubbleContainer = activeMsg.querySelector('.assistant-bubble-speaking');
      if (bubbleContainer) bubbleContainer.classList.remove('assistant-bubble-speaking');
      const avatarEl = activeMsg.querySelector('.assistant-avatar-speaking');
      if (avatarEl) avatarEl.classList.remove('assistant-avatar-speaking');

      // Cập nhật Markdown hoàn chỉnh
      if (streamBody) {
        streamBody.innerHTML = renderMarkdown(finalResult.reply || targetReplyText || '');
      }

      // Đảm bảo khối suy nghĩ và khối worker được render nếu trước đó chưa nhận reply_start
      if (activeThought && !activeThought.innerHTML.trim() && finalResult.thought) {
        activeThought.innerHTML = renderAssistantThoughtBlock(finalResult.thought);
      }
      if (activeWorker && !activeWorker.innerHTML.trim() && Array.isArray(finalResult.workerResults) && finalResult.workerResults.length > 0) {
        activeWorker.innerHTML = renderAssistantWorkerBlock(finalResult.workerResults);
      }

      // Render Thẻ hành động (Nhiệm vụ / Phần thưởng)
      const actionsEl = document.getElementById('active-assistant-actions');
      if (actionsEl && Array.isArray(finalResult.suggestedActions) && finalResult.suggestedActions.length > 0) {
        actionsEl.innerHTML = renderAssistantActionCards(finalResult.suggestedActions);
      }

      // Render Các gợi ý tương tác tiếp theo
      const optionsEl = document.getElementById('active-assistant-options');
      if (optionsEl && Array.isArray(finalResult.options) && finalResult.options.length > 0) {
        optionsEl.innerHTML = renderAssistantOptionChips(finalResult.options);
      }

      // Ẩn thanh tiến trình ngay trước khi cuộn để kích thước chatLogs chuẩn xác
      if (stepContainer) stepContainer.classList.add('hidden');

      const finishedMsgEl = activeMsg;

      // Đổi ID để không bị xung đột với các tin nhắn tiếp theo
      activeMsg.removeAttribute('id');
      if (activeStatus) activeStatus.removeAttribute('id');
      if (activeStatusText) activeStatusText.removeAttribute('id');
      if (activeThought) activeThought.removeAttribute('id');
      if (activeWorker) activeWorker.removeAttribute('id');
      if (activeText) activeText.removeAttribute('id');
      if (actionsEl) actionsEl.removeAttribute('id');
      if (optionsEl) optionsEl.removeAttribute('id');

      // Tự động cuộn mượt lên dòng đầu tin nhắn Phù Thủy vừa gửi để user có thể đọc lại từ đầu tin
      requestAnimationFrame(() => {
        scrollAssistantToMessage(finishedMsgEl, true);
      });
    } else {
      // Fallback nếu DOM activeMsg không tìm thấy
      renderAssistantResponse(finalResult);
    }

    // Record to history
    assistantChatHistory.push({ role: 'user', content: userQuery });
    assistantChatHistory.push({ role: 'assistant', content: finalResult.reply || targetReplyText || '' });

    if (typeof sfx !== 'undefined' && sfx.playSuccess) sfx.playSuccess();
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('sendAssistantMessage error:', err);
    const activeMsg = document.getElementById('active-assistant-msg');
    if (activeMsg) {
      activeMsg.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-rose-500/20 text-rose-600 flex items-center justify-center text-sm shrink-0 select-none">⚠️</div>
        <div class="assistant-bubble-ai p-3 rounded-2xl text-rose-600 dark:text-rose-400 text-xs flex-1">
          ${escapeHtml(err.message || 'Có lỗi kết nối đến Phù Thủy. Vui lòng thử lại sau!')}
        </div>
      `;
      activeMsg.removeAttribute('id');
      scrollAssistantToBottom(true);
    } else if (chatLogs) {
      const errMsgHtml = `
        <div class="assistant-msg-ai flex gap-3 items-start animate-fade-in">
          <div class="w-8 h-8 rounded-full bg-rose-500/20 text-rose-600 flex items-center justify-center text-sm shrink-0">⚠️</div>
          <div class="assistant-bubble-ai p-3 rounded-2xl text-rose-600 dark:text-rose-400 text-xs">
            ${escapeHtml(err.message || 'Có lỗi kết nối đến Phù Thủy. Vui lòng thử lại sau!')}
          </div>
        </div>
      `;
      chatLogs.insertAdjacentHTML('beforeend', errMsgHtml);
      scrollAssistantToBottom(true);
    }
    showToast(err.message || 'Lỗi kết nối Phù Thủy', 'error');
  } finally {
    if (chatLogs) {
      chatLogs.removeEventListener('scroll', handleUserScroll);
    }
    isAssistantBusy = false;
    currentAssistantAbortCtrl = null;
    if (stepContainer) stepContainer.classList.add('hidden');
    if (sendBtn) sendBtn.disabled = false;
    if (input) {
      input.readOnly = false;
      input.disabled = false;
      const isMobileDevice = window.innerWidth < 640 || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
      if (!isMobileDevice) {
        try {
          input.focus({ preventScroll: true });
        } catch (_) {
          input.focus();
        }
      }
    }
  }
}

function renderAssistantThoughtBlock(thought) {
  if (!thought) return '';
  return `
    <details class="assistant-collapsible-details rounded-xl bg-violet-500/10 dark:bg-violet-950/30 border border-violet-500/20 overflow-hidden text-[11px]">
      <summary class="px-3 py-1.5 font-semibold text-violet-700 dark:text-violet-300 cursor-pointer flex items-center justify-between select-none hover:bg-violet-500/15">
        <span class="flex items-center gap-1.5">
          <span>🧠</span>
          <span>Tư duy phân tích của Model Brain</span>
        </span>
        <svg class="w-3.5 h-3.5 text-violet-500 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </summary>
      <div class="p-2.5 border-t border-violet-500/15 text-slate-700 dark:text-slate-300 italic leading-relaxed whitespace-pre-wrap">
        ${escapeHtml(thought)}
      </div>
    </details>
  `;
}

function renderAssistantWorkerBlock(workerResults) {
  if (!Array.isArray(workerResults) || workerResults.length === 0) return '';
  const workerItems = workerResults.map(w => `
    <li class="flex items-start gap-1.5 text-[11px]">
      <span class="text-indigo-500 font-bold">⚡</span>
      <div>
        <span class="font-mono text-indigo-700 dark:text-indigo-300 font-semibold">[${escapeHtml(w.tool)}]:</span>
        <span class="text-slate-600 dark:text-slate-300 ml-1">${escapeHtml(w.summary || 'Thực thi thành công')}</span>
        ${w.executionMs !== undefined ? `<span class="text-[10px] text-slate-400 font-mono">(${w.executionMs}ms)</span>` : ''}
      </div>
    </li>
  `).join('');

  return `
    <details class="assistant-collapsible-details rounded-xl bg-indigo-500/10 dark:bg-indigo-950/30 border border-indigo-500/20 overflow-hidden text-[11px]">
      <summary class="px-3 py-1.5 font-semibold text-indigo-700 dark:text-indigo-300 cursor-pointer flex items-center justify-between select-none hover:bg-indigo-500/15">
        <span class="flex items-center gap-1.5">
          <span>⚡</span>
          <span>Hành động Model Worker đã thực thi (${workerResults.length})</span>
        </span>
        <svg class="w-3.5 h-3.5 text-indigo-500 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </summary>
      <ul class="p-2.5 border-t border-indigo-500/15 space-y-1.5">
        ${workerItems}
      </ul>
    </details>
  `;
}

function renderAssistantActionCards(suggestedActions) {
  if (!Array.isArray(suggestedActions) || suggestedActions.length === 0) return '';
  return suggestedActions.map(act => {
    if (act.type === 'quest_created' && act.quest) {
      const q = act.quest;
      const jsonSafe = encodeURIComponent(JSON.stringify(q));
      return `
        <div class="assistant-action-card p-3 rounded-xl border border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20 flex items-center justify-between gap-3 shadow-xs">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-base">${escapeHtml(q.icon || '🎯')}</span>
              <span class="font-bold text-xs text-amber-800 dark:text-amber-200 truncate">${escapeHtml(q.title)}</span>
              <span class="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-800 dark:text-amber-300">Hạng ${q.rank || 'D'}</span>
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              ${q.targetMinutes > 0 ? `⏱️ ${q.targetMinutes} phút tập trung` : '⚡ Việc nhanh không hẹn giờ'} • 🪙 +${q.rewardCoins} Vàng
            </div>
          </div>
          <button
            type="button"
            onclick="acceptAssistantQuest('${jsonSafe}', this)"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition active:scale-95 cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
          >
            <span>Nhận việc</span>
            <span>➕</span>
          </button>
        </div>
      `;
    }
    if (act.type === 'reward_created' && act.reward) {
      const r = act.reward;
      const jsonSafe = encodeURIComponent(JSON.stringify(r));
      return `
        <div class="assistant-action-card p-3 rounded-xl border border-purple-500/40 bg-purple-50/70 dark:bg-purple-950/20 flex items-center justify-between gap-3 shadow-xs">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-base">${escapeHtml(r.icon || '🎁')}</span>
              <span class="font-bold text-xs text-purple-800 dark:text-purple-200 truncate">${escapeHtml(r.name)}</span>
              <span class="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-purple-500/20 text-purple-800 dark:text-purple-300">${r.tier}</span>
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              🪙 Giá: ${r.price} Vàng ${r.targetMinutes > 0 ? `• ⏱️ ${r.targetMinutes} phút` : ''}
            </div>
          </div>
          <button
            type="button"
            onclick="acceptAssistantReward('${jsonSafe}', this)"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition active:scale-95 cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
          >
            <span>Thêm vào Shop</span>
            <span>🎁</span>
          </button>
        </div>
      `;
    }
    return '';
  }).join('');
}

function renderAssistantOptionChips(options) {
  if (!Array.isArray(options) || options.length === 0) return '';
  const optionButtons = options.map(opt => `
    <button
      type="button"
      data-prompt="${escapeHtml(opt.argument || opt.label)}"
      onclick="sendQuickAssistantPrompt(this.getAttribute('data-prompt'))"
      class="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-violet-100 dark:bg-slate-800 dark:hover:bg-violet-950 text-slate-700 dark:text-slate-200 hover:text-violet-700 dark:hover:text-violet-300 border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer shrink-0"
    >
      ${escapeHtml(opt.label)}
    </button>
  `).join('');

  return `
    <div class="pt-1 flex items-center gap-1.5 flex-wrap">
      ${optionButtons}
    </div>
  `;
}

function renderAssistantResponse(result) {
  const chatLogs = document.getElementById('assistant-chat-logs');
  if (!chatLogs) return;

  const replyHtml = renderMarkdown(result.reply || '');
  const thoughtBlockHtml = renderAssistantThoughtBlock(result.thought);
  const workerBlockHtml = renderAssistantWorkerBlock(result.workerResults);
  const actionCardsHtml = renderAssistantActionCards(result.suggestedActions);
  const optionsHtml = renderAssistantOptionChips(result.options);

  const aiMsgHtml = `
    <div class="assistant-msg-ai flex gap-3 items-start animate-fade-in">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-sm shrink-0 shadow-sm border border-violet-400/40 mt-0.5 select-none">
        🧙‍♂️
      </div>
      <div class="flex-1 assistant-bubble-ai p-3.5 sm:p-4 text-slate-800 dark:text-slate-100 leading-relaxed text-xs sm:text-[13px] space-y-2.5">
        ${thoughtBlockHtml}
        ${workerBlockHtml}
        <div class="assistant-markdown prose prose-sm dark:prose-invert max-w-none text-xs sm:text-[13px] leading-relaxed break-words">
          ${replyHtml}
        </div>
        ${actionCardsHtml}
        ${optionsHtml}
      </div>
    </div>
  `;

  chatLogs.insertAdjacentHTML('beforeend', aiMsgHtml);
  const newMsg = chatLogs.lastElementChild;
  requestAnimationFrame(() => {
    scrollAssistantToMessage(newMsg, true);
  });
}


function acceptAssistantQuest(encodedJson, btnEl) {
  try {
    const quest = JSON.parse(decodeURIComponent(encodedJson));
    if (!quest || !quest.title) return;

    if (!Array.isArray(appState.quests)) appState.quests = [];
    const exists = appState.quests.some(q => q.id === quest.id || (q.title === quest.title && q.status === 'active'));
    if (exists) {
      showToast('Nhiệm vụ này đã có trong danh sách của bạn rồi!', 'info');
      return;
    }

    appState.quests.unshift(quest);
    if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
    showToast(`Đã thêm nhiệm vụ [Hạng ${quest.rank || 'D'}]: "${quest.title}"!`, 'success');

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.classList.remove('bg-amber-500', 'hover:bg-amber-400');
      btnEl.classList.add('bg-emerald-600', 'text-white', 'opacity-90', 'cursor-default');
      btnEl.innerHTML = `<span>✓ Đã nhận</span>`;
    }

    if (typeof renderQuests === 'function') renderQuests();
    if (typeof triggerSave === 'function') triggerSave(true);
  } catch (e) {
    console.error('acceptAssistantQuest error:', e);
    showToast('Không thể thêm nhiệm vụ', 'error');
  }
}

function acceptAssistantReward(encodedJson, btnEl) {
  try {
    const reward = JSON.parse(decodeURIComponent(encodedJson));
    if (!reward || !reward.name) return;

    if (!Array.isArray(appState.shopItems)) appState.shopItems = [];

    if (!reward.id) {
      reward.id = 'shop_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    }

    const exists = appState.shopItems.some(item => item.id === reward.id || (item.name && item.name.toLowerCase().trim() === reward.name.toLowerCase().trim()));
    if (exists) {
      showToast(`Phần thưởng "${reward.name}" đã có trong Cửa Hàng!`, 'info');
      if (btnEl) {
        btnEl.disabled = true;
        btnEl.classList.remove('bg-purple-600', 'hover:bg-purple-500');
        btnEl.classList.add('bg-emerald-600', 'text-white', 'opacity-90', 'cursor-default');
        btnEl.innerHTML = `<span>✓ Đã có sẵn</span>`;
      }
      return;
    }

    appState.shopItems.unshift(reward);
    if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
    showToast(`Đã thêm phần thưởng: "${reward.name}" vào Cửa Hàng!`, 'success');

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.classList.remove('bg-purple-600', 'hover:bg-purple-500');
      btnEl.classList.add('bg-emerald-600', 'text-white', 'opacity-90', 'cursor-default');
      btnEl.innerHTML = `<span>✓ Đã thêm</span>`;
    }

    if (typeof renderShop === 'function') renderShop();
    if (typeof triggerSave === 'function') triggerSave(true);
  } catch (e) {
    console.error('acceptAssistantReward error:', e);
    showToast('Không thể thêm phần thưởng', 'error');
  }
}

window.holdFocusTimer = holdFocusTimer;
window.clearSavedQuestTimer = clearSavedQuestTimer;
window.clearSavedRewardTimer = clearSavedRewardTimer;
window.acceptAssistantQuest = acceptAssistantQuest;
window.acceptAssistantReward = acceptAssistantReward;
window.sendQuickAssistantPrompt = sendQuickAssistantPrompt;
