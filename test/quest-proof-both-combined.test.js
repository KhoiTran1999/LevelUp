/**
 * Test Suite: Quest Proof Both (Combined Photo & Text Report)
 * Kiểm thử tính năng kết hợp đồng thời báo cáo nội dung và hình ảnh thực tế
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import Schemas
import { QuestSchema } from '../src/schemas/game.js';
import {
  QuestAppraisalOutputSchema,
  DebateOutputSchema,
  validateQuestAppraisalOutput,
  validateDebateOutput
} from '../src/schemas/ai.js';
import {
  sanitizeEvaluatedQuest,
  evaluateTextProofHeuristics
} from '../api/ai.js';

import * as v from 'valibot';

test('1. Schemas support proofType "both" across Game & AI modules', () => {
  // Game QuestSchema
  const questWithBoth = {
    title: 'Giải đề thi toán học kỳ 1 (chụp bài làm & giải thích)',
    type: 'focus',
    targetMinutes: 50,
    rewardCoins: 20,
    requiresProof: true,
    proofType: 'both',
    proofGuidance: 'Chụp ảnh bài làm và ghi lại công thức cốt lõi đã áp dụng.'
  };
  assert.doesNotThrow(() => {
    v.parse(QuestSchema, questWithBoth);
  });

  // AI Appraisal Output Schema
  const appraisalOutput = {
    title: 'Lắp ráp mô hình robot STEM',
    type: 'focus',
    targetMinutes: 45,
    rewardCoins: 18,
    requiresProof: true,
    proofType: 'both',
    proofGuidance: 'Chụp ảnh mô hình hoàn thiện và tóm tắt các bước lắp ráp.'
  };
  const valAppraisal = validateQuestAppraisalOutput(appraisalOutput);
  assert.equal(valAppraisal.success, true);
  assert.equal(valAppraisal.data.proofType, 'both');

  // AI Debate Output Schema
  const debateOutput = {
    accepted: true,
    reply: 'Đồng ý nâng cấp hình thức xác thực kết hợp cả ảnh và báo cáo chữ nhé!',
    newRequiresProof: true,
    newProofType: 'both',
    newProofGuidance: 'Chụp ảnh thực tế và viết báo cáo các bước đã làm.'
  };
  const valDebate = validateDebateOutput(debateOutput);
  assert.equal(valDebate.success, true);
  assert.equal(valDebate.data.newProofType, 'both');
});

test('2. sanitizeEvaluatedQuest correctly handles and auto-assigns proofType: "both" for practical multi-step tasks', () => {
  // Direct proofType: 'both' provided from AI output
  const evaluatedDirect = sanitizeEvaluatedQuest({
    title: 'Nấu ăn bữa tối theo công thức mới',
    targetMinutes: 40,
    rewardCoins: 16,
    requiresProof: true,
    proofType: 'both',
    proofGuidance: ''
  }, 'Nấu ăn bữa tối');

  assert.equal(evaluatedDirect.requiresProof, true);
  assert.equal(evaluatedDirect.proofType, 'both');
  assert.ok(evaluatedDirect.proofGuidance.length > 5, 'Should generate helpful default guidance for combined proof');

  // Auto-detection: High-value math exercise (bài tập toán)
  const mathQuest = sanitizeEvaluatedQuest({
    title: 'Giải 5 bài tập toán hình học không gian',
    targetMinutes: 45,
    rewardCoins: 18,
    requiresProof: true
  }, 'Giải bài tập toán');

  assert.equal(mathQuest.requiresProof, true);
  assert.equal(mathQuest.proofType, 'both');
  assert.ok(mathQuest.proofGuidance.includes('Chụp ảnh') || mathQuest.proofGuidance.includes('viết'));

  // Simple reading remains 'text'
  const bookQuest = sanitizeEvaluatedQuest({
    title: 'Đọc sách Đắc Nhân Tâm chương 4',
    targetMinutes: 30,
    rewardCoins: 12,
    requiresProof: true
  }, 'Đọc sách');
  assert.equal(bookQuest.proofType, 'text');

  // Simple room cleaning remains 'photo'
  const cleanQuest = sanitizeEvaluatedQuest({
    title: 'Lau dọn phòng ngủ sạch sẽ',
    targetMinutes: 25,
    rewardCoins: 10,
    requiresProof: true
  }, 'Dọn phòng');
  assert.equal(cleanQuest.proofType, 'photo');
});

test('3. evaluateTextProofHeuristics guards text content in combined proof mode', () => {
  // Reject when too short
  const resShort = evaluateTextProofHeuristics('Giải bài tập toán', 'xong');
  assert.equal(resShort.approved, false);
  assert.ok(resShort.feedback.includes('ngắn gọn') || resShort.feedback.includes('tối thiểu 10 ký tự'));

  // Reject when user confesses "không biết làm gì"
  const resDontKnow = evaluateTextProofHeuristics('Giải bài tập toán', 'tôi không biết làm gì hết trơn');
  assert.equal(resDontKnow.approved, false);

  // Reject gibberish spam
  const resSpam = evaluateTextProofHeuristics('Giải bài tập toán', 'asdfghjkl qwertyuiop');
  assert.equal(resSpam.approved, false);

  // Accept valid meaningful report
  const resValid = evaluateTextProofHeuristics(
    'Giải bài tập toán',
    'Đã giải xong 5 bài hình học về định lý Pytago và tính thể tích khối chóp.'
  );
  assert.equal(resValid, null, 'Valid report should pass heuristics without being rejected');
});

test('4. public/index.html includes the "📸+✍️ Kết Hợp" tab in modal-quest-proof', () => {
  const htmlPath = path.join(rootDir, 'public', 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(htmlContent.includes('id="proof-tab-both"'), 'index.html must have #proof-tab-both button');
  assert.ok(htmlContent.includes('id="proof-tab-photo"'), 'index.html must have #proof-tab-photo button');
  assert.ok(htmlContent.includes('id="proof-tab-text"'), 'index.html must have #proof-tab-text button');
  assert.ok(htmlContent.includes('Kết Hợp'), 'index.html must have Kết Hợp label');
});

test('5. src/js/08-proof.js and src/js/18-events.js properly support mode "both"', () => {
  const proofJs = fs.readFileSync(path.join(rootDir, 'src', 'js', '08-proof.js'), 'utf8');
  const eventsJs = fs.readFileSync(path.join(rootDir, 'src', 'js', '18-events.js'), 'utf8');

  // 08-proof.js
  assert.ok(proofJs.includes("currentProofMode = (mode === 'text' || mode === 'both') ? mode : 'photo'"), 'switchProofTab handles both');
  assert.ok(proofJs.includes("tabBoth = document.getElementById('proof-tab-both')"), 'switchProofTab selects tabBoth');
  assert.ok(proofJs.includes("currentProofMode === 'both'"), 'submitQuestProofToAI validates both photo and text');

  // 18-events.js
  assert.ok(eventsJs.includes("tabProofBoth = document.getElementById('proof-tab-both')"), '18-events.js listens to tabProofBoth');
  assert.ok(eventsJs.includes("switchProofTab('both')"), '18-events.js calls switchProofTab with both');
});

test('6. src/js/14-render.js displays appropriate labels and badges for proofType "both"', () => {
  const renderJs = fs.readFileSync(path.join(rootDir, 'src', 'js', '14-render.js'), 'utf8');
  const questDetail = fs.readFileSync(path.join(rootDir, 'components', 'quests', 'QuestDetailModal.tsx'), 'utf8');

  assert.ok(renderJs.includes('Nộp Bằng Chứng Nhận Vàng 📸+✍️'), 'Card button text for both proofType');
  assert.ok(questDetail.includes('📸+✍️ Cần ảnh & báo cáo AI duyệt'), 'Badge for required combined proof');
  assert.ok(questDetail.includes('📸+✍️ Bằng chứng đã duyệt'), 'Badge for verified combined proof');
  assert.ok(renderJs.includes('📸+📝 Xem bằng chứng'), 'Ledger button for combined proof');
});
