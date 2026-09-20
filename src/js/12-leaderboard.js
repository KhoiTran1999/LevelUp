// =============================================================================
// 10. LEADERBOARD FETCHER & PRESENCE
// =============================================================================
let currentLeaderboardData = [];
let currentLeaderboardSearch = '';

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'trước đó';
  const diffSec = Math.floor((Date.now() - Number(timestamp)) / 1000);
  if (diffSec < 60) return 'vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}p trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  const d = new Date(Number(timestamp));
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function renderLeaderboardPodium(list) {
  const podiumEl = document.getElementById('leaderboard-podium');
  if (!podiumEl) return;
  if (!list || list.length === 0) {
    podiumEl.innerHTML = '';
    podiumEl.classList.add('hidden');
    return;
  }
  podiumEl.classList.remove('hidden');

  const top1 = list[0];
  const top2 = list[1] || null;
  const top3 = list[2] || null;

  function getCoins(u) {
    const isMe = (appState.profile.googleId && (u.key === appState.profile.googleId || u.googleId === appState.profile.googleId)) ||
                 (u.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase());
    return isMe ? (appState.profile?.coins ?? 0) : (typeof u.coins === 'number' ? u.coins : (u.totalCoinsEarned || 0));
  }

  function getPodiumAvatar(u, sizeClass, ringClass = '') {
    const isMe = (appState.profile.googleId && (u.key === appState.profile.googleId || u.googleId === appState.profile.googleId)) ||
                 (u.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase());
    const isOnline = isMe ? true : Boolean(u.isOnline);
    const statusColor = isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400/60';
    const avatarImg = isAvatarUrl(u.avatar)
      ? `<img referrerpolicy="no-referrer" src="${escapeHtml(u.avatar)}" alt="${escapeHtml(u.nickname || 'Avatar')}" class="${sizeClass} rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 ${ringClass} inline-block" onerror="this.onerror=null;this.outerHTML='<span class=\\'text-xl sm:text-2xl\\'>⚔️</span>'">`
      : `<span class="text-xl sm:text-2xl">${escapeHtml(u.avatar || '⚔️')}</span>`;

    return `
      <div class="relative inline-flex items-center justify-center">
        ${avatarImg}
        <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${statusColor}"></span>
      </div>
    `;
  }

  let html = '';

  // Rank 2 Card (Left / Bạc)
  if (top2) {
    html += `
      <div class="order-1 flex flex-col items-center text-center p-2 sm:p-3.5 rounded-2xl rpg-panel leaderboard-podium-card podium-rank-2 relative">
        <div class="absolute -top-2.5 sm:-top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-xs flex items-center gap-0.5 whitespace-nowrap">
          <span>🥈</span><span>#2</span>
        </div>
        <div class="mt-2 sm:mt-2.5 mb-1 sm:mb-1.5">
          ${getPodiumAvatar(top2, 'w-9 h-9 sm:w-12 sm:h-12')}
        </div>
        <div class="font-bold text-[11px] sm:text-sm text-slate-900 dark:text-slate-100 truncate max-w-[85px] sm:max-w-[130px] md:max-w-[160px]" title="${escapeHtml(top2.nickname)}">
          ${escapeHtml(top2.nickname)}
        </div>
        <div class="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full">
          <span class="font-mono font-semibold text-amber-600 dark:text-amber-400">Lv.${top2.level || 1}</span>
          <span class="hidden md:inline">• ${escapeHtml(top2.title || 'Hiệp Sĩ')}</span>
        </div>
        <div class="mt-1.5 sm:mt-2 font-mono font-bold text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
          ${COIN_ICON_HTML} <span>${getCoins(top2).toLocaleString('vi-VN')}</span>
        </div>
      </div>
    `;
  } else {
    html += `<div class="order-1"></div>`;
  }

  // Rank 1 Card (Center / Vàng) - Taller Elevated
  if (top1) {
    html += `
      <div class="order-2 flex flex-col items-center text-center p-2.5 sm:p-5 rounded-2xl rpg-panel leaderboard-podium-card podium-rank-1 relative -mt-2 sm:-mt-4">
        <div class="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 shadow-sm border border-yellow-300 flex items-center gap-1 whitespace-nowrap">
          <span class="crown-float text-xs sm:text-sm">👑</span><span>#1 QUÁN QUÂN</span>
        </div>
        <div class="mt-2.5 sm:mt-3 mb-1 sm:mb-1.5">
          ${getPodiumAvatar(top1, 'w-11 h-11 sm:w-15 sm:h-15', 'ring-2 sm:ring-4 ring-yellow-400/80 shadow-md')}
        </div>
        <div class="font-black text-xs sm:text-base text-yellow-600 dark:text-yellow-400 truncate max-w-[95px] sm:max-w-[150px] md:max-w-[190px]" title="${escapeHtml(top1.nickname)}">
          ${escapeHtml(top1.nickname)}
        </div>
        <div class="text-[10px] sm:text-xs text-amber-700/90 dark:text-amber-300/90 mt-0.5 truncate max-w-full">
          <span class="font-mono font-bold">Lv.${top1.level || 1}</span>
          <span class="hidden md:inline">• ${escapeHtml(top1.title || 'Vua Đấu Xếp Hạng')}</span>
        </div>
        <div class="mt-1.5 sm:mt-2 font-mono font-extrabold text-xs sm:text-sm text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 bg-amber-500/15 px-2 sm:px-3 py-0.5 rounded-full">
          ${COIN_ICON_HTML} <span>${getCoins(top1).toLocaleString('vi-VN')}</span>
        </div>
      </div>
    `;
  }

  // Rank 3 Card (Right / Đồng)
  if (top3) {
    html += `
      <div class="order-3 flex flex-col items-center text-center p-2 sm:p-3.5 rounded-2xl rpg-panel leaderboard-podium-card podium-rank-3 relative">
        <div class="absolute -top-2.5 sm:-top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs flex items-center gap-0.5 whitespace-nowrap">
          <span>🥉</span><span>#3</span>
        </div>
        <div class="mt-2 sm:mt-2.5 mb-1 sm:mb-1.5">
          ${getPodiumAvatar(top3, 'w-9 h-9 sm:w-12 sm:h-12')}
        </div>
        <div class="font-bold text-[11px] sm:text-sm text-slate-900 dark:text-slate-100 truncate max-w-[85px] sm:max-w-[130px] md:max-w-[160px]" title="${escapeHtml(top3.nickname)}">
          ${escapeHtml(top3.nickname)}
        </div>
        <div class="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full">
          <span class="font-mono font-semibold text-amber-600 dark:text-amber-400">Lv.${top3.level || 1}</span>
          <span class="hidden md:inline">• ${escapeHtml(top3.title || 'Hiệp Sĩ')}</span>
        </div>
        <div class="mt-1.5 sm:mt-2 font-mono font-bold text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
          ${COIN_ICON_HTML} <span>${getCoins(top3).toLocaleString('vi-VN')}</span>
        </div>
      </div>
    `;
  } else {
    html += `<div class="order-3"></div>`;
  }

  podiumEl.innerHTML = html;
}

