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
      appState = {
        ...DEFAULT_STATE,
        ...result.data,
        profile: {
          ...DEFAULT_STATE.profile,
          ...(result.data.profile || {}),
          token // retain device token
        }
      };
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

    // Cập nhật toàn bộ dữ liệu người dùng (giữ nguyên tên hiển thị gốc nếu có)
    const displayNickname = resData.data?.profile?.nickname || resData.nickname;
    appState = {
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
    };
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
// 5. FOCUS POMODORO COUNTDOWN TIMER
// =============================================================================
let activeFocusQuest = null;
let focusTimerInterval = null;
let focusRemainingSeconds = 0;
let isFocusRunning = false;

function startFocusTimer(quest) {
  if (activeFocusQuest && activeFocusQuest.id !== quest.id) {
    if (!confirm('Bạn đang có một nhiệm vụ tập trung khác đang chạy. Bạn có muốn hủy nó để bắt đầu nhiệm vụ này?')) {
      return;
    }
  }

  activeFocusQuest = quest;
  focusRemainingSeconds = (quest.targetMinutes || 25) * 60;
  isFocusRunning = true;

  const banner = document.getElementById('active-focus-banner');
  const titleEl = document.getElementById('timer-quest-title');
  const rankEl = document.getElementById('timer-quest-rank');
  const toggleBtn = document.getElementById('btn-timer-toggle');

  if (banner) banner.classList.remove('hidden');
  if (titleEl) titleEl.textContent = quest.title;
  if (rankEl) {
    rankEl.textContent = `RANK ${quest.rank}`;
    rankEl.className = `rank-badge-${quest.rank} text-[10px] px-1.5 py-0.5 rounded font-bold font-mono`;
  }
  if (toggleBtn) toggleBtn.textContent = 'Tạm Dừng';

  clearInterval(focusTimerInterval);
  updateTimerDisplay();

  focusTimerInterval = setInterval(() => {
    if (!isFocusRunning) return;
    focusRemainingSeconds--;
    updateTimerDisplay();

    if (focusRemainingSeconds <= 0) {
      clearInterval(focusTimerInterval);
      focusTimerFinished();
    }
  }, 1000);

  sfx.playGong();
  showToast(`Bắt đầu đồng hồ tập trung: ${quest.targetMinutes} phút! Chúc bạn tập trung cao độ.`, 'info');
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  const mins = Math.floor(focusRemainingSeconds / 60);
  const secs = focusRemainingSeconds % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  if (display) display.textContent = timeStr;
  document.title = isFocusRunning ? `(${timeStr}) ${activeFocusQuest?.title || 'LevelUp'}` : 'LevelUp — Biến Công Việc & Thói Quen Thành Trò Chơi';
}

function toggleFocusTimer() {
  isFocusRunning = !isFocusRunning;
  const toggleBtn = document.getElementById('btn-timer-toggle');
  if (toggleBtn) toggleBtn.textContent = isFocusRunning ? 'Tạm Dừng' : 'Tiếp Tục';
}

function resetFocusTimer() {
  if (confirm('Bạn có chắc muốn dừng phiên tập trung này? Thời gian đã đếm sẽ không được tính.')) {
    clearInterval(focusTimerInterval);
    activeFocusQuest = null;
    isFocusRunning = false;
    document.title = 'LevelUp — Biến Công Việc & Thói Quen Thành Trò Chơi';
    const banner = document.getElementById('active-focus-banner');
    if (banner) banner.classList.add('hidden');
  }
}

