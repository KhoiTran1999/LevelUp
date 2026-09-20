// =============================================================================
// 6.5. QUEST PROOF VERIFICATION (Camera Capture & AI Vision)
// =============================================================================
let currentProofQuest = null;
let currentProofBase64 = null;
let isSubmittingProof = false;
let pendingApprovedQuest = null;

// ponytail: Strict real-mobile detector. Blocks desktop browsers and DevTools mobile emulation (anti-cheat).
function isMobilePhone() {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || navigator.vendor || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const isMobileClientHint = Boolean(navigator.userAgentData?.mobile);

  // 1. Must match a mobile UA or client hint
  if (!isMobileUA && !isMobileClientHint) return false;

  // --- ANTI-CHEAT DEVTOOLS & DESKTOP SPOOFING GUARDS ---
  // 2. Desktop OS check: Host platform on Windows/Mac/Linux (DevTools keeps host platform)
  const platform = navigator.platform || '';
  if (/Win32|Win64|Windows|Linux x86_64/i.test(platform)) {
    return false;
  }
  // MacIntel host check: on desktop Mac running DevTools iPhone mode, platform is MacIntel but touchPoints <= 1
  if (/MacIntel/i.test(platform)) {
    const tp = navigator.maxTouchPoints || 0;
    if (tp <= 1 || !/iPad/i.test(ua)) {
      return false;
    }
  }

  // 3. UserAgentData host OS check (Chrome DevTools often leaks host OS)
  const clientPlatform = navigator.userAgentData?.platform || '';
  if (/Windows|macOS|Linux/i.test(clientPlatform)) {
    return false;
  }

  // 4. Pointer / Hover hardware check: PC/Laptop mouse is active even in DevTools
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(any-pointer: fine)').matches && window.matchMedia('(any-hover: hover)').matches) {
      return false;
    }
  }

  // 5. DevTools touch emulation check: Chrome DevTools sets maxTouchPoints = 1
  const touchPoints = navigator.maxTouchPoints || 0;
  if (touchPoints === 1) {
    return false;
  }

  // 6. DevTools viewport emulation check: Desktop browser window is much larger than emulated viewport.
  // ponytail: Guard by touchPoints <= 1 and devicePixelRatio so real phones rotated to landscape
  // (innerWidth > innerHeight) or high-DPI screens are never falsely blocked as desktop computers.
  if (typeof window !== 'undefined' && window.outerWidth && window.innerWidth) {
    const dpr = window.devicePixelRatio || 1;
    const normalizedOuterWidth = (window.outerWidth > window.innerWidth * 1.5 && dpr > 1)
      ? window.outerWidth / dpr
      : window.outerWidth;
    if (touchPoints <= 1 && (normalizedOuterWidth - window.innerWidth > 120)) {
      return false;
    }
  }

  return true;
}
if (typeof window !== 'undefined') {
  window.isMobilePhone = isMobilePhone;
}

// Client-side lightweight image compressor via HTML5 Canvas
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Tệp tải lên không phải là hình ảnh hợp lệ.'));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể phân tích dữ liệu ảnh.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function openQuestProofModal(quest) {
  if (!quest) return;
  currentProofQuest = quest;
  currentProofBase64 = null;
  isSubmittingProof = false;

  const isMobile = isMobilePhone();

  const rankEl = document.getElementById('proof-quest-rank');
  if (rankEl) {
    rankEl.textContent = `HẠNG ${quest.rank || 'B'}`;
    rankEl.className = `rank-badge-${quest.rank || 'B'} text-[10px] font-mono font-black px-2 py-0.5 rounded-md`;
  }

  const coinsEl = document.getElementById('proof-quest-coins');
  if (coinsEl) coinsEl.textContent = `+${quest.rewardCoins || 10} Vàng`;

  const titleEl = document.getElementById('proof-quest-title');
  if (titleEl) titleEl.textContent = quest.title;

  const guidanceContainer = document.getElementById('proof-guidance-container');
  const guidanceText = document.getElementById('proof-guidance-text');
  if (guidanceContainer && guidanceText) {
    if (quest.proofGuidance) {
      guidanceText.textContent = quest.proofGuidance;
      guidanceContainer.classList.remove('hidden');
    } else {
      guidanceContainer.classList.add('hidden');
    }
  }

  // Reset inputs and preview
  const fileInput = document.getElementById('input-quest-proof-file');
  if (fileInput) fileInput.value = '';

  const noteInput = document.getElementById('input-quest-proof-note');
  if (noteInput) {
    noteInput.value = '';
    noteInput.disabled = false;
  }

  const noteZone = document.getElementById('proof-note-zone');
  if (noteZone) {
    if (!isMobile) {
      noteZone.classList.add('hidden');
    } else {
      noteZone.classList.remove('hidden');
    }
  }

  const desktopNoticeZone = document.getElementById('proof-desktop-notice-zone');
  const captureZone = document.getElementById('proof-capture-zone');

  if (isMobile) {
    if (captureZone) captureZone.classList.remove('hidden');
    if (desktopNoticeZone) desktopNoticeZone.classList.add('hidden');
  } else {
    if (captureZone) captureZone.classList.add('hidden');
    if (desktopNoticeZone) desktopNoticeZone.classList.remove('hidden');
  }

  const previewZone = document.getElementById('proof-preview-zone');
  if (previewZone) previewZone.classList.add('hidden');

  const previewImg = document.getElementById('proof-preview-img');
  if (previewImg) previewImg.src = '';

  const evaluatingZone = document.getElementById('proof-evaluating-zone');
  if (evaluatingZone) evaluatingZone.classList.add('hidden');

  const resultBox = document.getElementById('proof-result-box');
  if (resultBox) resultBox.classList.add('hidden');

  const submitBtn = document.getElementById('btn-submit-proof');
  if (submitBtn) {
    submitBtn.disabled = true;
    if (!isMobile) {
      submitBtn.classList.add('hidden');
    } else {
      submitBtn.classList.remove('hidden');
      submitBtn.innerHTML = `<span>Gửi AI Duyệt</span><span>📸</span>`;
    }
  }

  openModal('modal-quest-proof');
}

