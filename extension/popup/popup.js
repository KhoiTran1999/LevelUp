// =============================================================================
// LevelUp Focus Shield & Quick Notes — Popup Logic
// Google Keep Style Note Taking + Shield & Timer Settings Hub
// =============================================================================

let currentBlacklist = [];
let popupTimerInterval = null;
let currentTabUrl = '';
let currentTabTitle = '';
let currentActiveView = 'notes'; // 'notes' or 'settings'

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

function extractDomain(urlStr) {
  if (!urlStr) return '';
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, '');
  } catch (_) {
    return urlStr.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

function autoResizeTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(220, Math.max(72, el.scrollHeight)) + 'px';
}

// ---------------------------------------------------------------------------
// 1. Google Keep Note View Initialization
// ---------------------------------------------------------------------------
async function initKeepNoteView() {
  const titleInput = document.getElementById('keep-note-title');
  const bodyInput = document.getElementById('keep-note-body');
  const webTitleEl = document.getElementById('keep-web-title');
  const webDomainEl = document.getElementById('keep-web-domain');
  const webLinkEl = document.getElementById('keep-web-link');
  const webFaviconEl = document.getElementById('keep-web-favicon');
  const webFallbackIcon = document.getElementById('keep-web-fallback-icon');

  try {
    // Query the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs?.[0];

    if (tab && tab.url) {
      currentTabUrl = tab.url;
      currentTabTitle = tab.title || '';

      const isSpecialPage = currentTabUrl.startsWith('chrome://') || 
                            currentTabUrl.startsWith('chrome-extension://') || 
                            currentTabUrl.startsWith('about:');

      // Populate Web Citation Snippet
      const domain = extractDomain(currentTabUrl);
      if (webDomainEl) webDomainEl.textContent = isSpecialPage ? 'Trang trình duyệt' : domain;
      if (webTitleEl) {
        webTitleEl.textContent = currentTabTitle || (isSpecialPage ? 'Cài Đặt Trình Duyệt' : domain);
        webTitleEl.title = currentTabTitle || domain;
      }
      if (webLinkEl) {
        webLinkEl.href = currentTabUrl;
        if (isSpecialPage) webLinkEl.style.display = 'none';
      }

      // Favicon handling
      if (tab.favIconUrl && tab.favIconUrl.startsWith('http')) {
        if (webFaviconEl) {
          webFaviconEl.src = tab.favIconUrl;
          webFaviconEl.classList.remove('hidden');
          webFaviconEl.onerror = () => {
            webFaviconEl.classList.add('hidden');
            if (webFallbackIcon) webFallbackIcon.classList.remove('hidden');
          };
        }
        if (webFallbackIcon) webFallbackIcon.classList.add('hidden');
      } else {
        if (webFaviconEl) webFaviconEl.classList.add('hidden');
        if (webFallbackIcon) webFallbackIcon.classList.remove('hidden');
      }

      // Check for user-selected text on the active page
      if (!isSpecialPage && chrome.scripting) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection().toString()
          });
          const selectedText = (results?.[0]?.result || '').trim();
          if (selectedText && bodyInput && !bodyInput.value) {
            bodyInput.value = selectedText;
            autoResizeTextarea(bodyInput);
          }
        } catch (_) {}
      }
    } else {
      if (webTitleEl) webTitleEl.textContent = 'Ghi Chú Nhanh LevelUp';
      if (webDomainEl) webDomainEl.textContent = 'LevelUp App';
    }
  } catch (err) {
    console.warn('[LevelUp Note] Error querying active tab:', err);
  }

