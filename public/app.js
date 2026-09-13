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
    hasOnboarded: false
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
      amount: 20,
      description: 'Thưởng chào mừng gia nhập LevelUp',
      timestamp: Date.now()
    }
  ],
  lastSyncedAt: 0
};

// =============================================================================
// 3. STORAGE, THEME & SYNC MANAGER
// =============================================================================
const STORAGE_KEY = 'levelup_state_v1';
let appState = { ...DEFAULT_STATE };
let syncTimeout = null;

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
  if (appState.profile.token && typeof appState.profile.token === 'string' && appState.profile.token.length >= 16) {
    return appState.profile.token;
  }
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  appState.profile.token = token;
  saveLocalState();
  return token;
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

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      appState = {
        ...DEFAULT_STATE,
        ...parsed,
        profile: { ...DEFAULT_STATE.profile, ...(parsed.profile || {}) }
      };
    }
  } catch (e) {
    console.error('Failed to parse localStorage:', e);
  }
  appState = normalizeObjectNFC(appState);
  getOrCreateUserToken();
  // Initialize theme
  const initialTheme = appState.profile.theme || 'dark';
  applyTheme(initialTheme);
}

function saveLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

async function syncWithCloud(isManual = false) {
  const syncDot = document.getElementById('sync-indicator');
  const modalSyncState = document.getElementById('modal-sync-state');
  const modalSyncTime = document.getElementById('modal-sync-time');

  if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
  if (modalSyncState) modalSyncState.textContent = 'Đang đồng bộ...';

  const nick = appState.profile.nickname;
  if (!nick) return;
  const token = getOrCreateUserToken();

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        nickname: nick,
        oldNickname: appState.pendingOldNickname,
        token: token,
        state: appState
      })
    });

    if (res.ok) {
      const data = await res.json();
      delete appState.pendingOldNickname;
      if (data.role) appState.profile.role = data.role;
      appState.lastSyncedAt = data.syncedAt || Date.now();
      saveLocalState();

      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (modalSyncState) modalSyncState.textContent = 'Đã lưu trên Cloud';
      if (modalSyncTime) modalSyncTime.textContent = new Date(appState.lastSyncedAt).toLocaleTimeString();
      if (isManual) showToast('Đồng bộ Cloud thành công!', 'success');
    } else {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 409 || res.status === 403) {
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

function triggerSave(needsCloud = true) {
  saveLocalState();
  renderAll();

  if (needsCloud) {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      syncWithCloud(false);
    }, 600);
  }
}

