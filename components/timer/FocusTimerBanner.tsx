'use client';

import React from 'react';
import { useFocusTimer } from '@/hooks/useFocusTimer';
import { Icon } from '@/components/ui/Icon';

export function FocusTimerBanner() {
  const {
    activeTimer,
    isRunning,
    isPaused,
    isHeld,
    isVisible,
    formattedTime,
    bannerDashOffset,
    hold,
    reset,
    adjust,
    toggle,
    toggleZen,
    openAdjustmentModal,
  } = useFocusTimer();

  return (
    <div
      id="active-focus-banner"
      className={`${
        isVisible ? 'block' : 'hidden'
      } mb-6 rpg-panel-gold rounded-2xl p-3.5 sm:p-4 border border-indigo-500/30 shadow-xl transition-all`}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left: Circular Progress Ring & Quest Info */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Circular Progress Ring (SVG) */}
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="3.5"
                className="text-indigo-500/20 dark:text-indigo-500/10 fill-none"
              />
              <circle
                id="focus-progress-ring"
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="125.66"
                strokeDashoffset={bannerDashOffset}
                className="text-indigo-500 fill-none transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <span
              id="focus-status-icon"
              className="absolute font-mono text-[9px] font-black text-indigo-600 dark:text-indigo-400"
            >
              {isRunning ? 'CHẠY' : isPaused ? 'DỪNG' : isHeld ? 'LƯU' : 'CHỜ'}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-0.5">
              <span
                id="timer-mode-label"
                className="text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold font-mono"
              >
                {activeTimer?.isReward
                  ? 'ĐANG TẬN HƯỞNG PHẦN THƯỞNG 🎁'
                  : isHeld
                  ? 'ĐANG BẢO LƯU THỜI GIAN'
                  : 'ĐANG BẤM GIỜ TẬP TRUNG'}
              </span>
              <span id="timer-quest-rank" className="hidden">
                {activeTimer?.questRank || 'C'}
              </span>
              {!activeTimer?.isReward && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <span className="coin-icon" />
                  <span id="timer-quest-coins">+{activeTimer?.questCoins || 15}</span>
                </span>
              )}
              <span className="hidden">
                <span id="timer-quest-exp" />
              </span>
            </div>
            <h3
              id="timer-quest-title"
              className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate"
            >
              {activeTimer?.rewardTitle || activeTimer?.questTitle || 'Học bài tập trung'}
            </h3>
          </div>
        </div>

        {/* Right: Time Display, Quick Adjust, & Actions */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 sm:gap-3 w-full md:w-auto">
          {/* Clickable Time Display (opens edit dialog) */}
          <button
            id="btn-open-edit-timer"
            type="button"
            onClick={openAdjustmentModal}
            className="flex items-center gap-1.5 group px-2.5 py-1 rounded-xl hover:bg-indigo-500/10 transition cursor-pointer"
            title="Nhấp để chỉnh thời gian"
          >
            <span
              id="timer-display"
              className="font-mono text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-wider"
            >
              {formattedTime}
            </span>
            <Icon
              name="edit"
              className="text-sm leading-none text-slate-400 group-hover:text-indigo-500 transition"
            />
          </button>

          {/* Quick Time Adjust Buttons */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-black/20 p-1 rounded-full border border-slate-200/50 dark:border-slate-800/50">
            <button
              type="button"
              onClick={() => adjust(60)}
              className="btn-timer-adjust px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-white dark:bg-slate-800 hover:bg-indigo-500/20 hover:text-indigo-500 text-slate-700 dark:text-slate-300 transition shadow-xs cursor-pointer"
              data-delta="60"
              title="Thêm 1 phút tập trung"
            >
              +1p
            </button>
            <button
              type="button"
              onClick={() => adjust(300)}
              className="btn-timer-adjust px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-white dark:bg-slate-800 hover:bg-indigo-500/20 hover:text-indigo-500 text-slate-700 dark:text-slate-300 transition shadow-xs cursor-pointer"
              data-delta="300"
              title="Thêm 5 phút tập trung"
            >
              +5p
            </button>
          </div>

          {/* Primary Control Buttons: Toggle, Hold, Fullscreen, Cancel */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-timer-toggle"
              type="button"
              onClick={toggle}
              className="m3-btn m3-btn-sm m3-btn-filled px-4 py-2 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-xs cursor-pointer"
              title="Tạm dừng / Tiếp tục (Phím tắt: Space)"
            >
              {isRunning ? 'Tạm Dừng' : 'Tiếp Tục'}
            </button>

            <button
              id="btn-timer-hold"
              type="button"
              onClick={hold}
              className="m3-btn m3-btn-sm m3-btn-tonal px-3 py-2 rounded-full text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-500/30 transition flex items-center gap-1 cursor-pointer"
              title="Bảo lưu thời gian còn lại để làm việc khác"
            >
              <Icon name="pause_circle" className="text-[16px] leading-none" />
              <span className="hidden sm:inline">Bảo Lưu</span>
            </button>

            <button
              id="btn-timer-zen"
              type="button"
              onClick={() => toggleZen(true)}
              className="m3-icon-btn w-8 h-8 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center justify-center cursor-pointer"
              title="Chế độ Toàn màn hình (Tập trung tối đa)"
            >
              <Icon name="fullscreen" className="text-[16px] leading-none" />
            </button>

            <button
              id="btn-timer-reset"
              type="button"
              onClick={reset}
              className="m3-btn m3-btn-sm px-3 py-2 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Hủy phiên tập trung"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
