// =============================================================================
// LevelUp Focus Shield — Service Worker (Manifest V3)
// =============================================================================

const DEFAULT_BLACKLIST = [
  'facebook.com',
  'youtube.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'reddit.com',
  'netflix.com',
  'twitch.tv',
  'discord.com',
  'bilibili.com',
  'threads.net',
  'shopee.vn',
  'lazada.vn'
];

// Helper to check if a URL matches any blocked domain
function isDomainBlocked(urlStr, blacklist = [], whitelist = []) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  // Ignore browser internal schemes
  if (urlStr.startsWith('chrome') || urlStr.startsWith('about:') || urlStr.startsWith('edge:')) return false;
  if (urlStr.includes('/blocked/blocked.html')) return false;

  try {
    const url = new URL(urlStr);
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith('www.')) hostname = hostname.slice(4);

    // Check whitelist first
    for (const w of (whitelist || [])) {
      let cleanW = String(w).trim().toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '');
      if (cleanW && (hostname === cleanW || hostname.endsWith('.' + cleanW))) {
        return false;
      }
    }

    // Check blacklist
    for (const b of (blacklist || [])) {
      let cleanB = String(b).trim().toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '');
      if (cleanB && (hostname === cleanB || hostname.endsWith('.' + cleanB))) {
        return true;
      }
    }
  } catch (_) {
    return false;
  }
  return false;
}

// Broadcast message to all open tabs
async function broadcastToAllTabs(msg) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) {
      if (t.id) {
        chrome.tabs.sendMessage(t.id, msg).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[LevelUp Shield] Failed to broadcast to tabs:', err);
  }
}

// Redirect all already-open tabs that are currently on blocked domains (only when blockMode === 'redirect')
async function scanAndRedirectOpenTabs(blacklist, whitelist, blockMode = 'redirect') {
  if (blockMode !== 'redirect') return;
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && isDomainBlocked(tab.url, blacklist, whitelist)) {
        console.log(`[LevelUp Shield] Redirecting existing tab: ${tab.url}`);
        await chrome.tabs.update(tab.id, {
          url: chrome.runtime.getURL('blocked/blocked.html?blockedUrl=' + encodeURIComponent(tab.url))
        });
      }
    }
  } catch (err) {
    console.warn('[LevelUp Shield] Error scanning open tabs:', err);
  }
}

// Initialize default storage on install or startup
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get([
    'blacklist',
    'whitelist',
    'isShieldActive',
    'focusState',
    'blockedCountToday',
    'strictMode',
    'mascotEnabled',
    'soundEnabled',
    'blockMode'
  ]);

  const initialBlacklist = Array.isArray(data.blacklist) && data.blacklist.length > 0 
    ? data.blacklist 
    : DEFAULT_BLACKLIST;

  const blockMode = data.blockMode || 'in_page_alert';
  const mascotEnabled = typeof data.mascotEnabled === 'boolean' ? data.mascotEnabled : true;
  const soundEnabled = typeof data.soundEnabled === 'boolean' ? data.soundEnabled : true;

  await chrome.storage.local.set({
    blacklist: initialBlacklist,
    whitelist: Array.isArray(data.whitelist) ? data.whitelist : [],
    isShieldActive: Boolean(data.isShieldActive),
    focusState: data.focusState || null,
    blockedCountToday: typeof data.blockedCountToday === 'number' ? data.blockedCountToday : 0,
    strictMode: Boolean(data.strictMode),
    mascotEnabled: mascotEnabled,
    soundEnabled: soundEnabled,
    blockMode: blockMode
  });

  // Auto-inject content.js into any currently open LevelUp tabs
  try {
    const existingTabs = await chrome.tabs.query({
      url: ['http://localhost/*', 'http://127.0.0.1/*', 'https://*.vercel.app/*']
    });
    for (const t of existingTabs) {
      if (t.id) {
        await chrome.scripting.executeScript({
          target: { tabId: t.id },
          files: ['content.js']
        }).catch(() => {});
      }
    }
  } catch (_) {}

  // Auto-inject capsule.js into all open web tabs
  await injectCapsuleIntoAllTabs();

  // Ensure DNR rules match current shield state
  await applyDnrRules(Boolean(data.isShieldActive), initialBlacklist, data.whitelist || [], blockMode);
  await updateBadge(Boolean(data.isShieldActive), data.focusState);
});