function renderNotesDropdown(noteList, selectedId) {
  const topicSelect = document.getElementById('keep-topic-select');
  const titleInput = document.getElementById('keep-note-title');
  if (!topicSelect) return;

  topicSelect.innerHTML = '';

  const newOpt = document.createElement('option');
  newOpt.value = '__new__';
  newOpt.textContent = '✨ + Tạo ghi chú mới...';
  topicSelect.appendChild(newOpt);

  if (Array.isArray(noteList)) {
    noteList.forEach(n => {
      const titleStr = (n.title || '').trim() || 'Chưa đặt tiêu đề';
      const opt = document.createElement('option');
      opt.value = n.id;
      opt.dataset.title = titleStr;
      opt.textContent = `📝 ${titleStr}`;
      topicSelect.appendChild(opt);
    });
  }

  if (selectedId && selectedId !== '__new__' && Array.isArray(noteList) && noteList.some(n => n.id === selectedId)) {
    topicSelect.value = selectedId;
    const matched = noteList.find(n => n.id === selectedId);
    if (matched && titleInput) {
      titleInput.value = matched.title;
    }
  } else {
    topicSelect.value = '__new__';
  }
}

  // Nạp danh sách các ghi chú theo Tiêu Đề (Title) để người dùng chọn ghi chú tiếp hoặc tạo mới
  const topicSelect = document.getElementById('keep-topic-select');
  if (topicSelect) {
    try {
      const storage = await chrome.storage.local.get(['levelupNotes', 'levelupTopics', 'lastSelectedTopic', 'lastSelectedNoteId']);
      const defaultTopics = ['Ghi Chép Nhanh', 'Ý Tưởng', 'Học Tập', 'Công Việc', 'Nghiên Cứu'];
      const userTopics = Array.isArray(storage.levelupTopics) && storage.levelupTopics.length > 0 
        ? storage.levelupTopics 
        : defaultTopics;
      let noteList = Array.isArray(storage.levelupNotes) ? storage.levelupNotes : [];
      
      renderNotesDropdown(noteList, storage.lastSelectedNoteId);

      // Thử truy vấn tab LevelUp đang mở (nếu có) để lấy danh sách ghi chú mới nhất realtime
      try {
        const levelUpTabs = await chrome.tabs.query({ url: ['*://localhost/*', '*://127.0.0.1/*', '*://*.vercel.app/*'] });
        if (levelUpTabs && levelUpTabs.length > 0) {
          chrome.tabs.sendMessage(levelUpTabs[0].id, { type: 'REQUEST_NOTES_LIST' }, (response) => {
            if (!chrome.runtime.lastError && response && Array.isArray(response.notes) && response.notes.length > 0) {
              noteList = response.notes;
              chrome.storage.local.set({ levelupNotes: noteList });
              renderNotesDropdown(noteList, storage.lastSelectedNoteId);
            }
          });
        }
      } catch (_) {}
    } catch (_) {}
  }

  // Auto-focus title input
  if (titleInput) {
    setTimeout(() => titleInput.focus(), 80);
  }
}

