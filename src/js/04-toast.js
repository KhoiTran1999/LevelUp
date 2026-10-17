// =============================================================================
// 4. TOAST NOTIFICATIONS & RPG HELPERS
// =============================================================================
// ponytail: single in-flight confirm modal; upgrade to queue if concurrent dialogs needed
let activeConfirmResolve = null;

function confirmAction({
  title = 'Xác Nhận',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  detail = '',
  confirmText = 'Xác Nhận',
  cancelText = 'Hủy',
  icon = '❓',
  btnColor = 'amber',
  onConfirm = null,
  onCancel = null
} = {}) {
  return new Promise((resolve) => {
    if (activeConfirmResolve) {
      activeConfirmResolve(false);
      activeConfirmResolve = null;
    }

    const modal = document.getElementById('modal-confirm');
    if (!modal) {
      const res = window.confirm(`${title}\n${message}`);
      if (res && typeof onConfirm === 'function') onConfirm();
      if (!res && typeof onCancel === 'function') onCancel();
      return resolve(res);
    }

    activeConfirmResolve = (result) => {
      if (result && typeof onConfirm === 'function') {
        try { onConfirm(); } catch (err) { console.error(err); }
      } else if (!result && typeof onCancel === 'function') {
        try { onCancel(); } catch (err) { console.error(err); }
      }
      resolve(result);
    };

    const iconEl = document.getElementById('confirm-modal-icon');
    const titleEl = document.getElementById('confirm-modal-title');
    const descEl = document.getElementById('confirm-modal-desc');
    const detailEl = document.getElementById('confirm-modal-detail');
    const cancelBtn = document.getElementById('btn-confirm-cancel');
    const okBtn = document.getElementById('btn-confirm-ok');

    if (iconEl) iconEl.textContent = icon;
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = message;

    if (detailEl) {
      if (detail) {
        detailEl.textContent = detail;
        detailEl.classList.remove('hidden');
      } else {
        detailEl.textContent = '';
        detailEl.classList.add('hidden');
      }
    }

    if (cancelBtn) cancelBtn.textContent = cancelText;

    if (okBtn) {
      okBtn.textContent = confirmText;
      okBtn.className = 'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-md active:scale-95 text-slate-950';
      if (btnColor === 'emerald') {
        okBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500', 'text-white', 'shadow-emerald-600/20');
      } else if (btnColor === 'rose') {
        okBtn.classList.add('bg-rose-600', 'hover:bg-rose-500', 'text-white', 'shadow-rose-600/20');
      } else if (btnColor === 'cyan') {
        okBtn.classList.add('bg-cyan-600', 'hover:bg-cyan-500', 'text-white', 'shadow-cyan-600/20');
      } else {
        okBtn.classList.add('bg-amber-500', 'hover:bg-amber-400', 'text-slate-950', 'shadow-amber-500/20');
      }
    }

    modal.classList.remove('hidden');
    sfx.playClick();
  });
}

function closeConfirmDialog(result = false) {
  const modal = document.getElementById('modal-confirm');
  if (modal) modal.classList.add('hidden');
  if (activeConfirmResolve) {
    const cb = activeConfirmResolve;
    activeConfirmResolve = null;
    cb(result);
  }
}

let lastToastMessage = '';
let lastToastTime = 0;

// ponytail: single action button per toast; upgrade to list if multiple concurrent actions needed
function showToast(message, type = 'info', action = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const now = Date.now();
  if (message === lastToastMessage && (now - lastToastTime < 3000)) {
    return; // Bỏ qua thông báo trùng lặp trong 3 giây
  }
  lastToastMessage = message;
  lastToastTime = now;

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-white/95 text-slate-800 border-emerald-300/80 dark:bg-slate-900/95 dark:text-slate-100 dark:border-emerald-500/40',
    gold: 'bg-white/95 text-slate-800 border-amber-300/80 dark:bg-slate-900/95 dark:text-slate-100 dark:border-amber-500/40',
    error: 'bg-white/95 text-slate-800 border-rose-300/80 dark:bg-slate-900/95 dark:text-slate-100 dark:border-rose-500/40',
    info: 'bg-white/95 text-slate-800 border-slate-200/90 dark:bg-slate-900/95 dark:text-slate-100 dark:border-slate-700/60'
  };

  const icons = {
    success: '<div class="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm"><span class="material-symbols-outlined text-[18px] leading-none">check_circle</span></div>',
    gold: `<div class="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm text-base leading-none">${COIN_ICON_HTML}</div>`,
    error: '<div class="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-sm"><span class="material-symbols-outlined text-[18px] leading-none">error</span></div>',
    info: '<div class="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-sm"><span class="material-symbols-outlined text-[18px] leading-none">notifications</span></div>'
  };

  toast.className = `p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs backdrop-blur-md pointer-events-auto transition-all duration-300 transform -translate-y-2 opacity-0 border ${colors[type] || colors.info}`;

  let isDismissed = false;
  const dismiss = () => {
    if (isDismissed) return;
    isDismissed = true;
    toast.classList.add('toast-exit', 'opacity-0', '-translate-y-2');
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 280);
  };

  const content = document.createElement('div');
  content.className = 'flex items-center gap-2.5 min-w-0 flex-1';
  content.innerHTML = `${icons[type] || icons.info}<span class="break-words font-medium text-xs sm:text-[13px] leading-snug">${escapeHtml(message)}</span>`;
  toast.appendChild(content);

  if (action && typeof action.onClick === 'function') {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer';
    actionBtn.innerHTML = `<span class="material-symbols-outlined text-[15px] leading-none">undo</span><span>${escapeHtml(action.label || 'Hoàn tác')}</span>`;
    actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
      action.onClick();
    });
    toast.appendChild(actionBtn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'shrink-0 w-7 h-7 -mr-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition flex items-center justify-center cursor-pointer';
  closeBtn.setAttribute('aria-label', 'Đóng thông báo');
  closeBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] leading-none">close</span>';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dismiss();
  });
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  // Trigger anim
  setTimeout(() => {
    toast.classList.remove('-translate-y-2', 'opacity-0');
  }, 10);

  const duration = action ? 6500 : 3500;
  setTimeout(() => {
    dismiss();
  }, duration);
}

