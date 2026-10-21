'use client';

import React, { useEffect } from 'react';
import { useFocusTimer } from '@/hooks/useFocusTimer';

interface ZenOverlayWindow extends Window {
  openBrainDumpModal?: () => void;
  openDopamineGuideModal?: () => void;
}

export function FocusZenOverlay() {
  const {
    activeTimer,
    isRunning,
    formattedTime,
    zenDashOffset,
    toggle,
    hold,
    toggleZen,
  } = useFocusTimer();

  const handleExit = () => {
    toggleZen(false);
  };

  const handleHold = () => {
    handleExit();
    hold();
  };

  const handleBrainDump = () => {
    if (typeof window !== 'undefined') {
      const win = window as ZenOverlayWindow;
      win.openBrainDumpModal?.();
    }
  };

  const handleDopamineGuide = () => {
    if (typeof window !== 'undefined') {
      const win = window as ZenOverlayWindow;
      win.openDopamineGuideModal?.();
    }
  };

  // Keyboard shortcuts (Space = toggle, Alt+D = brain dump, Esc = exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const overlay = document.getElementById('focus-zen-overlay');
      if (!overlay || overlay.classList.contains('hidden')) return;

      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        toggle();
      } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleBrainDump();
      } else if (e.key === 'Escape') {
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return (
    <div
      id="focus-zen-overlay"
      className="fixed inset-0 z-[90] hidden bg-black flex flex-col items-center justify-center select-none text-white p-4"
    >
      <div className="relative flex flex-col items-center justify-center text-center space-y-6 max-w-md w-full">
        <div className="flex items-center gap-2">
          <span id="zen-quest-rank" className="hidden">
            {activeTimer?.questRank || 'HẠNG B'}
          </span>
          <h2
            id="zen-quest-title"
            className="text-slate-300 text-sm sm:text-base font-semibold tracking-wide truncate max-w-xs"
          >
            {activeTimer?.rewardTitle || activeTimer?.questTitle || 'Học bài tập trung'}
          </h2>
        </div>

        {/* Large Zen Progress Ring */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
            <circle
              cx="120"
              cy="120"
              r="105"
              stroke="#1e293b"
              strokeWidth="6"
              className="fill-none"
            />
            <circle
              id="zen-progress-ring"
              cx="120"
              cy="120"
              r="105"
              stroke="#f59e0b"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="659.73"
              strokeDashoffset={zenDashOffset}
              className="fill-none transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <div
              id="zen-timer-display"
              className="font-mono text-5xl sm:text-6xl font-black text-amber-400 tracking-wider"
            >
              {formattedTime}
            </div>
            <div
              id="zen-protocol-label"
              className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-2"
            >
              {activeTimer?.isReward ? 'CHẾ ĐỘ HƯỞNG THỤ' : 'CHẾ ĐỘ TẬP TRUNG'}
            </div>
          </div>
        </div>

        {/* Zen Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
          <button
            id="btn-zen-toggle"
            type="button"
            onClick={toggle}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition active:scale-95 cursor-pointer"
            title="Tạm dừng / Tiếp tục (Phím tắt: Space)"
          >
            {isRunning ? 'Tạm Dừng' : 'Tiếp Tục'}
          </button>
          <button
            id="btn-zen-brain-dump"
            type="button"
            onClick={handleBrainDump}
            className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            title="Sổ Tay Ghi Chú (Alt+D)"
          >
            <span>📝</span>
            <span>Sổ Ghi Chú</span>
            <span
              id="zen-brain-dump-badge"
              className="hidden font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black"
            >
              0
            </span>
          </button>
          <button
            id="btn-zen-dopamine-guide"
            type="button"
            onClick={handleDopamineGuide}
            className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            title="Cẩm Nang Ngắt Mạch Dopamine"
          >
            <span>🧠</span>
            <span>Cẩm Nang Dopamine</span>
          </button>
          <button
            id="btn-zen-hold"
            type="button"
            onClick={handleHold}
            className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-sky-600/30 border border-sky-500/50 text-sky-300 hover:bg-sky-600/50 transition active:scale-95 cursor-pointer"
            title="Bảo lưu thời gian còn lại"
          >
            ⏸️ Bảo Lưu
          </button>
          <button
            id="btn-zen-exit"
            type="button"
            onClick={handleExit}
            className="px-4 py-2.5 rounded-xl font-medium text-xs bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
          >
            Thoát Toàn Màn Hình
          </button>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-2 opacity-75 select-none flex-wrap justify-center">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
              Space
            </kbd>
            <span>Tạm dừng / Tiếp tục</span>
          </span>
          <span className="opacity-50">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
              Alt + D
            </kbd>
            <span>Sổ Ghi Chú</span>
          </span>
        </div>
      </div>
    </div>
  );
}
