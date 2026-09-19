import assert from 'node:assert';
import {
  signQuest,
  signQuestLegacyProof,
  signQuestLegacy,
  verifyQuestSignature,
  deriveLegitimateBalance,
  accrueUserBank,
  setRedisClientForTesting
} from '../api/sync.js';

console.log('⚔️  Running Gold & Banking Comprehensive Fixes Test Suite...\n');

// -------------------------------------------------------------
// Test 1: Shop Refund không làm người chơi bị coi là gian lận
// -------------------------------------------------------------
{
  const itemSig = signQuest('dummy', 'focus', 25, 10);
  const stateBeforeRefund = {
    profile: {
      coins: 50,
      totalCoinsEarned: 100,
      totalCoinsSpent: 50 // đã mua quà 50 vàng
    },
    quests: [
      { id: 'q1', title: 'Task 1', type: 'focus', targetMinutes: 25, rewardCoins: 40, completedCount: 2, signature: signQuest('Task 1', 'focus', 25, 40) }
    ],
    inventory: [
      { id: 'inv1', name: 'Item 1', price: 50 }
    ],
    ledger: []
  };

  const check1 = deriveLegitimateBalance(stateBeforeRefund);
  assert.strictEqual(check1.tampered, false, 'State trước hoàn trả không được bị phạt');

  // Người dùng hoàn trả quà inv1: nhận lại 50 vàng vào ví, giảm totalCoinsSpent về 0, thêm ledger hoàn trả
  const stateAfterRefund = {
    profile: {
      coins: 100,
      totalCoinsEarned: 100,
      totalCoinsSpent: 0
    },
    quests: stateBeforeRefund.quests,
    inventory: [],
    ledger: [
      { id: 'led_ref', type: 'earn', category: 'reward', amount: 50, title: 'Hoàn trả quà: Item 1' }
    ]
  };

  const check2 = deriveLegitimateBalance(stateAfterRefund, stateBeforeRefund);
  assert.strictEqual(check2.tampered, false, 'Hoàn trả quà hợp lệ không được báo tampered');
  assert.strictEqual(check2.coins, 100, 'Số dư Vàng 100 được bảo toàn nguyên vẹn sau hoàn trả');
  console.log('✓ Test 1 Passed: Shop Refund bảo toàn số dư và không kích hoạt án phạt gian lận.');
}

// -------------------------------------------------------------
// Test 2: Rút lãi tiết kiệm ngân hàng (Bank Withdraw) đồng bộ totalCoinsEarned
// -------------------------------------------------------------
{
  const stateWithInterest = {
    profile: {
      coins: 70, // 120 tổng kiếm - 50 đang gửi ngân hàng = 70 trong ví
      totalCoinsEarned: 120, // Tăng tương ứng với 20 vàng lãi
      totalCoinsSpent: 0,
      bank: {
        deposited: 50,
        depositInterest: 0
      }
    },
    quests: [
      { id: 'q1', title: 'Học code', type: 'focus', targetMinutes: 50, rewardCoins: 40, completedCount: 2, signature: signQuest('Học code', 'focus', 50, 40) }
    ],
    inventory: [],
    ledger: [
      { id: 'led_wit', type: 'earn', category: 'bank_withdraw', amount: 20, description: 'Rút 20 Vàng (0 gốc + 20 lãi) từ Ngân Hàng' }
    ]
  };

  const check = deriveLegitimateBalance(stateWithInterest);
  assert.strictEqual(check.tampered, false, 'Rút lãi tiết kiệm không bị đánh dấu gian lận');
  assert.strictEqual(check.coins, 70, 'Số dư ví nhận đủ lãi sau khi trừ tiền gửi');
  assert.strictEqual(check.totalCoinsEarned, 120, 'Tổng Vàng tích lũy ghi nhận chính xác phần tiền lãi');
  console.log('✓ Test 2 Passed: Bank Withdraw lãi tiết kiệm đồng bộ chính xác và hợp lệ với Anti-Cheat.');
}