// ---------------------------------------------------------------------------
// 2. View Switcher (Notes View <-> Shield/Settings View)
// ---------------------------------------------------------------------------
function switchView(targetView) {
  currentActiveView = targetView;
  const viewNotes = document.getElementById('view-notes');
  const viewSettings = document.getElementById('view-shield-settings');
  const brandTitle = document.getElementById('header-brand-title');
  const brandSubtitle = document.getElementById('header-brand-subtitle');
  const toggleBtn = document.getElementById('btn-toggle-settings');

  if (targetView === 'settings') {
    if (viewNotes) viewNotes.classList.add('hidden');
    if (viewSettings) viewSettings.classList.remove('hidden');
    if (brandTitle) brandTitle.innerHTML = 'LevelUp <span class="highlight" style="color: #818cf8;">Shield</span>';
    if (brandSubtitle) brandSubtitle.innerHTML = 'Khiên Kỷ Luật <span class="version-tag">v1.5.3</span>';
    if (toggleBtn) {
      toggleBtn.title = 'Quay lại Ghi Chú';
      toggleBtn.innerHTML = '📝';
    }
    renderPopup();
  } else {
    if (viewSettings) viewSettings.classList.add('hidden');
    if (viewNotes) viewNotes.classList.remove('hidden');
    if (brandTitle) brandTitle.innerHTML = 'LevelUp <span class="highlight">Ghi Chú</span>';
    if (brandSubtitle) brandSubtitle.innerHTML = 'Google Keep Style <span class="version-tag">v1.5.3</span>';
    if (toggleBtn) {
      toggleBtn.title = 'Cài đặt & Khiên bảo vệ';
      toggleBtn.innerHTML = '⚙️';
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Shield Status & Blacklist HUD
// ---------------------------------------------------------------------------
async function renderPopup() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (!res?.success || !res.data) return;

    const { isShieldActive, focusState, blacklist, blockedCountToday, mascotEnabled } = res.data;
    currentBlacklist = Array.isArray(blacklist) ? blacklist : [];

    // 1. Status Badge & Toggle
    const statusBadge = document.getElementById('status-badge');
    const shieldToggle = document.getElementById('shield-toggle');
    const mascotToggle = document.getElementById('mascot-toggle');
    const statusCard = document.getElementById('status-card');

    if (shieldToggle) shieldToggle.checked = Boolean(isShieldActive);
    if (mascotToggle) mascotToggle.checked = typeof mascotEnabled === 'boolean' ? mascotEnabled : true;

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

// ---------------------------------------------------------------------------
// 4. Save Keep Note Action
// ---------------------------------------------------------------------------
async function handleSaveKeepNote() {
  const titleInput = document.getElementById('keep-note-title');
  const bodyInput = document.getElementById('keep-note-body');
  const saveBtn = document.getElementById('btn-save-keep-note');
  const saveIcon = document.getElementById('save-note-icon');
  const saveText = document.getElementById('save-note-text');
  const toastEl = document.getElementById('keep-save-toast');

  const title = (titleInput?.value || '').trim();
  const body = (bodyInput?.value || '').trim();

  // If both empty and no tab, shake
  if (!title && !body && !currentTabUrl) {
    titleInput?.focus();
    return;
  }

  try {
    saveBtn.disabled = true;
    if (saveIcon) saveIcon.textContent = '⏳';
    if (saveText) saveText.textContent = 'Đang lưu...';

    // Xác định ghi chú được chọn theo title để lưu hoặc tạo mới
    const topicSelect = document.getElementById('keep-topic-select');
    const customInput = document.getElementById('keep-custom-topic-input');
    let selectedTopic = 'Ghi Chép';
    let selectedNoteId = '';
    let isNewNote = true;

    if (topicSelect && topicSelect.value && topicSelect.value !== '__new__') {
      isNewNote = false;
      selectedNoteId = topicSelect.value;
      const selectedOpt = topicSelect.selectedOptions[0];
      selectedTopic = selectedOpt ? (selectedOpt.dataset.title || selectedOpt.textContent.replace(/^📝\s*/, '')) : 'Ghi Chép';
    }

    // Ghi nhớ chủ đề/ghi chú vừa chọn để lần sau mở popup ghi chú tiếp luôn
    await chrome.storage.local.set({ 
      lastSelectedTopic: selectedTopic,
      lastSelectedNoteId: selectedNoteId || '__new__'
    });

    const finalTitle = title || (isNewNote ? (currentTabTitle ? `Ghi Chép: ${currentTabTitle}` : 'Ghi Chú Mới') : selectedTopic);

    // Send note creation command to background service worker
    await chrome.runtime.sendMessage({
      type: 'CREATE_EXTENSION_NOTE',
      title: finalTitle,
      body: body,
      topic: selectedTopic,
      noteId: selectedNoteId,
      isNewNote: isNewNote,
      sourceUrl: currentTabUrl,
      sourceTitle: currentTabTitle
    });

    // Success Visual Feedback (Google Keep style checkmark)
    if (saveBtn) saveBtn.classList.add('saved');
    if (saveIcon) saveIcon.textContent = '✓';
    if (saveText) saveText.textContent = 'Đã Lưu!';
    if (toastEl) toastEl.classList.remove('hidden');

    // Auto-close popup after short moment
    setTimeout(() => {
      window.close();
    }, 750);
  } catch (err) {
    console.error('[LevelUp Note] Failed to save note:', err);
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.classList.remove('saved');
    }
    if (saveIcon) saveIcon.textContent = '💾';
    if (saveText) saveText.textContent = 'Lưu Ghi Chú';
  }
}

// ---------------------------------------------------------------------------
// 5. DOM Ready Setup
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Mặc định nạp thẳng vào Sổ Ghi Chú (Google Keep style)
  initKeepNoteView();

  // Textarea auto-resize
  const bodyInput = document.getElementById('keep-note-body');
  if (bodyInput) {
    bodyInput.addEventListener('input', () => autoResizeTextarea(bodyInput));
  }

  // Topic Select change listener: khi chọn ghi chú khác theo Title
  const topicSelect = document.getElementById('keep-topic-select');
  const customRow = document.getElementById('keep-custom-topic-row');
  const customInput = document.getElementById('keep-custom-topic-input');
  const btnCancelCustom = document.getElementById('btn-cancel-custom-topic');

  if (topicSelect) {
    topicSelect.addEventListener('change', async () => {
      const titleInput = document.getElementById('keep-note-title');
      const bodyInput = document.getElementById('keep-note-body');
      if (customRow) customRow.classList.add('hidden');

      if (topicSelect.value === '__new__') {
        if (titleInput) {
          titleInput.value = '';
          titleInput.placeholder = 'Tiêu đề ghi chú mới...';
          titleInput.focus();
        }
        await chrome.storage.local.set({ lastSelectedTopic: 'Ghi Chép', lastSelectedNoteId: '__new__' });
      } else {
        const selectedOpt = topicSelect.selectedOptions[0];
        const selectedTitle = selectedOpt ? (selectedOpt.dataset.title || selectedOpt.textContent.replace(/^📝\s*/, '')) : '';
        if (titleInput) {
          titleInput.value = selectedTitle;
        }
        if (bodyInput) {
          bodyInput.focus();
        }
        await chrome.storage.local.set({ lastSelectedTopic: selectedTitle, lastSelectedNoteId: topicSelect.value });
      }
    });
  }

  if (btnCancelCustom && customRow && topicSelect) {
    btnCancelCustom.addEventListener('click', () => {
      customRow.classList.add('hidden');
      if (customInput) customInput.value = '';
      topicSelect.selectedIndex = 0;
    });
  }

  // Save Note Button
  const saveNoteBtn = document.getElementById('btn-save-keep-note');
  if (saveNoteBtn) {
    saveNoteBtn.addEventListener('click', handleSaveKeepNote);
  }

  // Ctrl+Enter or Cmd+Enter to quickly save note
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (currentActiveView === 'notes') {
        e.preventDefault();
        handleSaveKeepNote();
      }
    }
  });

  // Cancel Note Button
  const cancelBtn = document.getElementById('btn-cancel-keep-note');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      window.close();
    });
  }

  // Toggle Settings View Button (Gear Icon in Header)
  const toggleSettingsBtn = document.getElementById('btn-toggle-settings');
  if (toggleSettingsBtn) {
    toggleSettingsBtn.addEventListener('click', () => {
      if (currentActiveView === 'notes') {
        switchView('settings');
      } else {
        switchView('notes');
      }
    });
  }

  // Back to Notes Link
  const backToNotesBtn = document.getElementById('btn-back-to-notes');
  if (backToNotesBtn) {
    backToNotesBtn.addEventListener('click', () => {
      switchView('notes');
    });
  }

  // Open Sổ Ghi Chú Full App Button
  const openNotesBtn = document.getElementById('btn-open-notes');
  if (openNotesBtn) {
    openNotesBtn.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ 
        type: 'FOCUS_OR_OPEN_LEVELUP',
        targetTab: 'notes'
      });
      window.close();
    });
  }

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

  // Mascot toggle switch
  const mascotToggle = document.getElementById('mascot-toggle');
  if (mascotToggle) {
    mascotToggle.addEventListener('change', async () => {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        mascotEnabled: mascotToggle.checked
      });
    });
  }

  // Test Fireworks Button
  const testFireworksBtn = document.getElementById('btn-test-fireworks');
  if (testFireworksBtn) {
    testFireworksBtn.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'TRIGGER_TEST_FIREWORKS' });
      const origText = testFireworksBtn.innerHTML;
      testFireworksBtn.innerHTML = '✨ Đã Bắn Pháo Hoa Trên Web!';
      testFireworksBtn.style.color = '#34d399';
      setTimeout(() => {
        testFireworksBtn.innerHTML = origText;
        testFireworksBtn.style.color = '#fbbf24';
      }, 1800);
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

  // Restore Mini Timer on Tabs Button
  const restoreCapsuleBtn = document.getElementById('btn-restore-capsule');
  if (restoreCapsuleBtn) {
    restoreCapsuleBtn.addEventListener('click', async () => {
      try {
        await chrome.runtime.sendMessage({ type: 'RESTORE_CAPSULE' });
        const originalText = restoreCapsuleBtn.innerHTML;
        restoreCapsuleBtn.innerHTML = '✅ Đã Bật Lại Mini Timer!';
        restoreCapsuleBtn.style.color = '#34d399';
        setTimeout(() => {
          restoreCapsuleBtn.innerHTML = originalText;
          restoreCapsuleBtn.style.color = '';
        }, 1500);
      } catch (e) {
        console.error('Failed to restore capsule:', e);
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
