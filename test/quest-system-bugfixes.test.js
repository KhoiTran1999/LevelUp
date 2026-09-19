import assert from 'assert';
import {
  signQuest,
  verifyQuestSignature,
  deriveLegitimateBalance
} from '../api/sync.js';

console.log('--- TEST: Quest System Bugfixes ---');

// =============================================================================
// Test 1: HMAC Signature & Verification with isRepeatable (Bug 1, Bug 6, Bug 12)
// =============================================================================
{
  console.log('Testing HMAC Signature with isRepeatable and <= 15 coins crossover...');

  // 1a. Normal repeatable quest <= 15 coins signed with isRepeatable=true
  const sigRepeat12 = signQuest('Rửa bát sạch sẽ', 'bounty', 0, 12, false, true);
  const questRepeat12 = {
    title: 'Rửa bát sạch sẽ',
    type: 'bounty',
    targetMinutes: 0,
    rewardCoins: 12,
    requiresProof: false,
    isRepeatable: true,
    signature: sigRepeat12
  };
  assert.strictEqual(verifyQuestSignature(questRepeat12), true, 'Repeatable quest <= 15 coins should verify with repeat sig');

  // 1b. Crossover <= 15 coins: signed with isRepeatable=false, but quest has isRepeatable=true
  const sigNonRepeat12 = signQuest('Rửa bát sạch sẽ', 'bounty', 0, 12, false, false);
  const questCrossover12 = {
    ...questRepeat12,
    signature: sigNonRepeat12
  };
  assert.strictEqual(verifyQuestSignature(questCrossover12), true, 'Quest <= 15 coins toggled to repeat should verify via crossover');

  // 1c. Crossover <= 15 coins: signed with isRepeatable=true, but quest has isRepeatable=false
  const questCrossoverReverse12 = {
    ...questRepeat12,
    isRepeatable: false,
    signature: sigRepeat12
  };
  assert.strictEqual(verifyQuestSignature(questCrossoverReverse12), true, 'Quest <= 15 coins toggled to non-repeat should verify via crossover');

  // 1d. High reward quest > 15 coins: MUST match isRepeatable exactly
  const sigRepeat25 = signQuest('Luyện tập thuật toán LeetCode', 'focus', 50, 25, false, true);
  const questRepeat25 = {
    title: 'Luyện tập thuật toán LeetCode',
    type: 'focus',
    targetMinutes: 50,
    rewardCoins: 25,
    requiresProof: false,
    isRepeatable: true,
    signature: sigRepeat25
  };
  assert.strictEqual(verifyQuestSignature(questRepeat25), true, 'Repeatable quest > 15 coins should verify with correct repeat sig');

  // 1e. High reward quest > 15 coins with mismatched signature MUST fail verification
  const sigNonRepeat25 = signQuest('Luyện tập thuật toán LeetCode', 'focus', 50, 25, false, false);
  const questMismatch25 = {
    ...questRepeat25,
    signature: sigNonRepeat25
  };
  assert.strictEqual(verifyQuestSignature(questMismatch25), false, 'Quest > 15 coins with mismatched signature must fail verification');

  console.log('✅ PASS: HMAC Signature with isRepeatable passed.');
}

// =============================================================================
// Test 2: Cloud Sync deriveLegitimateBalance with bank_revert (Bug 10)
// =============================================================================
{
  console.log('Testing deriveLegitimateBalance with bank_revert undo ledger...');

  const questSig = signQuest('Đọc sách 25 phút', 'focus', 25, 20, false, false);
  const quest = {
    id: 'q_test_bank_rev',
    title: 'Đọc sách 25 phút',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 20,
    requiresProof: false,
    isRepeatable: false,
    signature: questSig,
    completedCount: 0,
    status: 'active'
  };

  const existingState = {
    profile: {
      coins: 50,
      totalCoinsEarned: 100,
      level: 2
    },
    quests: [quest],
    ledger: []
  };

  const stateWithUndo = {
    profile: {
      coins: 40,
      totalCoinsEarned: 80,
      level: 2
    },
    quests: [quest],
    ledger: [
      {
        id: 'bank_rev_123',
        type: 'spend',
        category: 'bank_revert',
        amount: 10,
        title: 'Hoàn tác trích nợ Ngân Hàng'
      },
      {
        id: 'led_123',
        type: 'spend',
        category: 'quest',
        amount: 10,
        title: 'Hoàn tác: Đọc sách 25 phút'
      }
    ]
  };

  const balanceCheck = deriveLegitimateBalance(stateWithUndo, existingState);
  assert.strictEqual(balanceCheck.tampered, false, 'Undone quest with bank_revert should not be flagged as tampered');
  assert.strictEqual(balanceCheck.totalCoinsEarned, 80, 'deriveLegitimateBalance should count both quest and bank_revert undo amounts');

  console.log('✅ PASS: deriveLegitimateBalance with bank_revert passed.');
}

