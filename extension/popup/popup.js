// =============================================================================
// LevelUp Focus Shield — Popup Logic
// =============================================================================

let currentBlacklist = [];
let popupTimerInterval = null;

function formatTime(sec) {
  const total = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function cleanDomainInput(input) {
  if (!input) return '';
  return input.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

async function renderPopup() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (!res?.success || !res.data) return;

    const { isShieldActive, focusState, blacklist, blockedCountToday } = res.data;
    currentBlacklist = Array.isArray(blacklist) ? blacklist : [];

    // 1. Status Badge & Toggle
    const statusBadge = document.getElementById('status-badge');
    const shieldToggle = document.getElementById('shield-toggle');
    const statusCard = document.getElementById('status-card');

    if (shieldToggle) shieldToggle.checked = Boolean(isShieldActive);

    if (isShieldActive) {
      if (statusBadge) {
        statusBadge.className = 'badge-status active';
        statusBadge.innerHTML = '<span class="badge-dot"></span><span class="badge-text">Đang Bảo Vệ</span>';
      }
      if (statusCard) {
        statusCard.className = 'status-card status-active';
      }
    } else {
      if (statusBadge) {
        statusBadge.className = 'badge-status';
        statusBadge.innerHTML = '<span class="badge-dot"></span><span class="badge-text">Nghỉ Ngơi</span>';
      }
      if (statusCard) {
        statusCard.className = 'status-card status-idle';
      }
    }

    // 2. Quest HUD
    const questHud = document.getElementById('quest-hud');
    if (isShieldActive && focusState && focusState.isRunning) {
      if (questHud) questHud.classList.remove('hidden');
      const iconEl = document.getElementById('popup-quest-icon');
      const titleEl = document.getElementById('popup-quest-title');
      const rewardEl = document.getElementById('popup-quest-reward');
      const countdownEl = document.getElementById('popup-countdown');

      if (iconEl && focusState.questIcon) iconEl.textContent = focusState.questIcon;
      if (titleEl && focusState.questTitle) titleEl.textContent = focusState.questTitle;
      if (rewardEl && focusState.rewardCoins) rewardEl.textContent = `+${focusState.rewardCoins} Vàng`;

      const elapsed = Math.floor((Date.now() - (focusState.updatedAt || Date.now())) / 1000);
      let remaining = Math.max(0, Math.floor(Number(focusState.remainingSeconds) || 0) - elapsed);

      if (countdownEl) {
        countdownEl.textContent = formatTime(remaining);
        if (popupTimerInterval) clearInterval(popupTimerInterval);
        popupTimerInterval = setInterval(() => {
          if (remaining > 0) {
            remaining--;
            countdownEl.textContent = formatTime(remaining);
          } else {
            clearInterval(popupTimerInterval);
            countdownEl.textContent = '00:00';
          }
        }, 1000);
      }
    } else {
      if (questHud) questHud.classList.add('hidden');
      if (popupTimerInterval) clearInterval(popupTimerInterval);
    }

    // 3. Blocked Count Today
    const blockedCountEl = document.getElementById('popup-blocked-count');
    if (blockedCountEl) blockedCountEl.textContent = blockedCountToday || 0;

    // 4. Blacklist Chips
    renderBlacklistChips();

  } catch (err) {
    console.error('[LevelUp Shield] Failed to render popup:', err);
  }
}

function renderBlacklistChips() {
  const container = document.getElementById('blacklist-chips');
  const countEl = document.getElementById('chips-count');
  if (countEl) countEl.textContent = currentBlacklist.length;
  if (!container) return;

  container.innerHTML = '';
  if (currentBlacklist.length === 0) {
    container.innerHTML = '<span style="font-size: 11px; color: var(--text-subtle); font-style: italic;">Chưa có trang nào trong danh sách chặn</span>';
    return;
  }

  currentBlacklist.forEach(domain => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `
      <span>${domain}</span>
      <span class="chip-remove" data-domain="${domain}" title="Xóa">✕</span>
    `;
    container.appendChild(chip);
  });

  // Attach chip remove handlers
  container.querySelectorAll('.chip-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const domainToRemove = btn.getAttribute('data-domain');
      currentBlacklist = currentBlacklist.filter(d => d !== domainToRemove);
      await chrome.runtime.sendMessage({
        type: 'UPDATE_BLACKLIST',
        blacklist: currentBlacklist
      });
      renderBlacklistChips();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderPopup();

  // Shield manual toggle switch
  const shieldToggle = document.getElementById('shield-toggle');
  if (shieldToggle) {
    shieldToggle.addEventListener('change', async () => {
      const active = shieldToggle.checked;
      await chrome.runtime.sendMessage({
        type: 'TOGGLE_SHIELD_MANUAL',
        active: active
      });
      renderPopup();
    });
  }

  // Quick Add Domain Form
  const formAdd = document.getElementById('form-quick-add');
  const inputAdd = document.getElementById('input-quick-domain');
  if (formAdd && inputAdd) {
    formAdd.addEventListener('submit', async (e) => {
      e.preventDefault();
      const domain = cleanDomainInput(inputAdd.value);
      if (!domain) return;

      if (!currentBlacklist.includes(domain)) {
        currentBlacklist.push(domain);
        await chrome.runtime.sendMessage({
          type: 'UPDATE_BLACKLIST',
          blacklist: currentBlacklist
        });
        inputAdd.value = '';
        renderBlacklistChips();
      }
    });
  }

  // Open LevelUp Tab Button
  const openLevelUpBtn = document.getElementById('btn-open-levelup');
  if (openLevelUpBtn) {
    openLevelUpBtn.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'FOCUS_OR_OPEN_LEVELUP' });
      window.close();
    });
  }

  // Open Options Page Button
  const openOptionsBtn = document.getElementById('btn-open-options');
  if (openOptionsBtn) {
    openOptionsBtn.addEventListener('click', () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options/options.html'));
      }
    });
  }
});
