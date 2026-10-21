// =============================================================================
// 14. EVENT LISTENERS ATTACHMENT
// =============================================================================
let isLevelUpAppInited = false;
function initLevelUpApp() {
  if (isLevelUpAppInited) return;
  isLevelUpAppInited = true;
  initStartupFlow();
  if (typeof updateBrainDumpBadges === 'function') {
    updateBrainDumpBadges();
  }

  // Tự động kiểm tra và đồng bộ khi người dùng quay lại tab hoặc mở lại ứng dụng trên máy khác
  window.addEventListener('focus', () => {
    if (appState.profile?.googleId && appState.profile?.nickname) {
      hydrateFromCloud(false);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && appState.profile?.googleId && appState.profile?.nickname) {
      hydrateFromCloud(false);
    }
  });

  // Đánh dấu ngoại tuyến tức thì khi người dùng đóng tab hoặc chuyển trang
  const sendOfflineBeacon = () => {
    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    if (token && navigator.sendBeacon) {
      navigator.sendBeacon(`/api/sync?action=offline&token=${encodeURIComponent(token)}`);
    }
  };
  window.addEventListener('beforeunload', sendOfflineBeacon);
  window.addEventListener('pagehide', sendOfflineBeacon);

  // Lắng nghe tín hiệu đồng bộ đa tab từ BroadcastChannel khi Admin tinh chỉnh chỉ số hoặc đếm giờ
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const syncChannel = new BroadcastChannel('levelup_sync_channel');
      syncChannel.onmessage = (event) => {
        if (event.data?.tabId === CURRENT_TAB_ID) return; // Bỏ qua thông điệp phát từ chính tab này
        if (event.data?.type === 'TIMER_SYNC_UPDATE') {
          // Nếu tab khác đã giành quyền runner, dừng ngay lập tức tại tab này (0ms delay)
          if (event.data.runnerId && event.data.runnerId !== CURRENT_RUNNER_ID && isFocusRunning) {
            isFocusRunning = false;
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
            releaseWakeLock();
          }
          if (event.data.action === 'cancel' || event.data.action === 'hold') {
            lastLocalTimerActionTime = Date.now();
            appState.lastTimerClearedAt = Date.now();
            clearFocusTimerSession(false);
            if (event.data.action === 'hold') {
              if (event.data.questId && event.data.savedTimer) {
                const q = appState.quests?.find(x => x.id === event.data.questId);
                if (q) q.savedTimer = event.data.savedTimer;
                renderQuests();
              } else if (event.data.rewardItemId && event.data.savedTimer) {
                const it = appState.inventory?.find(x => x.id === event.data.rewardItemId);
                if (it) it.savedTimer = event.data.savedTimer;
                renderInventory();
              }
            }
          } else if (event.data.action === 'clearSaved') {
            lastLocalTimerActionTime = Date.now();
            if (event.data.questId) {
              const q = appState.quests?.find(x => x.id === event.data.questId);
              if (q) delete q.savedTimer;
              renderQuests();
            } else if (event.data.rewardItemId) {
              const it = appState.inventory?.find(x => x.id === event.data.rewardItemId);
              if (it) delete it.savedTimer;
              renderInventory();
            }
          } else if (event.data.action === 'cancelFocusSession') {
            lastLocalTimerActionTime = Date.now();
            if (event.data.questId) {
              const q = appState.quests?.find(x => x.id === event.data.questId);
              if (q) {
                delete q.focusTimerCompleted;
                delete q._proofVerified;
                delete q.savedTimer;
              }
              renderQuests();
            }
          } else if (event.data.action === 'pause' && isFocusRunning) {
            lastLocalTimerActionTime = Date.now();
            isFocusRunning = false;
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
            releaseWakeLock();
            renderFocusStationUI();
            updateTimerDisplay();
          } else if (event.data.action === 'start' || event.data.action === 'resume') {
            if (appState.profile?.googleId && appState.profile?.nickname) {
              hydrateFromCloud(false);
            }
          }
        } else if (event.data?.type === 'ADMIN_SYNC_UPDATE') {
          if (appState.profile?.googleId && appState.profile?.nickname) {
            hydrateFromCloud(false);
          }
        } else if (event.data?.type === 'STATE_UPDATED') {
          if (event.data.profile) {
            if (event.data.profile.coins !== undefined) appState.profile.coins = event.data.profile.coins;
            if (event.data.profile.totalCoinsEarned !== undefined) appState.profile.totalCoinsEarned = event.data.profile.totalCoinsEarned;
            if (event.data.profile.adminAdjusted !== undefined) appState.profile.adminAdjusted = event.data.profile.adminAdjusted;
            if (event.data.profile.bank) appState.profile.bank = event.data.profile.bank;
            renderHeader();
          }
        } else if (event.data?.type === 'NOTES_UPDATED') {
          if (Array.isArray(event.data.notes)) {
            appState.notes = event.data.notes;
            if (typeof renderNotesSidebar === 'function') renderNotesSidebar();
            if (typeof renderTopicsBar === 'function') renderTopicsBar();
          }
          if (typeof event.data.content === 'string') {
            appState.focusNotes = event.data.content;
            if (typeof syncAllNoteEditors === 'function') {
              syncAllNoteEditors(event.data.content);
            } else {
              const editor = document.getElementById('focus-notes-editor');
              if (editor && document.activeElement !== editor) {
                editor.innerHTML = event.data.content;
                if (typeof updateNotesStats === 'function') updateNotesStats();
              }
            }
          }
        }
      };
    } catch (_) {}
  }

  // Polling định kỳ mỗi 10 giây nếu tab đang mở để tự động bắt kịp đồng hồ đếm ngược giữa các thiết bị
  setInterval(() => {
    if (!document.hidden && appState.profile?.googleId && appState.profile?.nickname) {
      hydrateFromCloud(false);
    }
  }, 10000);

  // Polling tần suất cao 5 giây khi có phiên đếm giờ đang hoạt động để dừng thiết bị cũ và nhận diện kịp thời
  setInterval(() => {
    if (!document.hidden && (isFocusRunning || appState.activeTimer) && appState.profile?.googleId && appState.profile?.nickname) {
      // Nếu thiết bị này đang là runner đang chạy, nó là nguồn sự thật và đã có checkpoint 30s, không cần poll đè lên chính nó
      const isCurrentActiveRunner = isFocusRunning && (!appState.activeTimer?.runnerId || appState.activeTimer.runnerId === CURRENT_RUNNER_ID);
      if (!isCurrentActiveRunner) {
        hydrateFromCloud(false);
      }
    }
  }, 5000);

  // Navigation Tab buttons (Desktop & Mobile)
  document.querySelectorAll('.nav-tab, .mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.playClick();
      switchTab(btn.dataset.tab);
    });
  });

  // More Tabs Dropdown / Popover (Desktop & Mobile)
  const btnNavMore = document.getElementById('btn-nav-more');
  const navMoreMenu = document.getElementById('nav-more-menu');
  if (btnNavMore && navMoreMenu) {
    btnNavMore.addEventListener('click', (e) => {
      e.stopPropagation();
      navMoreMenu.classList.toggle('hidden');
    });
  }

  const btnMobileMore = document.getElementById('btn-mobile-more');
  const mobileMoreMenu = document.getElementById('mobile-more-menu');
  const mobileMoreBackdrop = document.getElementById('mobile-more-backdrop');

  let isClosingMoreMenu = false;
  const openMobileMoreMenu = () => {
    if (!mobileMoreMenu) return;
    isClosingMoreMenu = false;
    mobileMoreMenu.style.transform = '';
    mobileMoreMenu.style.transition = '';
    mobileMoreMenu.classList.remove('hidden');
    mobileMoreBackdrop?.classList.remove('hidden');
    if (mobileMoreBackdrop) mobileMoreBackdrop.style.opacity = '';
    document.body.classList.add('mobile-more-open');
    const fab = document.getElementById('btn-floating-assistant');
    if (fab) {
      fab.style.opacity = '0';
      fab.style.pointerEvents = 'none';
      fab.style.transform = 'scale(0.8) translateY(12px)';
    }
  };

  const closeMobileMoreMenu = (immediate = false) => {
    if (!mobileMoreMenu || mobileMoreMenu.classList.contains('hidden') || isClosingMoreMenu) return;

    const finalize = () => {
      mobileMoreMenu.classList.add('hidden');
      mobileMoreBackdrop?.classList.add('hidden');
      if (mobileMoreBackdrop) mobileMoreBackdrop.style.opacity = '';
      mobileMoreMenu.style.transform = '';
      mobileMoreMenu.style.transition = '';
      document.body.classList.remove('mobile-more-open');
      const fab = document.getElementById('btn-floating-assistant');
      if (fab) {
        fab.style.opacity = '';
        fab.style.pointerEvents = '';
        fab.style.transform = '';
      }
      isClosingMoreMenu = false;
    };

    if (immediate === true) {
      finalize();
      return;
    }

    isClosingMoreMenu = true;
    if (mobileMoreBackdrop) {
      mobileMoreBackdrop.style.transition = 'opacity 0.2s ease';
      mobileMoreBackdrop.style.opacity = '0';
    }

    try {
      const anim = mobileMoreMenu.animate([
        { transform: 'translate3d(0, 0, 0)', opacity: 1 },
        { transform: 'translate3d(0, 105%, 0)', opacity: 0 }
      ], {
        duration: 200,
        easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)'
      });
      anim.onfinish = finalize;
      anim.oncancel = finalize;
    } catch {
      finalize();
    }
  };

  window.openMobileMoreMenu = openMobileMoreMenu;
  window.closeMobileMoreMenu = closeMobileMoreMenu;

  if (btnMobileMore && mobileMoreMenu) {
    btnMobileMore.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mobileMoreMenu.classList.contains('hidden')) {
        openMobileMoreMenu();
      } else {
        closeMobileMoreMenu();
      }
    });
  }

  if (mobileMoreBackdrop) {
    mobileMoreBackdrop.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMobileMoreMenu();
    });
  }

  // Touch gesture: Pull down to dismiss mobile more bottom sheet
  if (mobileMoreMenu) {
    let startY = 0;
    let currentDeltaY = 0;
    let isDragging = false;
    let startTime = 0;

    mobileMoreMenu.addEventListener('touchstart', (e) => {
      if (mobileMoreMenu.scrollTop <= 0) {
        startY = e.touches[0].clientY;
        startTime = Date.now();
        isDragging = true;
        currentDeltaY = 0;
        mobileMoreMenu.style.transition = 'none';
      }
    }, { passive: true });

    mobileMoreMenu.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0) {
        currentDeltaY = dy;
        mobileMoreMenu.style.transform = `translate3d(0, ${dy}px, 0)`;
        if (mobileMoreBackdrop) {
          const opacity = Math.max(0, 1 - dy / 250);
          mobileMoreBackdrop.style.opacity = opacity.toString();
        }
      } else {
        currentDeltaY = 0;
        mobileMoreMenu.style.transform = 'translate3d(0, 0, 0)';
      }
    }, { passive: true });

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      const duration = Date.now() - startTime;
      const velocity = currentDeltaY / Math.max(duration, 1);
      const shouldDismiss = currentDeltaY > 75 || velocity > 0.4;

      if (shouldDismiss) {
        closeMobileMoreMenu();
      } else {
        mobileMoreMenu.style.transition = 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)';
        mobileMoreMenu.style.transform = 'translate3d(0, 0, 0)';
        if (mobileMoreBackdrop) {
          mobileMoreBackdrop.style.opacity = '';
        }
      }
    };

    mobileMoreMenu.addEventListener('touchend', endDrag, { passive: true });
    mobileMoreMenu.addEventListener('touchcancel', endDrag, { passive: true });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#nav-more-dropdown-container')) {
      navMoreMenu?.classList.add('hidden');
    }
    if (!e.target.closest('#btn-mobile-more') && !e.target.closest('#mobile-more-menu')) {
      closeMobileMoreMenu();
    }
    if (!e.target.closest('.btn-quest-menu') && !e.target.closest('.btn-shop-menu') && !e.target.closest('.btn-inv-menu') && !e.target.closest('.quest-dropdown-menu')) {
      closeAllCardDropdowns();
    }
  });

  // Giới thiệu dự án LevelUp (Desktop & Mobile)
  const btnNavAbout = document.getElementById('btn-nav-about');
  if (btnNavAbout) {
    btnNavAbout.addEventListener('click', (e) => {
      e.stopPropagation();
      openAboutModal();
    });
  }
  const btnMobileAbout = document.getElementById('btn-mobile-about');
  if (btnMobileAbout) {
    btnMobileAbout.addEventListener('click', (e) => {
      e.stopPropagation();
      openAboutModal();
    });
  }
  const btnAboutStartTour = document.getElementById('btn-about-start-tour');
  if (btnAboutStartTour) {
    btnAboutStartTour.addEventListener('click', () => {
      closeModal('modal-about');
      if (typeof startTour === 'function') {
        startTour();
      }
    });
  }

  // Leaderboard Sub-tabs (Bảng Hiệp Sĩ & Sổ Đen Gian Lận)
  const btnSubtabRanking = document.getElementById('btn-subtab-ranking');
  if (btnSubtabRanking) {
    btnSubtabRanking.addEventListener('click', () => {
      sfx.playClick();
      switchLeaderboardSubtab('ranking');
    });
  }
  const btnSubtabCheaters = document.getElementById('btn-subtab-cheaters');
  if (btnSubtabCheaters) {
    btnSubtabCheaters.addEventListener('click', () => {
      sfx.playClick();
      switchLeaderboardSubtab('cheaters');
    });
  }

  // Leaderboard Refresh & Search Controls
  const btnRefreshLeaderboard = document.getElementById('btn-refresh-leaderboard');
  if (btnRefreshLeaderboard) {
    btnRefreshLeaderboard.addEventListener('click', () => {
      sfx.playClick();
      btnRefreshLeaderboard.classList.add('animate-spin');
      fetchLeaderboard().finally(() => {
        setTimeout(() => btnRefreshLeaderboard.classList.remove('animate-spin'), 600);
      });
    });
  }

  const inputSearchLeaderboard = document.getElementById('leaderboard-search-input');
  if (inputSearchLeaderboard) {
    inputSearchLeaderboard.addEventListener('input', (e) => {
      currentLeaderboardSearch = e.target.value || '';
      renderLeaderboardTable(currentLeaderboardData);
    });
  }

  // Quest filters
  document.querySelectorAll('.quest-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quest-filter').forEach(b => {
        b.className = 'quest-filter px-2 sm:px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium whitespace-nowrap shrink-0';
      });
      btn.className = 'quest-filter active px-2 sm:px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold whitespace-nowrap shrink-0';
      currentQuestFilter = btn.dataset.filter;
      renderQuests();
    });
  });

  // Habit Frequency Tracker Controls (Period & Category)
  ['weekly', 'monthly', 'yearly'].forEach(p => {
    const btn = document.getElementById(`tracker-period-${p}`);
    if (btn) {
      btn.addEventListener('click', () => {
        sfx.playClick();
        currentTrackerPeriod = p;
        renderTracker();
      });
    }
  });

  ['quests', 'rewards'].forEach(c => {
    const btn = document.getElementById(`tracker-cat-${c}`);
    if (btn) {
      btn.addEventListener('click', () => {
        sfx.playClick();
        currentTrackerCategory = c;
        renderTracker();
      });
    }
  });

  // Modal Frequency Period Switcher
  ['weekly', 'monthly', 'yearly'].forEach(p => {
    const btn = document.getElementById(`modal-freq-p-${p}`);
    if (btn) {
      btn.addEventListener('click', () => {
        sfx.playClick();
        currentModalFreqPeriod = p;
        renderItemFrequencyModal();
      });
    }
  });

  // =========================================================================
  // Frequency Tracker Interactive Heatmap Day Selection & Floating Tooltip
  // =========================================================================
  function updateHeatmapDayDetailUI(cell) {
    const dateStr = cell.dataset.date;
    if (!dateStr) return;
    const dayName = cell.dataset.dayName || '';
    const count = Number(cell.dataset.count) || 0;
    const isFuture = cell.dataset.isFuture === 'true';
    const isToday = cell.dataset.isToday === 'true';
    const isQuest = cell.dataset.isQuest !== 'false';

    const parts = dateStr.split('-');
    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;

    let statusText = '';
    let badgeText = '';
    let badgeClass = '';
    let icon = '📅';

    if (isFuture) {
      statusText = 'Chưa tới ngày này';
      badgeText = 'Chưa tới';
      badgeClass = 'bg-slate-200/80 dark:bg-slate-800 text-slate-400';
      icon = '⏳';
    } else if (count > 0) {
      statusText = isQuest ? `Đã hoàn thành ${count} lần` : `Đã đổi thưởng ${count} lần`;
      badgeText = `${count} lần`;
      badgeClass = isQuest
        ? 'bg-emerald-500 text-slate-950 font-bold'
        : 'bg-sky-500 text-slate-950 font-bold';
      icon = '✨';
    } else {
      statusText = isQuest ? 'Chưa thực hiện' : 'Chưa đổi thưởng';
      badgeText = '0 lần';
      badgeClass = 'bg-slate-200/80 dark:bg-slate-800 text-slate-500';
      icon = '⚪';
    }

    // 1. If inside modal
    const modal = cell.closest('#modal-frequency-detail');
    if (modal) {
      const dDate = document.getElementById('modal-freq-detail-date');
      const dStatus = document.getElementById('modal-freq-detail-status');
      const dBadge = document.getElementById('modal-freq-detail-badge');
      const dIcon = document.getElementById('modal-freq-detail-icon');
      if (dDate) dDate.textContent = `${dayName ? dayName + ', ' : ''}${formattedDate}${isToday ? ' (Hôm nay)' : ''}`;
      if (dStatus) dStatus.textContent = statusText;
      if (dBadge) {
        if (count > 0 || isFuture) {
          dBadge.innerHTML = isFuture ? 'Chưa tới' : `<span class="font-mono">${count}</span> lần`;
        } else {
          dBadge.textContent = '0 lần';
        }
        dBadge.className = `font-bold text-xs px-2.5 py-1 rounded-full shrink-0 ${badgeClass}`;
      }
      if (dIcon) dIcon.textContent = icon;
    }

    // 2. If inside tracker card
    const card = cell.closest('.rpg-card');
    if (card) {
      const cardStatus = card.querySelector('.tracker-card-day-status');
      if (cardStatus) {
        const dayText = cardStatus.querySelector('.day-text');
        const dayIcon = cardStatus.querySelector('.day-icon');
        const badge = cardStatus.querySelector('.day-count-badge');
        if (dayText) dayText.textContent = `${dayName ? dayName + ', ' : ''}${formattedDate}${isToday ? ' (Hôm nay)' : ''}: ${statusText}`;
        if (dayIcon) dayIcon.textContent = icon;
        if (badge) {
          badge.textContent = badgeText;
          badge.className = `day-count-badge px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${badgeClass}`;
          badge.classList.remove('hidden');
        }
      }
    }

    // 3. Highlight selected cell ring
    const gridParent = cell.parentElement;
    if (gridParent) {
      gridParent.querySelectorAll('.heatmap-cell-selected').forEach(c => {
        c.classList.remove('heatmap-cell-selected', 'ring-2', 'ring-amber-400', 'ring-offset-1', 'dark:ring-offset-slate-900', 'scale-110');
      });
      cell.classList.add('heatmap-cell-selected', 'ring-2', 'ring-amber-400', 'ring-offset-1', 'dark:ring-offset-slate-900', 'scale-110');
    }
  }

  function showHeatmapFloatingTooltip(cell, clientX, clientY) {
    const tooltipEl = document.getElementById('heatmap-floating-tooltip');
    if (!tooltipEl) return;
    const dateStr = cell.dataset.date;
    if (!dateStr) return;

    const dayName = cell.dataset.dayName || '';
    const count = Number(cell.dataset.count) || 0;
    const isFuture = cell.dataset.isFuture === 'true';
    const isToday = cell.dataset.isToday === 'true';
    const isQuest = cell.dataset.isQuest !== 'false';

    const parts = dateStr.split('-');
    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;

    let statusColor = 'text-slate-300';
    let statusText = isQuest ? '⚪ Chưa thực hiện' : '⚪ Chưa đổi';
    if (isFuture) {
      statusColor = 'text-slate-400';
      statusText = '⏳ Chưa tới ngày này';
    } else if (count > 0) {
      statusColor = isQuest ? 'text-emerald-400 font-bold' : 'text-sky-400 font-bold';
      statusText = isQuest ? `✨ Đã hoàn thành ${count} lần` : `🎁 Đã đổi ${count} lần`;
    }

    tooltipEl.innerHTML = `
      <div class="text-[11px] font-bold text-amber-400 mb-0.5 flex items-center justify-between gap-3">
        <span>📅 ${escapeHtml(dayName ? dayName + ', ' : '')}${formattedDate}</span>
        ${isToday ? '<span class="text-[9px] px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 font-bold">Hôm nay</span>' : ''}
      </div>
      <div class="text-xs ${statusColor}">${statusText}</div>
    `;

    // Position tooltip smoothly above the element or cursor
    const rect = cell.getBoundingClientRect();
    const tooltipWidth = 190;
    let x = (clientX !== undefined) ? clientX : (rect.left + rect.width / 2);
    let y = (clientY !== undefined) ? (clientY - 12) : (rect.top - 8);

    // Clamp inside viewport
    x = Math.max(tooltipWidth / 2 + 10, Math.min(window.innerWidth - tooltipWidth / 2 - 10, x));
    y = Math.max(50, y);

    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
    tooltipEl.classList.remove('hidden');
  }

  function hideHeatmapFloatingTooltip() {
    const tooltipEl = document.getElementById('heatmap-floating-tooltip');
    if (tooltipEl) tooltipEl.classList.add('hidden');
  }

  let heatmapTouchTimer = null;
  let lastHeatmapTouchTime = 0;

  document.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.heatmap-cell');
    if (cell) {
      showHeatmapFloatingTooltip(cell, e.clientX, e.clientY);
      updateHeatmapDayDetailUI(cell);
    }
  });

  document.addEventListener('mousemove', (e) => {
    const cell = e.target.closest('.heatmap-cell');
    if (cell) {
      showHeatmapFloatingTooltip(cell, e.clientX, e.clientY);
    }
  });

  document.addEventListener('mouseout', (e) => {
    const cell = e.target.closest('.heatmap-cell');
    if (cell && (!e.relatedTarget || !e.relatedTarget.closest('.heatmap-cell'))) {
      hideHeatmapFloatingTooltip();
    }
  });

  document.addEventListener('click', (e) => {
    const cell = e.target.closest('.heatmap-cell');
    if (cell) {
      // If triggered immediately after a touch event, do not play duplicate click sound
      if (Date.now() - lastHeatmapTouchTime > 400) {
        if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
      }
      updateHeatmapDayDetailUI(cell);
      showHeatmapFloatingTooltip(cell);
      clearTimeout(heatmapTouchTimer);
      heatmapTouchTimer = setTimeout(hideHeatmapFloatingTooltip, 3000);
    }
  });

  document.addEventListener('touchstart', (e) => {
    const cell = e.target.closest('.heatmap-cell');
    if (cell) {
      lastHeatmapTouchTime = Date.now();
      if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
      const touch = e.touches[0];
      updateHeatmapDayDetailUI(cell);
      if (touch) showHeatmapFloatingTooltip(cell, touch.clientX, touch.clientY);
      clearTimeout(heatmapTouchTimer);
      heatmapTouchTimer = setTimeout(hideHeatmapFloatingTooltip, 3000);
    }
  }, { passive: true });


  // Theme Toggle Button
  const themeToggle = document.getElementById('toggle-theme-btn');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Lắng nghe thay đổi theme từ hệ điều hành (nếu người dùng chưa gán theme thủ công)
  if (typeof window !== 'undefined' && window.matchMedia && typeof window.matchMedia === 'function') {
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e) => {
        const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('levelup_theme') : null;
        if (!savedTheme) {
          applyTheme(e.matches ? 'dark' : 'light', false);
        }
      };
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleSystemThemeChange);
      }
    } catch (e) {}
  }

  // Palette Toggle Button (Opens Material 3 Palette Studio Hub, or cycle if Shift/Alt held)
  const paletteToggle = document.getElementById('toggle-palette-btn');
  if (paletteToggle) {
    paletteToggle.addEventListener('click', (e) => {
      if (e.shiftKey || e.altKey) {
        cyclePalette();
      } else if (typeof openPaletteStudio === 'function') {
        openPaletteStudio();
      } else {
        cyclePalette();
      }
    });
  }

  // Material 3 Dynamic Seed Picker Input Listeners
  const seedPickerInput = document.getElementById('m3-seed-picker-input');
  if (seedPickerInput) {
    seedPickerInput.addEventListener('input', (e) => {
      const hex = e.target.value;
      const seedHexText = document.getElementById('m3-seed-picker-hex');
      if (seedHexText) seedHexText.textContent = hex.toUpperCase();
      if (typeof applyCustomDynamicSeed === 'function') {
        applyCustomDynamicSeed(hex);
      }
    });
  }

  // Sound FX Toggle Buttons (Header + Profile Modal)
  function toggleSound() {
    appState.profile.soundEnabled = !appState.profile.soundEnabled;
    sfx.enabled = appState.profile.soundEnabled;
    renderHeader();
    if (sfx.enabled) sfx.playCoin();
    triggerSave(false);
  }

  const soundBtn = document.getElementById('toggle-sound-btn');
  if (soundBtn) soundBtn.addEventListener('click', toggleSound);

  const modalSoundBtn = document.getElementById('modal-sound-btn');
  if (modalSoundBtn) modalSoundBtn.addEventListener('click', toggleSound);

  // Focus Station Banner & Focus Timer controls
  const btnTimerToggle = document.getElementById('btn-timer-toggle');
  if (btnTimerToggle) btnTimerToggle.addEventListener('click', toggleFocusTimer);

  const btnTimerReset = document.getElementById('btn-timer-reset');
  if (btnTimerReset) btnTimerReset.addEventListener('click', resetFocusTimer);

  const btnTimerHold = document.getElementById('btn-timer-hold');
  if (btnTimerHold) btnTimerHold.addEventListener('click', holdFocusTimer);

  // Quick adjust buttons (-5m, +1m, +5m)
  document.querySelectorAll('.btn-timer-adjust').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.dataset.delta, 10) || 0;
      adjustTimer(delta);
    });
  });

  // Clickable time display to open direct editor
  const btnOpenEditTimer = document.getElementById('btn-open-edit-timer');
  if (btnOpenEditTimer) {
    btnOpenEditTimer.addEventListener('click', openEditTimerModal);
  }

  // Fullscreen Focus Overlay controls
  const btnZen = document.getElementById('btn-timer-zen');
  if (btnZen) btnZen.addEventListener('click', () => toggleZenMode(true));

  const btnZenExit = document.getElementById('btn-zen-exit');
  if (btnZenExit) btnZenExit.addEventListener('click', () => toggleZenMode(false));

  const btnZenToggle = document.getElementById('btn-zen-toggle');
  if (btnZenToggle) btnZenToggle.addEventListener('click', toggleFocusTimer);

  const btnZenHold = document.getElementById('btn-zen-hold');
  if (btnZenHold) {
    btnZenHold.addEventListener('click', () => {
      toggleZenMode(false);
      holdFocusTimer();
    });
  }

  // Multi-tab Focus Timer Sync
  window.addEventListener('storage', (e) => {
    if (e.key === TIMER_STORAGE_KEY) {
      if (!e.newValue) {
        clearFocusTimerSession(false);
      } else {
        try {
          const syncState = JSON.parse(e.newValue);
          if (syncState) {
            const isRecentLocalAction = (Date.now() - lastLocalTimerActionTime < TIMER_MUTATION_GRACE_MS);
            if (isRecentLocalAction && !isFocusRunning && !activeFocusQuest && !activeRewardItem) {
              // Tab này vừa chủ động dừng/hủy/bảo lưu, bỏ qua phục hồi từ tab khác
              return;
            }
            const syncTime = Number(syncState.updatedAt || syncState.lastTickTime || 0);
            if (syncTime < (appState.lastTimerClearedAt || 0) || (isRecentLocalAction && syncTime <= lastLocalTimerActionTime)) {
              return;
            }
            appState.activeTimer = syncState;
            restoreFocusTimer();
          }
        } catch (_) {}
      }
    }
  });

  function highlightSelectedAvatar(selectedAvatar) {
    const current = selectedAvatar || appState.profile.avatar || '⚔️';
    document.querySelectorAll('.avatar-opt').forEach(b => {
      const isSelected = b.dataset.avatar === current;
      if (isSelected) {
        b.classList.remove('border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800');
        b.classList.add(
          'border-amber-500',
          'dark:border-amber-500',
          'bg-amber-500/20',
          'dark:bg-amber-500/20',
          'ring-2',
          'ring-amber-500',
          'ring-offset-2',
          'ring-offset-white',
          'dark:ring-offset-slate-900',
          'scale-105'
        );
      } else {
        b.classList.remove(
          'border-amber-500',
          'dark:border-amber-500',
          'bg-amber-500/20',
          'dark:bg-amber-500/20',
          'ring-2',
          'ring-amber-500',
          'ring-offset-2',
          'ring-offset-white',
          'dark:ring-offset-slate-900',
          'scale-105'
        );
        b.classList.add('border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800');
      }
    });
  }

  // Level & EXP Info Modal Triggers
  const btnLevelInfo = document.getElementById('btn-level-info');
  if (btnLevelInfo) {
    btnLevelInfo.addEventListener('click', () => {
      sfx.playClick();
      openLevelInfoModal();
    });
  }

  const btnLevelFromProfile = document.getElementById('btn-open-level-info-from-profile');
  if (btnLevelFromProfile) {
    btnLevelFromProfile.addEventListener('click', () => {
      sfx.playClick();
      openLevelInfoModal();
    });
  }

  // Streak Info Modal Triggers
  const btnStreakInfo = document.getElementById('btn-streak-info');
  if (btnStreakInfo) {
    btnStreakInfo.addEventListener('click', () => {
      sfx.playClick();
      openStreakInfoModal();
    });
  }

  const btnStreakFromProfile = document.getElementById('btn-open-streak-info-from-profile');
  if (btnStreakFromProfile) {
    btnStreakFromProfile.addEventListener('click', () => {
      sfx.playClick();
      openStreakInfoModal();
    });
  }

  // Profile Modal & Avatar Picker
  document.getElementById('open-profile-btn')?.addEventListener('click', () => {
    if (!document.getElementById('modal-profile')) {
      if (typeof window.openProfileModal === 'function') window.openProfileModal();
      return;
    }

    const nickInput = document.getElementById('input-hero-nickname'); if (nickInput) nickInput.value = appState.profile.nickname;

    const roleBadge = document.getElementById('profile-role-badge');
    if (roleBadge) {
      const isAdmin = isUserAdmin();
      roleBadge.textContent = isAdmin ? '👑 Quản Trị Viên (Admin)' : '👤 Hiệp Sĩ';
      roleBadge.className = isAdmin
        ? 'font-bold px-2 py-0.5 rounded text-[11px] bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
        : 'font-bold px-2 py-0.5 rounded text-[11px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
    }

    const emailEl = document.getElementById('profile-google-email');
    const nameEl = document.getElementById('profile-google-name');
    const avatarImg = document.getElementById('profile-google-avatar');
    const avatarPlaceholder = document.getElementById('profile-google-avatar-placeholder');

    const email = appState.profile.googleEmail || '';
    const name = appState.profile.nickname || (email ? email.split('@')[0] : 'Hiệp Sĩ');
    const picture = appState.profile.googlePicture || (isAvatarUrl(appState.profile.avatar) ? appState.profile.avatar : '');

    if (emailEl) emailEl.textContent = email || 'Chưa liên kết';
    if (nameEl) nameEl.textContent = name;
    if (avatarImg && avatarPlaceholder) {
      if (picture) {
        avatarImg.referrerPolicy = 'no-referrer';
        avatarImg.src = picture;
        avatarImg.classList.remove('hidden');
        avatarPlaceholder.classList.add('hidden');
        avatarImg.onerror = () => {
          avatarImg.classList.add('hidden');
          avatarPlaceholder.classList.remove('hidden');
        };
      } else {
        avatarImg.classList.add('hidden');
        avatarPlaceholder.classList.remove('hidden');
        avatarPlaceholder.textContent = (email ? email[0] : 'G').toUpperCase();
      }
    }

    const googleAvatarOpt = document.getElementById('avatar-opt-google');
    const googleAvatarOptImg = document.getElementById('avatar-opt-google-img');
    if (googleAvatarOpt && googleAvatarOptImg) {
      if (picture) {
        googleAvatarOpt.dataset.avatar = picture;
        googleAvatarOptImg.referrerPolicy = 'no-referrer';
        googleAvatarOptImg.src = picture;
        googleAvatarOpt.classList.remove('hidden');
      } else {
        googleAvatarOpt.classList.add('hidden');
        googleAvatarOpt.dataset.avatar = '';
      }
    }

    // Cập nhật trạng thái avatar được chọn
    highlightSelectedAvatar(appState.profile.avatar);

    openModal('modal-profile');
  });

  const btnSwitchGoogle = document.getElementById('btn-switch-google-account');
  if (btnSwitchGoogle) {
    btnSwitchGoogle.addEventListener('click', switchGoogleAccount);
  }

  const btnLogoutGoogle = document.getElementById('btn-logout-google');
  if (btnLogoutGoogle) {
    btnLogoutGoogle.addEventListener('click', logoutGoogle);
  }

  // Cleanup & Uninstall Handlers
  const btnOpenCleanupFromProfile = document.getElementById('btn-open-cleanup-from-profile');
  if (btnOpenCleanupFromProfile) {
    btnOpenCleanupFromProfile.addEventListener('click', () => {
      closeModal('modal-profile');
      openModal('modal-cleanup');
    });
  }

  const btnOpenCleanupFromGate = document.getElementById('btn-open-cleanup-from-gate');
  if (btnOpenCleanupFromGate) {
    btnOpenCleanupFromGate.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-cleanup');
    });
  }

  const btnCloseCleanup = document.getElementById('btn-close-cleanup-modal');
  if (btnCloseCleanup) {
    btnCloseCleanup.addEventListener('click', () => {
      closeModal('modal-cleanup');
    });
  }

  const btnCancelCleanup = document.getElementById('btn-cancel-cleanup');
  if (btnCancelCleanup) {
    btnCancelCleanup.addEventListener('click', () => {
      closeModal('modal-cleanup');
    });
  }

  const btnPurgeAllData = document.getElementById('btn-purge-all-data');
  if (btnPurgeAllData) {
    btnPurgeAllData.addEventListener('click', () => {
      if (typeof purgeAllDataAndLeave === 'function') {
        purgeAllDataAndLeave();
      }
    });
  }

  const btnCopyUninstallCmd = document.getElementById('btn-copy-uninstall-cmd');
  const codeUninstallCmd = document.getElementById('code-uninstall-cmd');
  const containerUninstallCmd = document.getElementById('container-uninstall-cmd');

  function copyUninstallCommand() {
    const origin = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://level-up-nu-two.vercel.app';
    const cmd = `irm ${origin}/uninstall.ps1 | iex`;

    if (codeUninstallCmd) {
      try {
        const range = document.createRange();
        range.selectNodeContents(codeUninstallCmd);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) {}
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(cmd).then(() => {
        const btnText = document.getElementById('btn-copy-uninstall-text');
        if (btnText) {
          btnText.textContent = 'Đã chép!';
          setTimeout(() => { btnText.textContent = 'Sao Chép Lệnh'; }, 2000);
        }
        if (typeof showToast === 'function') {
          showToast('Đã sao chép lệnh gỡ bỏ.', 'success');
        }
      }).catch(() => {
        if (typeof showToast === 'function') {
          showToast('Nhấn Ctrl + C để sao chép câu lệnh.', 'info');
        }
      });
    }
  }

  if (codeUninstallCmd && typeof window !== 'undefined' && window.location?.origin) {
    codeUninstallCmd.textContent = `irm ${window.location.origin}/uninstall.ps1 | iex`;
  }
  if (containerUninstallCmd) {
    containerUninstallCmd.addEventListener('click', copyUninstallCommand);
  }
  if (btnCopyUninstallCmd) {
    btnCopyUninstallCmd.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyUninstallCommand();
    });
  }

  document.querySelectorAll('.avatar-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const val = btn.dataset.avatar;
      if (!val) return;
      appState.profile.avatar = val;
      highlightSelectedAvatar(val);
      if (sfx && typeof sfx.playClick === 'function') sfx.playClick();
    });
  });

  document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
    const nick = document.getElementById('input-hero-nickname')?.value?.trim() || '';
    if (!nick) {
      showToast('Tên hiển thị không được để trống.', 'error');
      return;
    }

    const token = appState.profile.googleToken || '';
    const currentNick = appState.profile.nickname;

    // Kiểm tra tính khả dụng của nickname nếu người dùng đổi sang tên mới
    if (currentNick && currentNick !== nick) {
      try {
        const checkRes = await fetch(`/api/sync?action=check_nickname&nickname=${encodeURIComponent(nick)}&token=${encodeURIComponent(token)}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (!checkData.available) {
            showToast(`Tên "${nick}" đã có người sử dụng. Vui lòng chọn tên khác.`, 'error');
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
    showToast('Đã lưu hồ sơ và đồng bộ.', 'info');
    triggerSave(true);
  });

  const inputHeroNick = document.getElementById('input-hero-nickname');
  if (inputHeroNick) {
    inputHeroNick.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btn-save-profile')?.click();
      }
    });
  }

  const btnForceCloud = document.getElementById('btn-force-cloud-load');
  if (btnForceCloud) {
    btnForceCloud.addEventListener('click', () => {
      loadFromCloud();
    });
  }

  // Open Quest Modal (Desktop & Mobile buttons)
  const openQuestHandler = () => {
    currentEditingQuestId = null;
    if (typeof sfx !== 'undefined' && sfx.playClick) {
      try { sfx.playClick(); } catch (_) {}
    }
    const titleEl = document.getElementById('modal-quest-title');
    const subEl = document.getElementById('modal-quest-subtitle');
    if (titleEl) titleEl.textContent = 'THÊM NHIỆM VỤ MỚI';
    if (subEl) subEl.textContent = 'Nhập việc cần làm, AI sẽ ước lượng độ khó và tính số Vàng thưởng công bằng';
    const acceptBtn = document.getElementById('btn-accept-verdict');
    if (acceptBtn) acceptBtn.textContent = 'Thêm Nhiệm Vụ';

    const questFormStep = document.getElementById('quest-form-step');
    if (questFormStep) questFormStep.classList.remove('hidden');
    const questEvalStep = document.getElementById('quest-evaluating-step');
    if (questEvalStep) questEvalStep.classList.add('hidden');
    const questVerdictStep = document.getElementById('quest-verdict-step');
    if (questVerdictStep) questVerdictStep.classList.add('hidden');

    const inputTitle = document.getElementById('input-quest-title');
    if (inputTitle) inputTitle.value = '';
    const inputDesc = document.getElementById('input-quest-desc');
    if (inputDesc) inputDesc.value = '';
    const inputEst = document.getElementById('input-quest-estimate');
    if (inputEst) inputEst.value = '';
    const questDurEl = document.getElementById('input-quest-duration');
    if (questDurEl) questDurEl.value = '';
    const repeatRadio = document.querySelector('input[name="quest-repeat"][value="repeatable"]');
    if (repeatRadio) repeatRadio.checked = true;
    const modNotice = document.getElementById('verdict-modified-notice');
    if (modNotice) modNotice.classList.add('hidden');
    const questSuggestBox = document.getElementById('quest-suggestions-container');
    if (questSuggestBox) questSuggestBox.classList.remove('hidden');
    if (typeof loadQuestSuggestions === 'function') {
      try { loadQuestSuggestions(false); } catch (_) {}
    }
    openModal('modal-quest');
  };
  window.openQuestModal = openQuestHandler;
  window.openQuestRenegotiateModal = openQuestRenegotiateModal;
  const desktopAddQuestBtn = document.getElementById('btn-open-add-quest');
  if (desktopAddQuestBtn) desktopAddQuestBtn.addEventListener('click', openQuestHandler);
  const mobileAddQuestBtn = document.getElementById('btn-open-add-quest-mobile');
  if (mobileAddQuestBtn) mobileAddQuestBtn.addEventListener('click', openQuestHandler);



  const btnToggleQuestSug = document.getElementById('btn-toggle-quest-suggestions');
  if (btnToggleQuestSug) {
    btnToggleQuestSug.addEventListener('click', (e) => {
      e.stopPropagation();
      const listEl = document.getElementById('quest-suggestions-list');
      const iconEl = document.getElementById('icon-toggle-quest-suggestions');
      if (!listEl) return;
      const isHidden = listEl.classList.toggle('hidden');
      if (iconEl) iconEl.textContent = isHidden ? '▼' : '▲';
    });
  }

  document.getElementById('btn-submit-to-ai')?.addEventListener('click', submitQuestToAI);
  ['input-quest-title', 'input-quest-estimate', 'input-quest-duration'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitQuestToAI();
        }
      });
    }
  });
  document.getElementById('btn-accept-verdict')?.addEventListener('click', acceptVerdictAndCreateQuest);

  const verdictRepeatToggle = document.getElementById('verdict-repeat-toggle');
  if (verdictRepeatToggle) {
    verdictRepeatToggle.addEventListener('click', () => {
      if (!currentPendingVerdict) return;
      currentPendingVerdict.isRepeatable = !currentPendingVerdict.isRepeatable;
      sfx.playClick();
      updateVerdictDisplay();
      showToast(`Đã đổi tần suất: ${currentPendingVerdict.isRepeatable ? 'Lặp lại' : 'Làm một lần'}`, 'info');
    });
  }

  const verdictProofToggle = document.getElementById('verdict-proof-toggle');
  if (verdictProofToggle) {
    verdictProofToggle.addEventListener('click', () => {
      const debateBox = document.getElementById('debate-container');
      if (debateBox && debateBox.classList.contains('hidden')) {
        debateBox.classList.remove('hidden');
        initQuestDebateChat();
      }
      const argInput = document.getElementById('input-debate-arg');
      if (argInput) {
        setTimeout(() => {
          argInput.focus();
          debateBox?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      }
      showToast('Hãy nêu lý do để Trọng Tài AI thẩm định đổi hình thức xác thực nhé!', 'info');
    });
  }

  // Quest Debate features
  document.getElementById('btn-open-debate')?.addEventListener('click', () => {
    const debateBox = document.getElementById('debate-container');
    if (!debateBox) return;
    const isOpening = debateBox.classList.contains('hidden');
    debateBox.classList.toggle('hidden');
    if (isOpening) {
      initQuestDebateChat();
      if (typeof initHorizontalScrollContainers === 'function') initHorizontalScrollContainers();
      const chips = document.getElementById('quest-suggest-chips');
      if (chips) chips.scrollLeft = 0;
      const argInput = document.getElementById('input-debate-arg');
      if (argInput) {
        setTimeout(() => {
          argInput.focus();
          debateBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      }
    }
  });
  document.getElementById('btn-send-debate')?.addEventListener('click', sendDebateArgument);
  const inputDebateArg = document.getElementById('input-debate-arg');
  if (inputDebateArg) {
    inputDebateArg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendDebateArgument();
      }
    });
  }
  document.querySelectorAll('.quick-suggest-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const suggestText = btn.getAttribute('data-suggest');
      const input = document.getElementById('input-debate-arg');
      if (input && suggestText) {
        input.value = suggestText;
        input.focus();
        input.classList.add('ring-2', 'ring-amber-500');
        setTimeout(() => input.classList.remove('ring-2', 'ring-amber-500'), 500);
        sfx.playClick();
      }
    });
  });

  // Quest Proof Verification Camera & Modal Handlers
  const btnTriggerCamera = document.getElementById('btn-trigger-camera');
  const inputProofFile = document.getElementById('input-quest-proof-file');
  if (btnTriggerCamera && inputProofFile) {
    btnTriggerCamera.addEventListener('click', () => {
      if (!isMobilePhone()) {
        showToast('Chỉ cho phép chụp ảnh trực tiếp bằng điện thoại.', 'warning');
        return;
      }
      sfx.playClick();
      inputProofFile.click();
    });
  }

  if (inputProofFile) {
    inputProofFile.addEventListener('change', async (e) => {
      if (!isMobilePhone()) {
        e.target.value = '';
        showToast('Vui lòng mở LevelUp trên điện thoại để chụp ảnh.', 'error');
        return;
      }
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        showToast('Đang xử lý ảnh...', 'info');
        const compressed = await compressImage(file);
        currentProofBase64 = compressed;

        const previewImg = document.getElementById('proof-preview-img');
        if (previewImg) previewImg.src = compressed;

        document.getElementById('proof-capture-zone')?.classList.add('hidden');
        document.getElementById('proof-preview-zone')?.classList.remove('hidden');

        const submitBtn = document.getElementById('btn-submit-proof');
        if (submitBtn) {
          if (currentProofMode === 'both') {
            const textInput = document.getElementById('input-quest-proof-text');
            const textVal = textInput ? textInput.value.trim() : '';
            submitBtn.disabled = textVal.length < 10;
          } else {
            submitBtn.disabled = false;
          }
          submitBtn.classList.add('animate-pulse');
          setTimeout(() => submitBtn.classList.remove('animate-pulse'), 800);
        }
        sfx.playClick();
      } catch (err) {
        showToast(err.message || 'Lỗi xử lý ảnh!', 'error');
      }
    });
  }

  const btnRetakePhoto = document.getElementById('btn-retake-photo');
  if (btnRetakePhoto) {
    btnRetakePhoto.addEventListener('click', () => {
      if (!isMobilePhone()) {
        showToast('Vui lòng dùng điện thoại để chụp ảnh.', 'warning');
        return;
      }
      sfx.playClick();
      currentProofBase64 = null;
      if (inputProofFile) inputProofFile.value = '';
      document.getElementById('proof-preview-zone')?.classList.add('hidden');
      document.getElementById('proof-capture-zone')?.classList.remove('hidden');
      const submitBtn = document.getElementById('btn-submit-proof');
      if (submitBtn) {
        if (currentProofMode === 'both' || currentProofMode === 'photo') {
          submitBtn.disabled = true;
        }
      }
      inputProofFile?.click();
    });
  }

  // Proof mode tabs (Photo vs Text report vs Both)
  const tabProofPhoto = document.getElementById('proof-tab-photo');
  if (tabProofPhoto) {
    tabProofPhoto.addEventListener('click', () => {
      sfx.playClick();
      switchProofTab('photo');
    });
  }

  const tabProofText = document.getElementById('proof-tab-text');
  if (tabProofText) {
    tabProofText.addEventListener('click', () => {
      sfx.playClick();
      switchProofTab('text');
    });
  }

  const tabProofBoth = document.getElementById('proof-tab-both');
  if (tabProofBoth) {
    tabProofBoth.addEventListener('click', () => {
      sfx.playClick();
      switchProofTab('both');
    });
  }

  const inputProofText = document.getElementById('input-quest-proof-text');
  if (inputProofText) {
    inputProofText.addEventListener('input', () => {
      const val = inputProofText.value.trim();
      const textCharCount = document.getElementById('proof-text-char-count');
      const submitBtn = document.getElementById('btn-submit-proof');
      if (textCharCount) {
        textCharCount.textContent = `${val.length}/10 ký tự tối thiểu`;
        if (val.length >= 10) {
          textCharCount.className = 'text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold';
        } else {
          textCharCount.className = 'text-[10px] font-mono text-slate-400 font-normal';
        }
      }
      if (submitBtn) {
        if (currentProofMode === 'text') {
          submitBtn.disabled = val.length < 10;
        } else if (currentProofMode === 'both') {
          submitBtn.disabled = !(Boolean(currentProofBase64) && val.length >= 10);
        }
      }
    });

    inputProofText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-proof');
        if (submitBtn && !submitBtn.disabled) {
          sfx.playClick();
          submitQuestProofToAI();
        }
      }
    });
  }

  const btnSubmitProof = document.getElementById('btn-submit-proof');
  if (btnSubmitProof) {
    btnSubmitProof.addEventListener('click', () => {
      sfx.playClick();
      submitQuestProofToAI();
    });
  }
  const inputProofNote = document.getElementById('input-quest-proof-note');
  if (inputProofNote) {
    inputProofNote.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-proof');
        if (submitBtn && !submitBtn.disabled) {
          sfx.playClick();
          submitQuestProofToAI();
        }
      }
    });
  }

  // Claim reward button on AI Proof Approved celebration modal
  const btnClaimProofReward = document.getElementById('btn-claim-proof-reward');
  if (btnClaimProofReward) {
    btnClaimProofReward.addEventListener('click', () => {
      closeModal('modal-proof-approved');
      if (pendingApprovedQuest) {
        const questId = pendingApprovedQuest.id;
        pendingApprovedQuest = null;
        completeQuest(questId, true);
      }
    });
  }

  const btnCloseProofApproved = document.getElementById('btn-close-proof-approved');
  if (btnCloseProofApproved) {
    btnCloseProofApproved.addEventListener('click', () => {
      closeModal('modal-proof-approved');
      if (pendingApprovedQuest) {
        const questId = pendingApprovedQuest.id;
        pendingApprovedQuest = null;
        completeQuest(questId, true);
      }
    });
  }

  // Close buttons for Proof Viewer Modal
  const btnCloseProofViewer = document.getElementById('btn-close-proof-viewer');
  if (btnCloseProofViewer) {
    btnCloseProofViewer.addEventListener('click', () => closeModal('modal-proof-viewer'));
  }
  const btnCloseProofViewerFooter = document.getElementById('btn-close-proof-viewer-footer');
  if (btnCloseProofViewerFooter) {
    btnCloseProofViewerFooter.addEventListener('click', () => closeModal('modal-proof-viewer'));
  }

  // Handle live window resize / DevTools toggling while proof modal is open
  window.addEventListener('resize', () => {
    const modal = document.getElementById('modal-quest-proof');
    if (modal && !modal.classList.contains('hidden') && currentProofQuest) {
      if (typeof switchProofTab === 'function') {
        switchProofTab(currentProofMode || 'photo');
      }
    }
  });

  // Tự động đo đạc lại nút Xem thêm/Thu gọn khi co giãn cửa sổ hoặc xoay màn hình thiết bị
  let cardDescResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(cardDescResizeTimer);
    cardDescResizeTimer = setTimeout(refreshAllCardDescToggles, 150);
  });

  // Open Shop Reward Modal (Desktop, Mobile & Global)
  const openRewardHandler = () => {
    currentEditingRewardId = null;
    currentPendingReward = null;
    if (typeof sfx !== 'undefined' && sfx.playClick) {
      try { sfx.playClick(); } catch (_) {}
    }
    const titleEl = document.getElementById('modal-reward-title');
    const subEl = document.getElementById('modal-reward-subtitle');
    if (titleEl) titleEl.textContent = 'THÊM PHẦN THƯỞNG MỚI';
    if (subEl) subEl.textContent = 'AI tính giá Vàng tương xứng để bạn tự thưởng sau khi nỗ lực';

    const saveBtn = document.getElementById('btn-save-reward');
    if (saveBtn) saveBtn.textContent = 'Thêm Vào Cửa Hàng';

    const rewardFormStep = document.getElementById('reward-form-step');
    if (rewardFormStep) rewardFormStep.classList.remove('hidden');
    const rewardEvalStep = document.getElementById('reward-evaluating-step');
    if (rewardEvalStep) rewardEvalStep.classList.add('hidden');
    const rewardVerdictStep = document.getElementById('reward-verdict-step');
    if (rewardVerdictStep) rewardVerdictStep.classList.add('hidden');

    const inputName = document.getElementById('input-reward-name');
    if (inputName) inputName.value = '';
    const inputDesc = document.getElementById('input-reward-desc');
    if (inputDesc) inputDesc.value = '';
    const estimateInput = document.getElementById('input-reward-estimate');
    if (estimateInput) estimateInput.value = '';
    const durationInput = document.getElementById('input-reward-duration');
    if (durationInput) durationInput.value = '';

    const rewardModNotice = document.getElementById('reward-modified-notice');
    if (rewardModNotice) rewardModNotice.classList.add('hidden');
    const rewardDebateBox = document.getElementById('reward-debate-container');
    if (rewardDebateBox) rewardDebateBox.classList.add('hidden');
    const rewardChatLogs = document.getElementById('reward-debate-chat-logs');
    if (rewardChatLogs) rewardChatLogs.innerHTML = '';
    currentRewardDebateHistory = [];

    const rewardSuggestBox = document.getElementById('reward-suggestions-container');
    if (rewardSuggestBox) rewardSuggestBox.classList.remove('hidden');
    if (typeof loadRewardSuggestions === 'function') {
      try { loadRewardSuggestions(false); } catch (_) {}
    }
    openModal('modal-reward');
  };
  window.openRewardModal = openRewardHandler;
  window.openRewardRenegotiateModal = openRewardRenegotiateModal;
  const navAddRewardBtn = document.getElementById('btn-open-add-reward-nav');
  if (navAddRewardBtn) navAddRewardBtn.addEventListener('click', openRewardHandler);
  const mobileAddRewardBtn = document.getElementById('btn-open-add-reward-mobile');
  if (mobileAddRewardBtn) mobileAddRewardBtn.addEventListener('click', openRewardHandler);



  const btnToggleRewardSug = document.getElementById('btn-toggle-reward-suggestions');
  if (btnToggleRewardSug) {
    btnToggleRewardSug.addEventListener('click', (e) => {
      e.stopPropagation();
      const listEl = document.getElementById('reward-suggestions-list');
      const iconEl = document.getElementById('icon-toggle-reward-suggestions');
      if (!listEl) return;
      const isHidden = listEl.classList.toggle('hidden');
      if (iconEl) iconEl.textContent = isHidden ? '▼' : '▲';
    });
  }

  // Power User Keyboard Shortcuts: [Q] to Add Quest, [R] to Add Reward, [Space] to Pause/Resume Focus Timer
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const activeTag = activeEl?.tagName;
    const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || activeEl?.isContentEditable;
    if (isEditing || e.ctrlKey || e.metaKey || e.altKey) return;

    // Phím Space: Dừng / Tiếp tục đếm ngược thời gian (hoạt động trên cả màn hình chính và Chế độ Toàn màn hình Zen)
    if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
      if (e.repeat) return;
      const hasActiveTimer = Boolean(activeFocusQuest || isBreakMode || activeRewardItem || appState?.activeTimer);
      const isOtherModalOpen = Boolean(document.querySelector('.fixed.inset-0:not(.hidden):not(#focus-zen-overlay)'));
      if (hasActiveTimer && !isOtherModalOpen) {
        e.preventDefault();
        if (activeEl && typeof activeEl.blur === 'function') {
          activeEl.blur();
        }
        toggleFocusTimer();
        return;
      }
    }

    const isModalOpen = Boolean(document.querySelector('.fixed.inset-0:not(.hidden)'));
    if (isModalOpen) return;

    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      openQuestHandler();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      openRewardHandler();
    }
  });

  document.getElementById('btn-eval-reward')?.addEventListener('click', evaluateRewardItem);
  ['input-reward-name', 'input-reward-estimate', 'input-reward-duration'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          evaluateRewardItem();
        }
      });
    }
  });
  document.getElementById('btn-save-reward')?.addEventListener('click', savePendingReward);

  // Reward Debate features
  const btnOpenRewardDebate = document.getElementById('btn-open-reward-debate');
  if (btnOpenRewardDebate) {
    btnOpenRewardDebate.addEventListener('click', () => {
      const debateBox = document.getElementById('reward-debate-container');
      if (debateBox) {
        const isOpening = debateBox.classList.contains('hidden');
        debateBox.classList.toggle('hidden');
        if (isOpening) {
          initRewardDebateChat();
          if (typeof initHorizontalScrollContainers === 'function') initHorizontalScrollContainers();
          const chips = document.getElementById('reward-suggest-chips');
          if (chips) chips.scrollLeft = 0;
          const argInput = document.getElementById('input-reward-debate-arg');
          if (argInput) {
            setTimeout(() => {
              argInput.focus();
              debateBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 120);
          }
        }
      }
    });
  }
  const btnSendRewardDebate = document.getElementById('btn-send-reward-debate');
  if (btnSendRewardDebate) {
    btnSendRewardDebate.addEventListener('click', sendRewardDebateArgument);
  }
  const inputRewardDebateArg = document.getElementById('input-reward-debate-arg');
  if (inputRewardDebateArg) {
    inputRewardDebateArg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendRewardDebateArgument();
      }
    });
  }
  document.querySelectorAll('.quick-suggest-reward-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const suggestText = btn.getAttribute('data-suggest');
      const input = document.getElementById('input-reward-debate-arg');
      if (input && suggestText) {
        input.value = suggestText;
        input.focus();
        input.classList.add('ring-2', 'ring-amber-500');
        setTimeout(() => input.classList.remove('ring-2', 'ring-amber-500'), 500);
        sfx.playClick();
      }
    });
  });

  // Bank Loan Debate controls
  const inputBankDebateArg = document.getElementById('input-bank-debate-arg');
  if (inputBankDebateArg) {
    inputBankDebateArg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendBankDebateMessage();
      }
    });
  }
  document.querySelectorAll('.quick-suggest-bank-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const suggestText = btn.getAttribute('data-suggest');
      const input = document.getElementById('input-bank-debate-arg');
      if (input && suggestText) {
        input.value = suggestText;
        input.focus();
        input.classList.add('ring-2', 'ring-blue-500');
        setTimeout(() => input.classList.remove('ring-2', 'ring-blue-500'), 500);
        if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
      }
    });
  });

  // Bank deposit, borrow & withdraw Enter key submit listeners
  const inputDepositAmt = document.getElementById('input-deposit-amount');
  if (inputDepositAmt) {
    inputDepositAmt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeBankDeposit();
      }
    });
  }
  const inputBorrowAmt = document.getElementById('input-borrow-amount');
  if (inputBorrowAmt) {
    inputBorrowAmt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeBankBorrow();
      }
    });
  }
  const inputWithdrawAmt = document.getElementById('input-withdraw-amount');
  if (inputWithdrawAmt) {
    inputWithdrawAmt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmAndExecuteWithdraw();
      }
    });
  }

  // Admin edit user form Enter key submit listeners
  ['admin-edit-coins', 'admin-edit-level', 'admin-edit-exp', 'admin-edit-reason'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitAdminUserEdit();
        }
      });
    }
  });

  // Button triggers for Sổ Ghi Chú & Dopamine Guide in Zen Mode
  const btnZenBrainDump = document.getElementById('btn-zen-brain-dump');
  if (btnZenBrainDump) {
    btnZenBrainDump.addEventListener('click', () => {
      openBrainDumpModal();
    });
  }

  const btnZenDopamineGuide = document.getElementById('btn-zen-dopamine-guide');
  if (btnZenDopamineGuide) {
    btnZenDopamineGuide.addEventListener('click', () => {
      openDopamineGuideModal();
    });
  }

  // Confirmation Dialog controls
  const btnConfirmOk = document.getElementById('btn-confirm-ok');
  if (btnConfirmOk) {
    btnConfirmOk.addEventListener('click', () => {
      sfx.playClick();
      closeConfirmDialog(true);
    });
  }

  const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
  if (btnConfirmCancel) {
    btnConfirmCancel.addEventListener('click', () => {
      sfx.playClick();
      closeConfirmDialog(false);
    });
  }

  // ponytail: modal close strictly restricted to close button ('x'); upgrade to Esc/backdrop if user preferences requested
  // Global Close Modal on close button (chỉ tắt khi nhấn dấu x)
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      try { btn.blur(); } catch (_) {}
      const modal = e.target.closest('.fixed') || btn.closest('.fixed');
      if (modal) {
        if (modal.id === 'modal-confirm') {
          closeConfirmDialog(false);
          return;
        }
        if (modal.id === 'modal-ai-assistant') {
          closeAssistantModal();
          return;
        }
        if (modal.id === 'modal-reward') {
          currentEditingRewardId = null;
          currentPendingReward = null;
        }
        if (modal.id === 'modal-quest' || modal.id === 'modal-verdict') {
          currentEditingQuestId = null;
          currentPendingVerdict = null;
        }

        const isDismissibleSheet = modal.id === 'modal-quest-detail' ||
                                   modal.id === 'modal-reward-detail' ||
                                   modal.dataset?.sheetDismiss === 'true';
        if (isDismissibleSheet && typeof dismissModalWithSlideDown === 'function') {
          dismissModalWithSlideDown(modal);
          return;
        }

        modal.classList.add('hidden');

        // Quay lại modal chi tiết nhiệm vụ trước đó nếu có
        if (window.parentDetailQuestId && (modal.id === 'modal-quest' || modal.id === 'modal-frequency-detail' || modal.id === 'modal-quest-proof')) {
          const returnQuestId = window.parentDetailQuestId;
          window.parentDetailQuestId = null;
          const q = Array.isArray(appState.quests) ? appState.quests.find(item => item.id === returnQuestId) : null;
          if (q && typeof openQuestDetailModal === 'function') {
            setTimeout(() => openQuestDetailModal(returnQuestId), 50);
          }
        }
      }
    });
  });

  // Chặn đóng modal khi click ra ngoài backdrop đối với các modal form/xác nhận quan trọng;
  // Cho phép thoát nhanh với hiệu ứng trượt xuống khi click ra ngoài đối với modal chi tiết nhiệm vụ và phần thưởng
  document.querySelectorAll('.fixed').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal.id === 'tour-overlay') return;
        if (modal.id === 'modal-welcome') {
          showToast('Vui lòng đăng nhập bằng Google để tiếp tục!', 'info');
          return;
        }
        if (modal.id === 'modal-brain-dump') {
          // Sổ ghi chú chỉ được tắt khi nhấn dấu 'x'
          const panel = modal.querySelector('.rpg-panel');
          if (panel) {
            panel.classList.add('ring-4', 'ring-amber-500/60');
            setTimeout(() => panel.classList.remove('ring-4', 'ring-amber-500/60'), 400);
          }
          return;
        }

        const isDismissibleSheet = modal.id === 'modal-quest-detail' ||
                                   modal.id === 'modal-reward-detail' ||
                                   modal.dataset?.sheetDismiss === 'true';

        if (isDismissibleSheet) {
          if (!modal._suppressBackdropClick) {
            if (typeof dismissModalWithSlideDown === 'function') {
              dismissModalWithSlideDown(modal);
            } else {
              closeModal(modal.id);
            }
          }
          return;
        }

        const panel = modal.querySelector('.rpg-panel') || modal.querySelector('#assistant-panel');
        if (panel) {
          panel.classList.add('ring-4', 'ring-amber-500/60');
          setTimeout(() => panel.classList.remove('ring-4', 'ring-amber-500/60'), 400);
        }
      }
    });
  });

  // Phím Escape: đóng modal chi tiết hoặc chặn đóng đối với modal quan trọng
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const zenOverlay = document.getElementById('focus-zen-overlay');
      if (zenOverlay && !zenOverlay.classList.contains('hidden')) {
        toggleZenMode(false);
        return;
      }
      if (isTourActive) {
        e.preventDefault();
        finishTour(false);
        return;
      }
      const openModal = document.querySelector('.fixed[id^="modal-"]:not(.hidden)');
      if (openModal) {
        if (openModal.id === 'modal-brain-dump') {
          // Sổ ghi chú chỉ được tắt khi nhấn dấu 'x'
          e.preventDefault();
          const panel = openModal.querySelector('.rpg-panel');
          if (panel) {
            panel.classList.add('ring-4', 'ring-amber-500/60');
            setTimeout(() => panel.classList.remove('ring-4', 'ring-amber-500/60'), 400);
          }
          return;
        }
        const isDismissibleSheet = openModal.id === 'modal-quest-detail' ||
                                   openModal.id === 'modal-reward-detail' ||
                                   openModal.dataset?.sheetDismiss === 'true';
        if (isDismissibleSheet) {
          e.preventDefault();
          if (typeof dismissModalWithSlideDown === 'function') {
            dismissModalWithSlideDown(openModal);
          } else {
            closeModal(openModal.id);
          }
          return;
        }

        e.preventDefault();
        const panel = openModal.querySelector('.rpg-panel') || openModal.querySelector('#assistant-panel');
        if (panel) {
          panel.classList.add('ring-4', 'ring-amber-500/60');
          setTimeout(() => panel.classList.remove('ring-4', 'ring-amber-500/60'), 400);
        }
      }
    }
  });

  // Phím tắt Alt+A mở/đóng Trợ Lý AI
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      const modal = document.getElementById('modal-ai-assistant');
      if (modal && !modal.classList.contains('hidden')) {
        closeAssistantModal();
      } else {
        openAssistantModal();
      }
    }
  });

  // Phím tắt Alt+D mở Sổ Ghi Chú (Focus Notes / Tab Ghi Chú)
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      const zenOverlay = document.getElementById('zen-overlay');
      const isZenActive = zenOverlay && !zenOverlay.classList.contains('hidden');
      if (isZenActive) {
        const modal = document.getElementById('modal-brain-dump');
        if (modal && modal.classList.contains('hidden')) {
          openBrainDumpModal();
        } else {
          const editor = document.getElementById('focus-notes-editor');
          if (editor) editor.focus();
        }
      } else {
        if (typeof switchTab === 'function') {
          switchTab('notes');
        }
        const tabEditor = document.getElementById('focus-notes-tab-editor');
        if (tabEditor) {
          tabEditor.focus();
        }
      }
    }
  });

  // Lắng nghe URL Hash (#notes, #shop, ...) để tự động chuyển tab
  function handleUrlTabHash() {
    try {
      let hash = (window.location.hash || '').replace('#', '').trim();
      if (hash === 'gold-bank') hash = 'bank';
      const validTabs = ['quests', 'shop', 'notes', 'bank', 'leaderboard', 'ledger', 'tracker', 'admin'];
      if (hash && validTabs.includes(hash) && typeof switchTab === 'function') {
        switchTab(hash);
      }
    } catch (_) {}
  }
  window.addEventListener('hashchange', handleUrlTabHash);
  setTimeout(handleUrlTabHash, 250);

  // Lắng nghe tin nhắn từ Chrome Extension / Content Script
  window.addEventListener('message', (e) => {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'LEVELUP_SWITCH_TAB' && e.data.tab && typeof switchTab === 'function') {
      switchTab(e.data.tab);
    }
  });

  // Tương tác 1 chạm tức thì (Instant 1-tap) cho danh sách Ghi chú trên Mobile & Touchscreen
  ['notes-card-list', 'modal-notes-card-list'].forEach(id => {
    const listEl = document.getElementById(id);
    if (!listEl) return;
    listEl.addEventListener('click', (e) => {
      // Nếu chạm vào nút pin/delete thì bỏ qua (đã có event.stopPropagation)
      if (e.target.closest('button')) return;
      const card = e.target.closest('.note-card-item');
      if (card && card.dataset?.noteId) {
        if (typeof switchActiveNote === 'function') {
          switchActiveNote(card.dataset.noteId);
        }
      }
    });
  });

  // Material Design 3 Interactions: Universal Ripple & Top App Bar Scroll Elevation
  function initMaterialDesignInteractions() {
    // 1. Universal Material 3 Ripple (Buttons, Cards, Chips, Tabs, List Items)
    document.addEventListener('pointerdown', (e) => {
      const target = e.target.closest(
        'button, .btn, .nav-tab, .mobile-nav-btn, .quest-filter, .quest-dropdown-item, .nav-more-item, .mobile-more-item, .rpg-card, .quest-card-compact, .proof-photo-card, .avatar-opt, .tracker-period-btn, .modal-freq-btn, .btn-action-quest, .note-card-item, [data-ripple]'
      );
      if (!target || target.disabled || target.classList.contains('no-ripple')) return;

      const rect = target.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height) * 2;
      const radius = diameter / 2;

      const ripple = document.createElement('span');
      ripple.className = 'md-ripple';
      ripple.style.width = ripple.style.height = `${diameter}px`;
      ripple.style.left = `${e.clientX - rect.left - radius}px`;
      ripple.style.top = `${e.clientY - rect.top - radius}px`;

      const computedPos = window.getComputedStyle(target).position;
      if (computedPos === 'static') {
        target.style.position = 'relative';
      }
      target.classList.add('md-ripple-target');

      const existingRipples = target.getElementsByClassName('md-ripple');
      while (existingRipples[0]) {
        existingRipples[0].remove();
      }

      target.appendChild(ripple);

      setTimeout(() => {
        if (ripple.parentElement) {
          ripple.remove();
        }
      }, 550);
    }, { passive: true });

    // 2. Material Design 3 Control Icon Micro-animations
    ['toggle-theme-btn', 'toggle-palette-btn', 'toggle-sound-btn'].forEach(btnId => {
      const el = document.getElementById(btnId);
      if (el) {
        el.addEventListener('click', () => {
          el.classList.remove('btn-icon-bounce');
          void el.offsetWidth;
          el.classList.add('btn-icon-bounce');
          setTimeout(() => el.classList.remove('btn-icon-bounce'), 380);
        });
      }
    });

    // 3. Material Top App Bar Scroll Elevation
    const header = document.querySelector('header');
    if (header) {
      const handleScroll = () => {
        if (window.scrollY > 8) {
          header.classList.add('md-scrolled');
        } else {
          header.classList.remove('md-scrolled');
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
    }
  }

  // 4. Horizontal Scroll & Drag Interactions for Suggestions and Chips (Desktop Support)
  initHorizontalScrollContainers();

  initMaterialDesignInteractions();

  // 5. Material Design 3 Bottom Sheet Drag-to-Dismiss Gestures
  initBottomSheetGestures();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLevelUpApp);
  } else {
    initLevelUpApp();
  }
}

// =============================================================================
// 15. HORIZONTAL DRAG & WHEEL SCROLL FOR CHIPS & SUGGESTIONS (DESKTOP UX)
// =============================================================================
/**
 * Hỗ trợ cuộn ngang tự nhiên bằng con lăn chuột và kéo rê chuột (drag-to-scroll)
 * cho các hàng gợi ý 'no-scrollbar' trên máy tính, tái hiện trải nghiệm vuốt mượt như điện thoại.
 */
function makeHorizontalScrollable(container) {
  if (!container || container.dataset?.scrollInited === 'true') return;
  if (!container.dataset) container.dataset = {};
  container.dataset.scrollInited = 'true';
  container.classList.add('horizontal-scroll-drag');

  let isDown = false;
  let startX = 0;
  let scrollStart = 0;
  let hasMoved = false;
  let preventClick = false;

  // 1. Chuyển đổi con lăn chuột dọc (deltaY) thành cuộn ngang tự nhiên trên PC
  container.addEventListener('wheel', (e) => {
    // Chỉ can thiệp nếu container thực sự có nội dung tràn ngang
    if (container.scrollWidth <= container.clientWidth) return;

    // Nếu lăn dọc nhiều hơn lăn ngang (chuột máy tính thông thường)
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // 2. Kéo rê chuột để lướt mượt mà như ngón tay vuốt trên màn hình cảm ứng
  const onMouseMove = (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (!hasMoved && Math.abs(dx) > 5) {
      hasMoved = true;
      preventClick = true;
      container.classList.add('is-dragging');
    }
    if (hasMoved) {
      container.scrollLeft = scrollStart - dx;
    }
  };

  const onMouseUp = () => {
    if (!isDown) return;
    isDown = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('blur', onMouseUp);

    container.classList.remove('is-dragging');
    if (preventClick) {
      setTimeout(() => {
        preventClick = false;
      }, 100);
    }
  };

  container.addEventListener('mousedown', (e) => {
    // Chỉ kích hoạt cho phím chuột trái và bỏ qua chạm cảm ứng di động
    if (e.button !== 0 || (e.pointerType && e.pointerType === 'touch')) return;
    if (container.scrollWidth <= container.clientWidth) return;

    isDown = true;
    hasMoved = false;
    startX = e.clientX;
    scrollStart = container.scrollLeft;

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onMouseUp);
  });

  // Chặn hiện tượng kéo ảnh hoặc ghost drag mặc định của trình duyệt
  container.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });

  // 3. Nuốt sự kiện click của các nút con nếu người dùng đang kéo rê để lướt
  container.addEventListener('click', (e) => {
    if (preventClick || hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      preventClick = false;
      hasMoved = false;
    }
  }, true); // Bắt ở capture phase để chặn trước khi tới nút con
}

function initHorizontalScrollContainers() {
  const selectors = [
    '.horizontal-scroll-drag',
    '#quest-suggest-chips',
    '#reward-suggest-chips',
    '#bank-suggest-chips',
    '#assistant-suggest-chips',
    '.quick-suggest-chips',
    '.notes-toolbar',
    '#focus-notes-toolbar',
    '#modal-focus-notes-toolbar'
  ];
  const containers = document.querySelectorAll(selectors.join(', '));
  containers.forEach(el => makeHorizontalScrollable(el));
}

if (typeof window !== 'undefined') {
  window.makeHorizontalScrollable = makeHorizontalScrollable;
  window.initHorizontalScrollContainers = initHorizontalScrollContainers;
}

// =============================================================================
// 16. MATERIAL DESIGN 3 BOTTOM SHEET GESTURES & PULL-TO-DISMISS
// =============================================================================
/**
 * Cho phép vuốt/kéo xuống để đóng (pull-to-dismiss) đối với Bottom Sheet (Quest Detail, Reward Detail).
 * Cung cấp phản hồi xúc giác bám ngón tay thời gian thực và hoạt ảnh trượt xuống thoát màn hình.
 */
function initBottomSheetGestures() {
  const sheetIds = ['modal-quest-detail', 'modal-reward-detail'];

  sheetIds.forEach(id => {
    const modal = document.getElementById(id);
    if (!modal || modal._gestureInitialized) return;
    modal._gestureInitialized = true;

    const panel = modal.querySelector('.m3-dialog-panel') || modal.querySelector('.rpg-panel');
    if (!panel) return;

    const handle = panel.querySelector('.m3-drag-handle');
    const header = panel.querySelector('#mqd-header-banner, #mrd-header-banner') || panel.firstElementChild;
    const scrollEl = panel.querySelector('.overflow-y-auto');

    let startY = 0;
    let startX = 0;
    let startTime = 0;
    let deltaY = 0;
    let isDragging = false;
    let dragTarget = null;

    const canStartDrag = (target) => {
      if (!target) return false;
      // Không can thiệp nếu người dùng chạm vào các nút bấm, icon đóng, liên kết hoặc ô nhập
      if (target.closest('button, a, input, textarea, select, .modal-close, [role="button"]:not(.m3-drag-handle)')) {
        return false;
      }
      return true;
    };

    const handleStart = (clientY, clientX, target) => {
      if (!canStartDrag(target)) return false;
      startY = clientY;
      startX = clientX;
      startTime = Date.now();
      deltaY = 0;
      isDragging = false;
      dragTarget = target;
      return true;
    };

    const handleMove = (clientY, clientX, e) => {
      if (startTime === 0) return;
      const currentDeltaY = clientY - startY;
      const currentDeltaX = clientX - startX;

      if (!isDragging) {
        // Chỉ kích hoạt khi di chuyển xuống dưới và ưu tiên hướng dọc so với ngang
        if (currentDeltaY > 6 && Math.abs(currentDeltaY) > Math.abs(currentDeltaX) * 1.1) {
          const isOnHandle = handle && (handle.contains(dragTarget) || dragTarget === handle);
          const isOnHeader = header && (header.contains(dragTarget) || dragTarget === header);
          const isAtTop = !scrollEl || scrollEl.scrollTop <= 0;

          if (isOnHandle || isOnHeader || isAtTop) {
            isDragging = true;
            modal._suppressBackdropClick = true;
            panel.style.transition = 'none';
          }
        }
      }

      if (isDragging) {
        if (e && e.cancelable) e.preventDefault();
        deltaY = Math.max(0, currentDeltaY);
        panel.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        const panelHeight = panel.offsetHeight || 500;
        const dim = Math.max(0.15, 1 - (deltaY / panelHeight) * 0.7);
        modal.style.backgroundColor = `rgba(2, 6, 23, ${0.75 * dim})`;
      }
    };

    const handleEnd = () => {
      if (isDragging) {
        isDragging = false;
        const duration = Math.max(1, Date.now() - startTime);
        const velocity = deltaY / duration; // px/ms
        const panelHeight = panel.offsetHeight || 500;
        const shouldDismiss = deltaY > Math.min(80, panelHeight * 0.22) || (deltaY > 30 && velocity > 0.35);

        if (shouldDismiss) {
          if (typeof dismissModalWithSlideDown === 'function') {
            dismissModalWithSlideDown(modal);
          } else {
            closeModal(modal.id);
          }
        } else {
          // Bật ngược lại lên trên mượt mà nếu chưa kéo đủ xa
          panel.style.transition = 'transform 0.24s cubic-bezier(0.1, 0.9, 0.2, 1)';
          panel.style.transform = 'translate3d(0, 0, 0)';
          modal.style.backgroundColor = '';
          setTimeout(() => {
            if (!modal.classList.contains('sheet-closing')) {
              panel.style.transition = '';
              panel.style.transform = '';
            }
          }, 250);
        }
        setTimeout(() => { modal._suppressBackdropClick = false; }, 150);
      }
      startY = 0;
      startX = 0;
      startTime = 0;
      deltaY = 0;
      dragTarget = null;
    };

    // Sự kiện Touch (Điện thoại, máy tính bảng)
    panel.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        handleStart(e.touches[0].clientY, e.touches[0].clientX, e.target);
      }
    }, { passive: true });

    panel.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length === 1) {
        handleMove(e.touches[0].clientY, e.touches[0].clientX, e);
      }
    }, { passive: false });

    panel.addEventListener('touchend', handleEnd, { passive: true });
    panel.addEventListener('touchcancel', handleEnd, { passive: true });

    // Hỗ trợ kéo thử nghiệm bằng chuột trên thanh handle hoặc header (Desktop Preview)
    const dragStarters = [handle, header].filter(Boolean);
    dragStarters.forEach(starter => {
      starter.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button === 0) {
          if (!handleStart(e.clientY, e.clientX, e.target)) return;
          const onPointerMove = (ev) => handleMove(ev.clientY, ev.clientX, ev);
          const onPointerUp = () => {
            handleEnd();
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
          };
          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerup', onPointerUp);
        }
      });
    });
  });
}

if (typeof window !== 'undefined') {
  window.initBottomSheetGestures = initBottomSheetGestures;
}
