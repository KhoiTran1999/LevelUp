// =============================================================================
// 6. QUEST INTERACTIONS (Complete, Undo, Add, Delete)
// =============================================================================
// ponytail: lock set prevents fast double-taps on complete button; bounds to current session
const completingQuestIds = new Set();
// ponytail: cooldown 10m prevents coin farming by spamming complete on repeatable quests; upgrade to custom intervals if per-quest schedules needed
const QUEST_REPEAT_COOLDOWN_MS = 10 * 60 * 1000;

function getQuestRepeatCooldownRemaining(quest) {
  if (!quest?.isRepeatable || !quest?.lastCompletedAt) return 0;
  return Math.max(0, QUEST_REPEAT_COOLDOWN_MS - (Date.now() - quest.lastCompletedAt));
}

async function completeQuest(questId, skipConfirm = false) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest || (!quest.isRepeatable && quest.status === 'completed') || completingQuestIds.has(questId)) return;

  completingQuestIds.add(questId);
  try {
    const cooldownRemaining = getQuestRepeatCooldownRemaining(quest);
    if (cooldownRemaining > 0) {
      const mins = Math.ceil(cooldownRemaining / 60000);
      showToast(`Nhiệm vụ lặp lại cần cách nhau tối thiểu 10 phút giữa mỗi lần hoàn thành. Vui lòng chờ thêm ${mins} phút!`, 'warning');
      return;
    }

    // Yêu cầu nộp ảnh bằng chứng nếu nhiệm vụ yêu cầu và chưa được AI duyệt
    if (quest.requiresProof && !quest._proofVerified) {
      openQuestProofModal(quest);
      return;
    }

    // Nhiệm vụ focus có thời gian yêu cầu bắt buộc phải hoàn thành bấm giờ
    if (quest.type === 'focus' && (parseInt(quest.targetMinutes, 10) || 0) > 0 && !quest.focusTimerCompleted && !skipConfirm) {
      showToast(`Nhiệm vụ "${quest.title}" cần bấm giờ tập trung đủ ${quest.targetMinutes} phút trước khi hoàn thành!`, 'warning');
      return;
    }

    if (!skipConfirm) {
      const curStreak = Math.max(0, parseInt(appState.profile?.streak, 10) || 0);
      const streakBonusPct = getStreakBonusPercent(curStreak);
      const streakBonusCoins = Math.floor(quest.rewardCoins * (streakBonusPct / 100));
      const totalAwarded = quest.rewardCoins + streakBonusCoins;
      const ok = await confirmAction({
        title: 'Xác Nhận Hoàn Thành?',
        message: `Bạn đã thực hiện xong nhiệm vụ "${quest.title}"?`,
        detail: `💰 Phần thưởng: +${totalAwarded} Vàng${streakBonusCoins > 0 ? ` (gồm +${streakBonusCoins} Vàng thưởng Streak 🔥)` : ''}`,
        confirmText: 'Hoàn Thành ✓',
        cancelText: 'Chưa Xong',
        icon: '🎉',
        btnColor: 'emerald'
      });
      if (!ok) return;
    }

    if (!quest.isRepeatable && quest.status === 'completed') return;
    if (getQuestRepeatCooldownRemaining(quest) > 0) return;

    if (activeFocusQuest && activeFocusQuest.id === questId) {
      clearFocusTimerSession();
    }

    if (quest._proofVerified) {
      delete quest._proofVerified;
    }
    if (quest.focusTimerCompleted) {
      delete quest.focusTimerCompleted;
    }
    delete quest.savedTimer;

    const previousLastCompletedAt = quest.lastCompletedAt || null;
    quest.completedCount = (quest.completedCount || 0) + 1;
    if (quest.isRepeatable) {
      quest.lastCompletedAt = Date.now();
    } else {
      quest.status = 'completed';
      quest.completedAt = Date.now();
    }

    const todayStr = getLocalDayString();
    if (!quest.history || typeof quest.history !== 'object') {
      quest.history = {};
    }
    quest.history[todayStr] = (quest.history[todayStr] || 0) + 1;
    if (typeof getQuestStreak === 'function') {
      quest.streak = getQuestStreak(quest);
    }

    // Cập nhật chuỗi Streak ngày liên tiếp & tính thưởng Streak
    const streakResult = updateStreakOnQuestComplete(appState.profile);
    const bonusPct = streakResult.bonusPercent;
    const streakBonusCoins = Math.floor(quest.rewardCoins * (bonusPct / 100));
    const totalAwardedCoins = quest.rewardCoins + streakBonusCoins;

    let earnedCoins = totalAwardedCoins;
    let deductedForLoan = 0;
    let principalDeducted = 0;
    let loanCleared = false;
    let loanBeforeDeduct = null;

    // Tự động trích nợ Ngân Hàng nếu người chơi có khoản vay đang hoạt động
    if (appState.profile?.bank?.loan && (parseInt(appState.profile.bank.loan.debt, 10) || 0) > 0) {
      const loan = appState.profile.bank.loan;
      const isOverdue = loan.isOverdue || (Date.now() - (parseInt(loan.borrowedAt, 10) || Date.now())) >= 7 * 24 * 60 * 60 * 1000;
      if (isOverdue) {
        loan.isOverdue = true;
        appState.profile.bank.isFrozen = true;
        appState.profile.title = 'Con Nợ Quá Hạn ⚠️';
      }
      const deductRate = isOverdue ? 1.0 : Math.min(0.80, Math.max(0.20, Number(loan.autoDeductPercent) || 0.50));
      deductedForLoan = Math.min(loan.debt, Math.floor(earnedCoins * deductRate));
      if (deductedForLoan > 0) {
        loanBeforeDeduct = {
          principal: loan.principal || 0,
          debt: loan.debt,
          interestRate: loan.interestRate || 0.05,
          borrowedAt: loan.borrowedAt || Date.now(),
          autoDeductPercent: loan.autoDeductPercent || 0.50,
          isOverdue: Boolean(loan.isOverdue)
        };
        const principalBefore = loan.principal || 0;
        principalDeducted = Math.min(principalBefore, deductedForLoan);
        loan.debt -= deductedForLoan;
        loan.principal = Math.max(0, principalBefore - principalDeducted);
        earnedCoins -= deductedForLoan;

        // Cập nhật bể thanh khoản ngân hàng hiển thị tức thì
        if (typeof currentBankPool === 'object' && currentBankPool) {
          currentBankPool.totalBorrowed = Math.max(0, (currentBankPool.totalBorrowed || 0) - principalDeducted);
          currentBankPool.poolGold = (currentBankPool.poolGold || 0) + deductedForLoan;
        }

        if (loan.debt <= 0) {
          loanCleared = true;
          appState.profile.bank.loan = null;
          appState.profile.bank.isFrozen = false;
          updateTitleByLevel();
        }
      }
    }

    // Lưu snapshot trích nợ & chuỗi streak để có thể hoàn tác chính xác
    if (!Array.isArray(quest.loanDeductions)) {
      quest.loanDeductions = [];
    }
    quest.loanDeductions.push({
      completedCount: quest.completedCount,
      rewardCoins: quest.rewardCoins,
      streakBonusCoins,
      totalAwardedCoins,
      deducted: deductedForLoan,
      principalDeducted,
      loanCleared,
      loanBeforeDeduct,
      loanSnapshot: loanBeforeDeduct,
      previousLastCompletedAt,
      completedDate: todayStr,
      streakSnapshot: streakResult?.snapshot || {
        streak: appState.profile.streak,
        lastStreakDate: appState.profile.lastStreakDate,
        streakHistory: Array.isArray(appState.profile.streakHistory) ? [...appState.profile.streakHistory] : []
      },
      timestamp: Date.now()
    });

    appState.profile.coins += earnedCoins;
    appState.profile.totalCoinsEarned += totalAwardedCoins;

    if (!Array.isArray(appState.completedQuestIds)) {
      appState.completedQuestIds = [];
    }
    if (!quest.isRepeatable && !appState.completedQuestIds.includes(quest.id)) {
      appState.completedQuestIds.unshift(quest.id);
      if (appState.completedQuestIds.length > 500) {
        appState.completedQuestIds.splice(500);
      }
    }

    if (quest.type === 'focus' && (parseInt(quest.targetMinutes, 10) || 0) >= 25) {
      appState.profile.totalFocusSessions = (parseInt(appState.profile.totalFocusSessions, 10) || 0) + 1;
    }

    addEXP(totalAwardedCoins * 3);

    addLedgerEntry({
      id: 'led_' + Date.now(),
      type: 'earn',
      category: 'quest',
      amount: totalAwardedCoins,
      title: quest.title,
      description: `Hoàn thành nhiệm vụ: ${quest.title} (+${quest.rewardCoins} Vàng${streakBonusCoins > 0 ? ` & +${streakBonusCoins} Vàng Streak 🔥` : ''})${deductedForLoan > 0 ? ` [🏦 Trích trả nợ: -${deductedForLoan} Vàng]` : ''}`,
      timestamp: Date.now(),
      questId: quest.id,
      proofImageUrl: quest.proofImageUrl || null,
      proofUserNote: quest.proofUserNote || null,
      proofFeedback: quest.proofFeedback || null
    });

    if (quest.proofImageUrl) {
      if (!Array.isArray(appState.proofPhotos)) {
        appState.proofPhotos = [];
      }
      const existing = appState.proofPhotos.find(p => p.proofImageUrl === quest.proofImageUrl);
      if (!existing) {
        appState.proofPhotos.unshift({
          id: 'proof_' + Date.now(),
          questId: quest.id,
          questTitle: quest.title,
          proofImageUrl: quest.proofImageUrl,
          rewardCoins: quest.rewardCoins || 10,
          userNote: quest.proofUserNote || '',
          feedback: quest.proofFeedback || '',
          timestamp: Date.now()
        });
        if (appState.proofPhotos.length > 100) {
          appState.proofPhotos = appState.proofPhotos.slice(0, 100);
        }
      } else {
        if (!existing.userNote && quest.proofUserNote) {
          existing.userNote = quest.proofUserNote;
        }
        if (!existing.feedback && quest.proofFeedback) {
          existing.feedback = quest.proofFeedback;
        }
      }
    }

    if (deductedForLoan > 0) {
      addLedgerEntry({
        id: 'bank_deduct_' + Date.now(),
        type: 'spend',
        category: 'bank_deduct',
        amount: deductedForLoan,
        title: 'Trích nợ Ngân Hàng tự động',
        description: `🏦 Đã trích ${deductedForLoan} Vàng (${principalDeducted} gốc + ${deductedForLoan - principalDeducted} lãi) từ phần thưởng "${quest.title}".${loanCleared ? ' 🎉 Bạn đã thanh toán sạch nợ!' : ` Dư nợ còn lại: ${appState.profile.bank.loan.debt} Vàng.`}`,
        timestamp: Date.now()
      });
    }

    sfx.playCoin();
    sfx.playFanfare();
    if (calculateRank(quest.rewardCoins) === 'S' || (parseInt(quest.rewardCoins, 10) || 0) >= 50) {
      triggerRpgCelebration('s_rank');
    } else if (streakBonusCoins > 0) {
      triggerRpgCelebration('streak');
    }

    triggerSave(true);
    renderHeader();
    renderQuests();
    renderLedger();

    if (loanCleared) {
      showToast('🎉 XUẤT SẮC! Bạn đã trả hết nợ Ngân Hàng qua quá trình làm việc chăm chỉ!', 'gold');
    }
    const bonusMsg = streakBonusCoins > 0 ? ` (gồm +${streakBonusCoins} Vàng thưởng Streak 🔥)` : '';
    const deductMsg = deductedForLoan > 0 ? ` (đã tự động trích ${deductedForLoan} Vàng trả nợ)` : '';
    showToast(
      `Đã hoàn thành "${quest.title}"! Nhận +${earnedCoins} Vàng vào ví${bonusMsg}${deductMsg}!`,
      'gold',
      {
        label: 'Hoàn tác',
        onClick: () => undoCompleteQuest(quest.id)
      }
    );
  } finally {
    completingQuestIds.delete(questId);
  }
}

