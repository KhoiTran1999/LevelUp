// =============================================================================
// 11. ADMIN DASHBOARD & USER MANAGEMENT
// =============================================================================
let adminUsersList = [];
let adminSearchQuery = '';
let adminCurrentFilter = 'all';

function getAdminAuthToken() {
  return appState?.profile?.sessionToken || appState?.profile?.googleToken || appState?.profile?.token || getOrCreateUserToken();
}

function isUserAdmin() {
  if (appState?.profile?.role === 'admin') return true;
  const nick = (appState?.profile?.nickname || '').toLowerCase().trim();
  const email = (appState?.profile?.googleEmail || '').toLowerCase().trim();
  const adminNicks = ['admin', 'guildmaster', 'khoitran', 'khoi tran', 'khôi trần'];
  const adminEmails = ['admin@gmail.com', 'guildmaster@gmail.com', 'tranquockhoi1999@gmail.com', 'khoitran200199@gmail.com'];
  if (adminNicks.includes(nick) || adminEmails.includes(email)) {
    if (appState?.profile) appState.profile.role = 'admin';
    return true;
  }
  return false;
}

function updateAdminNavVisibility() {
  const isAdmin = isUserAdmin();
  const navAdmin = document.getElementById('nav-tab-admin');
  const mobileNavAdmin = document.getElementById('mobile-nav-admin');
  if (navAdmin) {
    navAdmin.classList.toggle('hidden', !isAdmin);
    navAdmin.classList.toggle('flex', isAdmin);
  }
  if (mobileNavAdmin) {
    mobileNavAdmin.classList.toggle('hidden', !isAdmin);
    mobileNavAdmin.classList.toggle('flex', isAdmin);
  }
}

async function fetchAdminUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-500 text-xs">Đang tải danh sách người chơi...</td></tr>';

  try {
    const token = getAdminAuthToken();
    const res = await fetch('/api/sync?action=admin_list_users', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 403) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-rose-500 text-xs font-bold">⚠️ Bạn không có quyền truy cập Bảng Điều Khiển Quản Trị Viên.</td></tr>';
      showToast('Bạn không có quyền quản trị viên.', 'error');
      return;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    adminUsersList = Array.isArray(data.users) ? data.users : [];

    // Cập nhật 4 thẻ KPI Stats
    const totalUsers = adminUsersList.length;
    let totalCoins = 0;
    let totalLevels = 0;
    let cheatersCount = 0;
    let overdueCount = 0;

    adminUsersList.forEach(u => {
      totalCoins += (typeof u.coins === 'number' ? u.coins : 0);
      totalLevels += (u.level || 1);
      if (u.isCheater) cheatersCount++;
      if (u.bank?.loan?.isOverdue || u.bank?.isFrozen) overdueCount++;
    });

    const statTotalUsers = document.getElementById('admin-stat-total-users');
    const statTotalCoins = document.getElementById('admin-stat-total-coins');
    const statAvgLevel = document.getElementById('admin-stat-avg-level');
    const statCheaters = document.getElementById('admin-stat-cheaters-count');
    const elAdminOverdue = document.getElementById('admin-bank-overdue-count');

    if (statTotalUsers) statTotalUsers.textContent = totalUsers.toLocaleString('vi-VN');
    if (statTotalCoins) statTotalCoins.textContent = totalCoins.toLocaleString('vi-VN');
    if (statAvgLevel) statAvgLevel.textContent = `Lv. ${totalUsers > 0 ? (totalLevels / totalUsers).toFixed(1) : 1}`;
    if (statCheaters) statCheaters.textContent = cheatersCount.toString();
    if (elAdminOverdue) elAdminOverdue.textContent = overdueCount.toString();

    // Tải thông tin tài chính Ngân hàng và Kho bạc cho Admin
    try {
      const bankRes = await fetch('/api/sync?action=bank_state', { credentials: 'include' });
      if (bankRes.ok) {
        const bData = await bankRes.json();
        if (bData.pool) {
          renderAdminBankTelemetry(bData.pool, bData.rates);
        }
      }
    } catch (_) {}

    renderAdminDashboard();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-rose-500 text-xs">Lỗi khi tải dữ liệu: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function handleAdminSearch(query) {
  adminSearchQuery = (query || '').trim().toLowerCase();
  renderAdminDashboard();
}

