import assert from 'node:assert';

// 1. Concurrency / Re-entrancy guard test for Complete button
function createCompleteLock() {
  const completingQuestIds = new Set();
  return {
    tryLock(id) {
      if (completingQuestIds.has(id)) return false;
      completingQuestIds.add(id);
      return true;
    },
    unlock(id) {
      completingQuestIds.delete(id);
    },
    isLocked(id) {
      return completingQuestIds.has(id);
    }
  };
}

// 2. Multi-level EXP propagation
function calculateLevelProgression(initialLevel, initialExp, addedExp) {
  let level = initialLevel;
  let exp = initialExp + addedExp;
  let levelsGained = 0;
  while (exp >= level * 100) {
    exp -= level * 100;
    level++;
    levelsGained++;
  }
  return { level, exp, levelsGained };
}

// 3. Quest completion rollback (undo) math
function rollbackQuestCompletion(profile, quest) {
  const currentCoins = profile.coins;
  const coinsToRemove = Math.min(currentCoins, quest.rewardCoins);
  const newCoins = Math.max(0, currentCoins - coinsToRemove);
  const newExp = Math.max(0, profile.exp - quest.rewardExp);
  const newLifetimeCoins = Math.max(0, (profile.totalCoinsEarned || 0) - quest.rewardCoins);
  return {
    ...profile,
    coins: newCoins,
    exp: newExp,
    totalCoinsEarned: newLifetimeCoins
  };
}

// 4. Shop refund and rollback math
function processShopRefund(profile, itemPrice) {
  return {
    ...profile,
    coins: profile.coins + itemPrice
  };
}

// 5. Timer Start Edge Case Logic
function determineStartAction(activeQuest, newQuest, isBreakMode, isRunning) {
  if (activeQuest && activeQuest.id === newQuest.id) {
    if (isRunning) return 'ALREADY_RUNNING';
    return 'PROMPT_RESUME';
  }
  if (isBreakMode) return 'PROMPT_OVERWRITE_BREAK';
  if (activeQuest && activeQuest.id !== newQuest.id) return 'PROMPT_SWITCH_QUEST';
  return 'PROMPT_START';
}

// 6. Reward Duration Parser
function extractRewardDuration(item) {
  if (item.targetMinutes && item.targetMinutes > 0) return item.targetMinutes;
  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  const hourMatch = text.match(/(\d+)\s*(tiếng|giờ|hour|h)\b/i);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
  const minMatch = text.match(/(\d+)\s*(phút|min|p)\b/i);
  if (minMatch) return parseInt(minMatch[1], 10);
  if (item.tier === 'common') return 15;
  if (item.tier === 'rare') return 30;
  if (item.tier === 'epic') return 60;
  if (item.tier === 'legendary') return 90;
  return 25;
}

// 7. Reward Timer Action Logic Matrix
function determineRewardStartAction(activeQuest, isBreakMode, activeReward, targetItem, isRunning) {
  if (activeReward && activeReward.id === targetItem.id) {
    if (isRunning) return 'ALREADY_RUNNING';
    return 'PROMPT_RESUME';
  }
  if (targetItem.isUsed) return 'ALREADY_USED';
  if (activeQuest) return 'PROMPT_STOP_QUEST';
  if (isBreakMode) return 'PROMPT_OVERWRITE_BREAK';
  if (activeReward && activeReward.id !== targetItem.id) return 'PROMPT_SWITCH_REWARD';
  return 'PROMPT_START_REWARD';
}