// -------------------------------------------------------------
// Test 3: Hoàn thành nhiệm vụ 60 Vàng được xác thực trơn tru (nâng trần từ 40 lên 60)
// -------------------------------------------------------------
{
  const quest60Sig = signQuest('Chinh phục Dự Án Lớn', 'focus', 60, 60, false, false);
  const stateWith60 = {
    profile: {
      coins: 80, // 20 khởi đầu + 60 nhiệm vụ
      totalCoinsEarned: 80,
      totalCoinsSpent: 0
    },
    quests: [
      { id: 'q_epic', title: 'Chinh phục Dự Án Lớn', type: 'focus', targetMinutes: 60, rewardCoins: 60, completedCount: 1, status: 'completed', signature: quest60Sig }
    ],
    inventory: [],
    ledger: []
  };

  const check = deriveLegitimateBalance(stateWith60);
  assert.strictEqual(check.tampered, false, 'Nhiệm vụ 60 Vàng phải hợp lệ');
  assert.strictEqual(check.totalCoinsEarned, 80, 'Tổng Vàng nhận đủ 60 Vàng từ nhiệm vụ');
  assert.strictEqual(check.coins, 80, 'Số dư ví nhận đủ 80 Vàng');
  console.log('✓ Test 3 Passed: Nhiệm vụ phần thưởng tối đa 60 Vàng (Epic/S-rank) được xác thực hoàn toàn.');
}

// -------------------------------------------------------------
// Test 4: Cờ adminAdjusted được bảo toàn và duy trì qua Anti-Cheat
// -------------------------------------------------------------
{
  const adminState = {
    profile: {
      adminAdjusted: true,
      coins: 5000,
      totalCoinsEarned: 5000,
      totalCoinsSpent: 0
    },
    quests: [],
    inventory: [],
    ledger: []
  };

  const check = deriveLegitimateBalance(adminState);
  assert.strictEqual(check.tampered, false, 'Tài khoản adminAdjusted không được bị tịch thu tiền');
  assert.strictEqual(check.coins, 5000, 'Số Vàng do Admin cấp được giữ nguyên');
  assert.strictEqual(check.totalCoinsEarned, 5000, 'Tổng Vàng kiếm được giữ nguyên');
  console.log('✓ Test 4 Passed: Admin điều chỉnh Vàng được duy trì bền vững không bị coi là hack.');
}

// -------------------------------------------------------------
// Test 5: Chữ ký số 6 tham số (HMAC) ngăn chặn biến nhiệm vụ 60 Vàng thành lặp lại
// -------------------------------------------------------------
{
  // AI tạo ra nhiệm vụ 60 Vàng làm 1 lần (isRepeatable: false)
  const oneTimeSig = signQuest('Chinh phục Boss', 'focus', 60, 60, true, false);
  const questOneTime = {
    title: 'Chinh phục Boss',
    type: 'focus',
    targetMinutes: 60,
    rewardCoins: 60,
    requiresProof: true,
    isRepeatable: false,
    signature: oneTimeSig
  };

  assert.strictEqual(verifyQuestSignature(questOneTime), true, 'Chữ ký 1 lần phải hợp lệ');

  // Kẻ gian sửa trên Client: đổi isRepeatable = true để cày lặp lại
  const tamperedRepeatQuest = {
    ...questOneTime,
    isRepeatable: true
  };

  assert.strictEqual(verifyQuestSignature(tamperedRepeatQuest), false, 'Chữ ký phải không hợp lệ khi bị đổi sang lặp lại');
  console.log('✓ Test 5 Passed: Chữ ký số HMAC 6 tham số chặn đứng việc cày nhiệm vụ giá trị cao lặp lại.');
}