const undoingQuestIds = new Set();

async function undoCompleteQuest(questId) {
  if (undoingQuestIds.has(questId)) return;
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return;
  if (!quest.isRepeatable && quest.status !== 'completed') return;
  if (quest.isRepeatable && (!quest.completedCount || quest.completedCount <= 0)) return;

  undoingQuestIds.add(questId);
  try {
    const isRepeat = Boolean(quest.isRepeatable);

    // Lấy thông tin trích nợ của lần hoàn thành này (LIFO stack)
    let deductionInfo = null;
    if (Array.isArray(quest.loanDeductions) && quest.loanDeductions.length > 0) {
      deductionInfo = quest.loanDeductions[quest.loanDeductions.length - 1];
    } else {
      const lastBankDeduct = (appState.ledger || []).find(entry =>
        entry.category === 'bank_deduct' && entry.description && entry.description.includes(quest.title)
      );
      if (lastBankDeduct && lastBankDeduct.amount > 0) {
        deductionInfo = {
          rewardCoins: quest.rewardCoins,
          deducted: lastBankDeduct.amount,
          principalDeducted: lastBankDeduct.amount,
          loanSnapshot: null
        };
      }
    }

    const deductedAmount = deductionInfo ? (Number(deductionInfo.deducted) || 0) : 0;
    const principalDeducted = deductionInfo ? (Number(deductionInfo.principalDeducted) || 0) : 0;
    const originalReward = Number(quest.rewardCoins) || 0;
    const streakBonus = Number(deductionInfo?.streakBonusCoins) || 0;
    const totalAwarded = deductionInfo?.totalAwardedCoins !== undefined ? Number(deductionInfo.totalAwardedCoins) : (originalReward + streakBonus);
    const earnedCoinsToRevert = Math.max(0, totalAwarded - deductedAmount);

    if (appState.profile.coins < earnedCoinsToRevert) {
      showToast(`Không thể hoàn tác: Số dư Vàng hiện tại (${appState.profile.coins}) không đủ để thu hồi ${earnedCoinsToRevert} Vàng!`, 'warning');
      return;
    }

    const ok = await confirmAction({
      title: isRepeat ? 'Hoàn Tác Lần Nhận Thưởng?' : 'Hoàn Tác Nhiệm Vụ?',
      message: isRepeat
        ? `Bạn muốn hoàn tác lần làm gần nhất (Lần ${quest.completedCount}) của nhiệm vụ "${quest.title}"?`
        : `Đưa nhiệm vụ "${quest.title}" về trạng thái Chưa Xong?`,
      detail: `💰 Sẽ trừ ví: -${earnedCoinsToRevert} Vàng${deductedAmount > 0 ? ` | 🏦 Sẽ khôi phục nợ: +${deductedAmount} Vàng` : ''}`,
      confirmText: 'Hoàn Tác ↩️',
      cancelText: 'Giữ Nguyên',
      icon: '↩️',
      btnColor: 'amber'
    });
    if (!ok) return;

    if (Array.isArray(quest.loanDeductions) && quest.loanDeductions.length > 0) {
      quest.loanDeductions.pop();
    }

    // Hoàn nguyên trạng thái Streak từ snapshot
    if (deductionInfo?.streakSnapshot) {
      appState.profile.streak = deductionInfo.streakSnapshot.streak;
      appState.profile.lastStreakDate = deductionInfo.streakSnapshot.lastStreakDate;
      appState.profile.streakHistory = deductionInfo.streakSnapshot.streakHistory;
    }

    const revertDateStr = deductionInfo?.completedDate || getLocalDayString();
    if (quest.history && quest.history[revertDateStr]) {
      quest.history[revertDateStr] = Math.max(0, quest.history[revertDateStr] - 1);
      if (quest.history[revertDateStr] === 0) {
        delete quest.history[revertDateStr];
      }
    }
    if (typeof getQuestStreak === 'function') {
      quest.streak = getQuestStreak(quest);
    }

    quest.completedCount = Math.max(0, (quest.completedCount || 1) - 1);
    delete quest.focusTimerCompleted;
    delete quest._proofVerified;
    if (quest.isRepeatable) {
      if (deductionInfo?.previousLastCompletedAt) {
        quest.lastCompletedAt = deductionInfo.previousLastCompletedAt;
      } else {
        delete quest.lastCompletedAt;
      }
    } else {
      quest.status = 'active';
      delete quest.completedAt;
      if (Array.isArray(appState.completedQuestIds)) {
        appState.completedQuestIds = appState.completedQuestIds.filter(id => id !== quest.id);
      }
    }

    if (quest.type === 'focus' && (parseInt(quest.targetMinutes, 10) || 0) >= 25) {
      appState.profile.totalFocusSessions = Math.max(0, (parseInt(appState.profile.totalFocusSessions, 10) || 0) - 1);
    }

    appState.profile.coins = Math.max(0, appState.profile.coins - earnedCoinsToRevert);
    appState.profile.totalCoinsEarned = Math.max(0, appState.profile.totalCoinsEarned - totalAwarded);
    deductEXP(totalAwarded * 3);

    if (deductedAmount > 0) {
      ensureUserBankProfile();
      if (typeof currentBankPool === 'object' && currentBankPool) {
        currentBankPool.totalBorrowed = (currentBankPool.totalBorrowed || 0) + principalDeducted;
        currentBankPool.poolGold = Math.max(0, (currentBankPool.poolGold || 0) - deductedAmount);
      }
      if (appState.profile.bank?.loan) {
        const loan = appState.profile.bank.loan;
        loan.debt = (loan.debt || 0) + deductedAmount;
        loan.principal = (loan.principal || 0) + principalDeducted;
        const snapshotLoan = deductionInfo?.loanSnapshot || deductionInfo?.loanBeforeDeduct;
        if (snapshotLoan?.isOverdue) {
          loan.isOverdue = true;
          appState.profile.bank.isFrozen = true;
          appState.profile.title = 'Con Nợ Quá Hạn ⚠️';
        }
      } else if (deductionInfo?.loanSnapshot || deductionInfo?.loanBeforeDeduct) {
        const snapshotLoan = deductionInfo?.loanSnapshot || deductionInfo?.loanBeforeDeduct;
        appState.profile.bank.loan = {
          ...snapshotLoan,
          debt: deductedAmount,
          principal: principalDeducted
        };
        if (snapshotLoan?.isOverdue) {
          appState.profile.bank.isFrozen = true;
          appState.profile.title = 'Con Nợ Quá Hạn ⚠️';
        }
      } else {
        appState.profile.bank.loan = {
          principal: principalDeducted,
          debt: deductedAmount,
          interestRate: 0.05,
          borrowedAt: Date.now(),
          autoDeductPercent: 0.50,
          isOverdue: false
        };
      }

      addLedgerEntry({
        id: 'bank_rev_' + Date.now(),
        type: 'spend',
        category: 'bank_revert',
        amount: deductedAmount,
        title: 'Hoàn tác trích nợ Ngân Hàng',
        description: `↩️ Đã khôi phục ${deductedAmount} Vàng vào dư nợ khoản vay do hoàn tác nhiệm vụ "${quest.title}".`,
        timestamp: Date.now()
      });
    }

    addLedgerEntry({
      id: 'led_' + Date.now(),
      type: 'spend',
      category: 'quest',
      amount: earnedCoinsToRevert,
      title: `Hoàn tác: ${quest.title}`,
      description: isRepeat
        ? `Hoàn tác lần làm gần nhất (${quest.title})`
        : `Hoàn tác hoàn thành: ${quest.title}`,
      timestamp: Date.now()
    });

    sfx.playClick();
    triggerSave(true);
    renderHeader();
    renderQuests();
    renderLedger();
    showToast(
      isRepeat
        ? `Đã hoàn tác lần làm gần nhất của nhiệm vụ "${quest.title}".`
        : `Đã đưa nhiệm vụ "${quest.title}" về trạng thái Chưa Xong.`,
      'info'
    );
  } finally {
    undoingQuestIds.delete(questId);
  }
}

