'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { NoteItem } from '@/types/levelup';
import {
  isMarkdownText,
  parseInlineMarkdown,
  convertMarkdownToEditorHtml,
  convertHtmlToMarkdown,
} from './markdown';
import { Icon } from '@/components/ui/Icon';

interface NoteEditorProps {
  activeNote: NoteItem | null;
  onUpdateTitle: (title: string) => void;
  onUpdateTopic: (topic: string) => void;
  onUpdateContent: (content: string) => void;
  onTogglePin: () => void;
  onDeleteNote: () => void;
  onBackToListMobile: () => void;
  allTopics: string[];
  onReloadNotes: () => void;
}

type EditorViewMode = 'edit' | 'preview' | 'split';

export function NoteEditor({
  activeNote,
  onUpdateTitle,
  onUpdateTopic,
  onUpdateContent,
  onTogglePin,
  onDeleteNote,
  onBackToListMobile,
  allTopics,
  onReloadNotes,
}: NoteEditorProps) {
  const [viewMode, setViewMode] = useState<EditorViewMode>('edit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('✓ Đã lưu tự động');
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState({ words: 0, chars: 0, readTime: 0 });

  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isPinned = Boolean(activeNote?.pinned ?? activeNote?.isPinned);

  // Sync content into editor when active note changes
  useEffect(() => {
    if (!activeNote || !editorRef.current) return;
    if (editorRef.current.innerHTML !== (activeNote.content || '')) {
      editorRef.current.innerHTML = activeNote.content || '';
      updateStats(editorRef.current.textContent || '');
    }
  }, [activeNote?.id]);

  // Update word and character stats
  const updateStats = useCallback((text: string) => {
    const clean = (text || '').trim();
    const chars = clean.length;
    const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
    const readTime = Math.max(1, Math.ceil(words / 200));
    setStats({ words, chars, readTime });
  }, []);

  // Format document commands
  const executeDocCmd = (cmd: string, val: string | null = null) => {
    if (viewMode === 'preview') setViewMode('edit');
    editorRef.current?.focus();
    try {
      document.execCommand(cmd, false, val ?? undefined);
    } catch (_) {}
    handleContentInput();
  };

  const formatHeading = (tag: 'h1' | 'h2' | 'h3' | 'p') => {
    if (viewMode === 'preview') setViewMode('edit');
    editorRef.current?.focus();
    try {
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        const node = sel.anchorNode.nodeType === 1 ? (sel.anchorNode as HTMLElement) : sel.anchorNode.parentElement;
        const headingParent = node?.closest('h1, h2, h3, p');
        if (headingParent && headingParent !== editorRef.current) {
          if (headingParent.tagName.toLowerCase() === tag) {
            document.execCommand('formatBlock', false, '<p>');
            handleContentInput();
            return;
          }
        }
      }
      document.execCommand('formatBlock', false, `<${tag}>`);
    } catch (_) {}
    handleContentInput();
  };

  const toggleHighlight = () => {
    if (viewMode === 'preview') setViewMode('edit');
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
    handleContentInput();
  };

  const insertChecklist = () => {
    if (viewMode === 'preview') setViewMode('edit');
    editorRef.current?.focus();
    const todoHtml =
      '<div class="note-todo-item"><input type="checkbox" class="note-checkbox"><span class="note-todo-text">Việc cần làm...</span></div><p></p>';
    document.execCommand('insertHTML', false, todoHtml);
    handleContentInput();
  };

  const insertTimestamp = () => {
    if (viewMode === 'preview') setViewMode('edit');
    editorRef.current?.focus();
    const d = new Date();
    const dateStr = `📅 ${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })}: `;
    document.execCommand('insertHTML', false, `<strong>${dateStr}</strong> `);
    handleContentInput();
  };

  const insertDivider = () => {
    if (viewMode === 'preview') setViewMode('edit');
    editorRef.current?.focus();
    document.execCommand('insertHorizontalRule', false);
    handleContentInput();
  };

  const insertCode = () => {
    if (viewMode === 'preview') setViewMode('edit');
    editorRef.current?.focus();
    const sel = window.getSelection();
    const text = sel?.toString() || 'code';
    document.execCommand('insertHTML', false, `<code>${text}</code>`);
    handleContentInput();
  };

  // Convert markdown in editor
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
      handleContentInput();
      return;
    }

    const currentText = editorRef.current.innerText || editorRef.current.textContent || '';
    if (!currentText.trim()) return;

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
      handleContentInput();
      if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
        (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
          '✨ Đã tự động nhận diện và chuyển đổi cú pháp Markdown!',
          'success'
        );
      }
    }
  };

  // Content input change handler with debounce save
  const handleContentInput = () => {
    if (!editorRef.current || !activeNote) return;
    setIsSaving(true);
    setSaveStatus('Đang lưu...');
    const currentHtml = editorRef.current.innerHTML || '';
    updateStats(editorRef.current.textContent || '');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      onUpdateContent(currentHtml);
      setIsSaving(false);
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setSaveStatus(`✓ Đã lưu lúc ${hh}:${mm}:${ss}`);
    }, 500);
  };

  // Handle interactive checkboxes inside contenteditable or preview
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target && target.classList.contains('note-checkbox')) {
      const checkbox = target as HTMLInputElement;
      const item = checkbox.closest('.note-todo-item');
      if (item) {
        if (checkbox.checked) {
          item.classList.add('is-done');
        } else {
          item.classList.remove('is-done');
        }
        handleContentInput();
      }
    }
  };

  // Paste handler: Auto recognize Markdown on paste
  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (text && isMarkdownText(text)) {
      e.preventDefault();
      const html = convertMarkdownToEditorHtml(text);
      document.execCommand('insertHTML', false, html);
      handleContentInput();
      if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
        (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
          '✨ Đã tự động nhận diện và chuyển đổi cú pháp Markdown!',
          'success'
        );
      }
    }
  };

  // Actions
  const handleCopyNote = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || editorRef.current.textContent || '';
    navigator.clipboard.writeText(text);
    if (typeof window !== 'undefined' && typeof (window as unknown as { showToast?: (m: string, t: string) => void }).showToast === 'function') {
      (window as unknown as { showToast: (m: string, t: string) => void }).showToast(
        '📋 Đã sao chép toàn bộ văn bản vào clipboard!',
        'success'
      );
    }
  };

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

  const handleClearContent = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '<p></p>';
      handleContentInput();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Render live markdown content
  const previewHtml = activeNote?.content
    ? isMarkdownText(activeNote.content)
      ? convertMarkdownToEditorHtml(activeNote.content)
      : activeNote.content
    : '<p class="text-slate-400 italic">Ghi chú đang trống...</p>';

  if (!activeNote) {
    return (
      <div className="rpg-panel rounded-2xl sm:rounded-3xl border border-amber-500/30 p-12 text-center text-slate-400 bg-white dark:bg-slate-900">
        <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 dark:text-slate-600">
          description
        </span>
        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Chưa chọn ghi chú nào</h3>
        <p className="text-xs text-slate-500 mt-1">Hãy chọn một ghi chú từ danh sách hoặc tạo ghi chú mới.</p>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      id="active-note-card"
      className={`rpg-panel rounded-2xl sm:rounded-3xl border border-amber-500/30 overflow-hidden shadow-xl flex flex-col bg-white dark:bg-slate-900 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : ''
      }`}
    >
      {/* 1. Note Header: Title, Mobile Back, Topic, Tools */}
      <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Mobile Back Button */}
          <button
            type="button"
            onClick={onBackToListMobile}
            className="lg:hidden px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 transition shadow-2xs"
            title="Quay lại danh sách"
          >
            <span className="material-symbols-outlined text-[17px] leading-none">arrow_back</span>
            <span>Danh Sách</span>
          </button>

          {/* Note Title Input */}
          <div className="flex-1 min-w-0">
            <input
              ref={titleInputRef}
              id="active-note-title"
              type="text"
              placeholder="Tiêu đề ghi chú..."
              value={activeNote.title || ''}
              onChange={e => onUpdateTitle(e.target.value)}
              className="w-full text-base sm:text-lg font-bold bg-transparent border-0 focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 truncate px-1"
            />
          </div>
        </div>

        {/* Topic Selector & Tools */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 flex-wrap">
          {/* Topic Input with Datalist */}
          <div className="relative">
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700 text-xs">
              <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">#</span>
              <input
                id="active-note-topic-input"
                list="notes-topics-datalist"
                type="text"
                placeholder="Tự đặt chủ đề..."
                value={activeNote.topic || ''}
                onChange={e => onUpdateTopic(e.target.value)}
                className="w-24 sm:w-28 text-xs bg-transparent border-0 focus:outline-none text-slate-700 dark:text-slate-200"
              />
              <datalist id="notes-topics-datalist">
                {allTopics.map(t => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Live Preview Switcher */}
            <div
              className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs mr-0.5"
              role="group"
            >
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                  viewMode === 'edit'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Chế độ soạn thảo"
              >
                <Icon name="edit" className="text-[14px] leading-none" />
                <span className="hidden sm:inline">Soạn Thảo</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Chế độ xem trước Markdown trực tiếp"
              >
                <Icon name="visibility" className="text-[14px] leading-none" />
                <span className="hidden sm:inline">Xem Trước</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`hidden lg:flex px-2 py-1 rounded-lg text-xs font-semibold items-center gap-1 cursor-pointer transition ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Chia đôi màn hình soạn thảo & xem trước"
              >
                <Icon name="vertical_split" className="text-[14px] leading-none" />
                <span className="hidden xl:inline">Split</span>
              </button>
            </div>

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
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition cursor-pointer shrink-0 ${
                isPinned
                  ? 'text-amber-500 bg-amber-500/15'
                  : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10'
              }`}
              title={isPinned ? 'Bỏ ghim ghi chú' : 'Ghim ghi chú lên đầu'}
            >
              <span id="pin-icon" className={`material-symbols-outlined text-[17px] sm:text-[18px] leading-none ${isPinned ? 'text-amber-500' : ''}`}>
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

            {/* Export Markdown */}
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
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
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

      {/* 2. Rich Text & Markdown Toolbar */}
      <div
        id="focus-notes-toolbar"
        className="notes-toolbar horizontal-scroll-drag px-2 sm:px-4 py-1.5 sm:py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center gap-1 overflow-x-auto no-scrollbar flex-nowrap shrink-0 select-none"
      >
        {/* Headings */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => formatHeading('p')}
          className="px-2 h-7 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer font-bold text-xs shrink-0"
          title="Đoạn văn thường (P)"
        >
          P
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => formatHeading('h1')}
          className="px-2 h-7 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer font-extrabold text-xs shrink-0"
          title="Tiêu đề lớn (H1)"
        >
          H1
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => formatHeading('h2')}
          className="px-2 h-7 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer font-bold text-xs shrink-0"
          title="Tiêu đề vừa (H2)"
        >
          H2
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => formatHeading('h3')}
          className="px-2 h-7 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer font-semibold text-xs shrink-0"
          title="Tiêu đề nhỏ (H3)"
        >
          H3
        </button>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* Formats: Bold, Italic, Underline, Strikethrough, Code */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('bold')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="In đậm (Ctrl+B)"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">format_bold</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('italic')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="In nghiêng (Ctrl+I)"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">format_italic</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('underline')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Gạch chân (Ctrl+U)"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">format_underlined</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('strikeThrough')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Gạch ngang"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">strikethrough_s</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={insertCode}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer font-mono text-xs font-bold shrink-0"
          title="Code inline"
        >
          &lt;/&gt;
        </button>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* Lists & Checklists */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
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
          onClick={() => executeDocCmd('insertUnorderedList')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Gạch đầu dòng"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">format_list_bulleted</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('insertOrderedList')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Danh sách số"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">format_list_numbered</span>
        </button>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* Divider, Timestamp, Highlight */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={insertDivider}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Đường kẻ ngang phân cách"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">horizontal_rule</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={insertTimestamp}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Chèn ngày giờ hiện tại"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">today</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleHighlight}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition cursor-pointer shrink-0"
          title="Đánh dấu màu vàng"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">ink_highlighter</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('removeFormat')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Xóa định dạng"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">format_clear</span>
        </button>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* Undo / Redo */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('undo')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Hoàn tác (Ctrl+Z)"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">undo</span>
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => executeDocCmd('redo')}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
          title="Làm lại (Ctrl+Y)"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">redo</span>
        </button>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* Markdown Auto-Formatter */}
        <button
          id="btn-format-markdown"
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={formatMarkdownInEditor}
          className="px-2.5 h-7 sm:h-8 rounded-lg flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition cursor-pointer text-xs font-bold shrink-0"
          title="Nhận diện & chuyển đổi Markdown thành định dạng đẹp (Ctrl+Shift+M)"
        >
          <span className="material-symbols-outlined text-[17px] leading-none">auto_awesome</span>
          <span className="inline">Markdown</span>
        </button>
      </div>

      {/* 3. Editor Body & Live Preview */}
      <div
        className={`flex-1 min-h-[350px] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 select-text ${
          isFullscreen ? 'h-[calc(100vh-140px)]' : 'max-h-[calc(100vh-280px)] lg:max-h-[62vh]'
        }`}
      >
        {viewMode === 'edit' && (
          <div className="p-3.5 sm:p-6">
            <div
              ref={editorRef}
              id="focus-notes-tab-editor"
              contentEditable="true"
              suppressContentEditableWarning
              spellCheck="false"
              onInput={handleContentInput}
              onClick={handleEditorClick}
              onPaste={handlePaste}
              className="notes-editor w-full min-h-[300px] text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100 focus:outline-none select-text"
              data-placeholder="Bắt đầu gõ ghi chú, checklist hoặc nội dung chủ đề của bạn tại đây... (Nhấn Ctrl+S để lưu nhanh)"
            />
          </div>
        )}

        {viewMode === 'preview' && (
          <div className="p-3.5 sm:p-6">
            <div className="mb-3 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span>Đang ở chế độ Xem Trước Markdown Trực Tiếp (Live Preview)</span>
            </div>
            <div
              className="notes-editor w-full min-h-[300px] text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100 select-text"
              onClick={handleEditorClick}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}

        {viewMode === 'split' && (
          <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 min-h-[350px]">
            {/* Left: Edit */}
            <div className="p-3.5 sm:p-6 overflow-y-auto custom-scrollbar">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Soạn Thảo</div>
              <div
                ref={editorRef}
                id="focus-notes-tab-editor"
                contentEditable="true"
                suppressContentEditableWarning
                spellCheck="false"
                onInput={handleContentInput}
                onClick={handleEditorClick}
                onPaste={handlePaste}
                className="notes-editor w-full min-h-[300px] text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100 focus:outline-none select-text"
                data-placeholder="Bắt đầu gõ ghi chú..."
              />
            </div>
            {/* Right: Live Preview */}
            <div className="p-3.5 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-50/40 dark:bg-slate-900/40">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 mb-2">Xem Trước Live</div>
              <div
                className="notes-editor w-full min-h-[300px] text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100 select-text"
                onClick={handleEditorClick}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        )}
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
}
