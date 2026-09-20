// =============================================================================
// 13. MODAL & NAVIGATION CONTROLLERS (Mobile Bottom Bar + Desktop Top Tabs)
// =============================================================================
function updateRewardsNavBadge() {
  const totalRewardsBadge = document.getElementById('badge-rewards-total');
  const unusedCount = Array.isArray(appState.inventory) ? appState.inventory.length : 0;
  if (totalRewardsBadge) totalRewardsBadge.textContent = unusedCount;
  const countBadge = document.getElementById('badge-inventory-count');
  if (countBadge) countBadge.textContent = unusedCount;
}

function switchRewardSubtab(subtab) {
  const btnShop = document.getElementById('subtab-btn-shop');
  const btnInv = document.getElementById('subtab-btn-inventory');
  const paneShop = document.getElementById('subtab-pane-shop');
  const paneInv = document.getElementById('subtab-pane-inventory');

  const baseClass = 'reward-subtab flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs transition';
  const activeClass = `${baseClass} active font-bold bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm`;
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

function openLevelInfoModal() {
  const p = appState.profile;
  const expNeeded = p.level * 100;
  const expRemaining = Math.max(0, expNeeded - p.exp);
  const pct = Math.min(100, Math.round((p.exp / expNeeded) * 100));

  const curBadge = document.getElementById('modal-level-current-badge');
  const curTitle = document.getElementById('modal-level-current-title');
  const expRatio = document.getElementById('modal-level-exp-ratio');
  const expBar = document.getElementById('modal-level-exp-bar');
  const neededText = document.getElementById('modal-level-needed-text');

  if (curBadge) curBadge.textContent = `LV. ${p.level}`;
  if (curTitle) curTitle.textContent = p.title || 'Tân Binh Cấp 1';
  if (expRatio) expRatio.textContent = `${p.exp}/${expNeeded} EXP (${pct}%)`;
  if (expBar) expBar.style.width = `${pct}%`;
  if (neededText) {
    neededText.textContent = `Cần thêm ${expRemaining} EXP nữa để lên LV. ${p.level + 1}`;
  }

  const modal = document.getElementById('modal-level-info');
  if (modal) modal.classList.remove('hidden');
}
window.openLevelInfoModal = openLevelInfoModal;

function openStreakInfoModal() {
  const p = appState.profile;
  if (!p) return;

  const streak = Math.max(0, parseInt(p.streak, 10) || 0);
  const streakStatusInfo = getDailyStreakStatus(p);
  const bonusPct = getStreakBonusPercent(streak);
  const streakTitle = getStreakTitle(streak);
  const nextMilestone = getNextStreakMilestone(streak);

  const daysCountEl = document.getElementById('modal-streak-days-count');
  if (daysCountEl) daysCountEl.textContent = streak;

  const titleEl = document.getElementById('modal-streak-tier-title');
  if (titleEl) titleEl.textContent = streakTitle;

  const statusEl = document.getElementById('modal-streak-today-status');
  if (statusEl) {
    if (streakStatusInfo.status === 'active_today') {
      statusEl.className = 'p-2.5 rounded-xl text-[11px] font-medium flex items-center gap-2 border bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300';
      statusEl.innerHTML = `
        <span class="text-base shrink-0">✅</span>
        <div class="min-w-0">
          <div class="font-bold">Chuỗi hôm nay đã được bảo vệ an toàn!</div>
          <div class="text-[10px] text-slate-500 dark:text-slate-400">Bạn đã hoàn thành nhiệm vụ hôm nay. Hãy quay lại vào ngày mai để tiếp tục nâng chuỗi nhé!</div>
        </div>
      `;
    } else if (streakStatusInfo.status === 'waiting_today') {
      statusEl.className = 'p-2.5 rounded-xl text-[11px] font-medium flex items-center gap-2 border bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300';
      statusEl.innerHTML = `
        <span class="text-base shrink-0">⏳</span>
        <div class="min-w-0">
          <div class="font-bold">Chưa hoàn thành nhiệm vụ hôm nay!</div>
          <div class="text-[10px] text-slate-500 dark:text-slate-400">Hãy hoàn thành ít nhất 1 nhiệm vụ trước 23:59 để tăng chuỗi lên ${streak + 1} ngày và nhận thưởng.</div>
        </div>
      `;
    } else {
      statusEl.className = 'p-2.5 rounded-xl text-[11px] font-medium flex items-center gap-2 border bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300';
      statusEl.innerHTML = `
        <span class="text-base shrink-0">⚠️</span>
        <div class="min-w-0">
          <div class="font-bold">Chuỗi đã bị gián đoạn!</div>
          <div class="text-[10px] text-slate-500 dark:text-slate-400">Bạn đã bỏ lỡ ngày hôm qua. Hoàn thành 1 nhiệm vụ hôm nay để thắp lại ngọn lửa chuỗi mới!</div>
        </div>
      `;
    }
  }

  const perkQuestEl = document.getElementById('modal-streak-perk-quest');
  if (perkQuestEl) perkQuestEl.textContent = `+${bonusPct}% Vàng & EXP`;

  const perkQuestNextEl = document.getElementById('modal-streak-perk-quest-next');
  if (perkQuestNextEl) perkQuestNextEl.textContent = nextMilestone.label;

  const perkCreditEl = document.getElementById('modal-streak-perk-credit');
  if (perkCreditEl) perkCreditEl.textContent = `+${streak * 5} Vàng`;

  // Render weekly 7-day dots tracker
  const trackerEl = document.getElementById('modal-streak-week-tracker');
  if (trackerEl) {
    const today = new Date();
    const history = Array.isArray(p.streakHistory) ? p.streakHistory : [];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    let html = '';

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = getLocalDayString(d);
      const dayOfWeek = dayNames[d.getDay()];
      const isToday = i === 0;
      const isCompleted = history.includes(dayStr);

      html += `
        <div class="flex flex-col items-center gap-1 p-1 sm:p-1.5 rounded-xl border transition-all ${
          isToday
            ? 'streak-day-card today bg-orange-500/15 border-orange-500/50'
            : isCompleted
              ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              : 'bg-slate-100/60 dark:bg-slate-950/60 border-slate-200/50 dark:border-slate-800/50 opacity-60'
        }">
          <span class="text-[9px] font-bold ${isToday ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}">${dayOfWeek}</span>
          <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs ${
            isCompleted
              ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm'
              : isToday
                ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-dashed border-orange-500/50 animate-pulse'
                : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400'
          }">
            ${isCompleted ? '🔥' : isToday ? '⏳' : '·'}
          </div>
          <span class="text-[8px] font-mono text-slate-400">${d.getDate()}/${d.getMonth() + 1}</span>
        </div>
      `;
    }
    trackerEl.innerHTML = html;
  }

  const modal = document.getElementById('modal-streak-info');
  if (modal) modal.classList.remove('hidden');
}
window.openStreakInfoModal = openStreakInfoModal;

