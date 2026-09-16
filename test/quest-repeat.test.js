import assert from 'node:assert';

// Core domain logic tests for Repeatable vs One-time Quests with 10-minute cooldown
const QUEST_REPEAT_COOLDOWN_MS = 10 * 60 * 1000;

function getQuestRepeatCooldownRemaining(quest, now = Date.now()) {
  if (!quest?.isRepeatable || !quest?.lastCompletedAt) return 0;
  return Math.max(0, QUEST_REPEAT_COOLDOWN_MS - (now - quest.lastCompletedAt));
}

function handleCompleteQuest(quest, profile, now = 1000) {
  if (quest.isRepeatable && getQuestRepeatCooldownRemaining(quest, now) > 0) {
    return false;
  }
  if (quest.isRepeatable) {
    quest.completedCount = (quest.completedCount || 0) + 1;
    quest.lastCompletedAt = now;
  } else {
    quest.status = 'completed';
    quest.completedAt = now;
  }
  profile.coins += quest.rewardCoins;
  profile.totalCoinsEarned += quest.rewardCoins;
  profile.exp += quest.rewardCoins * 3;
  return true;
}

function handleUndoCompleteQuest(quest, profile) {
  if (quest.isRepeatable) {
    quest.completedCount = Math.max(0, (quest.completedCount || 1) - 1);
    delete quest.lastCompletedAt;
  } else {
    quest.status = 'active';
    delete quest.completedAt;
  }
  profile.coins = Math.max(0, profile.coins - quest.rewardCoins);
  profile.totalCoinsEarned = Math.max(0, profile.totalCoinsEarned - quest.rewardCoins);
  profile.exp = Math.max(0, profile.exp - quest.rewardCoins * 3);
}

function handleRestartQuest(quest) {
  quest.status = 'active';
  delete quest.completedAt;
}

function handleToggleRepeatable(quest) {
  quest.isRepeatable = !quest.isRepeatable;
}

console.log('--- Bắt đầu kiểm thử Logic Nhiệm Vụ Lặp Lại & Làm 1 Lần ---');

// Test 1: One-time quest completion
{
  const profile = { coins: 10, totalCoinsEarned: 10, exp: 0 };
  const quest = { id: 'q1', title: 'Task 1 lần', rewardCoins: 10, isRepeatable: false, status: 'active' };
  handleCompleteQuest(quest, profile);

  assert.strictEqual(quest.status, 'completed', 'Nhiệm vụ 1 lần phải chuyển sang completed');
  assert.strictEqual(quest.completedAt, 1000);
  assert.strictEqual(profile.coins, 20);
  assert.strictEqual(profile.exp, 30);
  console.log('✓ Test 1: Nhiệm vụ 1 lần hoàn thành chính xác.');
}

// Test 2: Repeatable quest completion with 10-minute cooldown
{
  const profile = { coins: 10, totalCoinsEarned: 10, exp: 0 };
  const quest = { id: 'q2', title: 'Task lặp lại', rewardCoins: 15, isRepeatable: true, completedCount: 0, status: 'active' };

  // Lần 1 (t = 1000)
  const res1 = handleCompleteQuest(quest, profile, 1000);
  assert.strictEqual(res1, true);
  assert.strictEqual(quest.status, 'active', 'Nhiệm vụ lặp lại phải giữ nguyên status active');
  assert.strictEqual(quest.completedCount, 1);
  assert.strictEqual(profile.coins, 25);

  // Thử hoàn thành lại ngay sau 5 giây (t = 6000) -> Phải bị chặn bởi Cooldown 10 phút!
  const spamRes = handleCompleteQuest(quest, profile, 6000);
  assert.strictEqual(spamRes, false, 'Phải chặn hoàn thành khi chưa hết 10 phút');
  assert.strictEqual(quest.completedCount, 1, 'completedCount không được tăng');
  assert.strictEqual(profile.coins, 25, 'coins không được cộng thêm');

  // Lần 2 sau đúng 10 phút (t = 1000 + 600,000) -> Thành công
  const res2 = handleCompleteQuest(quest, profile, 1000 + 600000);
  assert.strictEqual(res2, true);
  assert.strictEqual(quest.status, 'active');
  assert.strictEqual(quest.completedCount, 2);
  assert.strictEqual(profile.coins, 40);
  assert.strictEqual(profile.exp, 90);
  console.log('✓ Test 2: Nhiệm vụ lặp lại chặn spam dưới 10 phút và chỉ cộng thưởng sau khi hết cooldown.');
}

// Test 3: Undo for repeatable quest
{
  const profile = { coins: 40, totalCoinsEarned: 40, exp: 90 };
  const quest = { id: 'q2', title: 'Task lặp lại', rewardCoins: 15, isRepeatable: true, completedCount: 2, lastCompletedAt: 1000 + 600000, status: 'active' };

  handleUndoCompleteQuest(quest, profile);
  assert.strictEqual(quest.completedCount, 1);
  assert.strictEqual(quest.lastCompletedAt, undefined, 'Phải xóa lastCompletedAt để giải phóng cooldown bị bấm nhầm');
  assert.strictEqual(getQuestRepeatCooldownRemaining(quest), 0, 'Cooldown phải về 0 sau khi hoàn tác');
  assert.strictEqual(profile.coins, 25);
  assert.strictEqual(profile.exp, 45);
  assert.strictEqual(quest.status, 'active');
  console.log('✓ Test 3: Hoàn tác nhiệm vụ lặp lại trừ tiền, giảm completedCount và xóa cooldown an toàn.');
}

// Test 4: Restart completed one-time quest
{
  const quest = { id: 'q1', status: 'completed', completedAt: 1000 };
  handleRestartQuest(quest);
  assert.strictEqual(quest.status, 'active');
  assert.strictEqual(quest.completedAt, undefined);
  console.log('✓ Test 4: Làm lại nhiệm vụ hoàn thành chuyển về active thành công.');
}

// Test 5: Toggle repeatable flag
{
  const quest = { id: 'q3', isRepeatable: false };
  handleToggleRepeatable(quest);
  assert.strictEqual(quest.isRepeatable, true);
  handleToggleRepeatable(quest);
  assert.strictEqual(quest.isRepeatable, false);
  console.log('✓ Test 5: Đổi cờ lặp lại trên nhiệm vụ linh hoạt.');
}

console.log('\n🎉 TẤT CẢ UNIT TESTS CHO LOGIC NHIỆM VỤ LẶP LẠI ĐÃ VƯỢT QUA!\n');
