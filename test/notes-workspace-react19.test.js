import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Giai đoạn 3.3 — Sổ Tay Ghi Chú RPG (React 19 Notes Workspace)', () => {
  const pagePath = path.join(rootDir, 'app/page.tsx');
  const workspacePath = path.join(rootDir, 'components/notes/NotesWorkspace.tsx');
  const editorPath = path.join(rootDir, 'components/notes/NoteEditor.tsx');
  const sidebarPath = path.join(rootDir, 'components/notes/NoteSidebar.tsx');
  const chipsPath = path.join(rootDir, 'components/notes/TopicFilterChips.tsx');
  const indexPath = path.join(rootDir, 'components/notes/index.ts');
  const mdPath = path.join(rootDir, 'components/notes/markdown.ts');
  const providerPath = path.join(rootDir, 'components/providers/LevelUpProvider.tsx');

  const pageContent = fs.readFileSync(pagePath, 'utf8');
  const workspaceContent = fs.readFileSync(workspacePath, 'utf8');
  const editorContent = fs.readFileSync(editorPath, 'utf8');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  const chipsContent = fs.readFileSync(chipsPath, 'utf8');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  const providerContent = fs.readFileSync(providerPath, 'utf8');

  it('1. Đảm bảo cấu trúc 4 Component React 19 và module index được tạo đầy đủ', () => {
    assert.ok(fs.existsSync(workspacePath), 'Phải có components/notes/NotesWorkspace.tsx');
    assert.ok(fs.existsSync(editorPath), 'Phải có components/notes/NoteEditor.tsx');
    assert.ok(fs.existsSync(sidebarPath), 'Phải có components/notes/NoteSidebar.tsx');
    assert.ok(fs.existsSync(chipsPath), 'Phải có components/notes/TopicFilterChips.tsx');
    assert.ok(fs.existsSync(indexPath), 'Phải có components/notes/index.ts');
    assert.ok(fs.existsSync(mdPath), 'Phải có components/notes/markdown.ts');

    assert.ok(indexContent.includes('NotesWorkspace'), 'index.ts phải export NotesWorkspace');
    assert.ok(indexContent.includes('NoteEditor'), 'index.ts phải export NoteEditor');
    assert.ok(indexContent.includes('NoteSidebar'), 'index.ts phải export NoteSidebar');
    assert.ok(indexContent.includes('TopicFilterChips'), 'index.ts phải export TopicFilterChips');
  });

  it('2. Đảm bảo app/page.tsx tích hợp NotesWorkspace và chuyển legacy bridge sang tab-leaderboard', () => {
    assert.ok(pageContent.includes("import { NotesWorkspace } from '@/components/notes/NotesWorkspace'"), 'page.tsx phải import NotesWorkspace');
    assert.ok(pageContent.includes('<section id="tab-notes" className="tab-pane hidden">'), 'page.tsx phải có section tab-notes');
    assert.ok(pageContent.includes('<NotesWorkspace />'), 'page.tsx phải render NotesWorkspace');
    assert.ok(pageContent.includes("rawHtml.indexOf('<section id=\"tab-leaderboard\"')"), 'legacyTabsContent phải bắt đầu từ tab-leaderboard');
  });

  it('3. Đảm bảo LevelUpProvider quản lý state và các action ghi chú (create, update, delete, togglePin)', () => {
    assert.ok(providerContent.includes('optimisticNotes'), 'LevelUpProvider phải có optimisticNotes');
    assert.ok(providerContent.includes('activeNoteId'), 'LevelUpProvider phải có activeNoteId');
    assert.ok(providerContent.includes('createNote'), 'LevelUpProvider phải có hàm createNote');
    assert.ok(providerContent.includes('updateNote'), 'LevelUpProvider phải có hàm updateNote');
    assert.ok(providerContent.includes('deleteNote'), 'LevelUpProvider phải có hàm deleteNote');
    assert.ok(providerContent.includes('togglePinNote'), 'LevelUpProvider phải có hàm togglePinNote');
    assert.ok(providerContent.includes('setActiveNoteId'), 'LevelUpProvider phải có hàm setActiveNoteId');
    assert.ok(providerContent.includes('levelup:notes-updated'), 'LevelUpProvider phải lắng nghe levelup:notes-updated');
  });

  it('4. Đảm bảo NotesWorkspace & NoteSidebar hỗ trợ banner, tìm kiếm tức thời, và danh sách ghi chú', () => {
    assert.ok(workspaceContent.includes('id="notes-header-banner"'), 'NotesWorkspace phải có #notes-header-banner ở đầu tab');
    assert.ok(workspaceContent.includes('id="notes-search-input"'), 'NotesWorkspace phải có #notes-search-input');
    assert.ok(workspaceContent.includes('id="notes-total-badge"'), 'NotesWorkspace phải có #notes-total-badge');
    assert.ok(workspaceContent.includes('id="btn-reload-notes"'), 'NotesWorkspace phải có #btn-reload-notes');
    assert.ok(workspaceContent.includes('id="btn-create-new-note"'), 'NotesWorkspace phải có #btn-create-new-note');
    assert.ok(workspaceContent.includes('id="notes-sidebar-column"'), 'NotesWorkspace phải có #notes-sidebar-column');
    assert.ok(sidebarContent.includes('id="notes-card-list"'), 'NoteSidebar phải có #notes-card-list');
    assert.ok(sidebarContent.includes('note-card-title'), 'NoteSidebar phải có class note-card-title');
    assert.ok(sidebarContent.includes('note-card-time'), 'NoteSidebar phải có class note-card-time');
    assert.ok(sidebarContent.includes('note-card-preview'), 'NoteSidebar phải có class note-card-preview');
    assert.ok(sidebarContent.includes('push_pin'), 'NoteSidebar phải có icon push_pin');
  });

  it('5. Đảm bảo NoteEditor hỗ trợ thanh công cụ 1 hàng, Markdown Auto-Format, To-Do Checklist, Auto-Save', () => {
    assert.ok(editorContent.includes('id="active-note-card"'), 'NoteEditor phải có #active-note-card');
    assert.ok(editorContent.includes('id="active-note-title"'), 'NoteEditor phải có #active-note-title');
    assert.ok(editorContent.includes('id="active-note-topic-input"'), 'NoteEditor phải có #active-note-topic-input');
    assert.ok(editorContent.includes('id="notes-topics-datalist"'), 'NoteEditor phải có #notes-topics-datalist');
    assert.ok(editorContent.includes('id="btn-pin-note"'), 'NoteEditor phải có #btn-pin-note');
    assert.ok(editorContent.includes('id="pin-icon"'), 'NoteEditor phải có #pin-icon');
    assert.ok(editorContent.includes('id="focus-notes-toolbar"'), 'NoteEditor phải có #focus-notes-toolbar');
    assert.ok(editorContent.includes('id="btn-format-markdown"'), 'NoteEditor phải có #btn-format-markdown');
    assert.ok(editorContent.includes('id="focus-notes-tab-editor"'), 'NoteEditor phải có #focus-notes-tab-editor');
    assert.ok(editorContent.includes('id="tab-notes-word-count"'), 'NoteEditor phải có #tab-notes-word-count');
    assert.ok(editorContent.includes('id="tab-notes-char-count"'), 'NoteEditor phải có #tab-notes-char-count');
    assert.ok(editorContent.includes('id="tab-notes-read-time"'), 'NoteEditor phải có #tab-notes-read-time');
    assert.ok(editorContent.includes('id="tab-notes-save-status"'), 'NoteEditor phải có #tab-notes-save-status');
    assert.ok(editorContent.includes('save-status-dot'), 'NoteEditor phải có class save-status-dot');
    assert.ok(editorContent.includes('note-checkbox'), 'NoteEditor phải hỗ trợ note-checkbox checklist');
  });

  it('6. Đảm bảo TopicFilterChips duy trì container #notes-topics-bar tương thích ngược', () => {
    assert.ok(chipsContent.includes('id="notes-topics-bar"'), 'TopicFilterChips phải có id #notes-topics-bar');
  });

  it('7. Thuật toán Markdown Parser trong markdown.ts hoạt động chính xác', async () => {
    const mdModule = await import('../components/notes/markdown.ts');
    assert.strictEqual(typeof mdModule.isMarkdownText, 'function');
    assert.strictEqual(typeof mdModule.convertMarkdownToEditorHtml, 'function');
    assert.strictEqual(typeof mdModule.parseInlineMarkdown, 'function');

    // Test Markdown detection
    assert.strictEqual(mdModule.isMarkdownText('Chữ **in đậm** ở đây'), true);
    assert.strictEqual(mdModule.isMarkdownText('# Tiêu Đề Lớn'), true);
    assert.strictEqual(mdModule.isMarkdownText('- [ ] Việc cần làm'), true);
    assert.strictEqual(mdModule.isMarkdownText('Văn bản thường không có cú pháp'), false);

    // Test Conversion
    const sample = `
# Kế Hoạch
- [ ] Nhiệm vụ 1
- [x] Nhiệm vụ đã xong
**Quan trọng**: Nội dung chi tiết
> Trích dẫn bài học
    `.trim();

    const html = mdModule.convertMarkdownToEditorHtml(sample);
    assert.ok(html.includes('<h1>Kế Hoạch</h1>'), 'Phải parse H1');
    assert.ok(html.includes('class="note-todo-item"'), 'Phải có todo item');
    assert.ok(html.includes('class="note-todo-item is-done"'), 'Phải có todo is-done');
    assert.ok(html.includes('<strong>Quan trọng</strong>'), 'Phải parse bold');
    assert.ok(html.includes('<blockquote>Trích dẫn bài học</blockquote>'), 'Phải parse blockquote');
  });
});
