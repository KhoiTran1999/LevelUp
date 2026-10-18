// =============================================================================
// 6.5. QUEST PROOF VERIFICATION (Camera Capture, Text Report & AI Vision)
// =============================================================================
let currentProofQuest = null;
let currentProofBase64 = null;
let isSubmittingProof = false;
let pendingApprovedQuest = null;
let currentProofMode = 'photo'; // 'photo' | 'text' | 'both'

function switchProofTab(mode) {
  currentProofMode = (mode === 'text' || mode === 'both') ? mode : 'photo';

  const tabPhoto = document.getElementById('proof-tab-photo');
  const tabText = document.getElementById('proof-tab-text');
  const tabBoth = document.getElementById('proof-tab-both');
  const photoContainer = document.getElementById('proof-mode-photo-container');
  const textContainer = document.getElementById('proof-mode-text-container');
  const noteZone = document.getElementById('proof-note-zone');
  const submitBtn = document.getElementById('btn-submit-proof');
  const textInput = document.getElementById('input-quest-proof-text');
  const textVal = textInput ? textInput.value.trim() : '';
  const isMobile = typeof isMobilePhone === 'function' ? isMobilePhone() : false;

  const inactiveClass = 'flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-bold';
  const activeAmberClass = 'flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-500/30 font-bold';
  const activeBlueClass = 'flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/30 font-bold';
  const activePurpleClass = 'flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm border border-purple-500/30 font-bold';

  const stepPhotoTitle = document.getElementById('proof-step-photo-title');
  const stepTextTitle = document.getElementById('proof-step-text-title');

  if (currentProofMode === 'photo') {
    if (stepPhotoTitle) stepPhotoTitle.classList.add('hidden');
    if (stepTextTitle) stepTextTitle.classList.add('hidden');
    if (tabPhoto) tabPhoto.className = activeAmberClass;
    if (tabText) tabText.className = inactiveClass;
    if (tabBoth) tabBoth.className = inactiveClass;
    if (photoContainer) photoContainer.classList.remove('hidden');
    if (textContainer) textContainer.classList.add('hidden');
    if (noteZone) {
      if (isMobile) noteZone.classList.remove('hidden');
      else noteZone.classList.add('hidden');
    }

    if (submitBtn) {
      submitBtn.classList.remove('hidden');
      if (currentProofBase64) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Gửi AI Duyệt Ảnh</span><span>📸</span>`;
      } else {
        submitBtn.disabled = true;
        if (!isMobile) {
          submitBtn.classList.add('hidden');
        } else {
          submitBtn.classList.remove('hidden');
          submitBtn.innerHTML = `<span>Gửi AI Duyệt Ảnh</span><span>📸</span>`;
        }
      }
    }
  } else if (currentProofMode === 'text') {
    if (stepPhotoTitle) stepPhotoTitle.classList.add('hidden');
    if (stepTextTitle) stepTextTitle.classList.add('hidden');
    if (tabText) tabText.className = activeBlueClass;
    if (tabPhoto) tabPhoto.className = inactiveClass;
    if (tabBoth) tabBoth.className = inactiveClass;
    if (photoContainer) photoContainer.classList.add('hidden');
    if (textContainer) textContainer.classList.remove('hidden');

    if (submitBtn) {
      submitBtn.classList.remove('hidden');
      submitBtn.innerHTML = `<span>Gửi Báo Cáo Cho AI Duyệt</span><span>✍️</span>`;
      submitBtn.disabled = textVal.length < 10;
    }
  } else {
    // Mode 'both' (Kết hợp Ảnh và Báo Cáo)
    if (stepPhotoTitle) stepPhotoTitle.classList.remove('hidden');
    if (stepTextTitle) stepTextTitle.classList.remove('hidden');
    if (tabBoth) tabBoth.className = activePurpleClass;
    if (tabPhoto) tabPhoto.className = inactiveClass;
    if (tabText) tabText.className = inactiveClass;
    if (photoContainer) photoContainer.classList.remove('hidden');
    if (textContainer) textContainer.classList.remove('hidden');
    if (noteZone) noteZone.classList.add('hidden');

    if (submitBtn) {
      submitBtn.classList.remove('hidden');
      submitBtn.innerHTML = `<span>Gửi AI Duyệt (Ảnh + Báo Cáo)</span><span>🚀</span>`;
      if (!isMobile) {
        submitBtn.disabled = true;
      } else {
        const hasPhoto = Boolean(currentProofBase64);
        const hasText = textVal.length >= 10;
        submitBtn.disabled = !(hasPhoto && hasText);
      }
    }
  }
}
if (typeof window !== 'undefined') {
  window.switchProofTab = switchProofTab;
}

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
    rankEl.className = `rank-badge-${quest.rank || 'B'} text-[10px] font-mono font-black px-2 py-0.5 rounded-md hidden`;
  }

  const coinsEl = document.getElementById('proof-quest-coins');
  if (coinsEl) coinsEl.textContent = `+${quest.rewardCoins || 10} Vàng`;

  const titleEl = document.getElementById('proof-quest-title');
  if (titleEl) titleEl.textContent = quest.title;

  // Target mode strictly follows quest.proofType (1 out of 3 options: photo | text | both)
  const targetMode = quest.proofType === 'both' ? 'both' : (quest.proofType === 'text' ? 'text' : 'photo');

  // Harmonize guidance with targetMode so it never displays contradictory instructions
  let effectiveGuidance = (quest.proofGuidance || '').trim();
  if (targetMode === 'text') {
    if (!effectiveGuidance || /chụp\s*(?:lại\s*)?ảnh|camera|trang\s*vở/i.test(effectiveGuidance)) {
      effectiveGuidance = 'Ghi lại tóm tắt 2-3 ý chính, từ vựng hoặc kết quả cụ thể bạn vừa hoàn thành.';
    }
  } else if (targetMode === 'photo') {
    if (!effectiveGuidance || /viết\s*(?:báo\s*cáo|tóm\s*tắt)|nhập\s*văn\s*bản/i.test(effectiveGuidance)) {
      effectiveGuidance = 'Chụp ảnh màn hình hoặc kết quả công việc thực tế để AI thẩm định.';
    }
  } else if (targetMode === 'both') {
    if (!effectiveGuidance || (!/chụp/i.test(effectiveGuidance) || !/(?:viết|báo\s*cáo|tóm\s*tắt)/i.test(effectiveGuidance))) {
      effectiveGuidance = 'Chụp 1 bức ảnh thực tế và viết tóm tắt ngắn gọn những gì bạn đã làm.';
    }
  }

  const guidanceContainer = document.getElementById('proof-guidance-container');
  const guidanceBox = document.getElementById('proof-guidance-box');
  const guidanceLabel = document.getElementById('proof-guidance-label');
  const guidanceText = document.getElementById('proof-guidance-text');
  if (guidanceContainer && guidanceText) {
    if (effectiveGuidance) {
      guidanceText.textContent = effectiveGuidance;
      guidanceContainer.classList.remove('hidden');
      if (guidanceBox) {
        if (targetMode === 'both') {
          guidanceBox.className = 'p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-900 dark:text-purple-300 flex items-start gap-1.5';
        } else if (targetMode === 'text') {
          guidanceBox.className = 'p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-1.5';
        } else {
          guidanceBox.className = 'p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-1.5';
        }
      }
      if (guidanceLabel) {
        guidanceLabel.className = targetMode === 'both' ? 'font-bold text-purple-700 dark:text-purple-300' : (targetMode === 'text' ? 'font-bold text-blue-700 dark:text-blue-300' : 'font-bold text-amber-700 dark:text-amber-300');
      }
    } else {
      guidanceContainer.classList.add('hidden');
    }
  }

  // Update dynamic modal header icon, title and subtitle
  const modalIconBox = document.getElementById('proof-modal-icon-box');
  const modalIcon = document.getElementById('proof-modal-icon');
  const modalTitle = document.getElementById('proof-modal-title');
  const modalSub = document.getElementById('proof-modal-subtitle') || document.querySelector('#modal-quest-proof h3 + p');

  if (targetMode === 'both') {
    if (modalIconBox) modalIconBox.className = 'w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-lg shadow-sm';
    if (modalIcon) {
      modalIcon.textContent = 'auto_awesome';
      modalIcon.className = 'material-symbols-outlined text-lg leading-none text-purple-500';
    }
    if (modalTitle) {
      modalTitle.textContent = 'XÁC THỰC KẾT HỢP (ẢNH & BÁO CÁO)';
      modalTitle.className = 'font-rpg-title font-extrabold text-sm sm:text-base text-purple-600 dark:text-purple-400';
    }
    if (modalSub) modalSub.textContent = 'Chụp ảnh thực tế và viết báo cáo để AI thẩm định trước khi mở khóa Vàng';
  } else if (targetMode === 'text') {
    if (modalIconBox) modalIconBox.className = 'w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-lg shadow-sm';
    if (modalIcon) {
      modalIcon.textContent = 'edit_note';
      modalIcon.className = 'material-symbols-outlined text-lg leading-none text-blue-500';
    }
    if (modalTitle) {
      modalTitle.textContent = 'BÁO CÁO KẾT QUẢ CHO AI DUYỆT';
      modalTitle.className = 'font-rpg-title font-extrabold text-sm sm:text-base text-blue-600 dark:text-blue-400';
    }
    if (modalSub) modalSub.textContent = 'Ghi lại nội dung công việc để AI thẩm định trước khi mở khóa Vàng';
  } else {
    if (modalIconBox) modalIconBox.className = 'w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-lg shadow-sm';
    if (modalIcon) {
      modalIcon.textContent = 'photo_camera';
      modalIcon.className = 'material-symbols-outlined text-lg leading-none text-amber-500';
    }
    if (modalTitle) {
      modalTitle.textContent = 'NỘP BẰNG CHỨNG CHO AI DUYỆT';
      modalTitle.className = 'font-rpg-title font-extrabold text-sm sm:text-base text-amber-600 dark:text-amber-400';
    }
    if (modalSub) modalSub.textContent = 'Chụp ảnh thực tế bằng camera điện thoại để AI thẩm định trước khi mở khóa Vàng';
  }

  // Update single proof mode badge indicator in the snapshot card
  const indicator = document.getElementById('proof-mode-indicator');
  if (indicator) {
    indicator.classList.remove('hidden');
    if (targetMode === 'both') {
      indicator.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25';
      indicator.innerHTML = `<span>📸+✍️</span><span>Kết hợp Ảnh & Báo cáo</span>`;
    } else if (targetMode === 'text') {
      indicator.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25';
      indicator.innerHTML = `<span>✍️</span><span>Báo cáo nội dung</span>`;
    } else {
      indicator.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25';
      indicator.innerHTML = `<span>📸</span><span>Chụp ảnh thực tế</span>`;
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

  const textInput = document.getElementById('input-quest-proof-text');
  if (textInput) {
    textInput.value = '';
    textInput.disabled = false;
  }
  const textCharCount = document.getElementById('proof-text-char-count');
  if (textCharCount) {
    textCharCount.textContent = '0/10 ký tự tối thiểu';
    textCharCount.className = 'text-[10px] font-mono text-slate-400 font-normal';
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

  switchProofTab(targetMode);

  // Hide 3-tab switcher so only the 1 required proof mode is displayed
  const tabSwitcher = document.getElementById('proof-tab-switcher');
  if (tabSwitcher) {
    tabSwitcher.classList.add('hidden');
  }

  const cancelProofSessionBtn = document.getElementById('btn-cancel-proof-session');
  if (cancelProofSessionBtn) {
    if (quest.focusTimerCompleted) {
      cancelProofSessionBtn.classList.remove('hidden');
    } else {
      cancelProofSessionBtn.classList.add('hidden');
    }
  }

  openModal('modal-quest-proof');
}

async function submitQuestProofToAI() {
  if (!currentProofQuest || isSubmittingProof) return;

  const textInput = document.getElementById('input-quest-proof-text');
  const noteInput = document.getElementById('input-quest-proof-note');
  const workContent = textInput ? textInput.value.trim() : '';
  let userNote = noteInput ? noteInput.value.trim() : '';
  if (currentProofMode === 'text' || currentProofMode === 'both') {
    userNote = workContent;
  }

  if (currentProofMode === 'both') {
    if (!isMobilePhone()) {
      showToast('Chỉ cho phép chụp và nộp ảnh từ điện thoại để chống gian lận!', 'error');
      return;
    }
    if (!currentProofBase64) {
      showToast('Vui lòng chụp ảnh bằng chứng hoàn thành nhiệm vụ!', 'warning');
      return;
    }
    if (workContent.length < 10) {
      showToast('Vui lòng nhập tối thiểu 10 ký tự mô tả cụ thể công việc đã làm!', 'warning');
      return;
    }
  } else if (currentProofMode === 'photo') {
    if (!isMobilePhone()) {
      showToast('Chỉ cho phép chụp và nộp ảnh từ điện thoại để chống gian lận!', 'error');
      return;
    }
    if (!currentProofBase64) {
      showToast('Vui lòng chụp ảnh bằng chứng hoàn thành nhiệm vụ!', 'warning');
      return;
    }
  } else {
    // text mode
    if (workContent.length < 10) {
      showToast('Vui lòng nhập tối thiểu 10 ký tự mô tả cụ thể công việc đã làm!', 'warning');
      return;
    }
  }

  const submitBtn = document.getElementById('btn-submit-proof');
  const evaluatingZone = document.getElementById('proof-evaluating-zone');
  const resultBox = document.getElementById('proof-result-box');
  const resultIcon = document.getElementById('proof-result-icon');
  const resultTitle = document.getElementById('proof-result-title');
  const resultFeedback = document.getElementById('proof-result-feedback');

  isSubmittingProof = true;
  let stopProofProgress = null;
  if (typeof startM3EvaluationProgress === 'function') {
    stopProofProgress = startM3EvaluationProgress('proof-evaluating', [
      { text: 'Trích xuất nội dung minh chứng...', pct: 35 },
      { text: 'Đối chiếu tiêu chí hoàn thành...', pct: 70 },
      { text: 'Đóng dấu xác thực kết quả...', pct: 95 }
    ]);
  }
  if (typeof setButtonLoading === 'function' && submitBtn) {
    setButtonLoading(submitBtn, true, 'AI đang thẩm định...');
  } else if (submitBtn) {
    submitBtn.disabled = true;
  }
  if (noteInput) noteInput.disabled = true;
  if (textInput) textInput.disabled = true;
  if (evaluatingZone) evaluatingZone.classList.remove('hidden');
  if (resultBox) resultBox.classList.add('hidden');

  try {
    const payload = {
      questId: currentProofQuest.id,
      title: currentProofQuest.title,
      description: currentProofQuest.description,
      proofType: currentProofMode,
      workContent: (currentProofMode === 'text' || currentProofMode === 'both') ? workContent : undefined,
      userNote: currentProofMode === 'photo' ? userNote : workContent,
      imageBase64: (currentProofMode === 'photo' || currentProofMode === 'both') ? currentProofBase64 : undefined
    };

    const res = await fetch('/api/ai', {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'verify_proof',
        payload
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
        pendingApprovedQuest.proofUserNote = userNote || '';
        pendingApprovedQuest.proofFeedback = data.feedback || '';

        if (data.proofImageUrl) {
          pendingApprovedQuest.proofImageUrl = data.proofImageUrl;
          currentProofQuest.proofImageUrl = data.proofImageUrl;
          currentProofQuest.proofUserNote = userNote || '';
          currentProofQuest.proofFeedback = data.feedback || '';
          if (!Array.isArray(appState.proofPhotos)) {
            appState.proofPhotos = [];
          }
          appState.proofPhotos.unshift({
            id: 'proof_' + Date.now(),
            questId: currentProofQuest.id,
            questTitle: currentProofQuest.title,
            proofImageUrl: data.proofImageUrl,
            rewardCoins: currentProofQuest.rewardCoins || 10,
            userNote: userNote || '',
            feedback: data.feedback || '',
            timestamp: Date.now()
          });
          if (appState.proofPhotos.length > 100) {
            appState.proofPhotos = appState.proofPhotos.slice(0, 100);
          }
        } else {
          currentProofQuest.proofUserNote = userNote || '';
          currentProofQuest.proofFeedback = data.feedback || '';
        }

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
        const defaultFeedback = currentProofMode === 'both'
          ? 'Bằng chứng kết hợp chưa đạt yêu cầu. Vui lòng kiểm tra lại ảnh chụp và nội dung báo cáo nhé.'
          : (currentProofMode === 'text'
            ? 'Nội dung báo cáo chưa đạt yêu cầu hoặc không rõ ràng. Vui lòng nêu cụ thể những gì bạn đã làm.'
            : 'Ảnh chưa thấy rõ kết quả hoàn thành. Bạn vui lòng chụp lại nhé.');
        if (resultFeedback) resultFeedback.textContent = data.feedback || defaultFeedback;

        sfx.playGong();
        const warningMsg = currentProofMode === 'both'
          ? 'AI chưa duyệt bằng chứng kết hợp: ' + (data.feedback || 'Chưa đạt yêu cầu')
          : (currentProofMode === 'text'
            ? 'AI chưa duyệt báo cáo: ' + (data.feedback || 'Nội dung chưa đạt yêu cầu')
            : 'AI chưa phê duyệt bằng chứng. Vui lòng chụp lại ảnh rõ hơn nhé!');
        showToast(warningMsg, 'warning');

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = currentProofMode === 'both'
            ? `<span>Nộp Lại (Ảnh + Báo Cáo)</span><span>🚀</span>`
            : (currentProofMode === 'text'
              ? `<span>Nộp Lại Báo Cáo</span><span>✍️</span>`
              : `<span>Gửi Lại AI Duyệt</span><span>📸</span>`);
        }
        if (noteInput) noteInput.disabled = false;
        if (textInput) textInput.disabled = false;
      }
    }
  } catch (err) {
    if (evaluatingZone) evaluatingZone.classList.add('hidden');
    const errPrefix = currentProofMode === 'both'
      ? 'Lỗi thẩm định bằng chứng kết hợp: '
      : (currentProofMode === 'text' ? 'Lỗi thẩm định báo cáo: ' : 'Lỗi thẩm định ảnh: ');
    showToast(errPrefix + (err.message || 'Vui lòng thử lại'), 'error');
    if (submitBtn) submitBtn.disabled = false;
    if (noteInput) noteInput.disabled = false;
    if (textInput) textInput.disabled = false;
  } finally {
    isSubmittingProof = false;
    if (stopProofProgress) stopProofProgress();
    if (typeof setButtonLoading === 'function' && submitBtn) {
      setButtonLoading(submitBtn, false);
    }
  }
}

/**
 * Mở modal xem lại hình ảnh hoặc nội dung báo cáo bằng chứng nhiệm vụ đã được duyệt kèm ghi chú và nhận xét AI
 * @param {string|null} imageUrl 
 * @param {string} questTitle 
 * @param {string} userNote
 * @param {string} feedback
 * @param {number|null} timestamp
 */
function openProofViewerModal(imageUrl, questTitle = '', userNote = '', feedback = '', timestamp = null) {
  if (!imageUrl && !userNote && !feedback) {
    showToast('Không tìm thấy nội dung bằng chứng.', 'warning');
    return;
  }
  const modal = document.getElementById('modal-proof-viewer');
  if (!modal) return;

  const imgContainer = document.getElementById('proof-viewer-img-container');
  const imgEl = document.getElementById('proof-viewer-img');
  const skeletonEl = document.getElementById('proof-viewer-skeleton');
  const titleEl = document.getElementById('proof-viewer-title');
  const subtitleEl = document.getElementById('proof-viewer-subtitle');
  const downloadLink = document.getElementById('proof-viewer-download');

  const noteZone = document.getElementById('proof-viewer-note-zone');
  const noteText = document.getElementById('proof-viewer-note-text');
  const feedbackZone = document.getElementById('proof-viewer-feedback-zone');
  const feedbackText = document.getElementById('proof-viewer-feedback-text');

  if (imageUrl) {
    if (imgContainer) imgContainer.classList.remove('hidden');
    if (imgEl) {
      if (skeletonEl) {
        skeletonEl.style.display = 'flex';
        skeletonEl.style.opacity = '1';
      }
      imgEl.classList.remove('proof-img-loaded');
      imgEl.classList.add('proof-img-loading');

      imgEl.onload = () => {
        imgEl.classList.remove('proof-img-loading');
        imgEl.classList.add('proof-img-loaded');
        if (skeletonEl) {
          skeletonEl.style.opacity = '0';
          setTimeout(() => {
            skeletonEl.style.display = 'none';
          }, 300);
        }
      };
      imgEl.onerror = () => {
        if (skeletonEl) skeletonEl.style.display = 'none';
        imgEl.classList.remove('proof-img-loading');
        imgEl.classList.add('proof-img-loaded');
      };
      imgEl.src = imageUrl;
    }
    if (downloadLink) {
      downloadLink.classList.remove('hidden');
      downloadLink.href = imageUrl;
    }
  } else {
    // Không có ảnh (Text Proof)
    if (imgContainer) imgContainer.classList.add('hidden');
    if (downloadLink) downloadLink.classList.add('hidden');
  }

  if (titleEl) {
    titleEl.textContent = questTitle || (imageUrl ? 'ẢNH BẰNG CHỨNG NHIỆM VỤ' : 'BÁO CÁO NHIỆM VỤ');
  }
  if (subtitleEl) {
    if (timestamp) {
      const timeStr = new Date(timestamp).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      subtitleEl.textContent = `${imageUrl ? 'Chụp lúc' : 'Báo cáo lúc'}: ${timeStr} · AI Arbiter đã thẩm định`;
    } else {
      subtitleEl.textContent = 'Bằng chứng đã được AI Arbiter thẩm định và lưu trữ an toàn';
    }
  }

  // Hiển thị ghi chú thông tin thêm hoặc nội dung báo cáo của người dùng
  if (noteZone && noteText) {
    if (userNote && userNote.trim()) {
      noteText.textContent = userNote.trim();
      noteZone.classList.remove('hidden');
    } else {
      noteZone.classList.add('hidden');
      noteText.textContent = '';
    }
  }

  // Hiển thị lời nhận xét thẩm định của AI
  if (feedbackZone && feedbackText) {
    if (feedback && feedback.trim()) {
      feedbackText.textContent = feedback.trim();
      feedbackZone.classList.remove('hidden');
    } else {
      feedbackZone.classList.add('hidden');
      feedbackText.textContent = '';
    }
  }

  openModal('modal-proof-viewer');
}