function setAdminFilter(filter) {
  adminCurrentFilter = filter;
  document.querySelectorAll('.admin-filter-btn').forEach(btn => {
    btn.className = 'admin-filter-btn px-3 py-1 rounded-xl text-xs font-semibold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white';
  });
  const activeBtn = document.getElementById(`admin-filter-${filter}`);
  if (activeBtn) {
    activeBtn.className = 'admin-filter-btn px-3 py-1 rounded-xl text-xs font-bold transition bg-purple-600 text-white shadow-xs';
  }
  renderAdminDashboard();
}

function renderAdminDashboard() {
  const tbody = document.getElementById('admin-users-tbody');
  const cardsContainer = document.getElementById('admin-users-cards');
  const emptyEl = document.getElementById('admin-users-empty');
  if (!tbody && !cardsContainer) return;

  // Lọc theo search & category filter
  const filtered = adminUsersList.filter(u => {
    // 1. Category Filter
    if (adminCurrentFilter === 'adventurer' && (u.role === 'admin' || u.isCheater)) return false;
    if (adminCurrentFilter === 'admin' && u.role !== 'admin') return false;
    if (adminCurrentFilter === 'cheater' && !u.isCheater) return false;

    // 2. Search Query
    if (adminSearchQuery) {
      const nick = (u.nickname || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const sub = (u.sub || '').toLowerCase();
      if (!nick.includes(adminSearchQuery) && !email.includes(adminSearchQuery) && !sub.includes(adminSearchQuery)) {
        return false;
      }
    }
    return true;
  });

  if (emptyEl) emptyEl.classList.toggle('hidden', filtered.length > 0);

  if (filtered.length === 0) {
    if (tbody) tbody.innerHTML = '';
    if (cardsContainer) cardsContainer.innerHTML = '';
    return;
  }

  if (tbody) tbody.innerHTML = '';
  if (cardsContainer) cardsContainer.innerHTML = '';

  filtered.forEach(u => {
    const isMe = (appState.profile.googleId && u.sub === appState.profile.googleId) ||
                 (u.nickname?.toLowerCase() === appState.profile.nickname?.toLowerCase());

    const avatarHtml = isAvatarUrl(u.avatar)
      ? `<img referrerpolicy="no-referrer" src="${escapeHtml(u.avatar)}" alt="${escapeHtml(u.nickname || 'Avatar')}" class="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700" onerror="this.onerror=null;this.outerHTML='<span class=\\'text-xl shrink-0\\'>⚔️</span>'">`
      : `<span class="text-xl shrink-0">${escapeHtml(u.avatar || '⚔️')}</span>`;

    const statusBadge = u.isCheater
      ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap">⚠️ Gian Lận</span>'
      : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">✅ Hiệp Sĩ</span>';

    const roleBadge = u.role === 'admin'
      ? '<span class="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-bold whitespace-nowrap">👑 ADMIN</span>'
      : '';

    const youBadge = isMe
      ? '<span class="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold whitespace-nowrap">BẠN</span>'
      : '';

    // 1. Render Table Row (Desktop & Tablet / iPad)
    if (tbody) {
      const tr = document.createElement('tr');
      tr.className = `hover:bg-slate-50 dark:hover:bg-slate-900/60 transition ${isMe ? 'bg-purple-500/5 dark:bg-purple-950/20' : ''}`;
      tr.innerHTML = `
        <td class="py-2.5 sm:py-3 px-3 sm:px-4">
          <div class="flex items-center gap-2.5 min-w-0">
            ${avatarHtml}
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px] md:max-w-[180px] lg:max-w-[240px]">${escapeHtml(u.nickname || 'Chưa đặt tên')}</span>
                ${roleBadge}
                ${youBadge}
              </div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[150px] md:max-w-[200px] lg:max-w-[260px]">${escapeHtml(u.email || u.sub || '')}</div>
            </div>
          </div>
        </td>
        <td class="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
          Lv. ${u.level || 1}
        </td>
        <td class="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
          <span class="inline-flex items-center gap-1 justify-end">${COIN_ICON_HTML} ${(u.coins ?? 0).toLocaleString('vi-VN')}</span>
        </td>
        <td class="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
          📜 ${u.ledgerCount ?? 0}
        </td>
        <td class="py-2.5 sm:py-3 px-3 sm:px-4 text-center whitespace-nowrap">
          ${statusBadge}
        </td>
        <td class="py-2.5 sm:py-3 px-3 sm:px-4 text-center whitespace-nowrap">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="openAdminEditUserModal('${escapeHtml(u.sub)}')" class="p-2 rounded-xl text-purple-600 hover:bg-purple-500/10 border border-purple-500/20 transition active:scale-95 cursor-pointer" title="Tinh chỉnh Vàng & Level">
              ✏️
            </button>
            <button onclick="openAdminUserLedgerModal('${escapeHtml(u.sub)}')" class="p-2 rounded-xl text-amber-600 hover:bg-amber-500/10 border border-amber-500/20 transition active:scale-95 cursor-pointer" title="Xem & Xóa Lịch sử thu chi">
              📜
            </button>
            ${!isMe ? `<button onclick="adminDeleteUser('${escapeHtml(u.sub)}', '${escapeHtml(u.nickname || u.sub)}')" class="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition active:scale-95 cursor-pointer" title="Xóa tài khoản khỏi hệ thống">🗑️</button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    }

    // 2. Render Mobile Card (Phone View < md)
    if (cardsContainer) {
      const card = document.createElement('div');
      card.className = `rpg-panel p-3.5 rounded-2xl space-y-2.5 border transition ${isMe ? 'border-purple-500/40 bg-purple-500/5 dark:bg-purple-950/20' : 'border-slate-200 dark:border-slate-800/80'}`;
      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            ${avatarHtml}
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate max-w-[140px]">${escapeHtml(u.nickname || 'Chưa đặt tên')}</span>
                ${roleBadge}
                ${youBadge}
              </div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[180px]">${escapeHtml(u.email || u.sub || '')}</div>
            </div>
          </div>
          <div class="shrink-0">
            ${statusBadge}
          </div>
        </div>

        <div class="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-center">
          <div>
            <div class="text-[9px] text-slate-400 font-medium">Cấp Độ</div>
            <div class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">Lv. ${u.level || 1}</div>
          </div>
          <div class="border-x border-slate-200 dark:border-slate-800">
            <div class="text-[9px] text-slate-400 font-medium">Vàng</div>
            <div class="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">${(u.coins ?? 0).toLocaleString('vi-VN')}</div>
          </div>
          <div>
            <div class="text-[9px] text-slate-400 font-medium">Sổ Cái</div>
            <div class="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">${u.ledgerCount ?? 0} mục</div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 pt-0.5">
          <button onclick="openAdminEditUserModal('${escapeHtml(u.sub)}')" class="flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/25 transition active:scale-95 cursor-pointer">
            <span>✏️</span> <span>Tinh Chỉnh</span>
          </button>
          <button onclick="openAdminUserLedgerModal('${escapeHtml(u.sub)}')" class="flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/25 transition active:scale-95 cursor-pointer">
            <span>📜</span> <span>Lịch Sử</span>
          </button>
          ${!isMe ? `
            <button onclick="adminDeleteUser('${escapeHtml(u.sub)}', '${escapeHtml(u.nickname || u.sub)}')" class="flex items-center justify-center py-2 px-3 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 transition active:scale-95 cursor-pointer" title="Xóa tài khoản">
              <span>🗑️</span>
            </button>
          ` : ''}
        </div>
      `;
      cardsContainer.appendChild(card);
    }
  });
}

function openAdminEditUserModal(sub) {
  const user = adminUsersList.find(u => u.sub === sub);
  if (!user) {
    showToast('Không tìm thấy thông tin người chơi.', 'error');
    return;
  }

  const subInput = document.getElementById('admin-edit-sub');
  const avatarEl = document.getElementById('admin-edit-avatar');
  const nickEl = document.getElementById('admin-edit-nickname');
  const roleBadge = document.getElementById('admin-edit-role-badge');
  const emailEl = document.getElementById('admin-edit-email');
  const titleEl = document.getElementById('admin-edit-badge-title');
  const statsEl = document.getElementById('admin-edit-current-stats');
  const coinsInput = document.getElementById('admin-edit-coins');
  const levelInput = document.getElementById('admin-edit-level');
  const expInput = document.getElementById('admin-edit-exp');
  const reasonInput = document.getElementById('admin-edit-reason');

  if (subInput) subInput.value = user.sub;
  if (nickEl) nickEl.textContent = user.nickname || 'Chưa đặt tên';
  if (roleBadge) {
    roleBadge.textContent = user.role === 'admin' ? '👑 Admin' : 'Hiệp sĩ';
    roleBadge.className = user.role === 'admin'
      ? 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600 text-white'
      : 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  }
  if (emailEl) emailEl.textContent = user.email || user.sub || '';
  if (titleEl) titleEl.textContent = user.title || 'Hiệp sĩ';
  if (statsEl) statsEl.textContent = `Lv. ${user.level || 1} • ${(user.coins ?? 0).toLocaleString('vi-VN')} Vàng`;

  if (avatarEl) {
    if (isAvatarUrl(user.avatar)) {
      avatarEl.innerHTML = `<img referrerpolicy="no-referrer" src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.nickname || 'Avatar')}" class="w-full h-full object-cover" onerror="this.onerror=null;this.parentElement.textContent='⚔️'">`;
    } else {
      avatarEl.textContent = user.avatar || '⚔️';
    }
  }

  if (coinsInput) coinsInput.value = user.coins ?? 0;
  if (levelInput) levelInput.value = user.level || 1;
  if (expInput) expInput.value = user.exp || 0;
  if (reasonInput) reasonInput.value = '';

  const cheaterRadios = document.querySelectorAll('input[name="admin-edit-cheater"]');
  cheaterRadios.forEach(radio => {
    radio.checked = (radio.value === (user.isCheater ? 'true' : 'false'));
  });

  openModal('modal-admin-edit-user');
}

