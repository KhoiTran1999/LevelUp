// =============================================================================
// 13. MODAL & NAVIGATION CONTROLLERS (Mobile Bottom Bar + Desktop Top Tabs)
// =============================================================================
function updateRewardsNavBadge() {
  if (typeof document !== 'undefined' && document.getElementById('levelup-app')) {
    return;
  }
  const totalRewardsBadge = document.getElementById('badge-rewards-total');
  const unusedCount = Array.isArray(appState.inventory) ? appState.inventory.length : 0;
  if (totalRewardsBadge) totalRewardsBadge.textContent = unusedCount;
  const countBadge = document.getElementById('badge-inventory-count');
  if (countBadge) countBadge.textContent = unusedCount;
}

function switchRewardSubtab(subtab) {
  if (typeof document !== 'undefined' && document.getElementById('levelup-app')) {
    window.dispatchEvent(new CustomEvent('levelup:switch-reward-subtab', { detail: { subtab } }));
    return;
  }
  const btnShop = document.getElementById('subtab-btn-shop');
  const btnInv = document.getElementById('subtab-btn-inventory');
  const paneShop = document.getElementById('subtab-pane-shop');
  const paneInv = document.getElementById('subtab-pane-inventory');

  const baseClass = 'reward-subtab flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 h-8 sm:h-8.5 rounded-lg text-xs transition cursor-pointer select-none';
  const activeClass = `${baseClass} active font-bold bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs`;
  const inactiveClass = `${baseClass} font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200`;

  if (subtab === 'inventory') {
    if (btnShop) btnShop.className = inactiveClass;
    if (btnInv) btnInv.className = activeClass;
    if (paneShop) paneShop.classList.add('hidden');
    if (paneInv) paneInv.classList.remove('hidden');
    if (typeof renderInventory === 'function') {
      renderInventory();
    }
  } else {
    if (btnShop) btnShop.className = activeClass;
    if (btnInv) btnInv.className = inactiveClass;
    if (paneShop) paneShop.classList.remove('hidden');
    if (paneInv) paneInv.classList.add('hidden');
    if (typeof renderShop === 'function') {
      renderShop();
    }
  }

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(refreshAllCardDescToggles);
  }
}
window.switchRewardSubtab = switchRewardSubtab;

