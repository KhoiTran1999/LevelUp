'use client';

import { useEffect, useState } from 'react';
import type { Quest } from '@/types/levelup';

interface TimerEditRequest {
  remainingSeconds: number;
  isReward: boolean;
  minMinutes: number;
  maxMinutes?: number;
  targetMinutes?: number;
}

interface TimerWindow extends Window {
  saveEditTimer?: (minutes: number, seconds: number) => boolean;
  startBreakTimer?: (minutes?: number) => void;
  sfx?: { playClick?: () => void };
  showToast?: (message: string, type: string) => void;
}

function getTimerWindow() {
  return window as TimerWindow;
}

export function TimerAdjustmentModal() {
  const [request, setRequest] = useState<TimerEditRequest | null>(null);
  const [minutes, setMinutes] = useState('25');
  const [seconds, setSeconds] = useState('0');

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<TimerEditRequest>).detail;
      if (!detail || !Number.isFinite(detail.remainingSeconds) || typeof detail.isReward !== 'boolean') {
        console.error('[TimerAdjustmentModal] Invalid timer edit request.');
        return;
      }
      setRequest(detail);
      setMinutes(String(Math.floor(detail.remainingSeconds / 60)));
      setSeconds(String(Math.round(detail.remainingSeconds) % 60));
    };
    const handleClose = () => setRequest(null);
    window.addEventListener('levelup:open-timer-adjustment', handleOpen);
    window.addEventListener('levelup:close-timer-adjustment', handleClose);
    return () => {
      window.removeEventListener('levelup:open-timer-adjustment', handleOpen);
      window.removeEventListener('levelup:close-timer-adjustment', handleClose);
    };
  }, []);

  const close = (playSound = true) => {
    if (playSound) getTimerWindow().sfx?.playClick?.();
    setRequest(null);
  };

  const choosePreset = (preset: number) => {
    if (!request) return;
    const win = getTimerWindow();
    if (!request.isReward && request.targetMinutes && preset < request.targetMinutes) {
      win.showToast?.(`Không thể chọn mốc thấp hơn ${request.targetMinutes} phút do AI đã định giá!`, 'error');
      win.sfx?.playClick?.();
      return;
    }
    if (request.isReward && preset * 60 > request.remainingSeconds) {
      win.showToast?.('Thời gian hưởng thụ chỉ được trừ xuống, không thể cộng thêm!', 'error');
      win.sfx?.playClick?.();
      return;
    }
    setMinutes(String(preset));
    setSeconds('0');
    win.sfx?.playClick?.();
  };

  const save = () => {
    const win = getTimerWindow();
    const saveEditTimer = win.saveEditTimer;
    if (!saveEditTimer) {
      console.error('[TimerAdjustmentModal] Missing legacy timer save action.');
      win.showToast?.('Không thể lưu thời gian timer.', 'error');
      return;
    }
    const parsedMinutes = Math.max(0, Number.parseInt(minutes, 10) || 0);
    const parsedSeconds = Math.max(0, Math.min(59, Number.parseInt(seconds, 10) || 0));
    if (saveEditTimer(parsedMinutes, parsedSeconds)) setRequest(null);
  };

  if (!request) return null;

  return (
    <div
      id="modal-edit-focus-timer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-focus-timer-title"
    >
      <section className="rpg-panel modal-fade w-full max-w-xs space-y-4 rounded-2xl border border-amber-500/40 bg-white p-5 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
        <header className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
          <h2 id="edit-focus-timer-title" className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <span className="material-symbols-outlined text-lg leading-none text-amber-500">timer</span>
            {request.isReward ? 'Giảm Thời Gian Hưởng Thụ' : 'Điều Chỉnh Thời Gian'}
          </h2>
          <button id="btn-close-edit-timer" type="button" className="modal-close flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200/60 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700" aria-label="Đóng" onClick={() => close()}>
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </header>

        <div className="flex items-center justify-center gap-2 py-2">
          <label className="flex flex-col items-center">
            <span className="mb-1 text-[10px] font-semibold text-slate-500">Phút</span>
            <input
              type="number"
              id="input-edit-minutes"
              min={request.minMinutes}
              max={request.maxMinutes}
              value={minutes}
              onChange={event => setMinutes(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') save(); }}
              className="w-20 rounded-xl border border-slate-300 bg-slate-100 p-2 text-center font-mono text-2xl font-bold text-amber-600 dark:border-slate-700 dark:bg-slate-950 dark:text-amber-400"
            />
          </label>
          <span className="mt-4 font-mono text-2xl font-bold text-slate-400">:</span>
          <label className="flex flex-col items-center">
            <span className="mb-1 text-[10px] font-semibold text-slate-500">Giây</span>
            <input
              type="number"
              id="input-edit-seconds"
              min="0"
              max="59"
              value={seconds}
              onChange={event => setSeconds(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') save(); }}
              className="w-20 rounded-xl border border-slate-300 bg-slate-100 p-2 text-center font-mono text-2xl font-bold text-amber-600 dark:border-slate-700 dark:bg-slate-950 dark:text-amber-400"
            />
          </label>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {[15, 25, 45, 60].map(preset => (
            <button key={preset} type="button" className="btn-preset-time rounded-lg bg-slate-100 py-1.5 font-mono text-xs font-bold transition hover:bg-amber-500/20 hover:text-amber-600 dark:bg-slate-800 dark:hover:text-amber-400" data-mins={preset} onClick={() => choosePreset(preset)}>
              {preset}p
            </button>
          ))}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
          <button id="btn-cancel-edit-timer" type="button" className="modal-close rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" onClick={() => close()}>Đóng</button>
          <button id="btn-save-edit-timer" type="button" className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-400" onClick={save}>Lưu Thay Đổi</button>
        </footer>
      </section>
    </div>
  );
}

export function FocusCompleteModal() {
  const [quest, setQuest] = useState<Quest | null>(null);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<Quest>).detail;
      if (!detail?.id || !detail.title) {
        console.error('[FocusCompleteModal] Invalid completed quest.');
        return;
      }
      setQuest(detail);
    };
    window.addEventListener('levelup:focus-complete', handleOpen);
    return () => window.removeEventListener('levelup:focus-complete', handleOpen);
  }, []);

  const close = (playSound = true) => {
    if (playSound) getTimerWindow().sfx?.playClick?.();
    setQuest(null);
  };

  const startBreak = () => {
    const win = getTimerWindow();
    const startBreakTimer = win.startBreakTimer;
    if (!startBreakTimer) {
      console.error('[FocusCompleteModal] Missing legacy break timer action.');
      win.showToast?.('Không thể bắt đầu giờ nghỉ.', 'error');
      return;
    }
    setQuest(null);
    startBreakTimer(5);
  };

  if (!quest) return null;

  return (
    <div
      id="modal-focus-complete"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-md sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-complete-title"
    >
      <section className="rpg-panel modal-fade relative w-full max-w-sm space-y-4 rounded-3xl border border-amber-500/50 bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
        <button type="button" className="modal-close absolute right-3.5 top-3.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 sm:right-4 sm:top-4" aria-label="Đóng" onClick={() => close()}>
          <span className="material-symbols-outlined text-lg leading-none">close</span>
        </button>
        <div className="ios-celebrate-pop mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-4xl">🏆</div>
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">CHIẾN CÔNG RỰC RỠ</span>
          <h2 id="focus-complete-title" className="mt-0.5 font-rpg-title text-lg font-black text-slate-900 dark:text-slate-100 sm:text-xl">HOÀN THÀNH TẬP TRUNG!</h2>
          <p id="focus-complete-desc" className="mt-1 text-xs text-slate-500 dark:text-slate-400">Xuất sắc hoàn thành {quest.targetMinutes} phút tập trung cho &quot;{quest.title}&quot;!</p>
        </div>
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3.5 py-2 font-mono text-sm font-black text-amber-700 dark:text-amber-300">
            <span className="coin-icon" />
            <span id="focus-complete-coins">+{quest.rewardCoins} VÀNG</span>
          </div>
          <div className="hidden"><span id="focus-complete-exp">+{quest.rewardCoins * 3} EXP</span></div>
        </div>
        <div className="space-y-2 pt-2">
          <button id="btn-focus-complete-break" type="button" className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-95" onClick={startBreak}>
            <span>☕</span><span>Nghỉ Giải Lao 5 Phút (Nạp Lại Năng Lượng)</span>
          </button>
          <button id="btn-focus-complete-claim" type="button" className="w-full cursor-pointer rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition hover:bg-amber-400 active:scale-95" onClick={() => close(false)}>
            ⚔️ Nhận Thưởng &amp; Tiếp Tục
          </button>
        </div>
      </section>
    </div>
  );
}