function renderLeaderboardTable(list) {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;

  const searchQuery = (currentLeaderboardSearch || '').trim().toLowerCase();
  const displayList = searchQuery
    ? list.filter(u => (u.nickname || '').toLowerCase().includes(searchQuery))
    : list;

  if (displayList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs font-medium">🔍 Không tìm thấy hiệp sĩ nào phù hợp với "${escapeHtml(searchQuery)}"</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  displayList.forEach((u, idx) => {
    const isMe = (appState.profile.googleId && (u.key === appState.profile.googleId || u.googleId === appState.profile.googleId)) ||
                 (u.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase());
    const tr = document.createElement('tr');
    tr.className = `hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition ${isMe ? 'bg-amber-500/10 font-bold' : ''}`;

    const actualRank = list.indexOf(u);
    const rankIndex = actualRank >= 0 ? actualRank : idx;
    const medal = rankIndex === 0 ? '🥇' : rankIndex === 1 ? '🥈' : rankIndex === 2 ? '🥉' : `#${rankIndex + 1}`;

    const avatarHtml = isAvatarUrl(u.avatar)
      ? `<img referrerpolicy="no-referrer" src="${escapeHtml(u.avatar)}" alt="${escapeHtml(u.nickname || 'Avatar')}" class="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 inline-block" onerror="this.onerror=null;this.outerHTML='<span class=\\'text-base sm:text-lg shrink-0\\'>⚔️</span>'">`
      : `<span class="text-base sm:text-lg shrink-0">${escapeHtml(u.avatar || '⚔️')}</span>`;

    // Trạng thái trực tuyến & mốc thời gian hoạt động gần nhất
    const isOnline = isMe ? true : Boolean(u.isOnline);
    const lastActiveTime = isMe ? Date.now() : u.lastActive;
    const statusColor = isOnline
      ? 'bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse'
      : 'bg-slate-400/60 ring-2 ring-white dark:ring-slate-900';
    const statusTitle = isOnline
      ? 'Đang trực tuyến'
      : (lastActiveTime ? `Offline (Hoạt động ${formatTimeAgo(lastActiveTime)})` : 'Ngoại tuyến');

    const avatarWithPresence = `
      <div class="relative shrink-0 inline-flex items-center justify-center">
        ${avatarHtml}
        <span class="absolute -bottom-0.5 -right-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full ${statusColor}" title="${escapeHtml(statusTitle)}"></span>
      </div>
    `;

    const statusSubtext = isOnline
      ? '<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-none mt-0.5">Đang online</span>'
      : `<span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-none mt-0.5">Online ${escapeHtml(formatTimeAgo(lastActiveTime))}</span>`;

    const displayCoins = isMe ? (appState.profile?.coins ?? 0) : (typeof u.coins === 'number' ? u.coins : (u.totalCoinsEarned || 0));

    tr.innerHTML = `
      <td class="py-2.5 sm:py-3 px-2 sm:px-4 text-center sm:text-left font-mono whitespace-nowrap ${rankIndex < 3 ? 'text-base sm:text-lg' : 'text-slate-500 text-xs sm:text-sm'}">${medal}</td>
      <td class="py-2.5 sm:py-3 px-2 sm:px-4">
        <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
          ${avatarWithPresence}
          <div class="min-w-0 flex flex-col justify-center">
            <div class="min-w-0 flex items-center flex-wrap gap-1">
              <span class="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[110px] sm:max-w-[180px] md:max-w-[240px]">${escapeHtml(u.nickname)}</span>
              ${u.role === 'admin' ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-purple-500 text-white font-bold whitespace-nowrap">👑 ADMIN</span>' : ''}
              ${isMe ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-bold whitespace-nowrap">BẠN</span>' : ''}
              ${appState.profile.role === 'admin' && !isMe ? `<button class="btn-admin-del text-rose-500 hover:text-rose-700 ml-1 text-xs" data-nick="${escapeHtml(u.nickname || u.key)}" data-key="${escapeHtml(u.key || u.nickname)}" title="Xóa tài khoản này (Quyền Admin)">🗑️</button>` : ''}
            </div>
            <!-- Dòng phụ hiển thị trên mobile -->
            <div class="sm:hidden text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <span class="font-mono font-semibold text-amber-600 dark:text-amber-400">Lv.${u.level || 1}</span>
              <span>•</span>
              <span class="truncate max-w-[100px]">${escapeHtml(u.title || 'Thành viên')}</span>
            </div>
            <!-- Dòng trạng thái online trên desktop / tablet -->
            <div class="hidden sm:block">
              ${statusSubtext}
            </div>
          </div>
        </div>
      </td>
      <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs text-amber-600 dark:text-amber-400/90 hidden sm:table-cell whitespace-nowrap">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">${escapeHtml(u.title || 'Thành viên')}</span>
      </td>
      <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center font-mono text-xs text-slate-600 dark:text-slate-300 hidden sm:table-cell whitespace-nowrap">
        <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold">Lv. ${u.level || 1}</span>
      </td>
      <td class="py-2.5 sm:py-3 px-2 sm:px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap"><span class="inline-flex items-center gap-1 justify-end">${COIN_ICON_HTML} ${displayCoins.toLocaleString('vi-VN')}</span></td>
    `;
    tbody.appendChild(tr);
  });

  if (appState.profile.role === 'admin') {
    tbody.querySelectorAll('.btn-admin-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetNick = btn.dataset.nick;
        const targetKey = btn.dataset.key || targetNick;
        const ok = await confirmAction({
          title: 'Xóa Tài Khoản Leaderboard',
          message: `Bạn có chắc chắn muốn xóa tài khoản "${targetNick}" khỏi Bảng Xếp Hạng?`,
          detail: 'Hành động này có hiệu lực ngay lập tức trên Redis Cloud.',
          confirmText: 'Xóa Vĩnh Viễn',
          cancelText: 'Giữ Lại',
          icon: '🗑️',
          btnColor: 'rose'
        });
        if (!ok) return;
        try {
          const token = appState.profile.googleToken || appState.profile.token || getOrCreateUserToken();
          const res = await fetch('/api/sync?action=admin_remove', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              nickname: appState.profile.nickname,
              targetNickname: targetNick,
              targetSub: targetKey
            })
          });
          if (res.ok) {
            showToast(`Đã xóa "${targetNick}" khỏi hệ thống!`, 'success');
            fetchLeaderboard();
          } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.error || 'Lỗi khi xóa tài khoản', 'error');
          }
        } catch (err) {
          showToast('Lỗi: ' + err.message, 'error');
        }
      });
    });
  }
}