function switchTab(tabId) {
  // Defensive guard: prevent blank screen if tabId is missing or undefined
  if (!tabId || tabId === 'undefined') {
    tabId = 'quests';
  }

  // Graceful fallback / redirect for legacy 'inventory' tab links
  if (tabId === 'inventory') {
    tabId = 'shop';
    switchRewardSubtab('inventory');
  }

  const isAdmin = isUserAdmin();
  const isMoreTab = ['leaderboard', 'ledger', 'bank', 'admin', 'tracker'].includes(tabId);

  // Full Archetype RPG Color Matrix
  const tabColorTheme = {
    quests: {
      desktop: 'active bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs font-bold',
      mobile: 'active bg-amber-500/15 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
    },
    shop: {
      desktop: 'active bg-purple-500/15 dark:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/40 shadow-xs font-bold',
      mobile: 'active bg-purple-500/15 dark:bg-purple-400/20 text-purple-700 dark:text-purple-300 font-bold shadow-xs'
    },
    notes: {
      desktop: 'active bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs font-bold',
      mobile: 'active bg-amber-500/15 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 font-bold shadow-xs',
      itemDesktop: 'active bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold',
      itemMobile: 'active bg-amber-500/15 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 font-bold'
    },
    tracker: {
      desktop: 'active bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-xs font-bold',
      mobile: 'active bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs',
      itemDesktop: 'active bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold',
      itemMobile: 'active bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 font-bold'
    },
    leaderboard: {
      desktop: 'active bg-yellow-500/15 dark:bg-yellow-500/25 text-yellow-700 dark:text-yellow-300 border border-yellow-500/40 shadow-xs font-bold',
      mobile: 'active bg-yellow-500/15 dark:bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 font-bold shadow-xs',
      itemDesktop: 'active bg-yellow-500/15 dark:bg-yellow-500/25 text-yellow-700 dark:text-yellow-300 font-bold',
      itemMobile: 'active bg-yellow-500/15 dark:bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 font-bold'
    },
    ledger: {
      desktop: 'active bg-sky-500/15 dark:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-500/40 shadow-xs font-bold',
      mobile: 'active bg-sky-500/15 dark:bg-sky-400/20 text-sky-700 dark:text-sky-300 font-bold shadow-xs',
      itemDesktop: 'active bg-sky-500/15 dark:bg-sky-500/25 text-sky-700 dark:text-sky-300 font-bold',
      itemMobile: 'active bg-sky-500/15 dark:bg-sky-400/20 text-sky-700 dark:text-sky-300 font-bold'
    },
    bank: {
      desktop: 'active bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-xs font-bold',
      mobile: 'active bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs',
      itemDesktop: 'active bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold',
      itemMobile: 'active bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 font-bold'
    },
    admin: {
      desktop: 'active bg-fuchsia-500/15 dark:bg-fuchsia-500/25 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-500/40 shadow-xs font-bold',
      mobile: 'active bg-fuchsia-500/15 dark:bg-fuchsia-400/20 text-fuchsia-700 dark:text-fuchsia-300 font-bold shadow-xs',
      itemDesktop: 'active bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 font-bold',
      itemMobile: 'active bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 font-bold'
    }
  };

  // Close any open more menus
  document.getElementById('nav-more-menu')?.classList.add('hidden');
  if (typeof closeMobileMoreMenu === 'function') {
    closeMobileMoreMenu();
  } else {
    document.getElementById('mobile-more-menu')?.classList.add('hidden');
  }

  // Sync desktop more toggle button with current tab vibe
  const btnNavMore = document.getElementById('btn-nav-more');
  if (btnNavMore) {
    const currentTheme = tabColorTheme[tabId] || tabColorTheme.leaderboard;
    btnNavMore.className = `nav-more-toggle flex items-center gap-1 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-semibold text-xs transition border shrink-0 whitespace-nowrap cursor-pointer ${
      isMoreTab
        ? currentTheme.desktop
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border-transparent'
    }`;
  }

  // Sync mobile more toggle button with current tab vibe
  const btnMobileMore = document.getElementById('btn-mobile-more');
  if (btnMobileMore) {
    const currentTheme = tabColorTheme[tabId] || tabColorTheme.leaderboard;
    btnMobileMore.className = `mobile-more-btn flex-1 min-w-0 flex flex-col items-center justify-center py-1 group cursor-pointer focus:outline-none transition-all ${
      isMoreTab
        ? (currentTheme.mobile + ' active-theme-' + tabId)
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
    }`;
  }

  // Sync desktop tabs
  document.querySelectorAll('.nav-tab').forEach(b => {
    const tabKey = b.dataset.tab;
    const isActive = tabKey === tabId;
    const isAdminBtn = b.id === 'nav-tab-admin' || tabKey === 'admin';
    const theme = tabColorTheme[tabKey] || tabColorTheme.quests;

    if (b.classList.contains('nav-more-item')) {
      if (isAdminBtn && !isAdmin) {
        b.className = 'nav-tab nav-more-item hidden items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg transition text-left';
        return;
      }
      b.className = `nav-tab nav-more-item flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg transition text-left ${
        isActive
          ? (theme.itemDesktop || theme.desktop)
          : (isAdminBtn ? 'text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/40' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')
      }`;
      return;
    }

    if (isAdminBtn && !isAdmin) {
      b.className = 'nav-tab hidden items-center gap-1 sm:gap-1.5 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-semibold text-xs transition shrink-0 whitespace-nowrap';
      return;
    }

    b.className = `nav-tab flex items-center gap-1 sm:gap-1.5 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-semibold text-xs transition shrink-0 whitespace-nowrap ${
      isActive
        ? theme.desktop
        : (isAdminBtn
            ? 'text-fuchsia-600 dark:text-fuchsia-400 hover:text-fuchsia-900 dark:hover:text-fuchsia-200 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/40 border border-fuchsia-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent')
    }`;
  });

  // Sync mobile bottom bar buttons
  document.querySelectorAll('.mobile-nav-btn').forEach(b => {
    const tabKey = b.dataset.tab;
    const isActive = tabKey === tabId;
    const isAdminBtn = b.id === 'mobile-nav-admin' || tabKey === 'admin';
    const theme = tabColorTheme[tabKey] || tabColorTheme.quests;

    if (b.classList.contains('mobile-more-item')) {
      if (b.id === 'btn-mobile-about') {
        b.className = 'mobile-nav-btn mobile-more-item group flex items-center justify-between gap-3 w-full px-3 py-2.5 rounded-2xl text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-all text-left cursor-pointer border-t border-slate-100 dark:border-slate-800/80 pt-2.5 mt-1';
        return;
      }
      if (isAdminBtn && !isAdmin) {
        b.className = 'mobile-nav-btn mobile-more-item group hidden items-center justify-between gap-3 w-full px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all text-left';
        return;
      }
      b.className = `mobile-nav-btn mobile-more-item group flex items-center justify-between gap-3 w-full px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all text-left cursor-pointer ${
        isActive
          ? (theme.itemMobile || theme.mobile)
          : (isAdminBtn ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')
      }`;
      return;
    }

    if (isAdminBtn && !isAdmin) {
      b.className = 'mobile-nav-btn hidden flex-1 min-w-0 flex-col items-center justify-center py-1 transition';
      return;
    }

    b.className = `mobile-nav-btn flex flex-1 min-w-0 flex-col items-center justify-center py-1 group cursor-pointer focus:outline-none transition-all ${
      isActive
        ? theme.mobile
        : (isAdminBtn
            ? 'text-fuchsia-500/70 dark:text-fuchsia-400/70 hover:bg-fuchsia-500/5 font-medium'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium')
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
  } else {
    const fallbackPane = document.getElementById('tab-quests');
    if (fallbackPane) {
      fallbackPane.classList.remove('hidden');
      fallbackPane.classList.add('block');
    }
  }

  if (tabId === 'leaderboard') {
    const viewCheaters = document.getElementById('view-leaderboard-cheaters');
    if (viewCheaters && !viewCheaters.classList.contains('hidden')) {
      fetchCheaters();
    } else {
      fetchLeaderboard();
    }
    updateCheatersBadge();
  } else if (tabId === 'admin') {
    fetchAdminUsers();
  } else if (tabId === 'bank') {
    loadBankState();
    if (typeof startBankCountdownLoop === 'function') startBankCountdownLoop();
  } else if (tabId === 'ledger') {
    if (typeof renderLedger === 'function') renderLedger();
    if (typeof renderProofPhotos === 'function') renderProofPhotos();
  } else if (tabId === 'tracker') {
    if (typeof renderTracker === 'function') renderTracker();
  } else if (tabId === 'notes') {
    if (typeof loadNotesWorkspace === 'function') loadNotesWorkspace();
  }

  if (tabId !== 'bank' && typeof stopBankCountdownLoop === 'function') {
    stopBankCountdownLoop();
  }

  if (['quests', 'shop'].includes(tabId) || tabId === 'ledger') {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(refreshAllCardDescToggles);
    }
  }
}

function dismissModalWithSlideDown(modal, onDone) {
  if (!modal) {
    if (typeof onDone === 'function') onDone();
    return;
  }
  if (typeof modal === 'string') {
    modal = document.getElementById(modal);
  }
  if (!modal || modal.classList.contains('hidden') || modal.classList.contains('sheet-closing')) {
    if (typeof onDone === 'function') onDone();
    return;
  }

  const panel = modal.querySelector('.m3-dialog-panel') || modal.querySelector('.rpg-panel');
  modal.classList.add('sheet-closing');
  modal.style.pointerEvents = 'none';

  let currentY = 0;
  if (panel && typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const transform = window.getComputedStyle(panel).transform;
    if (transform && transform !== 'none') {
      try {
        if (typeof DOMMatrixReadOnly !== 'undefined') {
          const matrix = new DOMMatrixReadOnly(transform);
          currentY = Math.max(0, matrix.m42);
        }
      } catch (_) {
        currentY = 0;
      }
    }
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const targetY = isMobile ? '105%' : '60px';

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    // 1. Hủy bỏ mọi animation đang chạy để không bị khóa transform/opacity
    try {
      if (panel && typeof panel.getAnimations === 'function') {
        panel.getAnimations().forEach(a => a.cancel());
      }
      if (modal && typeof modal.getAnimations === 'function') {
        modal.getAnimations().forEach(a => a.cancel());
      }
    } catch (_) {}

    // 2. Ẩn modal và trả lại style sạch hoàn toàn
    modal.classList.add('hidden');
    modal.classList.remove('sheet-closing');
    modal.style.pointerEvents = '';
    modal.style.opacity = '';
    modal.style.transition = '';
    modal.style.backgroundColor = '';
    if (panel) {
      panel.style.transform = '';
      panel.style.transition = '';
      panel.style.opacity = '';
    }

    modal._suppressBackdropClick = false;
    if (typeof modal._reactOnDismiss === 'function') modal._reactOnDismiss();

    // 3. Quay lại modal chi tiết nhiệm vụ trước đó nếu có
    if (typeof window !== 'undefined' && window.parentDetailQuestId && (modal.id === 'modal-quest' || modal.id === 'modal-frequency-detail' || modal.id === 'modal-quest-proof')) {
      const returnQuestId = window.parentDetailQuestId;
      window.parentDetailQuestId = null;
      const q = typeof appState !== 'undefined' && Array.isArray(appState.quests) ? appState.quests.find(item => item.id === returnQuestId) : null;
      if (q && typeof openQuestDetailModal === 'function') {
        setTimeout(() => openQuestDetailModal(returnQuestId), 50);
      }
    }

    if (typeof onDone === 'function') onDone();
  };

  // Nếu người dùng đã kéo dở dang bằng tay (currentY > 0), dùng transition trượt tiếp từ vị trí đó xuống
  if (panel && currentY > 0) {
    panel.style.transition = 'transform 0.22s cubic-bezier(0.3, 0, 0.8, 0.15), opacity 0.22s ease';
    panel.style.transform = isMobile ? 'translate3d(0, 105%, 0)' : 'translate3d(0, 60px, 0)';
    panel.style.opacity = '0';
    modal.style.transition = 'opacity 0.22s ease';
    modal.style.opacity = '0';
    setTimeout(cleanup, 230);
    return;
  }

  // Nếu đóng bình thường (click x, click ngoài, Esc), class .sheet-closing trong CSS sẽ chạy animation 240ms
  setTimeout(cleanup, 240);
}
window.dismissModalWithSlideDown = dismissModalWithSlideDown;

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('sheet-closing');
  modal.style.pointerEvents = '';
  modal.style.opacity = '';
  modal.style.transition = '';
  modal.style.backgroundColor = '';
  const panel = modal.querySelector('.m3-dialog-panel') || modal.querySelector('.rpg-panel');
  if (panel) {
    panel.style.transform = '';
    panel.style.transition = '';
    panel.style.opacity = '';
    if (typeof panel.getAnimations === 'function') {
      try { panel.getAnimations().forEach(a => a.cancel()); } catch (_) {}
    }
  }
  if (typeof modal.getAnimations === 'function') {
    try { modal.getAnimations().forEach(a => a.cancel()); } catch (_) {}
  }
  modal._suppressBackdropClick = false;
  modal.classList.remove('hidden');
}

function openAboutModal() {
  const navMoreMenu = document.getElementById('nav-more-menu');
  if (navMoreMenu) navMoreMenu.classList.add('hidden');
  if (typeof closeMobileMoreMenu === 'function') {
    closeMobileMoreMenu();
  } else {
    document.getElementById('mobile-more-menu')?.classList.add('hidden');
  }
  if (typeof sfx !== 'undefined' && sfx.playClick) {
    sfx.playClick();
  }
  const modal = document.getElementById('modal-about');
  if (modal) {
    const scrollBody = modal.querySelector('.overflow-y-auto');
    if (scrollBody) scrollBody.scrollTop = 0;
  }
  openModal('modal-about');
}
window.openAboutModal = openAboutModal;

// =============================================================================
// DOPAMINE GUIDE & DIGITAL BRAIN DUMP CONTROLLERS
// =============================================================================
function openDopamineGuideModal() {
  const navMoreMenu = document.getElementById('nav-more-menu');
  if (navMoreMenu) navMoreMenu.classList.add('hidden');
  if (typeof closeMobileMoreMenu === 'function') {
    closeMobileMoreMenu();
  } else {
    document.getElementById('mobile-more-menu')?.classList.add('hidden');
  }
  if (typeof sfx !== 'undefined' && sfx.playClick) {
    sfx.playClick();
  }
  const modal = document.getElementById('modal-dopamine-guide');
  if (modal) {
    const scrollBody = modal.querySelector('.overflow-y-auto');
    if (scrollBody) scrollBody.scrollTop = 0;
  }
  openModal('modal-dopamine-guide');
}
window.openDopamineGuideModal = openDopamineGuideModal;

function closeDopamineGuideModal() {
  if (typeof sfx !== 'undefined' && sfx.playClick) {
    sfx.playClick();
  }
  closeModal('modal-dopamine-guide');
}
window.closeDopamineGuideModal = closeDopamineGuideModal;

// =============================================================================
// SỔ TAY GHI CHÚ ĐA NĂNG, TỰ DO PHÂN LOẠI CHỦ ĐỀ & RICH TEXT WORKSPACE
// =============================================================================
let notesSaveTimeout = null;
let notesStatsRafId = null;
let notesSearchTimeout = null;
let currentTopicFilter = 'all';
let currentNotesSearchQuery = '';

// 1. Quản lý danh sách ghi chú (Multi-notes Vault - Lưu trữ thuần túy trên Redis Cloud & appState)
function getAllNotes() {
  let list = null;
  if (typeof appState !== 'undefined' && Array.isArray(appState.notes) && appState.notes.length > 0) {
    list = appState.notes;
  }

  // Tự động chuyển đổi ghi chú cũ nếu chưa có dữ liệu danh sách
  if (!Array.isArray(list) || list.length === 0) {
    let legacyContent = '';
    if (typeof appState !== 'undefined' && appState.focusNotes) {
      legacyContent = appState.focusNotes;
    }

    if (legacyContent && legacyContent.trim()) {
      list = [{
        id: 'note_' + Date.now(),
        title: 'Ghi Chép Tập Trung',
        topic: 'Ghi Chép Nhanh',
        content: legacyContent,
        pinned: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
    } else {
      list = [{
        id: 'note_' + Date.now(),
        title: 'Kế Hoạch & Mục Tiêu',
        topic: 'Kế Hoạch',
        content: '<h2>🎯 Kế Hoạch Tuần Này</h2><p>Không gian ghi chép tự do của bạn. Bạn có thể tự do đặt tên chủ đề tùy ý!</p><div class="note-todo-item"><input type="checkbox" class="note-checkbox"><span class="note-todo-text">Hoàn thành 3 phiên Pomodoro hôm nay</span></div><div class="note-todo-item"><input type="checkbox" class="note-checkbox"><span class="note-todo-text">Đọc 1 chương tài liệu chuyên ngành</span></div><div class="note-todo-item"><input type="checkbox" class="note-checkbox"><span class="note-todo-text">Ghi chú lại ý tưởng sáng tạo</span></div>',
        pinned: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
    }

    if (typeof appState !== 'undefined') {
      appState.notes = list;
      appState.activeNoteId = list[0].id;
      if (typeof triggerSave === 'function') {
        triggerSave(true, false, null, true);
      }
    }
  }

  return list;
}
window.getAllNotes = getAllNotes;

function saveAllNotes(notesList) {
  if (!Array.isArray(notesList)) return;
  if (typeof appState !== 'undefined') {
    appState.notes = notesList;
  }

  const active = getActiveNote();
  const activeContent = active ? active.content : '';
  if (typeof appState !== 'undefined') {
    appState.focusNotes = activeContent;
    if (typeof triggerSave === 'function') {
      triggerSave(true, false, null, true);
    }
  }

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ch = new BroadcastChannel('levelup_sync_channel');
      ch.postMessage({ type: 'NOTES_UPDATED', content: activeContent, notes: notesList });
      ch.close();
    } catch (_) {}
  }

  updateTotalNotesBadge();
}
window.saveAllNotes = saveAllNotes;

// 2. Lấy danh sách toàn bộ chủ đề người dùng đã tự đặt tên
function getAllTopics() {
  const notes = getAllNotes();
  const set = new Set();
  notes.forEach(n => {
    const t = (n.topic || '').trim();
    if (t) set.add(t);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
}
window.getAllTopics = getAllTopics;

// 3. Lấy ghi chú đang chọn (Active Note)
function getActiveNote() {
  const notes = getAllNotes();
  let id = (typeof appState !== 'undefined' && appState.activeNoteId) || null;
  let found = notes.find(n => n.id === id);
  if (!found) {
    found = notes[0];
    if (found && typeof appState !== 'undefined') {
      appState.activeNoteId = found.id;
    }
  }
  return found;
}
window.getActiveNote = getActiveNote;

// 4. Khởi chạy và tải toàn bộ giao diện Sổ Ghi Chú
function loadNotesWorkspace() {
  renderTopicsBar();
  renderNotesSidebar();
  loadActiveNoteIntoEditor();
  updateTotalNotesBadge();

  // Trên Mobile (< 1024px): Đảm bảo hiển thị đúng chế độ Master (Danh sách) ban đầu
  const isMobile = window.innerWidth < 1024;
  const sidebarCol = document.getElementById('notes-sidebar-column');
  const editorCol = document.getElementById('notes-editor-column');
  const banner = document.getElementById('notes-header-banner');
  const topicsBar = document.getElementById('notes-topics-bar');

  if (isMobile && sidebarCol && editorCol) {
    if (!editorCol.dataset.mobileActive) {
      sidebarCol.classList.remove('hidden');
      editorCol.classList.add('hidden');
      if (banner) banner.classList.remove('hidden');
    }
  }

  if (typeof initHorizontalScrollContainers === 'function') {
    initHorizontalScrollContainers();
  }
}
window.loadNotesWorkspace = loadNotesWorkspace;

// 4b. Làm mới và tái đồng bộ Sổ Ghi Chú
function reloadNotesWorkspace(showToastNotice = false) {
  if (typeof hydrateFromCloud === 'function' && typeof appState !== 'undefined' && appState.profile?.googleId) {
    hydrateFromCloud(false);
  }
  const notes = getAllNotes();
  renderNotesSidebar();
  renderTopicsBar();
  loadActiveNoteIntoEditor();
  updateTotalNotesBadge();

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ch = new BroadcastChannel('levelup_sync_channel');
      ch.postMessage({ type: 'NOTES_UPDATED', notes: notes });
      ch.close();
    } catch (_) {}
  }
  if (typeof initHorizontalScrollContainers === 'function') {
    initHorizontalScrollContainers();
  }
  if (showToastNotice && typeof showToast === 'function') {
    showToast('🔄 Đã làm mới danh sách ghi chú!', 'info');
  }
}
window.reloadNotesWorkspace = reloadNotesWorkspace;

// 5. Vẽ thanh chip lọc chủ đề tự đặt tên
function renderTopicsBar() {
  const containers = [
    document.getElementById('notes-topics-bar'),
    document.getElementById('modal-notes-topics-bar')
  ].filter(Boolean);
  if (containers.length === 0) return;

  const notes = getAllNotes();
  const topicCounts = {};
  for (let i = 0; i < notes.length; i++) {
    const t = (notes[i].topic || '').trim();
    if (t) {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
  }
  const topics = Object.keys(topicCounts).sort((a, b) => a.localeCompare(b, 'vi'));

  let html = `
    <button type="button" onclick="filterNotesByTopic('all')" class="topic-chip px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
      currentTopicFilter === 'all'
        ? 'bg-amber-500 text-slate-950 shadow-xs'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300'
    }">
      🌟 Tất Cả (${notes.length})
    </button>
  `;

  for (const topic of topics) {
    const count = topicCounts[topic] || 0;
    const isActive = currentTopicFilter === topic;
    html += `
      <button type="button" onclick="filterNotesByTopic('${escapeHtml(topic)}')" class="topic-chip px-2.5 py-1 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1 ${
        isActive
          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200/60 dark:border-slate-700/60'
      }">
        <span class="opacity-60 text-[10px]">#</span>
        <span>${escapeHtml(topic)}</span>
        <span class="text-[10px] font-mono px-1 rounded-full ${isActive ? 'bg-slate-950/20' : 'bg-slate-200 dark:bg-slate-700'}">${count}</span>
      </button>
    `;
  }

  containers.forEach(c => {
    c.innerHTML = html;
    c.classList.add('hidden');
  });

  // Cập nhật datalist cho input chọn chủ đề (cả tab và modal)
  const datalistHtml = topics.map(t => `<option value="${escapeHtml(t)}"></option>`).join('');
  const datalist1 = document.getElementById('notes-topics-datalist');
  const datalist2 = document.getElementById('modal-notes-topics-datalist');
  if (datalist1) datalist1.innerHTML = datalistHtml;
  if (datalist2) datalist2.innerHTML = datalistHtml;
}
window.renderTopicsBar = renderTopicsBar;

// Cập nhật text preview và tiêu đề của card đang chọn tại chỗ (In-Place), triệt tiêu giật lag DOM
function updateActiveNoteCardInPlace(note) {
  if (!note) return;
  const cards = document.querySelectorAll(`.note-card-item[data-note-id="${note.id}"]`);
  cards.forEach(card => {
    const titleEl = card.querySelector('.note-card-title');
    if (titleEl && titleEl.textContent !== (note.title || 'Chưa đặt tiêu đề')) {
      titleEl.textContent = note.title || 'Chưa đặt tiêu đề';
    }
    const previewEl = card.querySelector('.note-card-preview');
    if (previewEl) {
      const rawText = note.content ? note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : 'Chưa có nội dung...';
      const preview = rawText.length > 70 ? rawText.slice(0, 70) + '...' : rawText;
      if (previewEl.textContent !== preview) {
        previewEl.textContent = preview;
      }
    }
    const timeEl = card.querySelector('.note-card-time');
    if (timeEl && timeEl.textContent !== 'Vừa xong') {
      timeEl.textContent = 'Vừa xong';
    }
  });
}
window.updateActiveNoteCardInPlace = updateActiveNoteCardInPlace;

// Cập nhật trạng thái Active trên danh sách thẻ in-place, không vẽ lại DOM để chống giật/nhảy
function updateActiveNoteCardHighlight(noteId) {
  const containers = [
    document.getElementById('notes-card-list'),
    document.getElementById('modal-notes-card-list')
  ].filter(Boolean);

  containers.forEach(container => {
    const cards = container.querySelectorAll('.note-card-item');
    cards.forEach(card => {
      const isActive = card.dataset.noteId === noteId;
      card.classList.toggle('active', isActive);
      const titleEl = card.querySelector('.note-card-title');

      if (isActive) {
        card.classList.add('bg-amber-500/10', 'dark:bg-amber-950/30', 'border-amber-500/50', 'shadow-sm');
        card.classList.remove('bg-white', 'dark:bg-slate-900', 'border-slate-200/80', 'dark:border-slate-800');
        if (titleEl) {
          titleEl.classList.add('text-amber-700', 'dark:text-amber-400');
        }
      } else {
        card.classList.remove('active', 'bg-amber-500/10', 'dark:bg-amber-950/30', 'border-amber-500/50', 'shadow-sm');
        card.classList.add('bg-white', 'dark:bg-slate-900', 'border-slate-200/80', 'dark:border-slate-800');
        if (titleEl) {
          titleEl.classList.remove('text-amber-700', 'dark:text-amber-400');
        }
      }
    });
  });
}
window.updateActiveNoteCardHighlight = updateActiveNoteCardHighlight;

// 6. Vẽ danh sách thẻ ghi chú (Sidebar List)
function renderNotesSidebar() {
  const container1 = document.getElementById('notes-card-list');
  const container2 = document.getElementById('modal-notes-card-list');
  const countEl1 = document.getElementById('notes-list-count');
  const countEl2 = document.getElementById('modal-notes-list-count');
  if (!container1 && !container2) return;

  const scrollPos1 = container1 ? container1.scrollTop : 0;
  const scrollPos2 = container2 ? container2.scrollTop : 0;

  const notes = getAllNotes();
  const activeNote = getActiveNote();

  let filtered = notes.filter(n => {
    if (currentNotesSearchQuery) {
      const q = currentNotesSearchQuery.toLowerCase();
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const contentMatch = (n.content || '').toLowerCase().includes(q);
      return titleMatch || contentMatch;
    }
    return true;
  });

  // Sắp xếp: Ghim lên đầu, sau đó theo updatedAt mới nhất
  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  const countText = `${filtered.length} ghi chú`;
  if (countEl1) countEl1.textContent = countText;
  if (countEl2) countEl2.textContent = countText;

  if (filtered.length === 0) {
    const emptyHtml = `
      <div class="text-center py-8 px-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400">
        <span class="material-symbols-outlined text-2xl mb-1 text-slate-300 dark:text-slate-600">search_off</span>
        <div class="text-xs font-medium">Không tìm thấy ghi chú nào</div>
        <button type="button" onclick="createNewNotePrompt()" class="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">+ Tạo ghi chú mới</button>
      </div>
    `;
    if (container1) container1.innerHTML = emptyHtml;
    if (container2) container2.innerHTML = emptyHtml;
    return;
  }

  let html = '';
  filtered.forEach(note => {
    const isActive = activeNote && activeNote.id === note.id;
    const rawText = note.content ? note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : 'Chưa có nội dung...';
    const preview = rawText.length > 70 ? rawText.slice(0, 70) + '...' : rawText;
    const timeFormatted = note.updatedAt ? formatNoteDate(note.updatedAt) : '';

    html += `
      <div
        class="note-card-item p-3 rounded-2xl border transition cursor-pointer select-none relative group ${
          isActive
            ? 'active bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/50 shadow-sm'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
        }"
        onclick="switchActiveNote('${note.id}')"
        data-note-id="${note.id}"
        role="button"
        tabindex="0"
        style="touch-action: manipulation;"
      >
        <div class="flex items-start justify-between gap-2 mb-1 pointer-events-none">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            ${note.pinned ? '<span class="material-symbols-outlined text-amber-500 text-[14px] shrink-0" title="Đã ghim">push_pin</span>' : ''}
            <h4 class="note-card-title text-xs font-bold text-slate-800 dark:text-slate-200 truncate ${isActive ? 'text-amber-700 dark:text-amber-400' : ''}">
              ${escapeHtml(note.title || 'Chưa đặt tiêu đề')}
            </h4>
          </div>
          <span class="note-card-time text-[10px] font-mono text-slate-400 shrink-0">${timeFormatted}</span>
        </div>

        <p class="note-card-preview text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-1 font-normal pointer-events-none">
          ${escapeHtml(preview)}
        </p>

        <div class="flex items-center justify-end gap-1">
          <div class="note-card-actions flex items-center gap-1 transition-opacity">
            <button
              type="button"
              onclick="event.stopPropagation(); togglePinNote('${note.id}')"
              class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500 cursor-pointer"
              title="${note.pinned ? 'Bỏ ghim' : 'Ghim'}"
            >
              <span class="material-symbols-outlined text-[15px] leading-none">${note.pinned ? 'keep_off' : 'push_pin'}</span>
            </button>
            <button
              type="button"
              onclick="event.stopPropagation(); deleteNoteById('${note.id}')"
              class="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 cursor-pointer"
              title="Xóa ghi chú"
            >
              <span class="material-symbols-outlined text-[15px] leading-none">delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  if (container1) {
    container1.innerHTML = html;
    container1.scrollTop = scrollPos1;
  }
  if (container2) {
    container2.innerHTML = html;
    container2.scrollTop = scrollPos2;
  }
}
window.renderNotesSidebar = renderNotesSidebar;

