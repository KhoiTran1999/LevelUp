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
    title: 'Tân Binh Cấp 1',
    streak: 1,
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
      verdict: 'Tương đương hơn 1 tiếng tập trung làm việc. Hãy thưởng thức thật ngon miệng!'
    },
    {
      id: 'shop_seed_2',
      name: 'Lướt Mạng Xã Hội / Xem Video 30 Phút',
      description: 'Giải trí thư giãn thoải mái sau khi hoàn thành mục tiêu',
      price: 20,
      tier: 'common',
      icon: '📱',
      verdict: 'Thư giãn hợp lý giúp nạp lại năng lượng cho những mục tiêu tiếp theo.'
    },
    {
      id: 'shop_seed_3',
      name: 'Đi Xem Phim Rạp Cuối Tuần',
      description: 'Một buổi tối thư giãn trọn vẹn tại rạp chiếu phim',
      price: 120,
      tier: 'epic',
      icon: '🍿',
      verdict: 'Mục tiêu lớn! Cần hoàn thành đều đặn nhiệm vụ cả tuần để đổi lấy món quà này.'
    }
  ],
  inventory: [],
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
  for (const entry of ledger) {
    if (entry && entry.type === 'earn') {
      ledgerEarned += Math.max(0, parseInt(entry.amount, 10) || 0);
    }
  }
  const maxEarned = Math.max(questEarned, ledgerEarned, 20);

  let totalSpent = 0;
  for (const item of inventory) {
    totalSpent += Math.max(0, parseInt(item.price, 10) || 0);
  }

  // ponytail: Khi Admin tinh chỉnh hoặc tài khoản có quyền Admin, cho phép số Vàng vượt trần nhiệm vụ thông thường
  const isAdminAdjusted = Boolean(state?.profile?.adminAdjusted || state?.profile?.role === 'admin');
  const maxAllowedCeiling = isAdminAdjusted ? Math.max(rawTotal, maxEarned) : maxEarned + 500;

  if (rawTotal > maxAllowedCeiling) {
    rawTotal = maxEarned;
    tampered = true;
  }
  if (rawTotal < 0) {
    rawTotal = 0;
    tampered = true;
  }

  // ponytail: Bảo đảm tổng số Vàng kiếm được bao quát số dư hiện tại và chi tiêu khi được Admin cấp
  if (isAdminAdjusted && rawCoins > rawTotal - totalSpent) {
    rawTotal = rawCoins + totalSpent;
  }

  // Tương thích tài sản Ngân Hàng (Khoản vay & Tiền gửi) để không phạt nhầm số dư hợp lệ
  const activeLoanPrincipal = Math.max(0, parseInt(state?.profile?.bank?.loan?.principal, 10) || 0);
  const depositedCoins = Math.max(0, parseInt(state?.profile?.bank?.deposited, 10) || 0);
  const maxCurrent = Math.max(0, rawTotal - totalSpent + activeLoanPrincipal - depositedCoins);
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

  return { coins: rawCoins, totalCoinsEarned: rawTotal, tampered, fine };
}

const CURRENT_TAB_ID = 'tab_' + Math.random().toString(36).slice(2) + '_' + Date.now();
const CURRENT_RUNNER_ID = CURRENT_TAB_ID;
let isTimerActionPending = false;

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
        if (data.activeTimer === null && appState.activeTimer) {
          clearFocusTimerSession(false);
        } else if (data.activeTimer) {
          appState.activeTimer = data.activeTimer;
          restoreFocusTimer();
        }
      }

      // Xử lý xung đột đồng bộ đa thiết bị (Last-Write-Wins):
      // Nếu Cloud chứa dữ liệu mới hơn (do thiết bị khác vừa làm nhiệm vụ), cập nhật ngay
      if (data.conflict && data.state) {
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
        const checked = deriveLegitimateBalance(appState);
        appState.profile.coins = checked.coins;
        appState.profile.totalCoinsEarned = checked.totalCoinsEarned;
        saveLocalCache();
        renderAll();
        restoreFocusTimer();
        if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        if (modalSyncState) modalSyncState.textContent = 'Đã lưu trên Cloud';
        if (modalSyncTime) modalSyncTime.textContent = new Date(appState.lastSyncedAt || Date.now()).toLocaleTimeString();
        showToast('Đã tự động cập nhật dữ liệu mới nhất từ thiết bị khác!', 'info');
        return;
      }

      if (data.coins !== undefined) appState.profile.coins = data.coins;
      if (data.totalCoinsEarned !== undefined) appState.profile.totalCoinsEarned = data.totalCoinsEarned;
      if (data.level !== undefined) appState.profile.level = data.level;
      if (data.title) appState.profile.title = data.title;
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