async function runActionAndUndoTests() {
  console.log('--- Bắt đầu kiểm thử Edge Cases, Confirmation & Undo Logic ---');

  // Test 1: Race Condition / Double-Click Lock on Complete
  const lock = createCompleteLock();
  assert.strictEqual(lock.tryLock('q-1'), true, 'Lần click đầu tiên phải lấy được lock');
  assert.strictEqual(lock.tryLock('q-1'), false, 'Click đúp hoặc click đồng thời phải bị chặn hoàn toàn');
  assert.strictEqual(lock.tryLock('q-2'), true, 'Nhiệm vụ khác vẫn có thể hoàn thành độc lập');
  lock.unlock('q-1');
  assert.strictEqual(lock.tryLock('q-1'), true, 'Sau khi unlock phải thực hiện lại được');
  console.log('✓ Test 1: Concurrency lock chặn double click thành công.');

  // Test 2: Multi-level EXP gain
  const res1 = calculateLevelProgression(1, 0, 90);
  assert.strictEqual(res1.level, 1);
  assert.strictEqual(res1.exp, 90);
  assert.strictEqual(res1.levelsGained, 0);

  // Level 1 needs 100 EXP -> gains 350 EXP -> Level 1 (100) -> Level 2 (200) -> 50 exp remaining (Level 3)
  const res2 = calculateLevelProgression(1, 0, 350);
  assert.strictEqual(res2.level, 3);
  assert.strictEqual(res2.exp, 50);
  assert.strictEqual(res2.levelsGained, 2, 'Phải nhảy vọt 2 cấp khi nhận lượng EXP lớn');
  console.log('✓ Test 2: Multi-level EXP progression tính toán chính xác.');

  // Test 3: Quest completion and undo rollback
  const quest = { id: 'q-math', title: 'Học Toán', rewardCoins: 80, rewardExp: 100 };
  const initialProfile = { coins: 150, exp: 120, totalCoinsEarned: 300, level: 2 };

  const rolledBack = rollbackQuestCompletion(initialProfile, quest);
  assert.strictEqual(rolledBack.coins, 70, 'Coins phải bị trừ đúng số tiền thưởng');
  assert.strictEqual(rolledBack.exp, 20, 'EXP phải bị hoàn trả');
  assert.strictEqual(rolledBack.totalCoinsEarned, 220, 'Tổng vàng kiếm được phải giảm tương ứng');

  // Clamping test: player spent coins so coins < rewardCoins
  const poorProfile = { coins: 30, exp: 50, totalCoinsEarned: 80, level: 1 };
  const clampedRollback = rollbackQuestCompletion(poorProfile, quest);
  assert.strictEqual(clampedRollback.coins, 0, 'Vàng không bao giờ được âm, phải clamp về 0');
  assert.strictEqual(clampedRollback.exp, 0, 'EXP không bao giờ được âm, phải clamp về 0');
  console.log('✓ Test 3: Hoàn tác nhiệm vụ và cơ chế chống âm tiền (Balance Clamping) an toàn.');

  // Test 4: Shop refund logic
  const afterRefund = processShopRefund({ coins: 40 }, 50);
  assert.strictEqual(afterRefund.coins, 90, 'Hoàn trả quà trong kho phải cộng lại đủ vàng');
  console.log('✓ Test 4: Trả quà (Shop refund) hoàn tiền chính xác.');

  // Test 5: Timer start edge cases
  const qActive = { id: 'q-10' };
  const qOther = { id: 'q-20' };

  // Case 5a: Same quest already running
  assert.strictEqual(determineStartAction(qActive, qActive, false, true), 'ALREADY_RUNNING');
  // Case 5b: Same quest paused
  assert.strictEqual(determineStartAction(qActive, qActive, false, false), 'PROMPT_RESUME');
  // Case 5c: In break mode, trying to start quest
  assert.strictEqual(determineStartAction(null, qOther, true, false), 'PROMPT_OVERWRITE_BREAK');
  // Case 5d: Switching quest
  assert.strictEqual(determineStartAction(qActive, qOther, false, true), 'PROMPT_SWITCH_QUEST');
  // Case 5e: Normal start
  assert.strictEqual(determineStartAction(null, qOther, false, false), 'PROMPT_START');
  console.log('✓ Test 5: Tất cả các nhánh Edge Case của nút Bắt Đầu được nhận diện chính xác.');

  // Test 6: Dynamic Reward Duration Parser
  assert.strictEqual(extractRewardDuration({ name: 'Chơi game 45 phút', tier: 'common' }), 45, 'Phải parse được 45 phút từ tên');
  assert.strictEqual(extractRewardDuration({ name: 'Xem phim', description: 'Thư giãn 2 tiếng cuối tuần' }), 120, 'Phải parse được 2 tiếng thành 120 phút');
  assert.strictEqual(extractRewardDuration({ name: 'Nghỉ ngơi 1h30p', targetMinutes: 90 }), 90, 'Phải ưu tiên targetMinutes nếu có');
  assert.strictEqual(extractRewardDuration({ name: 'Cà phê', tier: 'rare' }), 30, 'Tier rare không có số phút phải mặc định 30p');
  assert.strictEqual(extractRewardDuration({ name: 'Du lịch', tier: 'legendary' }), 90, 'Tier legendary mặc định 90p');
  console.log('✓ Test 6: Trích xuất thời lượng phần thưởng (Reward Duration Parser) chính xác.');

  // Test 7: Reward Timer Start Conflict & State Transitions
  const r1 = { id: 'inv-1', name: 'Đọc truyện', isUsed: false };
  const r2 = { id: 'inv-2', name: 'Nghe nhạc', isUsed: false };
  const rUsed = { id: 'inv-3', name: 'Ăn kem', isUsed: true };

  // Case 7a: Same reward already running
  assert.strictEqual(determineRewardStartAction(null, false, r1, r1, true), 'ALREADY_RUNNING');
  // Case 7b: Same reward paused
  assert.strictEqual(determineRewardStartAction(null, false, r1, r1, false), 'PROMPT_RESUME');
  // Case 7c: Target item already marked used
  assert.strictEqual(determineRewardStartAction(null, false, null, rUsed, false), 'ALREADY_USED');
  // Case 7d: Focus quest running -> must prompt stop quest
  assert.strictEqual(determineRewardStartAction(qActive, false, null, r1, true), 'PROMPT_STOP_QUEST');
  // Case 7e: In break mode -> must prompt overwrite break
  assert.strictEqual(determineRewardStartAction(null, true, null, r1, false), 'PROMPT_OVERWRITE_BREAK');
  // Case 7f: Another reward is currently running -> must prompt switch reward
  assert.strictEqual(determineRewardStartAction(null, false, r1, r2, true), 'PROMPT_SWITCH_REWARD');
  // Case 7g: Normal reward start
  assert.strictEqual(determineRewardStartAction(null, false, null, r1, false), 'PROMPT_START_REWARD');
  console.log('✓ Test 7: Ma trận chuyển trạng thái và xung đột bộ đếm Dùng Quà chính xác.');

  // Test 8: Active Reward Cleanup on Undo and Refund
  let activeRewardSession = { id: 'inv-1' };
  const clearSession = (invId) => {
    if (activeRewardSession && activeRewardSession.id === invId) {
      activeRewardSession = null;
    }
  };
  clearSession('inv-2');
  assert.notStrictEqual(activeRewardSession, null, 'Không được xóa session nếu ID không khớp');
  clearSession('inv-1');
  assert.strictEqual(activeRewardSession, null, 'Phải hủy bỏ phiên đếm giờ khi hoàn tác/hoàn trả phần thưởng đang chạy');
  console.log('✓ Test 8: Hủy phiên timer khi hoàn tác hoặc trả quà hoạt động an toàn.');

  console.log('\n🎉 TẤT CẢ UNIT TESTS CHO ACTIONS, CONFIRMATION & UNDO ĐÃ VƯỢT QUA!');
}

runActionAndUndoTests();
