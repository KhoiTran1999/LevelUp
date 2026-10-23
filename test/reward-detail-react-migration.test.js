import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const page = read('app/page.tsx');
const html = read('public/index.html');
const dialog = read('components/shop/RewardDetailModal.tsx');
const frequency = read('components/tracker/FrequencyDetailModal.tsx');
const runtime = read('test/fixtures/legacy-client/modules/14-render.js');
const bundle = read('test/fixtures/legacy-client/app.js');

assert.ok(page.includes('<RewardDetailModal />'), 'Next page must mount React reward detail dialog.');
assert.ok(dialog.includes('id="modal-reward-detail"'), 'React must own reward detail dialog markup.');
assert.ok(dialog.includes('levelup:open-reward-detail'), 'React dialog must receive legacy open requests.');
assert.doesNotMatch(dialog, /(?:win|window)\.openRewardDetailModal\s*=|delete\s+(?:win|window)\.openRewardDetailModal/, 'React must not overwrite or delete the legacy global opener.');
assert.ok(dialog.includes('buyShopItem'), 'React dialog must preserve shop purchase flow.');
assert.ok(dialog.includes('useInventoryItem'), 'React dialog must preserve inventory use and timer resume flows.');
assert.ok(dialog.includes('clearSavedRewardTimer'), 'React dialog must preserve saved timer termination.');
assert.ok(dialog.includes('refundInventoryItem') && dialog.includes('deleteInventoryItem'), 'React dialog must preserve refund and inventory deletion actions.');
assert.ok(dialog.includes('deleteShopItem') && dialog.includes('openRewardRenegotiateModal'), 'React dialog must preserve shop deletion and negotiation actions.');
assert.ok(dialog.includes('levelup:open-frequency-detail') && frequency.includes('levelup:open-frequency-detail'), 'React dialog must preserve nested reward frequency flow.');
assert.ok(dialog.includes('initBottomSheetGestures') && dialog.includes('dismissModalWithSlideDown'), 'React dialog must preserve bottom-sheet gestures and dismissal.');
assert.ok(dialog.includes('className="m3-modal-sheet') && dialog.includes('data-sheet-dismiss="true"'), 'React dialog must keep shared sheet animation and dismissal selectors.');
assert.match(runtime, /function openRewardDetailModal\(itemId, source\) \{[\s\S]*?levelup:open-reward-detail/);
assert.match(bundle, /function openRewardDetailModal\(itemId, source\) \{[\s\S]*?levelup:open-reward-detail/);

assert.ok(!html.includes('id="modal-reward-detail"'), 'Legacy template must not retain reward detail markup.');
assert.doesNotMatch(page, /QUEST DETAIL & ACTIONS|REWARD DETAIL/, 'Legacy bridge must not retain filters for removed detail markup.');

console.log('React owns reward detail UI; shop and inventory actions remain bridged.');
