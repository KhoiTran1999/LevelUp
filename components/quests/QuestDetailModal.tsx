'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Quest } from '@/types/levelup';
import { useLevelUp } from '@/hooks/useLevelUp';

interface QuestDetailWindow extends Window {
  openQuestDetailModal?: (questOrId: Quest | string) => void;
  openQuestRenegotiateModal?: (questId: string) => void;
  toggleQuestRepeatable?: (questId: string) => void;
  restartQuest?: (questId: string) => void;
  undoCompleteQuest?: (questId: string) => void;
  cancelQuestFocusSession?: (questId: string) => void;
  clearSavedQuestTimer?: (questId: string) => void;
  focusTimerFinished?: () => void;
  completeQuest?: (questId: string) => void;
  deleteQuest?: (questId: string) => Promise<boolean>;
  parentDetailQuestId?: string | null;
  sfx?: { playClick?: () => void };
  showToast?: (message: string, type: string) => void;
  initBottomSheetGestures?: () => void;
  dismissModalWithSlideDown?: (modal: HTMLElement) => void;
  getQuestStreak?: (quest: Quest) => number;
}

interface QuestDetailSheet extends HTMLElement {
  _reactOnDismiss?: () => void;
}

function getQuestStreak(quest: Quest): number {
  const calculate = (window as QuestDetailWindow).getQuestStreak;
  if (calculate) return calculate(quest);
  return quest.history && typeof quest.history === 'object'
    ? Object.keys(quest.history).length
    : 0;
}

function invokeLegacy(name: keyof QuestDetailWindow, questId: string, onMissing: () => void) {
  const fn = (window as QuestDetailWindow)[name];
  if (typeof fn !== 'function') {
    console.error(`[QuestDetailModal] Missing legacy action: ${String(name)}`);
    onMissing();
    return;
  }
  (fn as (id: string) => void)(questId);
}

