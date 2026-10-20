'use client';

import React from 'react';

export type QuestFilterType = 'all' | 'active' | 'completed';

interface QuestFilterChipsProps {
  currentFilter: QuestFilterType;
  onFilterChange: (filter: QuestFilterType) => void;
}

export function QuestFilterChips({ currentFilter, onFilterChange }: QuestFilterChipsProps) {
  const filters: { key: QuestFilterType; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'active', label: 'Chưa xong' },
    { key: 'completed', label: 'Đã xong' },
  ];

  return (
    <div
      className="flex items-center gap-0.5 sm:gap-1 bg-white dark:bg-slate-900/80 p-1 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs shrink-0 h-10 sm:h-10.5"
      role="group"
      aria-label="Bộ lọc nhiệm vụ"
    >
      {filters.map(f => {
        const isActive = currentFilter === f.key;
        return (
          <button
            key={f.key}
            data-filter={f.key}
            type="button"
            onClick={() => onFilterChange(f.key)}
            className={`quest-filter px-2.5 sm:px-3.5 h-8 sm:h-8.5 rounded-lg whitespace-nowrap shrink-0 cursor-pointer select-none transition ${
              isActive
                ? 'active bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