async function loadFromCloud(nickname, tokenOverride = null) {
  try {
    showToast('Đang tải dữ liệu từ Cloud...', 'info');
    const token = tokenOverride || getOrCreateUserToken();
    const res = await fetch(`/api/sync?nickname=${encodeURIComponent(nickname)}&token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể tải hồ sơ');
    }
    const result = await res.json();
    if (result.found && result.isOwner && result.data) {
      appState = normalizeObjectNFC({
        ...DEFAULT_STATE,
        ...result.data,
        profile: {
          ...DEFAULT_STATE.profile,
          ...(result.data.profile || {}),
          token // retain device token
        }
      });
      saveLocalState();
      applyTheme(appState.profile.theme || 'dark');
      renderAll();
      showToast(`Đã tải hồ sơ "${nickname}" từ Cloud!`, 'success');
    } else if (result.found && !result.isOwner) {
      showToast('Bạn không sở hữu tài khoản này! Cần nhập đúng Mã Token để tải dữ liệu.', 'error');
    } else {
      showToast(`Không tìm thấy hồ sơ cũ, bắt đầu mới với "${nickname}"`, 'info');
      triggerSave(true);
    }
  } catch (e) {
    showToast('Lỗi khi tải từ Cloud: ' + e.message, 'error');
  }
}

async function switchAccountByToken(token) {
  const cleanToken = (token || '').trim();
  if (!cleanToken || cleanToken.length < 8) {
    showToast('Mã Token không hợp lệ!', 'error');
    return { success: false, error: 'Mã Token không hợp lệ' };
  }

  showToast('Đang nhận diện Token và chuyển tài khoản...', 'info');

  try {
    const res = await fetch(`/api/sync?action=find_by_token&token=${encodeURIComponent(cleanToken)}`);
    const resData = await res.json().catch(() => ({}));
    if (!res.ok || !resData.found) {
      const errMsg = resData.error || 'Không tìm thấy tài khoản tương ứng với Token này.';
      showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    }

    // Dọn dẹp phiên tập trung của tài khoản cũ trước khi chuyển
    clearFocusTimerSession();

    // Cập nhật toàn bộ dữ liệu người dùng (giữ nguyên tên hiển thị gốc nếu có)
    const displayNickname = resData.data?.profile?.nickname || resData.nickname;
    appState = normalizeObjectNFC({
      ...DEFAULT_STATE,
      ...resData.data,
      profile: {
        ...DEFAULT_STATE.profile,
        ...(resData.data.profile || {}),
        nickname: displayNickname,
        role: resData.role || 'adventurer',
        token: cleanToken,
        hasOnboarded: true
      }
    });
    localStorage.setItem('levelup_onboarded', 'true');
    saveLocalState();
    applyTheme(appState.profile.theme || 'dark');
    renderAll();

    closeModal('modal-welcome');
    closeModal('modal-profile');
    showToast(`Đã tự động chuyển sang tài khoản "${displayNickname}"!`, 'success');
    return { success: true, nickname: displayNickname };
  } catch (err) {
    showToast('Lỗi khi chuyển tài khoản: ' + err.message, 'error');
    return { success: false, error: err.message };
  }
}

// =============================================================================
// 4. TOAST NOTIFICATIONS & RPG HELPERS
// =============================================================================
function showToast(message, type = 'info') {
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
    gold: '🪙',
    error: '❌',
    info: '📜'
  };

  toast.className = `p-3 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md pointer-events-auto transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
  toast.innerHTML = `<span>${icons[type] || '📜'}</span><span>${message}</span>`;
  container.appendChild(toast);

  // Trigger anim
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
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
  const expNeeded = appState.profile.level * 100;
  if (appState.profile.exp >= expNeeded) {
    appState.profile.exp -= expNeeded;
    appState.profile.level += 1;
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
let focusTimerInterval = null;
let focusRemainingSeconds = 0;
let focusTotalSeconds = 0;
let isFocusRunning = false;
let isBreakMode = false;
let lastTickTime = Date.now();
let wakeLock = null;
let lastFormattedTitle = '';
let actualFocusedSeconds = 0;

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

// LocalStorage State Persistence
function saveFocusTimerState() {
  if (!activeFocusQuest && !isBreakMode) {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    return;
  }
  const state = {
    questId: activeFocusQuest ? activeFocusQuest.id : null,
    questTitle: activeFocusQuest ? activeFocusQuest.title : null,
    questRank: activeFocusQuest ? activeFocusQuest.rank : null,
    rewardCoins: activeFocusQuest ? activeFocusQuest.rewardCoins : 0,
    targetMinutes: activeFocusQuest ? activeFocusQuest.targetMinutes : 0,
    remainingSeconds: focusRemainingSeconds,
    totalSeconds: focusTotalSeconds,
    actualFocusedSeconds: actualFocusedSeconds,
    isRunning: isFocusRunning,
    isBreakMode: isBreakMode,
    lastTickTime: Date.now()
  };
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
}

function restoreFocusTimer() {
  const raw = localStorage.getItem(TIMER_STORAGE_KEY);
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    if (!state) return;

    if (state.isBreakMode) {
      isBreakMode = true;
      activeFocusQuest = null;
    } else if (state.questId) {
      const quest = appState.quests?.find(q => q.id === state.questId);
      if (!quest || quest.status === 'completed') {
        localStorage.removeItem(TIMER_STORAGE_KEY);
        return;
      }
      activeFocusQuest = quest;
      isBreakMode = false;
    } else {
      localStorage.removeItem(TIMER_STORAGE_KEY);
      return;
    }

    focusTotalSeconds = state.totalSeconds || (activeFocusQuest?.targetMinutes || 25) * 60;
    actualFocusedSeconds = state.actualFocusedSeconds || 0;
    isFocusRunning = !!state.isRunning;

    if (isFocusRunning) {
      const elapsed = Math.max(0, (Date.now() - (state.lastTickTime || Date.now())) / 1000);
      if (!isBreakMode) {
        actualFocusedSeconds += elapsed;
      }
      focusRemainingSeconds = Math.max(0, (state.remainingSeconds || 0) - elapsed);

      if (focusRemainingSeconds <= 0) {
        updateTimerDisplay();
        if (isBreakMode) {
          breakTimerFinished();
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
      focusRemainingSeconds = Math.max(0, state.remainingSeconds || 0);
    }

    renderFocusStationUI();
    updateTimerDisplay();
  } catch (e) {
    console.error('Failed to restore focus timer:', e);
    localStorage.removeItem(TIMER_STORAGE_KEY);
  }
}

// Delta-Time Tick Engine
function tickFocusTimer() {
  if (!isFocusRunning) return;
  const now = Date.now();
  const deltaSec = Math.max(0, (now - lastTickTime) / 1000);
  lastTickTime = now;

  if (focusRemainingSeconds > 0) {
    if (!isBreakMode) {
      actualFocusedSeconds += deltaSec;
    }
    focusRemainingSeconds = Math.max(0, focusRemainingSeconds - deltaSec);
    updateTimerDisplay();
    saveFocusTimerState();

    if (focusRemainingSeconds <= 0) {
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
      releaseWakeLock();
      if (isBreakMode) {
        breakTimerFinished();
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
    statusIcon.textContent = isBreakMode ? 'BREAK' : (isFocusRunning ? 'RUN' : 'PAUSE');
  }

  // Circular progress ring (r=20, circumference = 2 * PI * 20 ≈ 125.66)
  const ratio = focusTotalSeconds > 0 ? Math.max(0, Math.min(1, focusRemainingSeconds / focusTotalSeconds)) : 0;
  const ring = document.getElementById('focus-progress-ring');
  if (ring) {
    ring.style.strokeDashoffset = String(125.66 * (1 - ratio));
    if (isBreakMode) {
      ring.classList.remove('text-amber-500');
      ring.classList.add('text-emerald-500');
    } else {
      ring.classList.remove('text-emerald-500');
      ring.classList.add('text-amber-500');
    }
  }

  // Zen progress ring (r=105, circumference = 2 * PI * 105 ≈ 659.73)
  const zenRing = document.getElementById('zen-progress-ring');
  if (zenRing) {
    zenRing.style.strokeDashoffset = String(659.73 * (1 - ratio));
    zenRing.setAttribute('stroke', isBreakMode ? '#10b981' : '#f59e0b');
  }

  // Dynamic Browser Tab Title
  const titlePrefix = isBreakMode ? '☕' : (isFocusRunning ? '▶' : '⏸');
  const questName = activeFocusQuest ? activeFocusQuest.title : (isBreakMode ? 'Nghỉ giải lao' : 'Tập trung');
  const newTitle = `${titlePrefix} (${timeStr}) ${questName} | LevelUp`;
  if (newTitle !== lastFormattedTitle) {
    lastFormattedTitle = newTitle;
    document.title = newTitle;
  }
}

function renderFocusStationUI() {
  const station = document.getElementById('active-focus-banner');
  if (!station) return;

  if (!activeFocusQuest && !isBreakMode) {
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

  const toggleText = isFocusRunning ? 'Tạm Dừng' : 'Tiếp Tục';
  if (toggleBtn) toggleBtn.textContent = toggleText;
  if (zenToggleBtn) zenToggleBtn.textContent = toggleText;
}

function startFocusTimer(quest) {
  if (activeFocusQuest && activeFocusQuest.id !== quest.id) {
    if (!confirm('Bạn đang có một nhiệm vụ tập trung khác đang chạy. Bạn có muốn hủy nó để bắt đầu nhiệm vụ này?')) {
      return;
    }
  }

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  activeFocusQuest = quest;
  isBreakMode = false;
  focusTotalSeconds = (quest.targetMinutes || 25) * 60;
  focusRemainingSeconds = focusTotalSeconds;
  actualFocusedSeconds = 0;
  isFocusRunning = true;
  lastTickTime = Date.now();

  renderFocusStationUI();
  updateTimerDisplay();
  saveFocusTimerState();
  requestWakeLock();

  clearInterval(focusTimerInterval);
  focusTimerInterval = setInterval(tickFocusTimer, 500);

  sfx.playGong();
  showToast(`Bắt đầu đồng hồ tập trung: ${quest.targetMinutes} phút! Chúc bạn tập trung cao độ.`, 'info');
}

function startBreakTimer(breakMinutes = 5) {
  isBreakMode = true;
  activeFocusQuest = null;
  focusTotalSeconds = breakMinutes * 60;
  focusRemainingSeconds = focusTotalSeconds;
  isFocusRunning = true;
  lastTickTime = Date.now();

  renderFocusStationUI();
  updateTimerDisplay();
  saveFocusTimerState();
  requestWakeLock();

  clearInterval(focusTimerInterval);
  focusTimerInterval = setInterval(tickFocusTimer, 500);

  sfx.playClick();
  showToast(`Bắt đầu nghỉ giải lao ${breakMinutes} phút! Hãy vươn vai và uống nước nhé.`, 'info');
}

function toggleFocusTimer() {
  isFocusRunning = !isFocusRunning;
  lastTickTime = Date.now();

  const toggleBtn = document.getElementById('btn-timer-toggle');
  const zenToggleBtn = document.getElementById('btn-zen-toggle');
  const toggleText = isFocusRunning ? 'Tạm Dừng' : 'Tiếp Tục';
  if (toggleBtn) toggleBtn.textContent = toggleText;
  if (zenToggleBtn) zenToggleBtn.textContent = toggleText;

  if (isFocusRunning) {
    requestWakeLock();
    if (!focusTimerInterval) {
      focusTimerInterval = setInterval(tickFocusTimer, 500);
    }
    sfx.playClick();
  } else {
    releaseWakeLock();
    sfx.playClick();
  }

  updateTimerDisplay();
  saveFocusTimerState();
}

function resetFocusTimer() {
  const msg = isBreakMode
    ? 'Bạn có chắc muốn kết thúc sớm giờ nghỉ giải lao?'
    : 'Bạn có chắc muốn dừng phiên tập trung này? Thời gian đã đếm sẽ không được tính.';
  if (confirm(msg)) {
    clearFocusTimerSession();
    showToast('Đã dừng phiên tập trung.', 'info');
  }
}

function clearFocusTimerSession() {
  clearInterval(focusTimerInterval);
  focusTimerInterval = null;
  releaseWakeLock();
  activeFocusQuest = null;
  isFocusRunning = false;
  isBreakMode = false;
  focusRemainingSeconds = 0;
  focusTotalSeconds = 0;
  actualFocusedSeconds = 0;
  localStorage.removeItem(TIMER_STORAGE_KEY);
  document.title = 'LevelUp — Biến Công Việc & Thói Quen Thành Trò Chơi';

  const banner = document.getElementById('active-focus-banner');
  if (banner) banner.classList.add('hidden');

  const zenOverlay = document.getElementById('focus-zen-overlay');
  if (zenOverlay) zenOverlay.classList.add('hidden');
}

function adjustTimer(deltaSec) {
  if (!activeFocusQuest && !isBreakMode) return;

  // Anti-Cheat: Chặn hành vi giảm thời gian đối với nhiệm vụ tập trung do AI định giá
  if (activeFocusQuest && deltaSec < 0) {
    showToast('Nhiệm vụ tập trung yêu cầu hoàn thành đủ thời gian do AI phê duyệt, không thể giảm giờ!', 'error');
    sfx.playClick();
    return;
  }

  focusRemainingSeconds = Math.max(0, focusRemainingSeconds + deltaSec);
  if (deltaSec > 0 && focusRemainingSeconds > focusTotalSeconds) {
    focusTotalSeconds = focusRemainingSeconds;
  }
  updateTimerDisplay();
  saveFocusTimerState();
  sfx.playClick();
  const sign = deltaSec > 0 ? `+${deltaSec / 60}p` : `${deltaSec / 60}p`;
  showToast(`Đã chỉnh thời gian: ${sign}`, 'info');
}

function openEditTimerModal() {
  if (!activeFocusQuest && !isBreakMode) return;
  const minInput = document.getElementById('input-edit-minutes');
  const secInput = document.getElementById('input-edit-seconds');
  if (minInput && secInput) {
    const totalSecs = Math.round(focusRemainingSeconds);
    minInput.value = Math.floor(totalSecs / 60);
    secInput.value = totalSecs % 60;
    minInput.min = activeFocusQuest ? (activeFocusQuest.targetMinutes || 1) : 1;
  }
  openModal('modal-edit-focus-timer');
}

function saveEditTimer(mins, secs) {
  const total = Math.max(1, mins * 60 + secs);

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
  saveFocusTimerState();
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

    completeQuest(quest.id);
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
// 6. QUEST INTERACTIONS (Complete, Add, Delete)
// =============================================================================
function completeQuest(questId) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest || quest.status === 'completed') return;

  quest.status = 'completed';
  quest.completedAt = Date.now();

  appState.profile.coins += quest.rewardCoins;
  appState.profile.totalCoinsEarned += quest.rewardCoins;
  addEXP(quest.rewardCoins * 3);

  appState.ledger.unshift({
    id: 'led_' + Date.now(),
    type: 'earn',
    amount: quest.rewardCoins,
    description: `Hoàn thành [Hạng ${quest.rank}] ${quest.title}`,
    timestamp: Date.now()
  });

  sfx.playCoin();
  showToast(`+${quest.rewardCoins} VÀNG! Hoàn thành xuất sắc: "${quest.title}"`, 'gold');
  triggerSave(true);
}

function deleteQuest(questId) {
  if (!confirm('Bạn có chắc muốn xóa nhiệm vụ này?')) return;
  if (activeFocusQuest && activeFocusQuest.id === questId) {
    clearFocusTimerSession();
  }
  appState.quests = appState.quests.filter(q => q.id !== questId);
  triggerSave(true);
  showToast('Đã xóa nhiệm vụ.', 'info');
}

// =============================================================================
// 7. SHOP & INVENTORY INTERACTIONS
// =============================================================================
function buyShopItem(itemId) {
  const item = appState.shopItems.find(i => i.id === itemId);
  if (!item) return;

  if (appState.profile.coins < item.price) {
    showToast(`Chưa đủ vàng! Bạn cần thêm ${item.price - appState.profile.coins} Vàng nữa. Hãy hoàn thành thêm nhiệm vụ nhé!`, 'error');
    return;
  }

  if (!confirm(`Bạn có chắc muốn dùng ${item.price} Vàng để đổi phần thưởng "${item.name}"?`)) return;

  appState.profile.coins -= item.price;

  appState.inventory.unshift({
    id: 'inv_' + Date.now(),
    shopItemId: item.id,
    name: item.name,
    price: item.price,
    tier: item.tier,
    icon: item.icon,
    purchasedAt: Date.now(),
    isUsed: false
  });

  appState.ledger.unshift({
    id: 'led_' + Date.now(),
    type: 'spend',
    amount: item.price,
    description: `Đổi quà: ${item.name}`,
    timestamp: Date.now()
  });

  sfx.playFanfare();
  showToast(`Đổi quà thành công! "${item.name}" đã được chuyển vào Kho Quà.`, 'success');
  triggerSave(true);
  switchRewardSubtab('inventory');
}

function useInventoryItem(invId) {
  const item = appState.inventory.find(i => i.id === invId);
  if (!item || item.isUsed) return;

  if (confirm(`Bạn muốn sử dụng phần thưởng "${item.name}" bây giờ? Hãy tự thưởng cho bản thân thật vui vẻ nhé!`)) {
    item.isUsed = true;
    item.usedAt = Date.now();
    sfx.playClick();
    showToast(`Đã dùng phần thưởng "${item.name}". Chúc bạn có thời gian thư giãn tuyệt vời!`, 'success');
    triggerSave(true);
  }
}

// =============================================================================
// 8. STRICT AI ARBITER EVALUATION & DEBATE
// =============================================================================
let currentPendingVerdict = null;
let currentDebateHistory = [];

async function submitQuestToAI() {
  const title = document.getElementById('input-quest-title').value.trim();
  const desc = document.getElementById('input-quest-desc').value.trim();
  const estimate = parseInt(document.getElementById('input-quest-estimate').value, 10) || 0;

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
      headers: { 'Content-Type': 'application/json' },
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
      targetMinutes: data.targetMinutes || 25,
      rank: data.rank || calculateRank(data.rewardCoins || 10),
      verdict: data.verdict || 'Nhiệm vụ hợp lý, đã được tính mức thưởng chuẩn.',
      advice: data.advice || 'Tập trung hoàn thành từng bước một.'
    };
    currentDebateHistory = [];

    renderVerdictStep();
  } catch (err) {
    showToast('Không thể kết nối với AI: ' + err.message, 'error');
    document.getElementById('quest-evaluating-step').classList.add('hidden');
    document.getElementById('quest-form-step').classList.remove('hidden');
  }
}

function renderVerdictStep() {
  document.getElementById('quest-evaluating-step').classList.add('hidden');
  document.getElementById('quest-verdict-step').classList.remove('hidden');

  const rankBadge = document.getElementById('verdict-rank');
  rankBadge.textContent = `HẠNG ${currentPendingVerdict.rank}`;
  rankBadge.className = `rank-badge-${currentPendingVerdict.rank} text-xs font-mono font-black px-2.5 py-1 rounded-lg`;

  const typeBadge = document.getElementById('verdict-type-badge');
  const timeBox = document.getElementById('verdict-target-time-box');
  const minutesEl = document.getElementById('verdict-minutes');
  const lockedTimeBox = document.getElementById('verdict-locked-time-box');

  if (currentPendingVerdict.type === 'focus') {
    typeBadge.textContent = '⏳ TẬP TRUNG (HẸN GIỜ)';
    typeBadge.className = 'text-xs px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30';
    if (timeBox) timeBox.classList.remove('hidden');
    if (minutesEl) minutesEl.textContent = `${currentPendingVerdict.targetMinutes} Phút`;
    if (lockedTimeBox) lockedTimeBox.classList.remove('hidden');
  } else {
    typeBadge.textContent = '✓ VIỆC HOÀN THÀNH NGAY';
    typeBadge.className = 'text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30';
    if (timeBox) timeBox.classList.add('hidden');
    if (lockedTimeBox) lockedTimeBox.classList.add('hidden');
  }

  document.getElementById('verdict-coins').textContent = `🪙 ${currentPendingVerdict.rewardCoins} Vàng`;
  document.getElementById('verdict-speech').textContent = `"${currentPendingVerdict.verdict}"`;
  document.getElementById('verdict-advice').textContent = currentPendingVerdict.advice;

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
  if (lockedCoins) lockedCoins.textContent = `🪙 ${currentPendingVerdict.rewardCoins} Vàng`;

  const lockedMinutes = document.getElementById('verdict-locked-minutes');
  if (lockedMinutes) lockedMinutes.textContent = `${currentPendingVerdict.targetMinutes} Phút`;

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

function acceptVerdictAndCreateQuest() {
  if (!currentPendingVerdict) return;

  const newQuest = {
    id: 'q_' + Date.now(),
    title: currentPendingVerdict.title,
    description: currentPendingVerdict.description || '',
    type: currentPendingVerdict.type,
    rank: currentPendingVerdict.rank || calculateRank(currentPendingVerdict.rewardCoins),
    rewardCoins: currentPendingVerdict.rewardCoins,
    targetMinutes: currentPendingVerdict.targetMinutes || 0,
    advice: currentPendingVerdict.advice,
    verdict: currentPendingVerdict.verdict,
    status: 'active',
    createdAt: Date.now()
  };

  appState.quests.unshift(newQuest);
  sfx.playClick();
  showToast(`Đã thêm nhiệm vụ [Hạng ${newQuest.rank}]: "${newQuest.title}"!`, 'success');
  closeModal('modal-quest');
  triggerSave(true);
}

async function sendDebateArgument() {
  const argInput = document.getElementById('input-debate-arg');
  const argument = argInput.value.trim();
  if (!argument) return;

  const chatLogs = document.getElementById('debate-chat-logs');

  const userBubble = document.createElement('div');
  userBubble.className = 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-2.5 rounded-lg text-xs ml-4 sm:ml-6 border border-slate-200 dark:border-slate-700 shadow-sm whitespace-pre-wrap leading-relaxed';
  userBubble.textContent = `Bạn: ${argument}`;
  chatLogs.appendChild(userBubble);
  argInput.value = '';
  chatLogs.scrollTop = chatLogs.scrollHeight;

  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'bg-amber-50 dark:bg-slate-900 text-amber-700 dark:text-amber-300/90 p-2.5 rounded-lg text-xs mr-4 sm:mr-6 italic border border-amber-200 dark:border-slate-800';
  loadingBubble.textContent = 'AI đang xem xét đề xuất thương lượng của bạn...';
  chatLogs.appendChild(loadingBubble);
  chatLogs.scrollTop = chatLogs.scrollHeight;

  try {
    const currentRewards = (appState.shopItems || []).slice(0, 10).map(item => ({
      name: item.name,
      price: item.price,
      tier: item.tier
    }));

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'debate_quest',
        payload: {
          quest: currentPendingVerdict,
          argument,
          history: currentDebateHistory,
          currentRewards,
          userCoins: appState.profile?.coins || 0
        }
      })
    });

    if (!res.ok) throw new Error('AI Error');
    const data = await res.json();
    loadingBubble.remove();

    const aiBubble = document.createElement('div');
    aiBubble.className = `p-2.5 rounded-lg text-xs mr-4 sm:mr-6 border leading-relaxed ${data.accepted ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 font-medium' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`;
    aiBubble.innerHTML = `<strong class="font-bold block mb-1">AI Phản Hồi:</strong><div class="leading-relaxed">${renderMarkdown(data.reply)}</div>`;
    chatLogs.appendChild(aiBubble);
    chatLogs.scrollTop = chatLogs.scrollHeight;

    currentDebateHistory.push({ user: argument, arbiter: data.reply });

    if (data.accepted) {
      if (data.newTitle) currentPendingVerdict.title = data.newTitle;
      if (data.newDescription !== undefined) currentPendingVerdict.description = data.newDescription;
      if (data.newRewardCoins) currentPendingVerdict.rewardCoins = data.newRewardCoins;
      if (data.newTargetMinutes !== undefined) currentPendingVerdict.targetMinutes = data.newTargetMinutes;
      currentPendingVerdict.rank = data.newRank || calculateRank(currentPendingVerdict.rewardCoins);

      // Refresh locked specs display card
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
      if (lockedCoins) lockedCoins.textContent = `🪙 ${currentPendingVerdict.rewardCoins} Vàng`;

      const lockedMinutes = document.getElementById('verdict-locked-minutes');
      if (lockedMinutes) lockedMinutes.textContent = `${currentPendingVerdict.targetMinutes} Phút`;

      document.getElementById('verdict-coins').textContent = `🪙 ${currentPendingVerdict.rewardCoins} Vàng`;
      const rankBadge = document.getElementById('verdict-rank');
      rankBadge.textContent = `HẠNG ${currentPendingVerdict.rank}`;
      rankBadge.className = `rank-badge-${currentPendingVerdict.rank} text-xs font-mono font-black px-2.5 py-1 rounded-lg`;

      const minutesEl = document.getElementById('verdict-minutes');
      if (minutesEl) minutesEl.textContent = `${currentPendingVerdict.targetMinutes} Phút`;

      showToast('Thương lượng thành công! AI đã cập nhật thông số nhiệm vụ.', 'gold');
      sfx.playFanfare();
    }
  } catch (err) {
    loadingBubble.textContent = 'Lỗi thương lượng: ' + err.message;
  }
}

// =============================================================================
// 9. AI REWARD APPRAISAL & CREATION
// =============================================================================
let currentPendingReward = null;
let currentRewardDebateHistory = [];

async function evaluateRewardItem() {
  const name = document.getElementById('input-reward-name').value.trim();
  const desc = document.getElementById('input-reward-desc').value.trim();

  if (!name) {
    showToast('Vui lòng nhập tên phần thưởng!', 'error');
    return;
  }

  const evalBox = document.getElementById('reward-eval-box');
  const btnEval = document.getElementById('btn-eval-reward');
  const btnSave = document.getElementById('btn-save-reward');

  btnEval.textContent = '⏳ AI đang định giá...';
  btnEval.disabled = true;

  try {
    const currentQuests = (appState.quests || []).filter(q => q.status === 'active').slice(0, 10).map(q => ({
      title: q.title,
      rewardCoins: q.rewardCoins,
      type: q.type,
      targetMinutes: q.targetMinutes
    }));

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'evaluate_reward',
        payload: {
          name,
          description: desc,
          currentQuests,
          userCoins: appState.profile?.coins || 0
        }
      })
    });

    if (!res.ok) throw new Error('AI Error');
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
      icon: data.icon || '🎁',
      verdict: data.verdict || 'Phần thưởng đã được định giá phù hợp.'
    };
    currentRewardDebateHistory = [];

    evalBox.classList.remove('hidden');

    // Populate locked reward display card
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

    const lockedIcon = document.getElementById('reward-locked-icon');
    if (lockedIcon) lockedIcon.textContent = currentPendingReward.icon;

    document.getElementById('eval-tier').textContent = currentPendingReward.tier.toUpperCase();
    document.getElementById('eval-price').textContent = `🪙 ${currentPendingReward.price} Vàng`;
    document.getElementById('eval-verdict').textContent = `"${currentPendingReward.verdict}"`;

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

    btnEval.classList.add('hidden');
    btnSave.classList.remove('hidden');
    sfx.playClick();
  } catch (err) {
    showToast('Lỗi thẩm định: ' + err.message, 'error');
    btnEval.textContent = '🤖 AI Định Giá Vàng';
    btnEval.disabled = false;
  }
}

