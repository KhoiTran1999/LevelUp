'use client';

import { useEffect, useRef, useState } from 'react';

type ConfirmColor = 'amber' | 'emerald' | 'rose' | 'cyan' | 'purple' | 'blue';

interface ConfirmOptions {
  title?: string;
  message?: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  btnColor?: ConfirmColor;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface PendingConfirm {
  options: Required<Pick<ConfirmOptions, 'title' | 'message' | 'detail' | 'confirmText' | 'cancelText' | 'icon' | 'btnColor'>> & ConfirmOptions;
  resolve: (result: boolean) => void;
}

declare global {
  interface Window {
    levelupConfirmAction?: (options: ConfirmOptions) => Promise<boolean>;
    sfx?: { playClick?: () => void };
  }
}

const buttonColors: Record<ConfirmColor, string> = {
  amber: 'bg-amber-500 text-slate-950 shadow-amber-500/20 hover:bg-amber-400',
  emerald: 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-500',
  rose: 'bg-rose-600 text-white shadow-rose-600/20 hover:bg-rose-500',
  cyan: 'bg-cyan-600 text-white shadow-cyan-600/20 hover:bg-cyan-500',
  purple: 'bg-purple-600 text-white shadow-purple-600/20 hover:bg-purple-500',
  blue: 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-500',
};

export function ConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);

  const finish = (result: boolean) => {
    const current = pendingRef.current;
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    try {
      if (result) current.options.onConfirm?.();
      else current.options.onCancel?.();
    } catch (error) {
      console.error('[ConfirmDialog] Callback failed:', error);
    }
    current.resolve(result);
  };

  useEffect(() => {
    window.levelupConfirmAction = options => new Promise(resolve => {
      if (pendingRef.current) finish(false);
      const request: PendingConfirm = {
        options: {
          ...options,
          title: options.title || 'Xác Nhận',
          message: options.message || 'Xác nhận thực hiện hành động này?',
          detail: options.detail || '',
          confirmText: options.confirmText || 'Xác Nhận',
          cancelText: options.cancelText || 'Hủy',
          icon: options.icon || '❓',
          btnColor: options.btnColor || 'amber',
        },
        resolve,
      };
      pendingRef.current = request;
      setPending(request);
      window.sfx?.playClick?.();
    });

    return () => {
      finish(false);
      delete window.levelupConfirmAction;
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pending]);

  if (!pending) return null;

  return (
    <div
      id="modal-confirm"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) finish(false);
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className="rpg-panel m3-dialog-panel relative flex max-h-[90vh] w-full max-w-sm flex-col overflow-y-auto rounded-3xl border border-amber-500/30 bg-white p-5 text-center shadow-2xl dark:bg-slate-900 sm:p-6"
      >
        <button
          type="button"
          onClick={() => finish(false)}
          aria-label="Đóng"
          className="modal-close absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <span className="material-symbols-outlined text-lg leading-none">close</span>
        </button>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl shadow-sm">{pending.options.icon}</div>
        <h2 id="confirm-modal-title" className="font-rpg-title mb-1.5 text-base font-extrabold leading-snug text-slate-900 dark:text-slate-100">{pending.options.title}</h2>
        <p id="confirm-modal-desc" className="mb-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{pending.options.message}</p>
        {pending.options.detail && <div className="mb-4 whitespace-pre-line rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-[11px] font-medium leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">{pending.options.detail}</div>}
        <div className="flex items-center justify-center gap-2.5 pt-1">
          <button type="button" onClick={() => { window.sfx?.playClick?.(); finish(false); }} className="m3-btn m3-btn-outlined flex-1 rounded-full bg-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">{pending.options.cancelText}</button>
          <button type="button" autoFocus onClick={() => { window.sfx?.playClick?.(); finish(true); }} className={`m3-btn m3-btn-filled flex-1 rounded-full px-4 py-2.5 text-xs font-bold shadow-md transition active:scale-95 ${buttonColors[pending.options.btnColor] || buttonColors.amber}`}>{pending.options.confirmText}</button>
        </div>
      </section>
    </div>
  );
}