// 7. Định dạng ngày giờ hiển thị ngắn gọn
function formatNoteDate(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return 'Vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}p trước`;
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (diff < 86400000) return `${hh}:${mm}`;
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${mon}`;
}

// 8. Nạp ghi chú đang chọn vào Trình Soạn Thảo (Active Editor)
function loadActiveNoteIntoEditor() {
  const note = getActiveNote();
  if (!note) return;

  const titleInput = document.getElementById('active-note-title');
  const modalTitleInput = document.getElementById('modal-active-note-title');
  const topicInput = document.getElementById('active-note-topic-input');
  const modalTopicInput = document.getElementById('modal-active-note-topic-input');
  const pinIcon = document.getElementById('pin-icon');
  const modalPinIcon = document.getElementById('modal-pin-icon');
  const tabEditor = document.getElementById('focus-notes-tab-editor');
  const modalEditor = document.getElementById('focus-notes-editor');

  const titleVal = note.title || '';
  if (titleInput && titleInput.value !== titleVal && document.activeElement !== titleInput) {
    titleInput.value = titleVal;
  }
  if (modalTitleInput && modalTitleInput.value !== titleVal && document.activeElement !== modalTitleInput) {
    modalTitleInput.value = titleVal;
  }

  const topicVal = note.topic || '';
  if (topicInput && topicInput.value !== topicVal && document.activeElement !== topicInput) {
    topicInput.value = topicVal;
  }
  if (modalTopicInput && modalTopicInput.value !== topicVal && document.activeElement !== modalTopicInput) {
    modalTopicInput.value = topicVal;
  }

  [pinIcon, modalPinIcon].forEach(icon => {
    if (icon) {
      icon.textContent = note.pinned ? 'keep' : 'push_pin';
      icon.classList.toggle('text-amber-500', Boolean(note.pinned));
    }
  });

  if (tabEditor && document.activeElement !== tabEditor) {
    tabEditor.innerHTML = note.content || '';
  }
  if (modalEditor && document.activeElement !== modalEditor) {
    modalEditor.innerHTML = note.content || '';
  }

  updateNotesStats();
}
window.loadActiveNoteIntoEditor = loadActiveNoteIntoEditor;

// 9. Tạo ghi chú mới (Create New Note)
function createNewNotePrompt(defaultTopic = '') {
  const notes = getAllNotes();
  const topic = defaultTopic || (currentTopicFilter !== 'all' ? currentTopicFilter : 'Ghi Chép Nhanh');
  const newNote = {
    id: 'note_' + Date.now(),
    title: 'Ghi Chú Mới',
    topic: topic,
    content: '<p></p>',
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  notes.unshift(newNote);
  saveAllNotes(notes);
  switchActiveNote(newNote.id);
  renderTopicsBar();

  if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
  if (typeof showToast === 'function') {
    showToast(`📝 Đã tạo ghi chú mới!`, 'success');
  }

  setTimeout(() => {
    const isModalOpen = document.getElementById('modal-brain-dump')?.classList.contains('hidden') === false;
    const titleEl = isModalOpen
      ? (document.getElementById('modal-active-note-title') || document.getElementById('active-note-title'))
      : (document.getElementById('active-note-title') || document.getElementById('modal-active-note-title'));
    if (titleEl) {
      titleEl.focus();
      titleEl.select();
    }
  }, 100);
}
window.createNewNotePrompt = createNewNotePrompt;

// 10. Chuyển đổi giữa các ghi chú
function switchActiveNote(noteId) {
  // Lưu ghi chú trước đó nếu đang có nội dung thay đổi
  flushCurrentEditorChanges();

  if (typeof appState !== 'undefined') {
    appState.activeNoteId = noteId;
  }

  loadActiveNoteIntoEditor();
  updateActiveNoteCardHighlight(noteId);

  // Trên Mobile: Chuyển sang Màn 2 (Trình Soạn Thảo), ẩn Header banner, Topics bar và Danh sách
  const isMobile = window.innerWidth < 1024;
  const editorCol = document.getElementById('notes-editor-column');
  const sidebarCol = document.getElementById('notes-sidebar-column');
  const banner = document.getElementById('notes-header-banner');
  const topicsBar = document.getElementById('notes-topics-bar');

  if (isMobile && editorCol && sidebarCol) {
    editorCol.dataset.mobileActive = 'true';
    sidebarCol.classList.add('hidden');
    editorCol.classList.remove('hidden');
    if (banner) banner.classList.add('hidden');
    if (topicsBar) topicsBar.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}
window.switchActiveNote = switchActiveNote;

// Mobile: quay lại danh sách ghi chú
function showNotesListMobile() {
  flushCurrentEditorChanges();
  const editorCol = document.getElementById('notes-editor-column');
  const sidebarCol = document.getElementById('notes-sidebar-column');
  const banner = document.getElementById('notes-header-banner');
  const topicsBar = document.getElementById('notes-topics-bar');

  if (editorCol) {
    delete editorCol.dataset.mobileActive;
    editorCol.classList.add('hidden');
  }
  if (sidebarCol) sidebarCol.classList.remove('hidden');
  if (banner) banner.classList.remove('hidden');

  renderNotesSidebar();
}
window.showNotesListMobile = showNotesListMobile;

// 11. Đổi tiêu đề ghi chú đang chọn
function handleActiveNoteTitleInput(newTitle) {
  const note = getActiveNote();
  if (!note) return;
  note.title = newTitle || 'Chưa đặt tiêu đề';
  note.updatedAt = Date.now();

  const title1 = document.getElementById('active-note-title');
  const title2 = document.getElementById('modal-active-note-title');
  if (title1 && document.activeElement !== title1 && title1.value !== note.title) title1.value = note.title;
  if (title2 && document.activeElement !== title2 && title2.value !== note.title) title2.value = note.title;

  // Cập nhật tiêu đề trên card sidebar in-place ngay lập tức, không phá hủy DOM
  updateActiveNoteCardInPlace(note);

  clearTimeout(notesSaveTimeout);
  notesSaveTimeout = setTimeout(() => {
    saveAllNotes(getAllNotes());
  }, 600);
}
window.handleActiveNoteTitleInput = handleActiveNoteTitleInput;

// 12. Đổi hoặc tự đặt tên chủ đề ghi chú đang chọn
function handleActiveNoteTopicChange(newTopic) {
  const note = getActiveNote();
  if (!note) return;
  const cleanTopic = (newTopic || 'Ghi Chép').trim();
  if (note.topic === cleanTopic) return;

  note.topic = cleanTopic;
  note.updatedAt = Date.now();
  saveAllNotes(getAllNotes());

  const top1 = document.getElementById('active-note-topic-input');
  const top2 = document.getElementById('modal-active-note-topic-input');
  if (top1 && top1.value !== cleanTopic) top1.value = cleanTopic;
  if (top2 && top2.value !== cleanTopic) top2.value = cleanTopic;

  renderTopicsBar();
  renderNotesSidebar();

  if (typeof showToast === 'function') {
    showToast(`🏷️ Đã đổi chủ đề thành "#${cleanTopic}"`, 'info');
  }
}
window.handleActiveNoteTopicChange = handleActiveNoteTopicChange;

// 13. Ghim / Bỏ ghim ghi chú
function toggleActiveNotePin() {
  const note = getActiveNote();
  if (!note) return;
  togglePinNote(note.id);
}
window.toggleActiveNotePin = toggleActiveNotePin;

function togglePinNote(noteId) {
  const notes = getAllNotes();
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  note.pinned = !note.pinned;
  note.updatedAt = Date.now();
  saveAllNotes(notes);
  loadActiveNoteIntoEditor();
  renderNotesSidebar();

  if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
  if (typeof showToast === 'function') {
    showToast(note.pinned ? '📌 Đã ghim ghi chú lên đầu!' : 'Đã bỏ ghim ghi chú.', 'info');
  }
}
window.togglePinNote = togglePinNote;

// 14. Xóa ghi chú
async function deleteActiveNotePrompt() {
  const note = getActiveNote();
  if (!note) return;
  await deleteNoteById(note.id);
}
window.deleteActiveNotePrompt = deleteActiveNotePrompt;

async function deleteNoteById(noteId) {
  const notes = getAllNotes();
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  if (typeof confirmAction === 'function') {
    const ok = await confirmAction({
      title: 'Xóa Ghi Chú',
      message: `Xóa ghi chú "${note.title || 'Chưa đặt tiêu đề'}"? Thao tác này không thể hoàn tác.`,
      confirmText: 'Xóa Ghi Chú',
      cancelText: 'Hủy',
      icon: '🗑️',
      btnColor: 'rose'
    });
    if (!ok) return;
  }

  const remaining = notes.filter(n => n.id !== noteId);
  if (remaining.length === 0) {
    remaining.push({
      id: 'note_' + Date.now(),
      title: 'Ghi Chú Mới',
      topic: 'Ghi Chép Nhanh',
      content: '<p></p>',
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  if (typeof appState !== 'undefined') {
    appState.activeNoteId = remaining[0].id;
  }
  saveAllNotes(remaining);
  renderTopicsBar();
  loadNotesWorkspace();

  if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
  if (typeof showToast === 'function') {
    showToast('Đã xóa ghi chú.', 'info');
  }
}
window.deleteNoteById = deleteNoteById;

// 15. Lọc theo chủ đề & Tìm kiếm
function filterNotesByTopic(topic) {
  currentTopicFilter = topic;
  renderTopicsBar();
  renderNotesSidebar();
}
window.filterNotesByTopic = filterNotesByTopic;

function handleNotesSearch(query) {
  clearTimeout(notesSearchTimeout);
  notesSearchTimeout = setTimeout(() => {
    currentNotesSearchQuery = (query || '').trim();
    const s1 = document.getElementById('notes-search-input');
    const s2 = document.getElementById('modal-notes-search-input');
    if (s1 && document.activeElement !== s1 && s1.value !== query) s1.value = query;
    if (s2 && document.activeElement !== s2 && s2.value !== query) s2.value = query;
    renderNotesSidebar();
  }, 120);
}
window.handleNotesSearch = handleNotesSearch;

function updateTotalNotesBadge() {
  const notes = getAllNotes();
  const badgeNav = document.getElementById('badge-notes-count');
  const badgeHeader = document.getElementById('notes-total-badge');
  const badgeModal = document.getElementById('modal-notes-badge-count');
  if (badgeNav) badgeNav.textContent = notes.length;
  if (badgeHeader) badgeHeader.textContent = `${notes.length} Ghi Chú`;
  if (badgeModal) badgeModal.textContent = notes.length;
}

// 16. Lưu nội dung editor hiện tại vào Active Note
function flushCurrentEditorChanges() {
  const editor = getActiveNotesEditor();
  if (!editor) return;
  const note = getActiveNote();
  if (!note) return;

  const currentContent = editor.innerHTML || '';
  if (currentContent !== (note.content || '')) {
    note.content = currentContent;
    note.updatedAt = Date.now();
    saveAllNotes(getAllNotes());
  }
}

let notesPreviewDebounceTimer = null;

function handleNotesInput() {
  const editor = getActiveNotesEditor();
  if (!editor) return;

  // Cập nhật content trong bộ nhớ ngay lập tức để không mất dữ liệu
  const note = getActiveNote();
  if (note) {
    note.content = editor.innerHTML || '';
  }

  // Cập nhật trạng thái "Đang lưu..." mượt mà, tránh reset animation và đập vỡ DOM
  const statusEl = document.getElementById('tab-notes-save-status');
  const modalStatusEl = document.getElementById('notes-save-status');
  if (statusEl && !statusEl.dataset.isSaving) {
    statusEl.dataset.isSaving = 'true';
    statusEl.className = 'inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium font-sans';
    statusEl.innerHTML = '<span class="save-status-dot w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block mr-1"></span><span>Đang lưu...</span>';
  }
  if (modalStatusEl && modalStatusEl.textContent !== 'Đang lưu...') {
    modalStatusEl.textContent = 'Đang lưu...';
  }

  // Debounce cập nhật preview thẻ sidebar và stats (200ms) để triệt tiêu hoàn toàn rung giật màn hình khi gõ phím!
  clearTimeout(notesPreviewDebounceTimer);
  notesPreviewDebounceTimer = setTimeout(() => {
    if (notesStatsRafId) cancelAnimationFrame(notesStatsRafId);
    notesStatsRafId = requestAnimationFrame(() => {
      updateNotesStats();
      if (note) {
        updateActiveNoteCardInPlace(note);
      }
    });
  }, 200);

  clearTimeout(notesSaveTimeout);
  notesSaveTimeout = setTimeout(() => {
    const active = getActiveNote();
    if (active) {
      active.content = editor.innerHTML || '';
      active.updatedAt = Date.now();
      saveAllNotes(getAllNotes());
    }

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const statusText = `✓ Đã lưu lúc ${hh}:${mm}:${ss}`;
    if (statusEl) {
      delete statusEl.dataset.isSaving;
      statusEl.className = 'inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium font-sans';
      statusEl.innerHTML = `<span class="save-status-dot w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span><span>${statusText}</span>`;
    }
    if (modalStatusEl) modalStatusEl.textContent = statusText;
  }, 600);
}
window.handleNotesInput = handleNotesInput;

