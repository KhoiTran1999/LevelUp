// =============================================================================
// 9. AI REWARD APPRAISAL & CREATION
// =============================================================================
let currentPendingReward = null;
let currentRewardDebateHistory = [];

function updateRewardVerdictDisplay() {
  if (!currentPendingReward) return;

  const tier = (currentPendingReward.tier || 'rare').toLowerCase();
  const tierUpper = tier.toUpperCase();

  const evalTier = document.getElementById('eval-tier');
  if (evalTier) {
    evalTier.textContent = tierUpper;
    evalTier.className = `hidden text-xs font-mono font-black px-2.5 py-1 rounded-lg border ${
      tier === 'legendary' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40' :
      tier === 'epic' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40' :
      tier === 'rare' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40' :
      'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/40'
    }`;
  }

  const evalPrice = document.getElementById('eval-price');
  if (evalPrice) {
    evalPrice.innerHTML = `${COIN_ICON_HTML} ${currentPendingReward.price} Vàng`;
  }

  const targetMinutes = parseInt(currentPendingReward.targetMinutes, 10) || 0;
  const timeText = targetMinutes > 0 ? `${targetMinutes} Phút` : 'Không cần bấm giờ';

  const evalTargetMinutes = document.getElementById('eval-target-minutes');
  if (evalTargetMinutes) {
    evalTargetMinutes.textContent = timeText;
  }

  const evalVerdict = document.getElementById('eval-verdict');
  if (evalVerdict && currentPendingReward.verdict) {
    evalVerdict.textContent = `"${currentPendingReward.verdict}"`;
  }

  const evalCatBadge = document.getElementById('eval-category-badge');
  if (evalCatBadge && currentPendingReward.category) {
    const catMap = {
      entertainment: '🎮 GIẢI TRÍ',
      treat: '🥤 ĂN UỐNG',
      item: '📦 VẬT PHẨM',
      milestone: '🏆 CỘT MỐC',
      harmful: '⚠️ SỨC KHỎE'
    };
    evalCatBadge.textContent = catMap[currentPendingReward.category] || '🎁 TỰ THƯỞNG';
  }

  const lockedIcon = document.getElementById('reward-locked-icon');
  if (lockedIcon) lockedIcon.textContent = currentPendingReward.icon || '🎁';

  const lockedName = document.getElementById('reward-locked-name');
  if (lockedName) lockedName.textContent = currentPendingReward.name;

  const lockedDesc = document.getElementById('reward-locked-desc');
  const lockedDescContainer = document.getElementById('reward-locked-desc-container');
  if (lockedDesc && lockedDescContainer) {
    if (currentPendingReward.description) {
      lockedDesc.textContent = currentPendingReward.description;
      lockedDescContainer.classList.remove('hidden');
    } else {
      lockedDescContainer.classList.add('hidden');
    }
  }

  const lockedTier = document.getElementById('reward-locked-tier-label');
  if (lockedTier) lockedTier.textContent = tierUpper;

  const lockedTimeLabel = document.getElementById('reward-locked-time-label');
  if (lockedTimeLabel) lockedTimeLabel.textContent = timeText;

  const lockedPrice = document.getElementById('reward-locked-price-label');
  if (lockedPrice) lockedPrice.innerHTML = `${COIN_ICON_HTML} ${currentPendingReward.price} Vàng`;
}

function renderRewardVerdictStep() {
  document.getElementById('reward-evaluating-step').classList.add('hidden');
  document.getElementById('reward-verdict-step').classList.remove('hidden');

  updateRewardVerdictDisplay();

  const evalVerdict = document.getElementById('eval-verdict');
  if (evalVerdict) evalVerdict.textContent = `"${currentPendingReward.verdict || 'Phần thưởng đã được định giá phù hợp.'}"`;

  const evalAdvice = document.getElementById('eval-advice');
  if (evalAdvice) evalAdvice.textContent = currentPendingReward.advice || 'Tự thưởng có chừng mực sau khi nỗ lực để duy trì động lực bền vững.';

  // AI Modification Notice
  const rewardModNotice = document.getElementById('reward-modified-notice');
  const rewardModReason = document.getElementById('reward-modified-reason');
  if (rewardModNotice && rewardModReason) {
    if (currentPendingReward.isModified && currentPendingReward.modificationReason) {
      rewardModNotice.classList.remove('hidden');
      rewardModReason.textContent = currentPendingReward.modificationReason;
    } else {
      rewardModNotice.classList.add('hidden');
    }
  }

  const rewardDebateBox = document.getElementById('reward-debate-container');
  if (rewardDebateBox) rewardDebateBox.classList.add('hidden');
  const rewardChatLogs = document.getElementById('reward-debate-chat-logs');
  if (rewardChatLogs) rewardChatLogs.innerHTML = '';
}

