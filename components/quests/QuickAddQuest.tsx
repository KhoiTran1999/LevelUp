'use client';

import React, { useState } from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';
import { Icon } from '@/components/ui/Icon';
import type { QuestRank, QuestType } from '@/types/levelup';

export function QuickAddQuest() {
  const { addQuest } = useLevelUp();
  const [title, setTitle] = useState('');
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [type, setType] = useState<QuestType>('focus');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let rank: QuestRank = 'C';
    let rewardCoins = 10;
    if (type === 'focus') {
      if (targetMinutes >= 60) {
        rank = 'A';
        rewardCoins = 25;
      } else if (targetMinutes >= 45) {
        rank = 'B';
        rewardCoins = 18;
      } else if (targetMinutes >= 25) {
        rank = 'C';
        rewardCoins = 12;
      } else {
        rank = 'D';
        rewardCoins = 7;
      }
    } else {
      rank = 'E';
      rewardCoins = 5;
    }

    addQuest({
      title: title.trim(),
      type,
      rank,
      rewardCoins,
      targetMinutes: type === 'focus' ? targetMinutes : 0,
      icon: type === 'focus' ? '🎯' : '⚡',
      isRepeatable: false,
    });

    setTitle('');
  };

  const handleOpenDetailedModal = () => {
    if (typeof window !== 'undefined' && typeof (window as unknown as { openQuestModal?: () => void }).openQuestModal === 'function') {
      (window as unknown as { openQuestModal: () => void }).openQuestModal();
    }
  };

  return (
    <div className="mb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Gõ nhanh nhiệm vụ mới... (VD: Đọc sách 25p, Viết code, Tập gym)"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <Icon
            name="add_task"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <select
            value={type}
            onChange={e => setType(e.target.value as QuestType)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="focus">🎯 Tập trung (Focus)</option>
            <option value="bounty">⚡ Việc lẻ (Bounty)</option>
          </select>

          {type === 'focus' && (
            <select
              value={targetMinutes}
              onChange={e => setTargetMinutes(Number(e.target.value))}
              className="px-2 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
            >
              <option value={15}>15p</option>
              <option value={25}>25p</option>
              <option value={45}>45p</option>
              <option value={60}>60p</option>
            </select>
          )}

          <button
            type="submit"
            disabled={!title.trim()}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition shadow-xs cursor-pointer active:scale-95"
          >
            Tạo
          </button>

          <button
            id="btn-open-add-quest"
            type="button"
            onClick={handleOpenDetailedModal}
            className="btn-action-quest inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer select-none"
            title="Mở form chi tiết tạo nhiệm vụ & định giá AI (Phím tắt: Q)"
          >
            <Icon name="tune" className="text-base leading-none" />
            <span className="hidden md:inline">Chi tiết</span>
          </button>
        </div>
      </form>
    </div>
  );
}
