// =============================================================================
// 13.5. ONBOARDING INTERACTIVE TOUR ENGINE
// =============================================================================
let currentTourStep = 0;
let isTourActive = false;
let tourResizeScrollHandler = null;
let tourKeydownHandler = null;

const TOUR_STEPS = [
  {
    id: 'profile',
    title: 'Hồ Sơ & Trạng Thái Hiệp Sĩ',
    icon: '🛡️',
    tab: 'quests',
    getTarget: () => document.getElementById('open-profile-btn'),
    desc: 'Theo dõi Cấp độ, EXP và Vàng tích lũy. Dữ liệu tự động đồng bộ qua Google. Nhấn vào đây để đổi Avatar, biệt danh hoặc xem lịch sử giao dịch.'
  },
  {
    id: 'add-quest',
    title: 'Giao Nhiệm Vụ & Trợ Lý AI',
    icon: '⚔️',
    tab: 'quests',
    getTarget: () => {
      const mobBtn = document.getElementById('btn-open-add-quest-mobile');
      if (window.innerWidth < 768 && mobBtn && mobBtn.offsetParent !== null) return mobBtn;
      return document.getElementById('btn-open-add-quest');
    },
    desc: 'Tạo nhiệm vụ mới (phím tắt Q). Trợ lý AI sẽ tự động định Hạng (S/A/B/C/D), thưởng Vàng và EXP tương xứng với độ khó nhiệm vụ.'
  },
  {
    id: 'focus-timer',
    title: 'Đồng Hồ Đếm Giờ Tập Trung',
    icon: '⏱️',
    tab: 'quests',
    getTarget: () => {
      const banner = document.getElementById('active-focus-banner');
      if (banner && !banner.classList.contains('hidden') && banner.offsetParent !== null) return banner;
      const questList = document.getElementById('quests-grid') || document.getElementById('quest-list');
      if (questList && questList.offsetParent !== null) return questList;
      return document.getElementById('tab-quests');
    },
    desc: 'Bấm "Bắt Đầu" trên nhiệm vụ bất kỳ để chạy đếm giờ tập trung (phím tắt Space để tạm dừng/tiếp tục). Kích hoạt Chế độ Toàn màn hình giúp tập trung tối đa và loại bỏ xao nhãng.'
  },
  {
    id: 'shop',
    title: 'Cửa Hàng & Kho Phần Thưởng',
    icon: '🎁',
    tab: 'shop',
    getTarget: () => {
      if (window.innerWidth < 768) {
        return document.querySelector('.mobile-nav-btn[data-tab="shop"]');
      }
      return document.querySelector('.nav-tab[data-tab="shop"]');
    },
    desc: 'Dùng Vàng đổi các phần thưởng giải trí yêu thích (chơi game, xem phim, cà phê...). Bấm "Dùng Quà" để đếm ngược thời gian thư giãn mà không sợ quá đà.'
  },
  {
    id: 'leaderboard',
    title: 'Bảng Xếp Hạng Hiệp Sĩ',
    icon: '🏆',
    tab: 'leaderboard',
    getTarget: () => {
      if (window.innerWidth < 768) {
        return document.querySelector('.mobile-nav-btn[data-tab="leaderboard"]');
      }
      return document.querySelector('.nav-tab[data-tab="leaderboard"]');
    },
    desc: 'Vinh danh Top người chăm chỉ nhất dựa trên Cấp độ và EXP kiếm được. Hãy hoàn thành nhiệm vụ hàng ngày để thăng hạng và vươn lên dẫn đầu!'
  }
];