async function restartQuest(questId) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return;

  const ok = await confirmAction({
    title: 'Làm Lại Nhiệm Vụ?',
    message: `Bạn muốn tạo lại nhiệm vụ "${quest.title}" để thực hiện một lần nữa?`,
    detail: '💡 Hệ thống sẽ tạo một phiên bản nhiệm vụ mới vào danh sách làm việc của bạn.',
    confirmText: 'Làm Lại 🔄',
    cancelText: 'Giữ Nguyên',
    icon: '🔄',
    btnColor: 'amber'
  });
  if (!ok) return;

  const newQuest = {
    ...quest,
    id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    canonicalId: quest.canonicalId || (quest.id && quest.id.startsWith('q_seed_') ? quest.id : undefined),
    status: 'active',
    completedCount: 0,
    createdAt: Date.now()
  };
  delete newQuest.completedAt;
  delete newQuest.focusTimerCompleted;
  delete newQuest._proofVerified;
  delete newQuest.savedTimer;
  delete newQuest.loanDeductions;
  delete newQuest.lastCompletedAt;

  const idx = appState.quests.findIndex(q => q.id === questId);
  if (idx >= 0) {
    appState.quests.splice(idx, 0, newQuest);
  } else {
    appState.quests.unshift(newQuest);
  }

  sfx.playClick();
  triggerSave(true);
  renderQuests();
  showToast(`Đã thêm nhiệm vụ "${newQuest.title}" vào danh sách làm việc!`, 'info');
}