function switchTab(tabId) {
  // Graceful fallback / redirect for legacy 'inventory' tab links
  if (tabId === 'inventory') {
    tabId = 'shop';
    switchRewardSubtab('inventory');
  }

  const isAdmin = isUserAdmin();
  const isMoreTab = ['leaderboard', 'ledger', 'bank', 'admin'].includes(tabId);

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
  document.getElementById('mobile-more-menu')?.classList.add('hidden');

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
    btnMobileMore.className = `mobile-more-btn flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-1 sm:px-2 rounded-xl transition cursor-pointer ${
      isMoreTab
        ? currentTheme.mobile
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
      if (isAdminBtn && !isAdmin) {
        b.className = 'mobile-nav-btn mobile-more-item hidden items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left';
        return;
      }
      b.className = `mobile-nav-btn mobile-more-item flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
        isActive
          ? (theme.itemMobile || theme.mobile)
          : (isAdminBtn ? 'text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/40' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')
      }`;
      return;
    }

    if (isAdminBtn && !isAdmin) {
      b.className = 'mobile-nav-btn hidden flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-1 px-1 sm:px-2 rounded-xl transition';
      return;
    }

    b.className = `mobile-nav-btn flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-1 px-1 sm:px-2 rounded-xl transition ${
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
  }

  if (['quests', 'shop'].includes(tabId) || tabId === 'ledger') {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(refreshAllCardDescToggles);
    }
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  if (id === 'modal-welcome') {
    if (!checkIsOnboarded()) return;
  }
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
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
    applyTheme(appState.profile.theme || 'dark');
    renderAll();
    closeModal('modal-welcome');
    fetchLeaderboard();

    if (loadingEl) loadingEl.classList.add('hidden');

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
    showToast('Lỗi kết nối: ' + err.message, 'error');
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
    if (e.target.closest && e.target.closest('#modal-welcome')) return;

    e.preventDefault();
    e.stopPropagation();
    openModal('modal-welcome');
    showToast('Vui lòng đăng nhập bằng Google để tiếp tục!', 'error');
  }, true);

  // Anti-DevTools 3: Chặn phím tắt gõ vào trang nếu chưa onboard
  document.addEventListener('keydown', (e) => {
    if (checkIsOnboarded()) return;
    if (e.target.closest && e.target.closest('#modal-welcome')) return;
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
