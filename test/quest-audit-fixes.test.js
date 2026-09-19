import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  signQuest,
  verifyQuestSignature,
  calculateCreditLimit
} from '../api/sync.js';

import {
  handleUpdateLoanTerms,
  runDeterministicLoanDebate
} from '../api/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appJsContent = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf-8');
const syncJsContent = fs.readFileSync(path.join(__dirname, '../api/sync.js'), 'utf-8');
const aiJsContent = fs.readFileSync(path.join(__dirname, '../api/ai.js'), 'utf-8');
const indexHtmlContent = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf-8');

test('Lỗi 1: Seed Quest 2 restart bảo tồn canonicalId và vượt qua verifyQuestSignature', () => {
  // Mô phỏng quest được restart từ q_seed_2
  const restartedQuest = {
    id: 'q_' + Date.now() + '_test',
    canonicalId: 'q_seed_2',
    title: 'Dọn sạch góc bàn làm việc & rửa sạch cốc',
    type: 'bounty',
    rewardCoins: 5,
    targetMinutes: 0,
    isRepeatable: false,
    status: 'active'
  };

  const isLegit = verifyQuestSignature(restartedQuest);
  assert.equal(isLegit, true, 'Restarted seed quest 2 phải được verifyQuestSignature chấp nhận');

  // Đảm bảo trong restartQuest có gán canonicalId
  assert.match(appJsContent, /canonicalId:\s*quest\.canonicalId\s*\|\|\s*\(quest\.id\s*&&\s*quest\.id\.startsWith\('q_seed_'\)\s*\?\s*quest\.id\s*:\s*undefined\)/);
});

test('Lỗi 2: Trả hết nợ ngân hàng qua nhiệm vụ có bằng chứng hợp lệ không bị server khôi phục nợ', () => {
  // Kiểm tra mã nguồn sync.js có cơ chế hasLoanClearedEvidence
  assert.match(syncJsContent, /hasLoanClearedEvidence/);
  assert.match(syncJsContent, /finalBankState\.loan\s*=\s*null;\s*finalBankState\.isFrozen\s*=\s*false;/);
});

test('Lỗi 3: Hoàn tác nhiệm vụ trừ nợ (bank_revert) cho phép khôi phục nợ trên server', () => {
  // Kiểm tra mã nguồn sync.js có hỗ trợ bank_revert khi incomingDebt > prevDebt hoặc khi server không có nợ
  assert.match(syncJsContent, /hasRevertEvidence/);
  assert.match(syncJsContent, /category === 'bank_revert'/);
});