function updateTourPosition() {
  if (!isTourActive) return;
  const overlay = document.getElementById('tour-overlay');
  const card = document.getElementById('tour-card');
  const targetBox = document.getElementById('tour-target-box');
  const tourHole = document.getElementById('tour-hole');
  const tourArrow = document.getElementById('tour-arrow');
  if (!overlay || !card || !targetBox || !tourHole) return;

  const step = TOUR_STEPS[currentTourStep];
  if (!step) return;

  const targetEl = step.getTarget ? step.getTarget() : null;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  if (targetEl && targetEl.offsetParent !== null) {
    const rect = targetEl.getBoundingClientRect();
    const pad = 6;
    const tTop = Math.max(0, rect.top - pad);
    const tLeft = Math.max(0, rect.left - pad);
    const tWidth = Math.min(viewportW - tLeft, rect.width + pad * 2);
    const tHeight = Math.min(viewportH - tTop, rect.height + pad * 2);

    // Cập nhật lỗ cắt spotlight trên mặt nạ SVG
    tourHole.setAttribute('x', tLeft);
    tourHole.setAttribute('y', tTop);
    tourHole.setAttribute('width', tWidth);
    tourHole.setAttribute('height', tHeight);
    tourHole.setAttribute('rx', '14');

    // Cập nhật khung viền phát sáng bám theo phần tử
    targetBox.style.display = 'block';
    targetBox.style.top = `${tTop}px`;
    targetBox.style.left = `${tLeft}px`;
    targetBox.style.width = `${tWidth}px`;
    targetBox.style.height = `${tHeight}px`;

    // Định vị hộp thoại popover card
    const cardW = Math.min(viewportW - 32, 420);
    card.style.width = `${cardW}px`;
    const cardH = card.offsetHeight || 220;

    const spaceBelow = viewportH - (tTop + tHeight);
    const spaceAbove = tTop;

    let cardTop = 0;
    let cardLeft = 0;
    let arrowPlacement = 'top';

    if (viewportW < 640) {
      cardLeft = Math.max(16, (viewportW - cardW) / 2);
      if (spaceBelow >= cardH + 16) {
        cardTop = tTop + tHeight + 12;
        arrowPlacement = 'top';
      } else if (spaceAbove >= cardH + 16) {
        cardTop = Math.max(16, tTop - cardH - 12);
        arrowPlacement = 'bottom';
      } else {
        cardTop = Math.max(16, (viewportH - cardH) / 2);
        arrowPlacement = 'none';
      }
    } else {
      if (spaceBelow >= cardH + 20) {
        cardTop = tTop + tHeight + 14;
        arrowPlacement = 'top';
      } else if (spaceAbove >= cardH + 20) {
        cardTop = Math.max(16, tTop - cardH - 14);
        arrowPlacement = 'bottom';
      } else {
        cardTop = Math.max(20, (viewportH - cardH) / 2);
        arrowPlacement = 'none';
      }

      const targetCenter = tLeft + tWidth / 2;
      cardLeft = targetCenter - cardW / 2;
      cardLeft = Math.max(16, Math.min(viewportW - cardW - 16, cardLeft));
    }

    cardTop = Math.max(16, Math.min(viewportH - cardH - 16, cardTop));
    card.style.top = `${cardTop}px`;
    card.style.left = `${cardLeft}px`;

    if (tourArrow) {
      if (arrowPlacement === 'top') {
        tourArrow.classList.remove('hidden');
        tourArrow.style.top = '-6px';
        tourArrow.style.bottom = 'auto';
        const arrowLeft = Math.max(16, Math.min(cardW - 24, (tLeft + tWidth / 2) - cardLeft - 6));
        tourArrow.style.left = `${arrowLeft}px`;
      } else if (arrowPlacement === 'bottom') {
        tourArrow.classList.remove('hidden');
        tourArrow.style.bottom = '-6px';
        tourArrow.style.top = 'auto';
        const arrowLeft = Math.max(16, Math.min(cardW - 24, (tLeft + tWidth / 2) - cardLeft - 6));
        tourArrow.style.left = `${arrowLeft}px`;
      } else {
        tourArrow.classList.add('hidden');
      }
    }
  } else {
    tourHole.setAttribute('width', '0');
    tourHole.setAttribute('height', '0');
    targetBox.style.display = 'none';
    if (tourArrow) tourArrow.classList.add('hidden');

    const cardW = Math.min(viewportW - 32, 420);
    card.style.width = `${cardW}px`;
    const cardH = card.offsetHeight || 220;
    card.style.top = `${Math.max(20, (viewportH - cardH) / 2)}px`;
    card.style.left = `${Math.max(16, (viewportW - cardW) / 2)}px`;
  }
}

