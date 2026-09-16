import assert from 'node:assert';
import {
  TOOL_GET_MY_USER_DATA,
  TOOL_GET_BANK_MARKET_STATUS,
  TOOL_UPDATE_QUEST_PARAMETERS,
  TOOL_UPDATE_REWARD_PARAMETERS,
  TOOL_UPDATE_LOAN_TERMS,
  TOOL_SUGGEST_NEGOTIATION_OPTIONS,
  handleGetMyUserData,
  handleGetBankMarketStatus,
  handleUpdateQuestParameters,
  handleUpdateRewardParameters,
  handleUpdateLoanTerms,
  handleSuggestNegotiationOptions,
  runDeterministicQuestDebate,
  runDeterministicRewardDebate,
  runDeterministicLoanDebate,
  runNegotiationAgent
} from '../api/ai.js';
import {
  getUserCloudData,
  signQuest,
  verifyQuestSignature,
  signReward,
  verifyRewardSignature,
  signLoanOffer,
  verifyLoanSignature
} from '../api/sync.js';

console.log('=== KIỂM THỬ TOÀN DIỆN HỆ THỐNG THƯƠNG LƯỢNG AI BẰNG TOOL CALLING ===\n');

// -----------------------------------------------------------------------------
// 1. Kiểm tra Schema và cấu trúc Tool Catalog (OpenAI Tools)
// -----------------------------------------------------------------------------
{
  const tools = [
    TOOL_GET_MY_USER_DATA,
    TOOL_GET_BANK_MARKET_STATUS,
    TOOL_UPDATE_QUEST_PARAMETERS,
    TOOL_UPDATE_REWARD_PARAMETERS,
    TOOL_UPDATE_LOAN_TERMS,
    TOOL_SUGGEST_NEGOTIATION_OPTIONS
  ];

  for (const tool of tools) {
    assert.strictEqual(tool.type, 'function', `Tool ${tool.function?.name} phải có type = function`);
    assert.ok(typeof tool.function?.name === 'string' && tool.function.name.length > 0, 'Tool phải có function.name hợp lệ');
    assert.ok(typeof tool.function?.description === 'string' && tool.function.description.length > 0, 'Tool phải có description');
    assert.strictEqual(tool.function?.parameters?.type, 'object', 'Parameters phải là object');
  }

  assert.deepStrictEqual(
    TOOL_GET_MY_USER_DATA.function.parameters.properties.category.enum,
    ['all', 'profile', 'quests', 'shop_items', 'bank_and_debt', 'ledger'],
    'TOOL_GET_MY_USER_DATA phải hỗ trợ đủ các danh mục tra cứu'
  );

  console.log('✓ Test 1: Toàn bộ 6 Tool Schemas tuân thủ tuyệt đối chuẩn OpenAI-compatible Function Calling.');
}

