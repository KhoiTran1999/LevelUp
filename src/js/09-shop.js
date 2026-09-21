// =============================================================================
// 7. SHOP & INVENTORY INTERACTIONS (Buy, Refund, Use, Undo, Delete)
// =============================================================================
async function deleteShopItem(itemId) {
  const item = appState.shopItems.find(i => i.id === itemId);
  if (!item) return;

  const ok = await confirmAction({
    title: 'Xóa Phần Thưởng?',
    message: `Bạn có chắc muốn xóa phần thưởng "${item.name}" khỏi Cửa Hàng?`,
    detail: '💡 Bạn có thể hoàn tác lại ngay sau khi xóa.',
    confirmText: 'Xóa 🗑️',
    cancelText: 'Giữ Lại',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!ok) return;

  const itemIndex = appState.shopItems.findIndex(i => i.id === itemId);
  const deletedItem = { ...item };
  appState.shopItems = appState.shopItems.filter(i => i.id !== itemId);
  triggerSave(true);
  renderShop();

  showToast(`Đã xóa phần thưởng "${deletedItem.name}".`, 'info', {
    label: 'Hoàn tác',
    onClick: () => {
      if (itemIndex >= 0 && itemIndex <= appState.shopItems.length) {
        appState.shopItems.splice(itemIndex, 0, deletedItem);
      } else {
        appState.shopItems.unshift(deletedItem);
      }
      triggerSave(true);
      renderShop();
      sfx.playFanfare();
      showToast(`Đã khôi phục phần thưởng "${deletedItem.name}".`, 'success');
    }
  });
}

async function buyShopItem(itemId) {
  const item = appState.shopItems.find(i => i.id === itemId);
  if (!item) return;

  // Đóng băng Cửa Hàng nếu có nợ quá hạn 7 ngày
  if (appState.profile?.bank?.isFrozen || (appState.profile?.bank?.loan && appState.profile.bank.loan.isOverdue)) {
    showToast('Tài khoản đang bị đóng băng do nợ quá hạn! Hãy hoàn thành nhiệm vụ để trả nợ trước khi đổi quà.', 'error');
    return;
  }

  const itemPrice = Math.max(0, parseInt(item.price, 10) || 0);
  if ((parseInt(appState.profile.coins, 10) || 0) < itemPrice) {
    showToast(`Chưa đủ vàng! Bạn cần thêm ${itemPrice - (parseInt(appState.profile.coins, 10) || 0)} Vàng nữa. Hãy hoàn thành thêm nhiệm vụ nhé!`, 'error');
    return;
  }

  const durationMinutes = extractRewardDuration(item);
  const hasTimer = durationMinutes > 0;

  // Nếu có hẹn giờ và đang trong nhiệm vụ tập trung, cảnh báo trước
  if (hasTimer && activeFocusQuest) {
    const okInterrupt = await confirmAction({
      title: 'Đang Trong Nhiệm Vụ Tập Trung',
      message: `Nhiệm vụ "${activeFocusQuest.title}" đang chạy (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Đổi quà này sẽ dừng nhiệm vụ để bắt đầu ${durationMinutes} phút tự thưởng cho bạn. Bạn có muốn tiếp tục?`,
      detail: '⚠️ Thời gian tập trung của nhiệm vụ đang làm dở sẽ không được tính.',
      confirmText: 'Đổi & Tự Thưởng Ngay 🎁',
      cancelText: 'Tiếp Tục Làm Việc ⚔️',
      icon: '🎁',
      btnColor: 'purple'
    });
    if (!okInterrupt) return;
  }

  const ok = await confirmAction({
    title: 'Đổi Phần Thưởng?',
    message: hasTimer
      ? `Bạn có chắc muốn dùng ${itemPrice} Vàng để đổi "${item.name}" và bắt đầu ${durationMinutes} phút tự thưởng?`
      : `Bạn có chắc muốn dùng ${itemPrice} Vàng để đổi phần thưởng "${item.name}"?`,
    detail: hasTimer
      ? `💰 Vàng hiện có: ${appState.profile.coins} | Còn lại: ${Math.max(0, appState.profile.coins - itemPrice)}\n⏱️ Đồng hồ đếm ngược ${durationMinutes} phút sẽ kích hoạt ngay trên màn hình!`
      : `💰 Vàng hiện có: ${appState.profile.coins} | Còn lại sau khi đổi: ${Math.max(0, appState.profile.coins - itemPrice)}`,
    confirmText: hasTimer ? `Đổi & Bấm Giờ (${durationMinutes}p) ⏱️` : 'Đổi Quà 🎁',
    cancelText: 'Để Sau',
    icon: item.icon || '🎁',
    btnColor: 'amber'
  });
  if (!ok) return;

  appState.profile.coins = Math.max(0, (parseInt(appState.profile.coins, 10) || 0) - itemPrice);
  appState.profile.totalCoinsSpent = Math.max(0, (parseInt(appState.profile.totalCoinsSpent, 10) || 0) + itemPrice);

  const todayStr = getLocalDayString();
  if (!item.history || typeof item.history !== 'object') {
    item.history = {};
  }
  item.history[todayStr] = (item.history[todayStr] || 0) + 1;

  const newInvItem = {
    id: 'inv_' + Date.now(),
    shopItemId: item.id || item.shopItemId,
    name: item.name,
    description: item.description || '',
    price: itemPrice,
    tier: item.tier,
    icon: item.icon,
    targetMinutes: item.targetMinutes !== undefined ? item.targetMinutes : durationMinutes,
    signature: item.signature || '',
    purchasedAt: Date.now(),
    purchasedDateStr: todayStr,
    isUsed: false
  };

  appState.inventory.unshift(newInvItem);

  addLedgerEntry({
    id: 'led_' + Date.now(),
    type: 'spend',
    category: 'reward',
    amount: item.price,
    title: `Đổi quà: ${item.name}`,
    description: `Đổi quà: ${item.name}`,
    timestamp: Date.now()
  });

  sfx.playFanfare();
  showToast(`Đổi quà thành công! "${item.name}" đã được chuyển vào Kho Quà.`, 'success', {
    label: 'Hoàn tác',
    onClick: () => refundInventoryItem(newInvItem.id, true)
  });
  triggerSave(true);
  renderHeader();
  renderShop();
  renderInventory();
  renderLedger();

  if (hasTimer) {
    await useInventoryItem(newInvItem.id, true);
    document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    switchRewardSubtab('inventory');
  }
}

async function refundInventoryItem(invId, skipConfirm = false) {
  const item = appState.inventory.find(i => i.id === invId);
  if (!item) return;

  const isCurrentlyActive = Boolean(activeRewardItem && activeRewardItem.id === invId);
  if (item.isUsed && !skipConfirm && !isCurrentlyActive) return;

  if (!skipConfirm) {
    const ok = await confirmAction({
      title: 'Hoàn Trả Phần Thưởng?',
      message: `Bạn muốn hoàn trả "${item.name}" và nhận lại ${item.price} Vàng?`,
      detail: isCurrentlyActive ? '⚠️ Bộ đếm thời gian đang chạy sẽ được dừng và số Vàng sẽ được hoàn lại đầy đủ.' : '💰 Số Vàng sẽ được hoàn lại đầy đủ vào tài khoản của bạn.',
      confirmText: 'Hoàn Trả ↩️',
      cancelText: 'Giữ Lại',
      icon: '💰',
      btnColor: 'amber'
    });
    if (!ok) return;
  }

  if (activeRewardItem && activeRewardItem.id === invId) {
    clearFocusTimerSession();
  }

  const refundDateStr = item.purchasedDateStr || getLocalDayString(item.purchasedAt || Date.now());
  const shopItem = appState.shopItems.find(i => i.id === item.shopItemId || i.name === item.name);
  if (shopItem && shopItem.history && shopItem.history[refundDateStr]) {
    shopItem.history[refundDateStr] = Math.max(0, shopItem.history[refundDateStr] - 1);
    if (shopItem.history[refundDateStr] === 0) {
      delete shopItem.history[refundDateStr];
    }
  }

  appState.profile.coins += item.price;
  appState.profile.totalCoinsSpent = Math.max(0, (parseInt(appState.profile.totalCoinsSpent, 10) || 0) - item.price);
  appState.inventory = appState.inventory.filter(i => i.id !== invId);

  addLedgerEntry({
    id: 'led_' + Date.now(),
    type: 'earn',
    category: 'reward',
    amount: item.price,
    title: `Hoàn trả quà: ${item.name}`,
    description: `Hoàn trả quà: ${item.name}`,
    timestamp: Date.now()
  });

  sfx.playCoin();
  triggerSave(true);
  renderHeader();
  renderInventory();
  renderLedger();
  showToast(`Đã hoàn trả "${item.name}" (+${item.price} Vàng).`, 'gold');
}

async function useInventoryItem(invId, skipConfirm = false) {
  const item = appState.inventory.find(i => i.id === invId);
  if (!item) return;

  // Đóng băng Cửa Hàng & Kho Quà nếu nợ quá hạn
  if (appState.profile?.bank?.isFrozen || (appState.profile?.bank?.loan && appState.profile.bank.loan.isOverdue)) {
    showToast('Tài khoản đang bị đóng băng do nợ quá hạn! Hãy hoàn thành nhiệm vụ để trả nợ trước khi sử dụng quà.', 'error');
    return;
  }

  // Case 1: Quà này đang được đếm giờ
  if (activeRewardItem && activeRewardItem.id === invId) {
    if (isFocusRunning) {
      showToast(`Phần thưởng "${item.name}" đang được đếm giờ (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại)!`, 'info');
      document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    } else {
      const ok = await confirmAction({
        title: 'Tiếp Tục Đếm Giờ Quà?',
        message: `Phần thưởng "${item.name}" đang tạm dừng với ${Math.ceil(focusRemainingSeconds / 60)} phút còn lại. Bạn có muốn tiếp tục đếm giờ?`,
        confirmText: 'Tiếp Tục ⏱️',
        cancelText: 'Hủy',
        icon: item.icon || '🎁',
        btnColor: 'purple'
      });
      if (ok) {
        toggleFocusTimer();
      }
      return;
    }
  }

  const hasSavedTimer = Boolean(item.savedTimer && item.savedTimer.remainingSeconds > 0);

  // Case 2: Đã sử dụng và không chạy timer cũng như không có bảo lưu
  if (item.isUsed && !hasSavedTimer) {
    showToast('Phần thưởng này đã được sử dụng!', 'info');
    return;
  }

  const durationMinutes = hasSavedTimer
    ? Math.ceil(item.savedTimer.remainingSeconds / 60)
    : extractRewardDuration(item);

  if (!skipConfirm) {
    // Case 3: Xung đột với phiên tập trung nhiệm vụ
    if (activeFocusQuest) {
      const ok = await confirmAction({
        title: 'Bảo Lưu Nhiệm Vụ & Dùng Quà?',
        message: `Nhiệm vụ "${activeFocusQuest.title}" đang chạy (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Bạn có muốn chuyển sang dùng phần thưởng "${item.name}"?`,
        detail: `✅ Thời gian của "${activeFocusQuest.title}" sẽ được BẢO LƯU tự động. Bạn có thể quay lại làm tiếp bất cứ lúc nào!`,
        confirmText: 'Bảo Lưu & Dùng Quà 🎁',
        cancelText: 'Tiếp Tục Nhiệm Vụ ⚔️',
        icon: '🎁',
        btnColor: 'purple'
      });
      if (!ok) return;
      activeFocusQuest.savedTimer = {
        remainingSeconds: Math.max(0, focusRemainingSeconds),
        actualFocusedSeconds: actualFocusedSeconds,
        totalSeconds: focusTotalSeconds || ((activeFocusQuest.targetMinutes || 25) * 60),
        savedAt: Date.now()
      };
      activeFocusQuest = null;
      renderQuests();
    } else if (isBreakMode) {
      // Case 4: Xung đột với giờ nghỉ giải lao
      const ok = await confirmAction({
        title: 'Kết Thúc Giờ Nghỉ?',
        message: `Bạn đang trong giờ nghỉ giải lao (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Bạn có muốn kết thúc nghỉ ngơi để bắt đầu dùng phần thưởng "${item.name}" ngay?`,
        confirmText: 'Dùng Quà Ngay 🎁',
        cancelText: 'Nghỉ Tiếp ☕',
        icon: '☕',
        btnColor: 'purple'
      });
      if (!ok) return;
      isBreakMode = false;
    } else if (activeRewardItem && activeRewardItem.id !== invId) {
      // Case 5: Đang có một phần thưởng khác đang đếm giờ
      const prevReward = activeRewardItem;
      const ok = await confirmAction({
        title: 'Đổi Phần Thưởng & Bảo Lưu?',
        message: `Bạn đang trong phiên dùng quà "${prevReward.name}" (${Math.ceil(focusRemainingSeconds / 60)} phút còn lại). Bạn có muốn chuyển sang dùng "${item.name}"?`,
        detail: `✅ Phần thưởng hiện tại sẽ được BẢO LƯU thời gian trong Kho Quà!`,
        confirmText: 'Bảo Lưu & Đổi Quà 🎁',
        cancelText: 'Giữ Quà Hiện Tại',
        icon: '🎁',
        btnColor: 'purple'
      });
      if (!ok) return;
      prevReward.savedTimer = {
        remainingSeconds: Math.max(0, focusRemainingSeconds),
        totalSeconds: focusTotalSeconds || (extractRewardDuration(prevReward) * 60),
        savedAt: Date.now()
      };
      activeRewardItem = null;
      renderInventory();
    } else if (hasSavedTimer) {
      // Case 6a: Xác nhận tiếp tục dùng quà đã bảo lưu
      const ok = await confirmAction({
        title: 'Tiếp Tục Dùng Quà Đã Bảo Lưu?',
        message: `Tiếp tục sử dụng "${item.name}" với ${durationMinutes} phút còn lại?`,
        detail: '🎉 Hãy thư giãn trọn vẹn và nạp lại năng lượng cho những thử thách tiếp theo!',
        confirmText: `Tiếp Tục Dùng (${durationMinutes}p) ⏱️`,
        cancelText: 'Để Sau',
        icon: item.icon || '🎁',
        btnColor: 'purple'
      });
      if (!ok) return;
    } else if (durationMinutes > 0) {
      // Case 6b: Xác nhận sử dụng quà kèm thời lượng đếm ngược
      const ok = await confirmAction({
        title: 'Sử Dụng Phần Thưởng & Bắt Đầu Đếm Giờ?',
        message: `Bắt đầu tận hưởng phần thưởng "${item.name}" trong ${durationMinutes} phút?`,
        detail: '🎉 Hãy thư giãn trọn vẹn và nạp lại năng lượng cho những thử thách tiếp theo!',
        confirmText: `Dùng & Bấm Giờ (${durationMinutes}p) ⏱️`,
        cancelText: 'Để Sau',
        icon: item.icon || '🎁',
        btnColor: 'purple'
      });
      if (!ok) return;
    } else {
      // Case 7: Quà nhận ngay không cần đếm giờ
      const ok = await confirmAction({
        title: 'Sử Dụng Phần Thưởng?',
        message: `Bạn muốn sử dụng phần thưởng "${item.name}" ngay bây giờ?`,
        detail: '🎉 Hãy tự thưởng cho bản thân sau những nỗ lực rèn luyện và làm việc chăm chỉ!',
        confirmText: 'Sử Dụng 🎁',
        cancelText: 'Để Sau',
        icon: item.icon || '🎁',
        btnColor: 'purple'
      });
      if (!ok) return;
    }
  } else {
    // Khi skipConfirm = true (ví dụ khi mua quà từ Cửa Hàng có timer): Tự động bảo lưu phiên cũ
    if (activeFocusQuest) {
      activeFocusQuest.savedTimer = {
        remainingSeconds: Math.max(0, focusRemainingSeconds),
        actualFocusedSeconds: actualFocusedSeconds,
        totalSeconds: focusTotalSeconds || ((activeFocusQuest.targetMinutes || 25) * 60),
        savedAt: Date.now()
      };
      activeFocusQuest = null;
      renderQuests();
    } else if (activeRewardItem && activeRewardItem.id !== invId) {
      activeRewardItem.savedTimer = {
        remainingSeconds: Math.max(0, focusRemainingSeconds),
        totalSeconds: focusTotalSeconds || (extractRewardDuration(activeRewardItem) * 60),
        savedAt: Date.now()
      };
      activeRewardItem = null;
      renderInventory();
    }
  }

  // Nếu quà không cần bấm giờ
  if (durationMinutes === 0 && !hasSavedTimer) {
    if (isFocusRunning || focusTimerInterval || activeFocusQuest || activeRewardItem) {
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
      releaseWakeLock();
      if (typeof stopTimerKeepAlive === 'function') stopTimerKeepAlive();
      activeFocusQuest = null;
      activeRewardItem = null;
      isFocusRunning = false;
      isBreakMode = false;
      focusRemainingSeconds = 0;
      focusTotalSeconds = 0;
      actualFocusedSeconds = 0;
      appState.activeTimer = null;
      appState.lastTimerClearedAt = Date.now();
      try { localStorage.removeItem(TIMER_STORAGE_KEY); } catch (_) {}
      renderFocusStationUI();
    }

    item.isUsed = true;
    item.usedAt = Date.now();
    delete item.savedTimer;
    sfx.playFanfare();
    showToast(`🎉 Đã sử dụng phần thưởng "${item.name}"! Chúc mừng bạn!`, 'success', {
      label: 'Hoàn tác',
      onClick: () => undoUseInventoryItem(invId, true)
    });
    renderInventory();
    triggerSave(true);
    return;
  }

  if (typeof requestTimerNotificationPermission === 'function') {
    requestTimerNotificationPermission();
  } else if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  item.isUsed = true;
  item.usedAt = item.usedAt || Date.now();

  let initialRemainingSec = Math.max(1, durationMinutes) * 60;
  let initialTotalSec = initialRemainingSec;

  if (hasSavedTimer) {
    initialRemainingSec = Math.max(1, item.savedTimer.remainingSeconds);
    initialTotalSec = item.savedTimer.totalSeconds || initialRemainingSec;
    delete item.savedTimer;
  }

  lastLocalTimerActionTime = Date.now();
  activeRewardItem = item;
  activeFocusQuest = null;
  isBreakMode = false;
  focusTotalSeconds = initialTotalSec;
  focusRemainingSeconds = initialRemainingSec;
  actualFocusedSeconds = 0;
  isFocusRunning = true;
  lastTickTime = Date.now();

  renderFocusStationUI();
  updateTimerDisplay();
  saveFocusTimerState(true, true, 'start');
  requestWakeLock();
  if (typeof startTimerKeepAlive === 'function') startTimerKeepAlive();
  renderQuests();
  renderInventory();

  clearInterval(focusTimerInterval);
  focusTimerInterval = setInterval(tickFocusTimer, 500);

  sfx.playFanfare();
  if (hasSavedTimer) {
    showToast(`Tiếp tục tận hưởng: "${item.name}" (${Math.ceil(initialRemainingSec / 60)} phút còn lại)! Chúc bạn thư giãn tuyệt vời.`, 'purple');
  } else {
    showToast(`Bắt đầu tận hưởng: "${item.name}" (${durationMinutes} phút)! Chúc bạn thư giãn tuyệt vời.`, 'purple', {
      label: 'Hoàn tác',
      onClick: () => undoUseInventoryItem(invId, true)
    });
  }
}

async function undoUseInventoryItem(invId, skipConfirm = false) {
  const item = appState.inventory.find(i => i.id === invId);
  if (!item || !item.isUsed) return;

  const isCurrentlyActive = Boolean(activeRewardItem && activeRewardItem.id === invId);
  if (!isCurrentlyActive && item.usedAt && (Date.now() - item.usedAt > 5 * 60 * 1000)) {
    showToast(`Phần thưởng "${item.name}" đã hoàn thành và quá thời hạn hoàn tác (5 phút).`, 'warning');
    return;
  }

  if (!skipConfirm) {
    const ok = await confirmAction({
      title: 'Hoàn Tác Sử Dụng?',
      message: `Đưa phần thưởng "${item.name}" về trạng thái Chưa Dùng?`,
      detail: activeRewardItem && activeRewardItem.id === invId ? '⚠️ Bộ đếm thời gian của phần thưởng này sẽ được dừng.' : '',
      confirmText: 'Hoàn Tác ↩️',
      cancelText: 'Giữ Nguyên',
      icon: '↩️',
      btnColor: 'amber'
    });
    if (!ok) return;
  }

  if (activeRewardItem && activeRewardItem.id === invId) {
    clearFocusTimerSession();
  }

  item.isUsed = false;
  delete item.usedAt;
  delete item.savedTimer;
  sfx.playClick();
  triggerSave(true);
  renderInventory();
  showToast(`Đã đưa "${item.name}" về trạng thái Chưa Dùng.`, 'info');
}

async function deleteInventoryItem(invId) {
  const item = appState.inventory.find(i => i.id === invId);
  if (!item) return;

  const ok = await confirmAction({
    title: 'Xóa Khỏi Kho Quà?',
    message: `Bạn có chắc muốn xóa lịch sử phần thưởng "${item.name}"?`,
    detail: '💡 Bạn có thể hoàn tác lại ngay sau khi xóa.',
    confirmText: 'Xóa 🗑️',
    cancelText: 'Giữ Lại',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!ok) return;

  if (activeRewardItem && activeRewardItem.id === invId) {
    clearFocusTimerSession();
  }

  const itemIndex = appState.inventory.findIndex(i => i.id === invId);
  const deletedItem = { ...item };
  appState.inventory = appState.inventory.filter(i => i.id !== invId);
  triggerSave(true);
  renderInventory();

  showToast(`Đã xóa "${deletedItem.name}" khỏi Kho Quà.`, 'info', {
    label: 'Hoàn tác',
    onClick: () => {
      if (itemIndex >= 0 && itemIndex <= appState.inventory.length) {
        appState.inventory.splice(itemIndex, 0, deletedItem);
      } else {
        appState.inventory.unshift(deletedItem);
      }
      triggerSave(true);
      renderInventory();
      sfx.playClick();
      showToast(`Đã khôi phục "${deletedItem.name}" vào Kho Quà.`, 'success');
    }
  });
}

// ponytail: infer an appropriate emoji icon based on quest title, description or category if not explicitly set
function getQuestIcon(q) {
  if (q?.icon && typeof q.icon === 'string' && q.icon.trim()) {
    return q.icon.trim();
  }
  const text = `${q?.title || ''} ${q?.description || ''}`.toLowerCase();
  const clean = text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

  if (/\b(doc|sach|bai|chuong|giao trinh|on thi|luyen de|viet|nghien cuu)\b/.test(clean)) return '📚';
  if (/\b(code|lap trinh|fix|bug|deploy|test|git|feature|refactor|dev|project|du an)\b/.test(clean)) return '💻';
  if (/\b(tap|gym|chay|the duc|hit dat|plank|squat|van dong|yoga|boi|dap xe)\b/.test(clean)) return '🏃';
  if (/\b(don|quet|lau|rua|giat|ve sinh|ngan nap|rac|nha cua|phong)\b/.test(clean)) return '🧹';
  if (/\b(nau|an|com|bep|cho|mon an|uong|nuoc)\b/.test(clean)) return '🍳';
  if (/\b(tieng anh|ielts|toeic|tu vung|nghe|ngu phap|flashcard|kanji|tieng nhat)\b/.test(clean)) return '🗣️';
  if (/\b(email|hop|meeting|bao cao|ke hoach|tai lieu|deadline|goi|call|khach hang)\b/.test(clean)) return '💼';
  if (/\b(ngu|nghi ngoi|thien|relax|thu gian|tam)\b/.test(clean)) return '🌿';
  if (/\b(ve|nhac|dan|hat|piano|guitar|sang tao|thiet ke|design)\b/.test(clean)) return '🎨';
  if (/\b(mua|sam|chi tieu|tien|ngan hang|tiet kiem)\b/.test(clean)) return '💰';

  if (q?.category === 'study') return '📚';
  if (q?.category === 'work') return '💻';
  if (q?.category === 'fitness') return '🏃';
  if (q?.category === 'chore') return '🧹';
  if (q?.type === 'focus') return '⏳';
  return '🎯';
}
window.getQuestIcon = getQuestIcon;