function renderTourStep(index) {
  if (index < 0 || index >= TOUR_STEPS.length) {
    finishTour(true);
    return;
  }

  currentTourStep = index;
  const step = TOUR_STEPS[index];

  const card = document.getElementById('tour-card');
  if (card) card.classList.remove('hidden');

  if (step.tab) {
    switchTab(step.tab);
  }

  const pill = document.getElementById('tour-step-pill');
  if (pill) pill.textContent = `Bước ${index + 1} / ${TOUR_STEPS.length}`;

  const icon = document.getElementById('tour-step-icon');
  if (icon) icon.textContent = step.icon;

  const title = document.getElementById('tour-step-title');
  if (title) title.textContent = step.title;

  const desc = document.getElementById('tour-step-desc');
  if (desc) desc.textContent = step.desc;

  const dotsContainer = document.getElementById('tour-dots');
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    TOUR_STEPS.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `tour-dot ${i === index ? 'active' : ''}`;
      dot.setAttribute('title', `Bước ${i + 1}: ${TOUR_STEPS[i].title}`);
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        renderTourStep(i);
      });
      dotsContainer.appendChild(dot);
    });
  }

  const prevBtn = document.getElementById('btn-tour-prev');
  if (prevBtn) {
    if (index > 0) {
      prevBtn.classList.remove('hidden');
    } else {
      prevBtn.classList.add('hidden');
    }
  }

  const nextBtnText = document.getElementById('btn-tour-next-text');
  const nextBtnIcon = document.getElementById('btn-tour-next-icon');
  if (nextBtnText) {
    nextBtnText.textContent = (index === TOUR_STEPS.length - 1) ? 'Bắt Đầu Ngay' : 'Tiếp theo';
  }
  if (nextBtnIcon) {
    nextBtnIcon.textContent = (index === TOUR_STEPS.length - 1) ? '🚀' : '➡️';
  }

  requestAnimationFrame(() => {
    const targetEl = step.getTarget ? step.getTarget() : null;
    if (targetEl && targetEl.offsetParent !== null) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    setTimeout(updateTourPosition, 120);
  });
}

function startInteractiveTour(force = false) {
  if (!force && localStorage.getItem('levelup_tour_completed') === 'true') {
    return;
  }

  const welcomeModal = document.getElementById('modal-welcome');
  if (welcomeModal && !welcomeModal.classList.contains('hidden')) {
    return;
  }

  // Đóng các modal khác nếu đang mở trước khi bắt đầu tour
  const openModals = Array.from(document.querySelectorAll('.fixed[id^="modal-"]:not(#modal-welcome):not(.hidden)'));
  for (const m of openModals) m.classList.add('hidden');

  const overlay = document.getElementById('tour-overlay');
  if (!overlay) return;

  const card = document.getElementById('tour-card');
  if (card) card.classList.remove('hidden');

  isTourActive = true;
  currentTourStep = 0;
  overlay.classList.remove('hidden');

  renderTourStep(0);

  if (!tourResizeScrollHandler) {
    let ticking = false;
    tourResizeScrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateTourPosition();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('resize', tourResizeScrollHandler, { passive: true });
    window.addEventListener('scroll', tourResizeScrollHandler, { passive: true });
  }

  if (!tourKeydownHandler) {
    tourKeydownHandler = (e) => {
      if (!isTourActive) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        nextTourStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevTourStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishTour(false);
      }
    };
    window.addEventListener('keydown', tourKeydownHandler);
  }
}

function nextTourStep() {
  if (!isTourActive) return;
  sfx.playClick();
  if (currentTourStep < TOUR_STEPS.length - 1) {
    renderTourStep(currentTourStep + 1);
  } else {
    finishTour(true);
  }
}

function prevTourStep() {
  if (!isTourActive) return;
  sfx.playClick();
  if (currentTourStep > 0) {
    renderTourStep(currentTourStep - 1);
  }
}

