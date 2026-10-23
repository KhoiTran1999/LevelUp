import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const read = rel => fs.readFileSync(path.join(rootDir, rel), 'utf8');

test('Quest and Reward renegotiation integration verification', () => {
  const providerContent = read('components/providers/LevelUpProvider.tsx');
  const questSetupContent = read('components/quests/QuestSetupModal.tsx');
  const questDetailContent = read('components/quests/QuestDetailModal.tsx');
  const rewardSetupContent = read('components/shop/RewardSetupModal.tsx');
  const rewardDetailContent = read('components/shop/RewardDetailModal.tsx');
  const arbiterContent = read('test/fixtures/legacy-client/modules/10-arbiter.js');
  const bundleContent = read('test/fixtures/legacy-client/app.js');

  // 1. LevelUpProvider must provide openQuestRenegotiateModal and bridge to window
  assert.ok(
    providerContent.includes('openQuestRenegotiateModal'),
    'LevelUpProvider must define openQuestRenegotiateModal'
  );
  assert.ok(
    providerContent.includes('win.openQuestRenegotiateModal ='),
    'LevelUpProvider must bridge window.openQuestRenegotiateModal'
  );
  assert.ok(
    providerContent.includes('isQuestRenegotiating'),
    'LevelUpProvider must track isQuestRenegotiating state'
  );

  // 2. QuestSetupModal must support renegotiation mode into Step 3 with debate open
  assert.ok(
    questSetupContent.includes('isQuestRenegotiating'),
    'QuestSetupModal must accept isQuestRenegotiating from LevelUp context'
  );
  assert.ok(
    questSetupContent.includes('editingQuest && isQuestRenegotiating'),
    'QuestSetupModal must initialize pendingVerdict and jump to step 3 when renegotiating'
  );
  assert.ok(
    questSetupContent.includes('THƯƠNG LƯỢNG LẠI NHIỆM VỤ'),
    'QuestSetupModal header title must reflect renegotiation mode'
  );

  // 3. QuestDetailModal must trigger openQuestRenegotiateModal on debate click
  assert.ok(
    questDetailContent.includes('openQuestRenegotiateModal(quest.id)'),
    'QuestDetailModal must invoke openQuestRenegotiateModal with quest.id'
  );

  // 4. Reward renegotiation must also be wired
  assert.ok(
    rewardDetailContent.includes('openRewardRenegotiateModal'),
    'RewardDetailModal must wire openRewardRenegotiateModal'
  );
  assert.ok(
    rewardSetupContent.includes('isRewardRenegotiating'),
    'RewardSetupModal must accept isRewardRenegotiating'
  );

  // 5. Legacy arbiter must delegate to window.openQuestRenegotiateModal
  assert.ok(
    arbiterContent.includes('window.openQuestRenegotiateModal(questId)'),
    '10-arbiter.js must delegate to window.openQuestRenegotiateModal'
  );
  assert.ok(
    bundleContent.includes('window.openQuestRenegotiateModal(questId)'),
    'test/fixtures/legacy-client/app.js must include legacy delegation'
  );

  console.log('✅ Quest & Reward renegotiation flow verified successfully.');
});