function getActiveNotesEditor() {
  const modal = document.getElementById('modal-brain-dump');
  if (modal && !modal.classList.contains('hidden')) {
    return document.getElementById('focus-notes-editor') || document.getElementById('focus-notes-tab-editor');
  }
  return document.getElementById('focus-notes-tab-editor') || document.getElementById('focus-notes-editor');
}
window.getActiveNotesEditor = getActiveNotesEditor;

function syncAllNoteEditors(htmlContent) {
  const content = htmlContent || '';
  const tabEditor = document.getElementById('focus-notes-tab-editor');
  const modalEditor = document.getElementById('focus-notes-editor');

  [tabEditor, modalEditor].forEach(ed => {
    if (ed && ed.innerHTML !== content && document.activeElement !== ed) {
      ed.innerHTML = content;
    }
  });
  updateNotesStats();
}
window.syncAllNoteEditors = syncAllNoteEditors;

// 17. Bộ công cụ định dạng Rich Text chuyên nghiệp
function formatNoteDoc(cmd, val = null) {
  const editor = getActiveNotesEditor();
  if (!editor) return;
  editor.focus();
  try {
    document.execCommand(cmd, false, val);
  } catch (_) {}
  handleNotesInput();
}
window.formatNoteDoc = formatNoteDoc;