function triggerSave(needsCloud = true, immediate = false, timerAction = null) {
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
  renderAll();

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

async function hydrateFromCloud(isManual = false) {
  const nick = appState.profile?.nickname;
  const googleId = appState.profile?.googleId;
  const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token || getOrCreateUserToken();

  if (!googleId || !nick || !token) return;

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
      ? Number(appState.activeTimer?.updatedAt || appState.activeTimer?.lastTickTime || 0)
      : Number(appState.lastTimerClearedAt || appState.lastModified || 0);
    const timerChanged = JSON.stringify(cloudData.activeTimer || null) !== JSON.stringify(appState.activeTimer || null);

    // Nếu một thiết bị khác đã tiếp quản quyền runner và đang chạy -> Dừng ngay lập tức trên thiết bị này
    if (isFocusRunning && cloudData.activeTimer?.runnerId && cloudData.activeTimer.runnerId !== CURRENT_RUNNER_ID) {
      isFocusRunning = false;
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
      releaseWakeLock();
      showToast('Phiên đếm giờ đã chuyển sang thiết bị khác.', 'info');
    }

    // Nếu Cloud đã chuyển sang tạm dừng hoặc hủy mà thiết bị này vẫn đang chạy -> Dừng ngay
    if (isFocusRunning && cloudData.activeTimer && !cloudData.activeTimer.isRunning) {
      isFocusRunning = false;
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
      releaseWakeLock();
    }

    // Nếu trên Cloud đã hủy phiên (activeTimer = null) mà thiết bị này còn phiên -> Giải phóng ngay
    if (cloudData.activeTimer === null && appState.activeTimer) {
      clearFocusTimerSession(false);
    }

    // Nếu Cloud mới hơn (do làm nhiệm vụ trên máy khác) HOẶC trạng thái Timer từ Cloud thực sự mới hơn:
    const isCloudTimerNewer = timerChanged && (
      Boolean(cloudData.activeTimer && (!appState.activeTimer || timerCloudTime >= timerLocalTime)) ||
      Boolean(!cloudData.activeTimer && appState.activeTimer)
    );

    if (cloudTime > localTime || isCloudTimerNewer) {
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
      const checked = deriveLegitimateBalance(appState);
      appState.profile.coins = checked.coins;
      appState.profile.totalCoinsEarned = checked.totalCoinsEarned;

      applyTheme(appState.profile.theme || 'dark');
      saveLocalCache();
      renderAll();
      restoreFocusTimer();

      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (modalSyncState) modalSyncState.textContent = 'Đã cập nhật từ Cloud';
      if (modalSyncTime) modalSyncTime.textContent = new Date(cloudData.lastSyncedAt || Date.now()).toLocaleTimeString();
      if (isManual) showToast('Đã tải dữ liệu mới nhất từ thiết bị khác thành công!', 'success');
    } else {
      if (timerChanged) {
        if (cloudData.activeTimer === null) {
          clearFocusTimerSession(false);
        } else {
          appState.activeTimer = cloudData.activeTimer || null;
          restoreFocusTimer();
        }
      }
      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (modalSyncState) modalSyncState.textContent = 'Đã lưu trên Cloud';
      if (modalSyncTime) modalSyncTime.textContent = new Date(appState.lastSyncedAt || Date.now()).toLocaleTimeString();
      if (isManual) showToast('Dữ liệu đã ở trạng thái mới nhất!', 'info');
    }
  } catch (err) {
    console.warn('Hydrate from cloud failed:', err.message);
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

// ponytail: single action button per toast; upgrade to list if multiple concurrent actions needed
function showToast(message, type = 'info', action = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;

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

function updateTitleByLevel() {
  const lvl = appState.profile.level;
  if (lvl >= 20) appState.profile.title = 'Huyền Thoại Kỷ Luật';
  else if (lvl >= 15) appState.profile.title = 'Bậc Thầy Năng Suất';
  else if (lvl >= 10) appState.profile.title = 'Chuyên Gia Tập Trung';
  else if (lvl >= 6) appState.profile.title = 'Chiến Binh Kiên Trì';
  else if (lvl >= 3) appState.profile.title = 'Học Viên Chăm Chỉ';
  else appState.profile.title = 'Tân Binh Cấp 1';
}

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

// Web Notifications API
function sendFocusNotification(title, body) {
  if (!('Notification' in window)) return;
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
          appState.activeTimer = {
            ...remoteTimer,
            remainingSeconds: focusRemainingSeconds,
            actualFocusedSeconds
          };
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
  if (!activeFocusQuest && !isBreakMode && !activeRewardItem) {
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch (_) {}
    if (appState.activeTimer) {
      appState.activeTimer = null;
      appState.lastTimerClearedAt = Date.now();
      if (syncCloudNow) triggerSave(true, immediate, timerAction || 'cancel');
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
    updatedAt: Date.now()
  };
  appState.activeTimer = state;
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}

  if (syncCloudNow) {
    triggerSave(true, immediate, timerAction);
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
        clearFocusTimerSession(false);
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
        focusRemainingSeconds = Math.max(0, (state.remainingSeconds || 0) - elapsed);
      } else {
        focusRemainingSeconds = Math.max(0, state.remainingSeconds || 0);
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

    if (focusRemainingSeconds <= 0) {
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
    if (titleEl) titleEl.textContent = 'Nghỉ giải lao (Pomodoro Break)';
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

  if (isRunningElsewhere) {
    if (modeLabel) modeLabel.textContent = 'ĐANG CHẠY TRÊN THIẾT BỊ KHÁC 📱';
    const toggleText = 'Tiếp Tục Ở Thiết Bị Này ⏱️';
    if (toggleBtn) {
      toggleBtn.textContent = toggleText;
      toggleBtn.className = 'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow-sm active:scale-95';
    }
    if (zenToggleBtn) zenToggleBtn.textContent = toggleText;
  } else if (isPausedElsewhere) {
    if (modeLabel) modeLabel.textContent = 'ĐANG TẠM DỪNG (MÁY KHÁC) ⏸️';
    const toggleText = 'Tiếp Tục Ở Thiết Bị Này ⏱️';
    if (toggleBtn) {
      toggleBtn.textContent = toggleText;
      toggleBtn.className = 'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow-sm active:scale-95';
    }
    if (zenToggleBtn) zenToggleBtn.textContent = toggleText;
  } else {
    if (modeLabel && !isBreakMode && !activeRewardItem) {
      modeLabel.textContent = isFocusRunning ? 'ĐANG BẤM GIỜ TẬP TRUNG' : 'ĐANG TẠM DỪNG ⏸️';
    }
    const toggleText = isFocusRunning ? 'Tạm Dừng' : 'Tiếp Tục';
    if (toggleBtn) {
      toggleBtn.textContent = toggleText;
      toggleBtn.className = isFocusRunning
        ? 'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm active:scale-95'
        : 'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-sm active:scale-95';
    }
    if (zenToggleBtn) zenToggleBtn.textContent = toggleText;
  }

  const isReward = Boolean(activeRewardItem || appState.activeTimer?.isRewardMode);
  station.querySelectorAll('.btn-timer-adjust').forEach((btn, idx) => {
    btn.textContent = isReward ? (idx === 0 ? '-1m' : '-5m') : (idx === 0 ? '+1m' : '+5m');
    btn.dataset.delta = isReward ? (idx === 0 ? '-60' : '-300') : (idx === 0 ? '60' : '300');
    btn.title = isReward ? (idx === 0 ? 'Giảm 1 phút hưởng thụ' : 'Giảm 5 phút hưởng thụ') : (idx === 0 ? 'Thêm 1 phút tập trung' : 'Thêm 5 phút tập trung');
  });
}

async function startFocusTimer(quest) {
  if (!quest) return;
  if (isTimerActionPending) return;
  isTimerActionPending = true;
  setTimeout(() => { isTimerActionPending = false; }, 400);

  // Edge case 1: Nhiệm vụ đã hoàn thành từ trước
  if (quest.status === 'completed') {
    showToast('Nhiệm vụ này đã được hoàn thành!', 'info');
    return;
  }

  // Edge case 1b: Nhiệm vụ đã đủ thời gian tập trung, đang chờ chụp ảnh nộp cho AI
  if (quest.focusTimerCompleted && quest.requiresProof && !quest._proofVerified) {
    showToast(`Nhiệm vụ "${quest.title}" đã hoàn thành đủ thời gian! Vui lòng chụp ảnh để AI duyệt nhận Vàng.`, 'info');
    openQuestProofModal(quest);
    return;
  }

  // Edge case 2: Nhấn "Bắt đầu" vào chính nhiệm vụ đang được bấm giờ
  if (activeFocusQuest && activeFocusQuest.id === quest.id) {
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
    const ok = await confirmAction({
      title: 'Đang Dùng Phần Thưởng',
      message: `Bạn đang tận hưởng phần thưởng "${activeRewardItem.name}" (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Bạn có muốn dừng để bắt đầu nhiệm vụ "${quest.title}" ngay?`,
      confirmText: 'Bắt Đầu Nhiệm Vụ ⚔️',
      cancelText: 'Tiếp Tục Dùng Quà 🎁',
      icon: '⚔️',
      btnColor: 'cyan'
    });
    if (!ok) return;
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
    const ok = await confirmAction({
      title: 'Đổi Nhiệm Vụ Tập Trung?',
      message: `Nhiệm vụ "${activeFocusQuest.title}" đang chạy (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Bạn có chắc muốn dừng để chuyển sang "${quest.title}"?`,
      detail: '⚠️ Thời gian tập trung của nhiệm vụ cũ sẽ không được tính.',
      confirmText: 'Đổi Nhiệm Vụ ⏱️',
      cancelText: 'Giữ Nhiệm Vụ Cũ',
      icon: '⏱️',
      btnColor: 'amber'
    });
    if (!ok) return;
  }

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  activeFocusQuest = quest;
  activeRewardItem = null;
  isBreakMode = false;
  focusTotalSeconds = Math.max(1, (quest.targetMinutes || 25)) * 60;
  focusRemainingSeconds = focusTotalSeconds;
  actualFocusedSeconds = 0;
  isFocusRunning = true;
  lastTickTime = Date.now();

  // Optimistic UI updates - 0ms latency phản hồi ngay trên giao diện
  renderFocusStationUI();
  updateTimerDisplay();
  saveFocusTimerState(true, true, 'start');
  requestWakeLock();
  renderQuests();
  renderInventory();

  // Cuộn ngay đến thanh đếm giờ để người dùng nhìn thấy lập tức
  document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  clearInterval(focusTimerInterval);
  focusTimerInterval = setInterval(tickFocusTimer, 500);

  sfx.playGong();
  showToast(`Bắt đầu đồng hồ tập trung: ${quest.targetMinutes || 25} phút! Chúc bạn tập trung cao độ.`, 'info');
}

function startBreakTimer(breakMinutes = 5) {
  if (isTimerActionPending) return;
  isTimerActionPending = true;
  setTimeout(() => { isTimerActionPending = false; }, 400);

  isBreakMode = true;
  activeFocusQuest = null;
  activeRewardItem = null;
  focusTotalSeconds = breakMinutes * 60;
  focusRemainingSeconds = focusTotalSeconds;
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

  sfx.playClick();
  showToast(`Bắt đầu nghỉ giải lao ${breakMinutes} phút! Hãy vươn vai và uống nước nhé.`, 'info');
}

async function toggleFocusTimer() {
  if (isTimerActionPending) return;
  isTimerActionPending = true;
  setTimeout(() => { isTimerActionPending = false; }, 400);

  if (!activeFocusQuest && !isBreakMode && !activeRewardItem && !appState.activeTimer) {
    showToast('Chưa có phiên nào đang chạy!', 'info');
    return;
  }

  // Nếu chuẩn bị bắt đầu đếm (từ tạm dừng hoặc chuyển từ thiết bị khác sang):
  // "khi chạy lại thì phải đồng bộ với thời gian của thiết bị đang chạy mới nhất rồi mới chạy, sau đó thì thiết bị đó phải bị dừng lại"
  if (!isFocusRunning) {
    // 1. Đồng bộ thời gian mới nhất từ thiết bị đang chạy qua Cloud trước khi chạy
    await pullLatestTimerFromCloud();

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
    saveFocusTimerState(true, true, 'resume'); // Đẩy ngay lên Redis kèm runnerId mới để thiết bị kia dừng lại
    renderQuests();
    renderInventory();
    showToast('Đã tiếp tục đếm giờ trên thiết bị này!', 'success');
    return;
  }

  // Đang chạy trên thiết bị này -> Bấm để Tạm dừng
  isFocusRunning = false;
  lastTickTime = Date.now();
  releaseWakeLock();
  clearInterval(focusTimerInterval);
  focusTimerInterval = null;
  sfx.playClick();

  updateTimerDisplay();
  renderFocusStationUI();
  saveFocusTimerState(true, true, 'pause');
  renderQuests();
  renderInventory();
}

async function resetFocusTimer() {
  if (isTimerActionPending) return;
  isTimerActionPending = true;
  setTimeout(() => { isTimerActionPending = false; }, 400);

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
    ? 'Phần thưởng đã dùng vẫn được ghi nhận trong kho quà.'
    : wasBreak
    ? ''
    : '⚠️ Phiên tập trung sẽ bị hủy và bạn sẽ không nhận được Vàng.';

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
  clearInterval(focusTimerInterval);
  focusTimerInterval = null;
  releaseWakeLock();
  const hadActiveSession = Boolean(activeFocusQuest || isBreakMode || activeRewardItem || appState.activeTimer);
  activeFocusQuest = null;
  activeRewardItem = null;
  isFocusRunning = false;
  isBreakMode = false;
  focusRemainingSeconds = 0;
  focusTotalSeconds = 0;
  actualFocusedSeconds = 0;
  appState.lastTimerClearedAt = Date.now();
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
      triggerSave(true, true, 'cancel');
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const syncChannel = new BroadcastChannel('levelup_sync_channel');
          syncChannel.postMessage({ type: 'TIMER_SYNC_UPDATE', tabId: CURRENT_TAB_ID, action: 'cancel' });
          syncChannel.close();
        } catch (_) {}
      }
    }
  }

  renderQuests();
  renderInventory();
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
    saveFocusTimerState(true, true);
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
  saveFocusTimerState(true, true);
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
    minInput.min = isReward ? 0 : (activeFocusQuest ? (activeFocusQuest.targetMinutes || 1) : 1);
    if (isReward) {
      minInput.max = Math.floor(totalSecs / 60);
      if (titleEl) titleEl.textContent = 'Giảm Thời Gian Hưởng Thụ';
    } else {
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
    saveFocusTimerState(true, true);
    sfx.playClick();
    closeModal('modal-edit-focus-timer');
    showToast(`Đã giảm thời gian: ${mins}p ${secs}s`, 'success');
    return;
  }

  // Anti-Cheat: Không cho phép đặt thời gian thấp hơn mức cam kết của nhiệm vụ
  if (activeFocusQuest) {
    const minRequiredSecs = (activeFocusQuest.targetMinutes || 1) * 60;
    if (total < minRequiredSecs) {
      showToast(`Không thể đặt thời gian ít hơn ${activeFocusQuest.targetMinutes} phút do AI đã phê duyệt!`, 'error');
      return;
    }
  }

  focusRemainingSeconds = total;
  if (total > focusTotalSeconds) {
    focusTotalSeconds = total;
  }
  updateTimerDisplay();
  saveFocusTimerState(true, true);
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
      if (zenTitle) zenTitle.textContent = 'Nghỉ giải lao (Pomodoro Break)';
      if (zenRank) {
        zenRank.textContent = 'BREAK';
        zenRank.className = 'text-xs px-2.5 py-0.5 rounded font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      }
      if (zenProtocol) zenProtocol.textContent = 'RELAX PROTOCOL';
    } else if (activeRewardItem) {
      if (zenTitle) zenTitle.textContent = `${activeRewardItem.icon || '🎁'} ${activeRewardItem.name}`;
      if (zenRank) {
        zenRank.textContent = (activeRewardItem.tier || 'REWARD').toUpperCase();
        zenRank.className = 'text-xs px-2.5 py-0.5 rounded font-bold font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30';
      }
      if (zenProtocol) zenProtocol.textContent = 'REWARD PROTOCOL';
    } else if (activeFocusQuest) {
      if (zenTitle) zenTitle.textContent = activeFocusQuest.title;
      if (zenRank) {
        zenRank.textContent = `HẠNG ${activeFocusQuest.rank}`;
        zenRank.className = `rank-badge-${activeFocusQuest.rank} text-xs px-2.5 py-0.5 rounded font-bold font-mono`;
      }
      if (zenProtocol) zenProtocol.textContent = 'FOCUS PROTOCOL';
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
      showToast('Đã hết giờ tập trung! Vui lòng nộp ảnh bằng chứng để AI duyệt và nhận Vàng.', 'info');
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

  if (quest._proofVerified) {
    delete quest._proofVerified;
  }
  if (quest.focusTimerCompleted) {
    delete quest.focusTimerCompleted;
  }

  if (!skipConfirm) {
    const ok = await confirmAction({
      title: 'Xác Nhận Hoàn Thành?',
      message: `Bạn đã thực hiện xong nhiệm vụ "${quest.title}"?`,
      detail: `💰 Phần thưởng: +${quest.rewardCoins} Vàng | ⚡ Kinh nghiệm: +${quest.rewardCoins * 3} EXP`,
      confirmText: 'Hoàn Thành ✓',
      cancelText: 'Chưa Xong',
      icon: '🎉',
      btnColor: 'emerald'
    });
    if (!ok) return;
  }

  completingQuestIds.add(questId);
  try {
    if (!quest.isRepeatable && quest.status === 'completed') return;
    if (getQuestRepeatCooldownRemaining(quest) > 0) return;

    if (activeFocusQuest && activeFocusQuest.id === questId) {
      clearFocusTimerSession();
    }

    quest.completedCount = (quest.completedCount || 0) + 1;
    if (quest.isRepeatable) {
      quest.lastCompletedAt = Date.now();
    } else {
      quest.status = 'completed';
      quest.completedAt = Date.now();
    }

    let earnedCoins = quest.rewardCoins;
    let deductedForLoan = 0;
    let loanCleared = false;

    // Tự động trích nợ Ngân Hàng nếu người chơi có khoản vay đang hoạt động
    if (appState.profile?.bank?.loan && (parseInt(appState.profile.bank.loan.debt, 10) || 0) > 0) {
      const loan = appState.profile.bank.loan;
      const isOverdue = loan.isOverdue || (Date.now() - (parseInt(loan.borrowedAt, 10) || Date.now())) >= 7 * 24 * 60 * 60 * 1000;
      if (isOverdue) {
        loan.isOverdue = true;
        appState.profile.bank.isFrozen = true;
        appState.profile.title = 'Con Nợ Quá Hạn ⚠️';
      }
      const deductRate = isOverdue ? 1.0 : Math.min(0.80, Math.max(0.30, Number(loan.autoDeductPercent) || 0.50));
      deductedForLoan = Math.min(loan.debt, Math.floor(earnedCoins * deductRate));
      if (deductedForLoan > 0) {
        loan.debt -= deductedForLoan;
        loan.principal = Math.max(0, (loan.principal || 0) - Math.min(loan.principal || 0, deductedForLoan));
        earnedCoins -= deductedForLoan;

        if (loan.debt <= 0) {
          loanCleared = true;
          appState.profile.bank.loan = null;
          appState.profile.bank.isFrozen = false;
          if (appState.profile.title === 'Con Nợ Quá Hạn ⚠️') {
            updateTitleByLevel();
          }
        }
      }
    }

    appState.profile.coins += earnedCoins;
    appState.profile.totalCoinsEarned += quest.rewardCoins;
    addEXP(quest.rewardCoins * 3);

    addLedgerEntry({
      id: 'led_' + Date.now(),
      type: 'earn',
      category: 'quest',
      amount: quest.rewardCoins,
      title: quest.title,
      description: `Hoàn thành [Hạng ${quest.rank}] ${quest.title}${quest.isRepeatable ? ` (Lần ${quest.completedCount})` : ''}`,
      timestamp: Date.now()
    });

    if (deductedForLoan > 0) {
      addLedgerEntry({
        id: 'bank_ded_' + (Date.now() + 1),
        type: 'spend',
        category: 'bank_deduct',
        amount: deductedForLoan,
        title: 'Trích nợ nhiệm vụ Ngân Hàng',
        description: `🏦 Đã tự động trích ${deductedForLoan} Vàng từ nhiệm vụ "${quest.title}" để trả nợ.${loanCleared ? ' Khoản nợ đã được tất toán!' : ` Nợ còn lại: ${appState.profile.bank?.loan?.debt || 0} Vàng.`}`,
        timestamp: Date.now() + 1
      });
    }

    sfx.playCoin();
    if (deductedForLoan > 0) {
      showToast(`+${earnedCoins} VÀNG (Đã trích ${deductedForLoan} Vàng trả nợ)! Hoàn thành: "${quest.title}"`, 'gold');
    } else {
      showToast(`+${quest.rewardCoins} VÀNG! Hoàn thành${quest.isRepeatable ? ` lần ${quest.completedCount}` : ''}: "${quest.title}"`, 'gold', {
        label: 'Hoàn tác',
        onClick: () => undoCompleteQuest(quest.id)
      });
    }
    triggerSave(true);
    renderHeader();
    renderQuests();
    renderLedger();
  } finally {
    completingQuestIds.delete(questId);
  }
}

async function undoCompleteQuest(questId) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return;
  if (!quest.isRepeatable && quest.status !== 'completed') return;
  if (quest.isRepeatable && (!quest.completedCount || quest.completedCount <= 0)) return;

  const ok = await confirmAction({
    title: 'Hoàn Tác Nhiệm Vụ?',
    message: `Đưa nhiệm vụ "${quest.title}" về trạng thái Chưa Xong?`,
    detail: `💰 Sẽ trừ lại: -${quest.rewardCoins} Vàng | ⚡ Sẽ trừ lại: -${quest.rewardCoins * 3} EXP`,
    confirmText: 'Hoàn Tác ↩️',
    cancelText: 'Giữ Nguyên',
    icon: '↩️',
    btnColor: 'amber'
  });
  if (!ok) return;

  quest.completedCount = Math.max(0, (quest.completedCount || 1) - 1);
  delete quest.focusTimerCompleted;
  delete quest._proofVerified;
  if (quest.isRepeatable) {
    if (!quest.completedCount) delete quest.lastCompletedAt;
  } else {
    quest.status = 'active';
    delete quest.completedAt;
  }

  appState.profile.coins = Math.max(0, appState.profile.coins - quest.rewardCoins);
  appState.profile.totalCoinsEarned = Math.max(0, appState.profile.totalCoinsEarned - quest.rewardCoins);
  appState.profile.exp = Math.max(0, appState.profile.exp - quest.rewardCoins * 3);

  addLedgerEntry({
    id: 'led_' + Date.now(),
    type: 'spend',
    category: 'quest',
    amount: quest.rewardCoins,
    title: `Hoàn tác: ${quest.title}`,
    description: `Hoàn tác hoàn thành: ${quest.title}`,
    timestamp: Date.now()
  });

  sfx.playClick();
  triggerSave(true);
  renderHeader();
  renderQuests();
  renderLedger();
  showToast(`Đã đưa nhiệm vụ "${quest.title}" về trạng thái Chưa Xong.`, 'info');
}

async function restartQuest(questId) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return;

  quest.status = 'active';
  delete quest.completedAt;
  delete quest.focusTimerCompleted;
  delete quest._proofVerified;

  sfx.playClick();
  triggerSave(true);
  renderQuests();
  showToast(`Đã đưa nhiệm vụ "${quest.title}" trở lại danh sách làm việc!`, 'info');
}

