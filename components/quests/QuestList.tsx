'use client';

import React, { useState, useMemo } from 'react';
import type { Quest } from '@/types/levelup';
import { useLevelUp } from '@/hooks/useLevelUp';
import { QuestFilterChips, type QuestFilterType } from './QuestFilterChips';
import { QuestCard } from './QuestCard';
import { QuestCardSkeleton } from './QuestCardSkeleton';
import { WeekCalendarStrip } from './WeekCalendarStrip';
import { Icon } from '@/components/ui/Icon';

export function QuestList() {
  const { optimisticQuests, state, startupStatus } = useLevelUp();
  const [filter, setFilter] = useState<QuestFilterType>('active');
  const isLoading = startupStatus === 'loading';

  const rankScores: Record<string, number> = {
    S: 6,
    A: 5,
    B: 4,
    C: 3,
    D: 2,
    E: 1,
    F: 0,
  };

  // Daily progress calculations
  const totalQuests = optimisticQuests.length;
  const completedQuests = optimisticQuests.filter(q => q.status === 'completed').length;
  const percentComplete = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0;

  // Filtered and Sorted list (Faithful to stable RPG ranking & focus pinned)
  const filteredQuests = useMemo(() => {
    // ponytail: Deduplicate by ID to guarantee unique React keys across state sync. Upgrade path: DB PK constraint.
    const seenIds = new Set<string>();
    const uniqueQuests: Quest[] = [];
    for (const q of optimisticQuests) {
      if (q && q.id && !seenIds.has(q.id)) {
        seenIds.add(q.id);
        uniqueQuests.push(q);
      }
    }

    let items = uniqueQuests.filter(q => {
      if (filter === 'all') return true;
      if (filter === 'active') return q.status === 'active';
      if (filter === 'completed') return q.status === 'completed';
      return true;
    });

    return items.sort((a, b) => {
      const aFocus = state.activeTimer?.questId === a.id ? 1 : 0;
      const bFocus = state.activeTimer?.questId === b.id ? 1 : 0;
      if (aFocus !== bFocus) return bFocus - aFocus;

      const aActive = a.status === 'active' ? 1 : 0;
      const bActive = b.status === 'active' ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;

      const scoreA = rankScores[(a.rank || 'E').toUpperCase()] ?? 1;
      const scoreB = rankScores[(b.rank || 'E').toUpperCase()] ?? 1;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (b.rewardCoins || 0) - (a.rewardCoins || 0);
    });
  }, [optimisticQuests, filter, state.activeTimer]);

  const handleOpenAddQuest = () => {
    if (
      typeof window !== 'undefined' &&
      typeof (window as unknown as { openQuestModal?: () => void }).openQuestModal === 'function'
    ) {
      (window as unknown as { openQuestModal: () => void }).openQuestModal();
    } else {
      const btn = document.getElementById('btn-open-add-quest');
      if (btn) btn.click();
    }
  };

  return (
    <div className="w-full">
      {/* Filter and Action Ribbon (Exact match to stable Vercel design) */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 mb-4 sm:mb-6 min-w-0">
        <QuestFilterChips currentFilter={filter} onFilterChange={setFilter} />

        <button
          id="btn-open-add-quest"
          type="button"
          onClick={handleOpenAddQuest}
          className="btn-action-quest inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 h-10 sm:h-10.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm hover:shadow-md shrink-0 whitespace-nowrap cursor-pointer select-none touch-manipulation active:scale-95"
          title="Tạo nhiệm vụ mới (Phím tắt: Q)"
        >
          <Icon name="add" className="text-base sm:text-lg leading-none font-bold" />
          <span className="hidden sm:inline">Thêm Nhiệm Vụ</span>
          <span className="sm:hidden">Thêm việc</span>
          <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 text-white rounded border border-white/25 shadow-2xs">
            Q
          </kbd>
        </button>
      </div>

      {/* M3 Daily Quests Group Progress Indicator */}
      <div
        id="quests-daily-progress"
        className="mb-4 bg-white/80 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-slate-200/70 dark:border-slate-800/70 shadow-2xs transition-all"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm">🎯</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              Tiến độ hôm nay:
            </span>
            <span
              id="quests-daily-progress-text"
              className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400"
            >
              {isLoading ? (
                <span className="inline-block h-3.5 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse align-middle" />
              ) : (
                `${completedQuests}/${totalQuests} (${percentComplete}%)`
              )}
            </span>
          </div>
          <span
            id="quests-daily-progress-status"
            className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0"
          >
            {isLoading ? (
              <span className="inline-block h-3 w-16 rounded bg-indigo-500/20 animate-pulse align-middle" />
            ) : percentComplete === 100
              ? 'Hoàn thành xuất sắc'
              : percentComplete > 0
              ? 'Đang thực hiện'
              : 'Chưa bắt đầu'}
          </span>
        </div>

        {/* M3 Linear Progress Bar with Stop Indicator */}
        <div
          className="m3-linear-progress m3-linear-progress--thick h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-label="Tiến độ nhiệm vụ hôm nay"
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            id="quests-daily-progress-bar"
            className={`m3-linear-progress-bar h-full rounded-full transition-all duration-300 ${
              isLoading
                ? 'w-1/3 bg-indigo-400/50 animate-pulse'
                : 'bg-gradient-to-r from-indigo-500 to-indigo-600'
            }`}
            style={{ width: isLoading ? '30%' : `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Week Calendar Strip */}
      <WeekCalendarStrip />

      {/* Quests Grid */}
      {isLoading ? (
        <div
          id="quests-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5"
          aria-label="Đang tải danh sách nhiệm vụ"
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <QuestCardSkeleton key={`quest-skel-${idx}`} />
          ))}
        </div>
      ) : filteredQuests.length > 0 ? (
        <div
          id="quests-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5"
        >
          {filteredQuests.map(quest => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      ) : (
        <div
          id="quests-empty"
          className="text-center py-12 sm:py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-3xl shadow-xs">
            ⚔️
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            Chưa có nhiệm vụ nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            Hoàn thành nhiệm vụ mỗi ngày để tích lũy Vàng và rèn luyện thói quen.
          </p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleOpenAddQuest}
              className="btn-action-quest flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-95"
            >
              <span className="text-sm">⚔️</span>
              <span>+ Thêm Nhiệm Vụ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