function formatNoteHeading(tag) {
  const editor = getActiveNotesEditor();
  if (!editor) return;
  editor.focus();
  try {
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      let node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
      const headingParent = node.closest('h1, h2, h3, h4, h5, h6, p');
      if (headingParent && headingParent !== editor) {
        const currentTag = headingParent.tagName.toLowerCase();
        if (currentTag === tag.toLowerCase()) {
          document.execCommand('formatBlock', false, '<p>');
          handleNotesInput();
          return;
        }
      }
    }
    document.execCommand('formatBlock', false, `<${tag}>`);
  } catch (_) {}
  handleNotesInput();
}
window.formatNoteHeading = formatNoteHeading;

function toggleNoteHighlight() {
  const editor = getActiveNotesEditor();
  if (!editor) return;
  editor.focus();
  try {
    const sel = window.getSelection();
    let isHighlighted = false;
    if (sel && sel.anchorNode) {
      let node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
      while (node && node !== editor) {
        if (node.tagName === 'MARK' || node.classList.contains('note-highlight')) {
          isHighlighted = true;
          break;
        }
        if (node.style && node.style.backgroundColor && node.style.backgroundColor !== 'transparent' && node.style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          isHighlighted = true;
          break;
        }
        node = node.parentElement;
      }
    }

    if (isHighlighted) {
      document.execCommand('hiliteColor', false, 'transparent');
      document.execCommand('removeFormat', false, null);
    } else {
      const isDark = document.documentElement.classList.contains('dark');
      const color = isDark ? 'rgba(245, 158, 11, 0.45)' : '#fef08a';
      document.execCommand('hiliteColor', false, color);
    }
  } catch (_) {}
  handleNotesInput();
}
window.toggleNoteHighlight = toggleNoteHighlight;