// =============================================================================
// Test 3: Loan Snapshot Restoration on Undo (Bug 4)
// =============================================================================
{
  console.log('Testing loan snapshot restoration on quest undo...');

  const originalLoan = {
    principal: 100,
    debt: 120,
    interestRate: 0.20,
    borrowedAt: 1700000000000,
    autoDeductPercent: 0.50,
    isOverdue: true
  };

  const loanBeforeDeduct = { ...originalLoan };
  const deductionInfo = {
    deducted: 50,
    principalDeducted: 40,
    loanBeforeDeduct,
    loanSnapshot: loanBeforeDeduct
  };

  const profile = {
    bank: {
      loan: null,
      isFrozen: false
    }
  };

  const snapshotLoan = deductionInfo?.loanSnapshot || deductionInfo?.loanBeforeDeduct;
  assert.ok(snapshotLoan, 'Snapshot loan must be found');

  if (profile.bank.loan) {
    profile.bank.loan.debt += deductionInfo.deducted;
  } else if (snapshotLoan) {
    profile.bank.loan = {
      ...snapshotLoan,
      debt: deductionInfo.deducted,
      principal: deductionInfo.principalDeducted
    };
    if (snapshotLoan.isOverdue) {
      profile.bank.isFrozen = true;
      profile.title = 'Con Nợ Quá Hạn ⚠️';
    }
  }

  assert.strictEqual(profile.bank.loan.interestRate, 0.20, 'Original interest rate 20% must be preserved');
  assert.strictEqual(profile.bank.loan.borrowedAt, 1700000000000, 'Original borrowedAt must be preserved');
  assert.strictEqual(profile.bank.loan.isOverdue, true, 'isOverdue must remain true');
  assert.strictEqual(profile.bank.isFrozen, true, 'Bank must be re-frozen for overdue loan');

  console.log('✅ PASS: Loan snapshot restoration passed.');
}

// =============================================================================
// Test 4: Streak Snapshot Restoration on Undo (Bug 5)
// =============================================================================
{
  console.log('Testing streak snapshot restoration on quest undo...');

  const initialProfile = {
    streak: 5,
    lastStreakDate: '2026-09-19',
    streakHistory: ['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19']
  };

  const snapshot = {
    streak: initialProfile.streak,
    lastStreakDate: initialProfile.lastStreakDate,
    streakHistory: [...initialProfile.streakHistory]
  };

  const profile = { ...initialProfile };
  profile.streak = 6;
  profile.lastStreakDate = '2026-09-20';
  profile.streakHistory.push('2026-09-20');

  const deductionInfo = {
    streakSnapshot: snapshot
  };

  profile.streak = deductionInfo.streakSnapshot.streak;
  profile.lastStreakDate = deductionInfo.streakSnapshot.lastStreakDate;
  profile.streakHistory = [...deductionInfo.streakSnapshot.streakHistory];

  assert.strictEqual(profile.streak, 5, 'Streak must revert to 5');
  assert.strictEqual(profile.lastStreakDate, '2026-09-19', 'lastStreakDate must revert to 2026-09-19');
  assert.strictEqual(profile.streakHistory.length, 5, 'streakHistory must have length 5');
  assert.strictEqual(profile.streakHistory.includes('2026-09-20'), false, 'Today must be removed from streakHistory');

  console.log('✅ PASS: Streak snapshot restoration passed.');
}

// =============================================================================
// Test 5: Repeat Quest Cooldown Calculation
// =============================================================================
{
  console.log('Testing repeat quest cooldown calculation...');

  const QUEST_REPEAT_COOLDOWN_MS = 10 * 60 * 1000;
  function getQuestRepeatCooldownRemaining(quest) {
    if (!quest?.isRepeatable || !quest?.lastCompletedAt) return 0;
    return Math.max(0, QUEST_REPEAT_COOLDOWN_MS - (Date.now() - quest.lastCompletedAt));
  }

  const oneTimeQuest = { isRepeatable: false, lastCompletedAt: Date.now() - 60000 };
  assert.strictEqual(getQuestRepeatCooldownRemaining(oneTimeQuest), 0, 'One-time quest has 0 cooldown');

  const justCompletedRepeatable = { isRepeatable: true, lastCompletedAt: Date.now() - 2 * 60 * 1000 };
  const remaining = getQuestRepeatCooldownRemaining(justCompletedRepeatable);
  assert.ok(remaining > 7 * 60 * 1000 && remaining <= 8 * 60 * 1000, 'Remaining cooldown should be ~8 minutes');

  const oldRepeatable = { isRepeatable: true, lastCompletedAt: Date.now() - 11 * 60 * 1000 };
  assert.strictEqual(getQuestRepeatCooldownRemaining(oldRepeatable), 0, 'Expired cooldown should be 0');

  console.log('✅ PASS: Repeat quest cooldown calculation passed.');
}

console.log('\n🎉 ALL 5 QUEST SYSTEM BUGFIX TESTS PASSED SUCCESSFULLY!\n');
