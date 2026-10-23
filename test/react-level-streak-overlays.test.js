import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'app', 'page.tsx'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const component = fs.readFileSync(path.join(root, 'components', 'profile', 'LevelAndStreakInfoModals.tsx'), 'utf8');
const legacyModal = fs.readFileSync(path.join(root, 'test', 'fixtures', 'legacy-client', 'modules', '15-modal.js'), 'utf8');

const mainEnd = html.indexOf('</main>');
const confettiStart = html.indexOf('<!-- RPG Confetti VFX');
assert.notEqual(mainEnd, -1, 'Legacy page fixture must have main end marker.');
assert.notEqual(confettiStart, -1, 'Legacy page fixture must have confetti marker.');

let legacyOverlays = html.slice(mainEnd + 7, confettiStart);
legacyOverlays = legacyOverlays.replace(/<nav class="md:hidden m3-navigation-bar[\s\S]*?<\/nav>/i, '');
legacyOverlays = legacyOverlays.replace(/<!--\s*MODAL:\s*LEVEL & EXP GUIDE[\s\S]*?(?=<!--\s*MODAL:\s*CHUỖI NGÀY)/i, '');
legacyOverlays = legacyOverlays.replace(/<!--\s*MODAL:\s*CHUỖI NGÀY[\s\S]*?(?=<!--\s*MODAL:\s*CHI TIẾT TẦN SUẤT)/i, '');

assert.ok(page.includes('<LevelAndStreakInfoModals />'), 'Next page must render React level and streak dialogs.');
assert.ok(!legacyOverlays.includes('id="modal-level-info"'), 'Legacy level dialog must not be bridged.');
assert.ok(!legacyOverlays.includes('id="modal-streak-info"'), 'Legacy streak dialog must not be bridged.');
assert.match(component, /id="modal-level-info"/, 'React must preserve legacy level modal ID.');
assert.match(component, /id="modal-streak-info"/, 'React must preserve legacy streak modal ID.');
assert.match(component, /openLevelInfoModal = openLevel/, 'Legacy level triggers must call React state.');
assert.match(component, /openStreakInfoModal = openStreak/, 'Legacy streak triggers must call React state.');
assert.doesNotMatch(legacyModal, /function open(?:Level|Streak)InfoModal/, 'Imperative modal controllers must be removed.');

console.log('React level and streak overlays own markup and state; legacy copies and controllers removed.');
