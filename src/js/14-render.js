// =============================================================================
// 12. RENDER FUNCTIONS (Theme-aware & High Contrast)
// =============================================================================
let currentQuestFilter = 'active';

function renderHeader() {
  const p = appState.profile;
  const heroAvatar = document.getElementById('hero-avatar');
  if (heroAvatar) {
    if (isAvatarUrl(p.avatar)) {
      heroAvatar.innerHTML = `<img referrerpolicy="no-referrer" src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.nickname || 'Avatar')}" class="w-full h-full object-cover rounded-lg" onerror="this.onerror=null;this.parentElement.textContent='⚔️'">`;
    } else {
      heroAvatar.textContent = p.avatar || '⚔️';
    }
  }
  document.getElementById('hero-nickname').textContent = p.nickname;
  document.getElementById('hero-title').textContent = p.title;
  document.getElementById('hero-level-badge').textContent = `LV. ${p.level}`;
  document.getElementById('hero-coins').textContent = p.coins;

  const expNeeded = p.level * 100;
  document.getElementById('hero-exp-text').textContent = `${p.exp}/${expNeeded}`;
  const pct = Math.min(100, Math.round((p.exp / expNeeded) * 100));
  document.getElementById('hero-exp-bar').style.width = `${pct}%`;

  const soundBtn = document.getElementById('toggle-sound-btn');
  if (soundBtn) soundBtn.textContent = p.soundEnabled ? '🔊' : '🔇';
  sfx.enabled = p.soundEnabled;

  const modalSoundIcon = document.getElementById('modal-sound-icon');
  const modalSoundText = document.getElementById('modal-sound-text');
  if (modalSoundIcon) modalSoundIcon.textContent = p.soundEnabled ? '🔊' : '🔇';
  if (modalSoundText) modalSoundText.textContent = p.soundEnabled ? 'Đang bật' : 'Đang tắt';

  const themeBtn = document.getElementById('toggle-theme-btn');
  if (themeBtn) {
    themeBtn.textContent = document.documentElement.classList.contains('dark') ? '🌙' : '☀️';
  }

  const syncTime = document.getElementById('modal-sync-time');
  if (syncTime && appState.lastSyncedAt) {
    syncTime.textContent = new Date(appState.lastSyncedAt).toLocaleTimeString();
  }

  const profLevelTitle = document.getElementById('profile-modal-level-title');
  if (profLevelTitle) profLevelTitle.textContent = `LV. ${p.level} • ${p.title || 'Tân Binh Cấp 1'}`;
  const profExpText = document.getElementById('profile-modal-exp-text');
  if (profExpText) profExpText.textContent = `${p.exp}/${expNeeded} EXP (${pct}%)`;

  if (!p.lastStreakDate && (parseInt(p.streak, 10) || 0) > 0) {
    p.lastStreakDate = getLocalDayString(new Date(Date.now() - 86400000));
  }
  const statusInfo = getDailyStreakStatus(p);
  if (statusInfo.status === 'broken' && p.streak > 0) {
    p.streak = 0;
  }

  const streak = Math.max(0, parseInt(p.streak, 10) || 0);
  const heroStreakCount = document.getElementById('hero-streak-count');
  if (heroStreakCount) {
    heroStreakCount.innerHTML = `${streak}<span class="hidden sm:inline text-[10px] font-medium ml-0.5">ngày</span>`;
  }
  const heroStreakFlame = document.getElementById('hero-streak-flame');
  if (heroStreakFlame) {
    if (streak >= 30) {
      heroStreakFlame.className = 'text-sm sm:text-base streak-flame streak-flame-legendary transition-transform group-hover:scale-110';
      heroStreakFlame.textContent = '👑';
    } else if (streak >= 7) {
      heroStreakFlame.className = 'text-sm sm:text-base streak-flame streak-flame-high transition-transform group-hover:scale-110';
      heroStreakFlame.textContent = '🔥';
    } else {
      heroStreakFlame.className = 'text-sm sm:text-base streak-flame transition-transform group-hover:scale-110';
      heroStreakFlame.textContent = '🔥';
    }
  }

  const profStreakTitle = document.getElementById('profile-modal-streak-title');
  if (profStreakTitle) profStreakTitle.textContent = `Chuỗi Chăm Chỉ: ${streak} ngày (${getStreakTitle(streak)})`;
  const profStreakPerk = document.getElementById('profile-modal-streak-perk');
  if (profStreakPerk) profStreakPerk.textContent = `Thưởng nhiệm vụ: +${getStreakBonusPercent(streak)}% Vàng`;
}

/**
 * Tự động đo đạc và quản lý nút "...xem thêm" / "Thu gọn ▲" cho thẻ Nhiệm vụ và Phần thưởng.
 * Mặc định: 1 dòng (line-clamp-1).
 * Chỉ hiện nút toggle khi nội dung vượt quá 1 dòng (từ dòng 2 trở lên).
 * Khi mở rộng: bung ra toàn bộ nội dung theo chiều cao tự nhiên, không giới hạn chiều cao và không cần thanh cuộn.
 */
function setupCardDescToggle(card, descSelector) {
  const descP = card.querySelector(descSelector);
  const toggleBtn = card.querySelector('.btn-toggle-desc');
  if (!descP || !toggleBtn) return;

  const checkOverflow = () => {
    if (descP.classList.contains('expanded')) return;
    const isVisible = descP.clientHeight > 0;
    // Kiểm tra tràn 1 dòng:
    // Nếu phần tử hiển thị: so sánh scrollHeight vs clientHeight (có dung sai 1px cho subpixel rendering)
    // Nếu phần tử đang ở tab ẩn: kiểm tra có chứa ký tự xuống dòng hoặc độ dài văn bản
    const isMultiLine = isVisible
      ? (descP.scrollHeight > descP.clientHeight + 1)
      : (descP.textContent.includes('\n') || descP.textContent.trim().length > 38);

    if (isMultiLine) {
      toggleBtn.classList.remove('hidden');
    } else {
      toggleBtn.classList.add('hidden');
    }
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isClamped = descP.classList.contains('line-clamp-1');
    if (isClamped) {
      descP.classList.remove('line-clamp-1');
      descP.classList.add('expanded');
      toggleBtn.textContent = 'Thu gọn ▲';
    } else {
      descP.classList.remove('expanded');
      descP.classList.add('line-clamp-1');
      descP.scrollTop = 0;
      toggleBtn.textContent = '...xem thêm';
    }
  });

  checkOverflow();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(checkOverflow);
  }
}
window.setupCardDescToggle = setupCardDescToggle;

function refreshAllCardDescToggles() {
  const activeTabPane = document.querySelector('.tab-pane:not(.hidden)');
  if (!activeTabPane) return;
  const cards = activeTabPane.querySelectorAll('.rpg-card');
  cards.forEach(card => {
    const descP = card.querySelector('.quest-desc-text, .reward-desc-text');
    const toggleBtn = card.querySelector('.btn-toggle-desc');
    if (!descP || !toggleBtn) return;
    if (descP.classList.contains('expanded')) return;
    if (descP.clientHeight > 0) {
      if (descP.scrollHeight > descP.clientHeight + 1) {
        toggleBtn.classList.remove('hidden');
      } else {
        toggleBtn.classList.add('hidden');
      }
    }
  });

  // Đo đạc lại cho thẻ Lịch Sử nếu đang ở tab Ledger
  if (activeTabPane.id === 'tab-ledger') {
    setupLedgerDescToggles();
  }
}
window.refreshAllCardDescToggles = refreshAllCardDescToggles;

/**
 * Đóng toàn bộ các menu dropdown thao tác của các thẻ và hạ tầng z-index
 */
function closeAllCardDropdowns() {
  document.querySelectorAll('.quest-dropdown-menu:not(.hidden)').forEach(m => {
    m.classList.add('hidden');
    m.closest('.rpg-card')?.classList.remove('card-menu-open');
  });
}
window.closeAllCardDropdowns = closeAllCardDropdowns;
const QUEST_CARD_COLORS = ['teal', 'blue', 'pink', 'sage', 'yellow', 'purple', 'orange'];

function getQuestCardColorName(quest, index) {
  if (quest && quest.color && QUEST_CARD_COLORS.includes(quest.color)) {
    return quest.color;
  }
  return QUEST_CARD_COLORS[index % QUEST_CARD_COLORS.length];
}

