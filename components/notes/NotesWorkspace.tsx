'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';
import type { NoteItem } from '@/types/levelup';
import { NoteSidebar } from './NoteSidebar';
import { NoteEditor, type NoteEditorHandle } from './NoteEditor';
import { TopicFilterChips } from './TopicFilterChips';
import { Icon } from '@/components/ui/Icon';

export function NotesWorkspace() {
  const {
    optimisticNotes,
    activeNoteId,
    setActiveNoteId,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
  } = useLevelUp();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileActive, setMobileActive] = useState(false);

  const editorHandleRef = useRef<NoteEditorHandle>(null);
  const notesRef = useRef<NoteItem[]>(optimisticNotes);
  notesRef.current = optimisticNotes;

  // Filter and sort notes (pinned notes first, then latest updatedAt)
  const filteredNotes = useMemo(() => {
    // ponytail: Deduplicate notes by ID to guarantee unique React keys. Upgrade path: DB PK constraint.
    const seenIds = new Set<string>();
    const uniqueNotes: NoteItem[] = [];
    for (const note of optimisticNotes) {
      if (note && note.id && !seenIds.has(note.id)) {
        seenIds.add(note.id);
        uniqueNotes.push(note);
      }
    }

    let list = uniqueNotes;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => {
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const contentMatch = (n.content || '').toLowerCase().includes(q);
        return titleMatch || contentMatch;
      });
    }

    return [...list].sort((a, b) => {
      const aPinned = Boolean(a.pinned ?? a.isPinned);
      const bPinned = Boolean(b.pinned ?? b.isPinned);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });
  }, [optimisticNotes, searchQuery]);

  // Current active note
  const currentActiveNote = useMemo(() => {
    if (activeNoteId) {
      const found = optimisticNotes.find(n => n.id === activeNoteId);
      if (found) return found;
    }
    return filteredNotes[0] || optimisticNotes[0] || null;
  }, [optimisticNotes, filteredNotes, activeNoteId]);

  // Ensure activeNoteId stays aligned
  useEffect(() => {
    if (currentActiveNote && (!activeNoteId || activeNoteId !== currentActiveNote.id)) {
      setActiveNoteId(currentActiveNote.id);
      if (typeof window !== 'undefined') {
        const win = window as unknown as { appState?: { activeNoteId?: string } };
        if (win.appState) {
          win.appState.activeNoteId = currentActiveNote.id;
        }
      }
    }
  }, [currentActiveNote, activeNoteId, setActiveNoteId]);

  // Safe Note Switching: Always flush pending editor changes first
  const handleSelectNote = useCallback(
    (noteId: string) => {
      // 1. Flush previous note
      editorHandleRef.current?.flush();

      // 2. Set new active note
      setActiveNoteId(noteId);
      if (typeof window !== 'undefined') {
        const win = window as unknown as { appState?: { activeNoteId?: string } };
        if (win.appState) {
          win.appState.activeNoteId = noteId;
        }
      }

      // 3. Switch to mobile editor screen
      setMobileActive(true);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    },
    [setActiveNoteId]
  );

  // Safe Note Creation: Always flush pending editor changes first
  const handleCreateNewNote = useCallback(() => {
    // 1. Flush previous note
    editorHandleRef.current?.flush();

    // 2. Create note
    const newId = createNote('Ghi Chép Nhanh');
    setActiveNoteId(newId);
    if (typeof window !== 'undefined') {
      const win = window as unknown as { appState?: { activeNoteId?: string } };
      if (win.appState) {
        win.appState.activeNoteId = newId;
      }
    }

    // 3. Switch to mobile editor screen
    setMobileActive(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // 4. Focus new note title
    setTimeout(() => {
      const titleInput = document.getElementById('active-note-title') as HTMLInputElement | null;
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }
    }, 50);

    if (
      typeof window !== 'undefined' &&
      typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function'
    ) {
      (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
        '📝 Đã tạo ghi chú mới!',
        'success'
      );
    }
  }, [createNote, setActiveNoteId]);

  // Mobile Back Button: Return from Screen 2 (Editor) to Screen 1 (List)
  const handleBackToListMobile = useCallback(() => {
    // 1. Flush any uncommitted editor changes
    editorHandleRef.current?.flush();

    // 2. Dismiss keyboard and switch view
    setMobileActive(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  const handleSaveNote = useCallback(
    (id: string, updates: Partial<NoteItem>) => {
      updateNote(id, updates);
    },
    [updateNote]
  );

  const handleTogglePin = useCallback(
    (id: string) => {
      togglePinNote(id);
      if (
        typeof window !== 'undefined' &&
        typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function'
      ) {
        const note = notesRef.current.find(n => n.id === id);
        const nextPinned = !(note?.pinned ?? note?.isPinned);
        (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
          nextPinned ? '📌 Đã ghim ghi chú lên đầu!' : 'Đã bỏ ghim ghi chú.',
          'info'
        );
      }
    },
    [togglePinNote]
  );

  const handleDeleteNote = useCallback(
    async (id: string) => {
      const note = notesRef.current.find(n => n.id === id);
      const title = note?.title || 'ghi chú này';

      if (
        typeof window !== 'undefined' &&
        typeof (window as unknown as { confirmAction?: (opt: unknown) => Promise<boolean> }).confirmAction ===
          'function'
      ) {
        const ok = await (
          window as unknown as { confirmAction: (opt: unknown) => Promise<boolean> }
        ).confirmAction({
          title: 'Xóa Ghi Chú',
          message: `Xóa ghi chú "${title}"? Thao tác này không thể hoàn tác.`,
          confirmText: 'Xóa Ghi Chú',
          cancelText: 'Hủy',
          icon: '🗑️',
          btnColor: 'rose',
        });
        if (!ok) return;
      } else if (typeof window !== 'undefined' && !window.confirm(`Xóa ghi chú "${title}"?`)) {
        return;
      }

      await deleteNote(id);
      if (
        typeof window !== 'undefined' &&
        typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function'
      ) {
        (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
          'Đã xóa ghi chú.',
          'info'
        );
      }
    },
    [deleteNote]
  );

  const handleReloadNotes = useCallback(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        reloadNotesWorkspace?: (t: boolean) => void;
        hydrateFromCloud?: (s: boolean) => void;
      };
      if (typeof win.reloadNotesWorkspace === 'function') {
        win.reloadNotesWorkspace(true);
      } else if (typeof win.hydrateFromCloud === 'function') {
        win.hydrateFromCloud(false);
      }
    }
  }, []);

  // Expose global window hooks for seamless legacy compatibility
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as {
      showNotesListMobile?: () => void;
      switchActiveNote?: (id: string) => void;
      createNewNotePrompt?: () => void;
      togglePinNote?: (id: string) => void;
      toggleActiveNotePin?: () => void;
      deleteActiveNotePrompt?: () => void;
      deleteNoteById?: (id: string) => void;
      handleNotesSearch?: (q: string) => void;
      reloadNotesWorkspace?: () => void;
    };

    win.showNotesListMobile = handleBackToListMobile;
    win.switchActiveNote = handleSelectNote;
    win.createNewNotePrompt = handleCreateNewNote;
    win.togglePinNote = handleTogglePin;
    win.toggleActiveNotePin = () => {
      if (currentActiveNote) handleTogglePin(currentActiveNote.id);
    };
    win.deleteActiveNotePrompt = () => {
      if (currentActiveNote) handleDeleteNote(currentActiveNote.id);
    };
    win.deleteNoteById = handleDeleteNote;
    win.handleNotesSearch = (query: string) => setSearchQuery(query);
    win.reloadNotesWorkspace = handleReloadNotes;
  }, [
    handleBackToListMobile,
    handleSelectNote,
    handleCreateNewNote,
    handleTogglePin,
    handleDeleteNote,
    handleReloadNotes,
    currentActiveNote,
  ]);

  return (
    <>
      {/* 1. Header Banner & Actions (Full width at top, matches original public/index.html) */}
      <div
        id="notes-header-banner"
        className={`rpg-panel rounded-2xl p-3 sm:p-5 mb-3 sm:mb-6 border border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-transparent to-yellow-500/5 ${
          mobileActive ? 'hidden lg:block' : 'block'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                  {optimisticNotes.length} Ghi Chú
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Soạn thảo nhanh ý tưởng, ghi chú và danh sách việc cần làm.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* Search notes input */}
            <div className="relative flex-1 sm:flex-none">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                id="notes-search-input"
                type="text"
                placeholder="Tìm ghi chú..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-2xs"
              />
            </div>

            {/* Reload notes button */}
            <button
              id="btn-reload-notes"
              type="button"
              onClick={handleReloadNotes}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
              title="Làm mới ghi chú"
            >
              <Icon name="refresh" className="text-[17px] leading-none" />
              <span className="hidden sm:inline">Làm Mới</span>
            </button>

            {/* Create new note button */}
            <button
              id="btn-create-new-note"
              type="button"
              onClick={handleCreateNewNote}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-sm cursor-pointer active:scale-95 shrink-0"
            >
              <Icon name="note_add" className="text-[18px] leading-none" />
              <span>+ Tạo Ghi Chú</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Dynamic Custom Topics Filter Bar (Ẩn theo yêu cầu bỏ hệ thống tag) */}
      <TopicFilterChips />

      {/* 3. Master-Detail Workspace: Note List + Active Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start" id="notes-workspace-container">
        {/* Left: Notes Sidebar List (4 cols on lg, full on mobile when in list mode) */}
        <div
          id="notes-sidebar-column"
          className={`col-span-12 lg:col-span-4 flex flex-col gap-2 ${
            mobileActive ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <NoteSidebar
            notes={filteredNotes}
            activeNoteId={currentActiveNote?.id || null}
            onSelectNote={handleSelectNote}
            onTogglePin={handleTogglePin}
            onDeleteNote={handleDeleteNote}
            onCreateNote={handleCreateNewNote}
          />
        </div>

        {/* Right: Active Note Editor (8 cols on lg, full on mobile when in editor mode) */}
        <div
          id="notes-editor-column"
          data-mobile-active={mobileActive ? 'true' : undefined}
          className={`col-span-12 lg:col-span-8 flex flex-col ${
            mobileActive ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <NoteEditor
            ref={editorHandleRef}
            activeNote={currentActiveNote}
            onBackToListMobile={handleBackToListMobile}
            onSaveNote={handleSaveNote}
            onTogglePin={() => currentActiveNote && handleTogglePin(currentActiveNote.id)}
            onDeleteNote={() => currentActiveNote && handleDeleteNote(currentActiveNote.id)}
            onReloadNotes={handleReloadNotes}
          />
        </div>
      </div>
    </>
  );
}