// Auto-inject capsule.js into all open web tabs
async function injectCapsuleIntoAllTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) {
      if (t.id && t.url && (t.url.startsWith('http://') || t.url.startsWith('https://'))) {
        const u = t.url.toLowerCase();
        if (!u.includes('localhost') && !u.includes('127.0.0.1') && !u.includes('vercel.app')) {
          await chrome.scripting.executeScript({
            target: { tabId: t.id },
            files: ['capsule.js']
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('[LevelUp Shield] Error auto-injecting capsule:', err);
  }
}

// Update Declarative Net Request Dynamic Rules
async function applyDnrRules(isActive, blacklist = [], whitelist = [], blockMode = 'redirect') {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);

    // If shield is not active or blockMode is not 'redirect'
    if (!isActive || blockMode !== 'redirect' || !Array.isArray(blacklist) || blacklist.length === 0) {
      if (removeRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: removeRuleIds,
          addRules: []
        });
      }
      return;
    }

    const whitelistSet = new Set(
      (whitelist || []).map(d => String(d).trim().toLowerCase())
    );

    const addRules = [];
    let ruleId = 1000;

    for (const domain of blacklist) {
      const cleanDomain = String(domain).trim().toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '');
      if (!cleanDomain || whitelistSet.has(cleanDomain)) continue;

      addRules.push({
        id: ruleId++,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            extensionPath: '/blocked/blocked.html'
          }
        },
        condition: {
          urlFilter: `||${cleanDomain}`,
          resourceTypes: ['main_frame']
        }
      });
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeRuleIds,
      addRules: addRules
    });
    console.log(`[LevelUp Shield] Active DNR rules updated: ${addRules.length} rules.`);
  } catch (err) {
    console.error('[LevelUp Shield] Failed to apply DNR rules:', err);
  }
}

// Layer 2 Fallback: Navigation listener via chrome.tabs.onUpdated
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const targetUrl = changeInfo.url || tab.url;
  if (!targetUrl) return;

  const { isShieldActive, blacklist, whitelist, blockMode } = await chrome.storage.local.get([
    'isShieldActive',
    'blacklist',
    'whitelist',
    'blockMode'
  ]);

  if (isShieldActive && (blockMode === 'redirect')) {
    if (isDomainBlocked(targetUrl, blacklist || DEFAULT_BLACKLIST, whitelist || [])) {
      console.log(`[LevelUp Shield] onUpdated intercepted blocked URL: ${targetUrl}`);
      await chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL('blocked/blocked.html?blockedUrl=' + encodeURIComponent(targetUrl))
      });
      return;
    }
  }

  // Ensure capsule is injected into the updated tab
  if (changeInfo.status === 'complete' && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
    const u = targetUrl.toLowerCase();
    if (!u.includes('localhost') && !u.includes('127.0.0.1') && !u.includes('vercel.app')) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['capsule.js']
      }).catch(() => {});
    }
  }
});

// Update Extension Action Badge
async function updateBadge(isActive, focusState) {
  try {
    if (!chrome.action) return;

    if (!isActive) {
      await chrome.action.setBadgeText({ text: '' });
      return;
    }

    if (focusState && typeof focusState.remainingSeconds === 'number' && focusState.remainingSeconds > 0) {
      const mins = Math.max(1, Math.ceil(focusState.remainingSeconds / 60));
      await chrome.action.setBadgeText({ text: `${mins}m` });
    } else {
      await chrome.action.setBadgeText({ text: 'ON' });
    }

    await chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' }); // Material Indigo
  } catch (err) {
    console.error('[LevelUp Shield] Failed to update badge:', err);
  }
}

// Handle State Sync from Web App or Popup
async function handleTimerSync(state) {
  if (!state) return;

  const isRunning = Boolean(state.isRunning);
  const isBreakMode = Boolean(state.isBreakMode);
  // Shield is active ONLY during work focus, not during break
  const shouldShield = isRunning && !isBreakMode;

  const storage = await chrome.storage.local.get(['blacklist', 'whitelist', 'strictMode', 'blockMode']);
  const blacklist = storage.blacklist || DEFAULT_BLACKLIST;
  const whitelist = storage.whitelist || [];
  const blockMode = storage.blockMode || 'in_page_alert';

  const focusState = {
    isRunning: isRunning,
    isBreakMode: isBreakMode,
    questTitle: state.questTitle || state.title || 'Phiên Tập Trung',
    questIcon: state.questIcon || state.icon || '⚔️',
    remainingSeconds: Math.max(0, Math.round(Number(state.remainingSeconds) || 0)),
    totalSeconds: Math.max(0, Math.round(Number(state.totalSeconds) || 1500)),
    rewardCoins: state.rewardCoins || 12,
    updatedAt: Date.now()
  };

  await chrome.storage.local.set({
    isShieldActive: shouldShield,
    focusState: focusState
  });

  await applyDnrRules(shouldShield, blacklist, whitelist, blockMode);
  await updateBadge(shouldShield, focusState);

  // If shield just activated, scan and redirect open tabs if in redirect mode
  if (shouldShield) {
    await scanAndRedirectOpenTabs(blacklist, whitelist, blockMode);
    await injectCapsuleIntoAllTabs();
    chrome.alarms.create('levelup_heartbeat', { periodInMinutes: 0.1 });
  } else {
    await chrome.alarms.clear('levelup_heartbeat');
  }
}