function renderWeekStrip() {
  const container = document.getElementById('week-strip-days');
  const monthLabel = document.getElementById('current-week-month-label');
  if (!container) return;

  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);

  const dayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  if (monthLabel) {
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    monthLabel.textContent = `Tháng ${month}, ${year}`;
  }

  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateNum = d.getDate();
    const isToday = (i === dayOfWeek);

    html += `
      <div class="week-day-col ${isToday ? 'is-today' : ''}">
        <span class="week-day-name">${dayNames[i]}</span>
        <div class="week-day-circle">
          <span>${dateNum}</span>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}
window.renderWeekStrip = renderWeekStrip;

function renderQuests() {
  renderWeekStrip();
  const grid = document.getElementById('quests-grid');
  const empty = document.getElementById('quests-empty');
  const activeCountBadge = document.getElementById('badge-active-quests');

  let filtered = appState.quests;
  if (currentQuestFilter === 'active') {
    filtered = appState.quests.filter(q => q.status === 'active');
  } else if (currentQuestFilter === 'completed') {
    filtered = appState.quests.filter(q => q.status === 'completed' || (q.isRepeatable && (q.completedCount || 0) > 0));
  }

  // Sắp xếp nhiệm vụ: Ghim việc đang làm lên đầu, việc active trước completed, theo Rank & Vàng từ cao xuống thấp
  const rankScores = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
  filtered = [...filtered].sort((a, b) => {
    const aFocus = (activeFocusQuest && activeFocusQuest.id === a.id) ? 1 : 0;
    const bFocus = (activeFocusQuest && activeFocusQuest.id === b.id) ? 1 : 0;
    if (aFocus !== bFocus) return bFocus - aFocus;

    const aActive = a.status === 'active' ? 1 : 0;
    const bActive = b.status === 'active' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;

    const scoreA = rankScores[(a.rank || 'E').toUpperCase()] ?? 1;
    const scoreB = rankScores[(b.rank || 'E').toUpperCase()] ?? 1;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (b.rewardCoins || 0) - (a.rewardCoins || 0);
  });

  const activeQuests = appState.quests.filter(q => q.status === 'active');
  const activeCount = activeQuests.length;
  if (activeCountBadge) activeCountBadge.textContent = activeCount;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = '';
  // ponytail: batch DOM card insertion via DocumentFragment to eliminate layout thrashing
  const fragment = document.createDocumentFragment();

  filtered.forEach((q, qIndex) => {
    const isCompleted = q.status === 'completed';
    const isCurrentlyFocusing = activeFocusQuest && activeFocusQuest.id === q.id;
    const isTimerDone = isCurrentlyFocusing && focusRemainingSeconds <= 0;
    const isSessionOnOtherDevice = Boolean(
      isCurrentlyFocusing &&
      !isTimerDone &&
      appState.activeTimer?.runnerId &&
      appState.activeTimer.runnerId !== CURRENT_RUNNER_ID
    );
    const hasSavedTimer = Boolean(q.savedTimer && q.savedTimer.remainingSeconds > 0);
    const cooldownRemainingMs = getQuestRepeatCooldownRemaining(q);
    const rank = (q.rank || 'E').toUpperCase();
    const colorKey = getQuestCardColorName(q, qIndex);

    const questStreak = typeof getQuestStreak === 'function' ? getQuestStreak(q) : (Number(q.streak) || 0);

    const targetMinutes = parseInt(q.targetMinutes, 10) || 0;
    const hasTime = (q.type === 'focus' || targetMinutes > 0) && targetMinutes > 0;

    // Counter badge text (only for timed focus quests)
    let counterText = '';
    if (hasTime) {
      if (isCompleted || isTimerDone || q.focusTimerCompleted) {
        counterText = `${targetMinutes}/${targetMinutes}`;
      } else if (hasSavedTimer && q.savedTimer?.remainingSeconds) {
        const elapsedMins = Math.max(0, Math.floor((targetMinutes * 60 - q.savedTimer.remainingSeconds) / 60));
        counterText = `${elapsedMins}/${targetMinutes}min`;
      } else {
        counterText = `0/${targetMinutes}min`;
      }
    }

    const card = document.createElement('div');
    card.dataset.questId = q.id;
    card.className = `rpg-card rpg-panel quest-card-compact quest-card-rank-${rank} ${
      isCurrentlyFocusing
        ? (isTimerDone
            ? 'ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/20 bg-emerald-500/5 border-emerald-500/50'
            : 'ring-2 ring-orange-500 shadow-xl shadow-orange-500/25 bg-orange-500/5 border-orange-500/50')
        : isCompleted
          ? 'opacity-70 bg-slate-100/50 dark:bg-slate-950/30'
          : (hasSavedTimer ? 'ring-2 ring-sky-500/60 shadow-md shadow-sky-500/15 bg-sky-500/5 border-sky-500/40' : '')
    } p-3.5 sm:p-4 flex items-center justify-between transition-all duration-300 relative cursor-pointer hover:shadow-md`;

    card.innerHTML = `
      <!-- Zone 2: Body Icon Box -->
      <div class="quest-card-icon-container w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl shadow-xs shrink-0 ${isCompleted ? 'opacity-60 grayscale' : ''}">
        ${escapeHtml(getQuestIcon(q))}
      </div>

      <!-- Center: Task Info (Title & Description with comfortable spacing) -->
      <div class="flex-1 min-w-0 mx-3 sm:mx-4 flex flex-col justify-center gap-1.5">
        <div class="flex items-center gap-2 min-w-0">
          <h3 class="font-bold text-sm sm:text-base leading-snug truncate ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}">${escapeHtml(q.title)}</h3>
          ${isCurrentlyFocusing ? (isTimerDone ? `
            <span class="badge-quest-doing inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500 text-white shadow-xs shrink-0">
              🎉 ĐÃ XONG
            </span>
          ` : `
            <span class="badge-quest-doing inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-orange-500 text-white shadow-xs shrink-0">
              ⏱️ ĐANG LÀM
            </span>
          `) : (hasSavedTimer ? `
            <span class="badge-quest-saved inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-sky-500 text-white shadow-xs shrink-0" title="Thời gian đang được bảo lưu">
              ⏸️ BẢO LƯU (${Math.ceil(q.savedTimer.remainingSeconds / 60)}p)
            </span>
          ` : '')}
        </div>
        ${q.description ? `
          <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 truncate leading-relaxed">${escapeHtml(q.description)}</p>
        ` : ''}
      </div>

      <!-- Right: Time & Streak Information (Cleanly Spaced) -->
      <div class="flex flex-col items-end justify-center shrink-0 pl-3 sm:pl-4 gap-1.5 self-center">
        <div class="flex items-center gap-1 text-[11px] font-bold ${questStreak > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'} whitespace-nowrap">
          <span class="text-xs ${questStreak > 0 ? '' : 'grayscale opacity-60'}">🔥</span>
          <span>${questStreak} ngày</span>
        </div>
        <span class="quest-card-gold-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs shadow-xs whitespace-nowrap" title="Phần thưởng: +${q.rewardCoins} Vàng">
          ${COIN_ICON_HTML} <span>+${q.rewardCoins}</span><span class="hidden sm:inline text-[10px] font-medium ml-0.5">Vàng</span>
        </span>
      </div>

      <!-- Hidden Accessible / Test Elements Container -->
      <div class="hidden quest-card-internal-controls">
        <span class="quest-card-pill hidden" aria-hidden="true">${counterText}</span>
        <button type="button" class="quest-card-action-btn" aria-hidden="true"></button>
        <p class="quest-desc-text text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed break-words">${escapeHtml(q.description || '')}</p>
        <button type="button" class="btn-toggle-desc hidden text-[11px] font-bold text-amber-600">...xem thêm</button>
        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg">
          ${COIN_ICON_HTML} <span>+${q.rewardCoins}</span>
        </div>
        <button type="button" class="btn-quest-menu" aria-label="Tùy chọn thao tác">
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
        </button>
        <div class="quest-dropdown-menu hidden">
          <span class="rank-badge-${q.rank}">HẠNG ${q.rank}</span>
          <div class="quest-dropdown-item">
            <span>Bằng chứng:</span>
            <span>${q.focusTimerCompleted ? 'CHỜ NỘP ẢNH' : 'CẦN ẢNH'}</span>
          </div>
          ${hasSavedTimer ? `
            <button type="button" class="btn-clear-saved-timer">Hủy bảo lưu</button>
          ` : ''}
          ${!isCompleted ? `
            <button type="button" class="btn-debate-quest">Thương lượng AI</button>
          ` : ''}
          ${q.isRepeatable && q.completedCount > 0 ? `
            <button type="button" class="btn-undo-repeat-quest">Hoàn tác lần vừa làm (-${q.rewardCoins} Vàng)</button>
          ` : ''}
          ${!isCompleted ? `
            <button type="button" class="btn-toggle-repeat">Đổi lặp lại</button>
          ` : ''}
          <button type="button" class="btn-view-quest-freq">Xem biểu đồ tần suất</button>
          <button type="button" class="btn-del-quest">Xóa nhiệm vụ</button>
        </div>
        ${isCompleted ? `
          <button class="btn-restart-quest">Làm lại</button>
          <button class="btn-undo-quest">Hoàn tác</button>
        ` : (q.focusTimerCompleted && q.requiresProof ? `
          <button class="btn-submit-quest-proof py-2 px-3 rounded-lg text-xs font-semibold">
            <span>Chụp Ảnh Nhận Vàng 📸</span>
          </button>
        ` : (q.type === 'focus' ? (isTimerDone ? `
          <button class="btn-complete-focus-done">
            <span>${q.requiresProof && !q._proofVerified ? 'Chụp Ảnh Nhận Vàng 📸' : 'Hoàn Thành & Nhận Thưởng 🎉'}</span>
          </button>
        ` : `
          <button class="btn-start-focus">
            <span>${hasSavedTimer ? `Tiếp Tục (${Math.ceil(q.savedTimer.remainingSeconds / 60)}p) ⏱️` : 'Bắt Đầu ⏱️'}</span>
          </button>
        `) : `
          <button class="btn-complete-bounty">
            <span>${cooldownRemainingMs > 0 ? `Chờ ${Math.ceil(cooldownRemainingMs / 60000)}p` : 'Hoàn Thành'}</span>
          </button>
        `))}
      </div>
    `;

    // Dropdown Action Menu Toggle (internal)
    const menuBtn = card.querySelector('.btn-quest-menu');
    const dropdown = card.querySelector('.quest-dropdown-menu');
    if (menuBtn && dropdown) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = dropdown.classList.contains('hidden');
        closeAllCardDropdowns();
        if (willOpen) {
          dropdown.classList.remove('hidden');
          card.classList.add('card-menu-open');
        }
      });
    }

    // Toggle description expand / collapse
    setupCardDescToggle(card, '.quest-desc-text');

    const toggleRepeatBtn = card.querySelector('.btn-toggle-repeat');
    if (toggleRepeatBtn) {
      toggleRepeatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        toggleQuestRepeatable(q.id);
      });
    }

    const delQuestBtn = card.querySelector('.btn-del-quest');
    if (delQuestBtn) {
      delQuestBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        deleteQuest(q.id);
      });
    }

    const debateQuestBtn = card.querySelector('.btn-debate-quest');
    if (debateQuestBtn) {
      debateQuestBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        openQuestRenegotiateModal(q.id);
      });
    }

    const clearSavedBtn = card.querySelector('.btn-clear-saved-timer');
    if (clearSavedBtn) {
      clearSavedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        clearSavedQuestTimer(q.id);
      });
    }

    const restartBtn = card.querySelector('.btn-restart-quest');
    if (restartBtn) {
      restartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        restartQuest(q.id);
      });
    }

    const undoBtn = card.querySelector('.btn-undo-quest');
    if (undoBtn) {
      undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        undoCompleteQuest(q.id);
      });
    }

    const undoRepeatBtn = card.querySelector('.btn-undo-repeat-quest');
    if (undoRepeatBtn) {
      undoRepeatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        undoCompleteQuest(q.id);
      });
    }

    const freqBtn = card.querySelector('.btn-view-quest-freq');
    if (freqBtn) {
      freqBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        openItemFrequencyModal(q, true);
      });
    }

    const submitProofBtn = card.querySelector('.btn-submit-quest-proof');
    if (submitProofBtn) {
      submitProofBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        openQuestProofModal(q);
      });
    }

    const startBtn = card.querySelector('.btn-start-focus');
    if (startBtn) {
      startBtn.addEventListener('click', () => startFocusTimer(q));
    }

    const completeFocusDoneBtn = card.querySelector('.btn-complete-focus-done');
    if (completeFocusDoneBtn) {
      completeFocusDoneBtn.addEventListener('click', () => {
        actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);
        focusRemainingSeconds = 0;
        if (isBreakMode) {
          breakTimerFinished();
        } else if (activeRewardItem) {
          rewardTimerFinished();
        } else {
          focusTimerFinished();
        }
      });
    }

    const completeBtn = card.querySelector('.btn-complete-bounty');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => completeQuest(q.id));
    }

    // Card Click: Open Full Detail Modal or Action Circle Button Click
    card.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('.quest-card-action-btn');
      if (actionBtn) {
        e.stopPropagation();
        if (isCompleted) {
          openQuestDetailModal(q.id);
        } else if (q.type === 'focus' && !isTimerDone) {
          openQuestDetailModal(q.id);
        } else if (q.requiresProof && !q._proofVerified) {
          openQuestProofModal(q);
        } else {
          completeQuest(q.id);
        }
        return;
      }
      openQuestDetailModal(q.id);
    });

    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(refreshAllCardDescToggles);
  }
}

function openQuestDetailModal(questId) {
  const q = appState.quests.find(x => x.id === questId);
  if (!q) return;

  const modal = document.getElementById('modal-quest-detail');
  if (!modal) return;

  const isCompleted = q.status === 'completed';
  const isCurrentlyFocusing = activeFocusQuest && activeFocusQuest.id === q.id;
  const isTimerDone = isCurrentlyFocusing && focusRemainingSeconds <= 0;
  const hasSavedTimer = Boolean(q.savedTimer && q.savedTimer.remainingSeconds > 0);
  const cooldownRemainingMs = getQuestRepeatCooldownRemaining(q);
  const rank = (q.rank || 'E').toUpperCase();
  const index = appState.quests.indexOf(q);
  const colorKey = getQuestCardColorName(q, Math.max(0, index));

  // 1. Header Banner
  const banner = document.getElementById('mqd-header-banner');
  if (banner) {
    banner.className = 'p-5 sm:p-6 transition-colors flex items-start justify-between gap-3 shrink-0 relative bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800';
  }

  const iconEl = document.getElementById('mqd-icon');
  if (iconEl) iconEl.textContent = getQuestIcon(q);

  const titleEl = document.getElementById('mqd-title');
  if (titleEl) titleEl.textContent = q.title;

  const rankBadge = document.getElementById('mqd-rank-badge');
  if (rankBadge) rankBadge.textContent = `HẠNG ${rank}`;

  const typeBadge = document.getElementById('mqd-type-badge');
  if (typeBadge) {
    typeBadge.textContent = q.type === 'focus' ? `⏱️ Tập trung (${q.targetMinutes || 25}p)` : '🎯 Nhanh gọn';
  }

  const repeatBadge = document.getElementById('mqd-repeat-badge');
  if (repeatBadge) {
    repeatBadge.textContent = q.isRepeatable ? `🔁 Lặp lại${q.completedCount ? ` (${q.completedCount})` : ''}` : '🎯 Làm 1 lần';
  }

  // 2. Rewards
  const curStreak = Math.max(0, parseInt(appState.profile?.streak, 10) || 0);
  const streakBonusPct = getStreakBonusPercent(curStreak);
  const streakBonusCoins = Math.floor(q.rewardCoins * (streakBonusPct / 100));
  const totalAwarded = q.rewardCoins + streakBonusCoins;

  const coinsEl = document.getElementById('mqd-coins-reward');
  if (coinsEl) {
    coinsEl.textContent = `+${totalAwarded} Vàng${streakBonusCoins > 0 ? ` (+${streakBonusCoins} 🔥)` : ''}`;
  }

  const expEl = document.getElementById('mqd-exp-reward');
  if (expEl) {
    expEl.textContent = `+${totalAwarded * 3} EXP`;
  }

  // 3. Description
  const descEl = document.getElementById('mqd-desc');
  if (descEl) {
    descEl.textContent = q.description || 'Không có mô tả chi tiết.';
  }

  // 4. Supplementary Info Badges (Thời gian, Chế độ lặp, Bằng chứng ảnh, Hạng, Streak, Bảo lưu)
  const metaBadges = document.getElementById('mqd-meta-badges');
  if (metaBadges) {
    const badges = [];

    // Badge 1: Thời gian & Loại
    if (q.type === 'focus') {
      badges.push(`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          ⏱️ ${q.targetMinutes || 25} phút tập trung
        </span>
      `);
    } else {
      badges.push(`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700">
          ⚡ Thường
        </span>
      `);
    }

    // Badge 2: Chế độ lặp lại
    if (q.isRepeatable) {
      const count = q.completedCount || 0;
      badges.push(`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-sky-500/10 dark:bg-sky-400/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
          🔁 Lặp lại${count > 0 ? ` (${count})` : ''}
        </span>
      `);
    } else {
      badges.push(`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700">
          📌 Làm 1 lần
        </span>
      `);
    }

    // Badge 3: Yêu cầu bằng chứng ảnh
    if (q.requiresProof) {
      if (q._proofVerified) {
        badges.push(`
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            📸 Ảnh đã duyệt
          </span>
        `);
      } else {
        badges.push(`
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-purple-500/10 dark:bg-purple-400/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
            📸 Cần ảnh AI duyệt
          </span>
        `);
      }
    }

    // Badge: Chuỗi streak
    const qStreak = typeof getQuestStreak === 'function' ? getQuestStreak(q) : (q.streak || 0);
    if (qStreak > 0) {
      badges.push(`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-orange-500/10 dark:bg-orange-400/10 text-orange-700 dark:text-orange-300 border border-orange-500/20">
          🔥 Chuỗi ${qStreak} ngày
        </span>
      `);
    }

    // Badge 6: Trạng thái đếm giờ bảo lưu
    if (hasSavedTimer) {
      badges.push(`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-300">
          ⏸️ Đang bảo lưu: ${Math.ceil(q.savedTimer.remainingSeconds / 60)}p
        </span>
      `);
    } else if (isCurrentlyFocusing) {
      badges.push(`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 animate-pulse">
          ⏱️ Đang bấm giờ (${Math.ceil(focusRemainingSeconds / 60)}p)
        </span>
      `);
    }

    metaBadges.innerHTML = badges.join('');
  }

  // 5. Primary Action Button Container
  const primaryActionContainer = document.getElementById('mqd-primary-action-container');
  if (primaryActionContainer) {
    if (isCompleted) {
      primaryActionContainer.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="mqd-btn-restart" type="button" class="flex-1 py-3 px-4 rounded-2xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span>Làm Lại</span>
          </button>
          <button id="mqd-btn-undo" type="button" class="flex-1 py-3 px-4 rounded-2xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
            <span>Hoàn Tác</span>
          </button>
        </div>
      `;
      document.getElementById('mqd-btn-restart')?.addEventListener('click', () => {
        closeModal('modal-quest-detail');
        restartQuest(q.id);
      });
      document.getElementById('mqd-btn-undo')?.addEventListener('click', () => {
        closeModal('modal-quest-detail');
        undoCompleteQuest(q.id);
      });
    } else if (q.focusTimerCompleted && q.requiresProof) {
      primaryActionContainer.innerHTML = `
        <button id="mqd-btn-proof" type="button" class="w-full py-3 px-4 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-md cursor-pointer animate-pulse">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="4" stroke-width="2"/></svg>
          <span>Chụp Ảnh Nhận Vàng 📸</span>
        </button>
      `;
      document.getElementById('mqd-btn-proof')?.addEventListener('click', () => {
        window.parentDetailQuestId = q.id;
        closeModal('modal-quest-detail');
        openQuestProofModal(q);
      });
    } else if (q.type === 'focus') {
      if (isTimerDone) {
        primaryActionContainer.innerHTML = `
          <button id="mqd-btn-focus-done" type="button" class="w-full py-3 px-4 rounded-2xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-md cursor-pointer animate-pulse">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
            <span>${q.requiresProof && !q._proofVerified ? 'Chụp Ảnh Nhận Vàng 📸' : 'Hoàn Thành & Nhận Thưởng 🎉'}</span>
          </button>
        `;
        document.getElementById('mqd-btn-focus-done')?.addEventListener('click', () => {
          closeModal('modal-quest-detail');
          actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);
          focusRemainingSeconds = 0;
          focusTimerFinished();
        });
      } else if (isCurrentlyFocusing) {
        primaryActionContainer.innerHTML = `
          <div class="flex items-center gap-2">
            <button id="mqd-btn-focus-toggle" type="button" class="flex-1 py-3 px-4 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center gap-1.5 cursor-pointer">
              <span>${isFocusRunning ? 'Tạm Dừng ⏸️' : 'Tiếp Tục Chạy ▶️'}</span>
            </button>
            <button id="mqd-btn-go-timer" type="button" class="py-3 px-4 rounded-2xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition flex items-center justify-center gap-1 cursor-pointer">
              <span>Đồng Hồ ⏱️</span>
            </button>
          </div>
        `;
        document.getElementById('mqd-btn-focus-toggle')?.addEventListener('click', () => {
          closeModal('modal-quest-detail');
          toggleFocusTimer();
        });
        document.getElementById('mqd-btn-go-timer')?.addEventListener('click', () => {
          closeModal('modal-quest-detail');
          document.getElementById('timer-section')?.scrollIntoView({ behavior: 'smooth' });
        });
      } else if (hasSavedTimer) {
        primaryActionContainer.innerHTML = `
          <div class="flex items-center gap-2">
            <button id="mqd-btn-start-focus" type="button" class="flex-1 py-3 px-4 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-md cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
              <span>Tiếp Tục (${Math.ceil(q.savedTimer.remainingSeconds / 60)}p) ⏱️</span>
            </button>
            <button id="mqd-btn-clear-saved" type="button" class="py-3 px-3.5 rounded-2xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-400 transition flex items-center justify-center gap-1 cursor-pointer" title="Hủy thời gian đã bảo lưu để bắt đầu lại">
              <span>⏹️ Hủy</span>
            </button>
          </div>
        `;
        document.getElementById('mqd-btn-start-focus')?.addEventListener('click', () => {
          closeModal('modal-quest-detail');
          startFocusTimer(q);
        });
        document.getElementById('mqd-btn-clear-saved')?.addEventListener('click', () => {
          closeModal('modal-quest-detail');
          clearSavedQuestTimer(q.id);
        });
      } else {
        primaryActionContainer.innerHTML = `
          <button id="mqd-btn-start-focus" type="button" class="w-full py-3 px-4 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-md cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
            <span>Bắt Đầu Tập Trung (${q.targetMinutes || 25}p) ⏱️</span>
          </button>
        `;
        document.getElementById('mqd-btn-start-focus')?.addEventListener('click', () => {
          closeModal('modal-quest-detail');
          startFocusTimer(q);
        });
      }
    } else {
      // Bounty quest
      primaryActionContainer.innerHTML = `
        <button id="mqd-btn-complete-bounty" type="button" class="w-full py-3 px-4 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md ${cooldownRemainingMs > 0 ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'}" ${cooldownRemainingMs > 0 ? 'disabled' : ''}>
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
          <span>${cooldownRemainingMs > 0 ? `Chờ ${Math.ceil(cooldownRemainingMs / 60000)}p` : 'Hoàn Thành & Nhận Thưởng 🎉'}</span>
        </button>
      `;
      document.getElementById('mqd-btn-complete-bounty')?.addEventListener('click', () => {
        closeModal('modal-quest-detail');
        completeQuest(q.id);
      });
    }
  }

  // 6. Hoàn tác lần vừa làm cho nhiệm vụ lặp lại (nằm trong nhóm nút dưới cùng)
  const undoContainer = document.getElementById('mqd-undo-container');
  if (undoContainer) {
    if (!isCompleted && q.isRepeatable && (q.completedCount || 0) > 0) {
      undoContainer.classList.remove('hidden');
      undoContainer.innerHTML = `
        <button id="mqd-btn-undo-repeat" type="button" class="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
          <span>Hoàn lại lần vừa làm (-${q.rewardCoins} Vàng)</span>
        </button>
      `;
      document.getElementById('mqd-btn-undo-repeat')?.addEventListener('click', () => {
        closeModal('modal-quest-detail');
        undoCompleteQuest(q.id);
      });
    } else {
      undoContainer.classList.add('hidden');
      undoContainer.innerHTML = '';
    }
  }

  // 7. Secondary Buttons: Debate, Freq, Repeat, Delete
  const btnDebate = document.getElementById('mqd-btn-debate');
  if (btnDebate) {
    btnDebate.onclick = () => {
      window.parentDetailQuestId = q.id;
      closeModal('modal-quest-detail');
      openQuestRenegotiateModal(q.id);
    };
  }

  const btnFreq = document.getElementById('mqd-btn-freq');
  if (btnFreq) {
    btnFreq.onclick = () => {
      window.parentDetailQuestId = q.id;
      closeModal('modal-quest-detail');
      openItemFrequencyModal(q, true);
    };
  }

  const btnRepeat = document.getElementById('mqd-btn-repeat');
  const repeatLabel = document.getElementById('mqd-repeat-btn-label');
  if (btnRepeat) {
    if (repeatLabel) repeatLabel.textContent = q.isRepeatable ? 'Đổi sang 1 lần' : 'Đổi lặp lại';
    btnRepeat.onclick = () => {
      toggleQuestRepeatable(q.id);
      openQuestDetailModal(q.id);
    };
  }

  const btnDelete = document.getElementById('mqd-btn-delete');
  if (btnDelete) {
    btnDelete.onclick = async () => {
      const deleted = await deleteQuest(q.id);
      if (deleted) {
        closeModal('modal-quest-detail');
      }
    };
  }

  modal.classList.remove('hidden');
}
window.openQuestDetailModal = openQuestDetailModal;


