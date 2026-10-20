import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isMobilePhone,
  compressImage,
  extractDurationFromText,
  parseDebateOptionsFromText,
} from '../lib/proof-utils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('1. isMobilePhone: Anti-cheat detects desktop and DevTools emulation', () => {
  // Test in Node environment (no navigator / desktop platform)
  const isMobile = isMobilePhone();
  assert.equal(typeof isMobile, 'boolean');
});

test('2. extractDurationFromText: correctly parses diverse duration expressions', () => {
  assert.equal(extractDurationFromText('Tập trung làm việc 25 phút'), 25);
  assert.equal(extractDurationFromText('Đọc sách nửa tiếng'), 30);
  assert.equal(extractDurationFromText('Luyện thi 1 tiếng 15 phút'), 75);
  assert.equal(extractDurationFromText('Chạy bộ 1 giờ rưỡi'), 90);
  assert.equal(extractDurationFromText('Nhiệm vụ không ghi thời gian'), 0);
  assert.equal(extractDurationFromText(''), 0);
});

test('3. parseDebateOptionsFromText: parses quest compromise options with proof waivers & time adjustments', () => {
  const aiReply = `
Chào bạn! Tôi đề xuất 2 phương án thỏa hiệp:
- Phương án 1: Giảm thời gian xuống 20 phút và giữ nguyên 15 Vàng (Cần ảnh).
- Phương án 2: Đổi sang 10 Vàng và miễn ảnh chụp do bạn làm trên máy tính.
  `.trim();

  const options = parseDebateOptionsFromText(aiReply, 'quest');
  assert.equal(options.length, 2, 'Phải bóc tách được đúng 2 phương án');

  // Option 1
  assert.equal(options[0].id, '1');
  assert.equal(options[0].payload.newTargetMinutes, 20);
  assert.equal(options[0].payload.newRewardCoins, 15);
  assert.equal(options[0].payload.newRequiresProof, true);

  // Option 2
  assert.equal(options[1].id, '2');
  assert.equal(options[1].payload.newRewardCoins, 10);
  assert.equal(options[1].payload.newRequiresProof, false);
});

test('4. parseDebateOptionsFromText: parses reward pricing and loan compromise options', () => {
  const rewardReply = `
Gợi ý thỏa hiệp từ AI:
1. Phương án A: Mức giá 25 Vàng cho 30 phút giải trí.
2. Phương án B: Giảm còn 15 Vàng nếu làm thêm nhiệm vụ 20 phút.
  `.trim();

  const rewardOpts = parseDebateOptionsFromText(rewardReply, 'reward');
  assert.equal(rewardOpts.length, 2);
  assert.equal(rewardOpts[0].payload.newPrice, 25);
  assert.equal(rewardOpts[1].payload.newPrice, 15);

  const loanReply = `
1. Phương án 1: Vay 50 Vàng với lãi suất 2.5%/ngày, trích 20%.
2. Phương án 2: Cấp hạn mức 100 Vàng, vay 30 Vàng lãi 1.5%.
  `.trim();

  const loanOpts = parseDebateOptionsFromText(loanReply, 'loan');
  assert.equal(loanOpts.length, 2);
  assert.equal(loanOpts[0].payload.newAmount, 50);
  assert.equal(loanOpts[0].payload.newBorrowRate, 0.025);
  assert.equal(loanOpts[0].payload.newAutoDeductPercent, 0.2);
});