// Alarm listener for background countdown sync
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'levelup_heartbeat') return;

  const data = await chrome.storage.local.get(['isShieldActive', 'focusState', 'blacklist', 'whitelist', 'blockMode']);
  if (!data.isShieldActive || !data.focusState || !data.focusState.isRunning) {
    await chrome.alarms.clear('levelup_heartbeat');
    return;
  }

  const elapsed = Math.floor((Date.now() - (data.focusState.updatedAt || Date.now())) / 1000);
  const currentRemaining = Math.max(0, (data.focusState.remainingSeconds || 0) - elapsed);

  if (currentRemaining <= 0) {
    // Focus period expired
    const updatedState = { ...data.focusState, isRunning: false, remainingSeconds: 0 };
    await chrome.storage.local.set({
      isShieldActive: false,
      focusState: updatedState
    });
    const blockMode = data.blockMode || 'in_page_alert';
    await applyDnrRules(false, data.blacklist, data.whitelist, blockMode);
    await updateBadge(false, updatedState);
    await chrome.alarms.clear('levelup_heartbeat');

    // Broadcast focus session completion to all open tabs for 8-bit fireworks!
    await broadcastToAllTabs({
      type: 'FOCUS_SESSION_COMPLETED',
      detail: {
        questTitle: data.focusState.questTitle || 'Phiên Tập Trung',
        rewardCoins: data.focusState.rewardCoins || 12
      }
    });
  } else {
    await updateBadge(true, { ...data.focusState, remainingSeconds: currentRemaining });
  }
});