async function fetchLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  const podiumEl = document.getElementById('leaderboard-podium');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs">Đang tải bảng xếp hạng...</td></tr>';

  try {
    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch('/api/sync?action=leaderboard', { headers, credentials: 'include' });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    const list = data.leaderboard || [];
    currentLeaderboardData = list;

    // Cập nhật số lượng người online trên badge
    const onlineBadgeCount = document.getElementById('leaderboard-online-count');
    if (onlineBadgeCount) {
      onlineBadgeCount.textContent = (data.onlineCount || 0).toLocaleString('vi-VN');
    }

    if (list.length === 0) {
      if (podiumEl) { podiumEl.innerHTML = ''; podiumEl.classList.add('hidden'); }
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs">Chưa có ai trên Bảng Xếp Hạng. Hãy đồng bộ tên của bạn để là người đầu tiên!</td></tr>';
      return;
    }

    renderLeaderboardPodium(list);
    renderLeaderboardTable(list);

    updateCheatersBadge();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500 text-xs">Không thể kết nối với Redis Cloud (${err.message}). Bảng xếp hạng tạm thời offline.</td></tr>`;
  }
}

// =============================================================================
// 10.1 CHEATERS HALL OF SHAME FETCHER & SUB-TABS
// =============================================================================
async function updateCheatersBadge() {
  const badge = document.getElementById('badge-cheaters-count');
  if (!badge) return;
  try {
    const res = await fetch('/api/sync?action=cheaters');
    if (!res.ok) return;
    const data = await res.json();
    const count = data.count ?? (data.cheaters ? data.cheaters.length : 0);
    badge.textContent = count;
    if (count > 0) {
      badge.classList.remove('hidden');
      badge.classList.add('inline-flex');
    } else {
      badge.classList.add('hidden');
      badge.classList.remove('inline-flex');
    }
  } catch (e) {}
}

