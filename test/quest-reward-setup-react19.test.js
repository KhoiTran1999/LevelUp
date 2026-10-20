import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('1. React 19 QuestSetupModal: contains all required legacy IDs and DOM elements', () => {
  const modalFilePath = path.join(rootDir, 'components', 'quests', 'QuestSetupModal.tsx');
  assert.ok(fs.existsSync(modalFilePath), 'QuestSetupModal.tsx must exist');
  const modalContent = fs.readFileSync(modalFilePath, 'utf8');

  const requiredIds = [
    'id="modal-quest"',
    'id="modal-quest-title"',
    'id="modal-quest-subtitle"',
    'id="btn-close-quest-modal"',
    'id="input-quest-title"',
    'id="input-quest-desc"',
    'id="input-quest-estimate"',
    'id="input-quest-duration"',
    'id="quest-suggestions-container"',
    'id="btn-toggle-quest-suggestions"',
    'id="quest-suggestions-list"',
    'id="btn-submit-to-ai"',
    'id="quest-evaluating-step"',
    'id="quest-evaluating-progress-bar"',
    'id="quest-verdict-step"',
    'id="verdict-rank"',
    'id="verdict-coins"',
    'id="verdict-minutes"',
    'id="verdict-advice"',
    'id="verdict-speech"',
    'id="verdict-locked-icon"',
    'id="verdict-locked-title"',
    'id="verdict-locked-time-box"',
    'id="verdict-locked-minutes"',
    'id="verdict-locked-coins"',
    'id="verdict-repeat-toggle"',
    'id="verdict-proof-box"',
    'id="verdict-proof-toggle"',
    'id="verdict-proof-badge"',
    'id="btn-open-debate"',
    'id="btn-accept-verdict"',
  ];

  for (const idStr of requiredIds) {
    assert.ok(
      modalContent.includes(idStr),
      `QuestSetupModal.tsx must contain element ${idStr}`
    );
  }

  // Also check AiNegotiationChat integration
  assert.ok(
    modalContent.includes('<AiNegotiationChat'),
    'QuestSetupModal must embed AiNegotiationChat component'
  );
});

test('2. React 19 RewardSetupModal: contains all required legacy IDs and DOM elements', () => {
  const modalFilePath = path.join(rootDir, 'components', 'shop', 'RewardSetupModal.tsx');
  assert.ok(fs.existsSync(modalFilePath), 'RewardSetupModal.tsx must exist');
  const modalContent = fs.readFileSync(modalFilePath, 'utf8');

  const requiredIds = [
    'id="modal-reward"',
    'id="modal-reward-title"',
    'id="modal-reward-subtitle"',
    'id="btn-close-reward-modal"',
    'id="input-reward-name"',
    'id="input-reward-desc"',
    'id="input-reward-estimate"',
    'id="input-reward-duration"',
    'id="reward-suggestions-container"',
    'id="btn-toggle-reward-suggestions"',
    'id="reward-suggestions-list"',
    'id="btn-eval-reward"',
    'id="reward-evaluating-step"',
    'id="reward-evaluating-progress-bar"',
    'id="reward-verdict-step"',
    'id="eval-tier"',
    'id="eval-price"',
    'id="reward-eval-time-box"',
    'id="eval-target-minutes"',
    'id="eval-advice"',
    'id="eval-verdict"',
    'id="reward-locked-icon"',
    'id="reward-locked-name"',
    'id="reward-locked-desc-container"',
    'id="reward-locked-desc"',
    'id="eval-category-badge"',
    'id="btn-open-reward-debate"',
    'id="btn-save-reward"',
  ];

  for (const idStr of requiredIds) {
    assert.ok(
      modalContent.includes(idStr),
      `RewardSetupModal.tsx must contain element ${idStr}`
    );
  }

  // Also check AiNegotiationChat integration with type="reward"
  assert.ok(
    modalContent.includes('<AiNegotiationChat') && modalContent.includes('type="reward"'),
    'RewardSetupModal must embed AiNegotiationChat with type="reward"'
  );
});

test('3. app/page.tsx: strips legacy modals 1 & 2 while preserving modal-profile and mounting React 19 modals', () => {
  const pageFilePath = path.join(rootDir, 'app', 'page.tsx');
  const pageContent = fs.readFileSync(pageFilePath, 'utf8');

  // Regex excludes legacy modals 1 and 2
  assert.ok(
    pageContent.includes('MODAL 1: SUBMIT QUEST TO AI ARBITER') &&
    pageContent.includes('MODAL 3: PROFILE & SYNC'),
    'app/page.tsx must use boundary regex to strip legacy modals 1 & 2 without affecting modal 3'
  );

  // Mounts React 19 QuestSetupModal and RewardSetupModal
  assert.ok(
    pageContent.includes('<QuestSetupModal />'),
    'app/page.tsx must render <QuestSetupModal />'
  );
  assert.ok(
    pageContent.includes('<RewardSetupModal />'),
    'app/page.tsx must render <RewardSetupModal />'
  );
});

test('4. LevelUpProvider: exposes openQuestModal, openRewardModal, and handles Q shortcut', () => {
  const providerFilePath = path.join(rootDir, 'components', 'providers', 'LevelUpProvider.tsx');
  const providerContent = fs.readFileSync(providerFilePath, 'utf8');

  assert.ok(providerContent.includes('openQuestModal'), 'LevelUpProvider must export openQuestModal');
  assert.ok(providerContent.includes('closeQuestModal'), 'LevelUpProvider must export closeQuestModal');
  assert.ok(providerContent.includes('openRewardModal'), 'LevelUpProvider must export openRewardModal');
  assert.ok(providerContent.includes('closeRewardModal'), 'LevelUpProvider must export closeRewardModal');
  assert.ok(
    providerContent.includes("e.key === 'q' || e.key === 'Q'"),
    'LevelUpProvider must support global hotkey Q'
  );
  assert.ok(
    providerContent.includes('win.openQuestModal =') || providerContent.includes('window.openQuestModal ='),
    'LevelUpProvider must bridge window.openQuestModal'
  );
  assert.ok(
    providerContent.includes('win.openRewardModal =') || providerContent.includes('window.openRewardModal ='),
    'LevelUpProvider must bridge window.openRewardModal'
  );
});
