'use client';

import React from 'react';
import type { NoteItem } from '@/types/levelup';
import { extractPlainTextPreview } from './markdown';
import { Icon } from '@/components/ui/Icon';

interface NoteSidebarProps {
  notes: NoteItem[];
  activeNoteId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onCreateNote: () => void;
  onReloadNotes: () => void;
  totalNotesCount: number;
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
  searchQuery,
  onSearchChange,
  onSelectNote,
  onTogglePin,
  onDeleteNote,
  onCreateNote,
  onReloadNotes,
  totalNotesCount,
}: NoteSidebarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* 1. Header Banner & Actions */}
      <div
        id="notes-header-banner"
        className="rpg-panel rounded-2xl p-3 sm:p-5 border border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-transparent to-yellow-500/5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Banner Title */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/20 dark:bg-amber-400/20 border border-amber-500/40 flex items-center justify-center text-lg sm:text-xl shrink-0 shadow-xs">
              📝
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-rpg-title font-black text-sm sm:text-lg text-amber-700 dark:text-amber-300">
                  SỔ TAY GHI CHÚ &amp; PHÂN LOẠI
                </h2>
                <span
                  id="notes-total-badge"
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono"
                >
                  {totalNotesCount} Ghi Chú
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Soạn thảo nhanh ý tưởng, ghi chú và danh sách việc cần làm.
              </p>
            </div>
          </div>

          {/* Banner Actions: Search, Reload, New Note */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-none">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                id="notes-search-input"
                type="text"
                placeholder="Tìm ghi chú..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="w-full sm:w-48 pl-8 pr-7 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Reload Button */}
            <button
              id="btn-reload-notes"
              type="button"
              onClick={onReloadNotes}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
              title="Làm mới ghi chú"
            >
              <Icon name="refresh" className="text-[17px] leading-none" />
              <span className="hidden sm:inline">Làm Mới</span>
            </button>

            {/* Create New Note Button */}
            <button
              id="btn-create-new-note"
              type="button"
              onClick={onCreateNote}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-sm cursor-pointer active:scale-95 shrink-0"
            >
              <Icon name="note_add" className="text-[18px] leading-none" />
              <span>+ Tạo Ghi Chú</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sidebar Column */}
      <div id="notes-sidebar-column" className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
          <span id="notes-list-header-label">Danh Sách Ghi Chú</span>
          <span id="notes-list-count" className="text-[11px] font-normal text-slate-400">
            {notes.length} mục
          </span>
        </div>

        {/* Note Card List */}
        <div
          id="notes-card-list"
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
              const preview = extractPlainTextPreview(note.content, 75);
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
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-500/30'
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

                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-1 min-w-0">
                      {note.topic && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono truncate max-w-[120px]">
                          #{note.topic}
                        </span>
                      )}
                    </div>
                    <div className="note-card-actions flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onTogglePin(note.id);
                        }}
                        className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition ${
                          isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                        }`}
                        title={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
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
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 cursor-pointer transition"
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
      </div>
    </div>
  );
}