function adminQuickAddCoins(delta) {
  const input = document.getElementById('admin-edit-coins');
  if (!input) return;
  const current = Math.max(0, parseInt(input.value, 10) || 0);
  input.value = current + delta;
  sfx.playClick();
}

function adminQuickAddLevel(delta) {
  const input = document.getElementById('admin-edit-level');
  if (!input) return;
  const current = Math.max(1, parseInt(input.value, 10) || 1);
  input.value = Math.min(100, current + delta);
  sfx.playClick();
}

async function submitAdminUserEdit() {
  const targetSub = document.getElementById('admin-edit-sub')?.value;
  const coins = parseInt(document.getElementById('admin-edit-coins')?.value, 10);
  const level = parseInt(document.getElementById('admin-edit-level')?.value, 10);
  const exp = parseInt(document.getElementById('admin-edit-exp')?.value, 10);
  const reason = document.getElementById('admin-edit-reason')?.value.trim();
  const cheaterRadio = document.querySelector('input[name="admin-edit-cheater"]:checked');
  const isCheater = cheaterRadio ? cheaterRadio.value === 'true' : false;

  if (!targetSub) {
    showToast('Thiếu thông tin người chơi.', 'error');
    return;
  }
  if (isNaN(coins) || coins < 0) {
    showToast('Số Vàng phải là số nguyên lớn hơn hoặc bằng 0.', 'error');
    return;
  }
  if (isNaN(level) || level < 1 || level > 100) {
    showToast('Cấp độ phải từ 1 đến 100.', 'error');
    return;
  }

  const btnSave = document.getElementById('btn-admin-save-user');
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.innerHTML = '<span>⏳</span> Đang lưu...';
  }

  try {
    const token = getAdminAuthToken();
    const res = await fetch('/api/sync?action=admin_update_user', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        targetSub,
        coins,
        level,
        exp: isNaN(exp) ? 0 : exp,
        isCheater,
        reason: reason || '👑 Quản trị viên tinh chỉnh chỉ số'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi cập nhật người chơi.');
    }

    // Nếu sửa chính tài khoản đang đăng nhập của Admin: Cập nhật live UI ngay lập tức
    const mySub = appState.profile.googleId || appState.profile.sub;
    const myNick = (appState.profile.nickname || '').toLowerCase().trim();
    const myEmail = (appState.profile.email || '').toLowerCase().trim();
    const targetUser = Array.isArray(adminUsersList) ? adminUsersList.find(u => u.sub === targetSub) : null;
    const isSelf = Boolean(
      (mySub && targetSub === mySub) ||
      (targetUser && mySub && targetUser.sub === mySub) ||
      (targetUser && myNick && targetUser.nickname?.toLowerCase().trim() === myNick) ||
      (targetUser && myEmail && targetUser.email?.toLowerCase().trim() === myEmail) ||
      (myNick && targetSub.toLowerCase().trim() === myNick)
    );
    if (isSelf) {
      appState.profile.coins = coins;
      appState.profile.level = level;
      appState.profile.exp = isNaN(exp) ? 0 : exp;
      appState.profile.totalCoinsEarned = Math.max(coins, appState.profile.totalCoinsEarned || 20);
      appState.profile.adminAdjusted = true;
      const now = Date.now();
      appState.lastModified = now;
      appState.lastSyncedAt = now;
      if (isCheater) {
        appState.profile.isCheater = true;
        appState.profile.title = 'Kẻ Gian Lận ⚠️';
      } else {
        appState.profile.isCheater = false;
        updateTitleByLevel();
      }
      renderAll();
    }

    // Gửi tín hiệu thông báo đa tab qua BroadcastChannel để các tab khác tự động nạp dữ liệu mới
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const syncChannel = new BroadcastChannel('levelup_sync_channel');
        syncChannel.postMessage({
          type: 'ADMIN_SYNC_UPDATE',
          targetSub,
          timestamp: Date.now()
        });
        syncChannel.close();
      } catch (_) {}
    }

    showToast(data.message || 'Cập nhật chỉ số người chơi thành công!', 'success');
    closeModal('modal-admin-edit-user');
    fetchAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerHTML = '<span>💾</span> Lưu Tinh Chỉnh';
    }
  }
}

