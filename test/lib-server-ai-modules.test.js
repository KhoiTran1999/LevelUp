import test from 'node:test';
import assert from 'node:assert/strict';

import {
  repairJsonString,
  validateQuestAppraisalOutput,
  validateRewardAppraisalOutput,
  validateDebateOutput,
  validateAssistantOutput,
  validateProofVerificationOutput,
  getModelAndReasoning,
  parseAIJsonContent,
  normalizeDebateOptions,
  setApiKeyForTesting,
  createSSEStream,
  calculateRank,
  clampStr,
  stripDiacritics,
  parseBool,
  resolveCategory,
  resolveRewardCategory,
  extractDurationFromText,
  parseDebateOptionsFromText,
  sanitizeEvaluatedQuest,
  sanitizeEvaluatedReward,
  analyzeMacroTelemetry,
  evaluateTextProofHeuristics,
  TOOL_GET_MY_USER_DATA,
  handleGetMyUserData,
  runDeterministicQuestDebate,
  runDeterministicRewardDebate,
  runDeterministicLoanDebate,
  PROJECT_KNOWLEDGE_BASE,
  ASSISTANT_TOOLS,
  executeWorkerTool,
  runDeterministicAssistant,
  getDeterministicQuestSuggestions,
  getDeterministicRewardSuggestions,
  sanitizeQuestSuggestions,
  sanitizeRewardSuggestions,
  handleAiRequest
} from '../lib/server/ai/index.ts';

test('AI Client: getModelAndReasoning and JSON parsers', () => {
  const workerConfig = getModelAndReasoning('worker', false);
  assert.strictEqual(workerConfig.isBrain, false);
  assert.strictEqual(workerConfig.reasoning_effort, 'none');

  const brainConfig = getModelAndReasoning('brain', true);
  assert.strictEqual(brainConfig.isBrain, true);
  assert.strictEqual(brainConfig.reasoning_effort, 'none');

  const parsed = parseAIJsonContent('```json\n{"reply": "Chào bạn!", "accepted": true}\n```');
  assert.ok(parsed);
  assert.strictEqual(parsed.reply, 'Chào bạn!');
  assert.strictEqual(parsed.accepted, true);

  const opts = normalizeDebateOptions([{ id: 1, label: 'Thử nghiệm', newRewardCoins: 12 }]);
  assert.strictEqual(opts.length, 1);
  assert.strictEqual(opts[0].newRewardCoins, 12);
});

test('AI Appraisal: heuristics, ranks and sanitizers', () => {
  assert.strictEqual(calculateRank(45), 'S');
  assert.strictEqual(calculateRank(28), 'A');
  assert.strictEqual(calculateRank(20), 'B');
  assert.strictEqual(calculateRank(14), 'C');
  assert.strictEqual(calculateRank(8), 'D');
  assert.strictEqual(calculateRank(3), 'E');

  assert.strictEqual(clampStr('  hello world  ', 5), 'hello');
  assert.strictEqual(stripDiacritics('Đọc sách'), 'doc sach');
  assert.strictEqual(parseBool('true'), true);
  assert.strictEqual(parseBool('0'), false);

  assert.strictEqual(extractDurationFromText('Học bài 45 phút'), 45);
  assert.strictEqual(extractDurationFromText('Tập thể dục 1 tiếng'), 60);
  assert.strictEqual(extractDurationFromText('Chạy bộ nửa tiếng'), 30);

  const shortHeuristic = evaluateTextProofHeuristics('Đọc sách', 'Xong');
  assert.ok(shortHeuristic && shortHeuristic.approved === false);

  const validHeuristic = evaluateTextProofHeuristics('Đọc sách', 'Đã đọc xong chương 3 và ghi chú 5 ý chính.');
  assert.strictEqual(validHeuristic, null);

  const cleanQuest = sanitizeEvaluatedQuest({
    title: 'Học bài',
    rewardCoins: 10,
    targetMinutes: 25,
    icon: '<span>🎯</span>'
  });
  assert.strictEqual(cleanQuest.icon, '🎯');
  assert.strictEqual(cleanQuest.requiresProof, true);
});

test('AI Tools & Deterministic Debates', async () => {
  assert.ok(TOOL_GET_MY_USER_DATA);
  assert.strictEqual(TOOL_GET_MY_USER_DATA.function.name, 'get_my_user_data');

  const userData = await handleGetMyUserData('profile', 'guest', null, { profile: { coins: 50, level: 3 } });
  assert.strictEqual(userData.coins, 50);
  assert.strictEqual(userData.level, 3);

  const questDebate = runDeterministicQuestDebate(
    { title: 'Chạy bộ', rewardCoins: 8, targetMinutes: 20, type: 'focus' },
    'Xin tăng lên 10 vàng'
  );
  assert.ok(questDebate.reply);
  assert.ok(Array.isArray(questDebate.options));

  const rewardDebate = runDeterministicRewardDebate(
    { name: 'Cà phê', price: 25, targetMinutes: 15, tier: 'common' },
    'Xin giảm giá'
  );
  assert.ok(rewardDebate.reply);
  assert.ok(Array.isArray(rewardDebate.options));

  const loanDebate = runDeterministicLoanDebate(
    { amount: 30, borrowRate: 0.05, autoDeductPercent: 0.5 },
    'Xin giảm tỷ lệ trích nợ xuống 30%'
  );
  assert.ok(loanDebate.reply);
});

test('AI Assistant: Knowledge base & Worker tool execution', async () => {
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.quests);
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.rewards);
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.proof_verification);
  assert.ok(Array.isArray(ASSISTANT_TOOLS));

  const assistantReply = runDeterministicAssistant('Hướng dẫn cách nộp bằng chứng', { nickname: 'Hiệp Sĩ' });
  assert.ok(assistantReply.reply.includes('bằng chứng'));

  const workerResult = await executeWorkerTool('create_quest', {
    title: 'Đọc tài liệu',
    targetMinutes: 25,
    rewardCoins: 9
  });
  assert.strictEqual(workerResult.status, 'success');
  assert.ok(workerResult.data.signature);
});

test('AI Suggestions: Quest & Reward generators', () => {
  const quests = getDeterministicQuestSuggestions([], 50, 2);
  assert.strictEqual(quests.length, 3);
  const cleanQuests = sanitizeQuestSuggestions(quests);
  assert.strictEqual(cleanQuests.length, 3);

  const rewards = getDeterministicRewardSuggestions([], [], 50);
  assert.strictEqual(rewards.length, 3);
  const cleanRewards = sanitizeRewardSuggestions(rewards);
  assert.strictEqual(cleanRewards.length, 3);
});

test('AI Service Handler: HTTP Options & Validation', async () => {
  let statusSet = 0;
  let endCalled = false;
  let jsonResult = null;

  const mockRes = {
    setHeader: () => {},
    status: (code) => {
      statusSet = code;
      return {
        end: () => { endCalled = true; },
        json: (val) => { jsonResult = val; }
      };
    }
  };

  await handleAiRequest({ method: 'OPTIONS' }, mockRes);
  assert.strictEqual(statusSet, 200);
  assert.strictEqual(endCalled, true);

  await handleAiRequest({ method: 'GET' }, mockRes);
  assert.strictEqual(statusSet, 405);
  assert.ok(jsonResult?.error);
});
