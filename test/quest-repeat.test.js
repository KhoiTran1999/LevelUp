import assert from 'node:assert';

// Core domain logic tests for Repeatable vs One-time Quests

function handleCompleteQuest(quest, profile) {
  if (quest.isRepeatable) {
    quest.completedCount = (quest.completedCount || 0) + 1;
    quest.lastCompletedAt = 1000;
  } else {
    quest.status = 'completed';
    quest.completedAt = 1000;
  }
  profile.coins += quest.rewardCoins;
  profile.totalCoinsEarned += quest.rewardCoins;
  profile.exp += quest.rewardCoins * 3;
}

function handleUndoCompleteQuest(quest, profile) {
  if (quest.isRepeatable) {
    quest.completedCount = Math.max(0, (quest.completedCount || 1) - 1);
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

// Test 2: Repeatable quest completion (runs multiple times)
{
  const profile = { coins: 10, totalCoinsEarned: 10, exp: 0 };
  const quest = { id: 'q2', title: 'Task lặp lại', rewardCoins: 15, isRepeatable: true, completedCount: 0, status: 'active' };

  // Lần 1
  handleCompleteQuest(quest, profile);
  assert.strictEqual(quest.status, 'active', 'Nhiệm vụ lặp lại phải giữ nguyên status active');
  assert.strictEqual(quest.completedCount, 1);
  assert.strictEqual(profile.coins, 25);

  // Lần 2
  handleCompleteQuest(quest, profile);
  assert.strictEqual(quest.status, 'active');
  assert.strictEqual(quest.completedCount, 2);
  assert.strictEqual(profile.coins, 40);
  assert.strictEqual(profile.exp, 90);
  console.log('✓ Test 2: Nhiệm vụ lặp lại chạy nhiều lần giữ nguyên active và cộng dồn thưởng.');
}

// Test 3: Undo for repeatable quest
{
  const profile = { coins: 40, totalCoinsEarned: 40, exp: 90 };
  const quest = { id: 'q2', title: 'Task lặp lại', rewardCoins: 15, isRepeatable: true, completedCount: 2, status: 'active' };

  handleUndoCompleteQuest(quest, profile);
  assert.strictEqual(quest.completedCount, 1);
  assert.strictEqual(profile.coins, 25);
  assert.strictEqual(profile.exp, 45);
  assert.strictEqual(quest.status, 'active');
  console.log('✓ Test 3: Hoàn tác nhiệm vụ lặp lại trừ tiền và giảm completedCount an toàn.');
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