let adminSelectedLedgerIds = new Set();

function updateAdminLedgerBulkBar() {
  const bulkBar = document.getElementById('admin-ledger-bulk-bar');
  const countEl = document.getElementById('admin-ledger-selected-count');
  const textEl = document.getElementById('btn-admin-delete-selected-text');
  const selectAllCb = document.getElementById('admin-ledger-select-all');
  const count = adminSelectedLedgerIds.size;

  if (countEl) countEl.textContent = count.toString();
  if (textEl) textEl.textContent = `Xóa ${count} mục đã chọn`;
  if (bulkBar) bulkBar.classList.toggle('hidden', count === 0);

  const allCbs = document.querySelectorAll('.admin-ledger-cb');
  if (selectAllCb && allCbs.length > 0) {
    selectAllCb.checked = allCbs.length === count;
    selectAllCb.indeterminate = count > 0 && count < allCbs.length;
  } else if (selectAllCb) {
    selectAllCb.checked = false;
    selectAllCb.indeterminate = false;
  }
}

function onAdminLedgerItemCheck(cb, entryId) {
  if (cb.checked) {
    adminSelectedLedgerIds.add(entryId);
  } else {
    adminSelectedLedgerIds.delete(entryId);
  }
  updateAdminLedgerBulkBar();
}

