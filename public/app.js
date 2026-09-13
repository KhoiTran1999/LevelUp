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
let appState = { ...DEFAULT_STATE };
let syncTimeout = null;

function clearLegacyLocalStorage() {
  try {
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
      : ((q.status === 'completed' || q.completed === true) ? 1 : 0);
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

  if (rawTotal > maxEarned + 500) {
    rawTotal = maxEarned;
    tampered = true;
  }
  if (rawTotal < 0) {
    rawTotal = 0;
    tampered = true;
  }

  const maxCurrent = Math.max(0, rawTotal - totalSpent);
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

async function syncWithCloud(isManual = false) {
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
        state: appState
      })
    });

    if (res.ok) {
      const data = await res.json();
      delete appState.pendingOldNickname;
      if (data.role) appState.profile.role = data.role;

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
        renderAll();
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

function triggerSave(needsCloud = true) {
  // Anti-cheat check: Ngăn chặn sửa đổi biến global qua DevTools Console
  const check = deriveLegitimateBalance(appState);
  if (check.tampered) {
    console.warn('Phát hiện can thiệp số Vàng. Đã tự động cân bằng về giá trị chuẩn:', check.coins);
    appState.profile.coins = check.coins;
    appState.profile.totalCoinsEarned = check.totalCoinsEarned;
  }
  appState.lastModified = Date.now();
  renderAll();

  if (needsCloud) {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      syncWithCloud(false);
    }, 600);
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
      // Cloud chưa có bản lưu -> đẩy bản local hiện tại lên
      syncWithCloud(false);
      return;
    }

    const cloudData = result.data;
    const cloudTime = Number(cloudData.lastModified || cloudData.lastSyncedAt || 0);
    const localTime = Number(appState.lastModified || appState.lastSyncedAt || 0);

    // Nếu Cloud mới hơn (do làm nhiệm vụ trên máy khác): Đồng bộ nạp từ Cloud về
    if (cloudTime > localTime) {
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
      renderAll();

      if (syncDot) syncDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (modalSyncState) modalSyncState.textContent = 'Đã cập nhật từ Cloud';
      if (modalSyncTime) modalSyncTime.textContent = new Date(cloudData.lastSyncedAt || Date.now()).toLocaleTimeString();
      if (isManual) showToast('Đã tải dữ liệu mới nhất từ thiết bị khác thành công!', 'success');
    } else if (localTime > cloudTime) {
      // Nếu máy hiện tại mới hơn (do vừa thao tác xong): Đẩy dữ liệu mới lên Cloud
      syncWithCloud(false);
    } else {
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

function logoutGoogle() {
  confirmAction({
    title: 'ĐĂNG XUẤT TÀI KHOẢN',
    message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Google này? Dữ liệu đã đồng bộ trên đám mây sẽ được bảo toàn nguyên vẹn.',
    confirmText: 'Đăng Xuất',
    icon: '🚪',
    btnColor: 'rose',
    onConfirm: () => {
      const token = appState.profile?.sessionToken || appState.profile?.googleToken;
      try {
        fetch('/api/sync?action=logout', {
          method: 'POST',
          credentials: 'include',
          ...(token ? { headers: { 'Authorization': `Bearer ${token}` } } : {})
        }).catch(() => {});
      } catch (_) {}

      if (window.google?.accounts?.id) {
        try { window.google.accounts.id.disableAutoSelect(); } catch (_) {}
      }
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
      renderGoogleSignInButton();
      showToast('Đã đăng xuất tài khoản Google.', 'info');
    }
  });
}

function switchGoogleAccount() {
  confirmAction({
    title: 'ĐỔI TÀI KHOẢN GOOGLE',
    message: 'Hệ thống sẽ đăng xuất tài khoản hiện tại và đưa bạn về màn hình đăng nhập Google để chọn tài khoản khác.',
    confirmText: 'Đổi Tài Khoản',
    icon: '🔄',
    btnColor: 'amber',
    onConfirm: () => {
      const token = appState.profile?.sessionToken || appState.profile?.googleToken;
      try {
        fetch('/api/sync?action=logout', {
          method: 'POST',
          credentials: 'include',
          ...(token ? { headers: { 'Authorization': `Bearer ${token}` } } : {})
        }).catch(() => {});
      } catch (_) {}

      if (window.google?.accounts?.id) {
        try { window.google.accounts.id.disableAutoSelect(); } catch (_) {}
      }
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
      renderGoogleSignInButton();
      showToast('Vui lòng đăng nhập tài khoản Google mới.', 'info');
    }
  });
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
  btnColor = 'amber'
} = {}) {
  return new Promise((resolve) => {
    if (activeConfirmResolve) {
      activeConfirmResolve(false);
      activeConfirmResolve = null;
    }

    const modal = document.getElementById('modal-confirm');
    if (!modal) {
      return resolve(window.confirm(`${title}\n${message}`));
    }

    activeConfirmResolve = resolve;

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

function extractRewardDuration(item) {
  if (item.targetMinutes && item.targetMinutes > 0) return item.targetMinutes;
  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  const hourMatch = text.match(/(\d+)\s*(tiếng|giờ|hour|h)\b/i);
  if (hourMatch) {
    return parseInt(hourMatch[1], 10) * 60;
  }
  const minMatch = text.match(/(\d+)\s*(phút|min|p)\b/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }
  if (item.tier === 'common') return 15;
  if (item.tier === 'rare') return 30;
  if (item.tier === 'epic') return 60;
  if (item.tier === 'legendary') return 90;
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

// LocalStorage State Persistence
function saveFocusTimerState() {
  if (!activeFocusQuest && !isBreakMode && !activeRewardItem) {
    localStorage.removeItem(TIMER_STORAGE_KEY);
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
      activeRewardItem = null;
    } else if (state.isRewardMode && state.rewardItemId) {
      const invItem = appState.inventory?.find(i => i.id === state.rewardItemId);
      if (!invItem) {
        localStorage.removeItem(TIMER_STORAGE_KEY);
        return;
      }
      activeRewardItem = invItem;
      activeFocusQuest = null;
      isBreakMode = false;
    } else if (state.questId) {
      const quest = appState.quests?.find(q => q.id === state.questId);
      if (!quest || quest.status === 'completed') {
        localStorage.removeItem(TIMER_STORAGE_KEY);
        return;
      }
      activeFocusQuest = quest;
      activeRewardItem = null;
      isBreakMode = false;
    } else {
      localStorage.removeItem(TIMER_STORAGE_KEY);
      return;
    }

    focusTotalSeconds = state.totalSeconds || (activeFocusQuest?.targetMinutes || (activeRewardItem ? extractRewardDuration(activeRewardItem) : 25)) * 60;
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

  const toggleText = isFocusRunning ? 'Tạm Dừng' : 'Tiếp Tục';
  if (toggleBtn) toggleBtn.textContent = toggleText;
  if (zenToggleBtn) zenToggleBtn.textContent = toggleText;
}

async function startFocusTimer(quest) {
  if (!quest) return;

  // Edge case 1: Nhiệm vụ đã hoàn thành từ trước
  if (quest.status === 'completed') {
    showToast('Nhiệm vụ này đã được hoàn thành!', 'info');
    return;
  }

  // Edge case 2: Nhấn "Bắt đầu" vào chính nhiệm vụ đang được bấm giờ
  if (activeFocusQuest && activeFocusQuest.id === quest.id) {
    if (isFocusRunning) {
      showToast(`Nhiệm vụ "${quest.title}" đang được bấm giờ (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại)!`, 'info');
      document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    } else {
      const ok = await confirmAction({
        title: 'Tiếp Tục Bấm Giờ?',
        message: `Nhiệm vụ "${quest.title}" đang tạm dừng với ${Math.ceil(focusRemainingSeconds / 60)} phút còn lại. Bạn có muốn tiếp tục đếm giờ?`,
        confirmText: 'Tiếp Tục ⏱️',
        cancelText: 'Hủy',
        icon: '⏱️',
        btnColor: 'cyan'
      });
      if (ok) {
        toggleFocusTimer();
      }
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
  } else if (!activeRewardItem) {
    // Xác nhận trước khi bắt đầu phiên tập trung
    const ok = await confirmAction({
      title: 'Bắt Đầu Tập Trung?',
      message: `Bắt đầu phiên tập trung ${quest.targetMinutes || 25} phút cho nhiệm vụ "${quest.title}"?`,
      detail: '🎯 Hãy bật chế độ Không làm phiền và tập trung hoàn toàn trong suốt phiên.',
      confirmText: 'Bắt Đầu ⏱️',
      cancelText: 'Để Sau',
      icon: '⏱️',
      btnColor: 'cyan'
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

  renderFocusStationUI();
  updateTimerDisplay();
  saveFocusTimerState();
  requestWakeLock();
  renderQuests();
  renderInventory();

  clearInterval(focusTimerInterval);
  focusTimerInterval = setInterval(tickFocusTimer, 500);

  sfx.playGong();
  showToast(`Bắt đầu đồng hồ tập trung: ${quest.targetMinutes || 25} phút! Chúc bạn tập trung cao độ.`, 'info');
}

function startBreakTimer(breakMinutes = 5) {
  isBreakMode = true;
  activeFocusQuest = null;
  activeRewardItem = null;
  focusTotalSeconds = breakMinutes * 60;
  focusRemainingSeconds = focusTotalSeconds;
  isFocusRunning = true;
  lastTickTime = Date.now();

  renderFocusStationUI();
  updateTimerDisplay();
  saveFocusTimerState();
  requestWakeLock();
  renderQuests();
  renderInventory();

  clearInterval(focusTimerInterval);
  focusTimerInterval = setInterval(tickFocusTimer, 500);

  sfx.playClick();
  showToast(`Bắt đầu nghỉ giải lao ${breakMinutes} phút! Hãy vươn vai và uống nước nhé.`, 'info');
}

function toggleFocusTimer() {
  if (!activeFocusQuest && !isBreakMode && !activeRewardItem) {
    showToast('Chưa có phiên nào đang chạy!', 'info');
    return;
  }

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
  renderQuests();
  renderInventory();
}

async function resetFocusTimer() {
  if (!activeFocusQuest && !isBreakMode && !activeRewardItem) return;

  const msg = isBreakMode
    ? 'Bạn có chắc muốn kết thúc sớm giờ nghỉ giải lao?'
    : activeRewardItem
    ? `Bạn có chắc muốn kết thúc sớm thời gian tận hưởng phần thưởng "${activeRewardItem.name}"?`
    : `Bạn có chắc muốn dừng phiên tập trung cho "${activeFocusQuest?.title || 'nhiệm vụ'}"? Thời gian đã đếm sẽ không được tính.`;

  const ok = await confirmAction({
    title: isBreakMode ? 'Dừng Giờ Nghỉ?' : (activeRewardItem ? 'Dừng Tận Hưởng Quà?' : 'Dừng Phiên Tập Trung?'),
    message: msg,
    detail: activeRewardItem ? 'Phần thưởng đã dùng vẫn được ghi nhận trong kho quà.' : (isBreakMode ? '' : '⚠️ Phiên tập trung sẽ bị hủy và bạn sẽ không nhận được Vàng.'),
    confirmText: 'Dừng Ngay',
    cancelText: 'Tiếp Tục',
    icon: activeRewardItem ? '🎁' : (isBreakMode ? '☕' : '⏹️'),
    btnColor: 'rose'
  });

  if (ok) {
    clearFocusTimerSession();
    renderQuests();
    renderInventory();
    showToast(activeRewardItem ? 'Đã kết thúc phiên dùng quà.' : 'Đã dừng phiên tập trung.', 'info');
  }
}

function clearFocusTimerSession() {
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
  localStorage.removeItem(TIMER_STORAGE_KEY);
  document.title = 'LevelUp — Biến Công Việc & Thói Quen Thành Trò Chơi';

  const banner = document.getElementById('active-focus-banner');
  if (banner) banner.classList.add('hidden');

  const zenOverlay = document.getElementById('focus-zen-overlay');
  if (zenOverlay) zenOverlay.classList.add('hidden');

  renderQuests();
  renderInventory();
}

function adjustTimer(deltaSec) {
  if (!activeFocusQuest && !isBreakMode && !activeRewardItem) return;

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
  saveFocusTimerState();
  sfx.playClick();
  showToast(`Đã thêm thời gian: +${deltaSec / 60}p`, 'info');
}

function openEditTimerModal() {
  if (!activeFocusQuest && !isBreakMode && !activeRewardItem) return;
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

async function completeQuest(questId, skipConfirm = false) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest || (!quest.isRepeatable && quest.status === 'completed') || completingQuestIds.has(questId)) return;

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

    if (activeFocusQuest && activeFocusQuest.id === questId) {
      clearFocusTimerSession();
    }

    if (quest.isRepeatable) {
      quest.completedCount = (quest.completedCount || 0) + 1;
      quest.lastCompletedAt = Date.now();
    } else {
      quest.status = 'completed';
      quest.completedAt = Date.now();
    }

    appState.profile.coins += quest.rewardCoins;
    appState.profile.totalCoinsEarned += quest.rewardCoins;
    addEXP(quest.rewardCoins * 3);

    appState.ledger.unshift({
      id: 'led_' + Date.now(),
      type: 'earn',
      amount: quest.rewardCoins,
      description: `Hoàn thành [Hạng ${quest.rank}] ${quest.title}${quest.isRepeatable ? ` (Lần ${quest.completedCount})` : ''}`,
      timestamp: Date.now()
    });

    sfx.playCoin();
    showToast(`+${quest.rewardCoins} VÀNG! Hoàn thành${quest.isRepeatable ? ` lần ${quest.completedCount}` : ''}: "${quest.title}"`, 'gold', {
      label: 'Hoàn tác',
      onClick: () => undoCompleteQuest(quest.id)
    });
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

  if (quest.isRepeatable) {
    quest.completedCount = Math.max(0, (quest.completedCount || 1) - 1);
  } else {
    quest.status = 'active';
    delete quest.completedAt;
  }

  appState.profile.coins = Math.max(0, appState.profile.coins - quest.rewardCoins);
  appState.profile.totalCoinsEarned = Math.max(0, appState.profile.totalCoinsEarned - quest.rewardCoins);
  appState.profile.exp = Math.max(0, appState.profile.exp - quest.rewardCoins * 3);

  appState.ledger.unshift({
    id: 'led_' + Date.now(),
    type: 'spend',
    amount: quest.rewardCoins,
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

  if (appState.profile.coins < item.price) {
    showToast(`Chưa đủ vàng! Bạn cần thêm ${item.price - appState.profile.coins} Vàng nữa. Hãy hoàn thành thêm nhiệm vụ nhé!`, 'error');
    return;
  }

  const ok = await confirmAction({
    title: 'Đổi Phần Thưởng?',
    message: `Bạn có chắc muốn dùng ${item.price} Vàng để đổi phần thưởng "${item.name}"?`,
    detail: `💰 Vàng hiện có: ${appState.profile.coins} | Còn lại sau khi đổi: ${appState.profile.coins - item.price}`,
    confirmText: 'Đổi Quà 🎁',
    cancelText: 'Để Sau',
    icon: '🎁',
    btnColor: 'amber'
  });
  if (!ok) return;

  appState.profile.coins -= item.price;

  const newInvItem = {
    id: 'inv_' + Date.now(),
    shopItemId: item.id,
    name: item.name,
    price: item.price,
    tier: item.tier,
    icon: item.icon,
    signature: item.signature || '',
    purchasedAt: Date.now(),
    isUsed: false
  };

  appState.inventory.unshift(newInvItem);

  appState.ledger.unshift({
    id: 'led_' + Date.now(),
    type: 'spend',
    amount: item.price,
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
  switchRewardSubtab('inventory');
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

  appState.ledger.unshift({
    id: 'led_' + Date.now(),
    type: 'earn',
    amount: item.price,
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

async function useInventoryItem(invId) {
  const item = appState.inventory.find(i => i.id === invId);
  if (!item) return;

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
  } else {
    // Xác nhận sử dụng quà kèm thời lượng đếm ngược
    const durationMinutes = extractRewardDuration(item);
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
  }

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  const durationMinutes = extractRewardDuration(item);
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
  saveFocusTimerState();
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
      targetMinutes: data.targetMinutes || 25,
      signature: data.signature || '',
      rank: data.rank || calculateRank(data.rewardCoins || 10),
      verdict: data.verdict || 'Nhiệm vụ hợp lý, đã được tính mức thưởng chuẩn.',
      advice: data.advice || 'Tập trung hoàn thành từng bước một.',
      isRepeatable: Boolean(isRepeatable)
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
      typeBadge.textContent = '⏳ TẬP TRUNG (HẸN GIỜ)';
      typeBadge.className = 'text-xs px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30';
    }
    if (timeBox) timeBox.classList.remove('hidden');
    if (minutesEl) minutesEl.textContent = `${currentPendingVerdict.targetMinutes} Phút`;
    if (lockedTimeBox) lockedTimeBox.classList.remove('hidden');
  } else {
    if (typeBadge) {
      typeBadge.textContent = '✓ VIỆC HOÀN THÀNH NGAY';
      typeBadge.className = 'text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30';
    }
    if (timeBox) timeBox.classList.add('hidden');
    if (lockedTimeBox) lockedTimeBox.classList.add('hidden');
  }

  const repeatText = document.getElementById('verdict-repeat-text');
  if (repeatText) {
    repeatText.textContent = currentPendingVerdict.isRepeatable ? '🔁 Lặp lại' : '🎯 Làm 1 lần';
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
    signature: currentPendingVerdict.signature || '',
    advice: currentPendingVerdict.advice,
    verdict: currentPendingVerdict.verdict,
    isRepeatable: Boolean(currentPendingVerdict.isRepeatable),
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
      headers: getAuthHeaders(),
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
      if (data.signature) currentPendingVerdict.signature = data.signature;
      if (data.newType) {
        currentPendingVerdict.type = data.newType;
      } else if (data.newTargetMinutes !== undefined) {
        currentPendingVerdict.type = data.newTargetMinutes > 0 ? 'focus' : 'bounty';
      }
      currentPendingVerdict.rank = data.newRank || calculateRank(currentPendingVerdict.rewardCoins);

      // Refresh locked specs display card and badges
      updateVerdictDisplay();

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
      headers: getAuthHeaders(),
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
      signature: data.signature || '',
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
    document.getElementById('eval-price').innerHTML = `${COIN_ICON_HTML} ${currentPendingReward.price} Vàng`;
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
      headers: getAuthHeaders(),
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
      if (data.signature) currentPendingReward.signature = data.signature;

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
      document.getElementById('eval-price').innerHTML = `${COIN_ICON_HTML} ${currentPendingReward.price} Vàng`;

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
    price: currentPendingReward.price,
    signature: currentPendingReward.signature || ''
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
      const isMe = (appState.profile.googleId && (u.key === appState.profile.googleId || u.googleId === appState.profile.googleId)) ||
                   (u.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase());
      const tr = document.createElement('tr');
      tr.className = `hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition ${isMe ? 'bg-amber-500/10 font-bold' : ''}`;

      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
      const avatarHtml = isAvatarUrl(u.avatar)
        ? `<img referrerpolicy="no-referrer" src="${escapeHtml(u.avatar)}" alt="${escapeHtml(u.nickname || 'Avatar')}" class="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 inline-block" onerror="this.onerror=null;this.outerHTML='<span class=\\'text-base sm:text-lg shrink-0\\'>⚔️</span>'">`
        : `<span class="text-base sm:text-lg shrink-0">${escapeHtml(u.avatar || '⚔️')}</span>`;

      tr.innerHTML = `
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 font-mono whitespace-nowrap ${idx < 3 ? 'text-base sm:text-lg' : 'text-slate-500'}">${medal}</td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4">
          <div class="flex items-center gap-2.5 min-w-0">
            ${avatarHtml}
            <div class="min-w-0 flex items-center flex-wrap gap-1.5">
              <span class="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[130px] sm:max-w-[200px]">${escapeHtml(u.nickname)}</span>
              ${u.role === 'admin' ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-500 text-white font-bold whitespace-nowrap">👑 ADMIN</span>' : ''}
              ${isMe ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold whitespace-nowrap">BẠN</span>' : ''}
              ${appState.profile.role === 'admin' && !isMe ? `<button class="btn-admin-del text-rose-500 hover:text-rose-700 ml-1 text-xs" data-nick="${escapeHtml(u.nickname || u.key)}" data-key="${escapeHtml(u.key || u.nickname)}" title="Xóa tài khoản này (Quyền Admin)">🗑️</button>` : ''}
            </div>
          </div>
        </td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs text-amber-600 dark:text-amber-400/90 hidden sm:table-cell whitespace-nowrap">${escapeHtml(u.title || 'Thành viên')}</td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">Lv. ${u.level || 1}</td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap"><span class="inline-flex items-center gap-1 justify-end">${COIN_ICON_HTML} ${u.totalCoinsEarned || 0}</span></td>
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

    const adminPardonBtn = document.getElementById('btn-admin-pardon');
    if (adminPardonBtn) {
      if (appState.profile.role === 'admin') {
        adminPardonBtn.classList.remove('hidden');
        adminPardonBtn.classList.add('inline-flex');
        adminPardonBtn.onclick = async () => {
          const target = prompt('👑 QUYỀN QUẢN TRỊ VIÊN:\nNhập Nickname hoặc Google ID của tài khoản cần ân xá (xóa cờ Kẻ Gian Lận, khôi phục danh hiệu & Leaderboard):');
          if (!target || !target.trim()) return;
          try {
            const token = appState.profile.googleToken || appState.profile.token || getOrCreateUserToken();
            const res = await fetch('/api/sync?action=admin_pardon', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ targetNickname: target.trim() })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              showToast(data.message || 'Ân xá tài khoản thành công!', 'success');
              fetchLeaderboard();
            } else {
              showToast(data.error || 'Không thể ân xá cho tài khoản này', 'error');
            }
          } catch (err) {
            showToast('Lỗi: ' + err.message, 'error');
          }
        };
      } else {
        adminPardonBtn.classList.add('hidden');
        adminPardonBtn.classList.remove('inline-flex');
      }
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
    const card = document.createElement('div');
    card.className = `rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between ${isCompleted ? 'opacity-70 bg-slate-100/50 dark:bg-slate-950/30' : ''}`;

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="rank-badge-${q.rank} text-xs font-mono font-black px-2.5 py-0.5 rounded-lg">HẠNG ${q.rank}</span>
            <button class="btn-toggle-repeat text-[10px] font-bold px-2 py-0.5 rounded-md border transition flex items-center gap-1 ${q.isRepeatable ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-700'}" title="Nhấn để đổi giữa Lặp lại và Làm 1 lần">
              ${q.isRepeatable ? `🔁 Lặp lại${q.completedCount ? ` (${q.completedCount})` : ''}` : '🎯 1 lần'}
            </button>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-black text-amber-600 dark:text-amber-400 font-mono inline-flex items-center gap-1">${COIN_ICON_HTML} +${q.rewardCoins}</span>
            <button class="btn-del-quest text-slate-400 hover:text-rose-500 p-1 transition leading-none text-base" title="Xóa nhiệm vụ">&times;</button>
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
          <div class="flex items-center gap-1.5 flex-wrap justify-end">
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>✓</span> Hoàn thành
            </span>
            <button class="btn-restart-quest text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-600 dark:hover:text-cyan-400 text-slate-600 dark:text-slate-300 transition flex items-center gap-1" title="Làm lại nhiệm vụ này">
              <span>🔄</span>
              <span>Làm lại</span>
            </button>
            <button class="btn-undo-quest text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400 text-slate-600 dark:text-slate-300 transition flex items-center gap-1" title="Hoàn tác trạng thái hoàn thành">
              <span>↩️</span>
              <span>Hoàn tác</span>
            </button>
          </div>
        ` : q.type === 'focus' ? `
          <button class="btn-start-focus px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95 ${isCurrentlyFocusing ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'}">
            <span>⏱️</span>
            <span>${isCurrentlyFocusing ? (isFocusRunning ? 'Đang Chạy...' : 'Tạm Dừng') : 'Bắt Đầu'}</span>
          </button>
        ` : `
          <button class="btn-complete-bounty px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95">
            <span>✓</span>
            <span>Hoàn Thành</span>
          </button>
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
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${tierColors[item.tier] || tierColors.rare}">
              ${item.tier || 'RARE'}
            </span>
            <button class="btn-del-shop-item text-slate-400 hover:text-rose-500 p-1 transition leading-none text-base" title="Xóa phần thưởng khỏi Cửa Hàng">&times;</button>
          </div>
        </div>

        <h3 class="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1 leading-snug">${escapeHtml(item.name)}</h3>
        ${item.description ? `<p class="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">${escapeHtml(item.description)}</p>` : ''}
      </div>

      <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <span class="font-mono text-sm font-black text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">${COIN_ICON_HTML} ${item.price} Vàng</span>
        <button class="btn-buy-item px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 ${canAfford ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'}">
          <span>${canAfford ? 'Đổi Quà' : 'Chưa Đủ Vàng'}</span>
        </button>
      </div>
    `;

    card.querySelector('.btn-del-shop-item').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteShopItem(item.id);
    });

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
    card.className = `rpg-panel rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 ${
      isThisActiveReward
        ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20 bg-purple-50/5 dark:bg-purple-950/20'
        : (item.isUsed ? 'bg-slate-100/50 dark:bg-slate-950/30 opacity-70' : '')
    }`;

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-3">
            <span class="text-3xl">${item.icon || '🎁'}</span>
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <h4 class="font-bold text-sm text-slate-900 dark:text-slate-100 ${item.isUsed && !isThisActiveReward ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${escapeHtml(item.name)}</h4>
                <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">⏳ ${durationMins}p</span>
                ${isThisActiveReward ? '<span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-purple-500 text-white animate-pulse">ĐANG DÙNG</span>' : ''}
              </div>
              <span class="text-[10px] text-slate-500 font-mono">Đã đổi: ${new Date(item.purchasedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button class="btn-del-inv text-slate-400 hover:text-rose-500 p-1 transition leading-none text-base" title="Xóa khỏi Kho Quà">&times;</button>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <span class="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold inline-flex items-center gap-1">${COIN_ICON_HTML} ${item.price} Vàng</span>
        ${item.isUsed ? `
          <div class="flex items-center gap-1.5 flex-wrap justify-end">
            ${isThisActiveReward ? `
              <button class="btn-scroll-timer text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1 shadow-sm shadow-purple-500/20 active:scale-95" title="Xem bộ đếm thời gian">
                <span>${isFocusRunning ? '⏱️ Đang Đếm Giờ' : '⏸️ Tạm Dừng'}</span>
              </button>
            ` : `
              <span class="text-xs font-semibold text-slate-500">Đã sử dụng</span>
            `}
            <button class="btn-undo-inv text-[11px] font-semibold px-2 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400 text-slate-600 dark:text-slate-300 transition flex items-center gap-1" title="Đánh dấu chưa sử dụng">↩️ Hoàn tác</button>
          </div>
        ` : `
          <div class="flex items-center gap-1.5">
            <button class="btn-refund-inv text-[11px] font-semibold px-2.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition" title="Hoàn trả và nhận lại Vàng">↩️ Trả quà</button>
            <button class="btn-use-inv px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white transition shadow-md shadow-purple-500/20 active:scale-95 flex items-center gap-1">
              <span>⏱️ Dùng Quà (${durationMins}p)</span>
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
      <div class="font-mono font-bold text-sm shrink-0 inline-flex items-center gap-1 ${isEarn ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}">
        <span>${isEarn ? '+' : '-'}${entry.amount}</span> ${COIN_ICON_HTML}
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
  document.querySelectorAll('.fixed[id^="modal-"]:not(#modal-welcome):not(.hidden)').forEach(m => m.classList.add('hidden'));

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
  applyTheme(appState.profile.theme || 'dark');
  renderAll();
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
        return;
      }
    }
  } catch (err) {
    console.warn('Startup sync check failed:', err.message);
  }

  openModal('modal-welcome');
  renderGoogleSignInButton();
}

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

  // Profile Modal & Avatar Picker
  document.getElementById('open-profile-btn').addEventListener('click', () => {
    document.getElementById('input-hero-nickname').value = appState.profile.nickname;

    const roleBadge = document.getElementById('profile-role-badge');
    if (roleBadge) {
      const isAdmin = appState.profile.role === 'admin';
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
    sfx.playClick();
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
        if (modal.id === 'modal-confirm') {
          closeConfirmDialog(false);
          return;
        }
        if (modal.id === 'tour-overlay') {
          // Không tắt tour khi chạm vào vùng overlay (tránh bấm nhầm)
          return;
        }
        if (modal.id === 'modal-welcome') {
          // Bắt buộc hoàn tất bước đầu tiên: không cho đóng khi click ra ngoài
          showToast('Vui lòng đăng nhập bằng Google để tiếp tục!', 'info');
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

  // Chặn phím Escape đóng modal-welcome khi chưa hoàn tất bước đầu; đóng tour và modal-confirm an toàn
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isTourActive) {
        e.preventDefault();
        finishTour(false);
        return;
      }
      const confirmModal = document.getElementById('modal-confirm');
      if (confirmModal && !confirmModal.classList.contains('hidden')) {
        e.preventDefault();
        closeConfirmDialog(false);
        return;
      }
      const welcome = document.getElementById('modal-welcome');
      const isOnboarded = checkIsOnboarded();
      if (!isOnboarded && welcome && !welcome.classList.contains('hidden')) {
        e.preventDefault();
        return;
      }
      document.querySelectorAll('.fixed[id^="modal-"]:not(#modal-welcome):not(.hidden)').forEach(m => m.classList.add('hidden'));
    }
  });
});