export function QuestDetailModal() {
  const {
    state,
    completeQuest,
    openProofModal,
    startFocusTimer,
    pauseFocusTimer,
    resumeFocusTimer,
  } = useLevelUp();
  const [questId, setQuestId] = useState<string | null>(null);
  const [fallbackQuest, setFallbackQuest] = useState<Quest | null>(null);
  const quests = state.quests;
  const quest = useMemo(
    () => questId ? quests.find(item => item.id === questId) || fallbackQuest : null,
    [fallbackQuest, questId, quests],
  );
  const [cooldownNow, setCooldownNow] = useState(Date.now());
  const activeTimer = state.activeTimer;
  const isFocusing = activeTimer?.questId === quest?.id;
  const isTimerDone = Boolean(isFocusing && activeTimer?.remainingSeconds <= 0);
  const hasSavedTimer = Boolean(quest?.savedTimer && quest.savedTimer.remainingSeconds > 0);
  const cooldownRemaining = quest?.isRepeatable && quest.lastCompletedAt
    ? Math.max(0, 10 * 60 * 1000 - (cooldownNow - quest.lastCompletedAt))
    : 0;
  const streakBonus = Math.max(0, Number(state.profile.streak) || 0);
  const bonusPercent = streakBonus >= 30 ? 20 : streakBonus >= 14 ? 15 : streakBonus >= 7 ? 10 : streakBonus >= 3 ? 5 : 0;
  const rewardBonus = quest ? Math.floor(quest.rewardCoins * bonusPercent / 100) : 0;
  const proofBadge = quest?._proofVerified
    ? quest.proofType === 'both' ? '📸+✍️ Bằng chứng đã duyệt' : '✅ Bằng chứng đã duyệt'
    : quest?.proofType === 'both' ? '📸+✍️ Cần ảnh & báo cáo AI duyệt'
      : quest?.proofType === 'text' ? '✍️ Cần báo cáo AI duyệt' : '📸 Cần bằng chứng';
  const proofActionLabel = quest?.proofType === 'both'
    ? 'Nộp Bằng Chứng Nhận Vàng 📸+✍️'
    : quest?.proofType === 'text' ? 'Nộp Báo Cáo Nhận Vàng ✍️' : 'Nộp Bằng Chứng Nhận Vàng 📸';

  useEffect(() => {
    const showQuest = (value: string | Quest) => {
      const id = typeof value === 'string' ? value : value?.id;
      if (!id) {
        console.error('[QuestDetailModal] Invalid quest supplied to detail dialog.');
        return;
      }
      const item = quests.find(candidate => candidate.id === id)
        || (typeof value === 'string' ? null : value);
      if (!item) {
        console.error(`[QuestDetailModal] Quest not found: ${id}`);
        return;
      }
      setQuestId(id);
      setFallbackQuest(item);
      setCooldownNow(Date.now());
    };
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<Quest | string>).detail;
      showQuest(detail);
    };
    window.addEventListener('levelup:open-quest-detail', handleOpen);
    return () => {
      window.removeEventListener('levelup:open-quest-detail', handleOpen);
    };
  }, [quests]);

  useEffect(() => {
    if (!quest?.lastCompletedAt || cooldownRemaining <= 0) return;
    const timer = window.setInterval(() => setCooldownNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [cooldownRemaining, quest?.lastCompletedAt]);

  useEffect(() => {
    if (!questId) return;
    const modal = document.getElementById('modal-quest-detail') as QuestDetailSheet | null;
    if (!modal) return;
    const handleDismiss = () => {
      setQuestId(null);
      setFallbackQuest(null);
    };
    modal._reactOnDismiss = handleDismiss;
    const initializeGestures = (window as QuestDetailWindow).initBottomSheetGestures;
    if (initializeGestures) initializeGestures();
    else console.error('[QuestDetailModal] Bottom-sheet gesture runtime is unavailable.');
    return () => {
      if (modal._reactOnDismiss === handleDismiss) delete modal._reactOnDismiss;
    };
  }, [questId]);

  const close = (restoreParent = true, animate = false) => {
    const win = window as QuestDetailWindow;
    const finishClose = () => {
      setQuestId(null);
      setFallbackQuest(null);
      const parentId = restoreParent ? win.parentDetailQuestId : null;
      if (parentId) {
        win.parentDetailQuestId = null;
        window.setTimeout(() => win.openQuestDetailModal?.(parentId), 50);
      }
    };
    win.sfx?.playClick?.();
    const modal = document.getElementById('modal-quest-detail') as QuestDetailSheet | null;
    if (animate && modal && win.dismissModalWithSlideDown) {
      modal._reactOnDismiss = finishClose;
      win.dismissModalWithSlideDown(modal);
    } else {
      if (animate && modal) console.error('[QuestDetailModal] Bottom-sheet close animation is unavailable.');
      finishClose();
    }
  };

  const invokeAction = (name: keyof QuestDetailWindow) => {
    if (!quest) return;
    close();
    invokeLegacy(name, quest.id, () => {
      (window as QuestDetailWindow).showToast?.('Không thể thực hiện thao tác này.', 'error');
    });
  };

  if (!quest) return null;

  const completed = quest.status === 'completed';
  const proofPending = quest.requiresProof && !quest._proofVerified;
  const cooldownMinutes = Math.ceil(Math.max(0, 10 * 60 * 1000 - (cooldownNow - (quest.lastCompletedAt || 0))) / 60_000);
  const title = quest.title || 'Nhiệm vụ';
  const rank = (quest.rank || 'E').toUpperCase();
  const streakDays = getQuestStreak(quest);
  const openFrequency = () => {
    const win = window as QuestDetailWindow;
    win.parentDetailQuestId = quest.id;
    close(false);
    window.dispatchEvent(new CustomEvent('levelup:open-frequency-detail', {
      detail: { item: quest, isQuest: true },
    }));
  };
  const openDebate = () => {
    const win = window as QuestDetailWindow;
    win.parentDetailQuestId = quest.id;
    close(false);
    if (win.openQuestRenegotiateModal) {
      win.openQuestRenegotiateModal(quest.id);
    } else {
      console.error('[QuestDetailModal] Missing legacy action: openQuestRenegotiateModal');
      win.showToast?.('Không thể mở thương lượng nhiệm vụ.', 'error');
    }
  };
  const toggleRepeat = () => {
    const win = window as QuestDetailWindow;
    if (!win.toggleQuestRepeatable) {
      console.error('[QuestDetailModal] Missing legacy action: toggleQuestRepeatable');
      win.showToast?.('Không thể đổi chế độ lặp lại.', 'error');
      return;
    }
    win.toggleQuestRepeatable(quest.id);
  };

  return (
    <div id="modal-quest-detail" data-sheet-dismiss="true" className="m3-modal-sheet fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-4" role="presentation">
      <section className="rpg-panel m3-dialog-panel flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg" role="dialog" aria-modal="true" aria-labelledby="mqd-title">
        <div className="m3-drag-handle sm:hidden" role="button" aria-label="Kéo xuống để đóng" />
        <header id="mqd-header-banner" className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-amber-500/10 p-5 dark:border-slate-800 dark:bg-amber-500/15 sm:p-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/50 text-3xl dark:bg-white/20">{quest.icon || (quest.type === 'focus' ? '🎯' : '⚡')}</span>
            <h2 id="mqd-title" className="min-w-0 flex-1 break-words text-lg font-bold leading-snug text-slate-900 dark:text-white sm:text-xl">{title}</h2>
          </div>
          <button type="button" className="modal-close m3-icon-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200/60 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700" aria-label="Đóng" onClick={() => close(true, true)}>
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <div>
                <div className="font-mono text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Phần thưởng hoàn thành</div>
                <div className="font-mono text-lg font-black text-amber-600 dark:text-amber-300">+{quest.rewardCoins + rewardBonus} Vàng{rewardBonus > 0 ? ` (+${rewardBonus} 🔥)` : ''}</div>
              </div>
            </div>
          </div>
          <div className="space-y-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="font-mono text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Mục tiêu & Mô tả</div>
            <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-800 dark:text-slate-200">{quest.description || 'Không có mô tả chi tiết.'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-100/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="mb-1.5 font-mono text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Thông tin bổ trợ</div>
            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              <span className="rounded-xl border border-slate-300/60 bg-slate-200/70 px-2.5 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{quest.type === 'focus' ? `⏱️ ${quest.targetMinutes || 25} phút tập trung` : '⚡ Thường'}</span>
              <span className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-sky-700 dark:text-sky-300">{quest.isRepeatable ? `🔁 Lặp lại (${quest.completedCount || 0})` : '📌 Làm 1 lần'}</span>
              <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">🎖️ Hạng {rank}</span>
              {quest.requiresProof && <span className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-purple-700 dark:text-purple-300">{proofBadge}</span>}
              {streakDays > 0 && <span className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-orange-700 dark:text-orange-300">🔥 Chuỗi {streakDays} ngày</span>}
              {hasSavedTimer && <span className="rounded-xl border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-sky-600 dark:text-sky-300">⏸️ Đang bảo lưu: {Math.ceil((quest.savedTimer?.remainingSeconds || 0) / 60)}p</span>}
              {isFocusing && !isTimerDone && <span className="animate-pulse rounded-xl border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-amber-600 dark:text-amber-300">⏱️ Đang bấm giờ ({Math.ceil((activeTimer?.remainingSeconds || 0) / 60)}p)</span>}
            </div>
          </div>
        </div>

        <footer className="shrink-0 space-y-2.5 border-t border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
          {completed ? (
            <div className="flex gap-2">
              <button id="mqd-btn-restart" type="button" className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 text-xs font-bold dark:bg-slate-800" onClick={() => invokeAction('restartQuest')}>Làm Lại</button>
              <button id="mqd-btn-undo" type="button" className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 text-xs font-bold dark:bg-slate-800" onClick={() => invokeAction('undoCompleteQuest')}>Hoàn Tác</button>
            </div>
          ) : proofPending && quest.focusTimerCompleted ? (
            <div className="space-y-2">
              <button id="mqd-btn-proof" type="button" className="w-full animate-pulse rounded-2xl bg-amber-500 px-4 py-3 text-xs font-bold text-slate-950" onClick={() => { close(); openProofModal(quest); }}>{proofActionLabel}</button>
              <button id="mqd-btn-cancel-session" type="button" className="w-full rounded-xl bg-rose-500/10 px-3 py-2.5 text-xs font-semibold text-rose-600" onClick={() => invokeAction('cancelQuestFocusSession')}>Hủy Phiên Này</button>
            </div>
          ) : quest.type === 'focus' && isTimerDone ? (
            <div className="space-y-2">
              <button id="mqd-btn-focus-done" type="button" className="w-full animate-pulse rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-bold text-slate-950" onClick={() => { close(); const finish = (window as QuestDetailWindow).focusTimerFinished; if (finish) finish(); else { console.error('[QuestDetailModal] Missing legacy focus completion action.'); void completeQuest(quest.id); } }}>Hoàn Thành & Nhận Thưởng 🎉</button>
              <button id="mqd-btn-cancel-session" type="button" className="w-full rounded-xl bg-rose-500/10 px-3 py-2.5 text-xs font-semibold text-rose-600" onClick={() => invokeAction('cancelQuestFocusSession')}>Hủy Phiên Tập Trung Này</button>
            </div>
          ) : quest.type === 'focus' && isFocusing ? (
            <div className="flex gap-2">
              <button id="mqd-btn-focus-toggle" type="button" className="flex-1 rounded-2xl bg-amber-500 px-4 py-3 text-xs font-bold text-slate-950" onClick={() => { close(); activeTimer?.status === 'running' ? pauseFocusTimer() : resumeFocusTimer(); }}>{activeTimer?.status === 'running' ? 'Tạm Dừng ⏸️' : 'Tiếp Tục Chạy ▶️'}</button>
              <button id="mqd-btn-go-timer" type="button" className="rounded-2xl bg-slate-200 px-4 py-3 text-xs font-bold dark:bg-slate-800" onClick={() => { close(); document.getElementById('timer-section')?.scrollIntoView({ behavior: 'smooth' }); }}>Đồng Hồ ⏱️</button>
            </div>
          ) : quest.type === 'focus' ? (
            <div className="flex gap-2">
              <button id="mqd-btn-start-focus" type="button" className="flex-1 rounded-2xl bg-amber-500 px-4 py-3 text-xs font-bold text-slate-950" onClick={() => { close(); startFocusTimer(quest); }}>{hasSavedTimer ? `Tiếp Tục (${Math.ceil((quest.savedTimer?.remainingSeconds || 0) / 60)}p) ⏱️` : `Bắt Đầu Tập Trung (${quest.targetMinutes || 25}p) ⏱️`}</button>
              {hasSavedTimer && <button id="mqd-btn-clear-saved" type="button" className="rounded-2xl bg-rose-500/15 px-3.5 py-3 text-xs font-bold text-rose-600" onClick={() => invokeAction('clearSavedQuestTimer')}>⏹️ Hủy</button>}
            </div>
          ) : (
            <button id="mqd-btn-complete-bounty" type="button" disabled={cooldownRemaining > 0} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-bold text-slate-950 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800" onClick={() => { close(); completeQuest(quest.id); }}>{cooldownRemaining > 0 ? `Chờ ${cooldownMinutes}p` : 'Hoàn Thành & Nhận Thưởng 🎉'}</button>
          )}
          {!completed && quest.isRepeatable && (quest.completedCount || 0) > 0 && (
            <button id="mqd-btn-undo-repeat" type="button" className="w-full rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300" onClick={() => invokeAction('undoCompleteQuest')}>Hoàn lại lần vừa làm (-{quest.rewardCoins} Vàng)</button>
          )}
          <div className="grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-2 text-center dark:border-slate-800/60">
            <button id="mqd-btn-debate" type="button" className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400" onClick={openDebate}>💬 Thương lượng</button>
            <button id="mqd-btn-freq" type="button" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400" onClick={openFrequency}>📊 Xem tần suất</button>
            <button id="mqd-btn-repeat" type="button" className="rounded-xl border border-slate-300/60 bg-slate-200/70 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" onClick={toggleRepeat}>{quest.isRepeatable ? 'Đổi sang 1 lần' : 'Đổi lặp lại'}</button>
            <button id="mqd-btn-delete" type="button" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400" onClick={async () => { const remove = (window as QuestDetailWindow).deleteQuest; if (!remove) { console.error('[QuestDetailModal] Missing legacy action: deleteQuest'); (window as QuestDetailWindow).showToast?.('Không thể xóa nhiệm vụ.', 'error'); return; } if (await remove(quest.id)) close(); }}>🗑️ Xóa nhiệm vụ</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
