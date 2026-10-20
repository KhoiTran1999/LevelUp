import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const page = read('app/page.tsx');
const html = read('public/index.html');
const modals = read('components/timer/TimerModals.tsx');
const timer = read('src/js/06-timer.js');
const bundle = read('public/app.js');

assert.ok(page.includes('<TimerAdjustmentModal />') && page.includes('<FocusCompleteModal />'), 'Next page must mount both React timer dialogs.');
assert.ok(modals.includes('id="modal-edit-focus-timer"') && modals.includes('id="modal-focus-complete"'), 'React must own timer adjustment and completion markup.');
assert.ok(modals.includes('saveEditTimer') && modals.includes('startBreakTimer'), 'React dialogs must keep timer save and break actions.');
assert.ok(modals.includes('btn-focus-complete-claim') && modals.includes('btn-focus-complete-break'), 'Focus completion actions must remain available.');
assert.match(timer, /levelup:open-timer-adjustment/);
assert.match(timer, /levelup:close-timer-adjustment/);
assert.match(timer, /levelup:focus-complete/);
assert.match(timer, /window\.openEditTimerModal = openEditTimerModal/);
assert.match(timer, /window\.saveEditTimer = saveEditTimer/);
assert.match(timer, /window\.startBreakTimer = startBreakTimer/);
assert.match(bundle, /levelup:open-timer-adjustment/);
assert.match(bundle, /levelup:focus-complete/);

assert.ok(!html.includes('id="modal-edit-focus-timer"'), 'Legacy template must not retain timer adjustment markup.');
assert.ok(!html.includes('id="modal-focus-complete"'), 'Legacy template must not retain focus completion markup.');
assert.doesNotMatch(page, /EDIT FOCUS TIMER|FOCUS QUEST COMPLETE/, 'Legacy bridge must not retain filters for removed timer markup.');

console.log('React owns timer adjustment and focus-completion dialogs; timer engine remains bridged.');
