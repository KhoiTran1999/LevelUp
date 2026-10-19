// =============================================================================
// LevelUp — Mini Floating Capsule HUD (Content Script for all pages)
// Zero-footprint, draggable floating timer capsule injected via Shadow DOM
// Contains: Transparent Glassmorphic Capsule (Green / Red), Countdown Timer,
// Dismiss "×" Button, Fullscreen Center Warning on Blocked Pages with
// Gentle Floating Motion, and 8-bit Celebration Fireworks
// =============================================================================

(() => {
  // Prevent duplicate injection in the same document
  if (window.__LEVELUP_CAPSULE_ACTIVE__) {
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
  let isShieldActive = false;
  let blacklist = [];
  let whitelist = [];
  let mascotEnabled = true;
  let soundEnabled = true;
  let wasDismissedThisSession = false;

  // Dragging state for the corner pill
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let hasMoved = false;

  // Flight state for random gentle floating on blocked pages
  let isFlyingActive = false;
  let isFlightPaused = false;
  let flightTimeout = null;
  let resumeFlightTimeout = null;

  // Clear legacy dismissal on fresh navigation
  try {
    sessionStorage.removeItem('levelup_capsule_dismissed');
  } catch (_) {}

  // =============================================================================
  // 8-BIT AUDIO SYNTHESIZER (Web Audio API - Optional, for completion fireworks)
  // =============================================================================
  function createAudioCtx() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      return AudioCtx ? new AudioCtx() : null;
    } catch (_) {
      return null;
    }
  }

  function play8BitVictorySound() {
    if (!soundEnabled) return;
    try {
      const ctx = createAudioCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const now = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.08, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    } catch (_) {}
  }

  // =============================================================================
  // HELPERS
  // =============================================================================
  function formatTime(sec) {
    const total = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function checkIsCurrentPageDistraction() {
    if (!isShieldActive) return false;
    const currentHost = window.location.hostname.toLowerCase().replace(/^www\./, '');
    if (!currentHost) return false;

    // Check whitelist first
    for (const w of whitelist) {
      const cleanW = String(w).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
      if (cleanW && (currentHost === cleanW || currentHost.endsWith('.' + cleanW))) {
        return false;
      }
    }

    // Check blacklist
    for (const b of blacklist) {
      const cleanB = String(b).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
      if (cleanB && (currentHost === cleanB || currentHost.endsWith('.' + cleanB))) {
        return true;
      }
    }
    return false;
  }

  function applyCapsulePosition(x = null, y = null) {
    if (!shadowRoot) return;
    const pill = shadowRoot.getElementById('capsule-pill');
    if (!pill) return;
    if (typeof x === 'number' && typeof y === 'number') {
      pill.style.setProperty('left', `${x}px`, 'important');
      pill.style.setProperty('top', `${y}px`, 'important');
      pill.style.setProperty('right', 'auto', 'important');
      pill.style.setProperty('bottom', 'auto', 'important');
    } else {
      pill.style.setProperty('right', '24px', 'important');
      pill.style.setProperty('bottom', '24px', 'important');
      pill.style.setProperty('left', 'auto', 'important');
      pill.style.setProperty('top', 'auto', 'important');
    }
  }

  function returnToLevelUp(closeCurrent = false) {
    try {
      chrome.runtime.sendMessage({ 
        type: 'FOCUS_OR_OPEN_LEVELUP',
        closeCurrentTab: closeCurrent
      });
    } catch (_) {}
  }

  // Thu nhỏ khiên: Đóng cảnh báo giữa màn hình nhẹ nhàng và hiển thị con nhộng nổi góc
  function shrinkCenterWarning() {
    if (!shadowRoot) return;
    const overlay = shadowRoot.getElementById('blocked-overlay');
    const pill = shadowRoot.getElementById('capsule-pill');

    if (!overlay) return;

    try {
      sessionStorage.setItem('levelup_blocked_center_shrunk', 'true');
    } catch (_) {}

    // Fade out nhẹ nhàng 0.2s rồi ẩn
    overlay.style.transition = 'opacity 0.2s ease';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';

    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.removeProperty('opacity');
      overlay.style.removeProperty('pointer-events');
      overlay.style.removeProperty('transition');
      if (pill) {
        pill.style.display = 'inline-flex';
        pill.classList.add('is-distraction');
        startCapsuleFlight();
      }
    }, 200);
  }

  // =============================================================================
  // CONTINUOUS BORDER-TO-BORDER FLIGHT ENGINE (For Blocked / Distraction Pages)
  // Con nhộng đếm thời gian di chuyển chậm rãi, liên tục từ viền này sang viền khác,
  // không dừng lại giữa màn hình và không rung lắc trong lúc bay.
  // =============================================================================
  const SAFE_BORDER_PADDING = 16;
  let lastBorderEdge = -1;

  function getRandomFlightTarget(currX = null, currY = null, pillW = 100, pillH = 36) {
    const winW = window.innerWidth || document.documentElement?.clientWidth || 1024;
    const winH = window.innerHeight || document.documentElement?.clientHeight || 768;

    const minX = SAFE_BORDER_PADDING;
    const maxX = Math.max(minX, winW - pillW - SAFE_BORDER_PADDING);
    const minY = SAFE_BORDER_PADDING;
    const maxY = Math.max(minY, winH - pillH - SAFE_BORDER_PADDING);

    if (maxX <= minX || maxY <= minY) {
      return { x: minX, y: minY };
    }

    // Xác định xem hiện tại con nhộng đang ở gần viền nào (0=Top, 1=Right, 2=Bottom, 3=Left)
    const currentEdges = [];
    if (currX !== null && currY !== null) {
      if (Math.abs(currY - minY) <= 36) currentEdges.push(0); // Top
      if (Math.abs(currX - maxX) <= 36) currentEdges.push(1); // Right
      if (Math.abs(currY - maxY) <= 36) currentEdges.push(2); // Bottom
      if (Math.abs(currX - minX) <= 36) currentEdges.push(3); // Left
    }

    // Luôn chọn đích đến là một trong các viền màn hình (không dừng giữa chừng)
    // và khác với viền hiện tại để băng qua màn hình
    let candidateEdges = [0, 1, 2, 3].filter(edge => !currentEdges.includes(edge) && edge !== lastBorderEdge);
    if (candidateEdges.length === 0) {
      candidateEdges = [0, 1, 2, 3].filter(edge => !currentEdges.includes(edge));
    }
    if (candidateEdges.length === 0) {
      candidateEdges = [0, 1, 2, 3];
    }

    const chosenEdge = candidateEdges[Math.floor(Math.random() * candidateEdges.length)];
    lastBorderEdge = chosenEdge;

    let targetX = minX;
    let targetY = minY;

    if (chosenEdge === 0) {
      // Đích đến: Chạm viền trên cùng (Top)
      targetY = minY;
      targetX = Math.round(minX + Math.random() * (maxX - minX));
    } else if (chosenEdge === 1) {
      // Đích đến: Chạm viền bên phải (Right)
      targetX = maxX;
      targetY = Math.round(minY + Math.random() * (maxY - minY));
    } else if (chosenEdge === 2) {
      // Đích đến: Chạm viền dưới cùng (Bottom)
      targetY = maxY;
      targetX = Math.round(minX + Math.random() * (maxX - minX));
    } else {
      // Đích đến: Chạm viền bên trái (Left)
      targetX = minX;
      targetY = Math.round(minY + Math.random() * (maxY - minY));
    }

    return { x: targetX, y: targetY };
  }

  function flyToNextRandomWaypoint() {
    if (!isFlyingActive || isFlightPaused) return;
    if (!shadowRoot) return;
    const pill = shadowRoot.getElementById('capsule-pill');
    if (!pill || pill.style.display === 'none') return;

    if (flightTimeout) {
      clearTimeout(flightTimeout);
      flightTimeout = null;
    }

    const rect = pill.getBoundingClientRect();
    const currX = rect.left;
    const currY = rect.top;
    const pillW = rect.width || 100;
    const pillH = rect.height || 36;

    // Đảm bảo pill có toạ độ pixel trước khi áp dụng CSS transition
    applyCapsulePosition(currX, currY);

    const target = getRandomFlightTarget(currX, currY, pillW, pillH);
    const dist = Math.hypot(target.x - currX, target.y - currY);

    // Di chuyển chậm rãi (~52-58 px/s), êm ái và hoàn toàn liên tục
    const speed = 55;
    const duration = Math.max(4.0, dist / speed);

    // Kích hoạt reflow để chuyển động xuất phát mượt mà từ vị trí hiện tại
    void pill.offsetWidth;

    // Sử dụng transition linear để chuyển động đều đặn, không bị khựng hay giật
    pill.style.transition = `left ${duration.toFixed(2)}s linear, top ${duration.toFixed(2)}s linear, box-shadow 0.3s ease, border-color 0.3s ease, background-color 0.3s ease`;
    applyCapsulePosition(target.x, target.y);

    // Bay liên tục không nghỉ: Vừa chạm tới viền là lập tức chuyển hướng sang viền tiếp theo
    const nextDelayMs = Math.round(duration * 1000);
    flightTimeout = setTimeout(() => {
      flyToNextRandomWaypoint();
    }, nextDelayMs);
  }

  function startCapsuleFlight() {
    if (isFlyingActive) return;
    if (!shadowRoot) return;
    const pill = shadowRoot.getElementById('capsule-pill');
    if (!pill || pill.style.display === 'none') return;

    isFlyingActive = true;
    isFlightPaused = false;
    pill.classList.add('is-flying');

    // Chuyển vị trí từ right/bottom sang pixel cố định trước khi bay
    const rect = pill.getBoundingClientRect();
    pill.style.transition = 'none';
    applyCapsulePosition(rect.left, rect.top);
    void pill.offsetWidth;

    flightTimeout = setTimeout(() => {
      if (isFlyingActive && !isFlightPaused) {
        flyToNextRandomWaypoint();
      }
    }, 280);
  }

  function pauseCapsuleFlight() {
    if (!isFlyingActive) return;
    isFlightPaused = true;
    if (flightTimeout) {
      clearTimeout(flightTimeout);
      flightTimeout = null;
    }
    if (resumeFlightTimeout) {
      clearTimeout(resumeFlightTimeout);
      resumeFlightTimeout = null;
    }
    if (!shadowRoot) return;
    const pill = shadowRoot.getElementById('capsule-pill');
    if (!pill) return;

    // Đóng băng vị trí tức thời khi hover hoặc drag
    const rect = pill.getBoundingClientRect();
    pill.style.transition = 'none';
    applyCapsulePosition(rect.left, rect.top);
  }

  function resumeCapsuleFlight(delayMs = 0) {
    if (!isFlyingActive) return;
    if (resumeFlightTimeout) {
      clearTimeout(resumeFlightTimeout);
    }
    resumeFlightTimeout = setTimeout(() => {
      resumeFlightTimeout = null;
      if (!isFlyingActive || isDragging) return;
      isFlightPaused = false;
      flyToNextRandomWaypoint();
    }, delayMs);
  }

  function stopCapsuleFlight() {
    isFlyingActive = false;
    isFlightPaused = false;
    if (flightTimeout) {
      clearTimeout(flightTimeout);
      flightTimeout = null;
    }
    if (resumeFlightTimeout) {
      clearTimeout(resumeFlightTimeout);
      resumeFlightTimeout = null;
    }
    if (!shadowRoot) return;
    const pill = shadowRoot.getElementById('capsule-pill');
    if (pill) {
      pill.classList.remove('is-flying');
      pill.style.removeProperty('transition');
      const isDistraction = checkIsCurrentPageDistraction();
      if (!isDistraction) {
        let savedPos = null;
        try {
          const raw = sessionStorage.getItem('levelup_capsule_pos');
          if (raw) savedPos = JSON.parse(raw);
        } catch (_) {}
        if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
          const clampedX = Math.max(8, Math.min(window.innerWidth - 110, savedPos.x));
          const clampedY = Math.max(8, Math.min(window.innerHeight - 50, savedPos.y));
          applyCapsulePosition(clampedX, clampedY);
        } else {
          applyCapsulePosition();
        }
      }
    }
  }

  // =============================================================================
  // DOM CREATION (SHADOW DOM INJECTION)
  // =============================================================================
  function createCapsuleDOM() {
    if (hostEl) return;

    hostEl = document.createElement('div');
    hostEl.id = 'levelup-floating-capsule-host';
    hostEl.style.setProperty('position', 'fixed', 'important');
    hostEl.style.setProperty('inset', '0', 'important');
    hostEl.style.setProperty('width', '100vw', 'important');
    hostEl.style.setProperty('height', '100vh', 'important');
    hostEl.style.setProperty('z-index', '2147483647', 'important');
    hostEl.style.setProperty('margin', '0', 'important');
    hostEl.style.setProperty('padding', '0', 'important');
    hostEl.style.setProperty('background', 'transparent', 'important');
    hostEl.style.setProperty('border', 'none', 'important');
    hostEl.style.setProperty('pointer-events', 'none', 'important');
    hostEl.style.setProperty('user-select', 'none', 'important');
    hostEl.style.setProperty('-webkit-user-select', 'none', 'important');
    hostEl.style.setProperty('overflow', 'visible', 'important');

    shadowRoot = hostEl.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          user-select: none;
          -webkit-user-select: none;
          box-sizing: border-box;
          pointer-events: none;
        }

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* ------------------------------------------------------------- */
        /* FULLSCREEN CENTER WARNING OVERLAY (On Distraction Sites)      */
        /* ------------------------------------------------------------- */
        .blocked-overlay {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          z-index: 2147483640;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(6, 9, 22, 0.82);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          pointer-events: auto;
        }

        .overlay-glow-orb {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.08) 50%, transparent 70%);
          pointer-events: none;
        }

        /* Thẻ cảnh báo lớn: Animation nảy lên xuống nhẹ nhàng */
        .blocked-card-center {
          position: relative;
          width: 90%;
          max-width: 440px;
          background: linear-gradient(145deg, rgba(24, 20, 38, 0.94), rgba(14, 16, 28, 0.97));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 2px solid rgba(239, 68, 68, 0.65);
          border-radius: 24px;
          padding: 32px 28px 26px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 35px rgba(239, 68, 68, 0.3);
          text-align: center;
          color: #f8fafc;
          animation: gentleBobbing 2.8s ease-in-out infinite;
          transform-origin: center center;
          will-change: transform;
        }

        /* Animation nảy lên xuống nhẹ nhàng */
        @keyframes gentleBobbing {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .warning-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 13px;
          background: rgba(239, 68, 68, 0.18);
          border: 1px solid rgba(239, 68, 68, 0.45);
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          color: #fca5a5;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .ping-circle {
          width: 8px;
          height: 8px;
          background-color: #ef4444;
          border-radius: 50%;
          box-shadow: 0 0 8px #ef4444;
          animation: pingAnim 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes pingAnim {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }

        .warning-icon-wrapper {
          width: 66px;
          height: 66px;
          margin: 0 auto 16px;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(185, 28, 28, 0.45));
          border: 2px solid rgba(239, 68, 68, 0.55);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 24px rgba(239, 68, 68, 0.4);
        }

        .warning-shield-svg {
          width: 36px;
          height: 36px;
          stroke: #ef4444;
          filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.8));
        }

        .warning-title {
          font-size: 23px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #ffffff;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
          margin-bottom: 8px;
        }

        .warning-desc {
          font-size: 13.5px;
          line-height: 1.5;
          color: #94a3b8;
          margin-bottom: 16px;
        }

        .highlight-domain {
          color: #f87171;
          font-weight: 700;
          text-decoration: underline;
          text-decoration-color: rgba(248, 113, 113, 0.5);
          text-underline-offset: 3px;
        }

        .warning-quest-box {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.35);
          border-radius: 10px;
          padding: 6px 12px;
          margin-bottom: 16px;
          font-size: 12.5px;
          color: #c7d2fe;
        }

        .quest-label {
          font-weight: 600;
          opacity: 0.8;
        }

        .quest-title {
          font-weight: 700;
          color: #ffffff;
        }

        .warning-timer-box {
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 12px 16px;
          margin-bottom: 22px;
        }

        .timer-label {
          font-size: 10.5px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .timer-value {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 28px;
          font-weight: 900;
          color: #ef4444;
          letter-spacing: 1px;
          text-shadow: 0 0 14px rgba(239, 68, 68, 0.6);
        }

        .warning-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .btn-warning-return {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 11px 16px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
          transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
        }

        .btn-warning-return:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 25px rgba(99, 102, 241, 0.55);
          filter: brightness(1.1);
        }

        .btn-warning-shrink {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 11px 16px;
          background: rgba(30, 41, 59, 0.75);
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.15);
          font-size: 13.5px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease;
        }

        .btn-warning-shrink:hover {
          transform: translateY(-2px);
          background: rgba(51, 65, 85, 0.9);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.3);
        }

        /* ------------------------------------------------------------- */
        /* CON NHỘNG THỜI GIAN: THIẾT KẾ TRONG SUỐT & BLUR KÍNH HIỆN ĐẠI */
        /* ------------------------------------------------------------- */
        .capsule-pill {
          position: fixed;
          right: 24px;
          bottom: 24px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 7px 14px 7px 12px;
          background: rgba(15, 23, 42, 0.24);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border: 1.2px solid rgba(255, 255, 255, 0.24);
          border-radius: 9999px;
          box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.16), inset 0 1px 1px 0 rgba(255, 255, 255, 0.22);
          color: #ffffff;
          cursor: grab;
          transition: transform 0.18s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.2s ease;
          animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          font-size: 13px;
          pointer-events: auto;
        }

        .capsule-pill:hover {
          transform: translateY(-2px) scale(1.03);
          background: rgba(15, 23, 42, 0.38);
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 12px 28px 0 rgba(0, 0, 0, 0.22), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3);
        }

        .capsule-pill:active {
          cursor: grabbing;
          transform: scale(0.98);
        }

        /* Con nhộng ở trang bị chặn: Trong suốt mờ kính đỏ rượu + Rung rung cảnh báo */
        .capsule-pill.is-distraction {
          border-color: rgba(239, 68, 68, 0.48) !important;
          background: rgba(45, 10, 18, 0.28) !important;
          backdrop-filter: blur(16px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
          box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.2), 0 0 14px rgba(239, 68, 68, 0.3) !important;
          animation: capsuleRumble 0.3s ease infinite alternate !important;
        }

        @keyframes capsuleRumble {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-2px, 1px) rotate(-1deg); }
          50% { transform: translate(2px, -1px) rotate(1deg); }
          75% { transform: translate(-1.5px, -1.5px) rotate(-0.5deg); }
          100% { transform: translate(1.5px, 1.5px) rotate(0.5deg); }
        }

        /* Trong lúc di chuyển bay lượn: KHÔNG RUNG, lướt êm ái, phát sáng dịu */
        .capsule-pill.is-distraction.is-flying {
          animation: none !important;
          transform: none !important;
          will-change: left, top;
          box-shadow: 0 12px 32px 0 rgba(0, 0, 0, 0.35), 0 0 20px rgba(239, 68, 68, 0.45) !important;
          cursor: grab;
        }

        .capsule-pill.is-distraction.is-flying:active {
          cursor: grabbing;
        }

        /* Dấu x ở trang bị chặn: Hiện khi hover, màu đỏ cảnh báo, bấm vào sẽ đóng tab */
        .capsule-pill.is-distraction .btn-dismiss {
          background: rgba(239, 68, 68, 0.28);
          color: #fca5a5;
        }

        .capsule-pill.is-distraction .btn-dismiss:hover {
          background: rgba(239, 68, 68, 0.75);
          color: #ffffff;
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

        /* ------------------------------------------------------------- */
        /* STATUS DOT INDICATOR: GREEN OR RED                            */
        /* ------------------------------------------------------------- */
        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: background-color 0.25s ease, box-shadow 0.25s ease;
        }

        /* GREEN DOT (Normal / Focusing) */
        .status-dot.dot-green {
          background-color: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
          animation: pulseGreen 1.6s infinite ease-in-out;
        }

        @keyframes pulseGreen {
          0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        /* RED DOT (Distraction / Blocked) */
        .status-dot.dot-red {
          background-color: #ef4444;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.9);
          animation: pulseRed 1.2s infinite ease-in-out;
        }

        @keyframes pulseRed {
          0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.8); }
          70% { transform: scale(1.15); box-shadow: 0 0 0 7px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        /* ------------------------------------------------------------- */
        /* COUNTDOWN TIMER DIGITS                                        */
        /* ------------------------------------------------------------- */
        .timer-digits {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 14px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.4px;
          line-height: 1;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5);
        }

        /* ------------------------------------------------------------- */
        /* DISMISS BUTTON "X" (HIDDEN BY DEFAULT, REVEALED ON HOVER)    */
        /* ------------------------------------------------------------- */
        .btn-dismiss {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 0;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.22);
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: bold;
          line-height: 1;
          margin-left: 0;
          opacity: 0;
          visibility: hidden;
          overflow: hidden;
          pointer-events: none;
          transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, margin-left 0.2s ease, background 0.15s, color 0.15s;
        }

        /* Show smoothly when hovering over the capsule pill */
        .capsule-pill:hover .btn-dismiss {
          width: 18px;
          margin-left: 4px;
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .btn-dismiss:hover {
          background: rgba(244, 63, 94, 0.55);
          color: #ffffff;
        }

        /* ------------------------------------------------------------- */
        /* 8-BIT FIREWORKS CELEBRATION (Fullscreen Canvas)               */
        /* ------------------------------------------------------------- */
        .fireworks-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 1000;
        }
      </style>

      <!-- 8-Bit Fireworks Fullscreen Canvas -->
      <canvas id="fireworks-canvas" class="fireworks-canvas"></canvas>

      <!-- Fullscreen Center Warning Overlay for Blocked Pages -->
      <div class="blocked-overlay" id="blocked-overlay" style="display: none;">
        <div class="overlay-glow-orb"></div>
        <div class="blocked-card-center" id="blocked-card-center">
          <div class="warning-badge">
            <span class="ping-circle"></span>
            <span class="badge-text">KHU VỰC BỊ PHONG TỎA</span>
          </div>

          <div class="warning-icon-wrapper">
            <svg class="warning-shield-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>

          <h2 class="warning-title">DỪNG LẠI, HIỆP SĨ!</h2>
          <p class="warning-desc">
            Trang web <span class="highlight-domain" id="overlay-blocked-domain">trang web này</span> đang bị khiên chắn giới hạn trong phiên Pomodoro.
          </p>

          <div class="warning-quest-box" id="overlay-quest-box" style="display: none;">
            <span class="quest-label">Nhiệm vụ:</span>
            <span class="quest-title" id="overlay-quest-title"></span>
          </div>

          <div class="warning-timer-box">
            <div class="timer-label">THỜI GIAN CÒN LẠI</div>
            <div class="timer-value" id="overlay-timer">25:00</div>
          </div>

          <div class="warning-actions">
            <button class="btn-warning-return" id="btn-overlay-return" type="button">
              ⚔️ Quay Về LevelUp
            </button>
            <button class="btn-warning-shrink" id="btn-overlay-shrink" type="button" title="Thu nhỏ thông báo thành đồng hồ nổi góc màn hình">
              🛡️ Thu Nhỏ Khiên
            </button>
          </div>
        </div>
      </div>

      <!-- Minimal Transparent Capsule Pill: Dot, Timer, and "x" -->
      <div class="capsule-pill" id="capsule-pill" title="Kéo để di chuyển • Bấm để quay về tab LevelUp">
        <span class="status-dot dot-green" id="capsule-dot"></span>
        <span id="capsule-timer" class="timer-digits">25:00</span>
        <button id="capsule-dismiss" class="btn-dismiss" title="Tạm ẩn trên trang này" type="button">×</button>
      </div>
    `;

    // Append to documentElement so it cannot be clipped by body overflow: hidden
    const targetParent = document.documentElement || document.body;
    targetParent.appendChild(hostEl);

    // Restore saved position or default to bottom-right
    let savedPos = null;
    try {
      const raw = sessionStorage.getItem('levelup_capsule_pos');
      if (raw) savedPos = JSON.parse(raw);
    } catch (_) {}

    if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
      const clampedX = Math.max(8, Math.min(window.innerWidth - 110, savedPos.x));
      const clampedY = Math.max(8, Math.min(window.innerHeight - 50, savedPos.y));
      applyCapsulePosition(clampedX, clampedY);
    } else {
      applyCapsulePosition();
    }

    setupEvents();
    initFireworksEngine();
  }

  // =============================================================================
  // EVENT LISTENERS & DRAGGING
  // =============================================================================
  function setupEvents() {
    if (!shadowRoot) return;

    const pill = shadowRoot.getElementById('capsule-pill');
    const dismissBtn = shadowRoot.getElementById('capsule-dismiss');
    const btnShrink = shadowRoot.getElementById('btn-overlay-shrink');
    const btnReturn = shadowRoot.getElementById('btn-overlay-return');
    const overlay = shadowRoot.getElementById('blocked-overlay');

    if (btnReturn) {
      btnReturn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Returning to LevelUp closes the current distraction tab
        returnToLevelUp(true);
      });
    }

    if (btnShrink) {
      btnShrink.addEventListener('click', (e) => {
        e.stopPropagation();
        shrinkCenterWarning();
      });
    }

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        const card = shadowRoot.getElementById('blocked-card-center');
        if (card && !card.contains(e.target)) {
          shrinkCenterWarning();
        }
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const isDistraction = checkIsCurrentPageDistraction();
        if (isDistraction) {
          // Trên trang bị chặn: Bấm nút 'x' lập tức đóng trang hiện tại và trở về LevelUp!
          returnToLevelUp(true);
        } else {
          // Trên trang bình thường: Tạm ẩn capsule trong phiên duyệt này
          wasDismissedThisSession = true;
          removeCapsuleDOM();
        }
      });
    }

    if (pill) {
      // Khi hover chuột vào: Tạm dừng bay nhẹ nhàng để user dễ bấm nút × đóng tab hoặc bấm quay về LevelUp
      pill.addEventListener('mouseenter', () => {
        if (!isFlyingActive) return;
        pauseCapsuleFlight();
      });

      pill.addEventListener('mouseleave', () => {
        if (!isFlyingActive || isDragging) return;
        resumeCapsuleFlight(800);
      });

      pill.addEventListener('mousedown', (e) => {
        if (e.target === dismissBtn || (dismissBtn && dismissBtn.contains(e.target))) return;

        isDragging = true;
        hasMoved = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        if (isFlyingActive) {
          pauseCapsuleFlight();
        }

        const rect = pill.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        const onMouseMove = (moveEvent) => {
          if (!isDragging) return;
          const dx = moveEvent.clientX - dragStartX;
          const dy = moveEvent.clientY - dragStartY;

          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved = true;
          }

          const pillW = rect.width || 80;
          const pillH = rect.height || 34;

          const maxLeft = Math.max(6, window.innerWidth - pillW - 6);
          const maxTop = Math.max(6, window.innerHeight - pillH - 6);

          const newLeft = Math.max(6, Math.min(maxLeft, initialLeft + dx));
          const newTop = Math.max(6, Math.min(maxTop, initialTop + dy));

          applyCapsulePosition(newLeft, newTop);
        };

        const onMouseUp = () => {
          isDragging = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);

          if (hasMoved) {
            const rect = pill.getBoundingClientRect();
            try {
              sessionStorage.setItem('levelup_capsule_pos', JSON.stringify({ x: rect.left, y: rect.top }));
            } catch (_) {}
          } else {
            // Clicked without dragging: return to LevelUp tab
            returnToLevelUp(false);
          }

          if (isFlyingActive) {
            resumeCapsuleFlight(1500);
          }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }
  }

  function removeCapsuleDOM() {
    stopCapsuleFlight();
    if (hostEl) {
      hostEl.remove();
      hostEl = null;
      shadowRoot = null;
    }
  }

  // =============================================================================
  // 8-BIT FIREWORKS ENGINE (Celebration upon focus completion)
  // =============================================================================
  let fireworksParticles = [];
  let fireworksAnimFrame = null;
  let fireworksCanvas = null;
  let fireworksCtx = null;

  function initFireworksEngine() {
    if (!shadowRoot) return;
    fireworksCanvas = shadowRoot.getElementById('fireworks-canvas');
    if (!fireworksCanvas) return;
    fireworksCtx = fireworksCanvas.getContext('2d');
    resizeFireworksCanvas();
    window.addEventListener('resize', resizeFireworksCanvas);
  }

  function resizeFireworksCanvas() {
    if (!fireworksCanvas) return;
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
  }

  function trigger8BitFireworks() {
    if (!hostEl) createCapsuleDOM();
    if (!shadowRoot) return;

    play8BitVictorySound();

    fireworksParticles = [];
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'];

    function createBurst(cx, cy) {
      const count = 35;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.2);
        const speed = 2 + Math.random() * 5.5;
        fireworksParticles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() > 0.5 ? 4 : 3, // 8-bit square pixel
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: 0.015 + Math.random() * 0.015
        });
      }
    }

    const pill = shadowRoot.getElementById('capsule-pill');
    const rect = pill ? pill.getBoundingClientRect() : { left: window.innerWidth - 80, top: window.innerHeight - 50, width: 80, height: 34 };
    const startX = rect.left + rect.width / 2;
    const startY = rect.top;

    createBurst(startX, Math.max(120, startY - 120));
    setTimeout(() => {
      createBurst(window.innerWidth * 0.5, window.innerHeight * 0.35);
    }, 250);
    setTimeout(() => {
      createBurst(window.innerWidth * 0.35, window.innerHeight * 0.45);
      createBurst(window.innerWidth * 0.65, window.innerHeight * 0.4);
    }, 550);

    if (!fireworksAnimFrame) {
      animateFireworks();
    }
  }

  function animateFireworks() {
    if (!fireworksCtx || !fireworksCanvas) return;
    fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);

    for (let i = fireworksParticles.length - 1; i >= 0; i--) {
      const p = fireworksParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.vx *= 0.98;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        fireworksParticles.splice(i, 1);
        continue;
      }

      fireworksCtx.fillStyle = p.color;
      fireworksCtx.globalAlpha = Math.max(0, p.alpha);
      fireworksCtx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }

    fireworksCtx.globalAlpha = 1.0;

    if (fireworksParticles.length > 0) {
      fireworksAnimFrame = requestAnimationFrame(animateFireworks);
    } else {
      fireworksAnimFrame = null;
    }
  }

  // =============================================================================
  // DISPLAY UPDATE
  // =============================================================================
  function updateCapsuleDisplay() {
    if (!mascotEnabled) {
      stopCapsuleFlight();
      removeCapsuleDOM();
      return;
    }

    const isRunning = Boolean(currentFocusState && currentFocusState.isRunning && !currentFocusState.isBreakMode);

    if (!isRunning) {
      stopCapsuleFlight();
      wasDismissedThisSession = false;
      try {
        sessionStorage.removeItem('levelup_blocked_center_shrunk');
      } catch (_) {}
      removeCapsuleDOM();
      return;
    }

    if (wasDismissedThisSession) {
      stopCapsuleFlight();
      removeCapsuleDOM();
      return;
    }

    if (!hostEl) {
      createCapsuleDOM();
    }

    if (!shadowRoot) return;

    // Check if on a distraction/restricted page
    const isDistraction = checkIsCurrentPageDistraction();
    const pill = shadowRoot.getElementById('capsule-pill');
    const dot = shadowRoot.getElementById('capsule-dot');
    const dismissBtn = shadowRoot.getElementById('capsule-dismiss');
    const overlay = shadowRoot.getElementById('blocked-overlay');
    const overlayDomain = shadowRoot.getElementById('overlay-blocked-domain');
    const overlayTimer = shadowRoot.getElementById('overlay-timer');
    const questBox = shadowRoot.getElementById('overlay-quest-box');
    const questTitle = shadowRoot.getElementById('overlay-quest-title');

    // Countdown calculation
    const baseRemaining = Number(currentFocusState?.remainingSeconds) || 0;
    const updatedAt = Number(currentFocusState?.updatedAt) || Date.now();
    const elapsed = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
    const currentRemaining = Math.max(0, baseRemaining - elapsed);
    const formattedTime = formatTime(currentRemaining);

    // Quest task name display
    const taskName = currentFocusState?.taskName || '';
    if (questBox && questTitle) {
      if (taskName) {
        questTitle.textContent = taskName;
        questBox.style.display = 'flex';
      } else {
        questBox.style.display = 'none';
      }
    }

    if (isDistraction) {
      // Check if user already clicked shrink in this tab session
      let isShrunk = false;
      try {
        isShrunk = sessionStorage.getItem('levelup_blocked_center_shrunk') === 'true';
      } catch (_) {}

      const cleanHost = window.location.hostname.replace(/^www\./, '') || 'trang web này';
      if (overlayDomain) overlayDomain.textContent = cleanHost;

      if (!isShrunk) {
        // Display center warning with gentle bobbing, hide corner pill
        stopCapsuleFlight();
        if (overlay) {
          overlay.style.display = 'flex';
        }
        if (pill) pill.style.display = 'none';
      } else {
        // Shrunk: Hide center warning, show corner pill with red alert and gentle random flight
        if (overlay) overlay.style.display = 'none';
        if (pill) {
          pill.style.display = 'inline-flex';
          pill.classList.add('is-distraction');
        }
        if (dot) dot.className = 'status-dot dot-red';
        if (dismissBtn) {
          dismissBtn.style.removeProperty('display');
          dismissBtn.title = 'Đóng trang này và quay về LevelUp';
        }
        startCapsuleFlight();
      }
    } else {
      // Normal focusing page: Hide center warning, show green dot capsule in docked position
      stopCapsuleFlight();
      if (overlay) overlay.style.display = 'none';
      if (pill) {
        pill.style.display = 'inline-flex';
        pill.classList.remove('is-distraction');
      }
      if (dot) dot.className = 'status-dot dot-green';
      if (dismissBtn) {
        dismissBtn.style.removeProperty('display');
        dismissBtn.title = 'Tạm ẩn trên trang này';
      }
    }

    // Update timers
    const timerEl = shadowRoot.getElementById('capsule-timer');
    if (timerEl) timerEl.textContent = formattedTime;
    if (overlayTimer) overlayTimer.textContent = formattedTime;

    if (currentRemaining <= 0) {
      stopCapsuleFlight();
      trigger8BitFireworks();
      setTimeout(() => {
        removeCapsuleDOM();
      }, 4000);
    }
  }

  function syncAndTick() {
    chrome.storage.local.get([
      'focusState',
      'isShieldActive',
      'blacklist',
      'whitelist',
      'mascotEnabled',
      'soundEnabled'
    ], (data) => {
      if (chrome.runtime.lastError) return;

      currentFocusState = data.focusState || null;
      isShieldActive = Boolean(data.isShieldActive);
      blacklist = Array.isArray(data.blacklist) ? data.blacklist : [];
      whitelist = Array.isArray(data.whitelist) ? data.whitelist : [];
      mascotEnabled = typeof data.mascotEnabled === 'boolean' ? data.mascotEnabled : true;
      soundEnabled = typeof data.soundEnabled === 'boolean' ? data.soundEnabled : true;

      updateCapsuleDisplay();
    });
  }

  window.__LEVELUP_CAPSULE_REFRESH__ = syncAndTick;

  // Initial sync
  syncAndTick();

  // Local second ticker
  timerInterval = setInterval(() => {
    if (currentFocusState && currentFocusState.isRunning) {
      updateCapsuleDisplay();
    }
  }, 1000);

  // Storage listener for live sync across all tabs
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes.focusState) {
      const oldState = currentFocusState;
      currentFocusState = changes.focusState.newValue || null;
      if (!oldState?.isRunning && currentFocusState?.isRunning) {
        wasDismissedThisSession = false;
        try {
          sessionStorage.removeItem('levelup_blocked_center_shrunk');
        } catch (_) {}
      }
      updateCapsuleDisplay();
    }

    if (changes.isShieldActive) {
      isShieldActive = Boolean(changes.isShieldActive.newValue);
      updateCapsuleDisplay();
    }

    if (changes.blacklist) {
      blacklist = changes.blacklist.newValue || [];
      updateCapsuleDisplay();
    }

    if (changes.whitelist) {
      whitelist = changes.whitelist.newValue || [];
      updateCapsuleDisplay();
    }

    if (changes.mascotEnabled) {
      mascotEnabled = Boolean(changes.mascotEnabled.newValue);
      updateCapsuleDisplay();
    }

    if (changes.soundEnabled) {
      soundEnabled = Boolean(changes.soundEnabled.newValue);
    }
  });

  // Listen to runtime messages from background or webapp
  chrome.runtime.onMessage.addListener((message) => {
    if (!message) return;

    if (message.type === 'FOCUS_SESSION_COMPLETED') {
      trigger8BitFireworks();
    } else if (message.type === 'TIMER_STATE_CHANGED') {
      const oldState = currentFocusState;
      currentFocusState = message.state;
      if (!oldState?.isRunning && currentFocusState?.isRunning) {
        wasDismissedThisSession = false;
        try {
          sessionStorage.removeItem('levelup_blocked_center_shrunk');
        } catch (_) {}
      }
      updateCapsuleDisplay();
    } else if (message.type === 'RESTORE_CAPSULE' || message.type === 'SHOW_CAPSULE_NOW') {
      wasDismissedThisSession = false;
      updateCapsuleDisplay();
    }
  });

  // Handle viewport resize: keep capsule bounded during flight
  window.addEventListener('resize', () => {
    if (isFlyingActive && shadowRoot) {
      const pill = shadowRoot.getElementById('capsule-pill');
      if (pill) {
        const rect = pill.getBoundingClientRect();
        const maxL = Math.max(24, window.innerWidth - (rect.width || 100) - 24);
        const maxT = Math.max(24, window.innerHeight - (rect.height || 36) - 24);
        if (rect.left > maxL || rect.top > maxT) {
          applyCapsulePosition(Math.min(rect.left, maxL), Math.min(rect.top, maxT));
        }
      }
    }
  });

  // Pause flight when tab is in background to save resources, resume when active
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (isFlyingActive) pauseCapsuleFlight();
    } else {
      if (isFlyingActive) resumeCapsuleFlight(300);
    }
  });
})();
