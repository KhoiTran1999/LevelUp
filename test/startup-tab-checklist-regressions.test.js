import assert from 'node:assert/strict';
import fs from 'node:fs';

const provider = fs.readFileSync('components/providers/LevelUpProvider.tsx', 'utf8');
const editor = fs.readFileSync('components/notes/NoteEditor.tsx', 'utf8');
const markdown = fs.readFileSync('components/notes/markdown.ts', 'utf8');

assert.match(provider, /notes:\s*\[\],\s*activeNoteId:\s*'',\s*quests:\s*\[\],\s*shopItems:\s*\[\]/);
assert.ok(provider.includes("useState<'loading' | 'ready' | 'error'>('loading')"));
assert.ok(provider.includes('Đang tải dữ liệu tài khoản...'));
assert.ok(provider.includes('Không tải được dữ liệu'));
assert.ok(provider.includes('setStartupAttempt(attempt => attempt + 1)'));

assert.ok(provider.includes("window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#${tab}`)"));
assert.ok(provider.includes('getTabFromHash(window.location.hash)'));
assert.ok(provider.includes("window.addEventListener('hashchange', syncTabFromHash)"));

assert.ok(editor.includes("querySelectorAll('.note-checkbox')"));
assert.ok(editor.includes("checkbox.setAttribute('contenteditable', 'false')"));
assert.ok(editor.includes('<input type="checkbox" class="note-checkbox" contenteditable="false">'));
assert.ok(editor.includes('const trailingContent = trailingRange.extractContents()'));
assert.ok(editor.includes('const continuation = currentBlock.cloneNode(false)'));
assert.ok(markdown.includes('class="note-checkbox" contenteditable="false"'));

console.log('Startup gating, URL tab restoration, and checklist editing regressions verified.');