async function sendRewardDebateArgument() {
  const argInput = document.getElementById('input-reward-debate-arg');
  const argument = argInput.value.trim();
  if (!argument || !currentPendingReward) return;

  const chatLogs = document.getElementById('reward-debate-chat-logs');

  const userBubble = document.createElement('div');
  userBubble.className = 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-2.5 rounded-lg text-xs ml-4 sm:ml-6 border border-slate-200 dark:border-slate-700 shadow-sm whitespace-pre-wrap leading-relaxed';
  userBubble.textContent = `Bạn: ${argument}`;
  chatLogs.appendChild(userBubble);
  argInput.value = '';
  chatLogs.scrollTop = chatLogs.scrollHeight;

  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'bg-amber-50 dark:bg-slate-900 text-amber-700 dark:text-amber-300/90 p-2.5 rounded-lg text-xs mr-4 sm:mr-6 italic border border-amber-200 dark:border-slate-800';
  loadingBubble.textContent = 'AI đang xem xét đề xuất thương lượng phần thưởng...';
  chatLogs.appendChild(loadingBubble);
  chatLogs.scrollTop = chatLogs.scrollHeight;

  try {
    const currentQuests = (appState.quests || []).filter(q => q.status === 'active').slice(0, 10).map(q => ({
      title: q.title,
      rewardCoins: q.rewardCoins,
      type: q.type,
      targetMinutes: q.targetMinutes
    }));

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'debate_reward',
        payload: {
          reward: currentPendingReward,
          argument,
          history: currentRewardDebateHistory,
          currentQuests,
          userCoins: appState.profile?.coins || 0
        }
      })
    });

    if (!res.ok) throw new Error('AI Error');
    const data = await res.json();
    loadingBubble.remove();

    const aiBubble = document.createElement('div');
    aiBubble.className = `p-2.5 rounded-lg text-xs mr-4 sm:mr-6 border leading-relaxed ${data.accepted ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 font-medium' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`;
    aiBubble.innerHTML = `<strong class="font-bold block mb-1">AI Phản Hồi:</strong><div class="leading-relaxed">${renderMarkdown(data.reply)}</div>`;
    chatLogs.appendChild(aiBubble);
    chatLogs.scrollTop = chatLogs.scrollHeight;

    currentRewardDebateHistory.push({ user: argument, arbiter: data.reply });

    if (data.accepted) {
      if (data.newName) currentPendingReward.name = data.newName;
      if (data.newDescription !== undefined) currentPendingReward.description = data.newDescription;
      if (data.newPrice) currentPendingReward.price = data.newPrice;
      if (data.newTier) currentPendingReward.tier = data.newTier;

      // Update locked reward display card
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

      document.getElementById('eval-tier').textContent = currentPendingReward.tier.toUpperCase();
      document.getElementById('eval-price').textContent = `🪙 ${currentPendingReward.price} Vàng`;

      showToast('Thương lượng thành công! AI đã cập nhật phần thưởng.', 'gold');
      sfx.playFanfare();
    }
  } catch (err) {
    loadingBubble.textContent = 'Lỗi thương lượng: ' + err.message;
  }
}

