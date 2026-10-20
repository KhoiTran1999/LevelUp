'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NotesWorkspace } from './NotesWorkspace';

interface BrainDumpWindow extends Window {
  openReactBrainDumpModal?: () => void;
  closeReactBrainDumpModal?: () => void;
  flushCurrentEditorChanges?: () => void;
  closeMobileMoreMenu?: () => void;
  sfx?: { playClick?: () => void };
}

export function BrainDumpModal() {
  const [isOpen, setIsOpen] = useState(false);
  const flushEditorRef = useRef<(() => void) | null>(null);
  const registerFlush = useCallback((flush: () => void) => {
    flushEditorRef.current = flush;
  }, []);

  const open = useCallback(() => {
    document.getElementById('nav-more-menu')?.classList.add('hidden');
    const win = window as BrainDumpWindow;
    if (win.closeMobileMoreMenu) {
      win.closeMobileMoreMenu();
    } else {
      document.getElementById('mobile-more-menu')?.classList.add('hidden');
    }
    win.sfx?.playClick?.();
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    flushEditorRef.current?.();
    (window as BrainDumpWindow).sfx?.playClick?.();
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const win = window as BrainDumpWindow;
    win.openReactBrainDumpModal = open;
    win.closeReactBrainDumpModal = close;
    return () => {
      delete win.openReactBrainDumpModal;
      delete win.closeReactBrainDumpModal;
    };
  }, [close, open]);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => {
      document.getElementById('focus-notes-editor')?.focus();
    }, 100);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="modal-brain-dump"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-brain-dump-title"
    >
      <section className="rpg-panel flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 dark:bg-amber-950/40 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/20 text-xl">
              📝
            </div>
            <div>
              <h2
                id="modal-brain-dump-title"
                className="font-rpg-title text-sm font-black uppercase tracking-wide text-amber-600 dark:text-amber-400 sm:text-base"
              >
                SỔ TAY GHI CHÚ RPG
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Ghi chú và ý tưởng của bạn</p>
            </div>
          </div>
          <button
            id="btn-close-brain-dump"
            type="button"
            onClick={close}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200/60 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          <NotesWorkspace modalMode onReady={registerFlush} />
        </div>
      </section>
    </div>
  );
}
