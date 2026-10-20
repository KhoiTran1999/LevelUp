'use client';

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { NoteItem } from '@/types/levelup';
import {
  isMarkdownText,
  parseInlineMarkdown,
  convertMarkdownToEditorHtml,
  convertHtmlToMarkdown,
} from './markdown';

export interface NoteEditorHandle {
  flush: () => void;
}

interface NoteEditorProps {
  activeNote: NoteItem | null;
  onBackToListMobile: () => void;
  onSaveNote: (id: string, updates: Partial<NoteItem>) => void;
  onTogglePin: () => void;
  onDeleteNote: () => void;
  onReloadNotes: () => void;
}

export const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(function NoteEditor(
  {
    activeNote,
    onBackToListMobile,
    onSaveNote,
    onTogglePin,
    onDeleteNote,
    onReloadNotes,
  },
  ref
) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('✓ Đã lưu tự động');
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState({ words: 0, chars: 0, readTime: 0 });

  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const currentEditingNoteIdRef = useRef<string>(activeNote?.id || '');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isPinned = Boolean(activeNote?.pinned ?? activeNote?.isPinned);

  // Update word and character stats
  const updateStats = useCallback((text: string) => {
    const clean = (text || '').trim();
    const chars = clean.length;
    const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
    const readTime = Math.max(0, Math.ceil(words / 200));
    setStats({ words, chars, readTime });
  }, []);

  // Flush current editor content immediately to avoid data loss
  const flushCurrentEditor = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const targetId = currentEditingNoteIdRef.current;
    if (!targetId || !editorRef.current) return;

    const currentHtml = editorRef.current.innerHTML || '';
    const currentTitle = titleInputRef.current?.value || '';

    // Synchronously update window.appState to guarantee 0 data loss
    if (typeof window !== 'undefined') {
      const win = window as unknown as { appState?: { notes?: NoteItem[]; focusNotes?: string } };
      if (win.appState?.notes) {
        const found = win.appState.notes.find(n => n.id === targetId);
        if (found) {
          found.content = currentHtml;
          if (currentTitle) found.title = currentTitle;
          found.updatedAt = Date.now();
          win.appState.focusNotes = currentHtml;
        }
      }
    }

    onSaveNote(targetId, {
      content: currentHtml,
      title: currentTitle || 'Chưa đặt tiêu đề',
      updatedAt: Date.now(),
    });
  }, [onSaveNote]);

  // Expose flush handle to parent
  useImperativeHandle(ref, () => ({
    flush: flushCurrentEditor,
  }));

  // Handle switching active note safely without cross-over
  useEffect(() => {
    const prevId = currentEditingNoteIdRef.current;
    const nextId = activeNote?.id || '';

    if (prevId && prevId !== nextId) {
      // 1. Flush previous note changes before switching!
      flushCurrentEditor();
    }

    // 2. Set current editing id
    currentEditingNoteIdRef.current = nextId;

    // 3. Populate new content
    if (editorRef.current && activeNote) {
      editorRef.current.innerHTML = activeNote.content || '';
      updateStats(editorRef.current.textContent || '');
    }

    // 4. Populate new title
    if (titleInputRef.current && activeNote) {
      titleInputRef.current.value = activeNote.title || '';
    }

    setIsSaving(false);
    setSaveStatus('✓ Đã lưu tự động');
  }, [activeNote?.id, flushCurrentEditor, updateStats]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      flushCurrentEditor();
    };
  }, [flushCurrentEditor]);

  // Handle content input typing in contenteditable
  const handleEditorInput = () => {
    const targetId = currentEditingNoteIdRef.current;
    if (!targetId || !editorRef.current) return;

    setIsSaving(true);
    setSaveStatus('Đang lưu...');
    updateStats(editorRef.current.textContent || '');

    const currentHtml = editorRef.current.innerHTML || '';

    // Immediate in-memory sync to window.appState
    if (typeof window !== 'undefined') {
      const win = window as unknown as { appState?: { notes?: NoteItem[]; focusNotes?: string } };
      if (win.appState?.notes) {
        const found = win.appState.notes.find(n => n.id === targetId);
        if (found) {
          found.content = currentHtml;
          found.updatedAt = Date.now();
          win.appState.focusNotes = currentHtml;
        }
      }
    }

    // Debounced state save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      // Guard against saving into wrong note if switched
      if (currentEditingNoteIdRef.current !== targetId) return;

      onSaveNote(targetId, {
        content: currentHtml,
        updatedAt: Date.now(),
      });

      setIsSaving(false);
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setSaveStatus(`✓ Đã lưu lúc ${hh}:${mm}:${ss}`);
    }, 500);
  };

  // Handle title input typing
  const handleTitleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetId = currentEditingNoteIdRef.current;
    if (!targetId) return;
    const newTitle = e.target.value;

    if (typeof window !== 'undefined') {
      const win = window as unknown as { appState?: { notes?: NoteItem[] } };
      if (win.appState?.notes) {
        const found = win.appState.notes.find(n => n.id === targetId);
        if (found) {
          found.title = newTitle || 'Chưa đặt tiêu đề';
          found.updatedAt = Date.now();
        }
      }
    }

    onSaveNote(targetId, {
      title: newTitle || 'Chưa đặt tiêu đề',
      updatedAt: Date.now(),
    });
  };

  // Mobile Back Button Handler (touch screen safe)
  const handleBackToListMobile = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Blur virtual keyboard on mobile
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    flushCurrentEditor();
    onBackToListMobile();
  };

  // Commands
  const executeDocCmd = (cmd: string, val: string | null = null) => {
    editorRef.current?.focus();
    try {
      document.execCommand(cmd, false, val ?? undefined);
    } catch (_) {}
    handleEditorInput();
  };

  const formatHeading = (tag: 'h1' | 'h2' | 'h3' | 'p') => {
    editorRef.current?.focus();
    try {
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        const node = sel.anchorNode.nodeType === 1 ? (sel.anchorNode as HTMLElement) : sel.anchorNode.parentElement;
        const headingParent = node?.closest('h1, h2, h3, p');
        if (headingParent && headingParent !== editorRef.current) {
          if (headingParent.tagName.toLowerCase() === tag) {
            document.execCommand('formatBlock', false, '<p>');
            handleEditorInput();
            return;
          }
        }
      }
      document.execCommand('formatBlock', false, `<${tag}>`);
    } catch (_) {}
    handleEditorInput();
  };

  const toggleHighlight = () => {
    editorRef.current?.focus();
    try {
      const sel = window.getSelection();
      let isHighlighted = false;
      if (sel && sel.anchorNode) {
        let node: HTMLElement | null =
          sel.anchorNode.nodeType === 1 ? (sel.anchorNode as HTMLElement) : sel.anchorNode.parentElement;
        while (node && node !== editorRef.current) {
          if (node.tagName === 'MARK' || node.classList.contains('note-highlight')) {
            isHighlighted = true;
            break;
          }
          node = node.parentElement;
        }
      }
      if (isHighlighted) {
        document.execCommand('removeFormat', false);
      } else {
        document.execCommand('hiliteColor', false, '#fef08a');
      }
    } catch (_) {}
    handleEditorInput();
  };

  const insertChecklist = () => {
    editorRef.current?.focus();
    const todoHtml =
      '<div class="note-todo-item"><input type="checkbox" class="note-checkbox"><span class="note-todo-text">Việc cần làm...</span></div><p></p>';
    document.execCommand('insertHTML', false, todoHtml);
    handleEditorInput();
  };

  const insertTimestamp = () => {
    editorRef.current?.focus();
    const d = new Date();
    const dateStr = `📅 ${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })}: `;
    document.execCommand('insertHTML', false, `<strong>${dateStr}</strong> `);
    handleEditorInput();
  };

  const insertDivider = () => {
    editorRef.current?.focus();
    document.execCommand('insertHorizontalRule', false);
    handleEditorInput();
  };

  const insertCode = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    const text = sel?.toString() || 'code';
    document.execCommand('insertHTML', false, `<code>${text}</code>`);
    handleEditorInput();
  };

  // Convert Markdown in Active Editor (faithful to Ctrl+Shift+M and toolbar button)
  const formatMarkdownInEditor = () => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    const hasSelection = sel && !sel.isCollapsed && sel.toString().trim().length > 0;

    if (hasSelection) {
      const text = sel.toString();
      if (!isMarkdownText(text)) {
        if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
          (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
            'ℹ️ Đoạn văn bản bôi đen không chứa cú pháp Markdown.',
            'info'
          );
        }
        return;
      }
      const isSingleLine = !text.includes('\n') && !/^\s*(?:#{1,6}|[-*+]|\d+\.|>|---)\s+/m.test(text);
      const converted = isSingleLine ? parseInlineMarkdown(text) : convertMarkdownToEditorHtml(text);
      document.execCommand('insertHTML', false, converted);
      handleEditorInput();
      if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
        (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
          '✨ Đã định dạng đoạn Markdown đã chọn!',
          'success'
        );
      }
      return;
    }

    const currentText = editorRef.current.innerText || editorRef.current.textContent || '';
    if (!currentText.trim()) {
      if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
        (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
          'ℹ️ Ghi chú đang trống, hãy nhập nội dung trước.',
          'info'
        );
      }
      return;
    }

    if (!isMarkdownText(currentText)) {
      if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
        (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
          'ℹ️ Ghi chú hiện tại không phát hiện cú pháp Markdown.',
          'info'
        );
      }
      return;
    }

    const converted = convertMarkdownToEditorHtml(currentText);
    if (converted) {
      editorRef.current.innerHTML = converted;
      handleEditorInput();
      if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
        (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
          '✨ Đã tự động nhận diện và chuyển đổi toàn bộ Markdown thành định dạng!',
          'success'
        );
      }
    }
  };

  // Checkbox toggle inside contenteditable
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target && target.classList.contains('note-checkbox')) {
      const checkbox = target as HTMLInputElement;
      const item = checkbox.closest('.note-todo-item');
      if (item) {
        if (checkbox.checked) {
          item.classList.add('is-done');
          checkbox.setAttribute('checked', 'checked');
        } else {
          item.classList.remove('is-done');
          checkbox.removeAttribute('checked');
        }
        handleEditorInput();
      }
    }
  };

  // Paste handler: Auto recognize Markdown
  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (text && isMarkdownText(text)) {
      e.preventDefault();
      const html = convertMarkdownToEditorHtml(text);
      document.execCommand('insertHTML', false, html);
      handleEditorInput();
      if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
        (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
          '✨ Đã tự động nhận diện và chuyển đổi cú pháp Markdown!',
          'success'
        );
      }
    }
  };

  // Copy Note Text
  const handleCopyNote = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || editorRef.current.textContent || '';
    navigator.clipboard.writeText(text);
    if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
      (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
        '📋 Đã sao chép toàn bộ văn bản!',
        'success'
      );
    }
  };

  // Export Note Markdown (.md)
  const handleExportMarkdown = () => {
    if (!activeNote) return;
    const html = editorRef.current?.innerHTML || activeNote.content || '';
    const md = convertHtmlToMarkdown(html);
    const title = activeNote.title || 'ghi-chu';
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear Content
  const handleClearContent = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '<p></p>';
      handleEditorInput();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Expose global window helper functions for backwards compatibility
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as {
      formatMarkdownInActiveEditor?: () => void;
      copyActiveNote?: () => void;
      exportActiveNote?: (fmt?: string) => void;
      clearActiveNoteContent?: () => void;
      toggleNoteFullscreen?: () => void;
      showNotesListMobile?: () => void;
    };
    win.formatMarkdownInActiveEditor = formatMarkdownInEditor;
    win.copyActiveNote = handleCopyNote;
    win.exportActiveNote = handleExportMarkdown;
    win.clearActiveNoteContent = handleClearContent;
    win.toggleNoteFullscreen = toggleFullscreen;
    win.showNotesListMobile = () => handleBackToListMobile();
  }, [
    formatMarkdownInEditor,
    handleCopyNote,
    handleExportMarkdown,
    handleClearContent,
    handleBackToListMobile,
  ]);

  return (
    <div
      id="active-note-card"
      className={`rpg-panel rounded-2xl sm:rounded-3xl border border-amber-500/30 overflow-hidden shadow-xl flex flex-col bg-white dark:bg-slate-900 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : ''
      }`}
    >
      {/* 1. Note Header: Title, Custom Topic (hidden), Pin, Tools */}
      <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Mobile Back Button with Touch Events */}
          <button
            type="button"
            onClick={handleBackToListMobile}
            onTouchEnd={handleBackToListMobile}
            onPointerDown={e => e.preventDefault()}
            className="lg:hidden px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 transition shadow-2xs"
            title="Quay lại danh sách"
          >
            <span className="material-symbols-outlined text-[17px] leading-none">arrow_back</span>
            <span>Danh Sách</span>
          </button>

          {/* Active Note Title Input */}
          <div className="flex-1 min-w-0">
            <input
              ref={titleInputRef}
              id="active-note-title"
              type="text"
              placeholder="Tiêu đề ghi chú..."
              defaultValue={activeNote?.title || ''}
              onChange={handleTitleInput}
              className="w-full text-base sm:text-lg font-bold bg-transparent border-0 focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 truncate px-1"
            />
          </div>
        </div>

        {/* Topic Selector / Creator & Tools (Ẩn ô nhập chủ đề/tag theo yêu cầu chỉ giữ title) */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 flex-wrap">
          <div className="hidden">
            <input
              id="active-note-topic-input"
              list="notes-topics-datalist"
              type="text"
              placeholder="Tự đặt chủ đề..."
              defaultValue={activeNote?.topic || ''}
            />
            <datalist id="notes-topics-datalist"></datalist>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Reload Note */}
            <button
              type="button"
              onClick={onReloadNotes}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition cursor-pointer shrink-0"
              title="Làm mới & đồng bộ ghi chú"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">refresh</span>
            </button>
            {/* Pin Button */}
            <button
              id="btn-pin-note"
              type="button"
              onClick={onTogglePin}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition cursor-pointer shrink-0"
              title="Ghim ghi chú lên đầu"
            >
              <span
                id="pin-icon"
                className={`material-symbols-outlined text-[17px] sm:text-[18px] leading-none ${
                  isPinned ? 'text-amber-500' : ''
                }`}
              >
                {isPinned ? 'keep' : 'push_pin'}
              </span>
            </button>
            {/* Copy Note */}
            <button
              type="button"
              onClick={handleCopyNote}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
              title="Sao chép toàn bộ văn bản"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">content_copy</span>
            </button>
            {/* Export Markdown / Text */}
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
              title="Tải về file Markdown (.md)"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">download</span>
            </button>
            {/* Fullscreen Focus Mode */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition cursor-pointer shrink-0"
              title="Chế độ tập trung toàn màn hình"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">fullscreen</span>
            </button>
            {/* Delete Note */}
            <button
              type="button"
              onClick={onDeleteNote}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
              title="Xóa ghi chú này"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Rich Text Formatting Toolbar */}
      <div
        id="focus-notes-toolbar"
        className="notes-toolbar horizontal-scroll-drag px-2 sm:px-4 py-1.5 sm:py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center gap-1 overflow-x-auto no-scrollbar flex-nowrap shrink-0 select-none"
      >
        {/* Paragraph / Headings */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => formatHeading('p')}
          className="px-2 h-7 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer font-bold text-xs shrink-0"
          title="Đoạn văn thường (P)"
        >
          P
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => formatHeading('h1')}
          className="px-2 h-7 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer font-extrabold text-xs shrink-0"
          title="Tiêu đề lớn (H1)"
        >
          H1
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => formatHeading('h2')}
          className="px-2 h-7 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer font-bold text-xs shrink-0"
          title="Tiêu đề vừa (H2)"
        >
          H2
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => formatHeading('h3')}
          className="px-2 h-7 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer font-semibold text-xs shrink-0"
          title="Tiêu đề nhỏ (H3)"
        >
          H3
        </button>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0"></div>

        {/* Styles: Bold, Italic, Underline, Strikethrough, Code */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('bold')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="In đậm (Ctrl+B)"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">format_bold</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('italic')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="In nghiêng (Ctrl+I)"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">format_italic</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('underline')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Gạch chân (Ctrl+U)"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">format_underlined</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('strikeThrough')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Gạch ngang"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">strikethrough_s</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={insertCode}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer font-mono text-xs font-bold shrink-0"
          title="Code inline"
        >
          &lt;/&gt;
        </button>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0"></div>

        {/* Lists & Checklists */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={insertChecklist}
          className="px-2 h-7 sm:h-8 rounded-lg flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer text-xs font-bold shrink-0"
          title="Danh sách công việc (To-Do Checklist)"
        >
          <span className="material-symbols-outlined text-[17px] leading-none">checklist</span>
          <span className="inline">To-Do</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('insertUnorderedList')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Gạch đầu dòng"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">format_list_bulleted</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('insertOrderedList')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Danh sách số"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">format_list_numbered</span>
        </button>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0"></div>

        {/* Divider & Timestamp */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={insertDivider}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Đường kẻ ngang phân cách"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">horizontal_rule</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={insertTimestamp}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Chèn ngày giờ hiện tại"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">today</span>
        </button>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0"></div>

        {/* Highlight & Clear */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={toggleHighlight}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition cursor-pointer shrink-0"
          title="Đánh dấu màu vàng"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">ink_highlighter</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('removeFormat')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Xóa định dạng"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">format_clear</span>
        </button>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0"></div>

        {/* Undo / Redo */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('undo')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Hoàn tác (Ctrl+Z)"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">undo</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('redo')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Làm lại (Ctrl+Y)"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">redo</span>
        </button>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0"></div>

        {/* Markdown Auto-Formatter */}
        <button
          id="btn-format-markdown"
          type="button"
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.preventDefault()}
          onClick={formatMarkdownInEditor}
          className="px-2.5 h-7 sm:h-8 rounded-lg flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition cursor-pointer text-xs font-bold shrink-0"
          title="Nhận diện & chuyển đổi Markdown thành định dạng đẹp (Ctrl+Shift+M)"
        >
          <span className="material-symbols-outlined text-[17px] leading-none">auto_awesome</span>
          <span className="inline">Markdown</span>
        </button>
      </div>

      {/* 3. Contenteditable Editor Area */}
      <div className="flex-1 min-h-[350px] max-h-[calc(100vh-280px)] lg:max-h-[62vh] overflow-y-auto custom-scrollbar p-3.5 sm:p-6 bg-white dark:bg-slate-900 select-text">
        <div
          ref={editorRef}
          id="focus-notes-tab-editor"
          contentEditable="true"
          suppressContentEditableWarning
          spellCheck="false"
          onInput={handleEditorInput}
          onClick={handleEditorClick}
          onPaste={handlePaste}
          className="notes-editor w-full min-h-[300px] text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100 focus:outline-none select-text"
          data-placeholder="Bắt đầu gõ ghi chú, checklist hoặc nội dung chủ đề của bạn tại đây... (Nhấn Ctrl+S để lưu nhanh)"
        />
      </div>

      {/* 4. Footer Stats & Save Status */}
      <div className="p-2.5 sm:p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono flex-wrap">
          <span id="tab-notes-word-count">{stats.words} từ</span>
          <span>•</span>
          <span id="tab-notes-char-count">{stats.chars} ký tự</span>
          <span className="hidden sm:inline">•</span>
          <span id="tab-notes-read-time" className="hidden sm:inline">
            ~{stats.readTime} phút đọc
          </span>
          <span>•</span>
          <span
            id="tab-notes-save-status"
            className={`inline-flex items-center gap-1 font-medium font-sans ${
              isSaving
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <span
              className={`save-status-dot w-1.5 h-1.5 rounded-full inline-block mr-1 ${
                isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span>{saveStatus}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleCopyNote}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
            title="Sao chép toàn bộ văn bản vào clipboard"
          >
            <span className="material-symbols-outlined text-[16px] leading-none">content_copy</span>
            <span>Sao Chép</span>
          </button>
          <button
            type="button"
            onClick={handleClearContent}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
            title="Xóa toàn bộ nội dung trong trang ghi chú này"
          >
            <span className="material-symbols-outlined text-[16px] leading-none">delete_sweep</span>
            <span>Xóa Trắng</span>
          </button>
        </div>
      </div>
    </div>
  );
});