function toggleAdminLedgerSelectAll(checked) {
  const allCbs = document.querySelectorAll('.admin-ledger-cb');
  allCbs.forEach(cb => {
    cb.checked = checked;
    const id = cb.dataset.id;
    if (id) {
      if (checked) {
        adminSelectedLedgerIds.add(id);
      } else {
        adminSelectedLedgerIds.delete(id);
      }
    }
  });
  updateAdminLedgerBulkBar();
}

function clearAdminLedgerSelection() {
  adminSelectedLedgerIds.clear();
  const allCbs = document.querySelectorAll('.admin-ledger-cb');
  allCbs.forEach(cb => { cb.checked = false; });
  const selectAllCb = document.getElementById('admin-ledger-select-all');
  if (selectAllCb) {
    selectAllCb.checked = false;
    selectAllCb.indeterminate = false;
  }
  updateAdminLedgerBulkBar();
}

async function adminDeleteSelectedLedgerEntries() {
  const sub = document.getElementById('admin-ledger-sub')?.value;
  if (!sub) return;

  const count = adminSelectedLedgerIds.size;
  if (count === 0) {
    showToast('Chưa chọn giao dịch nào để xóa.', 'info');
    return;
  }

  const ok = await confirmAction({
    title: `Xóa ${count} Giao Dịch`,
    message: `Bạn có chắc chắn muốn xóa đồng loạt ${count} bản ghi giao dịch đã chọn khỏi sổ cái?`,
    detail: 'Hành động này sẽ xóa vĩnh viễn các bản ghi được chọn trên Redis Cloud.',
    confirmText: `Xóa ${count} Bản Ghi`,
    cancelText: 'Hủy',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!ok) return;

  try {
    const token = getAdminAuthToken();
    const res = await fetch('/api/sync?action=admin_clear_user_ledger', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        targetSub: sub,
        entryIds: Array.from(adminSelectedLedgerIds)
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi khi xóa giao dịch đã chọn.');

    showToast(data.message || `Đã xóa thành công ${count} giao dịch đã chọn!`, 'success');
    adminSelectedLedgerIds.clear();
    openAdminUserLedgerModal(sub);
    fetchAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openAdminUserLedgerModal(sub) {
  const user = adminUsersList.find(u => u.sub === sub);
  const titleEl = document.getElementById('admin-ledger-title');
  const subInput = document.getElementById('admin-ledger-sub');
  const container = document.getElementById('admin-ledger-container');
  const countEl = document.getElementById('admin-ledger-total-count');
  const emptyEl = document.getElementById('admin-ledger-empty');

  clearAdminLedgerSelection();

  if (subInput) subInput.value = sub;
  if (titleEl) titleEl.textContent = `LỊCH SỬ THU CHI: ${user?.nickname || sub}`;
  if (container) container.innerHTML = '<div class="p-8 text-center text-slate-500 text-xs">Đang tải lịch sử giao dịch...</div>';
  if (emptyEl) emptyEl.classList.add('hidden');

  openModal('modal-admin-user-ledger');

  try {
    const token = getAdminAuthToken();
    const res = await fetch(`/api/sync?action=admin_get_user_ledger&targetSub=${encodeURIComponent(sub)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const ledger = Array.isArray(data.ledger) ? data.ledger : [];
    if (countEl) countEl.textContent = ledger.length.toString();

    if (ledger.length === 0) {
      if (container) container.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }

    if (container) {
      container.innerHTML = '';
      ledger.forEach(entry => {
        const itemEl = document.createElement('div');
        itemEl.className = 'p-3 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs hover:border-purple-500/30 transition';

        const isEarn = entry.type === 'earn';
        const isSpend = entry.type === 'spend';
        const typeBadge = isEarn
          ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">+ Thu</span>'
          : (isSpend ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">- Chi</span>' : '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap">👑 Admin</span>');

        const dateStr = entry.timestamp ? new Date(entry.timestamp).toLocaleString('vi-VN') : 'Giao dịch cũ';
        const amountStr = entry.amount !== undefined ? `${isSpend ? '-' : '+'}${entry.amount} Vàng` : '';

        itemEl.innerHTML = `
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <label class="p-1 -m-1 cursor-pointer shrink-0 flex items-center">
              <input type="checkbox" class="admin-ledger-cb w-4 h-4 sm:w-5 sm:h-5 rounded text-purple-600 accent-purple-600 cursor-pointer shrink-0" data-id="${escapeHtml(entry.id)}" onchange="onAdminLedgerItemCheck(this, '${escapeHtml(entry.id)}')">
            </label>
            ${typeBadge}
            <div class="min-w-0 flex-1">
              <div class="font-bold text-slate-800 dark:text-slate-200 truncate">${escapeHtml(entry.title || 'Giao dịch')}</div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate">${escapeHtml(entry.description || '')}</div>
              <div class="text-[9px] text-slate-400 font-mono mt-0.5">${dateStr}</div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="font-mono font-bold text-xs sm:text-sm ${isSpend ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">${amountStr}</span>
            <button onclick="adminDeleteLedgerEntry('${escapeHtml(sub)}', '${escapeHtml(entry.id)}')" class="p-1.5 sm:p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition active:scale-95 cursor-pointer" title="Xóa bản ghi này">
              🗑️
            </button>
          </div>
        `;
        container.appendChild(itemEl);
      });
    }
  } catch (err) {
    if (container) container.innerHTML = `<div class="p-8 text-center text-rose-500 text-xs font-semibold">Lỗi tải lịch sử: ${escapeHtml(err.message)}</div>`;
  }
}

async function adminDeleteLedgerEntry(sub, entryId) {
  const ok = await confirmAction({
    title: 'Xóa Giao Dịch',
    message: 'Bạn có chắc chắn muốn xóa bản ghi giao dịch này khỏi sổ cái người chơi?',
    detail: 'Hành động này sẽ được áp dụng trực tiếp lên Redis Cloud.',
    confirmText: 'Xóa Bản Ghi',
    cancelText: 'Hủy',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!ok) return;

  try {
    const token = getAdminAuthToken();
    const res = await fetch('/api/sync?action=admin_clear_user_ledger', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        targetSub: sub,
        entryId
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi xóa giao dịch.');

    showToast(data.message || 'Đã xóa bản ghi thành công.', 'success');
    openAdminUserLedgerModal(sub);
    fetchAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function adminPurgeUserLedger() {
  const sub = document.getElementById('admin-ledger-sub')?.value;
  if (!sub) return;

  const ok = await confirmAction({
    title: 'Xóa Sạch Lịch Sử Thu Chi',
    message: 'Bạn có chắc chắn muốn XÓA SẠCH toàn bộ lịch sử thu chi của người chơi này?',
    detail: 'Toàn bộ giao dịch sẽ bị xóa và thay thế bằng 1 bản ghi hệ thống mới.',
    confirmText: 'Xóa Sạch Ngay',
    cancelText: 'Giữ Lại',
    icon: '🧹',
    btnColor: 'rose'
  });
  if (!ok) return;

  try {
    const token = getAdminAuthToken();
    const res = await fetch('/api/sync?action=admin_clear_user_ledger', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        targetSub: sub,
        entryId: 'all'
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi dọn dẹp lịch sử.');

    showToast(data.message || 'Đã dọn dẹp sạch toàn bộ lịch sử thu chi!', 'success');
    openAdminUserLedgerModal(sub);
    fetchAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function adminDeleteUser(sub, nickname) {
  const ok = await confirmAction({
    title: 'Xóa Tài Khoản Khỏi Hệ Thống',
    message: `Bạn có chắc chắn muốn XÓA HOÀN TOÀN tài khoản "${nickname}" khỏi hệ thống LevelUp?`,
    detail: 'Hồ sơ người dùng, điểm Leaderboard và toàn bộ dữ liệu trên Redis sẽ bị xóa vĩnh viễn.',
    confirmText: 'Xóa Vĩnh Viễn',
    cancelText: 'Hủy',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!ok) return;

  try {
    const token = getAdminAuthToken();
    const res = await fetch('/api/sync?action=admin_remove', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        targetSub: sub,
        targetNickname: nickname
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi khi xóa tài khoản.');

    showToast(`Đã xóa thành công tài khoản "${nickname}".`, 'success');
    fetchAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.fetchAdminUsers = fetchAdminUsers;
window.handleAdminSearch = handleAdminSearch;
window.setAdminFilter = setAdminFilter;
window.openAdminEditUserModal = openAdminEditUserModal;
window.adminQuickAddCoins = adminQuickAddCoins;
window.adminQuickAddLevel = adminQuickAddLevel;
window.submitAdminUserEdit = submitAdminUserEdit;
window.openAdminUserLedgerModal = openAdminUserLedgerModal;
window.toggleAdminLedgerSelectAll = toggleAdminLedgerSelectAll;
window.onAdminLedgerItemCheck = onAdminLedgerItemCheck;
window.clearAdminLedgerSelection = clearAdminLedgerSelection;
window.adminDeleteSelectedLedgerEntries = adminDeleteSelectedLedgerEntries;
window.adminDeleteLedgerEntry = adminDeleteLedgerEntry;
window.adminPurgeUserLedger = adminPurgeUserLedger;
window.adminDeleteUser = adminDeleteUser;
window.updateAdminNavVisibility = updateAdminNavVisibility;