async function evaluateRewardItem() {
  const name = document.getElementById('input-reward-name').value.trim();
  const desc = document.getElementById('input-reward-desc').value.trim();
  const estimate = Math.max(0, parseInt(document.getElementById('input-reward-estimate')?.value, 10) || 0);
  let duration = Math.max(0, parseInt(document.getElementById('input-reward-duration')?.value, 10) || 0);
  if (duration <= 0) {
    const textDur = extractDurationFromText(`${name} ${desc}`);
    if (textDur > 0) duration = textDur;
  }

  if (!name) {
    showToast('Vui lòng nhập tên phần thưởng!', 'error');
    return;
  }

  document.getElementById('reward-form-step').classList.add('hidden');
  document.getElementById('reward-evaluating-step').classList.remove('hidden');

  try {
    const currentQuests = (appState.quests || []).filter(q => q.status === 'active').slice(0, 10).map(q => ({
      title: q.title,
      rewardCoins: q.rewardCoins,
      type: q.type,
      targetMinutes: q.targetMinutes
    }));

    const res = await fetch('/api/ai', {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'evaluate_reward',
        payload: {
          name,
          description: desc,
          userEstimatePrice: estimate,
          userEstimateDuration: duration,
          currentQuests,
          userCoins: appState.profile?.coins || 0
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.error || 'AI Error');
    }
    const data = await res.json();

    const finalName = (data.name && typeof data.name === 'string') ? data.name.trim() : name;
    const finalDesc = (data.description !== undefined && typeof data.description === 'string') ? data.description.trim() : desc;
    const isModified = Boolean(data.isModified) || (finalName.toLowerCase() !== name.trim().toLowerCase());

    currentPendingReward = {
      id: 'shop_' + Date.now(),
      name: finalName,
      description: finalDesc,
      isModified,
      modificationReason: data.modificationReason || (isModified ? 'AI đã điều chỉnh phần thưởng để lành mạnh và duy trì động lực tốt hơn.' : ''),
      price: data.price || 30,
      tier: data.tier || 'rare',
      targetMinutes: data.targetMinutes !== undefined ? data.targetMinutes : duration,
      icon: data.icon || '🎁',
      signature: data.signature || '',
      verdict: data.verdict || 'Phần thưởng đã được định giá phù hợp.',
      advice: data.advice || 'Tự thưởng có chừng mực sau khi nỗ lực để duy trì động lực bền vững.'
    };
    currentRewardDebateHistory = [];

    renderRewardVerdictStep();
  } catch (err) {
    showToast('Không thể kết nối với AI: ' + err.message, 'error');
    document.getElementById('reward-evaluating-step').classList.add('hidden');
    document.getElementById('reward-form-step').classList.remove('hidden');
  }
}

async function sendRewardDebateArgument(customArg = null, selectedOption = null) {
  if (isDebatingReward) return;

  const argInput = document.getElementById('input-reward-debate-arg');
  const argument = (typeof customArg === 'string' && customArg.trim())
    ? customArg.trim()
    : (argInput ? argInput.value.trim() : '');
  if (!argument || !currentPendingReward) return;

  const chatLogs = document.getElementById('reward-debate-chat-logs');
  const btnSend = document.getElementById('btn-send-reward-debate');

  isDebatingReward = true;
  if (argInput) {
    argInput.disabled = true;
    argInput.value = '';
  }
  if (btnSend) {
    btnSend.disabled = true;
    btnSend.innerHTML = `<span class="inline-flex gap-1 items-center"><span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-bounce" style="animation-delay: 0ms"></span><span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-bounce" style="animation-delay: 150ms"></span><span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-bounce" style="animation-delay: 300ms"></span></span>`;
  }

  appendUserChatBubble(chatLogs, argument);

  const loadingBubble = createDebateLoadingBubble('reward');
  chatLogs.appendChild(loadingBubble);
  chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });

  try {
    const currentQuests = (appState.quests || []).filter(q => q.status === 'active').slice(0, 10).map(q => ({
      title: q.title,
      rewardCoins: q.rewardCoins,
      type: q.type,
      targetMinutes: q.targetMinutes
    }));

    const prevReward = { ...currentPendingReward };

    const data = await fetchDebateStream('/api/ai', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        action: 'debate_reward',
        payload: {
          reward: currentPendingReward,
          argument,
          history: currentRewardDebateHistory,
          currentQuests,
          userCoins: appState.profile?.coins || 0,
          selectedOption,
          stream: true
        }
      })
    }, (stepData) => {
      if (loadingBubble && loadingBubble.updateStep) loadingBubble.updateStep(stepData);
    });

    if (loadingBubble && loadingBubble.cleanup) loadingBubble.cleanup();
    loadingBubble.remove();

    if (data && typeof data.reply === 'string' && (data.reply.trim().startsWith('{') || data.reply.trim().startsWith('```json'))) {
      try {
        let raw = data.reply.trim();
        if (raw.startsWith('```json')) raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        else if (raw.startsWith('```')) raw = raw.replace(/^```\s*/i, '').replace(/```\s*$/, '');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.reply === 'string') {
          data.reply = parsed.reply;
          if ((!data.options || data.options.length === 0) && Array.isArray(parsed.options)) {
            data.options = parsed.options;
          }
        }
      } catch (_) {}
    }

    const diffTags = [];
    if (data.accepted) {
      if (data.newPrice && data.newPrice !== prevReward.price) {
        diffTags.push(`💰 Giá: ${prevReward.price} ➔ ${data.newPrice} Vàng`);
      }
      if (data.newTargetMinutes !== undefined && data.newTargetMinutes !== prevReward.targetMinutes) {
        const oldM = prevReward.targetMinutes ? `${prevReward.targetMinutes}p` : 'Không bấm giờ';
        const newM = data.newTargetMinutes ? `${data.newTargetMinutes}p` : 'Không bấm giờ';
        diffTags.push(`⏱️ Thời gian: ${oldM} ➔ ${newM}`);
      }
      if (data.newName && data.newName !== prevReward.name) {
        diffTags.push(`🎁 Tên mới: "${data.newName}"`);
      }
    }

    appendAiChatBubble(chatLogs, {
      reply: data.reply,
      accepted: data.accepted,
      diffTags,
      botName: 'Trợ Lý Cửa Hàng AI',
      botIcon: '🎁',
      options: data.options,
      mode: 'reward',
      toolsExecuted: data.toolsExecuted,
      onSelectOption: (opt) => sendRewardDebateArgument(opt.argument || `Chốt phương án ${opt.id}`, opt)
    });

    currentRewardDebateHistory.push({ user: argument, arbiter: data.reply });

    if (data.accepted) {
      if (data.newName) currentPendingReward.name = data.newName;
      if (data.newDescription !== undefined) currentPendingReward.description = data.newDescription;
      if (data.newPrice !== undefined && Number(data.newPrice) > 0) currentPendingReward.price = Number(data.newPrice);
      if (data.newTier) currentPendingReward.tier = data.newTier;
      if (data.newTargetMinutes !== undefined) currentPendingReward.targetMinutes = data.newTargetMinutes;
      if (data.signature) currentPendingReward.signature = data.signature;
      if (data.reply) currentPendingReward.verdict = data.reply;

      const rewardModNotice = document.getElementById('reward-modified-notice');
      if (rewardModNotice) rewardModNotice.classList.add('hidden');

      updateRewardVerdictDisplay();

      showToast('Thương lượng thành công! AI đã cập nhật phần thưởng.', 'gold');
      sfx.playFanfare();
    }
  } catch (err) {
    if (loadingBubble && loadingBubble.cleanup) loadingBubble.cleanup();
    loadingBubble.remove();
    const errRow = document.createElement('div');
    errRow.className = 'flex justify-start items-start gap-2 message-fade-in';
    errRow.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">⚠️</div>
      <div class="max-w-[85%] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl rounded-tl-xs p-3 text-xs text-rose-700 dark:text-rose-300 shadow-xs">
        <strong>Lỗi thương lượng:</strong> ${escapeHtml(err.message || 'Không thể kết nối với AI. Vui lòng thử lại.')}
      </div>
    `;
    chatLogs.appendChild(errRow);
    chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });
    showToast('Lỗi thương lượng: ' + (err.message || 'Vui lòng thử lại'), 'error');
  } finally {
    isDebatingReward = false;
    if (argInput) {
      argInput.disabled = false;
      argInput.focus();
    }
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.innerHTML = `<span>Gửi</span><span class="text-[10px]">➤</span>`;
    }
  }
}

function openRewardRenegotiateModal(itemId) {
  const item = appState.shopItems.find(i => i.id === itemId);
  if (!item) return;

  currentEditingRewardId = item.id;
  currentPendingReward = {
    id: item.id,
    name: item.name,
    description: item.description || '',
    price: item.price,
    tier: item.tier || 'rare',
    targetMinutes: item.targetMinutes !== undefined ? item.targetMinutes : extractRewardDuration(item),
    icon: item.icon || '🎁',
    signature: item.signature || '',
    verdict: item.verdict || 'Phần thưởng hợp lý.',
    advice: item.advice || 'Tự thưởng có chừng mực sau khi nỗ lực để duy trì động lực bền vững.'
  };
  currentRewardDebateHistory = [];

  const titleEl = document.getElementById('modal-reward-title');
  const subEl = document.getElementById('modal-reward-subtitle');
  if (titleEl) titleEl.textContent = 'THƯƠNG LƯỢNG LẠI PHẦN THƯỞNG';
  if (subEl) subEl.textContent = 'Thương lượng với AI để điều chỉnh tên, mô tả hoặc mức giá Vàng';

  const saveBtn = document.getElementById('btn-save-reward');
  if (saveBtn) saveBtn.textContent = '✓ Cập Nhật Phần Thưởng';

  document.getElementById('reward-form-step').classList.add('hidden');
  document.getElementById('reward-evaluating-step').classList.add('hidden');
  document.getElementById('reward-verdict-step').classList.remove('hidden');

  updateRewardVerdictDisplay();

  const evalVerdict = document.getElementById('eval-verdict');
  if (evalVerdict) evalVerdict.textContent = `"Bạn đang thương lượng lại phần thưởng '${item.name}' với AI."`;

  const evalAdvice = document.getElementById('eval-advice');
  if (evalAdvice) evalAdvice.textContent = currentPendingReward.advice;

  const rewardModNotice = document.getElementById('reward-modified-notice');
  if (rewardModNotice) rewardModNotice.classList.add('hidden');

  const debateBox = document.getElementById('reward-debate-container');
  if (debateBox) debateBox.classList.remove('hidden');

  initRewardDebateChat(true);

  const argInput = document.getElementById('input-reward-debate-arg');
  if (argInput) argInput.value = '';

  openModal('modal-reward');
  if (argInput) setTimeout(() => argInput.focus(), 150);
}

async function savePendingReward() {
  if (!currentPendingReward) return;

  const isEditing = Boolean(currentEditingRewardId);
  const rewardName = currentPendingReward.name || 'Phần thưởng mới';
  const rewardPrice = currentPendingReward.price || 30;
  const rewardTier = (currentPendingReward.tier || 'rare').toUpperCase();
  const rewardIcon = currentPendingReward.icon || '🎁';
  const targetMinutes = parseInt(currentPendingReward.targetMinutes, 10) || 0;
  const timeInfo = targetMinutes > 0 ? ` • ⏱️ ${targetMinutes} Phút` : ' • ⚡ Không bấm giờ';

  const ok = await confirmAction({
    title: isEditing ? 'Xác Nhận Cập Nhật Phần Thưởng?' : 'Xác Nhận Thêm Phần Thưởng?',
    message: isEditing
      ? `Bạn có chắc muốn lưu các thay đổi cho phần thưởng "${rewardName}"?`
      : `Bạn có chắc chắn muốn thêm phần thưởng "${rewardName}" vào Cửa Hàng?`,
    detail: `💰 Giá: ${rewardPrice} Vàng${timeInfo} • Biểu tượng: ${rewardIcon}`,
    confirmText: isEditing ? 'Cập Nhật' : 'Thêm Vào Cửa Hàng',
    cancelText: 'Xem Lại',
    icon: rewardIcon,
    btnColor: 'amber'
  });

  if (!ok) return;

  if (currentEditingRewardId) {
    const targetItem = appState.shopItems.find(i => i.id === currentEditingRewardId);
    if (targetItem) {
      targetItem.name = currentPendingReward.name;
      targetItem.description = currentPendingReward.description || '';
      targetItem.price = currentPendingReward.price;
      targetItem.tier = currentPendingReward.tier || 'rare';
      targetItem.targetMinutes = targetMinutes;
      if (currentPendingReward.icon) targetItem.icon = currentPendingReward.icon;
      targetItem.signature = currentPendingReward.signature || targetItem.signature || '';

      sfx.playFanfare();
      showToast(`Đã cập nhật phần thưởng "${targetItem.name}"!`, 'success');
      closeModal('modal-reward');
      currentEditingRewardId = null;
      currentPendingReward = null;
      renderShop();
      triggerSave(true);
      return;
    }
  }

  const finalItem = {
    ...currentPendingReward,
    price: currentPendingReward.price,
    targetMinutes: targetMinutes,
    signature: currentPendingReward.signature || ''
  };

  appState.shopItems.unshift(finalItem);
  sfx.playFanfare();
  showToast(`Đã thêm món "${finalItem.name}" vào Cửa Hàng!`, 'success');
  closeModal('modal-reward');
  currentEditingRewardId = null;
  currentPendingReward = null;
  renderShop();
  triggerSave(true);
}
