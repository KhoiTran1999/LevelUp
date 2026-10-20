import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const page = read('app/page.tsx');
const html = read('public/index.html');
const detail = read('components/quests/QuestDetailModal.tsx');
const runtime = read('src/js/14-render.js');
const bundle = read('public/app.js');

assert.ok(page.includes('<QuestDetailModal />'), 'Next page must mount React quest detail dialog.');
assert.ok(detail.includes('id="modal-quest-detail"'), 'React must own quest detail dialog markup.');
assert.ok(detail.includes('levelup:open-quest-detail'), 'React dialog must receive legacy open requests.');
assert.match(detail, /questId\s*\?\s*quests\.find\(item => item\.id === questId\)\s*\|\|\s*fallbackQuest\s*:\s*null/, 'Closed quest dialog must not remain mounted from fallback quest data.');
assert.match(detail, /const handleDismiss = \(\) => \{\s*setQuestId\(null\);\s*setFallbackQuest\(null\);/, 'Swipe dismissal must clear quest dialog state.');
assert.match(detail, /const finishClose = \(\) => \{\s*setQuestId\(null\);\s*setFallbackQuest\(null\);/, 'Button dismissal must clear quest dialog state.');
assert.doesNotMatch(detail, /(?:win|window)\.openQuestDetailModal\s*=|delete\s+(?:win|window)\.openQuestDetailModal/, 'React must not overwrite or delete the legacy global opener.');
assert.ok(detail.includes('completeQuest(quest.id)'), 'React dialog must keep quest completion action.');
assert.ok(detail.includes('openProofModal(quest)'), 'React dialog must retain proof submission flow.');
assert.ok(detail.includes('open-frequency-detail'), 'React dialog must retain frequency navigation.');

assert.ok(!html.includes('id="modal-quest-detail"'), 'Legacy template must not retain quest detail markup.');
assert.ok(!html.includes('id="modal-reward-detail"'), 'Legacy template must not retain reward detail markup.');
assert.doesNotMatch(page, /QUEST DETAIL & ACTIONS|REWARD DETAIL/, 'Legacy bridge must not retain filters for removed detail markup.');
assert.match(runtime, /levelup:open-quest-detail/);
assert.match(bundle, /levelup:open-quest-detail/);

console.log('React owns quest detail dialog; legacy open API now routes into React.');
