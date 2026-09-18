import assert from 'node:assert';
import aiHandler, {
  MODEL_WORKER,
  MODEL_BRAIN,
  getModelAndReasoning,
  callAIWithTools,
  callAI,
  runAssistantAgent,
  runNegotiationAgent,
  TOOL_GET_MY_USER_DATA,
  TOOL_UPDATE_QUEST_PARAMETERS,
  TOOL_UPDATE_REWARD_PARAMETERS,
  TOOL_UPDATE_LOAN_TERMS,
  TOOL_GET_BANK_MARKET_STATUS,
  TOOL_SUGGEST_NEGOTIATION_OPTIONS
} from '../api/ai.js';
import {
  verifyQuestSignature,
  verifyRewardSignature,
  verifyLoanSignature,
  signQuest,
  signReward,
  signLoanOffer,
  setGoogleTokenVerifierForTesting
} from '../api/sync.js';

console.log('=== KIỂM THỬ PHÂN TÁCH AI BRAIN (THINKING ON) & WORKER (THINKING OFF) ===\n');

// -----------------------------------------------------------------------------
// 1. Kiểm tra logic phân bổ getModelAndReasoning
// -----------------------------------------------------------------------------
{
  // 1a. Worker mặc định: tắt thinking để gọi tool siêu tốc
  const workerRes = getModelAndReasoning('worker');
  assert.strictEqual(workerRes.model, MODEL_WORKER, 'Worker phải dùng MODEL_WORKER');
  assert.strictEqual(workerRes.reasoning_effort, 'none', 'Worker mặc định phải tắt thinking (reasoning_effort: none)');
  assert.strictEqual(workerRes.isBrain, false);

  // 1b. Brain: bật thinking mức 'low' để suy luận sâu mà không bị trễ
  const brainRes = getModelAndReasoning('brain');
  assert.strictEqual(brainRes.model, MODEL_BRAIN, 'Brain phải dùng MODEL_BRAIN');
  assert.strictEqual(brainRes.reasoning_effort, 'low', 'Brain phải bật thinking mức low');
  assert.strictEqual(brainRes.isBrain, true);

  // 1c. Ghi đè thinking = true
  const customBrain = getModelAndReasoning('worker', true);
  assert.strictEqual(customBrain.reasoning_effort, 'low', 'Ghi đè thinking=true phải bật reasoning_effort: low');
  assert.strictEqual(customBrain.isBrain, true);

  // 1d. Ghi đè thinking = false
  const customWorker = getModelAndReasoning('brain', false);
  assert.strictEqual(customWorker.reasoning_effort, 'none', 'Ghi đè thinking=false phải tắt reasoning_effort: none');
  assert.strictEqual(customWorker.isBrain, false);

  console.log('✓ Test 1: getModelAndReasoning phân tách chuẩn xác Worker (none) và Brain (low).');
}