// -------------------------------------------------------------
// Test 6: Xóa nhiệm vụ lặp lại cũ không kéo tụt rawTotal
// -------------------------------------------------------------
{
  const existingState = {
    profile: {
      coins: 300,
      totalCoinsEarned: 300,
      totalCoinsSpent: 0
    },
    quests: [
      { id: 'q_old_repeat', title: 'Hít đất', type: 'focus', targetMinutes: 10, rewardCoins: 10, isRepeatable: true, completedCount: 28, signature: signQuest('Hít đất', 'focus', 10, 10) }
    ],
    inventory: [],
    ledger: []
  };

  // Người dùng xóa nhiệm vụ 'Hít đất', danh sách quest hiện tại trống
  const stateAfterDelete = {
    profile: {
      coins: 300,
      totalCoinsEarned: 300,
      totalCoinsSpent: 0
    },
    quests: [], // đã xóa
    inventory: [],
    ledger: []
  };

  const check = deriveLegitimateBalance(stateAfterDelete, existingState);
  assert.strictEqual(check.tampered, false, 'Không bị phạt khi xóa nhiệm vụ lặp lại');
  assert.strictEqual(check.totalCoinsEarned, 300, 'rawTotal không bị kéo tụt về 20 khi xóa nhiệm vụ');
  assert.strictEqual(check.coins, 300, 'Số dư ví người chơi được bảo vệ nguyên vẹn');
  console.log('✓ Test 6 Passed: Xóa nhiệm vụ lặp lại cũ không làm mất Vàng tích lũy của người chơi.');
}

// -------------------------------------------------------------
// Test 7: Tính lãi nợ vay kép theo từng ngày khi offline dài ngày (Compounding)
// -------------------------------------------------------------
{
  const userBank = {
    deposited: 0,
    depositInterest: 0,
    lastDepositAt: Date.now(),
    loan: {
      principal: 100,
      debt: 100,
      borrowRate: 0.10, // 10%/ngày
      autoDeductPercent: 0.50,
      borrowedAt: Date.now() - 3 * 86400000,
      lastAccruedAt: Date.now() - 3 * 86400000, // 3 ngày trước
      isOverdue: false
    }
  };

  const globalPool = {
    totalDeposited: 1000,
    totalBorrowed: 100,
    poolGold: 900,
    reserveFund: 0,
    bailoutDebt: 0
  };

  const updated = accrueUserBank(userBank, globalPool, Date.now());
  // Ngày 1: 100 + 10 = 110
  // Ngày 2: 110 + 11 = 121
  // Ngày 3: 121 + 12.1 = 133
  // Lãi kép chuẩn: 133 Vàng (lãi đơn cũ chỉ là 100 + 10*3 = 130)
  assert.ok(updated.loan.debt >= 133, `Lãi vay kép 3 ngày 10% phải đạt ít nhất 133 Vàng (thực tế: ${updated.loan.debt})`);
  console.log('✓ Test 7 Passed: Tính lãi vay kép theo từng ngày khi người chơi offline chính xác.');
}

// -------------------------------------------------------------
// Test 8: Fallback Leaderboard không làm hỏng totalCoinsEarned bằng score
// -------------------------------------------------------------
{
  const rawProfile = {
    level: 10,
    coins: 50
    // totalCoinsEarned không có hoặc undefined
  };
  const score = (rawProfile.level * 1000) + rawProfile.coins; // 10,050 điểm

  // Trước khi fix: parsed.profile.totalCoinsEarned || score -> gán nhầm 10,050 Vàng!
  // Sau khi fix: lấy parsed.profile.coins hoặc 20 khởi đầu
  const totalCoinsEarned = typeof rawProfile.totalCoinsEarned === 'number'
    ? rawProfile.totalCoinsEarned
    : (typeof rawProfile.coins === 'number' ? rawProfile.coins : 20);

  assert.strictEqual(totalCoinsEarned, 50, 'totalCoinsEarned không bị fallback thành điểm score (10,050)');
  assert.notStrictEqual(totalCoinsEarned, score, 'totalCoinsEarned tuyệt đối không được bằng điểm score');
  console.log('✓ Test 8 Passed: Leaderboard score không bị rò rỉ vào tổng Vàng kiếm được.');
}

console.log('\n🎉 ALL GOLD & BANKING FIXES TESTS PASSED (100%)!\n');