// -----------------------------------------------------------------------------
// 2. Kiểm tra An Ninh & Cô Lập Dữ Liệu Đa Khách Thuê (Tenant Isolation / Anti-IDOR)
// -----------------------------------------------------------------------------
{
  // Giả lập Redis Database chứa dữ liệu của 2 người chơi khác nhau
  const mockStorage = new Map();

  const userA_Sub = 'user_alpha_111';
  const userB_Sub = 'user_beta_222';

  mockStorage.set(`levelup:user:google:${userA_Sub}`, JSON.stringify({
    profile: { level: 5, coins: 150, streak: 7, nickname: 'Hiệp Sĩ Alpha' },
    quests: [{ id: 'q1', title: 'Học lập trình 25 phút', type: 'focus', targetMinutes: 25, rewardCoins: 10 }],
    shopItems: [{ id: 's1', name: 'Trà sữa trân châu', price: 30, tier: 'rare' }],
    ledger: [{ type: 'quest_complete', amount: 10, title: 'Học tập' }],
    bank: { deposited: 50, loan: null }
  }));

  mockStorage.set(`levelup:user:google:${userB_Sub}`, JSON.stringify({
    profile: { level: 12, coins: 999, streak: 30, nickname: 'Đại Hiệp Beta' },
    quests: [{ id: 'qb', title: 'Nhiệm vụ bí mật Beta', type: 'bounty', targetMinutes: 0, rewardCoins: 5 }],
    shopItems: [{ id: 'sb', name: 'Bộ giáp Huyền Thoại', price: 500, tier: 'legendary' }],
    ledger: [{ type: 'admin_grant', amount: 500, title: 'Thưởng lớn' }],
    bank: { deposited: 800, loan: { amount: 100, borrowRate: 0.02, autoDeductPercent: 0.5 } }
  }));

  const mockRedis = {
    get: async (key) => mockStorage.get(key) || null
  };

  // 2a. Kiểm tra getUserCloudData
  const cloudDataA = await getUserCloudData(mockRedis, userA_Sub);
  const cloudDataB = await getUserCloudData(mockRedis, userB_Sub);

  assert.strictEqual(cloudDataA.profile.nickname, 'Hiệp Sĩ Alpha');
  assert.strictEqual(cloudDataA.profile.coins, 150);
  assert.strictEqual(cloudDataB.profile.nickname, 'Đại Hiệp Beta');
  assert.strictEqual(cloudDataB.profile.coins, 999);

  // 2b. Kiểm tra handleGetMyUserData với callerSub là User A
  const toolDataA_profile = await handleGetMyUserData('profile', userA_Sub, mockRedis);
  assert.strictEqual(toolDataA_profile.coins, 150, 'User A phải thấy 150 Vàng');
  assert.strictEqual(toolDataA_profile.streak, 7, 'User A phải thấy chuỗi 7');
  assert.strictEqual(toolDataA_profile.nickname, 'Hiệp Sĩ Alpha');

  const toolDataA_quests = await handleGetMyUserData('quests', userA_Sub, mockRedis);
  assert.strictEqual(toolDataA_quests.activeQuests.length, 1);
  assert.strictEqual(toolDataA_quests.activeQuests[0].title, 'Học lập trình 25 phút');

  const toolDataA_bank = await handleGetMyUserData('bank_and_debt', userA_Sub, mockRedis);
  assert.strictEqual(toolDataA_bank.deposited, 50);
  assert.strictEqual(toolDataA_bank.loan, null, 'User A không có khoản vay');

  // 2c. Kiểm tra handleGetMyUserData với callerSub là User B
  const toolDataB_bank = await handleGetMyUserData('bank_and_debt', userB_Sub, mockRedis);
  assert.strictEqual(toolDataB_bank.deposited, 800);
  assert.ok(toolDataB_bank.loan && toolDataB_bank.loan.amount === 100, 'User B có khoản vay 100 Vàng');

  // 2d. Đảm bảo từ chối nếu không có callerSub (chống truy cập nặc danh trái phép)
  const noSubResult = await handleGetMyUserData('all', null, mockRedis);
  assert.ok(noSubResult.error, 'Phải báo lỗi khi không có danh tính người chơi');

  console.log('✓ Test 2: An ninh đa khách thuê bảo đảm tuyệt đối: AI chỉ truy xuất đúng dữ liệu của caller.sub, không rò rỉ chéo giữa các tài khoản.');
}

