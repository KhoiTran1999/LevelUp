// =============================================================================
// 14. EVENT LISTENERS ATTACHMENT
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initStartupFlow();

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
  if (btnMobileMore && mobileMoreMenu) {
    btnMobileMore.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMoreMenu.classList.toggle('hidden');
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#nav-more-dropdown-container')) {
      navMoreMenu?.classList.add('hidden');
    }
    if (!e.target.closest('#btn-mobile-more') && !e.target.closest('#mobile-more-menu')) {
      mobileMoreMenu?.classList.add('hidden');
    }
    if (!e.target.closest('.btn-quest-menu') && !e.target.closest('.btn-shop-menu') && !e.target.closest('.btn-inv-menu') && !e.target.closest('.quest-dropdown-menu')) {
      closeAllCardDropdowns();
    }
  });

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

  // Preset time chips in edit modal
  document.querySelectorAll('.btn-preset-time').forEach(btn => {
    btn.addEventListener('click', () => {
      const mins = parseInt(btn.dataset.mins, 10) || 25;
      const isReward = Boolean(activeRewardItem || appState.activeTimer?.isRewardMode);
      if (activeFocusQuest && mins < activeFocusQuest.targetMinutes) {
        showToast(`Không thể chọn mốc thấp hơn ${activeFocusQuest.targetMinutes} phút do AI đã định giá!`, 'error');
        sfx.playClick();
        return;
      }
      if (isReward && mins * 60 > focusRemainingSeconds) {
        showToast('Thời gian hưởng thụ chỉ được trừ xuống, không thể cộng thêm!', 'error');
        sfx.playClick();
        return;
      }
      const minInput = document.getElementById('input-edit-minutes');
      const secInput = document.getElementById('input-edit-seconds');
      if (minInput) minInput.value = mins;
      if (secInput) secInput.value = 0;
      sfx.playClick();
    });
  });

  // Save button in edit modal
  const btnSaveEdit = document.getElementById('btn-save-edit-timer');
  if (btnSaveEdit) {
    btnSaveEdit.addEventListener('click', () => {
      const minInput = document.getElementById('input-edit-minutes');
      const secInput = document.getElementById('input-edit-seconds');
      const mins = Math.max(0, parseInt(minInput ? minInput.value : 25, 10) || 0);
      const secs = Math.max(0, Math.min(59, parseInt(secInput ? secInput.value : 0, 10) || 0));
      saveEditTimer(mins, secs);
    });
  }
  ['input-edit-minutes', 'input-edit-seconds'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('btn-save-edit-timer')?.click();
        }
      });
    }
  });

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

  // Focus Complete celebration modal actions
  const btnCompleteClaim = document.getElementById('btn-focus-complete-claim');
  if (btnCompleteClaim) {
    btnCompleteClaim.addEventListener('click', () => {
      closeModal('modal-focus-complete');
    });
  }

  const btnCompleteBreak = document.getElementById('btn-focus-complete-break');
  if (btnCompleteBreak) {
    btnCompleteBreak.addEventListener('click', () => {
      closeModal('modal-focus-complete');
      startBreakTimer(5);
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
  document.getElementById('open-profile-btn').addEventListener('click', () => {
    document.getElementById('input-hero-nickname').value = appState.profile.nickname;

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

  document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const nick = document.getElementById('input-hero-nickname').value.trim();
    if (!nick) {
      showToast('Nickname không được để trống!', 'error');
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
            showToast(`Nickname "${nick}" đã có người sở hữu. Vui lòng chọn tên khác!`, 'error');
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
    showToast('Đã lưu hồ sơ và bắt đầu đồng bộ...', 'info');
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
    sfx.playClick();
    const titleEl = document.getElementById('modal-quest-title');
    const subEl = document.getElementById('modal-quest-subtitle');
    if (titleEl) titleEl.textContent = 'THÊM NHIỆM VỤ MỚI (AI TÍNH THƯỞNG)';
    if (subEl) subEl.textContent = 'Nhập việc cần làm, AI sẽ ước lượng độ khó và tính số Vàng thưởng công bằng';
    const acceptBtn = document.getElementById('btn-accept-verdict');
    if (acceptBtn) acceptBtn.textContent = '✓ Đồng Ý & Thêm Nhiệm Vụ';

    document.getElementById('quest-form-step').classList.remove('hidden');
    document.getElementById('quest-evaluating-step').classList.add('hidden');
    document.getElementById('quest-verdict-step').classList.add('hidden');
    document.getElementById('input-quest-title').value = '';
    document.getElementById('input-quest-desc').value = '';
    document.getElementById('input-quest-estimate').value = '';
    const questDurEl = document.getElementById('input-quest-duration');
    if (questDurEl) questDurEl.value = '';
    const repeatOnceRadio = document.querySelector('input[name="quest-repeat"][value="once"]');
    if (repeatOnceRadio) repeatOnceRadio.checked = true;
    const modNotice = document.getElementById('verdict-modified-notice');
    if (modNotice) modNotice.classList.add('hidden');
    const questSuggestBox = document.getElementById('quest-suggestions-container');
    if (questSuggestBox) questSuggestBox.classList.remove('hidden');
    loadQuestSuggestions(false);
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

  document.getElementById('btn-submit-to-ai').addEventListener('click', submitQuestToAI);
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
  document.getElementById('btn-accept-verdict').addEventListener('click', acceptVerdictAndCreateQuest);

  const verdictRepeatToggle = document.getElementById('verdict-repeat-toggle');
  if (verdictRepeatToggle) {
    verdictRepeatToggle.addEventListener('click', () => {
      if (!currentPendingVerdict) return;
      const targetState = !currentPendingVerdict.isRepeatable;
      if (targetState && (parseInt(currentPendingVerdict.rewardCoins, 10) || 0) > 15) {
        showToast(`Nhiệm vụ có mức thưởng cao (${currentPendingVerdict.rewardCoins} Vàng). Để chuyển sang lặp lại an toàn, hãy dùng tính năng Thương Lượng AI để cân đối lại!`, 'warning');
        return;
      }
      currentPendingVerdict.isRepeatable = targetState;
      sfx.playClick();
      updateVerdictDisplay();
    });
  }

  // Quest Debate features
  document.getElementById('btn-open-debate').addEventListener('click', () => {
    const debateBox = document.getElementById('debate-container');
    const isOpening = debateBox.classList.contains('hidden');
    debateBox.classList.toggle('hidden');
    if (isOpening) {
      initQuestDebateChat();
      const argInput = document.getElementById('input-debate-arg');
      if (argInput) {
        setTimeout(() => {
          argInput.focus();
          debateBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      }
    }
  });
  document.getElementById('btn-send-debate').addEventListener('click', sendDebateArgument);
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
        showToast('Chỉ cho phép chụp ảnh trực tiếp bằng điện thoại (chống gian lận)!', 'warning');
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
        showToast('Không cho phép đính kèm ảnh từ máy tính! Vui lòng dùng điện thoại chụp ảnh.', 'error');
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
          submitBtn.disabled = false;
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
        showToast('Chỉ hỗ trợ chụp ảnh trên điện thoại!', 'warning');
        return;
      }
      sfx.playClick();
      currentProofBase64 = null;
      if (inputProofFile) inputProofFile.value = '';
      document.getElementById('proof-preview-zone')?.classList.add('hidden');
      document.getElementById('proof-capture-zone')?.classList.remove('hidden');
      const submitBtn = document.getElementById('btn-submit-proof');
      if (submitBtn) submitBtn.disabled = true;
      inputProofFile?.click();
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
      const isMobile = isMobilePhone();
      const captureZone = document.getElementById('proof-capture-zone');
      const desktopNoticeZone = document.getElementById('proof-desktop-notice-zone');
      const submitBtn = document.getElementById('btn-submit-proof');
      const noteZone = document.getElementById('proof-note-zone');

      if (isMobile) {
        if (captureZone && !currentProofBase64) captureZone.classList.remove('hidden');
        if (desktopNoticeZone) desktopNoticeZone.classList.add('hidden');
        if (submitBtn) submitBtn.classList.remove('hidden');
        if (noteZone) noteZone.classList.remove('hidden');
      } else {
        if (captureZone) captureZone.classList.add('hidden');
        if (desktopNoticeZone) desktopNoticeZone.classList.remove('hidden');
        if (submitBtn) submitBtn.classList.add('hidden');
        if (noteZone) noteZone.classList.add('hidden');
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
    sfx.playClick();
    const titleEl = document.getElementById('modal-reward-title');
    const subEl = document.getElementById('modal-reward-subtitle');
    if (titleEl) titleEl.textContent = 'THÊM PHẦN THƯỞNG MỚI';
    if (subEl) subEl.textContent = 'AI tính giá Vàng tương xứng để bạn tự thưởng sau khi nỗ lực';

    const saveBtn = document.getElementById('btn-save-reward');
    if (saveBtn) saveBtn.textContent = '✓ Đồng Ý & Thêm Vào Cửa Hàng';

    document.getElementById('reward-form-step').classList.remove('hidden');
    document.getElementById('reward-evaluating-step').classList.add('hidden');
    document.getElementById('reward-verdict-step').classList.add('hidden');

    document.getElementById('input-reward-name').value = '';
    document.getElementById('input-reward-desc').value = '';
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
    loadRewardSuggestions(false);
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

  document.getElementById('btn-eval-reward').addEventListener('click', evaluateRewardItem);
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
  document.getElementById('btn-save-reward').addEventListener('click', savePendingReward);

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
      const modal = e.target.closest('.fixed');
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
        modal.classList.add('hidden');
      }
    });
  });

  // Chặn đóng modal khi click ra ngoài backdrop (kể cả Phù Thủy); chỉ cho phép thoát khi nhấn dấu x
  document.querySelectorAll('.fixed').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal.id === 'tour-overlay') return;
        if (modal.id === 'modal-welcome') {
          showToast('Vui lòng đăng nhập bằng Google để tiếp tục!', 'info');
        }
        const panel = modal.querySelector('.rpg-panel') || modal.querySelector('#assistant-panel');
        if (panel) {
          panel.classList.add('ring-4', 'ring-amber-500/60');
          setTimeout(() => panel.classList.remove('ring-4', 'ring-amber-500/60'), 400);
        }
      }
    });
  });

  // Phím Escape: chặn đóng tất cả modal (kể cả Phù Thủy); chỉ cho phép thoát khi nhấn dấu x
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isTourActive) {
        e.preventDefault();
        finishTour(false);
        return;
      }
      const openModal = document.querySelector('.fixed[id^="modal-"]:not(.hidden)');
      if (openModal) {
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
});