function savePendingReward() {
  if (!currentPendingReward) return;

  const finalItem = {
    ...currentPendingReward,
    price: currentPendingReward.price
  };

  appState.shopItems.unshift(finalItem);
  sfx.playFanfare();
  showToast(`Đã thêm món "${finalItem.name}" vào Cửa Hàng!`, 'success');
  closeModal('modal-reward');
  triggerSave(true);
}

// =============================================================================
// 10. LEADERBOARD FETCHER
// =============================================================================
async function fetchLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs">Đang tải bảng xếp hạng...</td></tr>';

  try {
    const res = await fetch('/api/sync?action=leaderboard');
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    const list = data.leaderboard || [];

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs">Chưa có ai trên Bảng Xếp Hạng. Hãy đồng bộ tên của bạn để là người đầu tiên!</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    list.forEach((u, idx) => {
      const isMe = u.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase();
      const tr = document.createElement('tr');
      tr.className = `hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition ${isMe ? 'bg-amber-500/10 font-bold' : ''}`;

      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

      tr.innerHTML = `
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 font-mono ${idx < 3 ? 'text-base sm:text-lg' : 'text-slate-500'}">${medal}</td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 flex items-center gap-2">
          <span class="text-base sm:text-lg">${u.avatar || '⚔️'}</span>
          <div>
            <span class="text-slate-900 dark:text-slate-100">${escapeHtml(u.nickname)}</span>
            ${u.role === 'admin' ? '<span class="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-purple-500 text-white font-bold">👑 ADMIN</span>' : ''}
            ${isMe ? '<span class="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-bold">BẠN</span>' : ''}
            ${appState.profile.role === 'admin' && !isMe ? `<button class="btn-admin-del text-rose-500 hover:text-rose-700 ml-2 text-xs" data-nick="${escapeHtml(u.key || u.nickname)}" title="Xóa tài khoản này (Quyền Admin)">🗑️</button>` : ''}
          </div>
        </td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs text-amber-600 dark:text-amber-400/90 hidden sm:table-cell">${escapeHtml(u.title || 'Thành viên')}</td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300">Lv. ${u.level || 1}</td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">🪙 ${u.totalCoinsEarned || 0}</td>
      `;
      tbody.appendChild(tr);
    });

    if (appState.profile.role === 'admin') {
      tbody.querySelectorAll('.btn-admin-del').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const target = btn.dataset.nick;
          if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${target}" khỏi Bảng Xếp Hạng?`)) return;
          try {
            const token = getOrCreateUserToken();
            const res = await fetch('/api/sync?action=admin_remove', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                nickname: appState.profile.nickname,
                targetNickname: target
              })
            });
            if (res.ok) {
              showToast(`Đã xóa "${target}" khỏi hệ thống!`, 'success');
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
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs">Không thể kết nối với Redis Cloud (${err.message}). Bảng xếp hạng tạm thời offline.</td></tr>`;
  }
}