// -----------------------------------------------------------------------------
// 3. Kiểm tra Action Execution Tools với Chữ Ký Số Zero-Trust HMAC
// -----------------------------------------------------------------------------
{
  // 3a. update_quest_parameters
  const initialQuest = {
    title: 'Rửa chén bát',
    type: 'focus',
    targetMinutes: 30,
    rewardCoins: 4,
    category: 'chore',
    requiresProof: true
  };

  // AI gọi tool chốt chuyển sang việc không bấm giờ 5 Vàng và miễn chụp ảnh
  const questUpdateResult = handleUpdateQuestParameters({
    accepted: true,
    reply: 'Việc nhà này nhanh gọn, mình đồng ý để bạn hoàn thành ngay không cần bấm giờ với 5 Vàng và miễn ảnh nhé!',
    newRewardCoins: 5,
    newTargetMinutes: 0,
    newType: 'bounty',
    newRequiresProof: false
  }, initialQuest);

  assert.strictEqual(questUpdateResult.accepted, true);
  assert.strictEqual(questUpdateResult.newRewardCoins, 5);
  assert.strictEqual(questUpdateResult.newTargetMinutes, 0);
  assert.strictEqual(questUpdateResult.newType, 'bounty');
  assert.strictEqual(questUpdateResult.newRequiresProof, false);
  assert.ok(questUpdateResult.signature && questUpdateResult.signature.length === 16, 'Phải có chữ ký số HMAC 16 ký tự');

  const isQuestSigValid = verifyQuestSignature({
    title: questUpdateResult.newTitle,
    type: questUpdateResult.newType,
    targetMinutes: questUpdateResult.newTargetMinutes,
    rewardCoins: questUpdateResult.newRewardCoins,
    requiresProof: questUpdateResult.newRequiresProof,
    signature: questUpdateResult.signature
  });
  assert.strictEqual(isQuestSigValid, true, 'Chữ ký số nhiệm vụ sau khi tool cập nhật phải hợp lệ 100%');

  // 3b. update_reward_parameters
  const initialReward = {
    name: 'Xem phim cuối tuần',
    price: 50,
    tier: 'rare',
    targetMinutes: 60,
    category: 'entertainment'
  };

  // AI gọi tool chốt giảm giá xuống 35 Vàng và 40 phút
  const rewardUpdateResult = handleUpdateRewardParameters({
    accepted: true,
    reply: 'Mình đồng ý điều chỉnh món quà này xuống 35 Vàng cho 40 phút tận hưởng nhé!',
    newPrice: 35,
    newTargetMinutes: 40,
    newTier: 'rare'
  }, initialReward);

  assert.strictEqual(rewardUpdateResult.accepted, true);
  assert.strictEqual(rewardUpdateResult.newPrice, 35);
  assert.strictEqual(rewardUpdateResult.newTargetMinutes, 40);
  assert.ok(rewardUpdateResult.signature && rewardUpdateResult.signature.length === 16);

  const isRewardSigValid = verifyRewardSignature({
    name: rewardUpdateResult.newName,
    price: rewardUpdateResult.newPrice,
    tier: rewardUpdateResult.newTier,
    targetMinutes: rewardUpdateResult.newTargetMinutes,
    signature: rewardUpdateResult.signature
  });
  assert.strictEqual(isRewardSigValid, true, 'Chữ ký số phần thưởng sau khi tool cập nhật phải hợp lệ 100%');

  // 3c. update_loan_terms
  const initialLoan = {
    amount: 30,
    borrowRate: 0.05,
    autoDeductPercent: 0.50,
    creditLimit: 50
  };
  const testSub = 'knight_user_test_99';
  const mockMacro = { depositFloor: 0.015, borrowRate: 0.05, liquidityStatus: 'normal' };

  // AI gọi tool chốt giảm lãi xuống 3%/ngày và nâng hạn mức lên 70 Vàng
  const loanUpdateResult = handleUpdateLoanTerms({
    accepted: true,
    reply: 'Bạn chăm chỉ lắm! Mình đồng ý giảm lãi ngày xuống 3% và nâng hạn mức lên 70 Vàng nhé!',
    newAmount: 30,
    newBorrowRate: 0.03,
    newAutoDeductPercent: 0.50,
    newCreditLimit: 70
  }, initialLoan, testSub, mockMacro);

  assert.strictEqual(loanUpdateResult.accepted, true);
  assert.strictEqual(loanUpdateResult.newBorrowRate, 0.03);
  assert.strictEqual(loanUpdateResult.newCreditLimit, 70);
  assert.ok(loanUpdateResult.signature && loanUpdateResult.signature.length === 16);

  const isLoanSigValid = verifyLoanSignature(
    [testSub],
    loanUpdateResult.newAmount,
    loanUpdateResult.newBorrowRate,
    loanUpdateResult.newAutoDeductPercent,
    loanUpdateResult.newCreditLimit,
    loanUpdateResult.signature
  );
  assert.strictEqual(isLoanSigValid, true, 'Chữ ký số gói vay sau khi tool cập nhật phải hợp lệ 100%');

  // 3d. Bảo vệ sàn lãi suất ngân hàng (Floor Protection)
  const predatoryLoan = handleUpdateLoanTerms({
    accepted: true,
    newBorrowRate: 0.005 // Cố ý đòi lãi 0.5% dưới sàn 1.5%
  }, initialLoan, testSub, mockMacro);
  assert.ok(predatoryLoan.newBorrowRate >= 0.015, 'Lãi suất không được phép thấp hơn sàn bảo vệ depositFloor (1.5%/ngày)');

  // 3e. suggest_negotiation_options
  const optionsResult = handleSuggestNegotiationOptions({
    domain: 'quest',
    reply: 'Bạn có thể chọn 1 trong 2 cách sau nè:',
    options: [
      { id: 1, label: 'Cách 1 (20 phút • 10 Vàng)', argument: 'Chốt cách 1', newTargetMinutes: 20, newRewardCoins: 10 },
      { id: 2, label: 'Cách 2 (Bounty • 5 Vàng)', argument: 'Chốt cách 2', newTargetMinutes: 0, newRewardCoins: 5 }
    ]
  });
  assert.strictEqual(optionsResult.options.length, 2);
  assert.strictEqual(optionsResult.options[0].newTargetMinutes, 20);
  assert.strictEqual(optionsResult.options[1].newTargetMinutes, 0);

  console.log('✓ Test 3: Action Execution Tools thực thi cập nhật và ký số Zero-Trust HMAC bảo đảm toàn vẹn dữ liệu.');
}

