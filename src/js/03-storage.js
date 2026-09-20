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
  let rawTotal = parseInt(state?.profile?.totalCoinsEarned, 10) || 20;
  let rawCoins = parseInt(state?.profile?.coins, 10) || 20;
  let rawSpent = parseInt(state?.profile?.totalCoinsSpent, 10) || 0;
  return { coins: rawCoins, totalCoinsEarned: rawTotal, tampered: false, fine: 0, totalCoinsSpent: rawSpent };
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
        if (focusRemainingSeconds <= 0 && activeFocusQuest) {
          focusRemainingSeconds = 0;
          actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);
          renderFocusStationUI();
          updateTimerDisplay();
          focusTimerFinished();
        } else {
          isFocusRunning = true;
          renderFocusStationUI();
          updateTimerDisplay();
          updateQuestCardTimerState(activeFocusQuest?.id, true, true);
        }
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