function focusTimerFinished() {
  sfx.playFanfare();
  sfx.playGong();
  document.title = '🎉 Hoàn thành tập trung!';
  alert(`🔔 HẾT GIỜ TẬP TRUNG!\n\nChúc mừng bạn đã xuất sắc hoàn thành ${activeFocusQuest.targetMinutes} phút tập trung cao độ! Vàng thưởng đã được cộng vào tài khoản của bạn.`);

  if (activeFocusQuest) {
    completeQuest(activeFocusQuest.id);
  }
  const banner = document.getElementById('active-focus-banner');
  if (banner) banner.classList.add('hidden');
  activeFocusQuest = null;
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
  showToast(`Đổi quà thành công! "${item.name}" đã được chuyển vào Kho Quà Của Tôi.`, 'success');
  triggerSave(true);
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
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'evaluate_quest',
        payload: {
          title,
          description: desc,
          userEstimateCoins: estimate
        }
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.details || err.error || 'AI Server Error');
    }

    const data = await res.json();
    currentPendingVerdict = {
      title,
      description: desc,
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

  if (currentPendingVerdict.type === 'focus') {
    typeBadge.textContent = '⏳ TẬP TRUNG (HẸN GIỜ)';
    typeBadge.className = 'text-xs px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30';
    timeBox.classList.remove('hidden');
    minutesEl.textContent = `${currentPendingVerdict.targetMinutes} Phút`;
  } else {
    typeBadge.textContent = '✓ VIỆC HOÀN THÀNH NGAY';
    typeBadge.className = 'text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30';
    timeBox.classList.add('hidden');
  }

  document.getElementById('verdict-coins').textContent = `🪙 ${currentPendingVerdict.rewardCoins} Vàng`;
  document.getElementById('verdict-speech').textContent = `"${currentPendingVerdict.verdict}"`;
  document.getElementById('verdict-advice').textContent = currentPendingVerdict.advice;

  document.getElementById('debate-container').classList.add('hidden');
  document.getElementById('debate-chat-logs').innerHTML = '';
}

function acceptVerdictAndCreateQuest() {
  if (!currentPendingVerdict) return;

  const newQuest = {
    id: 'q_' + Date.now(),
    title: currentPendingVerdict.title,
    description: currentPendingVerdict.description,
    type: currentPendingVerdict.type,
    rank: currentPendingVerdict.rank,
    rewardCoins: currentPendingVerdict.rewardCoins,
    targetMinutes: currentPendingVerdict.targetMinutes,
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
  userBubble.className = 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-2 rounded-lg text-xs ml-4 sm:ml-6 border border-slate-200 dark:border-slate-700 shadow-sm';
  userBubble.textContent = `Bạn: ${argument}`;
  chatLogs.appendChild(userBubble);
  argInput.value = '';
  chatLogs.scrollTop = chatLogs.scrollHeight;

  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'bg-amber-50 dark:bg-slate-900 text-amber-700 dark:text-amber-300/90 p-2 rounded-lg text-xs mr-4 sm:mr-6 italic border border-amber-200 dark:border-slate-800';
  loadingBubble.textContent = 'AI đang xem xét đề xuất thương lượng của bạn...';
  chatLogs.appendChild(loadingBubble);
  chatLogs.scrollTop = chatLogs.scrollHeight;

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'debate_quest',
        payload: {
          quest: currentPendingVerdict,
          argument,
          history: currentDebateHistory
        }
      })
    });

    if (!res.ok) throw new Error('AI Error');
    const data = await res.json();
    loadingBubble.remove();

    const aiBubble = document.createElement('div');
    aiBubble.className = `p-2 rounded-lg text-xs mr-4 sm:mr-6 border ${data.accepted ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 font-medium' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`;
    aiBubble.innerHTML = `<strong>AI Phản Hồi:</strong> ${data.reply}`;
    chatLogs.appendChild(aiBubble);
    chatLogs.scrollTop = chatLogs.scrollHeight;

    currentDebateHistory.push({ user: argument, arbiter: data.reply });

    if (data.accepted && data.newRewardCoins) {
      currentPendingVerdict.rewardCoins = data.newRewardCoins;
      if (data.newTargetMinutes) currentPendingVerdict.targetMinutes = data.newTargetMinutes;
      currentPendingVerdict.rank = calculateRank(currentPendingVerdict.rewardCoins);

      document.getElementById('verdict-coins').textContent = `🪙 ${currentPendingVerdict.rewardCoins} Vàng`;
      const rankBadge = document.getElementById('verdict-rank');
      rankBadge.textContent = `HẠNG ${currentPendingVerdict.rank}`;
      rankBadge.className = `rank-badge-${currentPendingVerdict.rank} text-xs font-mono font-black px-2.5 py-1 rounded-lg`;
      showToast(`Thương lượng thành công! Mức thưởng đã tăng lên ${data.newRewardCoins} Vàng!`, 'gold');
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
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'evaluate_reward',
        payload: { name, description: desc }
      })
    });

    if (!res.ok) throw new Error('AI Error');
    const data = await res.json();

    currentPendingReward = {
      id: 'shop_' + Date.now(),
      name,
      description: desc,
      price: data.price || 30,
      tier: data.tier || 'rare',
      icon: data.icon || '🎁',
      verdict: data.verdict || 'Phần thưởng đã được định giá phù hợp.'
    };

    evalBox.classList.remove('hidden');
    document.getElementById('eval-tier').textContent = currentPendingReward.tier.toUpperCase();
    document.getElementById('eval-price').textContent = `🪙 ${currentPendingReward.price} Vàng`;
    document.getElementById('eval-verdict').textContent = `"${currentPendingReward.verdict}"`;

    btnEval.classList.add('hidden');
    btnSave.classList.remove('hidden');
    sfx.playClick();
  } catch (err) {
    showToast('Lỗi thẩm định: ' + err.message, 'error');
    btnEval.textContent = '🤖 AI Định Giá Vàng';
    btnEval.disabled = false;
  }
}

