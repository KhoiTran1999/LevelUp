'use client';

import React from 'react';

export function QuestCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rpg-card rpg-panel quest-card-compact p-3.5 sm:p-4 rounded-2xl flex items-center justify-between border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 shadow-2xs animate-pulse select-none"
    >
      {/* Zone 1: Body Icon Placeholder */}
      <div className="w-11 h-11 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 shrink-0" />

      {/* Center: Task Info Placeholder */}
      <div className="flex-1 min-w-0 mx-3 sm:mx-4 flex flex-col justify-center gap-2">
        <div className="h-4 w-3/4 rounded-md bg-slate-200/80 dark:bg-slate-800/80" />
        <div className="h-3 w-1/2 rounded-md bg-slate-100 dark:bg-slate-800/50" />
      </div>

      {/* Right: Streak & Gold Pill Placeholder */}
      <div className="flex flex-col items-end justify-center shrink-0 pl-3 sm:pl-4 gap-2 self-center">
        <div className="h-3.5 w-12 rounded-md bg-slate-200/70 dark:bg-slate-800/60" />
        <div className="h-6 w-14 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    </div>
  );
}