function renderShop() {
  const grid = document.getElementById('shop-grid');
  const countBadge = document.getElementById('badge-shop-count');
  if (countBadge) countBadge.textContent = appState.shopItems.length;
  updateRewardsNavBadge();

  grid.innerHTML = '';

  if (appState.shopItems.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12 sm:py-16 px-4">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-3xl shadow-xs">
          🏪
        </div>
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Cửa Hàng Chưa Bày Bán Phần Thưởng Nào!</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto mb-5">Hãy tạo những phần thưởng bạn yêu thích (ly cà phê, xem phim, mua sách...) và để AI định giá Vàng hợp lý nhé.</p>
        <div class="flex justify-center">
          <button onclick="window.openRewardModal ? window.openRewardModal() : document.getElementById('btn-open-add-reward-nav')?.click()" class="btn-action-reward flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md">
            <span class="text-sm">🎁</span>
            <span>+ Thêm Phần Thưởng Ngay</span>
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Sắp xếp phần thưởng Cửa Hàng: Cực phẩm -> Phổ thông, Giá cao -> thấp
  let items = [...appState.shopItems];
  const tierScores = { legendary: 4, epic: 3, rare: 2, common: 1 };
  items.sort((a, b) => {
    const rawTierA = (a.tier || 'rare').toLowerCase();
    const rawTierB = (b.tier || 'rare').toLowerCase();
    const scoreA = tierScores[rawTierA] ?? 1;
    const scoreB = tierScores[rawTierB] ?? 1;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (b.price || 0) - (a.price || 0);
  });

  // ponytail: batch DOM card insertion via DocumentFragment to eliminate layout thrashing
  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const canAfford = appState.profile.coins >= item.price;
    const coinsNeeded = Math.max(0, item.price - appState.profile.coins);
    const durationMins = extractRewardDuration(item);
    const rawTier = (item.tier || 'rare').toLowerCase();
    const card = document.createElement('div');
    card.dataset.rewardId = item.id;
    card.className = `rpg-card rpg-panel quest-card-compact reward-card-tier-${rawTier} p-3.5 sm:p-4 flex items-center justify-between transition-all duration-300 relative cursor-pointer hover:shadow-md`;

    const tierColors = REWARD_TIER_COLORS;
    const tierLabels = REWARD_TIER_LABELS;

    card.innerHTML = `
      <!-- Left: Icon Box -->
      <div class="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl shadow-xs shrink-0">
        ${escapeHtml(item.icon || '🎁')}
      </div>

      <!-- Center: Title & Description -->
      <div class="flex-1 min-w-0 mx-3 sm:mx-4 flex flex-col justify-center gap-1.5">
        <div class="flex items-center gap-2 min-w-0">
          <h3 class="font-bold text-sm sm:text-base leading-snug truncate text-slate-900 dark:text-slate-100">${escapeHtml(item.name)}</h3>
        </div>
        ${item.description ? `
          <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 truncate leading-relaxed">${escapeHtml(item.description)}</p>
        ` : ''}
      </div>

      <!-- Right: Price & Duration -->
      <div class="flex flex-col items-end justify-center shrink-0 pl-3 sm:pl-4 gap-1.5 self-center">
        ${durationMins > 0 ? `
          <div class="flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
            <span class="text-xs">⏱️</span>
            <span>${durationMins}p</span>
          </div>
        ` : ''}
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs shadow-xs whitespace-nowrap" title="Giá: ${item.price} Vàng">
          ${COIN_ICON_HTML} <span>${item.price}</span><span class="hidden sm:inline text-[10px] font-medium ml-0.5">Vàng</span>
        </span>
      </div>

      <!-- Hidden Test-Facing Elements Container -->
      <div class="hidden reward-card-internal-controls">
        <p class="reward-desc-text text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed break-words">${escapeHtml(item.description || '')}</p>
        <button type="button" class="btn-toggle-desc hidden text-[11px] font-bold text-purple-600 dark:text-purple-400">...xem thêm</button>
        <button type="button" class="btn-shop-menu" aria-label="Tùy chọn thao tác">
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
        </button>
        <div class="shop-dropdown-menu quest-dropdown-menu hidden">
          <div class="quest-dropdown-item hidden" aria-hidden="true">
            <span>Phân cấp:</span>
            <span class="${tierColors[rawTier] || tierColors.rare}">${tierLabels[rawTier] || (item.tier || 'CAO CẤP').toUpperCase()}</span>
          </div>
          <button type="button" class="btn-debate-shop-item quest-dropdown-item cursor-pointer">
            <span>Thương lượng AI</span>
          </button>
          <button type="button" class="btn-view-shop-freq quest-dropdown-item cursor-pointer">
            <span>Xem biểu đồ tần suất</span>
          </button>
          <button type="button" class="btn-del-shop-item quest-dropdown-item cursor-pointer">
            <span>Xóa phần thưởng</span>
          </button>
        </div>
        <button class="btn-buy-item py-2 px-3 rounded-lg text-xs font-semibold">
          <span>${canAfford ? (durationMins > 0 ? `Đổi & Bấm Giờ (${durationMins}p)` : 'Đổi Quà Ngay') : 'Chưa Đủ Vàng'}</span>
        </button>
      </div>
    `;

    // Null-guarded button queries (test-facing, functional in modal)
    const delShopBtn = card.querySelector('.btn-del-shop-item');
    if (delShopBtn) {
      delShopBtn.addEventListener('click', (e) => { e.stopPropagation(); closeModal('modal-reward-detail'); deleteShopItem(item.id); });
    }
    const buyItemBtn = card.querySelector('.btn-buy-item');
    if (buyItemBtn) {
      buyItemBtn.addEventListener('click', (e) => { e.stopPropagation(); buyShopItem(item.id); });
    }

    // Card Click: Open Full Detail Modal
    card.addEventListener('click', (e) => {
      openRewardDetailModal(item.id, 'shop');
    });

    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(refreshAllCardDescToggles);
  }
}

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  const empty = document.getElementById('inventory-empty');
  const countBadge = document.getElementById('badge-inventory-count');

  const totalInvCount = Array.isArray(appState.inventory) ? appState.inventory.length : 0;
  if (countBadge) countBadge.textContent = totalInvCount;
  updateRewardsNavBadge();

  if (appState.inventory.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = '';

  // Sắp xếp Kho Quà: Đang dùng ghim đầu, Chưa dùng xếp trước Đã dùng, Quà chưa dùng xếp Tier cao -> thấp
  let invItems = [...appState.inventory];
  const tierScores = { legendary: 4, epic: 3, rare: 2, common: 1 };
  invItems.sort((a, b) => {
    const aActive = (activeRewardItem && activeRewardItem.id === a.id) ? 1 : 0;
    const bActive = (activeRewardItem && activeRewardItem.id === b.id) ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;

    const aUsed = a.isUsed ? 1 : 0;
    const bUsed = b.isUsed ? 1 : 0;
    if (aUsed !== bUsed) return aUsed - bUsed;

    if (!a.isUsed && !b.isUsed) {
      const scoreA = tierScores[(a.tier || 'rare').toLowerCase()] ?? 1;
      const scoreB = tierScores[(b.tier || 'rare').toLowerCase()] ?? 1;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (b.price || 0) - (a.price || 0);
    }
    return (b.purchasedAt || 0) - (a.purchasedAt || 0);
  });

  // ponytail: batch DOM card insertion via DocumentFragment to eliminate layout thrashing
  const fragment = document.createDocumentFragment();
  invItems.forEach(item => {
    const isThisActiveReward = Boolean(activeRewardItem && activeRewardItem.id === item.id);
    const hasSavedTimer = Boolean(item.savedTimer && item.savedTimer.remainingSeconds > 0);
    const durationMins = extractRewardDuration(item);
    const rawTier = (item.tier || 'rare').toLowerCase();
    const canUndo = isThisActiveReward || (item.isUsed && item.usedAt && (Date.now() - item.usedAt <= 5 * 60 * 1000));
    const card = document.createElement('div');
    card.dataset.rewardId = item.id;
    card.className = `rpg-card rpg-panel quest-card-compact reward-card-tier-${rawTier} ${
      isThisActiveReward
        ? 'ring-2 ring-purple-500 shadow-xl shadow-purple-500/20 bg-purple-500/5 border-purple-500/50'
        : (hasSavedTimer
          ? 'ring-2 ring-sky-500/60 shadow-md shadow-sky-500/15 bg-sky-500/5 border-sky-500/40'
          : (item.isUsed ? 'opacity-65 bg-slate-100/50 dark:bg-slate-950/30' : ''))
    } p-3.5 sm:p-4 flex items-center justify-between transition-all duration-300 relative cursor-pointer hover:shadow-md`;

    card.innerHTML = `
      <!-- Left: Icon Box -->
      <div class="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl shadow-xs shrink-0 ${item.isUsed && !isThisActiveReward && !hasSavedTimer ? 'opacity-60 grayscale' : ''}">
        ${escapeHtml(item.icon || '🎁')}
      </div>

      <!-- Center: Title, Description & Status Badge -->
      <div class="flex-1 min-w-0 mx-3 sm:mx-4 flex flex-col justify-center gap-1.5">
        <div class="flex items-center gap-2 min-w-0">
          <h3 class="font-bold text-sm sm:text-base leading-snug truncate ${(item.isUsed && !isThisActiveReward && !hasSavedTimer) ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}">${escapeHtml(item.name)}</h3>
          ${isThisActiveReward ? `
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-purple-600 text-white shadow-xs animate-pulse shrink-0">
              ĐANG DÙNG
            </span>
          ` : hasSavedTimer ? `
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-sky-500 text-white shadow-xs shrink-0" title="Thời gian đang được bảo lưu">
              ⏸️ BẢO LƯU (${Math.ceil(item.savedTimer.remainingSeconds / 60)}P)
            </span>
          ` : item.isUsed ? `
            <span class="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shrink-0">
              ĐÃ DÙNG
            </span>
          ` : ''}
        </div>
        ${item.description ? `
          <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 truncate leading-relaxed">${escapeHtml(item.description)}</p>
        ` : ''}
      </div>

      <!-- Right: Value & Duration -->
      <div class="flex flex-col items-end justify-center shrink-0 pl-3 sm:pl-4 gap-1.5 self-center">
        ${durationMins > 0 ? `
          <div class="flex items-center gap-1 text-[11px] font-bold ${hasSavedTimer ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'} whitespace-nowrap">
            <span class="text-xs">⏱️</span>
            <span>${hasSavedTimer ? `${Math.ceil(item.savedTimer.remainingSeconds / 60)}p` : `${durationMins}p`}</span>
          </div>
        ` : ''}
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs shadow-xs whitespace-nowrap" title="Trị giá: ${item.price} Vàng">
          ${COIN_ICON_HTML} <span>${item.price}</span><span class="hidden sm:inline text-[10px] font-medium ml-0.5">Vàng</span>
        </span>
      </div>

      <!-- Hidden Test-Facing Elements Container -->
      <div class="hidden reward-card-internal-controls">
        <p class="reward-desc-text text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed break-words">${escapeHtml(item.description || '')}</p>
        <button type="button" class="btn-toggle-desc hidden text-[11px] font-bold text-purple-600 dark:text-purple-400">...xem thêm</button>
        <button type="button" class="btn-inv-menu" aria-label="Tùy chọn thao tác">
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
        </button>
        <div class="inv-dropdown-menu quest-dropdown-menu hidden">
          <div class="quest-dropdown-item hidden" aria-hidden="true">
            <span>Phân cấp:</span>
            <span class="${REWARD_TIER_COLORS[rawTier] || REWARD_TIER_COLORS.rare}">${REWARD_TIER_LABELS[rawTier] || (item.tier || 'CAO CẤP').toUpperCase()}</span>
          </div>
          ${hasSavedTimer ? `
            <button type="button" class="btn-clear-saved-reward quest-dropdown-item cursor-pointer">
              <span>Kết thúc quà (Hủy bảo lưu)</span>
            </button>
          ` : (!item.isUsed ? `
            <button type="button" class="btn-refund-inv quest-dropdown-item cursor-pointer">
              <span>Trả quà nhận lại Vàng</span>
            </button>
          ` : (canUndo ? `
            <button type="button" class="btn-undo-inv quest-dropdown-item cursor-pointer">
              <span>Hoàn tác (Đánh dấu chưa dùng)</span>
            </button>
          ` : ''))}
          <button type="button" class="btn-del-inv quest-dropdown-item cursor-pointer">
            <span>Xóa khỏi kho</span>
          </button>
        </div>
        ${isThisActiveReward ? `
          <button class="btn-scroll-timer py-2 px-3 rounded-lg text-xs font-semibold">
            <span>${isFocusRunning ? 'Đang Đếm Giờ' : 'Tạm Dừng'}</span>
          </button>
          <button class="btn-undo-inv py-2 px-3 rounded-lg text-xs font-semibold">
            <span>Hoàn tác</span>
          </button>
        ` : hasSavedTimer ? `
          <button class="btn-use-inv py-2 px-3 rounded-lg text-xs font-semibold">
            <span>Tiếp Tục Dùng (${Math.ceil(item.savedTimer.remainingSeconds / 60)}p)</span>
          </button>
          <button class="btn-clear-saved-reward py-2 px-3 rounded-lg text-xs font-semibold">
            <span>Kết thúc</span>
          </button>
        ` : item.isUsed ? `
          ${canUndo ? `
            <button class="btn-undo-inv py-2 px-3 rounded-lg text-xs font-semibold">
              <span>Hoàn tác</span>
            </button>
          ` : ''}
        ` : `
          <button class="btn-use-inv py-2 px-3 rounded-lg text-xs font-semibold">
            <span>${durationMins > 0 ? `Dùng Quà (${durationMins}p)` : 'Dùng Quà'}</span>
          </button>
        `}
      </div>
    `;

    // Card Click: Open Full Detail Modal
    card.addEventListener('click', (e) => {
      openRewardDetailModal(item.id, 'inventory');
    });

    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(refreshAllCardDescToggles);
  }
}

// ──────────────────────────────────────────────────────────────────
// openRewardDetailModal(itemId, source) — Full Detail Modal for Rewards
// Mirrors the structure and UX of openQuestDetailModal()
// source: 'shop' | 'inventory'
// ──────────────────────────────────────────────────────────────────
function openRewardDetailModal(itemId, source) {
  const isShop = source === 'shop';
  const item = isShop
    ? appState.shopItems.find(x => x.id === itemId)
    : appState.inventory.find(x => x.id === itemId);
  if (!item) return;

  const modal = document.getElementById('modal-reward-detail');
  if (!modal) return;

  const rawTier = (item.tier || 'rare').toLowerCase();
  const durationMins = extractRewardDuration(item);
  const isThisActiveReward = !isShop && Boolean(activeRewardItem && activeRewardItem.id === item.id);
  const hasSavedTimer = !isShop && Boolean(item.savedTimer && item.savedTimer.remainingSeconds > 0);
  const canAfford = isShop ? appState.profile.coins >= item.price : false;
  const coinsNeeded = isShop ? Math.max(0, item.price - appState.profile.coins) : 0;
  const canUndo = !isShop && (isThisActiveReward || (item.isUsed && item.usedAt && (Date.now() - item.usedAt <= 5 * 60 * 1000)));

  const tierColorMap = { common: 'bg-purple-100 text-purple-600 border-purple-200', rare: 'bg-purple-200 text-purple-700 border-purple-300', epic: 'bg-purple-300 text-purple-800 border-purple-400', legendary: 'bg-purple-400 text-purple-900 border-purple-500' };
  const tierLabelMap = REWARD_TIER_LABELS;

  // 1. Header
  const banner = document.getElementById('mrd-header-banner');
  if (banner) {
    banner.className = 'p-5 sm:p-6 transition-colors flex items-center justify-between gap-3.5 shrink-0 relative bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800';
  }

  const iconEl = document.getElementById('mrd-icon');
  if (iconEl) iconEl.textContent = item.icon || '🎁';

  const titleEl = document.getElementById('mrd-title');
  if (titleEl) titleEl.textContent = item.name;

  const tierBadge = document.getElementById('mrd-tier-badge');
  if (tierBadge) {
    tierBadge.textContent = tierLabelMap[rawTier] || (item.tier || 'CAO CẤP').toUpperCase();
    tierBadge.className = `inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${tierColorMap[rawTier] || tierColorMap.rare}`;
  }

  // 2. Price / Value Strip
  const priceLabel = document.getElementById('mrd-price-label');
  if (priceLabel) priceLabel.textContent = isShop ? 'Giá đổi phần thưởng' : 'Trị giá phần thưởng';

  const priceValue = document.getElementById('mrd-price-value');
  if (priceValue) priceValue.textContent = `${item.price} Vàng`;

  const affordability = document.getElementById('mrd-affordability');
  if (affordability) {
    if (isShop) {
      affordability.innerHTML = canAfford
        ? `<span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>Đủ Vàng</span>`
        : `<span class="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">Thiếu ${coinsNeeded} Vàng</span>`;
    } else {
      affordability.innerHTML = '';
    }
  }

  // 3. Description
  const descEl = document.getElementById('mrd-desc');
  if (descEl) descEl.textContent = item.description || 'Không có mô tả chi tiết.';

  // 4. Meta Badges
  const metaBadges = document.getElementById('mrd-meta-badges');
  if (metaBadges) {
    const badges = [];

    // Tier Badge
    badges.push(`
      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border ${tierColorMap[rawTier] || tierColorMap.rare}">
        🏷️ ${tierLabelMap[rawTier] || 'Cao cấp'}
      </span>
    `);

    // Duration
    if (durationMins > 0) {
      badges.push(`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          ⏱️ ${durationMins} phút
        </span>
      `);
    } else {
      badges.push(`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700">
          ⚡ Dùng ngay
        </span>
      `);
    }

    // Status (inventory only)
    if (!isShop) {
      if (isThisActiveReward) {
        badges.push(`
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 animate-pulse">
            ▶️ Đang sử dụng
          </span>
        `);
      } else if (hasSavedTimer) {
        badges.push(`
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-300">
            ⏸️ Đang bảo lưu: ${Math.ceil(item.savedTimer.remainingSeconds / 60)}p
          </span>
        `);
      } else if (item.isUsed) {
        badges.push(`
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700">
            ✅ ${durationMins > 0 ? 'Đã kết thúc' : 'Đã sử dụng'}
          </span>
        `);
      } else {
        badges.push(`
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            🎁 Chưa sử dụng
          </span>
        `);
      }

      // Purchase date
      if (item.purchasedAt) {
        badges.push(`
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700">
            📅 Đã đổi: ${new Date(item.purchasedAt).toLocaleDateString()}
          </span>
        `);
      }
    }

    metaBadges.innerHTML = badges.join('');
  }

  // 5. Primary Action Button
  const primaryActionContainer = document.getElementById('mrd-primary-action-container');
  if (primaryActionContainer) {
    if (isShop) {
      // SHOP: Buy button
      primaryActionContainer.innerHTML = `
        <button id="mrd-btn-buy" type="button" class="w-full py-3 px-4 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${canAfford ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}" ${canAfford ? '' : 'disabled'}>
          ${canAfford ? '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' : ''}
          <span>${canAfford ? (durationMins > 0 ? `Đổi & Bấm Giờ (${durationMins}p) 🎁` : 'Đổi Quà Ngay 🎁') : `Chưa Đủ Vàng (thiếu ${coinsNeeded})`}</span>
        </button>
      `;
      document.getElementById('mrd-btn-buy')?.addEventListener('click', () => {
        closeModal('modal-reward-detail');
        buyShopItem(item.id);
      });
    } else if (isThisActiveReward) {
      // INVENTORY: Active reward — show timer + undo
      primaryActionContainer.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="mrd-btn-scroll-timer" type="button" class="flex-1 py-3 px-4 rounded-2xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center justify-center gap-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
            <span>${isFocusRunning ? 'Xem Đồng Hồ ⏱️' : 'Tạm Dừng ⏸️'}</span>
          </button>
          <button id="mrd-btn-undo" type="button" class="py-3 px-3.5 rounded-2xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition flex items-center justify-center gap-1 cursor-pointer">
            <span>Hoàn tác</span>
          </button>
        </div>
      `;
      document.getElementById('mrd-btn-scroll-timer')?.addEventListener('click', () => {
        closeModal('modal-reward-detail');
        document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      document.getElementById('mrd-btn-undo')?.addEventListener('click', () => {
        closeModal('modal-reward-detail');
        undoUseInventoryItem(item.id);
      });
    } else if (hasSavedTimer) {
      // INVENTORY: Saved timer — resume or end
      primaryActionContainer.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="mrd-btn-resume" type="button" class="flex-1 py-3 px-4 rounded-2xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition flex items-center justify-center gap-2 shadow-md cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Tiếp Tục Dùng (${Math.ceil(item.savedTimer.remainingSeconds / 60)}p) ▶️</span>
          </button>
          <button id="mrd-btn-end-saved" type="button" class="py-3 px-3.5 rounded-2xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-400 transition flex items-center justify-center gap-1 cursor-pointer">
            <span>⏹️ Kết thúc</span>
          </button>
        </div>
      `;
      document.getElementById('mrd-btn-resume')?.addEventListener('click', () => {
        closeModal('modal-reward-detail');
        useInventoryItem(item.id);
      });
      document.getElementById('mrd-btn-end-saved')?.addEventListener('click', () => {
        closeModal('modal-reward-detail');
        clearSavedRewardTimer(item.id);
      });
    } else if (!isShop && item.isUsed) {
      // INVENTORY: Used item — undo if within window
      if (canUndo) {
        primaryActionContainer.innerHTML = `
          <button id="mrd-btn-undo-used" type="button" class="w-full py-3 px-4 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-md cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
            <span>Hoàn Tác (Đánh dấu chưa dùng)</span>
          </button>
        `;
        document.getElementById('mrd-btn-undo-used')?.addEventListener('click', () => {
          closeModal('modal-reward-detail');
          undoUseInventoryItem(item.id);
        });
      } else {
        primaryActionContainer.innerHTML = `
          <div class="text-center py-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <span>✅ ${durationMins > 0 ? 'Đã kết thúc sử dụng' : 'Đã sử dụng xong'}</span>
          </div>
        `;
      }
    } else {
      // INVENTORY: Unused — use now
      primaryActionContainer.innerHTML = `
        <button id="mrd-btn-use" type="button" class="w-full py-3 px-4 rounded-2xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-md cursor-pointer">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span>${durationMins > 0 ? `Dùng Quà & Bấm Giờ (${durationMins}p) 🎉` : 'Dùng Quà Ngay 🎉'}</span>
        </button>
      `;
      document.getElementById('mrd-btn-use')?.addEventListener('click', () => {
        closeModal('modal-reward-detail');
        useInventoryItem(item.id);
      });
    }
  }

  // 6. Secondary Actions Grid (2x2)
  const secondaryGrid = document.getElementById('mrd-secondary-grid');
  if (secondaryGrid) {
    const buttons = [];

    if (isShop) {
      // Shop: Debate, Frequency, Delete
      buttons.push(`
        <button id="mrd-btn-debate" type="button" class="py-2.5 px-3 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98">
          <span>💬</span><span>Thương lượng</span>
        </button>
      `);
      buttons.push(`
        <button id="mrd-btn-freq" type="button" class="py-2.5 px-3 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98">
          <span>📊</span><span>Xem tần suất</span>
        </button>
      `);
      buttons.push(`
        <button id="mrd-btn-delete" type="button" class="col-span-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98">
          <span>🗑️</span><span>Xóa phần thưởng</span>
        </button>
      `);
    } else {
      // Inventory: Refund/Undo, Delete
      if (!item.isUsed && !isThisActiveReward && !hasSavedTimer) {
        buttons.push(`
          <button id="mrd-btn-refund" type="button" class="py-2.5 px-3 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98">
            <span>↩️</span><span>Trả quà lấy Vàng</span>
          </button>
        `);
      }
      buttons.push(`
        <button id="mrd-btn-delete" type="button" class="py-2.5 px-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98">
          <span>🗑️</span><span>Xóa khỏi kho</span>
        </button>
      `);
    }

    secondaryGrid.innerHTML = buttons.join('');

    // Wire up secondary actions
    document.getElementById('mrd-btn-debate')?.addEventListener('click', () => {
      closeModal('modal-reward-detail');
      openRewardRenegotiateModal(item.id);
    });
    document.getElementById('mrd-btn-freq')?.addEventListener('click', () => {
      closeModal('modal-reward-detail');
      openItemFrequencyModal(item, isShop);
    });
    document.getElementById('mrd-btn-refund')?.addEventListener('click', () => {
      closeModal('modal-reward-detail');
      refundInventoryItem(item.id);
    });
    document.getElementById('mrd-btn-delete')?.addEventListener('click', async () => {
      closeModal('modal-reward-detail');
      if (isShop) {
        deleteShopItem(item.id);
      } else {
        deleteInventoryItem(item.id);
      }
    });
  }

  modal.classList.remove('hidden');
}
window.openRewardDetailModal = openRewardDetailModal;

function addLedgerEntry(entry) {
  if (!Array.isArray(appState.ledger)) appState.ledger = [];
  appState.ledger.unshift(entry);
  // ponytail: Giới hạn 100 bản ghi để giữ payload đồng bộ < 50KB và tránh đầy localStorage
  if (appState.ledger.length > 100) {
    appState.ledger = appState.ledger.slice(0, 100);
  }
}

let currentLedgerFilter = 'all';
let currentLedgerPage = 1;
const LEDGER_PAGE_SIZE = 10; // ponytail: Cố định 10 giao dịch/trang, nâng cấp dropdown chọn page size nếu người dùng yêu cầu

function changeLedgerPage(delta) {
  currentLedgerPage += delta;
  renderLedger();
}
window.changeLedgerPage = changeLedgerPage;

function setLedgerFilter(filter) {
  currentLedgerFilter = filter;
  currentLedgerPage = 1;
  const filterBtns = {
    all: document.getElementById('ledger-filter-all'),
    earn: document.getElementById('ledger-filter-earn'),
    spend: document.getElementById('ledger-filter-spend'),
    bank: document.getElementById('ledger-filter-bank')
  };
  Object.entries(filterBtns).forEach(([k, btn]) => {
    if (!btn) return;
    if (k === filter) {
      btn.className = 'ledger-filter-btn px-3 py-1 rounded-xl text-xs font-bold transition bg-sky-500 text-white shadow-xs shadow-sky-500/20 cursor-pointer';
    } else {
      btn.className = 'ledger-filter-btn px-3 py-1 rounded-xl text-xs font-semibold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer';
    }
  });
  renderLedger();
}
window.setLedgerFilter = setLedgerFilter;

let currentLedgerSubtab = 'transactions';

function switchLedgerSubtab(subtab) {
  currentLedgerSubtab = subtab;
  const btnTrans = document.getElementById('btn-ledger-subtab-transactions');
  const btnPhotos = document.getElementById('btn-ledger-subtab-photos');
  const viewTrans = document.getElementById('view-ledger-transactions');
  const viewPhotos = document.getElementById('view-ledger-photos');

  if (subtab === 'photos') {
    if (btnTrans) {
      btnTrans.className = 'flex-1 py-1.5 sm:py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer';
    }
    if (btnPhotos) {
      btnPhotos.className = 'flex-1 py-1.5 sm:py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs cursor-pointer';
    }
    if (viewTrans) viewTrans.classList.add('hidden');
    if (viewPhotos) viewPhotos.classList.remove('hidden');
    renderProofPhotos();
  } else {
    if (btnTrans) {
      btnTrans.className = 'flex-1 py-1.5 sm:py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs cursor-pointer';
    }
    if (btnPhotos) {
      btnPhotos.className = 'flex-1 py-1.5 sm:py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer';
    }
    if (viewTrans) viewTrans.classList.remove('hidden');
    if (viewPhotos) viewPhotos.classList.add('hidden');
    renderLedger();
  }
}
window.switchLedgerSubtab = switchLedgerSubtab;

function getAllProofPhotos() {
  const photos = [];
  const seenUrls = new Set();

  // 1. From appState.proofPhotos
  if (Array.isArray(appState.proofPhotos)) {
    for (const p of appState.proofPhotos) {
      if (p && p.proofImageUrl && !seenUrls.has(p.proofImageUrl)) {
        seenUrls.add(p.proofImageUrl);
        photos.push({
          id: p.id || ('proof_' + (p.timestamp || Date.now())),
          questId: p.questId || '',
          questTitle: p.questTitle || 'Nhiệm vụ',
          proofImageUrl: p.proofImageUrl,
          rewardCoins: p.rewardCoins || 10,
          timestamp: p.timestamp || Date.now(),
          userNote: p.userNote || '',
          feedback: p.feedback || ''
        });
      }
    }
  }

  // 2. From appState.ledger
  if (Array.isArray(appState.ledger)) {
    for (const entry of appState.ledger) {
      if (entry && entry.proofImageUrl && !seenUrls.has(entry.proofImageUrl)) {
        seenUrls.add(entry.proofImageUrl);
        photos.push({
          id: 'proof_' + (entry.id || entry.timestamp || Date.now()),
          questId: entry.questId || '',
          questTitle: entry.title || 'Nhiệm vụ',
          proofImageUrl: entry.proofImageUrl,
          rewardCoins: entry.amount || 10,
          timestamp: entry.timestamp || Date.now(),
          userNote: entry.proofUserNote || entry.userNote || '',
          feedback: entry.proofFeedback || entry.feedback || ''
        });
      }
    }
  }

  // 3. From appState.quests (legacy fallback)
  if (Array.isArray(appState.quests)) {
    for (const q of appState.quests) {
      if (q && q.proofImageUrl && !seenUrls.has(q.proofImageUrl)) {
        seenUrls.add(q.proofImageUrl);
        photos.push({
          id: 'proof_' + q.id,
          questId: q.id,
          questTitle: q.title,
          proofImageUrl: q.proofImageUrl,
          rewardCoins: q.rewardCoins || 10,
          timestamp: q.createdAt || Date.now(),
          userNote: q.proofUserNote || q.userNote || '',
          feedback: q.proofFeedback || q.feedback || ''
        });
      }
    }
  }

  photos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return photos;
}
window.getAllProofPhotos = getAllProofPhotos;

function renderProofPhotos() {
  const grid = document.getElementById('ledger-photos-grid');
  const empty = document.getElementById('ledger-photos-empty');
  const badge = document.getElementById('ledger-photos-badge');
  const countEl = document.getElementById('ledger-photos-count');

  const photos = getAllProofPhotos();

  if (badge) {
    badge.textContent = photos.length;
  }
  if (countEl) {
    countEl.textContent = photos.length;
  }

  if (!grid) return;

  if (photos.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  grid.innerHTML = photos.map(item => {
    const timeStr = new Date(item.timestamp || Date.now()).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const safeTitle = escapeHtml(item.questTitle || 'Nhiệm vụ đã hoàn thành');
    const safeUrl = escapeHtml(item.proofImageUrl);
    const safeNote = item.userNote ? escapeHtml(item.userNote) : '';
    const safeFeedback = item.feedback ? escapeHtml(item.feedback) : '';

    return `
      <div class="proof-photo-card group rounded-2xl overflow-hidden bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col cursor-pointer" data-proof-id="${escapeHtml(item.id)}" title="Nhấn để xem chi tiết ảnh và ghi chú">
        <div class="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <img src="${safeUrl}" alt="${safeTitle}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy">
          <div class="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-500/90 text-white font-mono text-[10px] font-bold shadow-xs backdrop-blur-xs flex items-center gap-1">
            <span>+${item.rewardCoins || 10}</span> ${COIN_ICON_HTML}
          </div>
          <div class="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold backdrop-blur-[1px]">
            <span class="btn-view-proof-img px-2.5 py-1 rounded-lg bg-sky-500/90 hover:bg-sky-400 text-white flex items-center gap-1 shadow-xs cursor-pointer" data-proof-url="${safeUrl}" data-quest-title="${safeTitle}">
              <span>🔍 Phóng to</span>
            </span>
          </div>
        </div>
        <div class="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
          <div>
            <h4 class="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" title="${safeTitle}">${safeTitle}</h4>
            ${safeNote ? `
              <div class="mt-1.5 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1 leading-snug">
                <span class="shrink-0 text-xs">📝</span>
                <span class="line-clamp-2" title="${safeNote}">${safeNote}</span>
              </div>
            ` : ''}
            ${safeFeedback ? `<p class="text-[10px] text-emerald-600 dark:text-emerald-400 line-clamp-1 mt-1 italic" title="${safeFeedback}">🤖 "${safeFeedback}"</p>` : ''}
          </div>
          <div class="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span class="font-mono">${timeStr}</span>
            <span class="text-sky-600 dark:text-sky-400 font-medium hover:underline">Xem chi tiết ↗</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Gắn sự kiện click mở modal kèm thông tin giải trình người dùng và nhận xét AI
  const cards = grid.querySelectorAll('.proof-photo-card');
  cards.forEach(card => {
    const cardId = card.dataset.proofId;
    const item = photos.find(p => p.id === cardId);
    if (item) {
      card.addEventListener('click', () => {
        openProofViewerModal(
          item.proofImageUrl,
          item.questTitle,
          item.userNote || '',
          item.feedback || '',
          item.timestamp || null
        );
      });
    }
  });
}
window.renderProofPhotos = renderProofPhotos;

function groupLedgerByDate(entries) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  return entries.reduce((groups, item) => {
    const ts = parseInt(item.timestamp, 10) || Date.now();
    const d = new Date(ts).toDateString();
    const label = d === today ? 'Hôm nay' : (d === yesterday ? 'Hôm qua' : new Date(ts).toLocaleDateString('vi-VN'));
    (groups[label] = groups[label] || []).push(item);
    return groups;
  }, {});
}

function renderLedger() {
  // Update photo badge and photo gallery
  const allPhotos = getAllProofPhotos();
  const badge = document.getElementById('ledger-photos-badge');
  if (badge) badge.textContent = allPhotos.length;
  renderProofPhotos();

  const list = document.getElementById('ledger-list');
  if (!list) return;

  // ponytail: Tự động dọn dẹp các bản ghi "Khôi phục Danh dự" bị duplicate nếu có trong bộ nhớ
  if (Array.isArray(appState.ledger)) {
    const hasPenalty = (appState.profile?.cheatStrikes || 0) > 0 || appState.ledger.some(l => l.category === 'penalty' || l.id?.startsWith('penalty_'));
    let seenHonor = false;
    appState.ledger = appState.ledger.filter(item => {
      const isHonor = item.title === 'Khôi phục Danh dự' || item.id?.startsWith('honor_restored_');
      if (!isHonor) return true;
      if (!hasPenalty) return false;
      if (seenHonor) return false;
      seenHonor = true;
      return true;
    });
  }

  const ledger = Array.isArray(appState.ledger) ? appState.ledger : [];

  // 1. Cập nhật thống kê nhanh trong ngày & Ngân Hàng
  const todayStr = new Date().toDateString();
  let todayEarn = 0;
  let todaySpend = 0;
  ledger.forEach(e => {
    if (new Date(e.timestamp || 0).toDateString() === todayStr) {
      const amt = Math.max(0, parseInt(e.amount, 10) || 0);
      if (e.type === 'earn') todayEarn += amt;
      else if (e.type === 'spend') todaySpend += amt;
    }
  });

  const earnEl = document.getElementById('ledger-stat-earn');
  const spendEl = document.getElementById('ledger-stat-spend');
  if (earnEl) earnEl.innerHTML = `+${todayEarn} ${COIN_ICON_HTML}`;
  if (spendEl) spendEl.innerHTML = `-${todaySpend} ${COIN_ICON_HTML}`;

  const bankDepositEl = document.getElementById('ledger-stat-bank-deposit');
  const bankDebtEl = document.getElementById('ledger-stat-bank-debt');
  const userBank = appState.profile?.bank || {};
  if (bankDepositEl) {
    const totalSaving = (parseInt(userBank.deposited, 10) || 0) + (parseInt(userBank.depositInterest, 10) || 0);
    bankDepositEl.innerHTML = `${totalSaving} ${COIN_ICON_HTML}`;
  }
  if (bankDebtEl) {
    const currentDebt = parseInt(userBank.loan?.debt, 10) || 0;
    bankDebtEl.innerHTML = `${currentDebt} ${COIN_ICON_HTML}`;
  }

  // 2. Lọc theo danh mục (Tất cả / Thu / Chi / Ngân Hàng)
  const filtered = ledger.filter(e => {
    if (currentLedgerFilter === 'all') return true;
    if (currentLedgerFilter === 'bank') {
      return typeof e.category === 'string' && (e.category.startsWith('bank_') || ['bank_deposit', 'bank_withdraw', 'bank_borrow', 'bank_repay', 'bank_deduct'].includes(e.category));
    }
    return e.type === currentLedgerFilter;
  });
  const paginationEl = document.getElementById('ledger-pagination');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="text-center py-8 text-slate-500 text-xs">Chưa có giao dịch vàng nào được ghi nhận.</div>';
    if (paginationEl) paginationEl.classList.add('hidden');
    return;
  }

  const totalPages = Math.ceil(filtered.length / LEDGER_PAGE_SIZE) || 1;
  if (currentLedgerPage > totalPages) currentLedgerPage = totalPages;
  if (currentLedgerPage < 1) currentLedgerPage = 1;

  const startIdx = (currentLedgerPage - 1) * LEDGER_PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + LEDGER_PAGE_SIZE);

  // 3. Gom nhóm theo ngày và hiển thị
  const grouped = groupLedgerByDate(pageItems);
  list.innerHTML = Object.entries(grouped).map(([dateLabel, items]) => `
    <div>
      <div class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
        <span>📅</span> <span>${dateLabel}</span>
      </div>
      <div class="space-y-2">
        ${items.map(entry => {
          const isEarn = entry.type === 'earn';
          const isBank = typeof entry.category === 'string' && entry.category.startsWith('bank_');

          // ponytail: Phân loại icon và badge trực quan cho giao dịch Ngân Hàng, Nhiệm vụ và Đổi quà
          let icon = isEarn ? '📥' : '📤';
          let categoryBadge = '';
          if (entry.category === 'bank_deposit') {
            icon = '🏦';
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Tiết Kiệm</span>';
          } else if (entry.category === 'bank_withdraw') {
            icon = '💰';
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">Rút Tiền</span>';
          } else if (entry.category === 'bank_borrow') {
            icon = '⚡';
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">Vay Vàng</span>';
          } else if (entry.category === 'bank_repay') {
            icon = '💳';
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">Trả Nợ</span>';
          } else if (entry.category === 'bank_deduct') {
            icon = '✂️';
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400">Trích Nợ</span>';
          } else if (entry.category === 'quest') {
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">Nhiệm Vụ</span>';
          } else if (entry.category === 'reward') {
            categoryBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">Đổi Quà</span>';
          }

          const timeStr = new Date(entry.timestamp || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const displayTitle = entry.title || entry.description || 'Giao dịch';
          const displayDesc = entry.description && entry.description !== entry.title ? entry.description : '';

          return `
            <div class="ledger-item p-3 rounded-xl bg-white dark:bg-slate-900/60 border ${isBank ? 'border-amber-500/20' : 'border-slate-200 dark:border-slate-800'} flex items-start justify-between gap-3 text-xs shadow-xs transition-all">
              <div class="flex items-start gap-2.5 min-w-0 flex-1">
                <span class="text-base shrink-0 mt-0.5">${icon}</span>
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                    ${categoryBadge}
                    <span class="truncate">${escapeHtml(displayTitle)}</span>
                    ${entry.proofImageUrl ? `
                      <button type="button" class="btn-view-proof-img shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-pointer ml-auto" data-proof-url="${escapeHtml(entry.proofImageUrl)}" data-quest-title="${escapeHtml(displayTitle)}" data-user-note="${escapeHtml(entry.proofUserNote || entry.userNote || '')}" data-feedback="${escapeHtml(entry.proofFeedback || entry.feedback || '')}" data-timestamp="${entry.timestamp || 0}" title="Xem ảnh bằng chứng đã duyệt">
                        <span>📸 Xem ảnh</span>
                      </button>
                    ` : ''}
                  </div>
                  <div class="ledger-desc-container mt-0.5">
                    <div class="ledger-desc-content text-[10px] text-slate-400 truncate cursor-pointer transition-colors hover:text-slate-600 dark:hover:text-slate-300" title="Nhấn để xem thêm / thu gọn">
                      <span class="font-mono">${timeStr}</span>${displayDesc ? ` · <span class="ledger-desc-text">${escapeHtml(displayDesc)}</span>` : ''}
                    </div>
                    ${displayDesc ? `<button type="button" class="btn-toggle-ledger-desc hidden text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer block mt-0.5">...xem thêm</button>` : ''}
                  </div>
                </div>
              </div>
              <div class="font-mono font-bold text-sm shrink-0 inline-flex items-center gap-1 ${isEarn ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'} pt-0.5">
                <span>${isEarn ? '+' : '-'}${entry.amount || 0}</span> ${COIN_ICON_HTML}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  // Gắn sự kiện click mở modal cho các nút xem ảnh trên giao dịch sổ cái
  const viewProofBtns = list.querySelectorAll('.btn-view-proof-img');
  viewProofBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openProofViewerModal(
        btn.dataset.proofUrl,
        btn.dataset.questTitle,
        btn.dataset.userNote || '',
        btn.dataset.feedback || '',
        btn.dataset.timestamp ? Number(btn.dataset.timestamp) : null
      );
    });
  });

  // 4. Cập nhật thanh phân trang
  if (paginationEl) {
    if (totalPages <= 1) {
      paginationEl.classList.add('hidden');
    } else {
      paginationEl.classList.remove('hidden');
      const prevBtn = document.getElementById('ledger-prev-btn');
      const nextBtn = document.getElementById('ledger-next-btn');
      const pageInfo = document.getElementById('ledger-page-info');
      if (prevBtn) prevBtn.disabled = currentLedgerPage <= 1;
      if (nextBtn) nextBtn.disabled = currentLedgerPage >= totalPages;
      if (pageInfo) pageInfo.textContent = `Trang ${currentLedgerPage} / ${totalPages} (${filtered.length} giao dịch)`;
    }
  }

  // 5. Kích hoạt cơ chế Xem thêm / Thu gọn cho các thẻ lịch sử
  setupLedgerDescToggles();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(setupLedgerDescToggles);
  }
}

/**
 * Tự động đo đạc và quản lý nút "...xem thêm" / "Thu gọn ▲" cho thẻ Lịch sử (Ledger).
 * Mặc định: 1 dòng (truncate).
 * Chỉ hiện nút toggle khi nội dung vượt quá 1 dòng trên màn hình thiết bị.
 * Cho phép nhấn nút toggle hoặc nhấn trực tiếp vào dòng mô tả để mở rộng / thu gọn.
 */
function setupLedgerDescToggles() {
  const list = document.getElementById('ledger-list');
  if (!list) return;
  const items = list.querySelectorAll('.ledger-item');
  items.forEach(item => {
    const descContent = item.querySelector('.ledger-desc-content');
    const toggleBtn = item.querySelector('.btn-toggle-ledger-desc');
    if (!descContent || !toggleBtn) return;

    const checkOverflow = () => {
      if (descContent.classList.contains('expanded')) return;
      const isVisible = descContent.clientWidth > 0;
      // Tràn khi độ rộng thực tế vượt quá độ rộng nhìn thấy (dung sai 1px cho subpixel rendering),
      // hoặc nếu tab đang ẩn thì dựa vào độ dài ký tự (> 35 ký tự)
      const isOverflowing = isVisible
        ? (descContent.scrollWidth > descContent.clientWidth + 1)
        : (descContent.textContent.trim().length > 35);

      if (isOverflowing) {
        toggleBtn.classList.remove('hidden');
      } else {
        toggleBtn.classList.add('hidden');
      }
    };

    if (!item.dataset.toggleBound) {
      item.dataset.toggleBound = 'true';
      const toggleExpand = (e) => {
        if (e) e.stopPropagation();
        const isExpanded = descContent.classList.contains('expanded');
        if (isExpanded) {
          descContent.classList.remove('expanded');
          descContent.classList.add('truncate');
          toggleBtn.textContent = '...xem thêm';
        } else {
          descContent.classList.remove('truncate');
          descContent.classList.add('expanded');
          toggleBtn.textContent = 'Thu gọn ▲';
        }
      };

      toggleBtn.addEventListener('click', toggleExpand);
      descContent.addEventListener('click', (e) => {
        if (!toggleBtn.classList.contains('hidden')) {
          toggleExpand(e);
        }
      });
    }

    checkOverflow();
  });
}
window.setupLedgerDescToggles = setupLedgerDescToggles;

function renderAll() {
  if (typeof backfillItemHistories === 'function') {
    backfillItemHistories();
  }
  renderHeader();
  renderQuests();
  renderShop();
  renderInventory();
  renderLedger();
  updateAdminNavVisibility();
}

function renderSkeletons() {
  const heroAvatar = document.getElementById('hero-avatar');
  const heroNick = document.getElementById('hero-nickname');
  const heroTitle = document.getElementById('hero-title');
  const heroLvl = document.getElementById('hero-level-badge');
  const heroExp = document.getElementById('hero-exp-text');
  const heroCoins = document.getElementById('hero-coins');

  if (heroAvatar) heroAvatar.innerHTML = '<div class="w-full h-full bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg"></div>';
  if (heroNick) heroNick.innerHTML = '<span class="inline-block w-16 h-3.5 bg-slate-200 dark:bg-slate-700 animate-pulse rounded"></span>';
  if (heroTitle) heroTitle.innerHTML = '<span class="inline-block w-20 h-2.5 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></span>';
  if (heroLvl) heroLvl.innerHTML = '<span class="inline-block w-8 h-3.5 bg-slate-200 dark:bg-slate-700 animate-pulse rounded"></span>';
  if (heroExp) heroExp.innerHTML = '<span class="inline-block w-10 h-2.5 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></span>';
  if (heroCoins) heroCoins.innerHTML = '<span class="inline-block w-8 h-4 bg-slate-200 dark:bg-slate-700 animate-pulse rounded"></span>';

  // ponytail: Khởi tạo skeleton cards chuẩn cấu trúc RPG Card để chống chớp nháy và lệch layout (Anti-FOUC)
  const questSkeletonCard = `
    <div class="rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between animate-pulse min-h-[220px]">
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="h-6 w-16 bg-slate-200 dark:bg-slate-800/80 rounded-lg"></div>
          <div class="h-6 w-20 bg-slate-200 dark:bg-slate-800/80 rounded-lg"></div>
        </div>
        <div class="space-y-2 my-2">
          <div class="h-5 w-4/5 bg-slate-200 dark:bg-slate-800/80 rounded-md"></div>
          <div class="h-3.5 w-full bg-slate-100 dark:bg-slate-800/50 rounded"></div>
          <div class="h-3.5 w-2/3 bg-slate-100 dark:bg-slate-800/50 rounded"></div>
        </div>
      </div>
      <div>
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <div class="h-4 w-24 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
          <div class="h-4 w-12 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
        </div>
        <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
          <div class="h-9 flex-1 bg-slate-200 dark:bg-slate-800/80 rounded-xl"></div>
          <div class="h-9 flex-1 bg-slate-200 dark:bg-slate-800/80 rounded-xl"></div>
        </div>
      </div>
    </div>
  `;

  const questsGrid = document.getElementById('quests-grid') || document.getElementById('quest-list');
  const questsEmpty = document.getElementById('quests-empty');
  if (questsEmpty) questsEmpty.classList.add('hidden');
  if (questsGrid) {
    questsGrid.innerHTML = Array(6).fill(questSkeletonCard).join('');
  }

  const shopSkeletonCard = `
    <div class="rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between animate-pulse min-h-[220px]">
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="h-6 w-16 bg-slate-200 dark:bg-slate-800/80 rounded-lg"></div>
          <div class="h-6 w-20 bg-slate-200 dark:bg-slate-800/80 rounded-lg"></div>
        </div>
        <div class="flex items-start gap-3 my-2">
          <div class="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800/80 shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="h-5 w-4/5 bg-slate-200 dark:bg-slate-800/80 rounded-md"></div>
            <div class="h-3.5 w-full bg-slate-100 dark:bg-slate-800/50 rounded"></div>
          </div>
        </div>
      </div>
      <div>
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <div class="h-4 w-28 bg-slate-200 dark:bg-slate-800/60 rounded"></div>
        </div>
        <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800">
          <div class="h-9 w-full bg-slate-200 dark:bg-slate-800/80 rounded-xl"></div>
        </div>
      </div>
    </div>
  `;

  const shopGrid = document.getElementById('shop-grid') || document.getElementById('shop-list');
  const shopEmpty = document.getElementById('shop-empty');
  if (shopEmpty) shopEmpty.classList.add('hidden');
  if (shopGrid) {
    shopGrid.innerHTML = Array(6).fill(shopSkeletonCard).join('');
  }

  const inventoryGrid = document.getElementById('inventory-grid');
  const inventoryEmpty = document.getElementById('inventory-empty');
  if (inventoryEmpty) inventoryEmpty.classList.add('hidden');
  if (inventoryGrid) {
    inventoryGrid.innerHTML = Array(3).fill(shopSkeletonCard).join('');
  }

  const ledgerList = document.getElementById('ledger-list');
  if (ledgerList) {
    ledgerList.innerHTML = Array(3).fill(0).map(() => `
      <div class="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-pulse flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          <div class="space-y-1.5">
            <div class="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div class="h-2.5 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
        </div>
        <div class="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>
    `).join('');
  }

  const earnEl = document.getElementById('ledger-stat-earn');
  const spendEl = document.getElementById('ledger-stat-spend');
  if (earnEl) earnEl.innerHTML = '<span class="inline-block w-12 h-4 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></span>';
  if (spendEl) spendEl.innerHTML = '<span class="inline-block w-12 h-4 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></span>';
}

// =============================================================================
// 13. FREQUENCY TRACKER & HABIT HEATMAP
// =============================================================================
let currentTrackerPeriod = 'monthly';
let currentTrackerCategory = 'quests';

let currentModalFreqItem = null;
let currentModalFreqIsQuest = true;
let currentModalFreqPeriod = 'monthly';

function renderHeatmapGridHTML(item, period = 'monthly', isQuest = true) {
  const gridData = getFrequencyGridData(item.history || {}, period);
  const colorClass = isQuest
    ? 'bg-emerald-500 shadow-xs shadow-emerald-500/30'
    : 'bg-sky-500 shadow-xs shadow-sky-500/30';
  const colorMultiClass = isQuest
    ? 'bg-emerald-600 dark:bg-emerald-400 shadow-xs shadow-emerald-500/50'
    : 'bg-sky-600 dark:bg-sky-400 shadow-xs shadow-sky-500/50';

  let cellsHtml = '';

  if (period === 'yearly') {
    // 7 rows x 52-53 cols (Mon = Row 0, Sun = Row 6)
    for (let i = 0; i < gridData.padStart; i++) {
      cellsHtml += `<div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] opacity-0 pointer-events-none"></div>`;
    }

    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    gridData.days.forEach(d => {
      let bg = 'bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700';
      if (d.count === 1) bg = colorClass;
      else if (d.count >= 2) bg = colorMultiClass;
      else if (d.isFuture) bg = 'bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/30';

      const todayRing = d.isToday ? 'ring-1.5 ring-amber-400 dark:ring-amber-300 ring-offset-1 dark:ring-offset-slate-950 z-10' : '';
      const dayLabel = dayNames[d.dayOfWeek] || '';
      const tooltip = `${dayLabel}, ${d.dateStr}: ${d.count > 0 ? (isQuest ? `Đã hoàn thành ${d.count} lần` : `Đã đổi ${d.count} lần`) : (d.isFuture ? 'Chưa tới' : 'Chưa thực hiện')}`;

      cellsHtml += `<div class="heatmap-cell w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] ${bg} ${todayRing} transition-all hover:scale-150 active:scale-95 cursor-pointer" title="${escapeHtml(tooltip)}" data-date="${d.dateStr}" data-day-name="${dayLabel}" data-count="${d.count}" data-is-future="${d.isFuture ? 'true' : 'false'}" data-is-today="${d.isToday ? 'true' : 'false'}" data-is-quest="${isQuest ? 'true' : 'false'}"></div>`;
    });

    return `
      <div class="overflow-x-auto custom-scrollbar pb-1 pt-1 -mx-1 px-1">
        <div class="inline-grid grid-rows-7 grid-flow-col gap-1 auto-cols-max min-w-[480px] sm:min-w-0">
          ${cellsHtml}
        </div>
      </div>
    `;
  } else if (period === 'monthly') {
    // 7 cols for Mon-Sun
    const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const headerRow = dayLabels.map(l => `<div class="text-[10px] sm:text-xs font-bold text-slate-400 text-center py-1">${l}</div>`).join('');

    for (let i = 0; i < gridData.padStart; i++) {
      cellsHtml += `<div class="aspect-square rounded-xl opacity-0 pointer-events-none"></div>`;
    }

    gridData.days.forEach(d => {
      let bg = 'bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-200/60 dark:hover:bg-slate-800/60';
      if (d.count >= 1) {
        bg = isQuest
          ? 'bg-emerald-500 text-slate-950 font-bold border border-emerald-400/80 shadow-xs'
          : 'bg-sky-500 text-slate-950 font-bold border border-sky-400/80 shadow-xs';
      } else if (d.isFuture) {
        bg = 'bg-slate-50/40 dark:bg-slate-950/30 text-slate-300/80 dark:text-slate-700/80 border border-dashed border-slate-200/40 dark:border-slate-800/40';
      }
      const todayRing = d.isToday ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-950 font-black z-10' : '';
      const dayNum = d.date.getDate();
      const dayLabel = dayNames[d.dayOfWeek] || '';
      const tooltip = `${dayLabel}, ${d.dateStr}: ${d.count > 0 ? (isQuest ? `Đã hoàn thành ${d.count} lần` : `Đã đổi ${d.count} lần`) : (d.isFuture ? 'Chưa tới' : 'Chưa thực hiện')}`;

      let innerContent = '';
      if (d.count > 1) {
        innerContent = `
          <span class="text-[11px] sm:text-xs font-bold leading-none">${dayNum}</span>
          <span class="text-[8px] sm:text-[9px] font-black leading-none mt-0.5 px-1 py-0.2 rounded-full bg-slate-950/20 text-slate-950">×${d.count}</span>
        `;
      } else {
        innerContent = `<span class="text-xs sm:text-sm font-semibold leading-none">${dayNum}</span>`;
      }

      cellsHtml += `
        <div class="heatmap-cell aspect-square flex flex-col items-center justify-center rounded-xl text-xs ${bg} ${todayRing} transition-all hover:scale-105 active:scale-95 cursor-pointer relative select-none" title="${escapeHtml(tooltip)}" data-date="${d.dateStr}" data-day-name="${dayLabel}" data-count="${d.count}" data-is-future="${d.isFuture ? 'true' : 'false'}" data-is-today="${d.isToday ? 'true' : 'false'}" data-is-quest="${isQuest ? 'true' : 'false'}">
          ${innerContent}
        </div>
      `;
    });

    return `
      <div class="max-w-xs mx-auto w-full">
        <div class="grid grid-cols-7 gap-1.5 mb-2">${headerRow}</div>
        <div class="grid grid-cols-7 gap-1.5">${cellsHtml}</div>
      </div>
    `;
  } else {
    // Weekly: 7 day cards
    const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const weekHtml = gridData.days.map(d => {
      const isDone = d.count > 0;
      const bg = isDone
        ? (isQuest ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300' : 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300')
        : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400';
      const todayRing = d.isToday ? 'ring-2 ring-amber-400 font-bold' : '';
      const dayLabel = dayLabels[d.dayOfWeek] || '';
      const tooltip = `${dayLabel}, ${d.dateStr}: ${d.count > 0 ? (isQuest ? `Đã hoàn thành ${d.count} lần` : `Đã đổi ${d.count} lần`) : (d.isFuture ? 'Chưa tới' : 'Chưa thực hiện')}`;

      return `
        <div class="heatmap-cell flex-1 min-w-[42px] p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:scale-105 active:scale-95 select-none ${bg} ${todayRing}" title="${escapeHtml(tooltip)}" data-date="${d.dateStr}" data-day-name="${dayLabel}" data-count="${d.count}" data-is-future="${d.isFuture ? 'true' : 'false'}" data-is-today="${d.isToday ? 'true' : 'false'}" data-is-quest="${isQuest ? 'true' : 'false'}">
          <div class="text-[10px] font-semibold uppercase">${dayLabel}</div>
          <div class="text-sm sm:text-base font-black my-1">${d.date.getDate()}</div>
          <div class="text-[10px] font-bold">${isDone ? (d.count > 1 ? `✓ ×${d.count}` : '✓') : (d.isFuture ? '—' : '✕')}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        ${weekHtml}
      </div>
    `;
  }
}

function renderTrackerItemCard(item, period, isQuest) {
  const gridData = getFrequencyGridData(item.history || {}, period);
  const percentageStr = gridData.percentage.toFixed(2).replace('.', ',');
  const icon = item.icon || (isQuest ? '📜' : '🎁');
  const title = item.title || item.name;
  const rank = item.rank ? `HẠNG ${item.rank}` : (item.tier ? item.tier.toUpperCase() : '');
  const coins = isQuest ? (item.rewardCoins || 0) : (item.price || 0);

  return `
    <div class="rpg-card rpg-panel rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800/80 transition-all hover:shadow-md">
      <!-- Header: Title, Category, Gold Value, Percentage & Days -->
      <div class="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-xl sm:text-2xl shrink-0">${escapeHtml(icon)}</span>
          <div class="min-w-0">
            <h4 class="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">${escapeHtml(title)}</h4>
            <div class="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
              <span class="px-1.5 py-0.2 rounded font-semibold ${isQuest ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-purple-500/15 text-purple-700 dark:text-purple-300'}">${isQuest ? 'Nhiệm vụ' : 'Phần thưởng'}</span>
              ${rank ? `<span class="font-mono text-slate-400">${rank}</span>` : ''}
              <span class="font-mono font-bold ${isQuest ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-400'} inline-flex items-center gap-0.5">
                <span class="coin-icon"></span>${isQuest ? `+${coins}` : coins} Vàng
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 sm:gap-4 shrink-0">
          <!-- Percentage Pill -->
          <div class="flex items-center gap-1 text-xs font-mono font-bold ${isQuest ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}" title="Tỷ lệ hoàn thành trong kỳ">
            <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
            <span>${percentageStr}%</span>
          </div>

          <!-- Active Days Pill (e.g. 1d, 33d) -->
          <div class="flex items-center gap-1 text-xs font-mono font-bold text-amber-600 dark:text-amber-400" title="Tổng số ngày đã thực hiện">
            <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z"/></svg>
            <span>${gridData.activeDaysCount}d</span>
          </div>

          <!-- Detail Button -->
          <button type="button" class="btn-tracker-open-detail p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer" data-item-id="${item.id}" data-is-quest="${isQuest}" title="Xem chi tiết biểu đồ">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      <!-- Heatmap Grid Zone -->
      <div class="pt-2 border-t border-slate-100 dark:border-slate-800/60">
        ${renderHeatmapGridHTML(item, period, isQuest)}
      </div>

      <!-- Interactive Day Status Bar inside Card -->
      <div class="tracker-card-day-status mt-2.5 pt-2 border-t border-slate-100/80 dark:border-slate-800/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="day-icon text-xs shrink-0">💡</span>
          <span class="day-text truncate">Rê chuột hoặc bấm vào ô ngày để xem chi tiết</span>
        </div>
        <span class="day-count-badge hidden px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0"></span>
      </div>
    </div>
  `;
}

function renderTracker() {
  if (typeof backfillItemHistories === 'function') {
    backfillItemHistories();
  }

  const container = document.getElementById('tracker-list-container');
  const emptyState = document.getElementById('tracker-empty-state');
  if (!container) return;

  const yearBadge = document.getElementById('tracker-year-badge');
  if (yearBadge) yearBadge.textContent = new Date().getFullYear();

  // Sync Period Buttons
  ['weekly', 'monthly', 'yearly'].forEach(p => {
    const btn = document.getElementById(`tracker-period-${p}`);
    if (btn) {
      if (p === currentTrackerPeriod) {
        btn.className = 'tracker-period-btn px-3 py-1.5 rounded-xl text-xs font-bold transition bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/20 cursor-pointer';
      } else {
        btn.className = 'tracker-period-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer';
      }
    }
  });

  // Sync Category Filter Buttons (2 tabs: quests & rewards)
  ['quests', 'rewards'].forEach(c => {
    const btn = document.getElementById(`tracker-cat-${c}`);
    if (btn) {
      if (c === currentTrackerCategory) {
        btn.className = c === 'quests'
          ? 'tracker-cat-btn px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-emerald-500 text-slate-950 shadow-xs cursor-pointer'
          : 'tracker-cat-btn px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-purple-500 text-white shadow-xs cursor-pointer';
      } else {
        btn.className = 'tracker-cat-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold transition text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer';
      }
    }
  });

  const itemsToRender = [];

  // Sort from most gold to least gold
  if (currentTrackerCategory === 'quests') {
    const quests = [...(appState.quests || [])].sort((a, b) => (Number(b.rewardCoins) || 0) - (Number(a.rewardCoins) || 0));
    quests.forEach(q => {
      itemsToRender.push({ item: q, isQuest: true });
    });
  } else if (currentTrackerCategory === 'rewards') {
    const shopItems = [...(appState.shopItems || [])].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    shopItems.forEach(it => {
      itemsToRender.push({ item: it, isQuest: false });
    });
  }

  if (itemsToRender.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  container.innerHTML = itemsToRender.map(({ item, isQuest }) =>
    renderTrackerItemCard(item, currentTrackerPeriod, isQuest)
  ).join('');

  container.querySelectorAll('.btn-tracker-open-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
      const itemId = btn.dataset.itemId;
      const isQuest = btn.dataset.isQuest === 'true';
      const targetItem = isQuest
        ? appState.quests.find(q => q.id === itemId)
        : appState.shopItems.find(s => s.id === itemId);
      if (targetItem) {
        openItemFrequencyModal(targetItem, isQuest);
      }
    });
  });
}
window.renderTracker = renderTracker;

function openItemFrequencyModal(item, isQuest = true) {
  if (typeof backfillItemHistories === 'function') {
    backfillItemHistories();
  }

  let targetItem = item;
  if (item && item.id) {
    if (isQuest && Array.isArray(appState.quests)) {
      targetItem = appState.quests.find(q => q.id === item.id) || item;
    } else if (!isQuest && Array.isArray(appState.shopItems)) {
      targetItem = appState.shopItems.find(s => s.id === item.id) || item;
    }
  }

  currentModalFreqItem = targetItem;
  currentModalFreqIsQuest = isQuest;

  // Intelligent period selection:
  // If current month has completions, default to 'monthly'.
  // If current month has 0 completions, but previous months have completions, default to 'yearly' so completed squares light up immediately!
  const monthData = getFrequencyGridData(targetItem.history || {}, 'monthly');
  const totalCompletions = Object.values(targetItem.history || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  if (monthData.activeDaysCount > 0 || totalCompletions === 0) {
    currentModalFreqPeriod = 'monthly';
  } else {
    currentModalFreqPeriod = 'yearly';
  }

  renderItemFrequencyModal();
  openModal('modal-frequency-detail');
}
window.openItemFrequencyModal = openItemFrequencyModal;

function renderItemFrequencyModal() {
  if (!currentModalFreqItem) return;

  if (typeof backfillItemHistories === 'function') {
    backfillItemHistories();
  }
  if (currentModalFreqItem.id) {
    if (currentModalFreqIsQuest && Array.isArray(appState.quests)) {
      currentModalFreqItem = appState.quests.find(q => q.id === currentModalFreqItem.id) || currentModalFreqItem;
    } else if (!currentModalFreqIsQuest && Array.isArray(appState.shopItems)) {
      currentModalFreqItem = appState.shopItems.find(s => s.id === currentModalFreqItem.id) || currentModalFreqItem;
    }
  }

  const item = currentModalFreqItem;
  const isQuest = currentModalFreqIsQuest;
  const period = currentModalFreqPeriod;

  const iconEl = document.getElementById('modal-freq-icon');
  if (iconEl) iconEl.textContent = item.icon || (isQuest ? '📜' : '🎁');

  const titleEl = document.getElementById('modal-freq-title');
  if (titleEl) titleEl.textContent = item.title || item.name;

  const typeBadge = document.getElementById('modal-freq-type-badge');
  if (typeBadge) {
    typeBadge.textContent = isQuest ? 'NHIỆM VỤ' : 'PHẦN THƯỞNG';
    typeBadge.className = isQuest
      ? 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold inline-block mt-0.5'
      : 'text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold inline-block mt-0.5';
  }

  const gridData = getFrequencyGridData(item.history || {}, period);
  const percentageStr = gridData.percentage.toFixed(2).replace('.', ',');

  const pctEl = document.getElementById('modal-freq-pct');
  if (pctEl) pctEl.textContent = `${percentageStr}%`;

  const daysEl = document.getElementById('modal-freq-days');
  if (daysEl) daysEl.textContent = `${gridData.activeDaysCount}d`;

  let totalCompletedTimes = 0;
  if (item.history) {
    Object.values(item.history).forEach(c => {
      totalCompletedTimes += (Number(c) || 0);
    });
  }
  if (isQuest && item.completedCount && totalCompletedTimes < item.completedCount) {
    totalCompletedTimes = item.completedCount;
  }
  const totalEl = document.getElementById('modal-freq-total');
  if (totalEl) totalEl.innerHTML = `<span class="font-mono">${totalCompletedTimes}</span> lần`;

  // Sync modal period buttons
  ['weekly', 'monthly', 'yearly'].forEach(p => {
    const btn = document.getElementById(`modal-freq-p-${p}`);
    if (btn) {
      if (p === period) {
        btn.className = 'modal-freq-btn px-3 py-1 rounded-lg text-xs font-bold transition bg-amber-500 text-slate-950 shadow-xs cursor-pointer';
      } else {
        btn.className = 'modal-freq-btn px-3 py-1 rounded-lg text-xs font-semibold transition text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer';
      }
    }
  });

  const gridContainer = document.getElementById('modal-freq-grid-container');
  if (gridContainer) {
    gridContainer.innerHTML = renderHeatmapGridHTML(item, period, isQuest);
  }

  // Initialize day detail banner with today's status or most recent completion
  const dDate = document.getElementById('modal-freq-detail-date');
  const dStatus = document.getElementById('modal-freq-detail-status');
  const dBadge = document.getElementById('modal-freq-detail-badge');
  const dIcon = document.getElementById('modal-freq-detail-icon');
  if (dDate && dStatus && dBadge) {
    const today = new Date();
    const todayStr = getLocalDayString(today);
    const todayFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const todayCount = (item.history && item.history[todayStr]) ? (Number(item.history[todayStr]) || 0) : 0;

    dDate.textContent = `Hôm nay (${todayFormatted})`;
    if (dIcon) dIcon.textContent = todayCount > 0 ? '✨' : '📅';
    if (todayCount > 0) {
      dStatus.textContent = isQuest ? `Đã hoàn thành ${todayCount} lần hôm nay` : `Đã đổi thưởng ${todayCount} lần hôm nay`;
      dBadge.innerHTML = `<span class="font-mono">${todayCount}</span> lần`;
      dBadge.className = isQuest
        ? 'font-bold text-xs px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 shrink-0 shadow-xs'
        : 'font-bold text-xs px-2.5 py-1 rounded-full bg-sky-500 text-slate-950 shrink-0 shadow-xs';
    } else {
      // Find most recent active date in history
      const activeDates = Object.keys(item.history || {}).filter(d => (Number(item.history[d]) || 0) > 0).sort();
      if (activeDates.length > 0) {
        const lastDate = activeDates[activeDates.length - 1];
        const lastCount = item.history[lastDate];
        const parts = lastDate.split('-');
        const lastFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : lastDate;
        dStatus.textContent = isQuest ? `Hôm nay chưa làm • Lần làm gần nhất: ${lastFormatted} (${lastCount} lần)` : `Hôm nay chưa đổi • Gần nhất: ${lastFormatted} (${lastCount} lần)`;
        dBadge.innerHTML = `<span class="font-mono">${lastCount}</span> lần`;
        dBadge.className = 'font-bold text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0';
      } else {
        dStatus.textContent = isQuest ? `Chưa từng hoàn thành nhiệm vụ này` : `Chưa từng đổi phần thưởng này`;
        dBadge.textContent = '0 lần';
        dBadge.className = 'font-bold text-xs px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-500 shrink-0';
      }
    }
  }
}
window.renderItemFrequencyModal = renderItemFrequencyModal;