async function submitQuestProofToAI() {
  if (!isMobilePhone()) {
    showToast('Chỉ cho phép chụp và nộp ảnh từ điện thoại để chống gian lận!', 'error');
    return;
  }
  if (!currentProofQuest || !currentProofBase64 || isSubmittingProof) return;

  const noteInput = document.getElementById('input-quest-proof-note');
  const userNote = noteInput ? noteInput.value.trim() : '';

  const submitBtn = document.getElementById('btn-submit-proof');
  const evaluatingZone = document.getElementById('proof-evaluating-zone');
  const resultBox = document.getElementById('proof-result-box');
  const resultIcon = document.getElementById('proof-result-icon');
  const resultTitle = document.getElementById('proof-result-title');
  const resultFeedback = document.getElementById('proof-result-feedback');

  isSubmittingProof = true;
  if (submitBtn) submitBtn.disabled = true;
  if (noteInput) noteInput.disabled = true;
  if (evaluatingZone) evaluatingZone.classList.remove('hidden');
  if (resultBox) resultBox.classList.add('hidden');

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'verify_proof',
        payload: {
          questId: currentProofQuest.id,
          title: currentProofQuest.title,
          description: currentProofQuest.description,
          userNote,
          imageBase64: currentProofBase64
        }
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.details || 'Lỗi kết nối AI');
    }

    const data = await res.json();
    if (evaluatingZone) evaluatingZone.classList.add('hidden');

    if (resultBox) {
      resultBox.classList.remove('hidden');
      if (data.approved) {
        pendingApprovedQuest = currentProofQuest;
        pendingApprovedQuest._proofVerified = true;
        triggerSave(true);

        closeModal('modal-quest-proof');

        const titleEl = document.getElementById('proof-approved-quest-title');
        const feedbackEl = document.getElementById('proof-approved-feedback');
        const coinsEl = document.getElementById('proof-approved-coins');
        const expEl = document.getElementById('proof-approved-exp');

        if (titleEl) titleEl.textContent = pendingApprovedQuest.title || '';
        if (feedbackEl) feedbackEl.textContent = data.feedback || 'Bằng chứng hợp lệ! Chúc mừng bạn đã hoàn thành nhiệm vụ.';
        if (coinsEl) coinsEl.textContent = `+${pendingApprovedQuest.rewardCoins || 10} VÀNG`;
        if (expEl) expEl.textContent = `+${(pendingApprovedQuest.rewardCoins || 10) * 3} EXP`;

        sfx.playFanfare();
        openModal('modal-proof-approved');
      } else {
        resultBox.className = 'p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200';
        if (resultIcon) resultIcon.textContent = '⚠️';
        if (resultTitle) resultTitle.textContent = 'AI CHƯA PHÊ DUYỆT';
        if (resultFeedback) resultFeedback.textContent = data.feedback || 'Ảnh chưa thấy rõ kết quả hoàn thành. Bạn vui lòng chụp lại nhé.';

        sfx.playGong();
        showToast('AI chưa phê duyệt bằng chứng. Vui lòng chụp lại ảnh rõ hơn nhé!', 'warning');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Gửi Lại AI Duyệt</span><span>📸</span>`;
        }
        if (noteInput) noteInput.disabled = false;
      }
    }
  } catch (err) {
    if (evaluatingZone) evaluatingZone.classList.add('hidden');
    showToast('Lỗi thẩm định ảnh: ' + (err.message || 'Vui lòng thử lại'), 'error');
    if (submitBtn) submitBtn.disabled = false;
    if (noteInput) noteInput.disabled = false;
  } finally {
    isSubmittingProof = false;
  }
}