function finishTour(completed = true) {
  if (!isTourActive) return;
  isTourActive = false;

  const overlay = document.getElementById('tour-overlay');
  if (overlay) overlay.classList.add('hidden');

  if (tourResizeScrollHandler) {
    window.removeEventListener('resize', tourResizeScrollHandler);
    window.removeEventListener('scroll', tourResizeScrollHandler);
    tourResizeScrollHandler = null;
  }

  if (tourKeydownHandler) {
    window.removeEventListener('keydown', tourKeydownHandler);
    tourKeydownHandler = null;
  }

  switchTab('quests');

  try {
    localStorage.setItem('levelup_tour_completed', 'true');
  } catch (_) {}

  if (completed) {
    if (sfx && typeof sfx.playLevelUp === 'function') {
      sfx.playLevelUp();
    }
    showToast('🎉 Chúc mừng bạn đã hoàn thành tour giới thiệu! Hãy tạo nhiệm vụ đầu tiên nào!', 'success');
  } else {
    showToast('Bạn có thể xem lại tour hướng dẫn bất kỳ lúc nào trong Hồ Sơ (Profile).', 'info');
  }
}

function initTourControls() {
  const nextBtn = document.getElementById('btn-tour-next');
  if (nextBtn) nextBtn.addEventListener('click', nextTourStep);

  const prevBtn = document.getElementById('btn-tour-prev');
  if (prevBtn) prevBtn.addEventListener('click', prevTourStep);

  const skipBtn = document.getElementById('btn-tour-skip');
  if (skipBtn) skipBtn.addEventListener('click', () => finishTour(false));

  const skipTopBtn = document.getElementById('btn-tour-skip-top');
  if (skipTopBtn) skipTopBtn.addEventListener('click', () => finishTour(false));

  const replayBtn = document.getElementById('btn-replay-tour');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      closeModal('modal-profile');
      startInteractiveTour(true);
    });
  }
}

async function initStartupFlow() {
  clearLegacyLocalStorage();
  clearLocalCache();

  // ponytail: Sử dụng skeleton loading khi chờ dữ liệu từ Redis thay vì load default data gây chớp nháy (Anti-FOUC)
  renderSkeletons();

  restoreFocusTimer();
  initWelcomeModal();
  initTourControls();

  try {
    const res = await fetch('/api/sync', {
      method: 'GET',
      credentials: 'include'
    });

    if (res.status === 200) {
      const result = await res.json().catch(() => ({}));
      if (result.found && result.data) {
        appState = normalizeObjectNFC({
          ...DEFAULT_STATE,
          ...result.data,
          profile: {
            ...DEFAULT_STATE.profile,
            ...(result.data.profile || {})
          }
        });
        if (result.sessionToken || result.data?.profile?.sessionToken) {
          appState.profile.sessionToken = result.sessionToken || result.data?.profile?.sessionToken;
        }
        const balance = deriveLegitimateBalance(appState);
        appState.profile.coins = balance.coins;
        appState.profile.totalCoinsEarned = balance.totalCoinsEarned;
        applyTheme(appState.profile.theme || 'dark');
        saveLocalCache();
        closeModal('modal-welcome');
        renderAll();
        restoreFocusTimer();
        const pendingProofQuest = (appState.quests || []).find(q => q.focusTimerCompleted && q.requiresProof && !q._proofVerified && q.status !== 'completed');
        if (pendingProofQuest) {
          const proofModal = document.getElementById('modal-quest-proof');
          const isModalOpen = proofModal && !proofModal.classList.contains('hidden');
          if (!isModalOpen) {
            showToast(`📸 Nhiệm vụ "${pendingProofQuest.title}" đã hoàn thành thời gian! Hãy bấm "Chụp Ảnh Nhận Vàng" để AI duyệt thưởng.`, 'info');
          }
        }
        return;
      }
    } else if (res.status === 401) {
      clearLocalCache();
      appState = { ...DEFAULT_STATE };
      applyTheme(appState.profile.theme || 'dark');
      renderAll();
      openModal('modal-welcome');
      renderGoogleSignInButton();
      return;
    }
  } catch (err) {
    console.warn('Startup sync check failed:', err.message);
  }

  applyTheme(appState.profile.theme || 'dark');
  renderAll();
  openModal('modal-welcome');
  renderGoogleSignInButton();
}
