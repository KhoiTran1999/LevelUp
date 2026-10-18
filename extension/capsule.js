// =============================================================================
// LevelUp — Mini Floating Capsule HUD (Content Script for all pages)
// Zero-footprint, draggable floating timer capsule injected via Shadow DOM
// =============================================================================

(() => {
  // Prevent duplicate injection in the same document
  if (window.__LEVELUP_CAPSULE_ACTIVE__) {
    // If already active, trigger an immediate refresh
    if (typeof window.__LEVELUP_CAPSULE_REFRESH__ === 'function') {
      window.__LEVELUP_CAPSULE_REFRESH__();
    }
    return;
  }
  window.__LEVELUP_CAPSULE_ACTIVE__ = true;

  // Don't render on LevelUp web app itself
  const loc = window.location;
  if (loc.hostname === 'localhost' ||
      loc.hostname === '127.0.0.1' ||
      loc.hostname.endsWith('vercel.app') ||
      document.documentElement.dataset.levelupExtensionInstalled === 'true' ||
      window.__LEVELUP_EXTENSION_INSTALLED__) {
    return;
  }

  let hostEl = null;
  let shadowRoot = null;
  let timerInterval = null;
  let currentFocusState = null;
  let wasDismissedThisSession = false;
  // Clear any legacy sessionStorage key so F5 or reload immediately restores it
  try {
    sessionStorage.removeItem('levelup_capsule_dismissed');
  } catch (_) {}

  // Dragging state
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let hasMoved = false;

  function formatTime(sec) {
    const total = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function applyHostPosition(x = null, y = null) {
    if (!hostEl) return;
    if (typeof x === 'number' && typeof y === 'number') {
      hostEl.style.setProperty('left', `${x}px`, 'important');
      hostEl.style.setProperty('top', `${y}px`, 'important');
      hostEl.style.setProperty('right', 'auto', 'important');
      hostEl.style.setProperty('bottom', 'auto', 'important');
    } else {
      hostEl.style.setProperty('right', '24px', 'important');
      hostEl.style.setProperty('bottom', '24px', 'important');
      hostEl.style.setProperty('left', 'auto', 'important');
      hostEl.style.setProperty('top', 'auto', 'important');
    }
  }

  function createCapsuleDOM() {
    if (hostEl) return;

    hostEl = document.createElement('div');
    hostEl.id = 'levelup-floating-capsule-host';
    hostEl.style.setProperty('position', 'fixed', 'important');
    hostEl.style.setProperty('z-index', '2147483647', 'important');
    hostEl.style.setProperty('display', 'block', 'important');
    hostEl.style.setProperty('width', 'auto', 'important');
    hostEl.style.setProperty('height', 'auto', 'important');
    hostEl.style.setProperty('margin', '0', 'important');
    hostEl.style.setProperty('padding', '0', 'important');
    hostEl.style.setProperty('background', 'transparent', 'important');
    hostEl.style.setProperty('border', 'none', 'important');
    hostEl.style.setProperty('pointer-events', 'auto', 'important');
    hostEl.style.setProperty('user-select', 'none', 'important');
    hostEl.style.setProperty('-webkit-user-select', 'none', 'important');

    // Restore saved position or default to bottom-right
    let savedPos = null;
    try {
      const raw = sessionStorage.getItem('levelup_capsule_pos');
      if (raw) savedPos = JSON.parse(raw);
    } catch (_) {}

    if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
      const clampedX = Math.max(8, Math.min(window.innerWidth - 85, savedPos.x));
      const clampedY = Math.max(8, Math.min(window.innerHeight - 45, savedPos.y));
      applyHostPosition(clampedX, clampedY);
    } else {
      applyHostPosition();
    }

    shadowRoot = hostEl.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          user-select: none;
          -webkit-user-select: none;
        }

        .capsule-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1.5px solid rgba(99, 102, 241, 0.55);
          border-radius: 9999px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.35);
          color: #f8fafc;
          cursor: grab;
          transition: transform 0.18s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.18s ease, border-color 0.18s ease;
          animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          font-size: 13px;
        }

        .capsule-pill:hover {
          transform: translateY(-2px) scale(1.03);
          border-color: rgba(129, 140, 248, 0.9);
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.7), 0 0 26px rgba(99, 102, 241, 0.55);
        }

        .capsule-pill:active {
          cursor: grabbing;
          transform: scale(0.98);
        }

        @keyframes popIn {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .pulse-indicator {
          width: 8px;
          height: 8px;
          background-color: #10b981;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulseGreen 1.6s infinite;
        }

        @keyframes pulseGreen {
          0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .timer-digits {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 14px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.4px;
          line-height: 1;
        }

        .btn-dismiss {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.12);
          color: #94a3b8;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: bold;
          line-height: 1;
          margin-left: 1px;
          transition: background 0.15s, color 0.15s;
        }

        .btn-dismiss:hover {
          background: rgba(244, 63, 94, 0.35);
          color: #fda4af;
        }
      </style>

      <div class="capsule-pill" id="capsule-pill" title="Kéo để di chuyển • Bấm để quay về tab LevelUp">
        <span class="pulse-indicator"></span>
        <span id="capsule-timer" class="timer-digits">25:00</span>
        <button id="capsule-dismiss" class="btn-dismiss" title="Tạm ẩn trên trang này" type="button">×</button>
      </div>
    `;

    // Append to documentElement so it cannot be clipped by body overflow: hidden (e.g. in Notion)
    const targetParent = document.documentElement || document.body;
    targetParent.appendChild(hostEl);
    setupEvents();
  }

  function setupEvents() {
    if (!shadowRoot) return;

    const pill = shadowRoot.getElementById('capsule-pill');
    const dismissBtn = shadowRoot.getElementById('capsule-dismiss');

    if (dismissBtn) {
      dismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        wasDismissedThisSession = true;
        removeCapsuleDOM();
      });
    }

    pill.addEventListener('mousedown', (e) => {
      if (e.target === dismissBtn || dismissBtn.contains(e.target)) return;

      isDragging = true;
      hasMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      const rect = hostEl.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - dragStartX;
        const dy = moveEvent.clientY - dragStartY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasMoved = true;
        }

        const pillRect = pill ? pill.getBoundingClientRect() : rect;
        const pillW = pillRect.width || 80;
        const pillH = pillRect.height || 34;

        const maxLeft = Math.max(6, window.innerWidth - pillW - 6);
        const maxTop = Math.max(6, window.innerHeight - pillH - 6);

        const newLeft = Math.max(6, Math.min(maxLeft, initialLeft + dx));
        const newTop = Math.max(6, Math.min(maxTop, initialTop + dy));

        applyHostPosition(newLeft, newTop);
      };

      const onMouseUp = () => {
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (hasMoved) {
          const rect = hostEl.getBoundingClientRect();
          try {
            sessionStorage.setItem('levelup_capsule_pos', JSON.stringify({ x: rect.left, y: rect.top }));
          } catch (_) {}
        } else {
          // If clicked without dragging, switch to LevelUp tab
          returnToLevelUp();
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  function removeCapsuleDOM() {
    if (hostEl) {
      hostEl.remove();
      hostEl = null;
      shadowRoot = null;
    }
  }

  function returnToLevelUp() {
    try {
      chrome.runtime.sendMessage({ type: 'FOCUS_OR_OPEN_LEVELUP' });
    } catch (_) {}
  }

  function updateCapsuleDisplay() {
    const isRunning = Boolean(currentFocusState && currentFocusState.isRunning && !currentFocusState.isBreakMode);

    if (!isRunning) {
      wasDismissedThisSession = false;
      removeCapsuleDOM();
      return;
    }

    if (wasDismissedThisSession) {
      removeCapsuleDOM();
      return;
    }

    if (!hostEl) {
      createCapsuleDOM();
    }

    if (!shadowRoot) return;

    const baseRemaining = Number(currentFocusState.remainingSeconds) || 0;
    const updatedAt = Number(currentFocusState.updatedAt) || Date.now();
    const elapsed = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
    const currentRemaining = Math.max(0, baseRemaining - elapsed);

    const timerEl = shadowRoot.getElementById('capsule-timer');
    if (timerEl) timerEl.textContent = formatTime(currentRemaining);

    if (currentRemaining <= 0) {
      removeCapsuleDOM();
    }
  }

  function syncAndTick() {
    chrome.storage.local.get(['focusState', 'isShieldActive'], (data) => {
      if (chrome.runtime.lastError) return;

      currentFocusState = data.focusState || null;
      updateCapsuleDisplay();
    });
  }

  window.__LEVELUP_CAPSULE_REFRESH__ = syncAndTick;

  // Initial check
  syncAndTick();

  // Tick countdown locally every 1 second
  timerInterval = setInterval(() => {
    if (currentFocusState && currentFocusState.isRunning) {
      updateCapsuleDisplay();
    }
  }, 1000);

  // Listen to storage changes for instant sync across tabs
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes.focusState) {
      const oldState = currentFocusState;
      currentFocusState = changes.focusState.newValue || null;
      // Only reset dismiss when a completely new session starts
      if (!oldState?.isRunning && currentFocusState?.isRunning) {
        wasDismissedThisSession = false;
      }
      updateCapsuleDisplay();
    }
  });

  // Listen to runtime messages
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'TIMER_STATE_CHANGED') {
      const oldState = currentFocusState;
      currentFocusState = message.state;
      if (!oldState?.isRunning && currentFocusState?.isRunning) {
        wasDismissedThisSession = false;
      }
      updateCapsuleDisplay();
    } else if (message?.type === 'RESTORE_CAPSULE' || message?.type === 'SHOW_CAPSULE_NOW') {
      wasDismissedThisSession = false;
      updateCapsuleDisplay();
    }
  });
})();
