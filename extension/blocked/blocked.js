// =============================================================================
// LevelUp Focus Shield — Blocked Page Logic
// =============================================================================

const ARBITER_QUOTES = [
  '"Cám dỗ nhất thời không xứng đáng để ngươi đánh đổi chuỗi ngày kiên trì và danh dự mạo hiểm giả!"',
  '"Một hiệp sĩ chân chính không bao giờ gục ngã trước vài phút lướt mạng vô bổ!"',
  '"Vàng và danh vọng chỉ trao cho kẻ biết giữ vững kỷ luật. Hãy hoàn thành nhiệm vụ!"',
  '"Mọi giấc mơ lớn đều được xây đắp từ những phiên tập trung nhỏ này. Đừng bỏ cuộc!"',
  '"Kẻ gian lận tìm lý do, người kiên trì tìm giải pháp. Mau quay lại trận chiến!"'
];

let remainingSeconds = 1500;
let totalSeconds = 1500;
let timerInterval = null;

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function initBlockedPage() {
  // 1. Pick a random Arbiter Quote
  const quoteEl = document.getElementById('arbiter-quote');
  if (quoteEl) {
    quoteEl.textContent = ARBITER_QUOTES[Math.floor(Math.random() * ARBITER_QUOTES.length)];
  }

  // Display blocked domain name if present
  try {
    const params = new URLSearchParams(window.location.search);
    const rawBlocked = params.get('blockedUrl') || '';
    if (rawBlocked) {
      const u = new URL(rawBlocked);
      const domainEl = document.getElementById('blocked-target-domain');
      if (domainEl) domainEl.textContent = u.hostname;
    }
  } catch (_) {}

  // 2. Record blocked attempt
  try {
    const res = await chrome.runtime.sendMessage({ type: 'RECORD_BLOCKED_ATTEMPT' });
    if (res && typeof res.blockedCountToday === 'number') {
      const countEl = document.getElementById('blocked-count');
      if (countEl) countEl.textContent = res.blockedCountToday;
    }
  } catch (_) {}

  // 3. Fetch Status from Extension Background
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (res?.success && res.data) {
      const { focusState, blockedCountToday } = res.data;

      const countEl = document.getElementById('blocked-count');
      if (countEl && typeof blockedCountToday === 'number') {
        countEl.textContent = blockedCountToday;
      }

      if (focusState) {
        const titleEl = document.getElementById('quest-title');
        const iconEl = document.getElementById('quest-icon');
        const rankEl = document.getElementById('quest-rank');
        const rewardEl = document.getElementById('quest-reward');

        if (titleEl && focusState.questTitle) titleEl.textContent = focusState.questTitle;
        if (iconEl && focusState.questIcon) iconEl.textContent = focusState.questIcon;
        if (rankEl && focusState.questRank) rankEl.textContent = `Nhiệm Vụ Hạng ${focusState.questRank}`;
        if (rewardEl && focusState.rewardCoins) rewardEl.textContent = `+${focusState.rewardCoins} Vàng`;

        // Calculate accurate countdown with delta-time
        const elapsed = Math.floor((Date.now() - (focusState.updatedAt || Date.now())) / 1000);
        remainingSeconds = Math.max(0, (focusState.remainingSeconds || 0) - elapsed);
        totalSeconds = Math.max(focusState.totalSeconds || 1500, remainingSeconds);

        startLocalCountdown();
      }
    }
  } catch (err) {
    console.warn('[LevelUp Shield] Failed to load status:', err);
    startLocalCountdown();
  }

  // 4. Attach Event Listeners
  const returnBtn = document.getElementById('btn-return-guild');
  if (returnBtn) {
    returnBtn.addEventListener('click', async () => {
      try {
        await chrome.runtime.sendMessage({ type: 'FOCUS_OR_OPEN_LEVELUP' });
        window.close();
      } catch (_) {
        window.location.href = 'http://localhost:3000';
      }
    });
  }

  const optionsLink = document.getElementById('btn-options-link');
  if (optionsLink) {
    optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options/options.html'));
      }
    });
  }

  // Emergency Pass Modal Handlers
  const emergencyBtn = document.getElementById('btn-emergency-pass');
  const modal = document.getElementById('modal-emergency');
  const cancelBtn = document.getElementById('btn-cancel-pass');
  const confirmBtn = document.getElementById('btn-confirm-pass');

  if (emergencyBtn && modal) {
    emergencyBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });
  }

  if (cancelBtn && modal) {
    cancelBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  if (confirmBtn && modal) {
    confirmBtn.addEventListener('click', async () => {
      // Temporarily toggle shield off for 2 minutes
      try {
        await chrome.runtime.sendMessage({ type: 'TOGGLE_SHIELD_MANUAL', active: false });
        alert('Khiên đã tạm thời hạ trong 2 phút! Hãy nhanh chóng hoàn thành việc cần thiết và quay lại tập trung.');
        modal.classList.add('hidden');
        history.back();
      } catch (_) {
        modal.classList.add('hidden');
      }
    });
  }
}

function startLocalCountdown() {
  const countdownEl = document.getElementById('timer-countdown');
  const progressBar = document.getElementById('timer-progress-bar');

  function update() {
    if (countdownEl) countdownEl.textContent = formatTime(remainingSeconds);
    if (progressBar && totalSeconds > 0) {
      const pct = Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100));
      progressBar.style.width = `${pct}%`;
    }

    if (remainingSeconds <= 0) {
      if (timerInterval) clearInterval(timerInterval);
      if (countdownEl) countdownEl.textContent = 'HOÀN THÀNH!';
      setTimeout(() => {
        alert('🎉 Chúc mừng! Phiên tập trung của bạn đã hoàn thành!');
        history.back();
      }, 500);
    } else {
      remainingSeconds--;
    }
  }

  update();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(update, 1000);
}

document.addEventListener('DOMContentLoaded', initBlockedPage);
