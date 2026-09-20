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