// =============================================================================
// 12. RENDER FUNCTIONS (Theme-aware & High Contrast)
// =============================================================================
let currentQuestFilter = 'all';

function renderHeader() {
  const p = appState.profile;
  document.getElementById('hero-avatar').textContent = p.avatar || '⚔️';
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
    const card = document.createElement('div');
    card.className = `rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between ${isCompleted ? 'opacity-60 bg-slate-100/50 dark:bg-slate-950/30' : ''}`;

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <span class="rank-badge-${q.rank} text-xs font-mono font-black px-2.5 py-0.5 rounded-lg">HẠNG ${q.rank}</span>
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">🪙 +${q.rewardCoins}</span>
            <button class="btn-del-quest text-slate-400 hover:text-rose-500 p-1 transition" title="Xóa nhiệm vụ">&times;</button>
          </div>
        </div>

        <h3 class="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1 leading-snug ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${escapeHtml(q.title)}</h3>
        ${q.description ? `<p class="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">${escapeHtml(q.description)}</p>` : ''}
      </div>

      <div class="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <span class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
          ${q.type === 'focus' ? `⏳ <span class="font-mono font-bold">${q.targetMinutes}p</span> Tập trung` : '✓ Làm ngay'}
        </span>

        ${isCompleted ? `
          <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span>✓</span> Hoàn thành
          </span>
        ` : q.type === 'focus' ? `
          <button class="btn-start-focus px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1.5 shadow-md shadow-cyan-600/20 active:scale-95">
            <span>⏱️</span>
            <span>Bắt Đầu</span>
          </button>
        ` : `
          <button class="btn-complete-bounty px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95">
            <span>✓</span>
            <span>Hoàn Thành</span>
          </button>
        `}
      </div>
    `;

    card.querySelector('.btn-del-quest').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteQuest(q.id);
    });

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
    const card = document.createElement('div');
    card.className = 'rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between';

    const tierColors = {
      common: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
      rare: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
      epic: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
      legendary: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    };

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl shadow-sm">
            ${item.icon || '🎁'}
          </div>
          <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${tierColors[item.tier] || tierColors.rare}">
            ${item.tier || 'RARE'}
          </span>
        </div>

        <h3 class="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1 leading-snug">${escapeHtml(item.name)}</h3>
        ${item.description ? `<p class="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">${escapeHtml(item.description)}</p>` : ''}
      </div>

      <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <span class="font-mono text-sm font-black text-amber-600 dark:text-amber-400">🪙 ${item.price} Vàng</span>
        <button class="btn-buy-item px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 ${canAfford ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'}">
          <span>${canAfford ? 'Đổi Quà' : 'Chưa Đủ Vàng'}</span>
        </button>
      </div>
    `;

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
    const card = document.createElement('div');
    card.className = `rpg-panel rounded-2xl p-4 flex flex-col justify-between ${item.isUsed ? 'bg-slate-100/50 dark:bg-slate-950/30 opacity-60' : ''}`;

    card.innerHTML = `
      <div>
        <div class="flex items-center gap-3 mb-2">
          <span class="text-3xl">${item.icon || '🎁'}</span>
          <div>
            <h4 class="font-bold text-sm text-slate-900 dark:text-slate-100 ${item.isUsed ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${escapeHtml(item.name)}</h4>
            <span class="text-[10px] text-slate-500 font-mono">Đã đổi: ${new Date(item.purchasedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
        <span class="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">🪙 ${item.price} Vàng</span>
        ${item.isUsed ? `
          <span class="text-xs font-semibold text-slate-500">Đã sử dụng</span>
        ` : `
          <button class="btn-use-inv px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 transition shadow-md shadow-emerald-500/20 active:scale-95">
            Dùng Quà Ngay 🎉
          </button>
        `}
      </div>
    `;

    const useBtn = card.querySelector('.btn-use-inv');
    if (useBtn) {
      useBtn.addEventListener('click', () => useInventoryItem(item.id));
    }

    grid.appendChild(card);
  });
}