function toggleQuestRepeatable(questId) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return;

  quest.isRepeatable = !quest.isRepeatable;
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

  const captureZone = document.getElementById('proof-capture-zone');
  if (captureZone) captureZone.classList.remove('hidden');

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
    submitBtn.innerHTML = `<span>Gửi AI Duyệt</span><span>📸</span>`;
  }

  openModal('modal-quest-proof');
}

async function submitQuestProofToAI() {
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
        resultBox.className = 'p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200';
        if (resultIcon) resultIcon.textContent = '✅';
        if (resultTitle) resultTitle.textContent = 'AI ĐÃ DUYỆT THÀNH CÔNG!';
        if (resultFeedback) resultFeedback.textContent = data.feedback || 'Bằng chứng hợp lệ! Chúc mừng bạn đã hoàn thành nhiệm vụ.';

        sfx.playFanfare();
        showToast('🎉 AI đã duyệt bằng chứng! Đang trao thưởng...', 'gold');

        const questToComplete = currentProofQuest;
        questToComplete._proofVerified = true;

        setTimeout(() => {
          closeModal('modal-quest-proof');
          completeQuest(questToComplete.id, true);
        }, 1200);
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

  if (appState.profile.coins < item.price) {
    showToast(`Chưa đủ vàng! Bạn cần thêm ${item.price - appState.profile.coins} Vàng nữa. Hãy hoàn thành thêm nhiệm vụ nhé!`, 'error');
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
      ? `Bạn có chắc muốn dùng ${item.price} Vàng để đổi "${item.name}" và bắt đầu ${durationMinutes} phút tự thưởng?`
      : `Bạn có chắc muốn dùng ${item.price} Vàng để đổi phần thưởng "${item.name}"?`,
    detail: hasTimer
      ? `💰 Vàng hiện có: ${appState.profile.coins} | Còn lại: ${appState.profile.coins - item.price}\n⏱️ Đồng hồ đếm ngược ${durationMinutes} phút sẽ kích hoạt ngay trên màn hình!`
      : `💰 Vàng hiện có: ${appState.profile.coins} | Còn lại sau khi đổi: ${appState.profile.coins - item.price}`,
    confirmText: hasTimer ? `Đổi & Bấm Giờ (${durationMinutes}p) ⏱️` : 'Đổi Quà 🎁',
    cancelText: 'Để Sau',
    icon: item.icon || '🎁',
    btnColor: 'amber'
  });
  if (!ok) return;

  appState.profile.coins -= item.price;

  const newInvItem = {
    id: 'inv_' + Date.now(),
    shopItemId: item.id || item.shopItemId,
    name: item.name,
    price: item.price,
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
  if (!item || item.isUsed) return;

  if (!skipConfirm) {
    const ok = await confirmAction({
      title: 'Hoàn Trả Phần Thưởng?',
      message: `Bạn muốn hoàn trả "${item.name}" và nhận lại ${item.price} Vàng?`,
      detail: '💰 Số Vàng sẽ được hoàn lại đầy đủ vào tài khoản của bạn.',
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

  // Case 2: Đã sử dụng và không chạy timer
  if (item.isUsed) {
    showToast('Phần thưởng này đã được sử dụng!', 'info');
    return;
  }

  const durationMinutes = extractRewardDuration(item);

  if (!skipConfirm) {
    // Case 3: Xung đột với phiên tập trung nhiệm vụ
    if (activeFocusQuest) {
      const ok = await confirmAction({
        title: 'Đang Trong Nhiệm Vụ Tập Trung',
        message: `Nhiệm vụ "${activeFocusQuest.title}" đang chạy (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Bạn có muốn dừng nhiệm vụ để dùng phần thưởng "${item.name}"?`,
        detail: '⚠️ Thời gian tập trung của nhiệm vụ sẽ không được tính.',
        confirmText: 'Dừng & Dùng Quà 🎁',
        cancelText: 'Tiếp Tục Nhiệm Vụ ⚔️',
        icon: '🎁',
        btnColor: 'purple'
      });
      if (!ok) return;
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
    } else if (activeRewardItem && activeRewardItem.id !== invId) {
      // Case 5: Đang có một phần thưởng khác đang đếm giờ
      const ok = await confirmAction({
        title: 'Đổi Phần Thưởng Đang Dùng?',
        message: `Bạn đang trong phiên dùng quà "${activeRewardItem.name}" (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Bạn có muốn chuyển sang dùng "${item.name}"?`,
        confirmText: 'Đổi Quà 🎁',
        cancelText: 'Giữ Quà Hiện Tại',
        icon: '🎁',
        btnColor: 'purple'
      });
      if (!ok) return;
    } else if (durationMinutes > 0) {
      // Case 6: Xác nhận sử dụng quà kèm thời lượng đếm ngược
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
  }

  // Nếu quà không cần bấm giờ
  if (durationMinutes === 0) {
    item.isUsed = true;
    item.usedAt = Date.now();
    sfx.playFanfare();
    showToast(`🎉 Đã sử dụng phần thưởng "${item.name}"! Chúc mừng bạn!`, 'success');
    renderInventory();
    triggerSave(true);
    return;
  }

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  item.isUsed = true;
  item.usedAt = Date.now();

  activeRewardItem = item;
  activeFocusQuest = null;
  isBreakMode = false;
  focusTotalSeconds = Math.max(1, durationMinutes) * 60;
  focusRemainingSeconds = focusTotalSeconds;
  actualFocusedSeconds = 0;
  isFocusRunning = true;
  lastTickTime = Date.now();

  renderFocusStationUI();
  updateTimerDisplay();
  saveFocusTimerState(true, true);
  requestWakeLock();
  renderQuests();
  renderInventory();

  clearInterval(focusTimerInterval);
  focusTimerInterval = setInterval(tickFocusTimer, 500);

  sfx.playFanfare();
  showToast(`Bắt đầu tận hưởng: "${item.name}" (${durationMinutes} phút)! Chúc bạn thư giãn tuyệt vời.`, 'purple', {
    label: 'Hoàn tác',
    onClick: () => undoUseInventoryItem(invId, true)
  });
  triggerSave(true);
}

async function undoUseInventoryItem(invId, skipConfirm = false) {
  const item = appState.inventory.find(i => i.id === invId);
  if (!item || !item.isUsed) return;

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

// =============================================================================
// 8. STRICT AI ARBITER EVALUATION & DEBATE
// =============================================================================
let currentPendingVerdict = null;
let currentDebateHistory = [];
let currentEditingQuestId = null;
let currentEditingRewardId = null;

async function submitQuestToAI() {
  const title = document.getElementById('input-quest-title').value.trim();
  const desc = document.getElementById('input-quest-desc').value.trim();
  const estimate = parseInt(document.getElementById('input-quest-estimate').value, 10) || 0;
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
          userEstimateCoins: estimate,
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

  if (activeFocusQuest && activeFocusQuest.id === quest.id && isFocusRunning) {
    showToast('Vui lòng tạm dừng phiên tập trung trước khi thương lượng lại nhiệm vụ này.', 'info');
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

function createDebateLoadingBubble(text = 'AI đang xem xét đề xuất thương lượng của bạn...') {
  const row = document.createElement('div');
  row.className = 'flex justify-start items-start gap-2 message-fade-in';
  row.innerHTML = `
    <div class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">🤖</div>
    <div class="max-w-[88%] sm:max-w-[90%] bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 rounded-2xl rounded-tl-xs px-4 py-2.5 sm:py-3 text-xs sm:text-[13px] text-amber-700 dark:text-amber-300 shadow-xs flex items-center gap-2">
      <span class="inline-flex gap-1 items-center shrink-0">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style="animation-delay: 0ms"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style="animation-delay: 150ms"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style="animation-delay: 300ms"></span>
      </span>
      <span class="italic text-[11px] sm:text-xs">${escapeHtml(text)}</span>
    </div>
  `;
  return row;
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
    if (mins > 0) details.push(`${mins} phút`);
    if (gold !== undefined) details.push(`${gold} Vàng`);
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
    if (type === 'reward') {
      if (gold !== undefined) payload.newPrice = gold;
      if (mins > 0) payload.newTargetMinutes = mins;
      if (gold !== undefined && gold < 30) payload.newTier = 'common';
      if (newName) payload.newName = newName;
    } else {
      if (gold !== undefined) payload.newRewardCoins = gold;
      if (mins > 0) payload.newTargetMinutes = mins;
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
  mode = 'quest'
}) {
  if (!container) return;
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

  const loadingBubble = createDebateLoadingBubble('AI đang xem xét đề xuất thương lượng của bạn...');
  chatLogs.appendChild(loadingBubble);
  chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });

  try {
    const currentRewards = (appState.shopItems || []).slice(0, 10).map(item => ({
      name: item.name,
      price: item.price,
      tier: item.tier
    }));

    const prevVerdict = { ...currentPendingVerdict };

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'debate_quest',
        payload: {
          quest: currentPendingVerdict,
          argument,
          history: currentDebateHistory,
          currentRewards,
          userCoins: appState.profile?.coins || 0,
          selectedOption
        }
      })
    });

    if (!res.ok) throw new Error('AI Error');
    const data = await res.json();
    loadingBubble.remove();

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
      onSelectOption: (opt) => sendDebateArgument(opt.argument || `Chốt phương án ${opt.id}`, opt)
    });

    currentDebateHistory.push({ user: argument, arbiter: data.reply });

    if (data.accepted) {
      if (data.newTitle) currentPendingVerdict.title = data.newTitle;
      if (data.newDescription !== undefined) currentPendingVerdict.description = data.newDescription;
      if (data.newRewardCoins) currentPendingVerdict.rewardCoins = data.newRewardCoins;
      if (data.newTargetMinutes !== undefined) currentPendingVerdict.targetMinutes = data.newTargetMinutes;
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
      currentPendingVerdict.rank = data.newRank || calculateRank(currentPendingVerdict.rewardCoins);

      // Refresh locked specs display card and badges
      updateVerdictDisplay();

      showToast('Thương lượng thành công! AI đã cập nhật thông số nhiệm vụ.', 'gold');
      sfx.playFanfare();
    }
  } catch (err) {
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
  const estimate = parseInt(document.getElementById('input-reward-estimate')?.value, 10) || 0;
  let duration = parseInt(document.getElementById('input-reward-duration')?.value, 10) || 0;
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

  const loadingBubble = createDebateLoadingBubble('AI đang xem xét đề xuất thương lượng phần thưởng...');
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

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'debate_reward',
        payload: {
          reward: currentPendingReward,
          argument,
          history: currentRewardDebateHistory,
          currentQuests,
          userCoins: appState.profile?.coins || 0,
          selectedOption
        }
      })
    });

    if (!res.ok) throw new Error('AI Error');
    const data = await res.json();
    loadingBubble.remove();

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
  renderShop();
  triggerSave(true);
}