async function fetchCheaters() {
  const tbody = document.getElementById('cheaters-tbody');
  const badge = document.getElementById('badge-cheaters-count');
  const thAdmin = document.getElementById('th-admin-actions');
  const isAdmin = appState.profile.role === 'admin';
  const colSpan = isAdmin ? 5 : 4;

  if (thAdmin) {
    if (isAdmin) {
      thAdmin.classList.remove('hidden');
    } else {
      thAdmin.classList.add('hidden');
    }
  }

  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-8 text-slate-500 text-xs">Đang tải danh sách vi phạm...</td></tr>`;

  try {
    const res = await fetch('/api/sync?action=cheaters');
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    const list = data.cheaters || [];

    if (badge) {
      badge.textContent = list.length;
      if (list.length > 0) {
        badge.classList.remove('hidden');
        badge.classList.add('inline-flex');
      } else {
        badge.classList.add('hidden');
        badge.classList.remove('inline-flex');
      }
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-8 text-slate-500 text-xs font-medium">🕊️ Không có tài khoản nào trong Sổ Đen. Toàn thể hiệp sĩ đều giữ vững kỷ luật và danh dự!</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    list.forEach(c => {
      const isMe = (appState.profile.googleId && (c.key === appState.profile.googleId || c.googleId === appState.profile.googleId)) ||
                   (c.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase());
      const tr = document.createElement('tr');
      tr.className = `hover:bg-rose-500/5 transition ${isMe ? 'bg-rose-500/10 font-bold' : ''}`;

      const avatarHtml = isAvatarUrl(c.avatar)
        ? `<img referrerpolicy="no-referrer" src="${escapeHtml(c.avatar)}" alt="${escapeHtml(c.nickname || 'Avatar')}" class="w-6 h-6 rounded-full object-cover shrink-0 border border-rose-500/30 inline-block" onerror="this.onerror=null;this.outerHTML='<span class=\\'text-base sm:text-lg shrink-0\\'>⚠️</span>'">`
        : `<span class="text-base sm:text-lg shrink-0">${escapeHtml(c.avatar || '⚠️')}</span>`;

      const formattedTime = c.cheatedAt
        ? new Date(c.cheatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
        : 'Gần đây';

      const adminActionHtml = isAdmin ? `
        <td class="py-2.5 sm:py-3 px-2 sm:px-4 text-center whitespace-nowrap">
          <button type="button" class="btn-pardon-row inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm active:scale-95" data-nick="${escapeHtml(c.nickname || c.key)}" data-key="${escapeHtml(c.key || c.nickname)}" title="Ân xá cho tài khoản này">
            <span>🕊️</span>
            <span>Ân Xá</span>
          </button>
        </td>
      ` : '';

      tr.innerHTML = `
        <td class="py-2.5 sm:py-3 px-2 sm:px-4">
          <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
            ${avatarHtml}
            <div class="min-w-0 flex flex-col justify-center">
              <div class="min-w-0 flex items-center flex-wrap gap-1.5">
                <span class="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[120px] sm:max-w-[190px]">${escapeHtml(c.nickname)}</span>
                ${isMe ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold whitespace-nowrap">BẠN</span>' : ''}
              </div>
              <div class="sm:hidden text-[10px] text-rose-500/90 font-mono mt-0.5">
                ${c.cheatStrikes || 1} lần vi phạm • ${formattedTime}
              </div>
            </div>
          </div>
        </td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-xs whitespace-nowrap hidden sm:table-cell">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            ${escapeHtml(c.title || 'Kẻ Gian Lận ⚠️')}
          </span>
        </td>
        <td class="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center font-mono text-xs font-bold text-rose-500 whitespace-nowrap hidden sm:table-cell">
          ${c.cheatStrikes || 1} lần
        </td>
        <td class="py-2.5 sm:py-3 px-2 sm:px-4 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
          ${formattedTime}
        </td>
        ${adminActionHtml}
      `;
      tbody.appendChild(tr);
    });

    if (isAdmin) {
      tbody.querySelectorAll('.btn-pardon-row').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const targetNick = btn.dataset.nick;
          const targetKey = btn.dataset.key || targetNick;
          const ok = await confirmAction({
            title: 'Ân Xá Tài Khoản Gian Lận',
            message: `Bạn có muốn ân xá cho hiệp sĩ "${targetNick}" không?`,
            detail: 'Tài khoản sẽ được xóa trạng thái Kẻ Gian Lận, khôi phục danh hiệu hiệp sĩ và được phép xuất hiện lại trên Bảng Xếp Hạng.',
            confirmText: 'Ân Xá Ngay',
            cancelText: 'Hủy',
            icon: '🕊️',
            btnColor: 'purple'
          });
          if (!ok) return;

          try {
            const token = appState.profile.googleToken || appState.profile.token || getOrCreateUserToken();
            const res = await fetch('/api/sync?action=admin_pardon', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                targetNickname: targetNick,
                targetSub: targetKey
              })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              showToast(data.message || `Đã ân xá cho hiệp sĩ "${targetNick}"!`, 'success');
              await fetchCheaters();
              fetchLeaderboard();
            } else {
              showToast(data.error || 'Không thể ân xá cho tài khoản này', 'error');
            }
          } catch (err) {
            showToast('Lỗi kết nối: ' + err.message, 'error');
          }
        });
      });
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-8 text-slate-500 text-xs">Không thể kết nối danh sách Sổ Đen (${err.message}).</td></tr>`;
  }
}

