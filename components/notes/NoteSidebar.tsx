'use client';

import React from 'react';
import type { NoteItem } from '@/types/levelup';
import { extractPlainTextPreview } from './markdown';

interface NoteSidebarProps {
  notes: NoteItem[];
  activeNoteId: string | null;
  idPrefix?: string;
  onSelectNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onCreateNote: () => void;
}

export function formatNoteDate(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return 'Vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}p trước`;
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (diff < 86400000) return `${hh}:${mm}`;
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${mon}`;
}

export function NoteSidebar({
  notes,
  activeNoteId,
  idPrefix = '',
  onSelectNote,
  onTogglePin,
  onDeleteNote,
  onCreateNote,
}: NoteSidebarProps) {
  return (
    <>
      <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
        <span id={`${idPrefix}notes-list-header-label`}>Danh Sách Ghi Chú</span>
        <span id={`${idPrefix}notes-list-count`} className="text-[11px] font-normal text-slate-400">
          {notes.length} mục
        </span>
      </div>

      <div
        id={`${idPrefix}react-notes-card-list`}
        className="flex flex-col gap-2 max-h-[calc(100vh-270px)] lg:max-h-[620px] overflow-y-auto custom-scrollbar pr-0.5"
      >
        {notes.length === 0 ? (
          <div className="text-center py-8 px-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400">
            <span className="material-symbols-outlined text-2xl mb-1 text-slate-300 dark:text-slate-600">
              search_off
            </span>
            <div className="text-xs font-medium">Không tìm thấy ghi chú nào</div>
            <button
              type="button"
              onClick={onCreateNote}
              className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              + Tạo ghi chú mới
            </button>
          </div>
        ) : (
          notes.map(note => {
            const isActive = activeNoteId === note.id;
            const isPinned = Boolean(note.pinned ?? note.isPinned);
            const preview = extractPlainTextPreview(note.content, 70);
            const formattedTime = formatNoteDate(note.updatedAt || note.createdAt);

            return (
              <div
                key={note.id}
                data-note-id={note.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectNote(note.id)}
                style={{ touchAction: 'manipulation' }}
                className={`note-card-item p-3 rounded-2xl border transition cursor-pointer select-none relative group ${
                  isActive
                    ? 'active bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/50 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1 pointer-events-none">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {isPinned && (
                      <span
                        className="material-symbols-outlined text-amber-500 text-[14px] shrink-0"
                        title="Đã ghim"
                      >
                        push_pin
                      </span>
                    )}
                    <h4
                      className={`note-card-title text-xs font-bold text-slate-800 dark:text-slate-200 truncate ${
                        isActive ? 'text-amber-700 dark:text-amber-400' : ''
                      }`}
                    >
                      {note.title || 'Chưa đặt tiêu đề'}
                    </h4>
                  </div>
                  <span className="note-card-time text-[10px] font-mono text-slate-400 shrink-0">
                    {formattedTime}
                  </span>
                </div>

                <p className="note-card-preview text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-1 font-normal pointer-events-none">
                  {preview}
                </p>

                <div className="flex items-center justify-end gap-1">
                  <div className="note-card-actions flex items-center gap-1 transition-opacity">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onTogglePin(note.id);
                      }}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500 cursor-pointer"
                      title={isPinned ? 'Bỏ ghim' : 'Ghim'}
                    >
                      <span className="material-symbols-outlined text-[15px] leading-none">
                        {isPinned ? 'keep_off' : 'push_pin'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                      className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="Xóa ghi chú"
                    >
                      <span className="material-symbols-outlined text-[15px] leading-none">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