function renderLedger() {
  const list = document.getElementById('ledger-list');
  if (appState.ledger.length === 0) {
    list.innerHTML = '<div class="text-center py-8 text-slate-500 text-xs">Chưa có giao dịch vàng nào được ghi nhận.</div>';
    return;
  }

  list.innerHTML = '';
  appState.ledger.slice(0, 50).forEach(entry => {
    const isEarn = entry.type === 'earn';
    const row = document.createElement('div');
    row.className = 'p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs shadow-sm';

    row.innerHTML = `
      <div class="flex items-center gap-2.5">
        <span class="text-base">${isEarn ? '📥' : '📤'}</span>
        <div>
          <div class="font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(entry.description)}</div>
          <div class="text-[10px] text-slate-500 font-mono">${new Date(entry.timestamp).toLocaleString()}</div>
        </div>
      </div>
      <div class="font-mono font-bold text-sm shrink-0 ${isEarn ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}">
        ${isEarn ? '+' : '-'}${entry.amount} 🪙
      </div>
    `;

    list.appendChild(row);
  });
}

function renderAll() {
  renderHeader();
  renderQuests();
  renderShop();
  renderInventory();
  renderLedger();
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

  if (subtab === 'inventory') {
    if (btnShop) {
      btnShop.className = 'reward-subtab flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200';
    }
    if (btnInv) {
      btnInv.className = 'reward-subtab active flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm';
    }
    if (paneShop) paneShop.classList.add('hidden');
    if (paneInv) paneInv.classList.remove('hidden');
  } else {
    if (btnShop) {
      btnShop.className = 'reward-subtab active flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm';
    }
    if (btnInv) {
      btnInv.className = 'reward-subtab flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200';
    }
    if (paneShop) paneShop.classList.remove('hidden');
    if (paneInv) paneInv.classList.add('hidden');
  }
}
window.switchRewardSubtab = switchRewardSubtab;