function savePendingReward() {
  if (!currentPendingReward) return;
  appState.shopItems.unshift(currentPendingReward);
  sfx.playFanfare();
  showToast(`Đã thêm món "${currentPendingReward.name}" vào Cửa Hàng!`, 'success');
  closeModal('modal-reward');
  triggerSave(true);
}

// =============================================================================
// 10. AI QUEST SUGGESTIONS
// =============================================================================
let activeCategory = 'Học tập chuyên sâu & Ôn thi';

async function generateQuestSuggestions() {
  const goal = document.getElementById('input-suggest-goal').value.trim();
  const listEl = document.getElementById('suggested-quest-list');
  const btnGen = document.getElementById('btn-generate-suggestions');

  btnGen.disabled = true;
  btnGen.textContent = 'AI đang suy nghĩ...';
  listEl.innerHTML = '<div class="text-center py-6 text-xs text-amber-600 dark:text-amber-300 animate-pulse font-medium">✨ AI đang soạn danh sách nhiệm vụ phù hợp với bạn...</div>';

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'suggest_quests',
        payload: {
          category: activeCategory,
          customGoal: goal
        }
      })
    });

    if (!res.ok) throw new Error('AI error');
    const data = await res.json();
    const quests = data.quests || [];

    listEl.innerHTML = '';
    quests.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center gap-3 hover:border-amber-500/40 shadow-sm transition';
      card.innerHTML = `
        <div class="flex-1">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="rank-badge-${q.rank || 'C'} text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">HẠNG ${q.rank || 'C'}</span>
            <span class="text-xs font-bold text-slate-900 dark:text-slate-200">${escapeHtml(q.title)}</span>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">${escapeHtml(q.description)}</p>
          <div class="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-mono">
            <span>${q.type === 'focus' ? `⏳ ${q.targetMinutes}p Tập trung` : '✓ Làm ngay'}</span>
            <span>•</span>
            <span class="text-amber-600 dark:text-amber-400 font-bold">🪙 ${q.rewardCoins} Vàng</span>
          </div>
        </div>
        <button class="btn-accept-suggestion px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 transition active:scale-95 shadow-sm">
          Nhận Việc
        </button>
      `;

      card.querySelector('.btn-accept-suggestion').addEventListener('click', () => {
        const newQuest = {
          id: 'q_' + Date.now() + '_' + idx,
          title: q.title,
          description: q.description,
          type: q.type || 'focus',
          rank: q.rank || 'C',
          rewardCoins: q.rewardCoins || 12,
          targetMinutes: q.targetMinutes || 25,
          advice: 'Chúc bạn hoàn thành tốt nhiệm vụ này!',
          verdict: 'Nhiệm vụ được AI gợi ý theo mục tiêu của bạn.',
          status: 'active',
          createdAt: Date.now()
        };
        appState.quests.unshift(newQuest);
        sfx.playClick();
        showToast(`Đã nhận nhiệm vụ: "${q.title}"!`, 'success');
        closeModal('modal-suggest');
        triggerSave(true);
      });

      listEl.appendChild(card);
    });

    btnGen.textContent = '✨ Gợi Ý Thêm';
    btnGen.disabled = false;
  } catch (err) {
    listEl.innerHTML = `<div class="text-xs text-rose-500 text-center py-4">Lỗi: ${err.message}</div>`;
    btnGen.textContent = 'Thử lại';
    btnGen.disabled = false;
  }
}

