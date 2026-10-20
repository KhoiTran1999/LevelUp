'use client';

import React from 'react';

interface TopicFilterChipsProps {
  topics: string[];
  currentTopic: string;
  onSelectTopic: (topic: string) => void;
  topicCounts: Record<string, number>;
  totalCount: number;
}

export function TopicFilterChips({
  topics,
  currentTopic,
  onSelectTopic,
  topicCounts,
  totalCount,
}: TopicFilterChipsProps) {
  // If there are no custom topics besides "all", still allow showing "Tất Cả" or custom topics
  return (
    <div
      id="notes-topics-bar"
      className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 mb-3 select-none flex-nowrap"
      role="group"
      aria-label="Lọc ghi chú theo chủ đề"
    >
      {/* "Tất Cả" Chip */}
      <button
        type="button"
        onClick={() => onSelectTopic('all')}
        className={`topic-chip px-3 py-1.5 rounded-xl text-xs transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95 ${
          currentTopic === 'all'
            ? 'active bg-amber-500 text-slate-950 font-bold shadow-xs'
            : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-800'
        }`}
      >
        <span>📂 Tất Cả</span>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
            currentTopic === 'all' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
          }`}
        >
          {totalCount}
        </span>
      </button>

      {/* Dynamic Topic Chips */}
      {topics.map(topic => {
        const isActive = currentTopic === topic;
        const count = topicCounts[topic] || 0;
        return (
          <button
            key={topic}
            type="button"
            onClick={() => onSelectTopic(topic)}
            className={`topic-chip px-3 py-1.5 rounded-xl text-xs transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95 ${
              isActive
                ? 'active bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="opacity-60 text-[11px] font-bold">#</span>
            <span>{topic}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
