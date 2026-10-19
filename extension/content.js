// =============================================================================
// LevelUp Focus Shield — Bridge Content Script
// Connects Web App Pomodoro Timer with Chrome Extension Background Service Worker
// =============================================================================

(() => {
  console.log('[LevelUp Shield] Content script initialized on LevelUp web app.');

  function broadcastExtensionVersion() {
    try {
      const extVersion = chrome.runtime?.getManifest?.()?.version || '1.5.4';
      document.documentElement.dataset.levelupExtensionInstalled = 'true';
      document.documentElement.dataset.levelupExtensionVersion = extVersion;
      window.__LEVELUP_EXTENSION_INSTALLED__ = true;
      window.__LEVELUP_EXTENSION_VERSION__ = extVersion;
      window.dispatchEvent(new CustomEvent('levelup:extension-installed', { detail: { installed: true, version: extVersion } }));
      document.dispatchEvent(new CustomEvent('levelup:extension-installed', { detail: { installed: true, version: extVersion } }));
      window.postMessage({
        type: 'LEVELUP_EXTENSION_VERSION_REPORT',
        installed: true,
        version: extVersion
      }, '*');
    } catch (_) {}
  }

  broadcastExtensionVersion();

  // Tự động kích hoạt nạp lại extension khi được gọi từ script cài đặt tự động terminal (?reload_shield=1)
  try {
    if (typeof window !== 'undefined' && window.location?.search?.includes('reload_shield=1')) {
      chrome.runtime?.sendMessage?.({ type: 'SELF_RELOAD_EXTENSION' }, () => {
        if (!chrome.runtime.lastError) {
          console.log('[LevelUp Shield] Triggered self reload from CLI installer.');
          try {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('reload_shield');
            window.history.replaceState({}, '', cleanUrl.toString());
          } catch (_) {}
        }
      });
    }
  } catch (_) {}

  try {
    if (chrome.runtime?.id && typeof window !== 'undefined' && window.location?.origin) {
      chrome.runtime.sendMessage({
        type: 'REGISTER_WEBAPP_URL',
        url: window.location.origin
      }, () => {
        if (chrome.runtime.lastError) {}
      });
    }
  } catch (_) {}

  let lastSyncedStateStr = '';

  // Function to forward timer state to extension background
  function syncTimerToExtension(timerState) {
    if (!timerState || !chrome.runtime?.id) return;
    
    const signature = `${timerState.isRunning}_${timerState.isBreakMode}_${timerState.questId}_${Math.floor((timerState.remainingSeconds || 0) / 10)}`;
    if (signature === lastSyncedStateStr) return;
    lastSyncedStateStr = signature;

    try {
      chrome.runtime.sendMessage({
        type: 'TIMER_STATE_CHANGED',
        state: timerState
      }, (res) => {
        if (chrome.runtime.lastError) {
          // Extension might have reloaded
        } else {
          console.log('[LevelUp Shield] Timer state synced successfully:', timerState.isRunning ? 'RUNNING' : 'STOPPED');
        }
      });
    } catch (_) {}
  }

  // Helper to extract active quest details from LevelUp app state
  function readCurrentTimer() {
    try {
      const raw = localStorage.getItem('levelup_focus_timer');
      if (!raw) return { isRunning: false };
      const parsed = JSON.parse(raw);

      let questTitle = 'Phiên Tập Trung';
      let questIcon = '⚔️';
      let questRank = 'C';
      let rewardCoins = 12;

      try {
        const stateRaw = localStorage.getItem('levelup_state_v2') || localStorage.getItem('levelup_state_v1');
        if (stateRaw) {
          const stateObj = JSON.parse(stateRaw);
          if (parsed.questId && Array.isArray(stateObj.quests)) {
            const found = stateObj.quests.find(q => q.id === parsed.questId);
            if (found) {
              questTitle = found.title || questTitle;
              questIcon = found.icon || questIcon;
              questRank = found.rank || questRank;
              rewardCoins = found.rewardCoins || rewardCoins;
            }
          }
        }
      } catch (_) {}

      return {
        ...parsed,
        questTitle,
        questIcon,
        questRank,
        rewardCoins
      };
    } catch (_) {
      return { isRunning: false };
    }
  }

  // 1. Initial Sync on load
  const initialTimer = readCurrentTimer();
  syncTimerToExtension(initialTimer);

  // 2. Direct postMessage broadcast from Web App
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'LEVELUP_CHECK_EXTENSION_VERSION') {
      broadcastExtensionVersion();
    } else if (event.data && event.data.type === 'LEVELUP_TIMER_STATE_BROADCAST') {
      const state = event.data.state || readCurrentTimer();
      syncTimerToExtension(state);
    } else if (event.data && event.data.type === 'LEVELUP_FOCUS_COMPLETED') {
      try {
        chrome.runtime.sendMessage({
          type: 'FOCUS_SESSION_COMPLETED',
          detail: event.data.detail || {}
        }, () => {
          if (chrome.runtime.lastError) {}
        });
      } catch (_) {}
    }
  });

  // 3. BroadcastChannel listener
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('levelup_sync_channel');
      channel.onmessage = (event) => {
        if (event.data && (event.data.type === 'TIMER_SYNC_UPDATE' || event.data.type === 'LEVELUP_STATE_SYNC')) {
          const state = readCurrentTimer();
          syncTimerToExtension(state);
        }
      };
    } catch (_) {}
  }

  // 4. Storage event listener (across tabs)
  window.addEventListener('storage', (event) => {
    if (event.key === 'levelup_focus_timer') {
      const state = readCurrentTimer();
      syncTimerToExtension(state);
    }
  });

  // 5. Periodic heartbeat sync (every 1 second) to guarantee zero desync
  setInterval(() => {
    const state = readCurrentTimer();
    syncTimerToExtension(state);
  }, 1000);

  // 6. Lắng nghe lệnh từ background script (chuyển tab)
  if (chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || typeof message !== 'object') return;
      if (message.type === 'SWITCH_TO_TAB' && message.tab) {
        window.postMessage({ type: 'LEVELUP_SWITCH_TAB', tab: message.tab }, '*');
        sendResponse?.({ received: true });
      }
    });
  }
})();