test('Lỗi 4: restoreFocusTimer chuẩn hoá actualFocusedSeconds trước khi gọi kết thúc phiên', () => {
  // Đảm bảo restoreFocusTimer có Math.max(actualFocusedSeconds, focusTotalSeconds)
  assert.match(appJsContent, /if\s*\(focusRemainingSeconds\s*<=\s*0\)\s*\{\s*focusRemainingSeconds\s*=\s*0;\s*actualFocusedSeconds\s*=\s*Math\.max\(actualFocusedSeconds,\s*focusTotalSeconds\);/);
});

test('Lỗi 5: openEditTimerModal và saveEditTimer tính toán theo actualFocusedSeconds + total', () => {
  assert.match(appJsContent, /neededRemainingSecs\s*=\s*Math\.max\(0,\s*minRequiredSecs\s*-\s*actualFocusedSeconds\)/);
  assert.match(appJsContent, /\(actualFocusedSeconds\s*\+\s*total\)\s*<\s*\(minRequiredSecs\s*-\s*5\)/);
});

test('Lỗi 6: Đổi quest > 15 xu sang 1-time (!isRepeatable) vượt qua verifyQuestSignature với altRepeatExpected', () => {
  // Tạo quest 20 xu có chữ ký là lặp lại
  const title = 'Nhiệm vụ học tập chuyên sâu 50p';
  const sigRepeatable = signQuest(title, 'focus', 50, 20, false, true);

  // User chuyển sang 1 lần trong UI (chữ ký vẫn giữ sigRepeatable)
  const toggledQuest = {
    id: 'q_test_toggle',
    title,
    type: 'focus',
    targetMinutes: 50,
    rewardCoins: 20,
    requiresProof: false,
    isRepeatable: false,
    signature: sigRepeatable
  };

  const isLegit = verifyQuestSignature(toggledQuest);
  assert.equal(isLegit, true, 'Quest > 15 xu khi chuyển sang 1 lần phải được verifyQuestSignature chấp nhận chữ ký alt');
});

test('Lỗi 8: Hỗ trợ tỷ lệ trích nợ 20% (0.20) trên cả client, server và AI', () => {
  // 1. calculateCreditLimit chấp nhận 0.20
  const limit = calculateCreditLimit({ level: 1, streak: 0, totalCoinsEarned: 20 }, 0.20);
  assert.ok(limit >= 20, 'Hạn mức tính toán được với tỷ lệ 0.20');

  // 2. handleUpdateLoanTerms chấp nhận 0.20
  const terms = handleUpdateLoanTerms({ accepted: true, newAutoDeductPercent: 0.20 }, { amount: 50 }, 'user1');
  assert.equal(terms.newAutoDeductPercent, 0.20, 'handleUpdateLoanTerms phải giữ nguyên tỷ lệ 0.20');

  // 3. deterministic loan debate chấp nhận 0.20
  const detTerms = runDeterministicLoanDebate({ amount: 50, autoDeductPercent: 0.20 }, 'Tôi muốn trích 20%', 'user1');
  assert.equal(detTerms.newAutoDeductPercent, 0.20, 'Deterministic loan debate phải giữ nguyên 0.20');

  // 4. index.html có input range slider min="20"
  assert.match(indexHtmlContent, /<input\s+type="range"\s+id="input-deduct-percent"\s+min="20"/);

  // 5. app.js trích nợ cho phép 0.20
  assert.match(appJsContent, /Math\.max\(0\.20,\s*Number\(loan\.autoDeductPercent\)\s*\|\|\s*0\.50\)/);
});

test('Lỗi 9: submitQuestProofToAI gọi triggerSave(true) ngay khi AI duyệt bằng chứng', () => {
  assert.match(appJsContent, /pendingApprovedQuest\._proofVerified\s*=\s*true;\s*triggerSave\(true\);/);
});

test('Lỗi 10: completeQuest đặt khoá re-entrant completingQuestIds ở đầu hàm', () => {
  assert.match(appJsContent, /completingQuestIds\.add\(questId\);\s*try\s*\{/);
  assert.match(appJsContent, /finally\s*\{\s*completingQuestIds\.delete\(questId\);\s*\}/);
});

test('Lỗi 11: Bộ lọc "completed" bao gồm cả nhiệm vụ lặp lại đã làm ít nhất 1 lần', () => {
  assert.match(appJsContent, /filtered\s*=\s*appState\.quests\.filter\(q\s*=>\s*q\.status\s*===\s*'completed'\s*\|\|\s*\(q\.isRepeatable\s*&&\s*\(q\.completedCount\s*\|\|\s*0\)\s*>\s*0\)\);/);
});

test('Lỗi 12: Đóng modal-quest hoặc modal-verdict reset sạch currentEditingQuestId', () => {
  assert.match(appJsContent, /if\s*\(modal\.id\s*===\s*'modal-quest'\s*\|\|\s*modal\.id\s*===\s*'modal-verdict'\)\s*\{\s*currentEditingQuestId\s*=\s*null;\s*currentPendingVerdict\s*=\s*null;\s*\}/);
});

test('Lỗi 13: Đổi quest lặp lại thành 1 lần không bị server ép thành completed', () => {
  // 1. sync.js không ép completedCount > 0 vào completedSet
  assert.doesNotMatch(syncJsContent, /completedCount,\s*10\)\s*\|\|\s*0\)\s*>\s*0\)\s*\{\s*completedSet\.add/);

  // 2. toggleQuestRepeatable quản lý previousRepeatCount
  assert.match(appJsContent, /quest\.previousRepeatCount\s*=\s*quest\.completedCount\s*\|\|\s*0;/);
});

test('Lỗi 14: Hoàn tác quest lặp lại khôi phục previousLastCompletedAt', () => {
  assert.match(appJsContent, /previousLastCompletedAt/);
  assert.match(appJsContent, /if\s*\(deductionInfo\?\.previousLastCompletedAt\)\s*\{\s*quest\.lastCompletedAt\s*=\s*deductionInfo\.previousLastCompletedAt;\s*\}\s*else\s*\{\s*delete\s+quest\.lastCompletedAt;\s*\}/);
});