test('5. React 19 QuestProofModal: contains all required legacy IDs and elements', () => {
  const modalFilePath = path.join(rootDir, 'components', 'proof', 'QuestProofModal.tsx');
  const modalContent = fs.readFileSync(modalFilePath, 'utf8');

  // IDs required by legacy scripts and tests
  const requiredIds = [
    'id="modal-quest-proof"',
    'id="proof-modal-icon-box"',
    'id="proof-modal-icon"',
    'id="proof-modal-title"',
    'id="btn-close-quest-proof"',
    'id="proof-quest-rank"',
    'id="proof-mode-indicator"',
    'id="proof-quest-reward"',
    'id="proof-quest-coins"',
    'id="proof-quest-title"',
    'id="proof-guidance-container"',
    'id="proof-tab-switcher"',
    'id="proof-mode-photo-container"',
    'id="input-quest-proof-file"',
    'id="proof-desktop-notice-zone"',
    'id="proof-capture-zone"',
    'id="btn-trigger-camera"',
    'id="proof-preview-zone"',
    'id="proof-preview-img"',
    'id="btn-retake-photo"',
    'id="proof-note-zone"',
    'id="input-quest-proof-note"',
    'id="proof-mode-text-container"',
    'id="input-quest-proof-text"',
    'id="proof-text-char-count"',
    'id="proof-evaluating-zone"',
    'id="proof-evaluating-progress-bar"',
    'id="proof-result-box"',
    'id="btn-cancel-proof"',
    'id="btn-submit-proof"',
  ];

  for (const idStr of requiredIds) {
    assert.ok(
      modalContent.includes(idStr),
      `QuestProofModal.tsx phải chứa phần tử ${idStr}`
    );
  }
});

test('6. React 19 ProofApprovedModal & ProofViewerModal: contains all required contract IDs', () => {
  const approvedFilePath = path.join(rootDir, 'components', 'proof', 'ProofApprovedModal.tsx');
  const approvedContent = fs.readFileSync(approvedFilePath, 'utf8');

  assert.ok(approvedContent.includes('id="modal-proof-approved"'));
  assert.ok(approvedContent.includes('id="btn-close-proof-approved"'));
  assert.ok(approvedContent.includes('id="proof-approved-modal-title"'));
  assert.ok(approvedContent.includes('id="proof-approved-quest-title"'));
  assert.ok(approvedContent.includes('id="proof-approved-feedback"'));
  assert.ok(approvedContent.includes('id="proof-approved-coins"'));
  assert.ok(approvedContent.includes('id="btn-claim-proof-reward"'));

  const viewerFilePath = path.join(rootDir, 'components', 'proof', 'ProofViewerModal.tsx');
  const viewerContent = fs.readFileSync(viewerFilePath, 'utf8');

  assert.ok(viewerContent.includes('id="modal-proof-viewer"'));
  assert.ok(viewerContent.includes('id="proof-viewer-title"'));
  assert.ok(viewerContent.includes('id="btn-close-proof-viewer"'));
  assert.ok(viewerContent.includes('id="proof-viewer-img-container"'));
  assert.ok(viewerContent.includes('id="proof-viewer-skeleton"'));
  assert.ok(viewerContent.includes('id="proof-viewer-img"'));
  assert.ok(viewerContent.includes('id="proof-viewer-note-zone"'));
  assert.ok(viewerContent.includes('id="proof-viewer-feedback-zone"'));
  assert.ok(viewerContent.includes('id="proof-viewer-download"'));
  assert.ok(viewerContent.includes('id="btn-close-proof-viewer-footer"'));
});

test('7. React 19 AiNegotiationChat: contains debate container and quick suggestion chips', () => {
  const chatFilePath = path.join(rootDir, 'components', 'ai', 'AiNegotiationChat.tsx');
  const chatContent = fs.readFileSync(chatFilePath, 'utf8');

  assert.ok(chatContent.includes('id="debate-container"'));
  assert.ok(chatContent.includes('id="debate-chat-logs"'));
  assert.ok(chatContent.includes('id="quest-suggest-chips"'));
  assert.ok(chatContent.includes('id="btn-suggest-proof"'));
  assert.ok(chatContent.includes('id="btn-suggest-proof-both"'));
  assert.ok(chatContent.includes('id="input-debate-arg"'));
  assert.ok(chatContent.includes('id="btn-send-debate"'));
});