// =============================================================================
// 10. LEADERBOARD FETCHER & PRESENCE
// =============================================================================
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

async function fetchLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs">Đang tải bảng xếp hạng...</td></tr>';

  try {
    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch('/api/sync?action=leaderboard', { headers, credentials: 'include' });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    const list = data.leaderboard || [];

    // Cập nhật số lượng người online trên badge
    const onlineBadgeCount = document.getElementById('leaderboard-online-count');
    if (onlineBadgeCount) {
      onlineBadgeCount.textContent = (data.onlineCount || 0).toLocaleString('vi-VN');
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs">Chưa có ai trên Bảng Xếp Hạng. Hãy đồng bộ tên của bạn để là người đầu tiên!</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    list.forEach((u, idx) => {
      const isMe = (appState.profile.googleId && (u.key === appState.profile.googleId || u.googleId === appState.profile.googleId)) ||
                   (u.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase());
      const tr = document.createElement('tr');
      tr.className = `hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition ${isMe ? 'bg-amber-500/10 font-bold' : ''}`;

      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
      const avatarHtml = isAvatarUrl(u.avatar)
        ? `<img referrerpolicy="no-referrer" src="${escapeHtml(u.avatar)}" alt="${escapeHtml(u.nickname || 'Avatar')}" class="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 inline-block" onerror="this.onerror=null;this.outerHTML='<span class=\\'text-base sm:text-lg shrink-0\\'>⚔️</span>'">`
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
          <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusColor}" title="${escapeHtml(statusTitle)}"></span>
        </div>
      `;

      const statusSubtext = isOnline
        ? '<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-none mt-0.5">Đang online</span>'
        : `<span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-none mt-0.5">Online ${escapeHtml(formatTimeAgo(lastActiveTime))}</span>`;

      const displayCoins = isMe ? (appState.profile?.coins ?? 0) : (typeof u.coins === 'number' ? u.coins : (u.totalCoinsEarned || 0));

      tr.innerHTML = `
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 font-mono whitespace-nowrap ${idx < 3 ? 'text-base sm:text-lg' : 'text-slate-500'}">${medal}</td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4">
          <div class="flex items-center gap-2.5 min-w-0">
            ${avatarWithPresence}
            <div class="min-w-0 flex flex-col justify-center">
              <div class="min-w-0 flex items-center flex-wrap gap-1.5">
                <span class="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[120px] sm:max-w-[200px]">${escapeHtml(u.nickname)}</span>
                ${u.role === 'admin' ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-500 text-white font-bold whitespace-nowrap">👑 ADMIN</span>' : ''}
                ${isMe ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold whitespace-nowrap">BẠN</span>' : ''}
                ${appState.profile.role === 'admin' && !isMe ? `<button class="btn-admin-del text-rose-500 hover:text-rose-700 ml-1 text-xs" data-nick="${escapeHtml(u.nickname || u.key)}" data-key="${escapeHtml(u.key || u.nickname)}" title="Xóa tài khoản này (Quyền Admin)">🗑️</button>` : ''}
              </div>
              ${statusSubtext}
            </div>
          </div>
        </td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs text-amber-600 dark:text-amber-400/90 hidden sm:table-cell whitespace-nowrap">${escapeHtml(u.title || 'Thành viên')}</td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">Lv. ${u.level || 1}</td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap"><span class="inline-flex items-center gap-1 justify-end">${COIN_ICON_HTML} ${displayCoins}</span></td>
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
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center whitespace-nowrap">
          <button type="button" class="btn-pardon-row inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm" data-nick="${escapeHtml(c.nickname || c.key)}" data-key="${escapeHtml(c.key || c.nickname)}" title="Ân xá cho tài khoản này">
            <span>🕊️</span>
            <span>Ân Xá</span>
          </button>
        </td>
      ` : '';

      tr.innerHTML = `
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4">
          <div class="flex items-center gap-2.5 min-w-0">
            ${avatarHtml}
            <div class="min-w-0 flex items-center flex-wrap gap-1.5">
              <span class="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[130px] sm:max-w-[200px]">${escapeHtml(c.nickname)}</span>
              ${isMe ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold whitespace-nowrap">BẠN</span>' : ''}
            </div>
          </div>
        </td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs whitespace-nowrap">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            ${escapeHtml(c.title || 'Kẻ Gian Lận ⚠️')}
          </span>
        </td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center font-mono text-xs font-bold text-rose-500 whitespace-nowrap">
          ${c.cheatStrikes || 1} lần
        </td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
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
      btnRanking.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-500/20 hover:text-amber-500 flex items-center gap-1.5';
    }
    if (btnCheaters) {
      btnCheaters.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-rose-500 text-white shadow-sm flex items-center gap-1.5';
    }
    if (viewRanking) viewRanking.classList.add('hidden');
    if (viewCheaters) viewCheaters.classList.remove('hidden');
    fetchCheaters();
  } else {
    if (btnRanking) {
      btnRanking.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-amber-500 text-slate-950 shadow-sm flex items-center gap-1.5';
    }
    if (btnCheaters) {
      btnCheaters.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-500/20 hover:text-rose-500 flex items-center gap-1.5';
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
let currentQuestFilter = 'all';

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
}

function renderQuests() {
  const grid = document.getElementById('quests-grid');
  const empty = document.getElementById('quests-empty');
  const activeCountBadge = document.getElementById('badge-active-quests');

  let filtered = appState.quests;
  if (currentQuestFilter === 'active') {
    filtered = appState.quests.filter(q => q.status === 'active');
  } else if (currentQuestFilter === 'completed') {
    filtered = appState.quests.filter(q => q.status === 'completed');
  }

  const activeCount = appState.quests.filter(q => q.status === 'active').length;
  if (activeCountBadge) activeCountBadge.textContent = activeCount;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = '';

  filtered.forEach(q => {
    const isCompleted = q.status === 'completed';
    const isCurrentlyFocusing = activeFocusQuest && activeFocusQuest.id === q.id;
    const isSessionOnOtherDevice = Boolean(
      isCurrentlyFocusing &&
      appState.activeTimer?.runnerId &&
      appState.activeTimer.runnerId !== CURRENT_RUNNER_ID
    );
    const cooldownRemainingMs = getQuestRepeatCooldownRemaining(q);
    const card = document.createElement('div');
    card.className = `rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 relative ${
      isCurrentlyFocusing
        ? 'ring-2 ring-amber-500 shadow-xl shadow-amber-500/20 bg-amber-500/5 border-amber-500/50'
        : isCompleted
          ? 'opacity-70 bg-slate-100/50 dark:bg-slate-950/30'
          : ''
    }`;

    card.innerHTML = `
      <div>
        <!-- Zone 1: Header (Classification & Value/Reward) -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2">
            <span class="rank-badge-${q.rank} text-xs font-mono font-black px-2.5 py-1 rounded-lg tracking-wider shadow-xs">HẠNG ${q.rank}</span>
            ${q.requiresProof ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${q.focusTimerCompleted ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs animate-pulse' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs'}" title="${q.focusTimerCompleted ? 'Đã hoàn thành đủ thời gian! Chờ chụp ảnh gửi AI thẩm định để nhận thưởng' : 'Cần chụp ảnh gửi AI thẩm định để nhận thưởng'}">
                📸 ${q.focusTimerCompleted ? 'CHỜ NỘP ẢNH' : 'CẦN ẢNH'}
              </span>
            ` : ''}
            ${isCurrentlyFocusing ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950 shadow-xs animate-pulse">
                ĐANG LÀM
              </span>
            ` : ''}
          </div>
          <div class="flex items-center gap-1.5">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-black text-xs shadow-xs">
              ${COIN_ICON_HTML} <span>+${q.rewardCoins}</span>
            </div>
            <button class="btn-del-quest text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg p-1 transition-colors leading-none" title="Xóa nhiệm vụ" aria-label="Xóa nhiệm vụ">
              <svg class="w-4 h-4 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </button>
          </div>
        </div>

        <!-- Zone 2: Body (Title & Readable Context) -->
        <div class="mb-3">
          <h3 class="font-bold text-sm sm:text-base leading-snug line-clamp-2 ${isCompleted ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}">${escapeHtml(q.title)}</h3>
          ${q.description ? `<p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">${escapeHtml(q.description)}</p>` : ''}
        </div>
      </div>

      <div>
        <!-- Zone 3: Meta & Progress Strip (Operational Status) -->
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
            ${q.type === 'focus' ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${q.focusTimerCompleted ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold' : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'} font-mono">
                ${q.focusTimerCompleted ? `
                  <svg class="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
                  <span>Đã đủ ${q.targetMinutes}p</span>
                ` : `
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
                  <span>${q.targetMinutes}p</span>
                `}
              </span>
              <span>${q.focusTimerCompleted ? 'Đã xong giờ' : 'Tập trung'}</span>
            ` : `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
                Không bấm giờ
              </span>
            `}
          </div>

          <button class="btn-toggle-repeat text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${q.isRepeatable ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'}" title="Nhấn để đổi giữa Lặp lại và Làm 1 lần">
            ${q.isRepeatable ? `
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Lặp lại${q.completedCount ? ` (${q.completedCount})` : ''}</span>
            ` : `
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="9" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>
              <span>1 lần</span>
            `}
          </button>
        </div>

        <!-- Zone 4: Footer (Action Command Zone) -->
        ${isCompleted ? `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
              <span>Hoàn thành</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button class="btn-restart-quest min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-600 dark:hover:text-cyan-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 active:scale-95" title="Làm lại nhiệm vụ này">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                <span>Làm lại</span>
              </button>
              <button class="btn-undo-quest min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 active:scale-95" title="Hoàn tác trạng thái hoàn thành">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
                <span>Hoàn tác</span>
              </button>
            </div>
          </div>
        ` : `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
            <button class="btn-debate-quest flex-1 min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95" title="Thương lượng lại nhiệm vụ với AI">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              <span>Thương lượng</span>
            </button>
            ${q.focusTimerCompleted && q.requiresProof ? `
              <button class="btn-submit-quest-proof flex-1 min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/25 ring-2 ring-amber-400/50" title="Đã đủ thời gian tập trung! Bấm để chụp ảnh gửi AI duyệt nhận Vàng">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="4" stroke-width="2"/></svg>
                <span>Chụp Ảnh Nhận Vàng 📸</span>
              </button>
            ` : (q.type === 'focus' ? `
              <button class="btn-start-focus flex-1 min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 ${isSessionOnOtherDevice ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/20 ring-2 ring-cyan-400' : (isCurrentlyFocusing ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25 ring-2 ring-amber-400' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/20')}">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
                <span>${isSessionOnOtherDevice ? 'Tiếp Tục Ở Thiết Bị Này ⏱️' : (isCurrentlyFocusing ? (isFocusRunning ? 'Đang Chạy...' : 'Tạm Dừng') : 'Bắt Đầu')}</span>
              </button>
            ` : `
              <button class="btn-complete-bounty flex-1 min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${cooldownRemainingMs > 0 ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300/40 dark:border-slate-700/60 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20 active:scale-95'}" ${cooldownRemainingMs > 0 ? 'title="Đang trong thời gian chờ 10 phút giữa các lần nhận thưởng"' : ''}>
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
                <span>${cooldownRemainingMs > 0 ? `Chờ ${Math.ceil(cooldownRemainingMs / 60000)}p` : 'Hoàn Thành'}</span>
              </button>
            `)}
          </div>
        `}
      </div>
    `;

    const toggleRepeatBtn = card.querySelector('.btn-toggle-repeat');
    if (toggleRepeatBtn) {
      toggleRepeatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleQuestRepeatable(q.id);
      });
    }

    card.querySelector('.btn-del-quest').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteQuest(q.id);
    });

    const debateQuestBtn = card.querySelector('.btn-debate-quest');
    if (debateQuestBtn) {
      debateQuestBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openQuestRenegotiateModal(q.id);
      });
    }

    const restartBtn = card.querySelector('.btn-restart-quest');
    if (restartBtn) {
      restartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        restartQuest(q.id);
      });
    }

    const undoBtn = card.querySelector('.btn-undo-quest');
    if (undoBtn) {
      undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        undoCompleteQuest(q.id);
      });
    }

    const submitProofBtn = card.querySelector('.btn-submit-quest-proof');
    if (submitProofBtn) {
      submitProofBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openQuestProofModal(q);
      });
    }

    const startBtn = card.querySelector('.btn-start-focus');
    if (startBtn) {
      startBtn.addEventListener('click', () => startFocusTimer(q));
    }

    const completeBtn = card.querySelector('.btn-complete-bounty');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => completeQuest(q.id));
    }

    grid.appendChild(card);
  });
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
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-3xl text-slate-400 shadow-sm">
          🎁
        </div>
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Cửa hàng chưa có phần thưởng nào!</h3>
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

  appState.shopItems.forEach(item => {
    const canAfford = appState.profile.coins >= item.price;
    const coinsNeeded = Math.max(0, item.price - appState.profile.coins);
    const durationMins = extractRewardDuration(item);
    const card = document.createElement('div');
    card.className = 'rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 relative group';

    const tierColors = {
      common: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      rare: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
      epic: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
      legendary: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    };

    card.innerHTML = `
      <div>
        <!-- Zone 1: Header (Classification & Value/Reward) -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-[10px] font-mono uppercase px-2.5 py-1 rounded-lg font-bold border tracking-wider shadow-xs ${tierColors[item.tier] || tierColors.rare}">
            ${item.tier || 'RARE'}
          </span>
          <div class="flex items-center gap-1.5">
            ${durationMins > 0 ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 font-mono text-[11px] font-bold border border-purple-500/20 shadow-xs">
                ⏱️ ${durationMins}p
              </span>
            ` : ''}
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-black text-xs shadow-xs">
              ${COIN_ICON_HTML} <span>${item.price} Vàng</span>
            </div>
            <button class="btn-del-shop-item text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg p-1 transition-colors leading-none" title="Xóa phần thưởng khỏi Cửa Hàng" aria-label="Xóa phần thưởng khỏi Cửa Hàng">
              <svg class="w-4 h-4 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </button>
          </div>
        </div>

        <!-- Zone 2: Body (Title & Readable Context) -->
        <div class="flex items-start gap-3 my-2">
          <div class="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl shadow-xs shrink-0">
            ${escapeHtml(item.icon || '🎁')}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">${escapeHtml(item.name)}</h3>
            ${item.description ? `<p class="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">${escapeHtml(item.description)}</p>` : ''}
          </div>
        </div>
      </div>

      <div>
        <!-- Zone 3: Meta & Progress Strip (Affordability) -->
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <span class="text-[11px] font-medium ${canAfford ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'} inline-flex items-center gap-1">
            ${canAfford ? `
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
              <span>Đủ điều kiện đổi</span>
            ` : `
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/><line x1="12" y1="16" x2="12.01" stroke-width="2"/></svg>
              <span>Còn thiếu ${coinsNeeded} Vàng</span>
            `}
          </span>
        </div>

        <!-- Zone 4: Footer (Action Command Zone) -->
        <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
          <button class="btn-debate-shop-item flex-1 min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95" title="Thương lượng lại phần thưởng với AI">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            <span>Thương lượng</span>
          </button>
          <button class="btn-buy-item flex-1 min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${canAfford ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-md shadow-amber-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300/40 dark:border-slate-700/40'}" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' : ''}
            <span>${canAfford ? (durationMins > 0 ? `Đổi & Bấm Giờ (${durationMins}p)` : 'Đổi Quà') : 'Chưa Đủ Vàng'}</span>
          </button>
        </div>
      </div>
    `;

    card.querySelector('.btn-del-shop-item').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteShopItem(item.id);
    });

    const debateShopBtn = card.querySelector('.btn-debate-shop-item');
    if (debateShopBtn) {
      debateShopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openRewardRenegotiateModal(item.id);
      });
    }

    card.querySelector('.btn-buy-item').addEventListener('click', () => {
      buyShopItem(item.id);
    });

    grid.appendChild(card);
  });
}

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  const empty = document.getElementById('inventory-empty');
  const countBadge = document.getElementById('badge-inventory-count');

  const unusedCount = appState.inventory.filter(i => !i.isUsed).length;
  if (countBadge) countBadge.textContent = unusedCount;
  updateRewardsNavBadge();

  if (appState.inventory.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = '';

  appState.inventory.forEach(item => {
    const isThisActiveReward = Boolean(activeRewardItem && activeRewardItem.id === item.id);
    const durationMins = extractRewardDuration(item);
    const card = document.createElement('div');
    card.className = `rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 relative group ${
      isThisActiveReward
        ? 'ring-2 ring-purple-500 shadow-xl shadow-purple-500/20 bg-purple-500/5 border-purple-500/50'
        : (item.isUsed ? 'opacity-70 bg-slate-100/50 dark:bg-slate-950/30' : '')
    }`;

    card.innerHTML = `
      <div>
        <!-- Zone 1: Header (Classification & Value/Reward) -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2">
            ${isThisActiveReward ? `
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-purple-500 text-white shadow-xs animate-pulse">
                ĐANG DÙNG
              </span>
            ` : item.isUsed ? `
              <span class="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300/40 dark:border-slate-700/40">
                ĐÃ DÙNG
              </span>
            ` : `
              <span class="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 tracking-wider">
                KHO QUÀ
              </span>
            `}
          </div>
          <div class="flex items-center gap-1.5">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-black text-xs shadow-xs">
              ${COIN_ICON_HTML} <span>${item.price} Vàng</span>
            </div>
            <button class="btn-del-inv text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg p-1 transition-colors leading-none" title="Xóa khỏi Kho Quà" aria-label="Xóa khỏi Kho Quà">
              <svg class="w-4 h-4 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </button>
          </div>
        </div>

        <!-- Zone 2: Body (Title & Readable Context) -->
        <div class="flex items-start gap-3 my-2">
          <div class="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl shadow-xs shrink-0">
            ${escapeHtml(item.icon || '🎁')}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 ${item.isUsed && !isThisActiveReward ? 'text-slate-400 dark:text-slate-500' : ''}">${escapeHtml(item.name)}</h4>
            <p class="mt-1 text-xs text-slate-400 dark:text-slate-500 font-mono">Đã đổi: ${new Date(item.purchasedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div>
        <!-- Zone 3: Meta & Progress Strip (Duration info) -->
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <span class="text-[11px] font-medium text-purple-700 dark:text-purple-300 font-mono inline-flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
            <span>Hiệu lực: <strong class="font-bold">${durationMins} phút</strong></span>
          </span>
          ${item.isUsed && !isThisActiveReward ? '<span class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Đã kết thúc</span>' : ''}
        </div>

        <!-- Zone 4: Footer (Action Command Zone) -->
        ${item.isUsed ? `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            ${isThisActiveReward ? `
              <button class="btn-scroll-timer flex-1 min-h-[38px] px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 active:scale-95" title="Xem bộ đếm thời gian">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
                <span>${isFocusRunning ? 'Đang Đếm Giờ' : 'Tạm Dừng'}</span>
              </button>
            ` : `
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
                <span>Đã sử dụng</span>
              </span>
            `}
            <button class="btn-undo-inv min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95" title="Đánh dấu chưa sử dụng">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
              <span>Hoàn tác</span>
            </button>
          </div>
        ` : `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
            <button class="btn-refund-inv min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 active:scale-95" title="Hoàn trả và nhận lại Vàng">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
              <span>Trả quà</span>
            </button>
            <button class="btn-use-inv flex-1 min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all shadow-md shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Dùng Quà (${durationMins}p)</span>
            </button>
          </div>
        `}
      </div>
    `;

    const scrollTimerBtn = card.querySelector('.btn-scroll-timer');
    if (scrollTimerBtn) {
      scrollTimerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

    const delInvBtn = card.querySelector('.btn-del-inv');
    if (delInvBtn) {
      delInvBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteInventoryItem(item.id);
      });
    }

    const refundBtn = card.querySelector('.btn-refund-inv');
    if (refundBtn) {
      refundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        refundInventoryItem(item.id);
      });
    }

    const undoInvBtn = card.querySelector('.btn-undo-inv');
    if (undoInvBtn) {
      undoInvBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        undoUseInventoryItem(item.id);
      });
    }

    const useBtn = card.querySelector('.btn-use-inv');
    if (useBtn) {
      useBtn.addEventListener('click', () => useInventoryItem(item.id));
    }

    grid.appendChild(card);
  });
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
    spend: document.getElementById('ledger-filter-spend')
  };
  Object.entries(filterBtns).forEach(([k, btn]) => {
    if (!btn) return;
    if (k === filter) {
      btn.className = 'ledger-filter-btn px-3 py-1 rounded-xl text-xs font-bold transition bg-amber-500 text-slate-950 shadow-xs';
    } else {
      btn.className = 'ledger-filter-btn px-3 py-1 rounded-xl text-xs font-semibold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white';
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

  const ledger = Array.isArray(appState.ledger) ? appState.ledger : [];

  // 1. Cập nhật thống kê nhanh trong ngày
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

  // 2. Lọc theo danh mục (Tất cả / Thu / Chi)
  const filtered = ledger.filter(e => currentLedgerFilter === 'all' || e.type === currentLedgerFilter);
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
          const timeStr = new Date(entry.timestamp || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          return `
            <div class="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs shadow-xs">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-base shrink-0">${isEarn ? '📥' : '📤'}</span>
                <div class="min-w-0">
                  <div class="font-semibold text-slate-800 dark:text-slate-200 truncate">${escapeHtml(entry.description || '')}</div>
                  <div class="text-[10px] text-slate-400 font-mono">${timeStr}</div>
                </div>
              </div>
              <div class="font-mono font-bold text-sm shrink-0 inline-flex items-center gap-1 ${isEarn ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}">
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
}

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
  if (totalRewardsBadge) {
    const unusedCount = appState.inventory ? appState.inventory.filter(i => !i.isUsed).length : 0;
    totalRewardsBadge.textContent = unusedCount > 0 ? unusedCount : (appState.shopItems ? appState.shopItems.length : 0);
  }
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
  } else {
    if (btnShop) btnShop.className = activeClass;
    if (btnInv) btnInv.className = inactiveClass;
    if (paneShop) paneShop.classList.remove('hidden');
    if (paneInv) paneInv.classList.add('hidden');
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

function switchTab(tabId) {
  // Graceful fallback / redirect for legacy 'inventory' tab links
  if (tabId === 'inventory') {
    tabId = 'shop';
    switchRewardSubtab('inventory');
  }

  const isAdmin = isUserAdmin();

  // Sync desktop tabs
  document.querySelectorAll('.nav-tab').forEach(b => {
    const isActive = b.dataset.tab === tabId;
    const isAdminBtn = b.id === 'nav-tab-admin' || b.dataset.tab === 'admin';

    if (isAdminBtn && !isAdmin) {
      b.className = 'nav-tab hidden items-center gap-1 sm:gap-1.5 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-semibold text-xs transition shrink-0 whitespace-nowrap';
      return;
    }

    if (isAdminBtn) {
      b.className = `nav-tab flex items-center gap-1 sm:gap-1.5 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-semibold text-xs transition text-purple-600 dark:text-purple-400 border shrink-0 whitespace-nowrap ${
        isActive
          ? 'active bg-purple-500/15 dark:bg-purple-500/25 text-purple-700 dark:text-purple-300 border-purple-500/50 shadow-xs font-bold'
          : 'hover:text-purple-900 dark:hover:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 border-purple-500/20'
      }`;
      return;
    }

    b.className = `nav-tab flex items-center gap-1 sm:gap-1.5 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-semibold text-xs transition shrink-0 whitespace-nowrap ${
      isActive
        ? 'active bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs font-bold'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent'
    }`;
  });

  // Sync mobile bottom bar buttons
  document.querySelectorAll('.mobile-nav-btn').forEach(b => {
    const isActive = b.dataset.tab === tabId;
    const isAdminBtn = b.id === 'mobile-nav-admin' || b.dataset.tab === 'admin';

    if (isAdminBtn && !isAdmin) {
      b.className = 'mobile-nav-btn hidden flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-1 px-1 sm:px-2 rounded-xl transition';
      return;
    }

    if (isAdminBtn) {
      b.className = `mobile-nav-btn flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-1 px-1 sm:px-2 rounded-xl transition ${
        isActive
          ? 'active bg-purple-500/15 dark:bg-purple-400/20 text-purple-700 dark:text-purple-300 font-bold shadow-xs'
          : 'text-purple-500/70 dark:text-purple-400/70 hover:bg-purple-500/5 font-medium'
      }`;
      return;
    }

    b.className = `mobile-nav-btn flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-1 px-1 sm:px-2 rounded-xl transition ${
      isActive
        ? 'active bg-amber-500/15 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
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
  let safe = escapeHtml(text);
  safe = safe.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[11px] font-mono">$1</code>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-amber-700 dark:text-amber-400">$1</strong>');
  safe = safe.replace(/__([^_]+)__/g, '<strong class="font-bold text-amber-700 dark:text-amber-400">$1</strong>');
  safe = safe.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  safe = safe.replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>');
  safe = safe.replace(/\r\n|\n/g, '<br>');
  return safe;
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
      if (googleUser.picture && (!appState.profile.avatar || appState.profile.avatar === '⚔️')) {
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
      if (googleUser.picture && (!appState.profile.avatar || appState.profile.avatar === '⚔️')) {
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
    title: 'Giao Việc & Trọng Tài AI',
    icon: '⚔️',
    tab: 'quests',
    getTarget: () => {
      const mobBtn = document.getElementById('btn-open-add-quest-mobile');
      if (window.innerWidth < 768 && mobBtn && mobBtn.offsetParent !== null) return mobBtn;
      return document.getElementById('btn-open-add-quest');
    },
    desc: 'Tạo việc cần làm (phím tắt Q). Trọng tài AI sẽ tự động định Rank (S/A/B/C/D), thưởng Vàng và EXP tương xứng với độ khó công việc.'
  },
  {
    id: 'focus-timer',
    title: 'Bấm Giờ Tập Trung (Pomodoro)',
    icon: '⏱️',
    tab: 'quests',
    getTarget: () => {
      const banner = document.getElementById('active-focus-banner');
      if (banner && !banner.classList.contains('hidden') && banner.offsetParent !== null) return banner;
      const questList = document.getElementById('quest-list');
      if (questList && questList.offsetParent !== null) return questList;
      return document.getElementById('tab-quests');
    },
    desc: 'Bấm "Bắt Đầu" trên việc bất kỳ để chạy đếm giờ Pomodoro. Kích hoạt Zen Mode toàn màn hình giúp tập trung tối đa và loại bỏ xao nhãng.'
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

  localStorage.setItem('levelup_tour_completed', 'true');

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
          showToast(`📸 Nhiệm vụ "${pendingProofQuest.title}" đã hoàn thành thời gian! Hãy bấm "Chụp Ảnh Nhận Vàng" để AI duyệt thưởng.`, 'info');
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
  const totalEarned = Math.max(0, parseInt(profile?.totalCoinsEarned, 10) || 0);
  const rawBase = level * 25 + streak * 5 + Math.floor(totalEarned * 0.1);
  const baseLimit = Math.min(400, rawBase);
  const rate = Math.min(0.80, Math.max(0.30, Number(autoDeductPercent) || 0.50));
  const kDeduct = 0.7 + ((rate - 0.30) / 0.50) * 0.8;
  return Math.floor(baseLimit * kDeduct);
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
  return appState.profile.bank;
}

async function loadBankState() {
  const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
  ensureUserBankProfile();

  let poolData = currentBankPool;
  let userBank = appState.profile.bank;
  let creditLimit = calculateLocalCreditLimit(appState.profile, userBank.loan?.autoDeductPercent || 0.50);

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
    }
  } catch (err) {
    console.warn('Không thể kết nối đến máy chủ Ngân Hàng, sử dụng dữ liệu cục bộ:', err);
  }

  renderBankUI(poolData, userBank, creditLimit);
  loadBankAiCommentary(poolData);
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
  const elUserDep = document.getElementById('bank-user-deposited');
  if (elUserDep) elUserDep.textContent = (userBank?.deposited || 0).toLocaleString('vi-VN');

  const elUserInt = document.getElementById('bank-user-interest');
  if (elUserInt) elUserInt.textContent = '+' + (userBank?.depositInterest || 0).toLocaleString('vi-VN');

  // 4. Quầy Vay Vàng (Borrower)
  const elBadge = document.getElementById('bank-credit-limit-badge');
  if (elBadge) elBadge.innerHTML = `Hạn mức: ${creditLimit} ${COIN_ICON_HTML}`;

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
  if (!elCommentary) return;

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
    fallback = `Kho Bạc Hệ Thống đang bảo lãnh ${pool.bailoutDebt} Vàng thanh khoản 100%! Hãy cày nhiệm vụ và gửi tiết kiệm ngay để nhận lãi suất cao ngất ngưởng ${(rates.depositRate * 100).toFixed(1)}%/ngày!`;
  } else if (rates.utilization > 0.6) {
    fallback = `Bể Vàng đang sôi động! Lãi suất gửi tiết kiệm đang ở mức cao ${(rates.depositRate * 100).toFixed(1)}%/ngày. Cơ hội vàng cho các hiệp sĩ chăm chỉ tích lũy tài sản!`;
  } else {
    fallback = `Bể thanh khoản dồi dào Vàng nhàn rỗi! Lãi suất vay ưu đãi chỉ ${(rates.borrowRate * 100).toFixed(1)}%/ngày. Hãy tạm ứng Vàng nếu bạn cần đổi quà thư giãn ngay hôm nay!`;
  }
  bankCommentaryCache = { text: fallback, timestamp: Date.now() };
  elCommentary.textContent = fallback;
}

function setDepositAmount(amount) {
  const input = document.getElementById('input-deposit-amount');
  if (input) input.value = amount;
}

function setDepositMax() {
  const input = document.getElementById('input-deposit-amount');
  if (input) input.value = Math.max(0, appState.profile?.coins || 0);
}

async function executeBankDeposit() {
  const input = document.getElementById('input-deposit-amount');
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
    appState.profile.coins -= amount;
    appState.profile.bank.deposited = (appState.profile.bank.deposited || 0) + amount;
    appState.profile.bank.lastDepositAt = Date.now();
    currentBankPool.poolGold = (currentBankPool.poolGold || 500) + amount;
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
}

async function executeBankWithdraw() {
  ensureUserBankProfile();
  const bank = appState.profile.bank;
  const deposited = bank.deposited || 0;
  const interest = bank.depositInterest || 0;
  const totalAvailable = deposited + interest;

  if (totalAvailable <= 0) {
    showToast('Bạn không có Vàng gửi hoặc tiền lãi để rút!', 'info');
    return;
  }

  const ok = await confirmAction({
    title: 'Rút Tiết Kiệm Về Ví?',
    message: `Rút toàn bộ ${totalAvailable} Vàng (${deposited} Vàng gốc + ${interest} Vàng lãi) về ví?`,
    detail: `💰 Số dư ví sẽ tăng từ ${appState.profile.coins} ➔ ${appState.profile.coins + totalAvailable} Vàng.`,
    confirmText: 'Rút Toàn Bộ 📤',
    cancelText: 'Giữ Lại Sinh Lời',
    icon: '📤',
    btnColor: 'emerald'
  });
  if (!ok) return;

  const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
  let serverSuccess = false;

  if (token) {
    try {
      const res = await fetch('/api/sync?action=bank_withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: 'all' })
      });
      if (res.ok) {
        const data = await res.json();
        appState.profile.coins = data.coins;
        appState.profile.bank = data.userBank;
        currentBankPool = data.pool;
        serverSuccess = true;
        showToast(data.message || `Đã rút thành công ${totalAvailable} Vàng!`, 'gold');
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
    if (currentBankPool.poolGold < totalAvailable) {
      bailoutInjected = totalAvailable - currentBankPool.poolGold;
      currentBankPool.bailoutDebt = (currentBankPool.bailoutDebt || 0) + bailoutInjected;
      currentBankPool.poolGold += bailoutInjected;
    }
    currentBankPool.poolGold = Math.max(0, currentBankPool.poolGold - totalAvailable);
    currentBankPool.totalDeposited = Math.max(0, (currentBankPool.totalDeposited || 0) - deposited);

    appState.profile.coins += totalAvailable;
    appState.profile.totalCoinsEarned += interest;
    bank.deposited = 0;
    bank.depositInterest = 0;
    bank.lastDepositAt = Date.now();

    const bailoutNotice = bailoutInjected > 0 ? ` (Bảo lãnh 100% từ Kho Bạc Hệ Thống: Cứu trợ ${bailoutInjected} Vàng)` : '';
    addLedgerEntry({
      id: 'bank_wit_' + Date.now(),
      type: 'earn',
      category: 'bank_withdraw',
      amount: totalAvailable,
      title: 'Rút tiền gửi Ngân Hàng',
      description: `🏦 Đã rút ${totalAvailable} Vàng (${deposited} gốc + ${interest} lãi) từ Ngân Hàng.${bailoutNotice}`,
      timestamp: Date.now()
    });
    showToast(`Đã rút thành công ${totalAvailable} Vàng!${bailoutInjected > 0 ? ' Kho Bạc đã bảo lãnh 100% thanh khoản!' : ''}`, 'gold');
  }

  sfx.playCoin();
  triggerSave(true);
  renderHeader();
  renderLedger();
  loadBankState();
}

function onDeductPercentChange(val) {
  const numVal = parseInt(val, 10) || 50;
  const label = document.getElementById('deduct-percent-label');
  if (label) label.textContent = `${numVal}%`;

  const finalLimit = calculateLocalCreditLimit(appState.profile, numVal / 100);
  const badge = document.getElementById('bank-credit-limit-badge');
  if (badge) badge.innerHTML = `Hạn mức: ${finalLimit} ${COIN_ICON_HTML}`;

  const appraisal = document.getElementById('bank-appraisal-box');
  if (appraisal) {
    if (numVal >= 70) {
      appraisal.innerHTML = `🔥 <strong>Tuyệt vời!</strong> Bạn cam kết trích ${numVal}% tiền thưởng nhiệm vụ để tất toán nhanh. AI cấp cho bạn hạn mức cao nhất (${finalLimit} Vàng)!`;
    } else if (numVal <= 40) {
      appraisal.innerHTML = `🌿 Trích nhẹ nhàng ${numVal}% tiền thưởng giúp bạn thong thả làm việc. Hạn mức khả dụng là ${finalLimit} Vàng.`;
    } else {
      appraisal.innerHTML = `💡 <em>Tỷ lệ ${numVal}% cân bằng lý tưởng giữa việc trả nợ và giữ lại Vàng tiêu xài cho các nhiệm vụ tiếp theo! Hạn mức: ${finalLimit} ${COIN_ICON_HTML}</em>`;
    }
  }
}

async function executeBankBorrow() {
  ensureUserBankProfile();
  const bank = appState.profile.bank;
  if (bank.loan && (bank.loan.debt || 0) > 0) {
    showToast('Bạn đang có khoản vay chưa thanh toán! Vui lòng tất toán trước khi vay thêm.', 'error');
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

  const maxLimit = calculateLocalCreditLimit(appState.profile, autoDeduct);
  if (borrowAmt > maxLimit) {
    showToast(`Số Vàng vay (${borrowAmt}) vượt quá hạn mức tối đa (${maxLimit}) của bạn!`, 'error');
    return;
  }

  const ok = await confirmAction({
    title: 'Xác Nhận Vay Vàng Tức Thời?',
    message: `Vay ${borrowAmt} Vàng từ Ngân Hàng Hệ Thống?`,
    detail: `⚡ Nhận ngay: +${borrowAmt} Vàng vào ví\n✂️ Tự động trích: ${deductPct}% Vàng thưởng mỗi khi hoàn thành nhiệm vụ\n⏱️ Thời hạn: 7 ngày (sau 7 ngày sẽ tạm khóa Cửa Hàng để thu hồi nợ)`,
    confirmText: 'Vay Ngay ⚡',
    cancelText: 'Hủy',
    icon: '⚡',
    btnColor: 'blue'
  });
  if (!ok) return;

  const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
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
          autoDeductPercent: autoDeduct
        })
      });
      if (res.ok) {
        const data = await res.json();
        appState.profile.coins = data.coins;
        appState.profile.bank.loan = data.loan;
        appState.profile.bank.isFrozen = false;
        currentBankPool = data.pool;
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
      borrowRate: rates.borrowRate,
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
      description: `🏦 Đã vay ${borrowAmt} Vàng (Lãi suất: ${(rates.borrowRate * 100).toFixed(1)}%/ngày, trích nợ: ${deductPct}% mỗi nhiệm vụ).`,
      timestamp: Date.now()
    });
    showToast(`Giải ngân thành công ${borrowAmt} Vàng!`, 'success');
  }

  sfx.playFanfare();
  if (inputAmount) inputAmount.value = '';
  triggerSave(true);
  renderHeader();
  renderLedger();
  loadBankState();
}

async function executeBankRepay() {
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

  const payAmt = Math.min(userCoins, currentDebt);
  const ok = await confirmAction({
    title: 'Trả Nợ Sớm?',
    message: `Dùng ${payAmt} Vàng trong ví để trả bớt khoản nợ ${currentDebt} Vàng?`,
    detail: `💰 Vàng trong ví: ${userCoins} ➔ ${userCoins - payAmt}\n📉 Nợ còn lại: ${currentDebt - payAmt} Vàng.`,
    confirmText: 'Trả Nợ 💳',
    cancelText: 'Hủy',
    icon: '💳',
    btnColor: 'amber'
  });
  if (!ok) return;

  const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
  let serverSuccess = false;

  if (token) {
    try {
      const res = await fetch('/api/sync?action=bank_repay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: payAmt })
      });
      if (res.ok) {
        const data = await res.json();
        appState.profile.coins = data.coins;
        appState.profile.bank.loan = data.loan;
        if (data.loanCleared) {
          appState.profile.bank.loan = null;
          appState.profile.bank.isFrozen = false;
          if (appState.profile.title === 'Con Nợ Quá Hạn ⚠️') {
            updateTitleByLevel();
          }
        }
        currentBankPool = data.pool;
        serverSuccess = true;
        showToast(data.message || `Đã trả ${payAmt} Vàng!`, 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Trả nợ thất bại trên máy chủ!', 'error');
        return;
      }
    } catch (e) {
      console.warn('Lỗi kết nối khi trả nợ, thực hiện lưu cục bộ:', e);
    }
  }

  if (!serverSuccess) {
    appState.profile.coins -= payAmt;
    loan.debt -= payAmt;
    loan.principal = Math.max(0, (loan.principal || 0) - Math.min(loan.principal || 0, payAmt));
    currentBankPool.poolGold += payAmt;
    currentBankPool.totalBorrowed = Math.max(0, (currentBankPool.totalBorrowed || 0) - payAmt);

    // Hoàn nợ kho bạc nếu có
    if (currentBankPool.bailoutDebt > 0) {
      const treasuryRepay = Math.min(currentBankPool.bailoutDebt, Math.floor(payAmt * 0.5));
      currentBankPool.bailoutDebt -= treasuryRepay;
      currentBankPool.reserveFund = (currentBankPool.reserveFund || 0) + (payAmt - treasuryRepay);
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
      amount: payAmt,
      title: 'Trả nợ sớm Ngân Hàng',
      description: `🏦 Đã trả ${payAmt} Vàng.${loanCleared ? ' Khoản nợ đã được tất toán!' : ` Nợ còn lại: ${loan.debt} Vàng.`}`,
      timestamp: Date.now()
    });
    showToast(`Đã trả thành công ${payAmt} Vàng!${loanCleared ? ' Chúc mừng bạn đã tất toán toàn bộ nợ!' : ''}`, 'success');
  }

  sfx.playCoin();
  triggerSave(true);
  renderHeader();
  renderLedger();
  loadBankState();
}

window.loadBankState = loadBankState;
window.renderAdminBankTelemetry = renderAdminBankTelemetry;
window.setDepositAmount = setDepositAmount;
window.setDepositMax = setDepositMax;
window.executeBankDeposit = executeBankDeposit;
window.executeBankWithdraw = executeBankWithdraw;
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
          if (event.data.action === 'cancel') {
            clearFocusTimerSession(false);
          } else if (event.data.action === 'pause' && isFocusRunning) {
            isFocusRunning = false;
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
            releaseWakeLock();
          }
          if (appState.profile?.googleId && appState.profile?.nickname) {
            hydrateFromCloud(false);
          }
        } else if (event.data?.type === 'ADMIN_SYNC_UPDATE') {
          if (appState.profile?.googleId && appState.profile?.nickname) {
            hydrateFromCloud(false);
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
      hydrateFromCloud(false);
    }
  }, 2500);

  // Navigation Tab buttons (Desktop & Mobile)
  document.querySelectorAll('.nav-tab, .mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.playClick();
      switchTab(btn.dataset.tab);
    });
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

  // Quest filters
  document.querySelectorAll('.quest-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quest-filter').forEach(b => {
        b.className = 'quest-filter px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium';
      });
      btn.className = 'quest-filter active px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold';
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

  // Pomodoro Banner & Focus Station controls
  const btnTimerToggle = document.getElementById('btn-timer-toggle');
  if (btnTimerToggle) btnTimerToggle.addEventListener('click', toggleFocusTimer);

  const btnTimerReset = document.getElementById('btn-timer-reset');
  if (btnTimerReset) btnTimerReset.addEventListener('click', resetFocusTimer);

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

  // Fullscreen Zen Mode controls
  const btnZen = document.getElementById('btn-timer-zen');
  if (btnZen) btnZen.addEventListener('click', () => toggleZenMode(true));

  const btnZenExit = document.getElementById('btn-zen-exit');
  if (btnZenExit) btnZenExit.addEventListener('click', () => toggleZenMode(false));

  const btnZenToggle = document.getElementById('btn-zen-toggle');
  if (btnZenToggle) btnZenToggle.addEventListener('click', toggleFocusTimer);

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
        clearFocusTimerSession();
      } else {
        try {
          const syncState = JSON.parse(e.newValue);
          if (syncState) {
            isFocusRunning = !!syncState.isRunning;
            focusRemainingSeconds = Math.max(0, syncState.remainingSeconds || 0);
            focusTotalSeconds = syncState.totalSeconds || focusTotalSeconds;
            updateTimerDisplay();
            renderFocusStationUI();
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
    const repeatOnceRadio = document.querySelector('input[name="quest-repeat"][value="once"]');
    if (repeatOnceRadio) repeatOnceRadio.checked = true;
    const modNotice = document.getElementById('verdict-modified-notice');
    if (modNotice) modNotice.classList.add('hidden');
    openModal('modal-quest');
  };
  window.openQuestModal = openQuestHandler;
  window.openQuestRenegotiateModal = openQuestRenegotiateModal;
  const desktopAddQuestBtn = document.getElementById('btn-open-add-quest');
  if (desktopAddQuestBtn) desktopAddQuestBtn.addEventListener('click', openQuestHandler);
  const mobileAddQuestBtn = document.getElementById('btn-open-add-quest-mobile');
  if (mobileAddQuestBtn) mobileAddQuestBtn.addEventListener('click', openQuestHandler);

  document.getElementById('btn-submit-to-ai').addEventListener('click', submitQuestToAI);
  document.getElementById('btn-accept-verdict').addEventListener('click', acceptVerdictAndCreateQuest);

  const verdictRepeatToggle = document.getElementById('verdict-repeat-toggle');
  if (verdictRepeatToggle) {
    verdictRepeatToggle.addEventListener('click', () => {
      if (!currentPendingVerdict) return;
      currentPendingVerdict.isRepeatable = !currentPendingVerdict.isRepeatable;
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
      sfx.playClick();
      inputProofFile.click();
    });
  }

  if (inputProofFile) {
    inputProofFile.addEventListener('change', async (e) => {
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

    openModal('modal-reward');
  };
  window.openRewardModal = openRewardHandler;
  window.openRewardRenegotiateModal = openRewardRenegotiateModal;
  const navAddRewardBtn = document.getElementById('btn-open-add-reward-nav');
  if (navAddRewardBtn) navAddRewardBtn.addEventListener('click', openRewardHandler);
  const mobileAddRewardBtn = document.getElementById('btn-open-add-reward-mobile');
  if (mobileAddRewardBtn) mobileAddRewardBtn.addEventListener('click', openRewardHandler);

  // Power User Keyboard Shortcuts: [Q] to Add Quest, [R] to Add Reward
  document.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement?.tagName;
    const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || document.activeElement?.isContentEditable;
    const isModalOpen = Boolean(document.querySelector('.fixed.inset-0:not(.hidden)'));
    if (isEditing || isModalOpen || e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      openQuestHandler();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      openRewardHandler();
    }
  });

  document.getElementById('btn-eval-reward').addEventListener('click', evaluateRewardItem);
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
        modal.classList.add('hidden');
      }
    });
  });

  // Chặn đóng modal khi click ra ngoài backdrop; rung nhẹ viền panel báo hiệu chỉ tắt khi nhấn dấu x
  document.querySelectorAll('.fixed').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal.id === 'tour-overlay') return;
        if (modal.id === 'modal-welcome') {
          showToast('Vui lòng đăng nhập bằng Google để tiếp tục!', 'info');
        }
        const panel = modal.querySelector('.rpg-panel');
        if (panel) {
          panel.classList.add('ring-4', 'ring-amber-500/60');
          setTimeout(() => panel.classList.remove('ring-4', 'ring-amber-500/60'), 400);
        }
      }
    });
  });

  // Chặn phím Escape đóng các modal - chỉ khi nhấn dấu x mới cho tắt
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
        const panel = openModal.querySelector('.rpg-panel');
        if (panel) {
          panel.classList.add('ring-4', 'ring-amber-500/60');
          setTimeout(() => panel.classList.remove('ring-4', 'ring-amber-500/60'), 400);
        }
      }
    }
  });
});
