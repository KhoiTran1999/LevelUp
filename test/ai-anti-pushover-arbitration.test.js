import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runDeterministicQuestDebate,
  runDeterministicRewardDebate
} from '../api/ai.js';

test('1. Quest AI Arbiter stands firm against one-sided demands (Anti-Pushover)', () => {
  const focusQuest = {
    title: 'Ôn tập giải thuật cấu trúc dữ liệu',
    description: 'Học bài và luyện leetcode',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 10,
    requiresProof: true,
    proofType: 'text'
  };

  // Case 1a: User asks for more coins with no increase in time
  const askMoreCoins = runDeterministicQuestDebate(focusQuest, 'Cho mình 25 vàng đi bạn ơi');
  assert.strictEqual(askMoreCoins.accepted, false, 'AI không được dễ dãi duyệt tăng Vàng một chiều');
  assert.ok(askMoreCoins.reply.includes('kỷ luật') || askMoreCoins.reply.includes('công bằng'), 'Lời nhắn giải thích kỷ luật và công bằng');
  assert.ok(Array.isArray(askMoreCoins.options) && askMoreCoins.options.length >= 2, 'Phải đưa ra ít nhất 2 phương án đối ứng');

  // Case 1b: User asks for less time and more coins
  const lessTimeMoreCoins = runDeterministicQuestDebate(focusQuest, 'Rút ngắn còn 10 phút và cho mình 20 vàng nhé');
  assert.strictEqual(lessTimeMoreCoins.accepted, false, 'AI phải từ chối đòi hỏi vừa giảm thời gian vừa tăng Vàng');

  // Case 1c: User asks to waive timer on deep intellectual task
  const noTimerStudy = runDeterministicQuestDebate(focusQuest, 'Không cần bấm giờ cho mình 15 vàng');
  assert.strictEqual(noTimerStudy.accepted, false, 'AI phải từ chối bỏ đồng hồ cho việc học tập sâu');

  // Case 1d: Housework chore requesting absurd reward (> 5 coins)
  const choreQuest = {
    title: 'Rửa bát đĩa buổi tối',
    description: 'Rửa sạch nồi xoong và chén đĩa',
    type: 'focus',
    targetMinutes: 20,
    rewardCoins: 3
  };
  const absurdChore = runDeterministicQuestDebate(choreQuest, 'Việc này nhiều bát quá cho mình 20 vàng đi');
  assert.strictEqual(absurdChore.accepted, false, 'AI phải từ chối việc nhà đòi vượt trần 5 Vàng');
});

test('2. Quest AI Arbiter gladly accepts fair and committed trade-offs', () => {
  const focusQuest = {
    title: 'Luyện đề tiếng Anh TOEIC',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 10,
    requiresProof: true,
    proofType: 'text'
  };

  // Case 2a: User commits to higher focus duration for proportional coin increase
  const higherCommitment = runDeterministicQuestDebate(focusQuest, 'Mình cam kết tập trung 45 phút và xin nâng lên 18 vàng nhé');
  assert.strictEqual(higherCommitment.accepted, true, 'AI phải chấp thuận khi người dùng chủ động tăng nỗ lực');
  assert.strictEqual(higherCommitment.newTargetMinutes, 45);
  assert.strictEqual(higherCommitment.newRewardCoins, 18);
  assert.ok(higherCommitment.signature, 'Phải có chữ ký số HMAC');

  // Case 2b: Housework chore within reasonable cap
  const choreQuest = {
    title: 'Lau sàn nhà',
    type: 'focus',
    targetMinutes: 30,
    rewardCoins: 3
  };
  const validChore = runDeterministicQuestDebate(choreQuest, 'Việc này là việc nhà, cho mình làm không cần bấm giờ 5 Vàng nhé');
  assert.strictEqual(validChore.accepted, true);
  assert.strictEqual(validChore.newType, 'bounty');
  assert.strictEqual(validChore.newTargetMinutes, 0);
  assert.strictEqual(validChore.newRewardCoins, 5);

  // Case 2c: User chooses option proposed by AI
  const selectedOpt = {
    id: 1,
    label: 'Tập trung 35 phút (14 Vàng)',
    argument: 'Chốt 35 phút 14 Vàng',
    newTargetMinutes: 35,
    newRewardCoins: 14,
    newType: 'focus'
  };
  const optionAccept = runDeterministicQuestDebate(focusQuest, '', selectedOpt);
  assert.strictEqual(optionAccept.accepted, true);
  assert.strictEqual(optionAccept.newTargetMinutes, 35);
  assert.strictEqual(optionAccept.newRewardCoins, 14);
});

test('3. Reward AI Arbiter defends store economy against one-sided price cuts (Anti-Pushover)', () => {
  const reward = {
    name: 'Xem 1 tập phim bom tấn',
    price: 50,
    targetMinutes: 60,
    tier: 'rare'
  };

  // Case 3a: User asks to lower price without reducing duration
  const oneSidedDiscount = runDeterministicRewardDebate(reward, 'Giảm xuống 15 vàng đi bạn ơi');
  assert.strictEqual(oneSidedDiscount.accepted, false, 'AI không được tự ý giảm giá một chiều');
  assert.ok(Array.isArray(oneSidedDiscount.options) && oneSidedDiscount.options.length >= 2, 'Phải có các phương án lựa chọn');

  // Case 3b: General request for cheaper price
  const genericDiscount = runDeterministicRewardDebate(reward, 'Bớt vàng cho mình với');
  assert.strictEqual(genericDiscount.accepted, false, 'AI phải từ chối xin xỏ chung chung');

  // Case 3c: User asks to remove timer on an entertainment session
  const noTimerEntertainment = runDeterministicRewardDebate(reward, 'Không cần bấm giờ được không');
  assert.strictEqual(noTimerEntertainment.accepted, false, 'AI không cho phép bỏ hẹn giờ giải trí tùy tiện');
});

test('4. Reward AI Arbiter accepts fair trade-offs (shorter duration for lower price)', () => {
  const reward = {
    name: 'Chơi game thể thao FIFA',
    price: 60,
    targetMinutes: 60,
    tier: 'rare'
  };

  // Case 4a: User reduces both price and duration proportionately
  const fairTradeOff = runDeterministicRewardDebate(reward, 'Giảm xuống 30 vàng và 30 phút nha bạn');
  assert.strictEqual(fairTradeOff.accepted, true, 'AI phải chấp thuận khi thời gian giảm tương ứng với giá');
  assert.strictEqual(fairTradeOff.newPrice, 30);
  assert.strictEqual(fairTradeOff.newTargetMinutes, 30);
  assert.ok(fairTradeOff.signature, 'Phải có chữ ký số HMAC');

  // Case 4b: User accepts a suggested option
  const selectedOpt = {
    id: 1,
    label: 'Phương án 1: 25 phút • 25 Vàng',
    argument: 'Chốt phương án 1: 25 phút, 25 Vàng',
    newPrice: 25,
    newTargetMinutes: 25,
    newTier: 'common'
  };
  const optionAccept = runDeterministicRewardDebate(reward, '', selectedOpt);
  assert.strictEqual(optionAccept.accepted, true);
  assert.strictEqual(optionAccept.newPrice, 25);
  assert.strictEqual(optionAccept.newTargetMinutes, 25);
});
