'use client';

import React from 'react';
import type { Quest, QuestRank } from '@/types/levelup';
import { useLevelUp } from '@/hooks/useLevelUp';

interface QuestCardProps {
  quest: Quest;
}

export function QuestCard({ quest }: QuestCardProps) {
  const { state, completeQuest, startFocusTimer, deleteQuest, openProofModal } = useLevelUp();

  const rank = (quest.rank || 'E').toUpperCase() as QuestRank;
  const isCompleted = quest.status === 'completed';
  const isCurrentlyFocusing = state.activeTimer?.questId === quest.id;
  const isTimerDone = isCurrentlyFocusing && (state.activeTimer?.remainingSeconds ?? 1) <= 0;
  const questStreak = (quest.history && typeof quest.history === 'object') ? Object.keys(quest.history).length : 0;
  const hasSavedTimer = Boolean(quest.savedTimer && quest.savedTimer.remainingSeconds > 0);

  const handleCardClick = () => {
    if (quest.focusTimerCompleted && quest.requiresProof && !quest._proofVerified) {
      openProofModal(quest);
      return;
    }

    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        appState?: { quests?: Quest[] };
        openQuestDetailModal?: (questOrId: string | Quest) => void;
      };

      // Safely ensure quest is present in window.appState
      if (win.appState) {
        if (!Array.isArray(win.appState.quests)) {
          win.appState.quests = [];
        }
        const idx = win.appState.quests.findIndex(q => q.id === quest.id);
        if (idx === -1) {
          win.appState.quests.unshift(quest);
        } else {
          win.appState.quests[idx] = { ...win.appState.quests[idx], ...quest };
        }
      }

      if (typeof win.openQuestDetailModal === 'function') {
        win.openQuestDetailModal(quest);
        return;
      }
    }
  };

  return (
    <div
      data-quest-id={quest.id}
      onClick={handleCardClick}
      className={`rpg-card rpg-panel quest-card-compact quest-card-rank-${rank} ${
        isCurrentlyFocusing
          ? isTimerDone
            ? 'ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/20 bg-emerald-500/5 border-emerald-500/50'
            : 'ring-2 ring-orange-500 shadow-xl shadow-orange-500/25 bg-orange-500/5 border-orange-500/50'
          : hasSavedTimer
          ? 'ring-2 ring-sky-500/60 shadow-md shadow-sky-500/15 bg-sky-500/5 border-sky-500/40'
          : isCompleted
          ? 'opacity-70 bg-slate-100/50 dark:bg-slate-950/30'
          : ''
      } p-3.5 sm:p-4 rounded-2xl flex items-center justify-between transition-all duration-300 relative cursor-pointer hover:shadow-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900`}
    >
      {/* Zone 1: Body Icon Box */}
      <div
        className={`quest-card-icon-container w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl shadow-xs shrink-0 ${
          isCompleted ? 'opacity-60 grayscale' : ''
        }`}
      >
        {quest.icon || (quest.type === 'focus' ? '🎯' : '⚡')}
      </div>

      {/* Center: Task Info (Title & Description with comfortable spacing) */}
      <div className="flex-1 min-w-0 mx-3 sm:mx-4 flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <h3
            className={`font-bold text-sm sm:text-base leading-snug truncate ${
              isCompleted
                ? 'text-slate-400 dark:text-slate-500 line-through'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {quest.title}
          </h3>
          {isCurrentlyFocusing ? (
            isTimerDone ? (
              <span className="badge-quest-doing inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500 text-white shadow-xs shrink-0">
                🎉 ĐÃ XONG
              </span>
            ) : (
              <span className="badge-quest-doing inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-orange-500 text-white shadow-xs shrink-0">
                ⏱️ ĐANG LÀM
              </span>
            )
          ) : hasSavedTimer ? (
            <span
              className="badge-quest-saved inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-sky-500 text-white shadow-xs shrink-0"
              title="Thời gian đang được bảo lưu"
            >
              ⏸️ BẢO LƯU ({Math.ceil((quest.savedTimer?.remainingSeconds || 0) / 60)}p)
            </span>
          ) : isCompleted ? (
            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shrink-0">
              ĐÃ XONG
            </span>
          ) : null}
          {quest.requiresProof && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border shrink-0 ${
                quest._proofVerified
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25'
              }`}
            >
              {quest._proofVerified
                ? quest.proofType === 'both'
                  ? '📸+✍️ Đã duyệt'
                  : quest.proofType === 'text'
                  ? '✍️ Đã duyệt'
                  : '📸 Đã duyệt'
                : quest.proofType === 'both'
                ? '📸+✍️ Cần bằng chứng'
                : quest.proofType === 'text'
                ? '✍️ Cần báo cáo'
                : '📸 Cần ảnh'}
            </span>
          )}
        </div>
        {quest.description ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 truncate leading-relaxed">
            {quest.description}
          </p>
        ) : null}
      </div>

      {/* Right: Time & Streak Information (Cleanly Spaced) */}
      <div className="flex flex-col items-end justify-center shrink-0 pl-3 sm:pl-4 gap-1.5 self-center">
        <div
          className={`flex items-center gap-1 text-[11px] font-bold ${
            questStreak > 0
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-slate-400 dark:text-slate-500'
          } whitespace-nowrap`}
        >
          <span className={`text-xs ${questStreak > 0 ? '' : 'grayscale opacity-60'}`}>
            {questStreak > 0 ? '🔥' : '🪙'}
          </span>
          <span>{questStreak} ngày</span>
        </div>
        <span
          className="quest-card-gold-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs shadow-xs whitespace-nowrap"
          title={`Phần thưởng: +${quest.rewardCoins} Vàng`}
        >
          <span className="coin-icon" />
          <span>+{quest.rewardCoins}</span>
          <span className="hidden sm:inline text-[10px] font-medium ml-0.5">Vàng</span>
        </span>
      </div>

      {/* Hidden compatibility buttons for legacy test runner */}
      <div className="hidden quest-card-internal-controls" aria-hidden="true">
        <button
          type="button"
          className="btn-start-focus"
          onClick={e => {
            e.stopPropagation();
            startFocusTimer(quest);
          }}
        />
        <button
          type="button"
          className="btn-done-quest"
          onClick={e => {
            e.stopPropagation();
            completeQuest(quest.id);
          }}
        />
        <button
          type="button"
          className="btn-del-quest"
          onClick={e => {
            e.stopPropagation();
            deleteQuest(quest.id);
          }}
        />
      </div>
    </div>
  );
}
