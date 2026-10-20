import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const questCard = fs.readFileSync(path.join(rootDir, 'components', 'quests', 'QuestCard.tsx'), 'utf8');

assert.ok(!questCard.includes('Cần bằng chứng'), 'Task cards must not show required-proof badges');
assert.ok(!questCard.includes('Cần báo cáo'), 'Task cards must not show required-report badges');
assert.ok(!questCard.includes('Cần ảnh'), 'Task cards must not show required-photo badges');
assert.ok(!questCard.includes('Đã duyệt'), 'Task cards must not show approved-proof badges');
assert.ok(
  questCard.includes('quest.focusTimerCompleted && quest.requiresProof && !quest._proofVerified'),
  'Task cards must keep opening proof submission when proof is required',
);
assert.ok(
  questCard.includes('openQuestDetail(quest)'),
  'Task card clicks must use the shared quest detail opener when available',
);
assert.ok(
  questCard.includes("new CustomEvent('levelup:open-quest-detail', { detail: quest })"),
  'Task card clicks must retain the React event fallback',
);