function calculateRank(coins) {
  if (coins <= 5) return 'E';
  if (coins <= 12) return 'D';
  if (coins <= 25) return 'C';
  if (coins <= 45) return 'B';
  if (coins <= 75) return 'A';
  return 'S';
}

function triggerRpgCelebration(type = 'levelup') {
  try {
    if (typeof window !== 'undefined' && typeof window.confetti === 'function') {
      if (type === 'levelup') {
        window.confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#fbbf24', '#fef08a', '#6366f1', '#a855f7']
        });
        setTimeout(() => {
          if (typeof window !== 'undefined' && typeof window.confetti === 'function') {
            window.confetti({
              particleCount: 45,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors: ['#f59e0b', '#ffd700', '#ffffff']
            });
            window.confetti({
              particleCount: 45,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors: ['#f59e0b', '#ffd700', '#ffffff']
            });
          }
        }, 200);
      } else if (type === 's_rank') {
        window.confetti({
          particleCount: 65,
          spread: 80,
          origin: { y: 0.65 },
          colors: ['#ef4444', '#f59e0b', '#ec4899', '#8b5cf6']
        });
      } else {
        window.confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#f59e0b', '#10b981', '#3b82f6']
        });
      }
    }
  } catch (e) {}
}

function addEXP(amount) {
  appState.profile.exp += amount;
  let leveledUp = false;
  while (appState.profile.exp >= appState.profile.level * 100) {
    appState.profile.exp -= appState.profile.level * 100;
    appState.profile.level += 1;
    leveledUp = true;
  }
  if (leveledUp) {
    sfx.playFanfare();
    showToast(`🎉 CHÚC MỪNG! BẠN ĐÃ LÊN CẤP ${appState.profile.level}!`, 'gold');
    updateTitleByLevel();
    triggerRpgCelebration('levelup');
  }
}

// ponytail: Thu hồi EXP đa tầng, nếu EXP về âm thì hạ cấp độ tương ứng xuống và đổi phần dư
function deductEXP(amount) {
  let expToDeduct = Math.max(0, parseInt(amount, 10) || 0);
  while (expToDeduct > 0) {
    if (appState.profile.exp >= expToDeduct) {
      appState.profile.exp -= expToDeduct;
      expToDeduct = 0;
    } else {
      expToDeduct -= appState.profile.exp;
      if (appState.profile.level > 1) {
        appState.profile.level -= 1;
        appState.profile.exp = appState.profile.level * 100;
      } else {
        appState.profile.exp = 0;
        expToDeduct = 0;
      }
    }
  }
  updateTitleByLevel();
}

function updateTitleByLevel() {
  const isOverdue = Boolean(appState.profile?.bank?.loan?.isOverdue);
  if (isOverdue) {
    appState.profile.title = 'Con Nợ Quá Hạn ⚠️';
    return;
  }
  const lvl = appState.profile.level;
  if (lvl >= 20) appState.profile.title = 'Huyền Thoại Kỷ Luật';
  else if (lvl >= 15) appState.profile.title = 'Bậc Thầy Năng Suất';
  else if (lvl >= 10) appState.profile.title = 'Chuyên Gia Tập Trung';
  else if (lvl >= 6) appState.profile.title = 'Chiến Binh Kiên Trì';
  else if (lvl >= 3) appState.profile.title = 'Học Viên Chăm Chỉ';
  else appState.profile.title = 'Tân Binh Cấp 1';
}