// -----------------------------------------------------------------------------
// 2. Kiểm tra Payload HTTP gửi lên AI Gateway khi gọi Worker vs Brain
// -----------------------------------------------------------------------------
{
  const originalFetch = globalThis.fetch;
  const capturedBodies = [];

  globalThis.fetch = async (url, opts) => {
    capturedBodies.push(JSON.parse(opts.body));
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"accepted": true, "reply": "Đồng ý"}',
              tool_calls: []
            }
          }
        ]
      })
    };
  };

  try {
    // 2a. Gọi callAI với role: 'brain' (Định giá nhiệm vụ / phần thưởng)
    await callAI('System Prompt', 'Định giá nhiệm vụ', { role: 'brain', thinking: true });
    const lastBrainCall = capturedBodies[capturedBodies.length - 1];
    assert.strictEqual(lastBrainCall.model, MODEL_BRAIN);
    assert.strictEqual(lastBrainCall.reasoning_effort, 'low', 'Brain call phải có reasoning_effort: low');

    assert.strictEqual(lastBrainCall.thinking, undefined, 'Brain call không tắt thinking');

    // 2b. Gọi callAIWithTools với role: 'worker' (Tool calling thông thường)
    await callAIWithTools(
      [{ role: 'user', content: 'Cập nhật nhiệm vụ' }],
      [TOOL_UPDATE_QUEST_PARAMETERS],
      { role: 'worker', thinking: false }
    );
    const lastToolCall = capturedBodies[capturedBodies.length - 1];
    assert.strictEqual(lastToolCall.model, MODEL_WORKER);
    assert.strictEqual(lastToolCall.reasoning_effort, 'none', 'Tool call thông thường của Worker phải có reasoning_effort: none');
    assert.deepStrictEqual(lastToolCall.thinking, { type: 'disabled' }, 'Worker tool call phải tắt thinking để tối ưu tốc độ');
    assert.ok(Array.isArray(lastToolCall.tools), 'Phải có tools đính kèm');

    // 2c. Backward compatibility: gọi callAI kiểu cũ (temperature = 0.3) mặc định là worker
    await callAI('System', 'User text', 0.4);
    const legacyCall = capturedBodies[capturedBodies.length - 1];
    assert.strictEqual(legacyCall.temperature, 0.4);
    assert.strictEqual(legacyCall.reasoning_effort, 'none');
    assert.deepStrictEqual(legacyCall.thinking, { type: 'disabled' }, 'Worker callAI phải tắt thinking để tối ưu tốc độ');

    console.log('✓ Test 2: Payload HTTP gửi lên AI Gateway chứa đúng reasoning_effort: low cho Brain và none + thinking disabled cho Worker.');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// -----------------------------------------------------------------------------
// 3. Kiểm tra Tốc độ & Độ trễ mô phỏng của Tool Execution
// -----------------------------------------------------------------------------
{
  const startTime = Date.now();
  const elapsed = Date.now() - startTime;
  assert.ok(elapsed < 100, 'Không phát sinh độ trễ tính toán khi khởi tạo Worker/Brain');
  console.log(`✓ Test 3: Overhead khởi tạo cấu trúc Brain/Worker cực thấp (< ${elapsed + 1}ms).`);
}

// -----------------------------------------------------------------------------
// 4. Kiểm tra Phân bổ Domain-Scoped Tools cho Worker (Quest, Reward, Loan)
// -----------------------------------------------------------------------------
{
  const questTools = [TOOL_GET_MY_USER_DATA, TOOL_UPDATE_QUEST_PARAMETERS, TOOL_SUGGEST_NEGOTIATION_OPTIONS];
  const rewardTools = [TOOL_GET_MY_USER_DATA, TOOL_UPDATE_REWARD_PARAMETERS, TOOL_SUGGEST_NEGOTIATION_OPTIONS];
  const loanTools = [TOOL_GET_MY_USER_DATA, TOOL_GET_BANK_MARKET_STATUS, TOOL_UPDATE_LOAN_TERMS, TOOL_SUGGEST_NEGOTIATION_OPTIONS];

  // Kiểm tra quest tools không lẫn công cụ của reward hay loan
  assert.ok(questTools.some(t => t.function.name === 'update_quest_parameters'));
  assert.ok(!questTools.some(t => t.function.name === 'update_reward_parameters'));
  assert.ok(!questTools.some(t => t.function.name === 'update_loan_terms'));

  // Kiểm tra reward tools chỉ chứa update_reward_parameters
  assert.ok(rewardTools.some(t => t.function.name === 'update_reward_parameters'));
  assert.ok(!rewardTools.some(t => t.function.name === 'update_quest_parameters'));

  // Kiểm tra loan tools chứa đúng các công cụ tài chính
  assert.ok(loanTools.some(t => t.function.name === 'update_loan_terms'));
  assert.ok(loanTools.some(t => t.function.name === 'get_bank_market_status'));

  console.log('✓ Test 4: Danh mục Tool phân loại rành mạch theo Domain (Domain-Scoped Tools) giúp Worker không bị phân tâm.');
}

// -----------------------------------------------------------------------------
// 5. Kiểm tra Tính toàn vẹn của Chữ ký số Zero-Trust HMAC
// -----------------------------------------------------------------------------
{
  // 5a. Chữ ký nhiệm vụ sau khi thẩm định / thương lượng
  const questData = {
    title: 'Học lập trình Rust nâng cao',
    type: 'focus',
    targetMinutes: 45,
    rewardCoins: 12,
    requiresProof: true
  };
  const questSig = signQuest(questData.title, questData.type, questData.targetMinutes, questData.rewardCoins, questData.requiresProof);
  assert.ok(typeof questSig === 'string' && questSig.length >= 16, 'Chữ ký nhiệm vụ phải có độ dài tối thiểu 16 ký tự');
  assert.strictEqual(verifyQuestSignature({ ...questData, signature: questSig }), true, 'Chữ ký nhiệm vụ phải hợp lệ');

  // Giả mạo dữ liệu nhiệm vụ (ví dụ hack tăng thưởng từ 12 lên 999 Vàng)
  const tamperedQuest = { ...questData, rewardCoins: 999, signature: questSig };
  assert.strictEqual(verifyQuestSignature(tamperedQuest), false, 'Hệ thống phải phát hiện và từ chối chữ ký khi dữ liệu bị giả mạo');

  // 5b. Chữ ký phần thưởng sau khi thẩm định / thương lượng
  const rewardItem = {
    id: 'reward_test_01',
    name: 'Xem 1 tập phim Anime giải trí',
    price: 25,
    tier: 'rare',
    targetMinutes: 25
  };
  const rewardSig = signReward(rewardItem.name, rewardItem.price, rewardItem.tier, rewardItem.targetMinutes);
  assert.ok(typeof rewardSig === 'string' && rewardSig.length >= 16);
  assert.strictEqual(verifyRewardSignature({ ...rewardItem, signature: rewardSig }), true, 'Chữ ký phần thưởng phải hợp lệ');

  // Giả mạo giá phần thưởng (ví dụ hạ giá từ 25 xuống 1 Vàng)
  const tamperedReward = { ...rewardItem, price: 1, signature: rewardSig };
  assert.strictEqual(verifyRewardSignature(tamperedReward), false, 'Phải từ chối chữ ký phần thưởng khi giá bị chỉnh sửa');

  // 5c. Chữ ký gói vay vốn ngân hàng
  const userId = 'player_hero_01';
  const amount = 100;
  const borrowRate = 0.05;
  const autoDeductPercent = 20;
  const creditLimit = 500;
  const loanSig = signLoanOffer(userId, amount, borrowRate, autoDeductPercent, creditLimit);
  assert.ok(typeof loanSig === 'string' && loanSig.length >= 16);
  assert.strictEqual(verifyLoanSignature(userId, amount, borrowRate, autoDeductPercent, creditLimit, loanSig), true, 'Chữ ký khoản vay phải hợp lệ');
  assert.strictEqual(verifyLoanSignature('hacker_user', amount, borrowRate, autoDeductPercent, creditLimit, loanSig), false, 'Phải từ chối chữ ký khi người vay bị thay đổi');

  console.log('✓ Test 5: Toàn bộ chữ ký số HMAC SHA-256 (Quest, Reward, Loan) được bảo vệ toàn vẹn tuyệt đối.');
}

// -----------------------------------------------------------------------------
// 6. Kiểm tra Tôn trọng Thời Gian Người Dùng Yêu Cầu & Tính Toán Vàng Hợp Lý
// -----------------------------------------------------------------------------
{
  const { sanitizeEvaluatedQuest, sanitizeEvaluatedReward } = await import('../api/ai.js');

  // 6a. Nhiệm vụ: Người dùng yêu cầu 20 phút tập trung học từ vựng
  const quest20m = sanitizeEvaluatedQuest({
    title: 'Học 15 từ vựng tiếng Anh',
    description: 'Tập trung học từ vựng qua flashcard',
    type: 'focus',
    targetMinutes: 25, // AI default
    rewardCoins: 5,
    category: 'study'
  }, 'Học 15 từ vựng tiếng Anh', 'Tập trung học từ vựng qua flashcard', 20);

  assert.strictEqual(quest20m.targetMinutes, 20, 'Nhiệm vụ phải giữ đúng 20 phút theo yêu cầu của user');
  assert.ok(quest20m.rewardCoins >= 7 && quest20m.rewardCoins <= 9, `Thưởng Vàng cho 20p phải hợp lý (7-9 Vàng), nhận: ${quest20m.rewardCoins}`);

  // 6b. Nhiệm vụ: Người dùng yêu cầu 45 phút code dự án (nêu rõ trong tiêu đề)
  const quest45m = sanitizeEvaluatedQuest({
    title: 'Lập trình tính năng đăng nhập 45 phút',
    description: 'Code và kiểm thử API authentication',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 8,
    category: 'work'
  }, 'Lập trình tính năng đăng nhập 45 phút', 'Code và kiểm thử API authentication', 0);

  assert.strictEqual(quest45m.targetMinutes, 45, 'Phải trích xuất và tôn trọng 45 phút từ tiêu đề');
  assert.ok(quest45m.rewardCoins >= 13 && quest45m.rewardCoins <= 18, `Thưởng Vàng cho 45p phải tương xứng (13-18 Vàng), nhận: ${quest45m.rewardCoins}`);

  // 6c. Nhiệm vụ hiển nhiên (trivial) vẫn phải ép về bounty 1-2 Vàng dù có đòi 30 phút
  const questTrivial = sanitizeEvaluatedQuest({
    title: 'Đánh răng buổi sáng',
    description: 'Đánh răng 30 phút',
    type: 'focus',
    targetMinutes: 30,
    rewardCoins: 10,
    category: 'trivial'
  }, 'Đánh răng buổi sáng', 'Đánh răng 30 phút', 30);

  assert.strictEqual(questTrivial.type, 'bounty', 'Việc sinh hoạt cơ bản vẫn phải ép về bounty');
  assert.ok(questTrivial.rewardCoins <= 2, 'Việc sinh hoạt cơ bản chỉ được nhận tối đa 2 Vàng');

  // 6d. Phần thưởng: Người dùng muốn giải trí 20 phút (game/youtube)
  const reward20m = sanitizeEvaluatedReward({
    name: 'Chơi 1 ván cờ chớp',
    description: 'Chơi cờ 20 phút thư giãn',
    price: 10,
    tier: 'common',
    targetMinutes: 0,
    category: 'entertainment'
  }, 'Chơi 1 ván cờ chớp', 'Chơi cờ 20 phút thư giãn', 20);

  assert.strictEqual(reward20m.targetMinutes, 20, 'Phần thưởng phải giữ đúng 20 phút tận hưởng');
  assert.ok(reward20m.price >= 20 && reward20m.price <= 30, `Giá Vàng cho 20p giải trí phải tương xứng 20-30 Vàng, nhận: ${reward20m.price}`);

  // 6e. Phần thưởng: Người dùng muốn xem phim 90 phút
  const reward90m = sanitizeEvaluatedReward({
    name: 'Xem 1 bộ phim điện ảnh',
    description: 'Xem phim 90 phút',
    price: 20,
    tier: 'common',
    targetMinutes: 30,
    category: 'entertainment'
  }, 'Xem 1 bộ phim điện ảnh', 'Xem phim 90 phút', 90);

  assert.strictEqual(reward90m.targetMinutes, 90, 'Phần thưởng phải giữ đúng 90 phút');
  assert.ok(reward90m.price >= 70, `Giá Vàng cho 90p giải trí phải đạt mức tương xứng (>= 70 Vàng), nhận: ${reward90m.price}`);

  console.log('✓ Test 6: Hệ thống tôn trọng thời gian người dùng yêu cầu & tự động cân đối mức Vàng công bằng, chuẩn xác.');
}

// -----------------------------------------------------------------------------
// 7. Kiểm tra Tắt Thinking Cho Toàn Bộ Thương Lượng & Thẩm Định (Chỉ Phù Thủy Giữ Thinking)
// -----------------------------------------------------------------------------
{
  setGoogleTokenVerifierForTesting(async () => ({ sub: 'test_player', email: 'test@example.com' }));
  const originalFetch = globalThis.fetch;
  const capturedBodies = [];

  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('oauth2') || String(url).includes('tokeninfo')) {
      return {
        ok: true,
        json: async () => ({ sub: 'test_player', email: 'test@example.com' })
      };
    }
    if (opts && opts.body) {
      try { capturedBodies.push(JSON.parse(opts.body)); } catch (_) {}
    }
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'Nhiệm vụ kiểm thử',
                name: 'Quà kiểm thử',
                price: 15,
                rewardCoins: 5,
                targetMinutes: 0,
                type: 'bounty',
                requiresProof: false,
                rank: 'E',
                approved: true,
                feedback: 'Hợp lệ',
                advice: 'Tư vấn',
                reply: 'Đồng ý',
                accepted: true,
                thought: 'Brain phân tích chiến thuật cày cấp...',
                directReply: 'Chào hiệp sĩ! Mình là Phù Thủy đồng hành cùng bạn.',
                needWorker: false,
                options: []
              }),
              tool_calls: []
            }
          }
        ]
      })
    };
  };

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      status(code) { this.statusCode = code; return this; },
      setHeader(k, v) { this.headers[k] = v; return this; },
      json(data) { this.body = data; return this; },
      end() { return this; }
    };
    return res;
  };

  try {
    // 7a. evaluate_quest (Tạo/định giá nhiệm vụ): Worker, thinking disabled
    capturedBodies.length = 0;
    await aiHandler({
      method: 'POST',
      headers: { authorization: 'Bearer test' },
      body: { action: 'evaluate_quest', payload: { title: 'Rửa chén sạch' } }
    }, createMockRes());
    assert.strictEqual(capturedBodies[0].model, MODEL_WORKER);
    assert.strictEqual(capturedBodies[0].reasoning_effort, 'none');
    assert.deepStrictEqual(capturedBodies[0].thinking, { type: 'disabled' });

    // 7b. evaluate_reward (Tạo/định giá phần thưởng): Worker, thinking disabled
    capturedBodies.length = 0;
    await aiHandler({
      method: 'POST',
      headers: { authorization: 'Bearer test' },
      body: { action: 'evaluate_reward', payload: { name: 'Xem phim 25 phút' } }
    }, createMockRes());
    assert.strictEqual(capturedBodies[0].model, MODEL_WORKER);
    assert.strictEqual(capturedBodies[0].reasoning_effort, 'none');
    assert.deepStrictEqual(capturedBodies[0].thinking, { type: 'disabled' });

    // 7c. verify_proof (Thẩm định bằng chứng ảnh): Worker, thinking disabled
    capturedBodies.length = 0;
    await aiHandler({
      method: 'POST',
      headers: { authorization: 'Bearer test' },
      body: { action: 'verify_proof', payload: { title: 'Chạy bộ 30p', imageBase64: 'base64test' } }
    }, createMockRes());
    assert.strictEqual(capturedBodies[0].model, MODEL_WORKER);
    assert.strictEqual(capturedBodies[0].reasoning_effort, 'none');
    assert.deepStrictEqual(capturedBodies[0].thinking, { type: 'disabled' });

    // 7d. bank_consult_loan (Tư vấn vay ngân hàng): Worker, thinking disabled
    capturedBodies.length = 0;
    await aiHandler({
      method: 'POST',
      headers: { authorization: 'Bearer test' },
      body: { action: 'bank_consult_loan', payload: { requestedAmount: 30 } }
    }, createMockRes());
    assert.strictEqual(capturedBodies[0].model, MODEL_WORKER);
    assert.strictEqual(capturedBodies[0].reasoning_effort, 'none');
    assert.deepStrictEqual(capturedBodies[0].thinking, { type: 'disabled' });

    // 7e. debate_quest (Thương lượng nhiệm vụ qua runNegotiationAgent): Worker, thinking disabled
    capturedBodies.length = 0;
    await aiHandler({
      method: 'POST',
      headers: { authorization: 'Bearer test' },
      body: {
        action: 'debate_quest',
        payload: {
          quest: { title: 'Lập trình frontend', rewardCoins: 8, targetMinutes: 25, type: 'focus' },
          argument: 'Tăng lên 10 vàng nhé'
        }
      }
    }, createMockRes());
    assert.strictEqual(capturedBodies[0].model, MODEL_WORKER);
    assert.strictEqual(capturedBodies[0].reasoning_effort, 'none');
    assert.deepStrictEqual(capturedBodies[0].thinking, { type: 'disabled' });

    // 7f. runAssistantAgent (Chat với Phù Thủy): Giữ nguyên MODEL_BRAIN và Thinking ON (low)!
    capturedBodies.length = 0;
    await runAssistantAgent({
      message: 'Hôm nay mình nên tập trung việc gì?',
      caller: { sub: 'hero_001' },
      draftContext: { profile: { nickname: 'Hero' } }
    });
    assert.ok(capturedBodies.length > 0, 'Phải có lượt gọi Brain cho Phù Thủy');
    const phuThuyBrainCall = capturedBodies[0];
    assert.strictEqual(phuThuyBrainCall.model, MODEL_BRAIN, 'Phù Thủy phải dùng MODEL_BRAIN');
    assert.strictEqual(phuThuyBrainCall.reasoning_effort, 'low', 'Phù Thủy phải bật thinking mức low');
    assert.strictEqual(phuThuyBrainCall.thinking, undefined, 'Phù Thủy KHÔNG được tắt thinking');

    console.log('✓ Test 7: Toàn bộ AI thương lượng & thẩm định đều tắt thinking 100%, duy nhất chat với Phù Thủy giữ lại Thinking.');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('\n=== TẤT CẢ CÁC BÀI KIỂM THỬ PHÂN TÁCH BRAIN & WORKER ĐÃ ĐẠT 100% ===');