function switchTab(tabId) {
  // Graceful fallback / redirect for legacy 'inventory' tab links
  if (tabId === 'inventory') {
    tabId = 'shop';
    switchRewardSubtab('inventory');
  }

  // Sync desktop tabs
  document.querySelectorAll('.nav-tab').forEach(b => {
    const isActive = b.dataset.tab === tabId;
    b.className = `nav-tab flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition ${
      isActive
        ? 'active bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent'
    }`;
  });

  // Sync mobile bottom bar buttons
  document.querySelectorAll('.mobile-nav-btn').forEach(b => {
    const isActive = b.dataset.tab === tabId;
    b.className = `mobile-nav-btn flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
      isActive
        ? 'active text-amber-600 dark:text-amber-400 font-bold'
        : 'text-slate-500 dark:text-slate-400 font-medium'
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
    fetchLeaderboard();
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  if (id === 'modal-welcome') {
    const isOnboarded = localStorage.getItem('levelup_onboarded') === 'true' || Boolean(appState.profile.hasOnboarded && appState.profile.nickname);
    if (!isOnboarded) return;
  }
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
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
  return localStorage.getItem('levelup_onboarded') === 'true' || Boolean(appState.profile && appState.profile.hasOnboarded && appState.profile.nickname);
}

function initWelcomeModal() {
  if (checkIsOnboarded()) return;

  openModal('modal-welcome');

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
    showToast('Vui lòng tạo tài khoản hoặc nhập Mã Token để tiếp tục!', 'error');
  }, true);

  // Anti-DevTools 3: Chặn phím tắt gõ vào trang nếu chưa onboard
  document.addEventListener('keydown', (e) => {
    if (checkIsOnboarded()) return;
    if (e.target.closest && e.target.closest('#modal-welcome')) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  const tabNew = document.getElementById('btn-tab-welcome-new');
  const tabReturning = document.getElementById('btn-tab-welcome-returning');
  const panelNew = document.getElementById('welcome-panel-new');
  const panelReturning = document.getElementById('welcome-panel-returning');
  const errNew = document.getElementById('welcome-new-error');
  const errReturning = document.getElementById('welcome-token-error');

  let selectedAvatar = '⚔️';

  if (tabNew && tabReturning && panelNew && panelReturning) {
    tabNew.addEventListener('click', () => {
      tabNew.className = 'py-2.5 rounded-xl text-center transition bg-amber-500 text-slate-950 shadow-sm';
      tabReturning.className = 'py-2.5 rounded-xl text-center transition text-slate-400 hover:text-slate-200';
      panelNew.classList.remove('hidden');
      panelReturning.classList.add('hidden');
    });

    tabReturning.addEventListener('click', () => {
      tabReturning.className = 'py-2.5 rounded-xl text-center transition bg-amber-500 text-slate-950 shadow-sm';
      tabNew.className = 'py-2.5 rounded-xl text-center transition text-slate-400 hover:text-slate-200';
      panelReturning.classList.remove('hidden');
      panelNew.classList.add('hidden');
    });
  }

  document.querySelectorAll('.welcome-avatar-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.welcome-avatar-opt').forEach(b => {
        b.className = 'welcome-avatar-opt text-2xl p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-amber-500/10 shadow-sm transition';
      });
      btn.className = 'welcome-avatar-opt text-2xl p-2 rounded-xl bg-slate-800 border-2 border-amber-500 bg-amber-500/20 shadow-sm transition';
      selectedAvatar = btn.dataset.avatar;
    });
  });

  const btnCreate = document.getElementById('btn-welcome-create');
  if (btnCreate) {
    btnCreate.addEventListener('click', async () => {
      const inputNick = document.getElementById('input-welcome-nickname');
      const nick = inputNick ? inputNick.value.trim() : '';
      if (!nick) {
        if (errNew) {
          errNew.textContent = 'Nickname không được để trống!';
          errNew.classList.remove('hidden');
        }
        return;
      }

      btnCreate.disabled = true;
      btnCreate.textContent = '⏳ Đang kiểm tra...';
      if (errNew) errNew.classList.add('hidden');

      try {
        const token = getOrCreateUserToken();
        const checkRes = await fetch(`/api/sync?action=check_nickname&nickname=${encodeURIComponent(nick)}&token=${encodeURIComponent(token)}`);
        const checkData = await checkRes.json().catch(() => ({}));

        if (!checkData.available) {
          if (errNew) {
            errNew.textContent = `Tên "${nick}" đã có người sử dụng. Vui lòng chọn tên khác!`;
            errNew.classList.remove('hidden');
          }
          btnCreate.disabled = false;
          btnCreate.textContent = '🚀 Bắt Đầu Ngay';
          return;
        }

        appState.profile.nickname = nick;
        appState.profile.avatar = selectedAvatar;
        appState.profile.hasOnboarded = true;
        localStorage.setItem('levelup_onboarded', 'true');
        saveLocalState();
        renderAll();

        closeModal('modal-welcome');
        syncWithCloud(true);
        showToast(`Chào mừng "${nick}" đến với LevelUp!`, 'success');
      } catch (e) {
        if (errNew) {
          errNew.textContent = 'Lỗi kiểm tra: ' + e.message;
          errNew.classList.remove('hidden');
        }
        btnCreate.disabled = false;
        btnCreate.textContent = '🚀 Bắt Đầu Ngay';
      }
    });
  }

  const btnRestore = document.getElementById('btn-welcome-restore');
  if (btnRestore) {
    btnRestore.addEventListener('click', async () => {
      const inputToken = document.getElementById('input-welcome-token');
      const token = inputToken ? inputToken.value.trim() : '';
      if (!token) {
        if (errReturning) {
          errReturning.textContent = 'Vui lòng nhập Mã Tài Khoản (Token) của bạn!';
          errReturning.classList.remove('hidden');
        }
        return;
      }

      btnRestore.disabled = true;
      btnRestore.textContent = '⏳ Đang khôi phục...';
      if (errReturning) errReturning.classList.add('hidden');

      const result = await switchAccountByToken(token);
      if (!result.success) {
        if (errReturning) {
          errReturning.textContent = result.error || 'Không tìm thấy tài khoản tương ứng với Token này.';
          errReturning.classList.remove('hidden');
        }
        btnRestore.disabled = false;
        btnRestore.textContent = '📥 Đăng Nhập Ngay';
      }
    });
  }
}

// =============================================================================
// 14. EVENT LISTENERS ATTACHMENT
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadLocalState();
  renderAll();
  restoreFocusTimer();

  // Kiểm tra onboarding: Bắt buộc nhập nickname hoặc nhập token nếu là người cũ
  initWelcomeModal();

  // Background Cloud Sync on start
  if (appState.profile.nickname && (localStorage.getItem('levelup_onboarded') === 'true' || appState.profile.hasOnboarded)) {
    syncWithCloud(false);
  }

  // Navigation Tab buttons (Desktop & Mobile)
  document.querySelectorAll('.nav-tab, .mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.playClick();
      switchTab(btn.dataset.tab);
    });
  });

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
      if (activeFocusQuest && mins < activeFocusQuest.targetMinutes) {
        showToast(`Không thể chọn mốc thấp hơn ${activeFocusQuest.targetMinutes} phút do AI đã định giá!`, 'error');
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

  // Profile Modal & Avatar Picker
  document.getElementById('open-profile-btn').addEventListener('click', () => {
    document.getElementById('input-hero-nickname').value = appState.profile.nickname;
    const tokenInput = document.getElementById('input-hero-token');
    if (tokenInput) {
      tokenInput.value = getOrCreateUserToken();
      tokenInput.readOnly = true;
      tokenInput.type = 'password';
    }
    const roleBadge = document.getElementById('profile-role-badge');
    if (roleBadge) {
      const isAdmin = appState.profile.role === 'admin';
      roleBadge.textContent = isAdmin ? '👑 Quản Trị Viên (Admin)' : '👤 Người Dùng';
      roleBadge.className = isAdmin
        ? 'font-bold px-2 py-0.5 rounded text-[11px] bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
        : 'font-bold px-2 py-0.5 rounded text-[11px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
    }
    openModal('modal-profile');
  });

  const btnCopyToken = document.getElementById('btn-copy-token');
  if (btnCopyToken) {
    btnCopyToken.addEventListener('click', () => {
      const token = getOrCreateUserToken();
      navigator.clipboard.writeText(token).then(() => {
        showToast('Đã sao chép Mã Tài Khoản (Token)!', 'success');
      }).catch(() => {
        showToast('Vui lòng chọn và sao chép thủ công từ ô nhập.', 'info');
      });
    });
  }

  const btnToggleTokenEdit = document.getElementById('btn-toggle-token-edit');
  if (btnToggleTokenEdit) {
    btnToggleTokenEdit.addEventListener('click', () => {
      const tokenInput = document.getElementById('input-hero-token');
      if (!tokenInput) return;
      tokenInput.readOnly = false;
      tokenInput.type = 'text';
      tokenInput.focus();
      tokenInput.select();
      showToast('Dán Mã Tài Khoản (Token) mới vào đây để đăng nhập vào tài khoản đó.', 'info');
    });
  }

  const heroTokenInput = document.getElementById('input-hero-token');
  if (heroTokenInput) {
    // Tự động nhận diện khi người dùng paste Token vào ô Mã sở hữu
    heroTokenInput.addEventListener('paste', (e) => {
      const pasted = (e.clipboardData || window.clipboardData).getData('text').trim();
      if (pasted && pasted.length >= 16 && pasted !== appState.profile.token) {
        setTimeout(() => {
          switchAccountByToken(pasted);
        }, 80);
      }
    });
  }

  const btnSwitchByToken = document.getElementById('btn-switch-by-token');
  if (btnSwitchByToken) {
    btnSwitchByToken.addEventListener('click', () => {
      const val = heroTokenInput ? heroTokenInput.value.trim() : '';
      if (val) switchAccountByToken(val);
    });
  }

  document.querySelectorAll('.avatar-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('border-amber-500', 'bg-amber-500/20'));
      btn.classList.add('border-amber-500', 'bg-amber-500/20');
      appState.profile.avatar = btn.dataset.avatar;
    });
  });

  document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const nick = document.getElementById('input-hero-nickname').value.trim();
    if (!nick) {
      showToast('Nickname không được để trống!', 'error');
      return;
    }

    const tokenInput = document.getElementById('input-hero-token');
    const enteredToken = tokenInput ? tokenInput.value.trim() : '';
    // Nếu người dùng nhập mã Token khác với tài khoản hiện tại -> chuyển tài khoản an toàn thay vì ghi đè
    if (enteredToken && enteredToken !== appState.profile.token && enteredToken.length >= 8) {
      const switchResult = await switchAccountByToken(enteredToken);
      if (switchResult.success) return;
    }

    const token = getOrCreateUserToken();
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

  document.getElementById('btn-force-cloud-load').addEventListener('click', () => {
    const nick = document.getElementById('input-hero-nickname').value.trim() || appState.profile.nickname;
    if (nick) loadFromCloud(nick);
  });

  // Open Quest Modal (Desktop & Mobile buttons)
  const openQuestHandler = () => {
    sfx.playClick();
    document.getElementById('quest-form-step').classList.remove('hidden');
    document.getElementById('quest-evaluating-step').classList.add('hidden');
    document.getElementById('quest-verdict-step').classList.add('hidden');
    document.getElementById('input-quest-title').value = '';
    document.getElementById('input-quest-desc').value = '';
    document.getElementById('input-quest-estimate').value = '';
    const modNotice = document.getElementById('verdict-modified-notice');
    if (modNotice) modNotice.classList.add('hidden');
    openModal('modal-quest');
  };
  const desktopAddQuestBtn = document.getElementById('btn-open-add-quest');
  if (desktopAddQuestBtn) desktopAddQuestBtn.addEventListener('click', openQuestHandler);
  const mobileAddQuestBtn = document.getElementById('btn-open-add-quest-mobile');
  if (mobileAddQuestBtn) mobileAddQuestBtn.addEventListener('click', openQuestHandler);

  document.getElementById('btn-submit-to-ai').addEventListener('click', submitQuestToAI);
  document.getElementById('btn-accept-verdict').addEventListener('click', acceptVerdictAndCreateQuest);

  // Quest Debate features
  document.getElementById('btn-open-debate').addEventListener('click', () => {
    const debateBox = document.getElementById('debate-container');
    debateBox.classList.toggle('hidden');
  });
  document.getElementById('btn-send-debate').addEventListener('click', sendDebateArgument);
  document.getElementById('input-debate-arg').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendDebateArgument();
  });

  // Open Shop Reward Modal (Desktop, Mobile & Global)
  const openRewardHandler = () => {
    sfx.playClick();
    document.getElementById('input-reward-name').value = '';
    document.getElementById('input-reward-desc').value = '';
    document.getElementById('reward-eval-box').classList.add('hidden');
    const rewardModNotice = document.getElementById('reward-modified-notice');
    if (rewardModNotice) rewardModNotice.classList.add('hidden');
    const rewardDebateBox = document.getElementById('reward-debate-container');
    if (rewardDebateBox) rewardDebateBox.classList.add('hidden');
    const rewardChatLogs = document.getElementById('reward-debate-chat-logs');
    if (rewardChatLogs) rewardChatLogs.innerHTML = '';
    currentRewardDebateHistory = [];
    document.getElementById('btn-eval-reward').classList.remove('hidden');
    document.getElementById('btn-eval-reward').disabled = false;
    document.getElementById('btn-eval-reward').textContent = '🤖 AI Định Giá Vàng';
    document.getElementById('btn-save-reward').classList.add('hidden');
    openModal('modal-reward');
  };
  window.openRewardModal = openRewardHandler;
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
      if (debateBox) debateBox.classList.toggle('hidden');
    });
  }
  const btnSendRewardDebate = document.getElementById('btn-send-reward-debate');
  if (btnSendRewardDebate) {
    btnSendRewardDebate.addEventListener('click', sendRewardDebateArgument);
  }
  const inputRewardDebateArg = document.getElementById('input-reward-debate-arg');
  if (inputRewardDebateArg) {
    inputRewardDebateArg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendRewardDebateArgument();
    });
  }

  // Global Close Modal on backdrop or close button
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.fixed');
      if (modal) modal.classList.add('hidden');
    });
  });

  document.querySelectorAll('.fixed').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal.id === 'modal-welcome') {
          // Bắt buộc hoàn tất bước đầu tiên: không cho đóng khi click ra ngoài
          showToast('Vui lòng tạo tài khoản hoặc nhập Mã Token để tiếp tục!', 'info');
          const panel = modal.querySelector('.rpg-panel');
          if (panel) {
            panel.classList.add('ring-4', 'ring-amber-500/60');
            setTimeout(() => panel.classList.remove('ring-4', 'ring-amber-500/60'), 400);
          }
          return;
        }
        modal.classList.add('hidden');
      }
    });
  });

  // Chặn phím Escape đóng modal-welcome khi chưa hoàn tất bước đầu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const welcome = document.getElementById('modal-welcome');
      const isOnboarded = localStorage.getItem('levelup_onboarded') === 'true' || Boolean(appState.profile.hasOnboarded && appState.profile.nickname);
      if (!isOnboarded && welcome && !welcome.classList.contains('hidden')) {
        e.preventDefault();
        return;
      }
      document.querySelectorAll('.fixed:not(#modal-welcome):not(.hidden)').forEach(m => m.classList.add('hidden'));
    }
  });
});