// =============================================================================
// 11. LEADERBOARD FETCHER
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
            ${appState.profile.role === 'admin' && !isMe ? `<button class="btn-admin-del text-rose-500 hover:text-rose-700 ml-2 text-xs" data-nick="${escapeHtml(u.nickname)}" title="Xóa tài khoản này (Quyền Admin)">🗑️</button>` : ''}
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
  soundBtn.textContent = p.soundEnabled ? '🔊' : '🔇';
  sfx.enabled = p.soundEnabled;

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

        ${q.verdict ? `
          <div class="p-2.5 rounded-xl sub-panel mb-3 text-[11px] text-amber-900 dark:text-amber-200/90 italic font-serif">
            "${escapeHtml(q.verdict)}"
          </div>
        ` : ''}
      </div>

      <div class="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <span class="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
          ${q.type === 'focus' ? `⏳ ${q.targetMinutes}p Tập trung` : '✓ Làm ngay'}
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

  grid.innerHTML = '';
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

        ${item.verdict ? `
          <div class="p-2.5 rounded-xl sub-panel mb-3 text-[11px] text-amber-900 dark:text-amber-200/90 italic font-serif">
            "${escapeHtml(item.verdict)}"
          </div>
        ` : ''}
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
function switchTab(tabId) {
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

  // Sound FX Toggle Button
  document.getElementById('toggle-sound-btn').addEventListener('click', () => {
    appState.profile.soundEnabled = !appState.profile.soundEnabled;
    sfx.enabled = appState.profile.soundEnabled;
    renderHeader();
    if (sfx.enabled) sfx.playCoin();
    triggerSave(false);
  });

  // Pomodoro Banner buttons
  document.getElementById('btn-timer-toggle').addEventListener('click', toggleFocusTimer);
  document.getElementById('btn-timer-reset').addEventListener('click', resetFocusTimer);

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
    document.getElementById('quest-form-step').classList.remove('hidden');
    document.getElementById('quest-evaluating-step').classList.add('hidden');
    document.getElementById('quest-verdict-step').classList.add('hidden');
    document.getElementById('input-quest-title').value = '';
    document.getElementById('input-quest-desc').value = '';
    document.getElementById('input-quest-estimate').value = '';
    openModal('modal-quest');
  };
  document.getElementById('btn-open-add-quest').addEventListener('click', openQuestHandler);
  const mobileAddQuestBtn = document.getElementById('btn-open-add-quest-mobile');
  if (mobileAddQuestBtn) mobileAddQuestBtn.addEventListener('click', openQuestHandler);

  document.getElementById('btn-submit-to-ai').addEventListener('click', submitQuestToAI);
  document.getElementById('btn-accept-verdict').addEventListener('click', acceptVerdictAndCreateQuest);

  // Debate features
  document.getElementById('btn-open-debate').addEventListener('click', () => {
    const debateBox = document.getElementById('debate-container');
    debateBox.classList.toggle('hidden');
  });
  document.getElementById('btn-send-debate').addEventListener('click', sendDebateArgument);
  document.getElementById('input-debate-arg').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendDebateArgument();
  });

  // Open Shop Reward Modal
  document.getElementById('btn-open-add-reward').addEventListener('click', () => {
    document.getElementById('input-reward-name').value = '';
    document.getElementById('input-reward-desc').value = '';
    document.getElementById('reward-eval-box').classList.add('hidden');
    document.getElementById('btn-eval-reward').classList.remove('hidden');
    document.getElementById('btn-eval-reward').disabled = false;
    document.getElementById('btn-eval-reward').textContent = '🤖 AI Định Giá Vàng';
    document.getElementById('btn-save-reward').classList.add('hidden');
    openModal('modal-reward');
  });

  document.getElementById('btn-eval-reward').addEventListener('click', evaluateRewardItem);
  document.getElementById('btn-save-reward').addEventListener('click', savePendingReward);

  // AI Quest Suggestions Modal (Desktop & Mobile buttons)
  const openSuggestHandler = () => {
    openModal('modal-suggest');
  };
  document.getElementById('btn-suggest-quests').addEventListener('click', openSuggestHandler);
  const mobileSuggestBtn = document.getElementById('btn-suggest-quests-mobile');
  if (mobileSuggestBtn) mobileSuggestBtn.addEventListener('click', openSuggestHandler);

  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => {
        b.className = 'cat-btn p-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition';
      });
      btn.className = 'cat-btn active p-2.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-left transition';
      activeCategory = btn.dataset.cat;
    });
  });

  document.getElementById('btn-generate-suggestions').addEventListener('click', generateQuestSuggestions);

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