// Chèn Checklist tương tác
function insertNoteChecklist() {
  const editor = getActiveNotesEditor();
  if (!editor) return;
  editor.focus();
  const placeholderText = 'Việc cần làm...';
  const html = `<div class="note-todo-item"><input type="checkbox" class="note-checkbox" contenteditable="false"><span class="note-todo-text">${placeholderText}</span></div><p><br></p>`;
  try {
    document.execCommand('insertHTML', false, html);
  } catch (_) {}

  // Bôi đen chữ "Việc cần làm..." để người dùng gõ đè được ngay
  const sel = window.getSelection();
  if (sel) {
    const items = editor.querySelectorAll('.note-todo-item .note-todo-text');
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      if (lastItem.textContent === placeholderText) {
        const r = document.createRange();
        r.selectNodeContents(lastItem);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
  }
  handleNotesInput();
}
window.insertNoteChecklist = insertNoteChecklist;

// Chèn dấu thời gian nhanh
function insertNoteTimestamp() {
  const editor = getActiveNotesEditor();
  if (!editor) return;
  editor.focus();
  const d = new Date();
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const html = `<strong>📅 [${timeStr} - ${dateStr}]</strong>&nbsp;`;
  try {
    document.execCommand('insertHTML', false, html);
  } catch (_) {}
  handleNotesInput();
}
window.insertNoteTimestamp = insertNoteTimestamp;

// Chèn Callout tip
function insertNoteCallout() {
  const editor = getActiveNotesEditor();
  if (!editor) return;
  editor.focus();
  const html = '<div class="note-callout"><span>💡</span><div><b>Lưu ý quan trọng:</b> Ghi lại điểm cần nhớ tại đây...</div></div><p></p>';
  try {
    document.execCommand('insertHTML', false, html);
  } catch (_) {}
  handleNotesInput();
}
window.insertNoteCallout = insertNoteCallout;

// Chèn Code inline hoặc Block
function insertNoteCode() {
  const editor = getActiveNotesEditor();
  if (!editor) return;
  editor.focus();
  const sel = window.getSelection();
  let codeParent = null;
  if (sel && sel.anchorNode) {
    let node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
    while (node && node !== editor) {
      if (node.tagName === 'CODE') {
        codeParent = node;
        break;
      }
      node = node.parentElement;
    }
  }

  if (codeParent) {
    const textNode = document.createTextNode(codeParent.textContent || '');
    codeParent.parentNode.replaceChild(textNode, codeParent);
    handleNotesInput();
    return;
  }

  const selectedText = sel ? sel.toString() : '';
  if (selectedText) {
    const html = `<code>${escapeHtml(selectedText)}</code>`;
    try {
      document.execCommand('insertHTML', false, html);
    } catch (_) {}
  } else {
    const codeEl = document.createElement('code');
    codeEl.textContent = 'code_here';
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    if (range) {
      range.deleteContents();
      range.insertNode(codeEl);
      range.selectNodeContents(codeEl);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      document.execCommand('insertHTML', false, '<code>code_here</code>&nbsp;');
    }
  }
  handleNotesInput();
}
window.insertNoteCode = insertNoteCode;

// Chèn Divider
function insertNoteDivider() {
  const editor = getActiveNotesEditor();
  if (!editor) return;
  editor.focus();
  try {
    document.execCommand('insertHTML', false, '<hr><p><br></p>');
  } catch (_) {
    document.execCommand('insertHorizontalRule', false, null);
  }
  handleNotesInput();
}
window.insertNoteDivider = insertNoteDivider;

// 17b. Bộ nhận diện & chuyển đổi cú pháp Markdown trong Sổ Ghi Chú
function isMarkdownText(text) {
  if (!text || typeof text !== 'string') return false;
  const mdPatterns = [
    /\*\*[^*]+?\*\*/,                     // **bold**
    /__[^_]+?__/,                         // __bold__
    /~~[^~]+?~~/,                         // ~~strikethrough~~
    /(?:^|\n)\s*#{1,6}\s+\S/,              // # Heading
    /(?:^|\n)\s*[-*+]\s+\[[ xX]\]\s+/,       // - [ ] Checklist
    /(?:^|\n)\s*[-*+]\s+\S/,              // * List item or - List item
    /(?:^|\n)\s*\d+\.\s+\S/,              // 1. Numbered item
    /(?:^|\n)\s*>\s+\S/,                  // > Blockquote
    /```[\s\S]*?```/,                     // ```code block```
    /`[^`\n]+`/,                          // `inline code`
    /\[.+?\]\((?:https?:\/\/|\/|\.?\/)[^\s)]+\)/, // [link](url)
    /(?:^|\n)\s*(?:---|\*\*\*|___)\s*(?:\n|$)/     // Horizontal rule
  ];
  return mdPatterns.some(pattern => pattern.test(text));
}
window.isMarkdownText = isMarkdownText;

function parseInlineMarkdown(text) {
  if (!text) return '';
  let res = escapeHtml(text);

  // 1. Code inline: `code`
  const inlineCodes = [];
  res = res.replace(/`([^`\n]+)`/g, (_m, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code>${code}</code>`);
    return `@@INLINECODE${idx}@@`;
  });

  // 2. Markdown Links: [text](url)
  const links = [];
  res = res.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|\.?\/)[^\s)]+)\)/g, (_m, linkText, url) => {
    const idx = links.length;
    links.push(`<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`);
    return `@@MDLINK${idx}@@`;
  });

  // 3. Bold + Italic: ***text*** or ___text___
  res = res.replace(/\*\*\*([^*]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  res = res.replace(/___([^_]+?)___/g, '<strong><em>$1</em></strong>');

  // 4. Bold: **text** or __text__
  res = res.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/__([^_]+?)__/g, '<strong>$1</strong>');

  // 5. Italic: *text* or _text_
  res = res.replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
  res = res.replace(/(^|[^_])_([^_]+?)_(?!_)/g, '$1<em>$2</em>');

  // 6. Strikethrough: ~~text~~
  res = res.replace(/~~([^~]+?)~~/g, '<del>$1</del>');

  // 7. Auto-link bare URLs (nếu chưa nằm trong <a>)
  res = res.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)(?=[)\s]|$)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');

  // 8. Khôi phục Links & Inline Code
  res = res.replace(/@@MDLINK(\d+)@@/g, (_m, idx) => links[Number(idx)] || '');
  res = res.replace(/@@INLINECODE(\d+)@@/g, (_m, idx) => inlineCodes[Number(idx)] || '');

  return res;
}
window.parseInlineMarkdown = parseInlineMarkdown;

function convertMarkdownToEditorHtml(md) {
  if (!md || typeof md !== 'string') return '<p></p>';

  const normalized = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const codeBlocks = [];
  const text = normalized.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="note-code-block" data-lang="${escapeHtml(lang)}"><code>${escapeHtml(code.trim())}</code></pre>`);
    return `@@CODEBLOCK${idx}@@`;
  });

  const lines = text.split('\n');
  const out = [];

  let inUl = false;
  let inOl = false;
  let inQuote = false;
  let quoteLines = [];

  function closeLists() {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  }

  function flushQuote() {
    if (inQuote) {
      out.push(`<blockquote>${quoteLines.join('<br>')}</blockquote>`);
      inQuote = false;
      quoteLines = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      closeLists();
      flushQuote();
      continue;
    }

    const cbMatch = trimmed.match(/^@@CODEBLOCK(\d+)@@$/);
    if (cbMatch) {
      closeLists();
      flushQuote();
      out.push(codeBlocks[Number(cbMatch[1])]);
      continue;
    }

    if (/^(?:[-*_]\s*){3,}$/.test(trimmed)) {
      closeLists();
      flushQuote();
      out.push('<hr>');
      continue;
    }

    const quoteMatch = line.match(/^\s*>\s?(.*)$/);
    if (quoteMatch) {
      closeLists();
      inQuote = true;
      quoteLines.push(parseInlineMarkdown(quoteMatch[1]));
      continue;
    } else {
      flushQuote();
    }

    const hMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      closeLists();
      const level = Math.min(hMatch[1].length, 3);
      out.push(`<h${level}>${parseInlineMarkdown(hMatch[2])}</h${level}>`);
      continue;
    }

    const todoMatch = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (todoMatch) {
      closeLists();
      const isDone = todoMatch[1].toLowerCase() === 'x';
      const checkedAttr = isDone ? ' checked="checked"' : '';
      const doneClass = isDone ? ' is-done' : '';
      out.push(`<div class="note-todo-item${doneClass}"><input type="checkbox" class="note-checkbox"${checkedAttr}><span class="note-todo-text">${parseInlineMarkdown(todoMatch[2])}</span></div>`);
      continue;
    }

    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ulMatch) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`<li>${parseInlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`<li>${parseInlineMarkdown(olMatch[2])}</li>`);
      continue;
    }

    closeLists();
    out.push(`<p>${parseInlineMarkdown(trimmed)}</p>`);
  }

  closeLists();
  flushQuote();

  return out.join('') || '<p></p>';
}
window.convertMarkdownToEditorHtml = convertMarkdownToEditorHtml;

function formatMarkdownInActiveEditor() {
  const editor = getActiveNotesEditor() || document.querySelector('.notes-editor');
  if (!editor) return;

  const sel = window.getSelection();
  const hasSelection = sel && !sel.isCollapsed && sel.toString().trim().length > 0;

  if (hasSelection) {
    const text = sel.toString();
    if (!isMarkdownText(text)) {
      if (typeof showToast === 'function') {
        showToast('ℹ️ Đoạn văn bản bôi đen không chứa cú pháp Markdown.', 'info');
      }
      return;
    }
    const isSingleLine = !text.includes('\n') && !/^\s*(?:#{1,6}|[-*+]|\d+\.|>|---)\s+/m.test(text);
    const converted = isSingleLine ? parseInlineMarkdown(text) : convertMarkdownToEditorHtml(text);
    document.execCommand('insertHTML', false, converted);
    handleNotesInput();
    if (typeof showToast === 'function') {
      showToast('✨ Đã định dạng đoạn Markdown đã chọn!', 'success');
    }
    return;
  }

  let text = '';
  if (typeof editor.innerText === 'string' && editor.innerText.trim()) {
    text = editor.innerText;
  } else {
    const temp = document.createElement('div');
    temp.innerHTML = editor.innerHTML
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n');
    text = temp.textContent || temp.innerText || '';
  }

  if (!text.trim()) {
    if (typeof showToast === 'function') {
      showToast('ℹ️ Ghi chú đang trống, hãy nhập nội dung trước.', 'info');
    }
    return;
  }

  if (!isMarkdownText(text)) {
    if (typeof showToast === 'function') {
      showToast('ℹ️ Ghi chú hiện tại không phát hiện cú pháp Markdown.', 'info');
    }
    return;
  }

  const converted = convertMarkdownToEditorHtml(text);
  if (converted) {
    editor.innerHTML = converted;
    handleNotesInput();
    if (typeof showToast === 'function') {
      showToast('✨ Đã tự động nhận diện và chuyển đổi toàn bộ Markdown thành định dạng!', 'success');
    }
  }
}
window.formatMarkdownInActiveEditor = formatMarkdownInActiveEditor;

// 18. Lắng nghe phím Enter trong Checklist & Clean Paste
function setupNotesEditorListeners() {
  try {
    document.execCommand('defaultParagraphSeparator', false, 'p');
  } catch (_) {}

  // Cho phép click mở link URL trực tiếp trong tab mới từ vùng soạn thảo contenteditable
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const editor = link.closest('#focus-notes-tab-editor, #focus-notes-editor, .notes-editor');
    if (editor) {
      let href = (link.getAttribute('href') || link.href || '').trim();
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        if (!/^https?:\/\//i.test(href) && !href.startsWith('//') && !href.startsWith('mailto:')) {
          href = 'https://' + href;
        }
        e.preventDefault();
        e.stopPropagation();
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  });

  // Lắng nghe sự kiện tick chọn checkbox trong toàn bộ vùng soạn thảo
  document.addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('note-checkbox')) {
      const item = e.target.closest('.note-todo-item');
      if (item) {
        if (e.target.checked) {
          item.classList.add('is-done');
          e.target.setAttribute('checked', 'checked');
        } else {
          item.classList.remove('is-done');
          e.target.removeAttribute('checked');
        }
        handleNotesInput();
      }
    }
  });

  // Lắng nghe bàn phím (Enter checklist, Tab thụt dòng, Ctrl+S lưu)
  ['focus-notes-tab-editor', 'focus-notes-editor'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('focus', () => {
      try {
        document.execCommand('defaultParagraphSeparator', false, 'p');
      } catch (_) {}
    });

    el.addEventListener('keydown', (e) => {
      // Phím tắt Ctrl+S / Cmd+S để lưu ngay
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        flushCurrentEditorChanges();
        if (typeof showToast === 'function') {
          showToast('💾 Đã lưu ghi chú thành công!', 'success');
        }
        return;
      }

      // Nhấn Enter trong checklist item để sinh item mới
      if (e.key === 'Enter' && !e.shiftKey) {
        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
          const item = sel.anchorNode.nodeType === 1 ? sel.anchorNode.closest('.note-todo-item') : sel.anchorNode.parentElement?.closest('.note-todo-item');
          if (item) {
            const spanTextEl = item.querySelector('.note-todo-text');
            const textContent = (spanTextEl?.textContent || item.textContent || '').replace(/\u00a0/g, ' ').trim();
            if (!textContent || textContent === 'Việc cần làm...' || textContent === 'Nhiệm vụ mới...') {
              // Nếu dòng trống, bấm Enter sẽ thoát checklist thành đoạn văn thường
              e.preventDefault();
              const p = document.createElement('p');
              p.innerHTML = '<br>';
              item.parentNode.replaceChild(p, item);
              const range = document.createRange();
              range.setStart(p, 0);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
              handleNotesInput();
              return;
            }

            e.preventDefault();
            const newItem = document.createElement('div');
            newItem.className = 'note-todo-item';
            newItem.innerHTML = '<input type="checkbox" class="note-checkbox" contenteditable="false"><span class="note-todo-text">&nbsp;</span>';
            item.parentNode.insertBefore(newItem, item.nextSibling);

            const span = newItem.querySelector('.note-todo-text');
            const range = document.createRange();
            range.setStart(span, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            handleNotesInput();
            return;
          }
        }
      }

      // Nhấn Backspace trong checklist item trống để thoát ra văn bản thường
      if (e.key === 'Backspace') {
        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
          const item = sel.anchorNode.nodeType === 1 ? sel.anchorNode.closest('.note-todo-item') : sel.anchorNode.parentElement?.closest('.note-todo-item');
          if (item) {
            const spanTextEl = item.querySelector('.note-todo-text');
            const textContent = (spanTextEl?.textContent || item.textContent || '').replace(/\u00a0/g, ' ').trim();
            if (!textContent || textContent === 'Việc cần làm...' || textContent === 'Nhiệm vụ mới...') {
              e.preventDefault();
              const p = document.createElement('p');
              p.innerHTML = '<br>';
              item.parentNode.replaceChild(p, item);
              const range = document.createRange();
              range.setStart(p, 0);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
              handleNotesInput();
              return;
            }
          }
        }
      }

      // Phím tắt Ctrl+Shift+M / Cmd+Shift+M: Nhận diện & định dạng Markdown
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        formatMarkdownInActiveEditor();
        return;
      }

      // Phím Tab: thụt đầu dòng
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
        handleNotesInput();
      }
    });

    // Lọc sạch rác khi Paste & Tự động nhận diện Markdown (Smart Markdown & Clean Paste)
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      const clipboard = e.clipboardData || window.clipboardData;
      if (!clipboard) return;

      const text = (clipboard.getData('text/plain') || '').trim();

      if (isMarkdownText(text)) {
        const isSingleLine = !text.includes('\n') && !/^\s*(?:#{1,6}|[-*+]|\d+\.|>|---)\s+/m.test(text);
        const formatted = isSingleLine ? parseInlineMarkdown(text) : convertMarkdownToEditorHtml(text);
        if (formatted) {
          document.execCommand('insertHTML', false, formatted);
          handleNotesInput();
          if (typeof showToast === 'function') {
            showToast('✨ Đã tự động nhận diện và chuyển đổi cú pháp Markdown!', 'success');
          }
          return;
        }
      }

      if (text) {
        if (text.includes('\n')) {
          const formatted = convertMarkdownToEditorHtml(text);
          document.execCommand('insertHTML', false, formatted);
        } else {
          document.execCommand('insertText', false, text);
        }
        handleNotesInput();
      }
    });

    // Lắng nghe input gõ chữ
    el.addEventListener('input', () => {
      handleNotesInput();
    });
  });
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNotesEditorListeners);
  } else {
    setTimeout(setupNotesEditorListeners, 50);
  }
}

// 19. Cập nhật thống kê từ & ký tự
function updateNotesStats() {
  const editor = getActiveNotesEditor();
  const rawText = editor ? (editor.textContent || '').trim() : '';
  const wordCount = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = rawText ? rawText.length : 0;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const tabWordsEl = document.getElementById('tab-notes-word-count');
  const tabCharsEl = document.getElementById('tab-notes-char-count');
  const tabReadEl = document.getElementById('tab-notes-read-time');
  if (tabWordsEl) tabWordsEl.textContent = `${wordCount} từ`;
  if (tabCharsEl) tabCharsEl.textContent = `${charCount} ký tự`;
  if (tabReadEl) tabReadEl.textContent = wordCount > 0 ? `~${readTimeMinutes} phút đọc` : '~0 phút đọc';

  const modalWordsEl = document.getElementById('notes-word-count');
  const modalCharsEl = document.getElementById('notes-char-count');
  const modalReadEl = document.getElementById('notes-reading-time');
  if (modalWordsEl) modalWordsEl.textContent = `${wordCount} từ`;
  if (modalCharsEl) modalCharsEl.textContent = `${charCount} ký tự`;
  if (modalReadEl) modalReadEl.textContent = wordCount > 0 ? `~${readTimeMinutes} phút đọc` : '~0 phút đọc';

  // Focus banner badge
  const bannerBadge = document.getElementById('brain-dump-badge');
  if (bannerBadge) {
    if (charCount > 0) {
      bannerBadge.classList.remove('hidden');
      bannerBadge.textContent = wordCount > 0 ? `${wordCount} từ` : '•';
    } else {
      bannerBadge.classList.add('hidden');
    }
  }

  // Zen mode badge
  const zenBadge = document.getElementById('zen-brain-dump-badge');
  if (zenBadge) {
    if (charCount > 0) {
      zenBadge.classList.remove('hidden');
      zenBadge.textContent = wordCount > 0 ? `${wordCount} từ` : '•';
    } else {
      zenBadge.classList.add('hidden');
    }
  }

  // Complete modal banner
  const completeBanner = document.getElementById('focus-complete-brain-dump-banner');
  const completeCountEl = document.getElementById('focus-complete-brain-dump-count');
  if (completeBanner) {
    if (charCount > 0) {
      completeBanner.classList.remove('hidden');
      if (completeCountEl) completeCountEl.textContent = `${wordCount} từ`;
    } else {
      completeBanner.classList.add('hidden');
    }
  }
}
window.updateNotesStats = updateNotesStats;
window.updateBrainDumpBadges = updateNotesStats;

// 20. Sao chép nội dung ghi chú (Copy to Clipboard)
function copyActiveNote() {
  const note = getActiveNote();
  const editor = getActiveNotesEditor();
  if (!editor || !note) return;

  const text = (editor.innerText || editor.textContent || '').trim();
  if (!text) {
    if (typeof showToast === 'function') {
      showToast('Ghi chú hiện chưa có nội dung!', 'info');
    }
    return;
  }

  const title = note.title || 'Ghi Chú';
  const fullText = `# ${title}\n\n${text}`;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(fullText).then(() => {
      if (typeof showToast === 'function') {
        showToast('📋 Đã sao chép nội dung ghi chú vào clipboard!', 'success');
      }
      if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
    }).catch(() => {
      if (typeof showToast === 'function') {
        showToast('Không thể sao chép tự động!', 'error');
      }
    });
  }
}
window.copyActiveNote = copyActiveNote;
window.copyFocusNotes = copyActiveNote;