// Runtime Message Passing Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (!message || !message.type) {
        sendResponse({ success: false, error: 'Invalid message' });
        return;
      }

      switch (message.type) {
        case 'TIMER_STATE_CHANGED': {
          await handleTimerSync(message.state);
          sendResponse({ success: true, isShieldActive: Boolean(message.state?.isRunning && !message.state?.isBreakMode) });
          break;
        }

        case 'FOCUS_SESSION_COMPLETED': {
          // Web app notified focus completion
          await broadcastToAllTabs({
            type: 'FOCUS_SESSION_COMPLETED',
            detail: message.detail || {}
          });
          sendResponse({ success: true });
          break;
        }

        case 'TRIGGER_TEST_FIREWORKS': {
          // Testing fireworks trigger
          await broadcastToAllTabs({
            type: 'FOCUS_SESSION_COMPLETED',
            detail: {
              questTitle: 'Luyện Kiếm Hoàn Tất',
              rewardCoins: 12,
              isTest: true
            }
          });
          sendResponse({ success: true });
          break;
        }

        case 'GET_STATUS': {
          const state = await chrome.storage.local.get([
            'isShieldActive',
            'focusState',
            'blacklist',
            'whitelist',
            'blockedCountToday',
            'strictMode',
            'mascotEnabled',
            'soundEnabled',
            'blockMode'
          ]);
          sendResponse({ success: true, data: state });
          break;
        }

        case 'UPDATE_SETTINGS': {
          const toUpdate = {};
          if (typeof message.mascotEnabled === 'boolean') toUpdate.mascotEnabled = message.mascotEnabled;
          if (typeof message.soundEnabled === 'boolean') toUpdate.soundEnabled = message.soundEnabled;
          if (message.blockMode) toUpdate.blockMode = message.blockMode;
          if (typeof message.strictMode === 'boolean') toUpdate.strictMode = message.strictMode;
          await chrome.storage.local.set(toUpdate);

          const current = await chrome.storage.local.get(['isShieldActive', 'blacklist', 'whitelist', 'blockMode']);
          const blockMode = current.blockMode || 'in_page_alert';
          await applyDnrRules(Boolean(current.isShieldActive), current.blacklist || DEFAULT_BLACKLIST, current.whitelist || [], blockMode);
          if (current.isShieldActive && blockMode === 'redirect') {
            await scanAndRedirectOpenTabs(current.blacklist || DEFAULT_BLACKLIST, current.whitelist || [], blockMode);
          }
          sendResponse({ success: true, updated: toUpdate });
          break;
        }

        case 'TOGGLE_SHIELD_MANUAL': {
          const current = await chrome.storage.local.get(['isShieldActive', 'blacklist', 'whitelist', 'focusState', 'blockMode']);
          const targetActive = typeof message.active === 'boolean' ? message.active : !current.isShieldActive;
          const blockMode = current.blockMode || 'in_page_alert';
          
          await chrome.storage.local.set({ isShieldActive: targetActive });
          const blacklist = current.blacklist || DEFAULT_BLACKLIST;
          const whitelist = current.whitelist || [];
          await applyDnrRules(targetActive, blacklist, whitelist, blockMode);
          await updateBadge(targetActive, current.focusState);

          if (targetActive && blockMode === 'redirect') {
            await scanAndRedirectOpenTabs(blacklist, whitelist, blockMode);
          }
          
          sendResponse({ success: true, isShieldActive: targetActive });
          break;
        }

        case 'RECORD_BLOCKED_ATTEMPT': {
          const current = await chrome.storage.local.get(['blockedCountToday']);
          const count = (current.blockedCountToday || 0) + 1;
          await chrome.storage.local.set({ blockedCountToday: count });
          sendResponse({ success: true, blockedCountToday: count });
          break;
        }

        case 'UPDATE_BLACKLIST': {
          const newList = Array.isArray(message.blacklist) ? message.blacklist : DEFAULT_BLACKLIST;
          await chrome.storage.local.set({ blacklist: newList });
          
          const current = await chrome.storage.local.get(['isShieldActive', 'whitelist', 'blockMode']);
          const blockMode = current.blockMode || 'in_page_alert';
          await applyDnrRules(Boolean(current.isShieldActive), newList, current.whitelist || [], blockMode);
          if (current.isShieldActive && blockMode === 'redirect') {
            await scanAndRedirectOpenTabs(newList, current.whitelist || [], blockMode);
          }
          sendResponse({ success: true, blacklist: newList });
          break;
        }

        case 'REGISTER_WEBAPP_URL': {
          if (message.url) {
            await chrome.storage.local.set({ levelupWebUrl: message.url });
            console.log(`[LevelUp Shield] Auto-registered LevelUp URL: ${message.url}`);
            sendResponse({ success: true, url: message.url });
          }
          break;
        }

        case 'FOCUS_OR_OPEN_LEVELUP': {
          const storage = await chrome.storage.local.get(['levelupWebUrl']);
          const targetUrl = message.targetUrl || storage.levelupWebUrl || 'https://level-up-nu-two.vercel.app';
          const tabs = await chrome.tabs.query({ url: ['*://localhost/*', '*://127.0.0.1/*', '*://*.vercel.app/*'] });
          let targetTabId = null;

          if (tabs.length > 0) {
            targetTabId = tabs[0].id;
            await chrome.tabs.update(tabs[0].id, { active: true });
            if (tabs[0].windowId) {
              await chrome.windows.update(tabs[0].windowId, { focused: true });
            }
          } else {
            const newTab = await chrome.tabs.create({ url: targetUrl });
            targetTabId = newTab.id;
          }

          // Close the current distracted page tab if requested
          const senderTabId = sender?.tab?.id;
          if (message.closeCurrentTab && senderTabId && senderTabId !== targetTabId) {
            try {
              await chrome.tabs.remove(senderTabId);
            } catch (closeErr) {
              console.warn('[LevelUp Shield] Could not close sender tab:', closeErr);
            }
          }

          sendResponse({ success: true, tabId: targetTabId });
          break;
        }

        case 'RESTORE_CAPSULE': {
          const tabs = await chrome.tabs.query({});
          for (const tab of tabs) {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, { type: 'RESTORE_CAPSULE' }).catch(() => {});
            }
          }
          sendResponse({ success: true });
          break;
        }

        case 'SELF_RELOAD_EXTENSION':
        case 'RELOAD_EXTENSION': {
          console.log('[LevelUp Shield] Reloading extension from disk via CLI trigger...');
          sendResponse({ success: true });
          setTimeout(() => {
            try {
              chrome.runtime.reload();
            } catch (_) {}
          }, 150);
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (err) {
      console.error('[LevelUp Shield] Error handling message:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});

