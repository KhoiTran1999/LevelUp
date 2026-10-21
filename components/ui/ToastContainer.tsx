'use client';

import React, { useEffect } from 'react';

export function ToastContainer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as {
      showToast?: (message: string, type?: string, action?: { label?: string; onClick?: () => void }) => void;
    };

    if (!win.showToast) {
      win.showToast = (message: string, type = 'info', action) => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const colors: Record<string, string> = {
          success: 'bg-white/95 text-slate-800 border-emerald-300/80 dark:bg-slate-900/95 dark:text-slate-100 dark:border-emerald-500/40',
          gold: 'bg-white/95 text-slate-800 border-amber-300/80 dark:bg-slate-900/95 dark:text-slate-100 dark:border-amber-500/40',
          error: 'bg-white/95 text-slate-800 border-rose-300/80 dark:bg-slate-900/95 dark:text-slate-100 dark:border-rose-500/40',
          info: 'bg-white/95 text-slate-800 border-slate-200/90 dark:bg-slate-900/95 dark:text-slate-100 dark:border-slate-700/60',
        };

        const toast = document.createElement('div');
        toast.className = `p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs backdrop-blur-md pointer-events-auto transition-all duration-300 border ${colors[type] || colors.info}`;

        const msgSpan = document.createElement('span');
        msgSpan.className = 'break-words font-medium text-xs sm:text-[13px] leading-snug flex-1';
        msgSpan.textContent = message;
        toast.appendChild(msgSpan);

        if (action?.onClick) {
          const actionBtn = document.createElement('button');
          actionBtn.type = 'button';
          actionBtn.className = 'shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm active:scale-95 cursor-pointer';
          actionBtn.textContent = action.label || 'Hoàn tác';
          actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toast.remove();
            action.onClick?.();
          });
          toast.appendChild(actionBtn);
        }

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'shrink-0 w-6 h-6 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition flex items-center justify-center cursor-pointer text-sm font-bold';
        closeBtn.setAttribute('aria-label', 'Đóng');
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toast.remove();
        });
        toast.appendChild(closeBtn);

        container.appendChild(toast);
        setTimeout(() => {
          if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-8px)';
            setTimeout(() => toast.remove(), 250);
          }
        }, 3200);
      };
    }
  }, []);

  return (
    <>
      {/* Toast Notification Container (Positioned at top for high visibility) */}
      <div
        id="toast-container"
        className="fixed top-4 sm:top-5 right-4 left-4 sm:left-auto sm:max-w-sm z-[130] flex flex-col gap-2.5 pointer-events-none"
      />

      {/* Global Floating Tooltip for Frequency Heatmap Cells */}
      <div
        id="heatmap-floating-tooltip"
        className="fixed pointer-events-none hidden z-[9999] px-3 py-2 rounded-xl bg-slate-950/95 dark:bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl text-xs font-mono backdrop-blur-md transition-opacity duration-150 transform -translate-x-1/2 -translate-y-full mb-2"
      />
    </>
  );
}