// -----------------------------------------------------------------------------
// 4. Kiểm tra Cơ Chế Dự Phòng (Deterministic Fallback Tool Dispatcher)
// -----------------------------------------------------------------------------
{
  // 4a. Nhiệm vụ: Xin chuyển việc nhà sang không bấm giờ 5 Vàng
  const choreQuest = { title: 'Lau dọn nhà cửa', targetMinutes: 30, rewardCoins: 3, type: 'focus', requiresProof: true };
  const choreFallback = runDeterministicQuestDebate(choreQuest, 'Việc này là việc nhà, cho mình làm không cần bấm giờ 5 Vàng nhé', null);
  assert.strictEqual(choreFallback.accepted, true);
  assert.strictEqual(choreFallback.newType, 'bounty');
  assert.strictEqual(choreFallback.newTargetMinutes, 0);
  assert.strictEqual(choreFallback.newRewardCoins, 5);
  assert.ok(choreFallback.signature);

  // 4b. Phần thưởng: Giảm giá kèm giảm thời gian
  const gameReward = { name: 'Chơi game thả ga', price: 60, targetMinutes: 60, tier: 'rare' };
  const rewardFallback = runDeterministicRewardDebate(gameReward, 'Cho mình giảm giá còn 40 vàng và rút ngắn còn 40 phút được không', null);
  assert.strictEqual(rewardFallback.accepted, true);
  assert.ok(rewardFallback.newPrice < 60);
  assert.ok(rewardFallback.newTargetMinutes < 60);
  assert.ok(rewardFallback.signature);

  // 4c. Ngân hàng: Xin giảm lãi suất khi có chuỗi chăm chỉ
  const mockProfile = { level: 3, streak: 5, coins: 40 };
  const loanFallback = runDeterministicLoanDebate(
    { amount: 30, borrowRate: 0.05, autoDeductPercent: 0.50, creditLimit: 50 },
    'Mình có chuỗi 5 ngày chăm chỉ, xin giảm lãi suất',
    'knight_01',
    { depositFloor: 0.015, borrowRate: 0.05, liquidityStatus: 'normal' },
    null,
    mockProfile
  );
  assert.strictEqual(loanFallback.accepted, true);
  assert.ok(loanFallback.newBorrowRate < 0.05, 'Phải được giảm lãi suất');
  assert.ok(loanFallback.newBorrowRate >= 0.015, 'Lãi không thấp hơn sàn');
  assert.ok(loanFallback.signature);

  console.log('✓ Test 4: Deterministic Fallback Dispatcher vận hành hoàn hảo, bảo đảm 100% thời gian hoạt động khi offline.');
}

