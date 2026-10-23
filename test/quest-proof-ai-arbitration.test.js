import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  runDeterministicQuestDebate,
  handleUpdateQuestParameters
} from '../api/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('1. Default quest repeat frequency is "repeatable"', () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
  const eventsJs = fs.readFileSync(path.join(rootDir, 'test', 'fixtures', 'legacy-client', 'modules', '18-events.js'), 'utf8');

  // HTML has repeatable radio checked
  assert.ok(
    indexHtml.includes('input type="radio" name="quest-repeat" value="repeatable" checked') ||
    indexHtml.includes('value="repeatable" checked'),
    'index.html phải có radio value="repeatable" được checked mặc định'
  );

  // 18-events.js resets radio to repeatable
  assert.ok(
    eventsJs.includes("input[name=\"quest-repeat\"][value=\"repeatable\"]"),
    '18-events.js phải reset radio về value="repeatable" khi mở modal'
  );
});

test('2. Changing frequency in setup modal has no >15 coins block', () => {
  const eventsJs = fs.readFileSync(path.join(rootDir, 'test', 'fixtures', 'legacy-client', 'modules', '18-events.js'), 'utf8');

  // Verify verdictRepeatToggle does not block > 15
  assert.ok(
    !eventsJs.includes("targetState && (parseInt(currentPendingVerdict.rewardCoins, 10) || 0) > 15"),
    'verdictRepeatToggle không được chứa logic chặn thưởng > 15 Vàng'
  );
});

test('3. AI Arbiter accepts switching to text report for study / intellectual tasks', () => {
  const studyQuest = {
    title: 'Tập trung học lập trình web',
    description: 'Học React và viết components trong 60 phút',
    targetMinutes: 60,
    rewardCoins: 22,
    type: 'focus',
    requiresProof: true,
    proofType: 'photo'
  };

  const res = runDeterministicQuestDebate(studyQuest, 'Công việc này mình làm trên máy tính, mình xin đổi sang nộp báo cáo nội dung được không?');
  assert.equal(res.accepted, true, 'AI phải đồng ý đổi sang báo cáo nội dung cho việc học/làm trên máy tính');
  assert.equal(res.newRequiresProof, true);
  assert.equal(res.newProofType, 'text');
  assert.ok(res.reply.includes('hợp lý') || res.reply.includes('báo cáo'));
});

test('4. AI Arbiter rejects switching to text report for physical chores / sports', () => {
  const choreQuest = {
    title: 'Dọn dẹp phòng ngủ và lau nhà',
    description: 'Dọn sạch góc học tập và lau sàn phòng',
    targetMinutes: 30,
    rewardCoins: 12,
    type: 'focus',
    requiresProof: true,
    proofType: 'photo'
  };

  const res = runDeterministicQuestDebate(choreQuest, 'Công việc này mình xin đổi sang chỉ viết báo cáo chữ không cần chụp ảnh');
  assert.equal(res.accepted, false, 'AI phải từ chối đổi sang báo cáo chữ cho việc dọn dẹp thể chất để chống đối phó');
  assert.ok(res.reply.includes('ảnh chụp thực tế') || res.reply.includes('kỷ luật'));
  assert.ok(Array.isArray(res.options) && res.options.length > 0);
});

test('5. AI Arbiter always enthusiastically accepts upgrading to both photo & text report', () => {
  const anyQuest = {
    title: 'Học từ vựng tiếng Anh',
    description: 'Học 20 từ mới',
    targetMinutes: 25,
    rewardCoins: 10,
    type: 'focus',
    requiresProof: true,
    proofType: 'text'
  };

  const res = runDeterministicQuestDebate(anyQuest, 'Mình muốn nâng cấp lên kết hợp cả ảnh và báo cáo để kỷ luật hơn');
  assert.equal(res.accepted, true, 'AI luôn hoan nghênh nâng cấp lên kết hợp cả hai');
  assert.equal(res.newRequiresProof, true);
  assert.equal(res.newProofType, 'both');
  assert.ok(res.reply.includes('kết hợp cả hai') || res.reply.includes('tự giác'));
});

test('6. AI Arbiter rejects removing proof completely for high-value / long focus quests', () => {
  const highQuest = {
    title: 'Tập trung nghiên cứu đồ án tốt nghiệp',
    targetMinutes: 60,
    rewardCoins: 22,
    type: 'focus',
    requiresProof: true,
    proofType: 'text'
  };

  const res = runDeterministicQuestDebate(highQuest, 'Cho mình xin miễn bằng chứng lần này nhé');
  assert.equal(res.accepted, false, 'AI phải từ chối miễn bằng chứng cho nhiệm vụ thưởng cao >= 15 Vàng');
  assert.ok(res.reply.includes('không thể miễn') || res.reply.includes('công bằng'));
});

test('7. handleUpdateQuestParameters correctly preserves and signs newProofType and isRepeatable', () => {
  const testQuest = {
    title: 'Viết tài liệu kỹ thuật',
    targetMinutes: 30,
    rewardCoins: 12,
    type: 'focus',
    requiresProof: true,
    proofType: 'photo',
    isRepeatable: false
  };

  const updated = handleUpdateQuestParameters({
    accepted: true,
    newProofType: 'both',
    newIsRepeatable: true
  }, testQuest);

  assert.equal(updated.accepted, true);
  assert.equal(updated.newProofType, 'both');
  assert.equal(updated.isRepeatable, true);
  assert.ok(typeof updated.signature === 'string' && updated.signature.length > 0);
});
