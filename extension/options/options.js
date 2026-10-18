// =============================================================================
// LevelUp Focus Shield — Options Logic
// =============================================================================

const PRESETS = {
  social: ['facebook.com', 'tiktok.com', 'instagram.com', 'twitter.com', 'x.com', 'threads.net'],
  video: ['youtube.com', 'netflix.com', 'twitch.tv', 'bilibili.com'],
  shopping: ['reddit.com', 'discord.com', 'shopee.vn', 'lazada.vn']
};

function cleanDomain(str) {
  return str.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

function parseLines(text) {
  if (!text) return [];
  return text.split('\n')
    .map(cleanDomain)
    .filter(d => d.length > 0 && d.includes('.'));
}

async function loadOptions() {
  const data = await chrome.storage.local.get([
    'blacklist',
    'whitelist',
    'levelupWebUrl',
    'strictMode',
    'mascotEnabled',
    'soundEnabled',
    'blockMode'
  ]);

  const blacklist = Array.isArray(data.blacklist) ? data.blacklist : [];
  const whitelist = Array.isArray(data.whitelist) ? data.whitelist : [];
  const webUrl = data.levelupWebUrl || 'https://level-up-seven-blue.vercel.app';
  const strictMode = Boolean(data.strictMode);

  // Set Textareas
  const txtBlacklist = document.getElementById('textarea-blacklist');
  const txtWhitelist = document.getElementById('textarea-whitelist');
  const inputUrl = document.getElementById('input-webapp-url');
  const toggleStrict = document.getElementById('toggle-strict-mode');
  const toggleMascot = document.getElementById('toggle-mascot-enabled');
  const toggleSound = document.getElementById('toggle-sound-enabled');
  const radioAlert = document.getElementById('radio-mode-alert');
  const radioRedirect = document.getElementById('radio-mode-redirect');

  if (txtBlacklist) txtBlacklist.value = blacklist.join('\n');
  if (txtWhitelist) txtWhitelist.value = whitelist.join('\n');
  if (inputUrl) inputUrl.value = webUrl;
  if (toggleStrict) toggleStrict.checked = strictMode;
  if (toggleMascot) toggleMascot.checked = typeof data.mascotEnabled === 'boolean' ? data.mascotEnabled : true;
  if (toggleSound) toggleSound.checked = typeof data.soundEnabled === 'boolean' ? data.soundEnabled : true;

  const blockMode = data.blockMode || 'in_page_alert';
  if (blockMode === 'redirect') {
    if (radioRedirect) radioRedirect.checked = true;
  } else {
    if (radioAlert) radioAlert.checked = true;
  }

  // Check preset checkboxes
  updatePresetCheckboxes(blacklist);
}

function updatePresetCheckboxes(blacklist) {
  const set = new Set(blacklist.map(cleanDomain));

  ['social', 'video', 'shopping'].forEach(key => {
    const el = document.getElementById(`preset-${key}`);
    if (el) {
      const allPresent = PRESETS[key].every(d => set.has(d));
      el.checked = allPresent;
    }
  });
}

function handlePresetToggle(key, isChecked) {
  const txtBlacklist = document.getElementById('textarea-blacklist');
  if (!txtBlacklist) return;

  let currentList = parseLines(txtBlacklist.value);
  const presetItems = PRESETS[key];

  if (isChecked) {
    presetItems.forEach(item => {
      if (!currentList.includes(item)) currentList.push(item);
    });
  } else {
    currentList = currentList.filter(item => !presetItems.includes(item));
  }

  txtBlacklist.value = currentList.join('\n');
  updatePresetCheckboxes(currentList);
}

document.addEventListener('DOMContentLoaded', () => {
  loadOptions();

  // Preset checkboxes listeners
  ['social', 'video', 'shopping'].forEach(key => {
    const el = document.getElementById(`preset-${key}`);
    if (el) {
      el.addEventListener('change', () => {
        handlePresetToggle(key, el.checked);
      });
    }
  });

  // Save Button
  const btnSave = document.getElementById('btn-save-options');
  const saveStatus = document.getElementById('save-status');

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const txtBlacklist = document.getElementById('textarea-blacklist');
      const txtWhitelist = document.getElementById('textarea-whitelist');
      const inputUrl = document.getElementById('input-webapp-url');
      const toggleStrict = document.getElementById('toggle-strict-mode');
      const toggleMascot = document.getElementById('toggle-mascot-enabled');
      const toggleSound = document.getElementById('toggle-sound-enabled');
      const radioRedirect = document.getElementById('radio-mode-redirect');

      const blacklist = parseLines(txtBlacklist?.value || '');
      const whitelist = parseLines(txtWhitelist?.value || '');
      const webUrl = (inputUrl?.value || 'http://localhost:3000').trim();
      const strictMode = Boolean(toggleStrict?.checked);
      const mascotEnabled = Boolean(toggleMascot?.checked);
      const soundEnabled = Boolean(toggleSound?.checked);
      const blockMode = radioRedirect?.checked ? 'redirect' : 'in_page_alert';

      await chrome.storage.local.set({
        blacklist,
        whitelist,
        levelupWebUrl: webUrl,
        strictMode,
        mascotEnabled,
        soundEnabled,
        blockMode
      });

      // Notify background service worker of both settings and blacklist updates
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        mascotEnabled,
        soundEnabled,
        blockMode,
        strictMode
      });

      await chrome.runtime.sendMessage({
        type: 'UPDATE_BLACKLIST',
        blacklist
      });

      if (saveStatus) {
        saveStatus.classList.remove('hidden');
        setTimeout(() => {
          saveStatus.classList.add('hidden');
        }, 2500);
      }
    });
  }
});