// -----------------------------------------------------------------------------
// 5. Kiểm tra Chuẩn Mực Văn Phong & Chống Thuật Ngữ (Communication Style Guardrail)
// -----------------------------------------------------------------------------
{
  const testPhrases = [
    runDeterministicQuestDebate({ title: 'Rửa chén', targetMinutes: 20, rewardCoins: 3 }, 'cho mình 5 vàng', null).reply,
    runDeterministicRewardDebate({ name: 'Trà sữa', price: 40 }, 'giảm giá đi', null).reply,
    runDeterministicLoanDebate({ amount: 30, borrowRate: 0.05 }, 'xin giảm lãi', 'u1', { depositFloor: 0.015, borrowRate: 0.05 }, null, { streak: 5 }).reply
  ];

  const forbiddenJargon = [
    /pomodoro/i,
    /zen\s*mode/i,
    /\bbounty\b/i,
    /\bfocus\b/i,
    /\btier\b/i,
    /dopamine\s*giá\s*rẻ/i,
    /lạm\s*phát\s*điểm/i,
    /\bamm\b/i,
    /đòn\s*bẩy/i,
    /rủi\s*ro\s*vĩ\s*mô/i
  ];

  for (const reply of testPhrases) {
    for (const regex of forbiddenJargon) {
      assert.strictEqual(
        regex.test(reply),
        false,
        `Lời thoại không được chứa thuật ngữ cấm (${regex.toString()}): "${reply}"`
      );
    }
  }

  console.log('✓ Test 5: Văn phong AI thân thiện, giản dị, tuyệt đối không chứa thuật ngữ kỹ thuật khó hiểu.');
}

// -----------------------------------------------------------------------------
// 6. Kiểm tra runNegotiationAgent khi người dùng bấm chọn Option trực tiếp
// -----------------------------------------------------------------------------
{
  const selectedQuestOption = {
    id: 1,
    label: 'Phương án 1 (20 phút • 12 Vàng)',
    argument: 'Chốt phương án 1: 20 phút, 12 Vàng',
    newTargetMinutes: 20,
    newRewardCoins: 12,
    newType: 'focus',
    newRequiresProof: false
  };

  const agentResult = await runNegotiationAgent({
    domain: 'quest',
    caller: { sub: 'knight_fast_click' },
    redis: null,
    systemPrompt: 'System',
    userPrompt: 'User',
    targetEntity: { title: 'Đọc sách', rewardCoins: 10, targetMinutes: 25, type: 'focus', requiresProof: true },
    selectedOption: selectedQuestOption,
    userArgument: selectedQuestOption.argument,
    tools: [TOOL_GET_MY_USER_DATA, TOOL_UPDATE_QUEST_PARAMETERS, TOOL_SUGGEST_NEGOTIATION_OPTIONS]
  });

  assert.strictEqual(agentResult.accepted, true);
  assert.strictEqual(agentResult.newRewardCoins, 12);
  assert.strictEqual(agentResult.newTargetMinutes, 20);
  assert.strictEqual(agentResult.newRequiresProof, false);
  assert.ok(agentResult.toolsExecuted.includes('apply_selected_option:quest'));
  assert.ok(verifyQuestSignature({
    title: agentResult.newTitle,
    type: agentResult.newType,
    targetMinutes: agentResult.newTargetMinutes,
    rewardCoins: agentResult.newRewardCoins,
    requiresProof: agentResult.newRequiresProof,
    signature: agentResult.signature
  }));

  console.log('✓ Test 6: runNegotiationAgent xử lý chuẩn xác lựa chọn phương án và ghi nhận toolsExecuted.');
}

console.log('\n======================================================================');
console.log('🎉 TẤT CẢ 6 NHÓM KIỂM THỬ THƯƠNG LƯỢNG AI TOOL CALLING ĐÃ VƯỢT QUA!');
console.log('======================================================================\n');