// 21. Xuất file Markdown (.md) hoặc Text (.txt)
function exportActiveNote(format = 'md') {
  const note = getActiveNote();
  const editor = getActiveNotesEditor();
  if (!note || !editor) return;

  const title = (note.title || 'Ghi_Chu').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  const text = (editor.innerText || editor.textContent || '').trim();
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `LevelUp_${title}_${dateStr}.${format}`;

  let content = '';
  if (format === 'md') {
    content = `# ${note.title || 'Ghi Chú'}\nNgày cập nhật: ${new Date(note.updatedAt || Date.now()).toLocaleString('vi-VN')}\n\n---\n\n${text}\n`;
  } else {
    content = `${note.title || 'Ghi Chú'}\n\n${text}\n`;
  }

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (typeof showToast === 'function') {
    showToast(`💾 Đã xuất file ${filename}!`, 'success');
  }
}
window.exportActiveNote = exportActiveNote;

// 22. Xóa trắng nội dung ghi chú
async function clearActiveNoteContent() {
  const note = getActiveNote();
  const editor = getActiveNotesEditor();
  if (!note || !editor) return;

  if (typeof confirmAction === 'function') {
    const ok = await confirmAction({
      title: 'Xóa Nội Dung',
      message: `Xóa toàn bộ nội dung trong ghi chú "${note.title || 'Chưa đặt tiêu đề'}"?`,
      confirmText: 'Xóa Nội Dung',
      cancelText: 'Hủy',
      icon: '🗑️',
      btnColor: 'rose'
    });
    if (!ok) return;
  }

  editor.innerHTML = '';
  note.content = '';
  note.updatedAt = Date.now();
  saveAllNotes(getAllNotes());
  updateNotesStats();
  renderNotesSidebar();

  if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
  if (typeof showToast === 'function') {
    showToast('Đã xóa nội dung ghi chú.', 'info');
  }
}
window.clearActiveNoteContent = clearActiveNoteContent;
window.clearFocusNotes = clearActiveNoteContent;

// 23. Toàn màn hình chế độ tập trung (Focus Distraction-Free Mode)
function toggleNoteFullscreen() {
  const section = document.getElementById('tab-notes');
  if (!section) return;
  section.classList.toggle('focus-fullscreen');
  const isFull = section.classList.contains('focus-fullscreen');
  if (typeof showToast === 'function') {
    showToast(isFull ? '🔲 Chế độ tập trung toàn màn hình (Bấm lại để thoát)' : 'Đã thoát chế độ toàn màn hình.', 'info');
  }
}
window.toggleNoteFullscreen = toggleNoteFullscreen;