function toggleQuestRepeatable(questId) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return;

  if (quest.status === 'completed' && !quest.isRepeatable) {
    showToast('Nhiệm vụ đã hoàn thành không thể đổi trạng thái lặp lại.', 'info');
    return;
  }

  quest.isRepeatable = !quest.isRepeatable;
  if (!quest.isRepeatable) {
    quest.previousRepeatCount = quest.completedCount || 0;
    quest.completedCount = 0;
    delete quest.lastCompletedAt;
  } else if (quest.previousRepeatCount !== undefined) {
    quest.completedCount = quest.previousRepeatCount;
    delete quest.previousRepeatCount;
  }
  sfx.playClick();
  triggerSave(true);
  renderQuests();
  showToast(`Nhiệm vụ "${quest.title}": ${quest.isRepeatable ? 'Đã bật Lặp lại' : 'Chuyển sang Làm 1 lần'}`, 'info');
}

async function deleteQuest(questId) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return false;

  const ok = await confirmAction({
    title: 'Xóa Nhiệm Vụ?',
    message: `Bạn có chắc muốn xóa nhiệm vụ "${quest.title}"?`,
    detail: '💡 Bạn có thể hoàn tác lại ngay sau khi xóa.',
    confirmText: 'Xóa 🗑️',
    cancelText: 'Giữ Lại',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!ok) return false;

  if (activeFocusQuest && activeFocusQuest.id === questId) {
    clearFocusTimerSession();
  }

  const questIndex = appState.quests.findIndex(q => q.id === questId);
  const deletedQuest = { ...quest };
  appState.quests = appState.quests.filter(q => q.id !== questId);
  triggerSave(true);
  renderQuests();

  showToast(`Đã xóa nhiệm vụ "${deletedQuest.title}".`, 'info', {
    label: 'Hoàn tác',
    onClick: () => {
      if (questIndex >= 0 && questIndex <= appState.quests.length) {
        appState.quests.splice(questIndex, 0, deletedQuest);
      } else {
        appState.quests.unshift(deletedQuest);
      }
      triggerSave(true);
      renderQuests();
      sfx.playCoin();
      showToast(`Đã khôi phục nhiệm vụ "${deletedQuest.title}".`, 'success');
    }
  });
  return true;
}