function switchLeaderboardSubtab(subtab) {
  const btnRanking = document.getElementById('btn-subtab-ranking');
  const btnCheaters = document.getElementById('btn-subtab-cheaters');
  const viewRanking = document.getElementById('view-leaderboard-ranking');
  const viewCheaters = document.getElementById('view-leaderboard-cheaters');

  if (subtab === 'cheaters') {
    if (btnRanking) {
      btnRanking.className = 'px-3.5 py-2 rounded-xl text-xs font-bold transition bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-yellow-500/20 hover:text-yellow-600 dark:hover:text-yellow-400 flex items-center gap-1.5 shrink-0';
    }
    if (btnCheaters) {
      btnCheaters.className = 'px-3.5 py-2 rounded-xl text-xs font-bold transition bg-rose-500 text-white shadow-sm flex items-center gap-1.5 shrink-0';
    }
    if (viewRanking) viewRanking.classList.add('hidden');
    if (viewCheaters) viewCheaters.classList.remove('hidden');
    fetchCheaters();
  } else {
    if (btnRanking) {
      btnRanking.className = 'px-3.5 py-2 rounded-xl text-xs font-black transition bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 shadow-sm shadow-yellow-500/20 flex items-center gap-1.5 shrink-0';
    }
    if (btnCheaters) {
      btnCheaters.className = 'px-3.5 py-2 rounded-xl text-xs font-bold transition bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-500/20 hover:text-rose-500 flex items-center gap-1.5 shrink-0';
    }
    if (viewRanking) viewRanking.classList.remove('hidden');
    if (viewCheaters) viewCheaters.classList.add('hidden');
    fetchLeaderboard();
  }
}
window.switchLeaderboardSubtab = switchLeaderboardSubtab;
window.fetchCheaters = fetchCheaters;