// 24. Nhận đoạn trích từ Chrome Extension (Context Menu Clip)
function appendClipToNotes(text, sourceUrl = '', pageTitle = '') {
  if (!text) return;
  const notes = getAllNotes();
  const trimmed = text.trim();
  const cleanSnippet = isMarkdownText(trimmed)
    ? convertMarkdownToEditorHtml(trimmed)
    : `<p class="my-1.5 text-xs text-slate-700 dark:text-slate-300">${escapeHtml(trimmed)}</p>`;
  const sourceLabel = pageTitle ? escapeHtml(pageTitle) : (sourceUrl || 'Web');
  const linkHtml = sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-500 underline text-xs">[Nguồn: ${sourceLabel}]</a>` : '';

  const clipHtml = `
    <div class="my-2">
      ${cleanSnippet}
      ${linkHtml ? `<p class="mt-1 text-xs opacity-90">${linkHtml}</p>` : ''}
    </div>
  `;

  // Thêm vào ghi chú đang mở
  let note = getActiveNote();
  if (!note) {
    note = {
      id: 'note_' + Date.now(),
      title: 'Trích Dẫn Web ' + new Date().toLocaleDateString('vi-VN'),
      topic: 'Web Clipping',
      content: '',
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    notes.unshift(note);
  }

  note.content = (note.content || '') + clipHtml;
  note.updatedAt = Date.now();
  saveAllNotes(notes);

  loadActiveNoteIntoEditor();
  renderNotesSidebar();
  renderTopicsBar();

  if (typeof showToast === 'function') {
    showToast('📝 Đã lưu trích dẫn từ web vào Sổ Ghi Chú!', 'success');
  }
}
window.appendClipToNotes = appendClipToNotes;

// 24b. Tạo hoặc cập nhật ghi chú từ Chrome Extension (Google Keep Style Quick Note)
function createNoteFromExtension(data = {}) {
  const { title, body, topic, sourceUrl, sourceTitle, noteId, isNewNote } = data;
  const notes = getAllNotes();

  let formattedContent = '';
  if (body && body.trim()) {
    const trimmedBody = body.trim();
    if (isMarkdownText(trimmedBody)) {
      formattedContent += convertMarkdownToEditorHtml(trimmedBody);
    } else {
      formattedContent += `<p>${escapeHtml(trimmedBody).replace(/\n/g, '<br>')}</p>`;
    }
  }
  if (sourceUrl) {
    const sourceLabel = sourceTitle ? escapeHtml(sourceTitle) : escapeHtml(sourceUrl);
    formattedContent += `
      <p class="my-1.5 text-xs">
        <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 underline font-medium">🔗 ${sourceLabel}</a>
      </p>
      <p></p>
    `;
  }
  if (!formattedContent) {
    formattedContent = '<p></p>';
  }

  // Tìm ghi chú hiện có nếu người dùng chọn theo title từ dropdown extension
  let targetNote = null;
  if (!isNewNote && noteId) {
    targetNote = notes.find(n => n.id === noteId);
  }
  if (!targetNote && !isNewNote && title && title.trim()) {
    targetNote = notes.find(n => (n.title || '').trim().toLowerCase() === title.trim().toLowerCase());
  }

  if (targetNote) {
    if (targetNote.content && targetNote.content.trim()) {
      targetNote.content += formattedContent;
    } else {
      targetNote.content = formattedContent;
    }
    targetNote.updatedAt = Date.now();
    if (typeof appState !== 'undefined') {
      appState.activeNoteId = targetNote.id;
    }
    saveAllNotes(notes);

    loadActiveNoteIntoEditor();
    renderNotesSidebar();
    renderTopicsBar();
    updateTotalNotesBadge();

    if (typeof showToast === 'function') {
      showToast(`📝 Đã lưu vào ghi chú: "${targetNote.title}"!`, 'success');
    }
    return;
  }

  const noteTitle = (title || '').trim() || (sourceTitle ? `Ghi Chép: ${sourceTitle}` : 'Ghi Chú Mới');
  const noteTopic = (topic || '').trim() || 'Ghi Chép';

  const newNote = {
    id: 'note_' + Date.now(),
    title: noteTitle,
    topic: noteTopic,
    content: formattedContent,
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  notes.unshift(newNote);
  if (typeof appState !== 'undefined') {
    appState.activeNoteId = newNote.id;
  }
  saveAllNotes(notes);

  loadActiveNoteIntoEditor();
  renderNotesSidebar();
  renderTopicsBar();
  updateTotalNotesBadge();

  if (typeof showToast === 'function') {
    showToast(`📝 Đã tạo ghi chú mới: "${noteTitle}"!`, 'success');
  }
}
window.createNoteFromExtension = createNoteFromExtension;

// 25. Hàm tương thích ngược với Modal Zen Mode
function getFocusNotesContent() {
  const active = getActiveNote();
  if (active && active.content) return active.content;
  return (typeof appState !== 'undefined' && appState.focusNotes) || '';
}
window.getFocusNotesContent = getFocusNotesContent;

function saveFocusNotesContent(htmlContent) {
  const note = getActiveNote();
  if (note) {
    note.content = htmlContent || '';
    note.updatedAt = Date.now();
    saveAllNotes(getAllNotes());
  } else if (typeof appState !== 'undefined') {
    appState.focusNotes = htmlContent || '';
    if (typeof triggerSave === 'function') {
      triggerSave(true, false, null, true);
    }
  }
  updateNotesStats();
}
window.saveFocusNotesContent = saveFocusNotesContent;

function openBrainDumpModal() {
  if (typeof window.openReactBrainDumpModal === 'function') {
    window.openReactBrainDumpModal();
    return;
  }

  const navMoreMenu = document.getElementById('nav-more-menu');
  if (navMoreMenu) navMoreMenu.classList.add('hidden');
  if (typeof closeMobileMoreMenu === 'function') {
    closeMobileMoreMenu();
  } else {
    document.getElementById('mobile-more-menu')?.classList.add('hidden');
  }

  if (typeof sfx !== 'undefined' && sfx.playClick) {
    sfx.playClick();
  }

  // Tải và đồng bộ hóa toàn bộ danh sách, chủ đề và nội dung đang mở cho Modal
  loadNotesWorkspace();

  openModal('modal-brain-dump');

  setTimeout(() => {
    const editor = document.getElementById('focus-notes-editor');
    if (editor) {
      editor.focus();
    }
  }, 100);
}
window.openBrainDumpModal = openBrainDumpModal;
window.openFocusNotesModal = openBrainDumpModal;

function closeBrainDumpModal() {
  if (typeof window.closeReactBrainDumpModal === 'function') {
    window.closeReactBrainDumpModal();
    return;
  }

  flushCurrentEditorChanges();
  if (typeof sfx !== 'undefined' && sfx.playClick) {
    sfx.playClick();
  }
  closeModal('modal-brain-dump');
}
window.closeBrainDumpModal = closeBrainDumpModal;
window.closeFocusNotesModal = closeBrainDumpModal;

function closeModal(id, immediate = false) {
  if (id === 'modal-welcome') {
    if (!checkIsOnboarded()) return;
  }
  if (id === 'modal-shield-gate') {
    if (typeof isMobileUserDevice === 'function' && typeof isLevelUpExtensionReady === 'function') {
      if (!isMobileUserDevice() && !isLevelUpExtensionReady()) return;
    }
  }
  const modal = document.getElementById(id);
  if (!modal) return;

  const isDismissibleSheet = !immediate && (
    modal.id === 'modal-quest-detail' ||
    modal.id === 'modal-reward-detail' ||
    modal.dataset?.sheetDismiss === 'true'
  );

  if (isDismissibleSheet && !modal.classList.contains('hidden') && !modal.classList.contains('sheet-closing')) {
    dismissModalWithSlideDown(modal);
    return;
  }

  modal.classList.add('hidden');
  modal.classList.remove('sheet-closing');

  // Quay lại modal chi tiết nhiệm vụ trước đó nếu có
  if (window.parentDetailQuestId && (id === 'modal-quest' || id === 'modal-frequency-detail' || id === 'modal-quest-proof')) {
    const returnQuestId = window.parentDetailQuestId;
    window.parentDetailQuestId = null;
    const q = Array.isArray(appState.quests) ? appState.quests.find(item => item.id === returnQuestId) : null;
    if (q && typeof openQuestDetailModal === 'function') {
      setTimeout(() => openQuestDetailModal(returnQuestId), 50);
    }
  }
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

  // 1. First escape raw HTML to prevent XSS attacks
  let safe = escapeHtml(text);

  // 2. Fenced code blocks ```code```
  safe = safe.replace(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_match, code) => {
    return `<pre class="my-2 p-2.5 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-700/50"><code>${code.trim()}</code></pre>`;
  });

  // 3. Inline code `code`
  safe = safe.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-violet-700 dark:text-violet-300 rounded text-[11px] font-mono">$1</code>');

  // 4. Split into lines to process block-level Markdown cleanly
  const lines = safe.split(/\r?\n/);
  const processed = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for Headings: #, ##, ###, ####
    const h4Match = trimmed.match(/^####\s+(.*)$/);
    const h3Match = trimmed.match(/^###\s+(.*)$/);
    const h2Match = trimmed.match(/^##\s+(.*)$/);
    const h1Match = trimmed.match(/^#\s+(.*)$/);

    // Check for Horizontal Rule
    const hrMatch = trimmed.match(/^(\*{3,}|-{3,}|_{3,})$/);

    // Check for Blockquote
    const quoteMatch = trimmed.match(/^>\s+(.*)$/);

    // Check for Unordered List Item: * item, - item, + item
    const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);

    // Check for Ordered List Item: 1. item, 2. item
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);

    if (ulMatch) {
      if (inOl) { processed.push('</ol>'); inOl = false; }
      if (!inUl) { processed.push('<ul class="my-1.5 space-y-1">'); inUl = true; }
      processed.push(`<li class="flex items-start gap-2 ml-1"><span class="text-amber-500 font-bold shrink-0 select-none">•</span><span>${ulMatch[1]}</span></li>`);
      continue;
    } else if (inUl) {
      processed.push('</ul>');
      inUl = false;
    }

    if (olMatch) {
      if (inUl) { processed.push('</ul>'); inUl = false; }
      if (!inOl) { processed.push('<ol class="my-1.5 space-y-1">'); inOl = true; }
      processed.push(`<li class="flex items-start gap-1.5 ml-1"><span class="text-indigo-500 dark:text-indigo-400 font-bold shrink-0 text-xs select-none">${olMatch[1]}.</span><span>${olMatch[2]}</span></li>`);
      continue;
    } else if (inOl) {
      processed.push('</ol>');
      inOl = false;
    }

    if (h1Match) {
      processed.push(`<h1 class="text-base sm:text-lg font-extrabold text-violet-800 dark:text-violet-200 mt-3 mb-1.5">${h1Match[1]}</h1>`);
    } else if (h2Match) {
      processed.push(`<h2 class="text-sm sm:text-base font-bold text-violet-700 dark:text-violet-300 mt-2.5 mb-1">${h2Match[1]}</h2>`);
    } else if (h3Match) {
      processed.push(`<h3 class="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 mt-2 mb-1">${h3Match[1]}</h3>`);
    } else if (h4Match) {
      processed.push(`<h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5 mb-0.5">${h4Match[1]}</h4>`);
    } else if (hrMatch) {
      processed.push('<hr class="my-2 border-slate-200 dark:border-slate-700">');
    } else if (quoteMatch) {
      processed.push(`<blockquote class="border-l-2 border-violet-500 pl-2.5 py-0.5 my-1 text-slate-600 dark:text-slate-400 italic">${quoteMatch[1]}</blockquote>`);
    } else {
      processed.push(line);
    }
  }

  if (inUl) processed.push('</ul>');
  if (inOl) processed.push('</ol>');

  // Join back with line breaks
  let result = processed.join('\n');

  // Inline formatting: Bold (**text** or __text__)
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-amber-700 dark:text-amber-400">$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong class="font-bold text-amber-700 dark:text-amber-400">$1</strong>');

  // Inline formatting: Italics (*text* or _text_)
  result = result.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  result = result.replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>');

  // Inline formatting: Strikethrough (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, '<del class="line-through opacity-75">$1</del>');

  // Convert remaining line breaks to <br>
  result = result.replace(/\r\n|\n/g, '<br>');

  // Clean up excessive <br> tags adjacent to block-level elements
  result = result
    .replace(/(?:<br>\s*)*(<(?:h[1-6]|ul|ol|pre|blockquote|hr))/gi, '$1')
    .replace(/(<\/(?:h[1-6]|ul|ol|pre|blockquote)>|<hr[^>]*>)(?:\s*<br>)*/gi, '$1')
    .replace(/<ul([^>]*)><br>/gi, '<ul$1>')
    .replace(/<ol([^>]*)><br>/gi, '<ol$1>')
    .replace(/<br><\/ul>/gi, '</ul>')
    .replace(/<br><\/ol>/gi, '</ol>')
    .replace(/<\/li><br><li/gi, '</li><li')
    .replace(/(?:<br>\s*){3,}/gi, '<br><br>');

  return result;
}

function renderStreamingMarkdown(text) {
  if (!text) return '<span class="assistant-typing-cursor"></span>';
  // Chèn placeholder caret trực tiếp vào cuối chuỗi trước khi render markdown
  // Điều này đảm bảo caret luôn nằm bên trong thẻ dòng cuối cùng (heading, list item, bold...),
  // hoàn toàn không bao giờ bị rơi xuống dòng mới phía dưới block element!
  let str = text + '%%ASSISTANT_CARET%%';
  const boldMatches = str.match(/\*\*/g);
  if (boldMatches && boldMatches.length % 2 === 1) {
    str += '**';
  }
  const backtickMatches = str.match(/(?<!\\)`/g);
  if (backtickMatches && backtickMatches.length % 2 === 1) {
    str += '`';
  }
  const rendered = renderMarkdown(str);
  return rendered.replace(/%%ASSISTANT_CARET%%/g, '<span class="assistant-typing-cursor"></span>');
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
      const oldPic = state.profile?.googlePicture;
      const curAvatar = appState.profile.avatar;
      if (googleUser.picture && (!curAvatar || curAvatar === '⚔️' || curAvatar === oldPic || isAvatarUrl(curAvatar))) {
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
      const curAvatar = appState.profile.avatar;
      if (googleUser.picture && (!curAvatar || curAvatar === '⚔️' || isAvatarUrl(curAvatar))) {
        appState.profile.avatar = googleUser.picture;
      }
    }

    clearLegacyLocalStorage();
    saveLocalCache();
    const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('levelup_theme') : null;
    const resolvedTheme = savedTheme || appState.profile.theme || (typeof getSystemTheme === 'function' ? getSystemTheme() : 'light');
    applyTheme(resolvedTheme, false);
    renderAll();
    closeModal('modal-welcome');
    fetchLeaderboard();

    if (loadingEl) loadingEl.classList.add('hidden');

    if (typeof enforceMandatoryShieldGateOnStartup === 'function') {
      setTimeout(() => enforceMandatoryShieldGateOnStartup(), 200);
    }

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
    showToast('Không thể kết nối lúc này. Vui lòng thử lại sau.', 'error');
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
    if (e.target.closest && (e.target.closest('#modal-welcome') || e.target.closest('#modal-shield-gate'))) return;

    e.preventDefault();
    e.stopPropagation();
    openModal('modal-welcome');
    showToast('Vui lòng đăng nhập bằng Google để tiếp tục!', 'error');
  }, true);

  // Anti-DevTools 3: Chặn phím tắt gõ vào trang nếu chưa onboard
  document.addEventListener('keydown', (e) => {
    if (checkIsOnboarded()) return;
    if (e.target.closest && (e.target.closest('#modal-welcome') || e.target.closest('#modal-shield-gate'))) return;
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
