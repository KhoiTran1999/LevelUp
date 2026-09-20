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
  if (profStreakPerk) profStreakPerk.textContent = `Thưởng nhiệm vụ: +${getStreakBonusPercent(streak)}% Vàng & EXP`;
}

/**
 * Tự động đo đạc và quản lý nút "...xem thêm" / "Thu gọn ▲" cho thẻ Nhiệm vụ và Phần thưởng.
 * Mặc định: 1 dòng (line-clamp-1).
 * Chỉ hiện nút toggle khi nội dung vượt quá 1 dòng (từ dòng 2 trở lên).
 * Khi mở rộng: giới hạn chiều cao tối đa (max-height) và kích hoạt thanh cuộn dọc (overflow-y-auto).
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

function renderQuests() {
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

  filtered.forEach(q => {
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
    const card = document.createElement('div');
    card.dataset.questId = q.id;
    card.className = `rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 relative quest-card-rank-${rank} ${
      isCurrentlyFocusing
        ? 'ring-2 ring-amber-500 shadow-xl shadow-amber-500/20 bg-amber-500/5 border-amber-500/50'
        : isCompleted
          ? 'opacity-70 bg-slate-100/50 dark:bg-slate-950/30'
          : (hasSavedTimer ? 'ring-1 ring-sky-500/50 shadow-md shadow-sky-500/10' : '')
    }`;

    card.innerHTML = `
      <div>
        <!-- Zone 1: Header (Streamlined: Status & Value with Action Menu "⋮") -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-1.5 sm:gap-2">
            ${isCurrentlyFocusing ? (isTimerDone ? `
              <span class="badge-quest-doing inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-slate-950 shadow-xs animate-pulse">
                🎉 ĐÃ XONG
              </span>
            ` : `
              <span class="badge-quest-doing inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950 shadow-xs animate-pulse">
                ⏱️ ĐANG LÀM
              </span>
            `) : (hasSavedTimer ? `
              <span class="badge-quest-saved inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500 text-slate-950 shadow-xs" title="Thời gian đang được bảo lưu">
                ⏸️ BẢO LƯU (${Math.ceil(q.savedTimer.remainingSeconds / 60)}p)
              </span>
            ` : '')}
          </div>
          <div class="flex items-center gap-1.5 relative">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-mono font-black text-xs shadow-xs" title="Phần thưởng Vàng khi hoàn thành">
              ${COIN_ICON_HTML} <span>+${q.rewardCoins}</span>
            </div>
            <button type="button" class="btn-quest-menu text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 rounded-lg p-1.5 transition-colors leading-none cursor-pointer" title="Tùy chọn thao tác" aria-label="Tùy chọn thao tác">
              <svg class="w-4 h-4 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </button>
            <div class="quest-dropdown-menu hidden">
              <div class="quest-dropdown-item cursor-default text-slate-600 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60 pb-1.5 mb-1">
                <span>Phân cấp:</span>
                <span class="rank-badge-${q.rank} text-[10px] font-mono font-black px-2 py-0.5 rounded ml-auto tracking-wider shadow-xs whitespace-nowrap shrink-0">HẠNG ${q.rank}</span>
              </div>
              ${q.requiresProof ? `
                <div class="quest-dropdown-item cursor-default text-slate-600 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60 pb-1.5 mb-1">
                  <span>Bằng chứng:</span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ml-auto whitespace-nowrap shrink-0 ${q.focusTimerCompleted ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 animate-pulse' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'}">
                    ${q.focusTimerCompleted ? 'CHỜ NỘP ẢNH' : 'CẦN ẢNH'}
                  </span>
                </div>
              ` : ''}
              ${hasSavedTimer ? `
                <button type="button" class="btn-clear-saved-timer quest-dropdown-item text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 cursor-pointer" title="Hủy thời gian bảo lưu để làm lại từ đầu">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>Hủy bảo lưu (Bắt đầu lại)</span>
                </button>
              ` : ''}
              ${!isCompleted ? `
                <button type="button" class="btn-debate-quest quest-dropdown-item text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 cursor-pointer" title="Thương lượng lại nhiệm vụ với AI">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                  <span>Thương lượng AI</span>
                </button>
              ` : ''}
              ${q.isRepeatable && q.completedCount > 0 ? `
                <button type="button" class="btn-undo-repeat-quest quest-dropdown-item text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 cursor-pointer" title="Hoàn tác lần làm gần nhất">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
                  <span>Hoàn tác lần vừa làm (-${q.rewardCoins} Vàng)</span>
                </button>
              ` : ''}
              ${!isCompleted ? `
                <button type="button" class="btn-toggle-repeat quest-dropdown-item text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title="Nhấn để đổi giữa Lặp lại và Làm 1 lần">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>${q.isRepeatable ? 'Đổi sang 1 lần' : 'Đổi sang Lặp lại'}</span>
                </button>
              ` : ''}
              <button type="button" class="btn-del-quest quest-dropdown-item text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 cursor-pointer" title="Xóa nhiệm vụ">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                <span>Xóa nhiệm vụ</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Zone 2: Body (Title & Standardized Clamped Context) -->
        <div class="flex items-start gap-3 my-2">
          <div class="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl shadow-xs shrink-0 ${isCompleted ? 'opacity-60 grayscale' : ''}">
            ${escapeHtml(getQuestIcon(q))}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-sm sm:text-base leading-snug line-clamp-2 ${isCompleted ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}">${escapeHtml(q.title)}</h3>
            ${q.description ? `
              <div class="mt-1">
                <p class="quest-desc-text text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed break-words">${escapeHtml(q.description)}</p>
                <button type="button" class="btn-toggle-desc hidden text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer block mt-0.5">...xem thêm</button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div>
        <!-- Zone 3: Meta & Progress Strip (Operational Status) -->
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
            ${(q.type === 'focus' && q.targetMinutes > 0) ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${q.focusTimerCompleted ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold' : (hasSavedTimer ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300')} font-mono">
                ${q.focusTimerCompleted ? `
                  <svg class="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
                  <span>Đã đủ ${q.targetMinutes}p</span>
                ` : `
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
                  <span>${q.targetMinutes}p${hasSavedTimer ? ` (còn ${Math.ceil(q.savedTimer.remainingSeconds / 60)}p)` : ''}</span>
                `}
              </span>
            ` : ''}
          </div>

          <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            ${q.isRepeatable ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold" title="Nhiệm vụ lặp lại hàng ngày">
                <span>🔁 Lặp lại${q.completedCount ? ` (${q.completedCount})` : ''}</span>
              </span>
            ` : `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" title="Nhiệm vụ làm 1 lần">
                <span>1 lần</span>
              </span>
            `}
          </div>
        </div>

        <!-- Zone 4: Footer (Action Command Zone) -->
        ${isCompleted ? `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
              <span>Hoàn thành</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button class="btn-restart-quest px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 active:scale-95 cursor-pointer" title="Làm lại nhiệm vụ này">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                <span>Làm lại</span>
              </button>
              <button class="btn-undo-quest px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 active:scale-95 cursor-pointer" title="Hoàn tác trạng thái hoàn thành">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
                <span>Hoàn tác</span>
              </button>
            </div>
          </div>
        ` : `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
            ${q.focusTimerCompleted && q.requiresProof ? `
              <button class="btn-submit-quest-proof w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 bg-amber-600 hover:bg-amber-500 text-white cursor-pointer" title="Đã đủ thời gian tập trung! Bấm để chụp ảnh gửi AI duyệt nhận Vàng">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="4" stroke-width="2"/></svg>
                <span>Chụp Ảnh Nhận Vàng 📸</span>
              </button>
            ` : (q.type === 'focus' ? (isTimerDone ? `
              <button class="btn-complete-focus-done w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold animate-pulse">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
                <span>${q.requiresProof && !q._proofVerified ? 'Chụp Ảnh Nhận Vàng 📸' : 'Hoàn Thành & Nhận Thưởng 🎉'}</span>
              </button>
            ` : (cooldownRemainingMs > 0 && !isCurrentlyFocusing && !hasSavedTimer ? `
              <button class="w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-none bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700/60 cursor-not-allowed" disabled title="Đang trong thời gian chờ 10 phút giữa các lần nhận thưởng">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
                <span>Chờ ${Math.ceil(cooldownRemainingMs / 60000)}p</span>
              </button>
            ` : `
              <button class="btn-start-focus w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer ${isSessionOnOtherDevice ? 'bg-amber-700 hover:bg-amber-600 text-white' : (isCurrentlyFocusing ? 'bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25' : (hasSavedTimer ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold' : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold'))}">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
                <span>${isSessionOnOtherDevice ? 'Tiếp Tục Ở Thiết Bị Này ⏱️' : (isCurrentlyFocusing ? (isFocusRunning ? 'Đang Chạy...' : 'Tạm Dừng') : (hasSavedTimer ? `Tiếp Tục (${Math.ceil(q.savedTimer.remainingSeconds / 60)}p) ⏱️` : 'Bắt Đầu ⏱️'))}</span>
              </button>
            `)) : `
              <button class="btn-complete-bounty w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer ${cooldownRemainingMs > 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700/60 cursor-not-allowed shadow-none' : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold'}" ${cooldownRemainingMs > 0 ? 'title="Đang trong thời gian chờ 10 phút giữa các lần nhận thưởng"' : ''}>
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
                <span>${cooldownRemainingMs > 0 ? `Chờ ${Math.ceil(cooldownRemainingMs / 60000)}p` : 'Hoàn Thành'}</span>
              </button>
            `)}
          </div>
        `}
      </div>
    `;

    // Dropdown Action Menu Toggle
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

    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(refreshAllCardDescToggles);
  }
}

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
    card.className = `rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 relative group reward-card-tier-${rawTier}`;

    const tierColors = REWARD_TIER_COLORS;
    const tierLabels = REWARD_TIER_LABELS;

    card.innerHTML = `
      <div>
        <!-- Zone 1: Header (Value/Price & Operations Menu) -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <div>
            ${durationMins > 0 ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 font-mono text-[11px] font-medium border border-purple-500/20 shadow-xs">
                ⏱️ ${durationMins}p
              </span>
            ` : ''}
          </div>
          <div class="flex items-center gap-1.5 relative">
            <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/25 text-purple-700 dark:text-purple-300 font-mono font-bold text-xs shadow-xs" title="Giá đổi phần thưởng">
              <span class="text-[11px] font-bold text-purple-500">Giá:</span>
              ${COIN_ICON_HTML} <span>${item.price} Vàng</span>
            </div>
            <button type="button" class="btn-shop-menu text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 rounded-lg p-1.5 transition-colors leading-none cursor-pointer" title="Tùy chọn thao tác" aria-label="Tùy chọn thao tác">
              <svg class="w-4 h-4 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </button>
            <div class="shop-dropdown-menu quest-dropdown-menu hidden">
              <div class="quest-dropdown-item cursor-default text-slate-600 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60 pb-1.5 mb-1">
                <span>Phân cấp:</span>
                <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded ml-auto font-bold border tracking-wider shadow-xs whitespace-nowrap shrink-0 ${tierColors[rawTier] || tierColors.rare}">
                  ${tierLabels[rawTier] || (item.tier || 'CAO CẤP').toUpperCase()}
                </span>
              </div>
              <button type="button" class="btn-debate-shop-item quest-dropdown-item text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 dark:hover:bg-purple-500/20 cursor-pointer" title="Thương lượng lại phần thưởng với AI">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span>Thương lượng AI</span>
              </button>
              <button type="button" class="btn-del-shop-item quest-dropdown-item text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 cursor-pointer" title="Xóa phần thưởng khỏi Cửa Hàng">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                <span>Xóa phần thưởng</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Zone 2: Body (Title & Standardized Clamped Context) -->
        <div class="flex items-start gap-3 my-2">
          <div class="w-11 h-11 rounded-xl bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/25 flex items-center justify-center text-2xl shadow-xs shrink-0">
            ${escapeHtml(item.icon || '🎁')}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">${escapeHtml(item.name)}</h3>
            ${item.description ? `
              <div class="mt-1">
                <p class="reward-desc-text text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed break-words">${escapeHtml(item.description)}</p>
                <button type="button" class="btn-toggle-desc hidden text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer block mt-0.5">...xem thêm</button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div>
        <!-- Zone 3: Meta & Progress Strip (Affordability) -->
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <span class="text-[11px] font-medium ${canAfford ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-500 dark:text-rose-400'} inline-flex items-center gap-1">
            ${canAfford ? `
              <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
              <span>Đủ Vàng đổi ngay</span>
            ` : `
              <svg class="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/><line x1="12" y1="16" x2="12.01" stroke-width="2"/></svg>
              <span>Còn thiếu ${coinsNeeded} Vàng</span>
            `}
          </span>
        </div>

        <!-- Zone 4: Footer (Action Command Zone) -->
        <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800">
          <button class="btn-buy-item w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer ${canAfford ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200/60 dark:border-slate-700/60'}" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' : ''}
            <span>${canAfford ? (durationMins > 0 ? `Đổi & Bấm Giờ (${durationMins}p)` : 'Đổi Quà Ngay') : 'Chưa Đủ Vàng'}</span>
          </button>
        </div>
      </div>
    `;

    // Dropdown Action Menu Toggle
    const menuBtn = card.querySelector('.btn-shop-menu');
    const dropdown = card.querySelector('.shop-dropdown-menu');
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
    setupCardDescToggle(card, '.reward-desc-text');

    const delShopBtn = card.querySelector('.btn-del-shop-item');
    if (delShopBtn) {
      delShopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        deleteShopItem(item.id);
      });
    }

    const debateShopBtn = card.querySelector('.btn-debate-shop-item');
    if (debateShopBtn) {
      debateShopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        openRewardRenegotiateModal(item.id);
      });
    }

    const buyItemBtn = card.querySelector('.btn-buy-item');
    if (buyItemBtn) {
      buyItemBtn.addEventListener('click', () => {
        buyShopItem(item.id);
      });
    }

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
    card.className = `rpg-card rpg-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 relative group reward-card-tier-${rawTier} ${
      isThisActiveReward
        ? 'ring-2 ring-purple-500 shadow-xl shadow-purple-500/20 bg-purple-500/5 border-purple-500/50'
        : (hasSavedTimer
          ? 'ring-1 ring-sky-500/50 shadow-md shadow-sky-500/10'
          : (item.isUsed ? 'opacity-70 bg-slate-100/50 dark:bg-slate-950/30' : ''))
    }`;

    card.innerHTML = `
      <div>
        <!-- Zone 1: Header (Status & Operations Menu) -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2">
            ${isThisActiveReward ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500 text-white shadow-xs animate-pulse">
                ĐANG DÙNG
              </span>
            ` : hasSavedTimer ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-500 text-slate-950 shadow-xs" title="Thời gian đang được bảo lưu">
                ⏸️ BẢO LƯU (${Math.ceil(item.savedTimer.remainingSeconds / 60)}P)
              </span>
            ` : item.isUsed ? `
              <span class="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300/40 dark:border-slate-700/40">
                ĐÃ DÙNG
              </span>
            ` : `
              <span class="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 tracking-wider">
                CHƯA DÙNG
              </span>
            `}
          </div>
          <div class="flex items-center gap-1.5 relative">
            <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/25 text-purple-700 dark:text-purple-300 font-mono font-bold text-xs shadow-xs" title="Giá trị phần thưởng">
              <span class="text-[11px] font-bold text-purple-500">Trị giá:</span>
              ${COIN_ICON_HTML} <span>${item.price} Vàng</span>
            </div>
            <button type="button" class="btn-inv-menu text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 rounded-lg p-1.5 transition-colors leading-none cursor-pointer" title="Tùy chọn thao tác" aria-label="Tùy chọn thao tác">
              <svg class="w-4 h-4 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </button>
            <div class="inv-dropdown-menu quest-dropdown-menu hidden">
              <div class="quest-dropdown-item cursor-default text-slate-600 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60 pb-1.5 mb-1">
                <span>Phân cấp:</span>
                <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded ml-auto font-bold border tracking-wider shadow-xs whitespace-nowrap shrink-0 ${REWARD_TIER_COLORS[rawTier] || REWARD_TIER_COLORS.rare}">
                  ${REWARD_TIER_LABELS[rawTier] || (item.tier || 'CAO CẤP').toUpperCase()}
                </span>
              </div>
              ${hasSavedTimer ? `
                <button type="button" class="btn-clear-saved-reward quest-dropdown-item text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 cursor-pointer" title="Hủy bảo lưu (Kết thúc quà)">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
                  <span>Kết thúc quà (Hủy bảo lưu)</span>
                </button>
              ` : (!item.isUsed ? `
                <button type="button" class="btn-refund-inv quest-dropdown-item text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 cursor-pointer" title="Hoàn trả và nhận lại Vàng">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
                  <span>Trả quà nhận lại Vàng</span>
                </button>
              ` : (canUndo ? `
                <button type="button" class="btn-undo-inv quest-dropdown-item text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 cursor-pointer" title="Đánh dấu chưa sử dụng">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
                  <span>Hoàn tác (Đánh dấu chưa dùng)</span>
                </button>
              ` : ''))}
              <button type="button" class="btn-del-inv quest-dropdown-item text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 cursor-pointer" title="Xóa khỏi Kho Quà">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                <span>Xóa khỏi kho</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Zone 2: Body (Title & Readable Context) -->
        <div class="flex items-start gap-3 my-2">
          <div class="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl shadow-xs shrink-0">
            ${escapeHtml(item.icon || '🎁')}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 ${(item.isUsed && !isThisActiveReward && !hasSavedTimer) ? 'text-slate-400 dark:text-slate-500' : ''}">${escapeHtml(item.name)}</h4>
            ${item.description ? `
              <div class="mt-1">
                <p class="reward-desc-text text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed break-words">${escapeHtml(item.description)}</p>
                <button type="button" class="btn-toggle-desc hidden text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer block mt-0.5">...xem thêm</button>
              </div>
            ` : ''}
            <p class="mt-1 text-xs text-slate-400 dark:text-slate-500 font-mono">Đã đổi: ${new Date(item.purchasedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div>
        <!-- Zone 3: Meta & Progress Strip (Duration info) -->
        <div class="py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <span class="text-[11px] font-medium text-purple-700 dark:text-purple-300 font-mono inline-flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
            <span>Hiệu lực: <strong class="font-bold">${durationMins > 0 ? `${durationMins} phút` : 'Dùng ngay'}</strong>${hasSavedTimer ? ` <span class="text-sky-600 dark:text-sky-400 font-bold">(còn ${Math.ceil(item.savedTimer.remainingSeconds / 60)}p)</span>` : ''}</span>
          </span>
          ${item.isUsed && !isThisActiveReward && !hasSavedTimer ? `<span class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">${durationMins > 0 ? 'Đã kết thúc' : 'Đã sử dụng'}</span>` : ''}
        </div>

        <!-- Zone 4: Footer (Action Command Zone) -->
        ${isThisActiveReward ? `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <button class="btn-scroll-timer flex-1 py-2 px-3 rounded-lg bg-purple-600/15 border border-purple-500/30 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer" title="Xem bộ đếm thời gian">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
              <span>${isFocusRunning ? 'Đang Đếm Giờ' : 'Tạm Dừng'}</span>
            </button>
            <button class="btn-undo-inv px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 active:scale-95 cursor-pointer" title="Đánh dấu chưa sử dụng">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
              <span>Hoàn tác</span>
            </button>
          </div>
        ` : hasSavedTimer ? `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <button class="btn-use-inv flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer" title="Tiếp tục sử dụng phần thưởng đã bảo lưu">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Tiếp Tục Dùng (${Math.ceil(item.savedTimer.remainingSeconds / 60)}p)</span>
            </button>
            <button class="btn-clear-saved-reward px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 active:scale-95 cursor-pointer" title="Kết thúc quà (hủy thời gian bảo lưu)">
              <span>Kết thúc</span>
            </button>
          </div>
        ` : item.isUsed ? `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>
              <span>${durationMins > 0 ? 'Đã kết thúc' : 'Đã sử dụng'}</span>
            </span>
            ${canUndo ? `
              <button class="btn-undo-inv px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 active:scale-95 cursor-pointer" title="Đánh dấu chưa sử dụng">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"/></svg>
                <span>Hoàn tác</span>
              </button>
            ` : ''}
          </div>
        ` : `
          <div class="pt-2.5 border-t border-slate-200/80 dark:border-slate-800">
            <button class="btn-use-inv w-full py-2 px-3 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>${durationMins > 0 ? `Dùng Quà (${durationMins}p)` : 'Dùng Quà'}</span>
            </button>
          </div>
        `}
      </div>
    `;

    // Dropdown Action Menu Toggle
    const menuBtn = card.querySelector('.btn-inv-menu');
    const dropdown = card.querySelector('.inv-dropdown-menu');
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

    const scrollTimerBtn = card.querySelector('.btn-scroll-timer');
    if (scrollTimerBtn) {
      scrollTimerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

    const delInvBtn = card.querySelector('.btn-del-inv');
    if (delInvBtn) {
      delInvBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        deleteInventoryItem(item.id);
      });
    }

    const refundBtn = card.querySelector('.btn-refund-inv');
    if (refundBtn) {
      refundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        refundInventoryItem(item.id);
      });
    }

    card.querySelectorAll('.btn-undo-inv').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        undoUseInventoryItem(item.id);
      });
    });

    const useBtn = card.querySelector('.btn-use-inv');
    if (useBtn) {
      useBtn.addEventListener('click', () => useInventoryItem(item.id));
    }

    card.querySelectorAll('.btn-clear-saved-reward').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCardDropdowns();
        clearSavedRewardTimer(item.id);
      });
    });

    // Toggle description expand / collapse
    setupCardDescToggle(card, '.reward-desc-text');

    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(refreshAllCardDescToggles);
  }
}

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
