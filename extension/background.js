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

// Redirect all already-open tabs that are currently on blocked domains
async function scanAndRedirectOpenTabs(blacklist, whitelist) {
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
    'strictMode'
  ]);

  const initialBlacklist = Array.isArray(data.blacklist) && data.blacklist.length > 0 
    ? data.blacklist 
    : DEFAULT_BLACKLIST;

  await chrome.storage.local.set({
    blacklist: initialBlacklist,
    whitelist: Array.isArray(data.whitelist) ? data.whitelist : [],
    isShieldActive: Boolean(data.isShieldActive),
    focusState: data.focusState || null,
    blockedCountToday: typeof data.blockedCountToday === 'number' ? data.blockedCountToday : 0,
    strictMode: Boolean(data.strictMode)
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

  // Ensure DNR rules match current shield state
  await applyDnrRules(Boolean(data.isShieldActive), initialBlacklist, data.whitelist || []);
  await updateBadge(Boolean(data.isShieldActive), data.focusState);
});

// Update Declarative Net Request Dynamic Rules
async function applyDnrRules(isActive, blacklist = [], whitelist = []) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);

    if (!isActive || !Array.isArray(blacklist) || blacklist.length === 0) {
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

  const { isShieldActive, blacklist, whitelist } = await chrome.storage.local.get([
    'isShieldActive',
    'blacklist',
    'whitelist'
  ]);

  if (!isShieldActive) return;

  if (isDomainBlocked(targetUrl, blacklist || DEFAULT_BLACKLIST, whitelist || [])) {
    console.log(`[LevelUp Shield] onUpdated intercepted blocked URL: ${targetUrl}`);
    await chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL('blocked/blocked.html?blockedUrl=' + encodeURIComponent(targetUrl))
    });
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

  const storage = await chrome.storage.local.get(['blacklist', 'whitelist', 'strictMode']);
  const blacklist = storage.blacklist || DEFAULT_BLACKLIST;
  const whitelist = storage.whitelist || [];

  const focusState = {
    isRunning: isRunning,
    isBreakMode: isBreakMode,
    questTitle: state.questTitle || state.title || 'Phiên Tập Trung',
    questIcon: state.questIcon || state.icon || '⚔️',
    questRank: state.questRank || state.rank || 'C',
    remainingSeconds: state.remainingSeconds || 0,
    totalSeconds: state.totalSeconds || 1500,
    rewardCoins: state.rewardCoins || 12,
    updatedAt: Date.now()
  };

  await chrome.storage.local.set({
    isShieldActive: shouldShield,
    focusState: focusState
  });

  await applyDnrRules(shouldShield, blacklist, whitelist);
  await updateBadge(shouldShield, focusState);

  // If shield just activated, scan and redirect open tabs immediately
  if (shouldShield) {
    await scanAndRedirectOpenTabs(blacklist, whitelist);
    chrome.alarms.create('levelup_heartbeat', { periodInMinutes: 0.1 });
  } else {
    await chrome.alarms.clear('levelup_heartbeat');
  }
}

// Alarm listener for background countdown sync
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'levelup_heartbeat') return;

  const data = await chrome.storage.local.get(['isShieldActive', 'focusState', 'blacklist', 'whitelist']);
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
    await applyDnrRules(false, data.blacklist, data.whitelist);
    await updateBadge(false, updatedState);
    await chrome.alarms.clear('levelup_heartbeat');
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

        case 'GET_STATUS': {
          const state = await chrome.storage.local.get([
            'isShieldActive',
            'focusState',
            'blacklist',
            'whitelist',
            'blockedCountToday',
            'strictMode'
          ]);
          sendResponse({ success: true, data: state });
          break;
        }

        case 'TOGGLE_SHIELD_MANUAL': {
          const current = await chrome.storage.local.get(['isShieldActive', 'blacklist', 'whitelist', 'focusState']);
          const targetActive = typeof message.active === 'boolean' ? message.active : !current.isShieldActive;
          
          await chrome.storage.local.set({ isShieldActive: targetActive });
          const blacklist = current.blacklist || DEFAULT_BLACKLIST;
          const whitelist = current.whitelist || [];
          await applyDnrRules(targetActive, blacklist, whitelist);
          await updateBadge(targetActive, current.focusState);

          if (targetActive) {
            await scanAndRedirectOpenTabs(blacklist, whitelist);
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
          
          const current = await chrome.storage.local.get(['isShieldActive', 'whitelist']);
          await applyDnrRules(Boolean(current.isShieldActive), newList, current.whitelist || []);
          if (current.isShieldActive) {
            await scanAndRedirectOpenTabs(newList, current.whitelist || []);
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
          const targetUrl = message.targetUrl || storage.levelupWebUrl || 'https://level-up-seven-blue.vercel.app';
          const tabs = await chrome.tabs.query({ url: ['*://localhost/*', '*://127.0.0.1/*', '*://*.vercel.app/*'] });
          if (tabs.length > 0) {
            await chrome.tabs.update(tabs[0].id, { active: true });
            if (tabs[0].windowId) {
              await chrome.windows.update(tabs[0].windowId, { focused: true });
            }
            sendResponse({ success: true, tabId: tabs[0].id });
          } else {
            const newTab = await chrome.tabs.create({ url: targetUrl });
            sendResponse({ success: true, tabId: newTab.id });
          }
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
