import assert from 'node:assert/strict';
import test from 'node:test';

import { signQuest, verifyQuestSignature } from '@/lib/server/crypto';
import { calculateBankRates, formatBankDayHourCountdown } from '@/lib/server/bank-math';
import { isStorageConfigured } from '@/lib/server/storage';
import { calculateRank, evaluateTextProofHeuristics } from '@/lib/server/ai-heuristics';

test('lib/server modules export cohesive typed APIs', () => {
  // 1. Crypto HMAC
  const sig = signQuest('Quest Test', 'focus', 25, 10);
  assert.equal(typeof sig, 'string');
  assert.ok(sig.length > 0);
  assert.equal(verifyQuestSignature({ title: 'Quest Test', type: 'focus', targetMinutes: 25, rewardCoins: 10, signature: sig }), true);

  // 2. Bank Math
  const rates = calculateBankRates({ poolGold: 500, totalBorrowed: 100 });
  assert.equal(typeof rates.depositRate, 'number');
  assert.equal(typeof rates.borrowRate, 'number');
  assert.equal(formatBankDayHourCountdown(3600000), '1 giờ');

  // 3. Storage
  assert.equal(typeof isStorageConfigured(), 'boolean');

  // 4. AI Heuristics
  assert.equal(calculateRank(40), 'S');
  const heuristicResult = evaluateTextProofHeuristics('Title', 'xong');
  assert.equal(heuristicResult?.approved, false);
});
