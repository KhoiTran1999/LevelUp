'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';
import type { NoteItem } from '@/types/levelup';
import { TopicFilterChips } from './TopicFilterChips';
import { NoteSidebar } from './NoteSidebar';
import { NoteEditor } from './NoteEditor';

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
  const [currentTopic, setCurrentTopic] = useState<string>('all');
  const [mobileActive, setMobileActive] = useState(false);

  // Extract all unique topics and counts from notes
  const { allTopics, topicCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    const set = new Set<string>();

    optimisticNotes.forEach(note => {
      const topic = (note.topic || '').trim();
      if (topic) {
        set.add(topic);
        counts[topic] = (counts[topic] || 0) + 1;
      }
    });

    const sortedTopics = Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
    return { allTopics: sortedTopics, topicCounts: counts };
  }, [optimisticNotes]);

  // Filtered and Sorted notes list (pinned first, then latest updatedAt)
  const filteredNotes = useMemo(() => {
    let list = optimisticNotes.filter(note => {
      // 1. Topic Filter
      if (currentTopic !== 'all') {
        const noteTopic = (note.topic || '').trim();
        if (noteTopic !== currentTopic) return false;
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (note.title || '').toLowerCase().includes(q);
        const contentMatch = (note.content || '').toLowerCase().includes(q);
        if (!titleMatch && !contentMatch) return false;
      }

      return true;
    });

    // Pinned notes bubble to top, then sorted by latest updatedAt or createdAt
    return list.sort((a, b) => {
      const aPinned = Boolean(a.pinned ?? a.isPinned);
      const bPinned = Boolean(b.pinned ?? b.isPinned);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });
  }, [optimisticNotes, currentTopic, searchQuery]);

  // Determine active note
  const activeNote = useMemo(() => {
    if (activeNoteId) {
      const found = optimisticNotes.find(n => n.id === activeNoteId);
      if (found) return found;
    }
    return filteredNotes[0] || optimisticNotes[0] || null;
  }, [optimisticNotes, filteredNotes, activeNoteId]);

  // Make sure activeNoteId is consistent
  useEffect(() => {
    if (activeNote && (!activeNoteId || activeNoteId !== activeNote.id)) {
      setActiveNoteId(activeNote.id);
    }
  }, [activeNote, activeNoteId, setActiveNoteId]);

  // Handlers
  const handleSelectNote = useCallback(
    (noteId: string) => {
      setActiveNoteId(noteId);
      setMobileActive(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setActiveNoteId]
  );

  const handleCreateNote = useCallback(() => {
    const defaultTopic = currentTopic !== 'all' ? currentTopic : 'Ghi Chép Nhanh';
    const newId = createNote(defaultTopic);
    setActiveNoteId(newId);
    setMobileActive(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
      (window as unknown as { showToast: (m: string, t: string) => void }).showToast('📝 Đã tạo ghi chú mới!', 'success');
    }
  }, [createNote, currentTopic, setActiveNoteId]);

  const handleDeleteActiveNote = useCallback(
    async (noteId?: string) => {
      const targetId = noteId || activeNote?.id;
      if (!targetId) return;
      const targetNote = optimisticNotes.find(n => n.id === targetId);
      const title = targetNote?.title || 'ghi chú này';

      if (
        typeof window !== 'undefined' &&
        typeof (window as unknown as { confirmAction?: (opt: unknown) => Promise<boolean> }).confirmAction === 'function'
      ) {
        const ok = await (window as unknown as { confirmAction: (opt: unknown) => Promise<boolean> }).confirmAction({
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

      await deleteNote(targetId);
      if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
        (window as unknown as { showToast: (m: string, t: string) => void }).showToast('Đã xóa ghi chú.', 'info');
      }
    },
    [activeNote, optimisticNotes, deleteNote]
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

  // Keyboard shortcut listener for Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
          (window as unknown as { showToast: (m: string, t: string) => void }).showToast('💾 Ghi chú đã được lưu tự động!', 'success');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full">
      {/* Dynamic Topic Filter Bar */}
      <TopicFilterChips
        topics={allTopics}
        currentTopic={currentTopic}
        onSelectTopic={setCurrentTopic}
        topicCounts={topicCounts}
        totalCount={optimisticNotes.length}
      />

      {/* Master-Detail Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start" id="notes-workspace-container">
        {/* Left Column: Sidebar List (4 cols on lg, full on mobile when in list view) */}
        <div className={`col-span-12 lg:col-span-4 ${mobileActive ? 'hidden lg:block' : 'block'}`}>
          <NoteSidebar
            notes={filteredNotes}
            activeNoteId={activeNote?.id || null}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectNote={handleSelectNote}
            onTogglePin={togglePinNote}
            onDeleteNote={handleDeleteActiveNote}
            onCreateNote={handleCreateNote}
            onReloadNotes={handleReloadNotes}
            totalNotesCount={optimisticNotes.length}
          />
        </div>

        {/* Right Column: Active Note Editor (8 cols on lg, full on mobile when in editor view) */}
        <div
          id="notes-editor-column"
          data-mobile-active={mobileActive ? 'true' : undefined}
          className={`col-span-12 lg:col-span-8 ${mobileActive ? 'flex' : 'hidden lg:flex'} flex-col`}
        >
          <NoteEditor
            activeNote={activeNote}
            onUpdateTitle={title => activeNote && updateNote(activeNote.id, { title })}
            onUpdateTopic={topic => activeNote && updateNote(activeNote.id, { topic })}
            onUpdateContent={content => activeNote && updateNote(activeNote.id, { content })}
            onTogglePin={() => activeNote && togglePinNote(activeNote.id)}
            onDeleteNote={() => activeNote && handleDeleteActiveNote(activeNote.id)}
            onBackToListMobile={() => setMobileActive(false)}
            allTopics={allTopics}
            onReloadNotes={handleReloadNotes}
          />
        </div>
      </div>
    </div>
  );
}
