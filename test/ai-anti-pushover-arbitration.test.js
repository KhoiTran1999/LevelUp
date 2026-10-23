import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runDeterministicQuestDebate,
  runDeterministicRewardDebate,
  runDeterministicLoanDebate,
  sanitizeQuestDebateOptions,
  sanitizeRewardDebateOptions,
  sanitizeLoanDebateOptions
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

test('5. Bank Loan AI Arbiter protects treasury & disciplines borrowing (Anti-Pushover)', () => {
  const loan = {
    amount: 30,
    borrowRate: 0.05,
    autoDeductPercent: 0.50,
    creditLimit: 50
  };
  const macro = {
    standardBorrowRate: 0.05,
    depositFloor: 0.015,
    liquidityStatus: 'normal'
  };

  // Case 5a: New user (level 1, streak 0) asks for lower interest rate
  const newUserRateCut = runDeterministicLoanDebate(
    loan,
    'Giảm lãi suất cho mình với bạn ơi',
    'user_new',
    macro,
    null,
    { level: 1, streak: 0 }
  );
  assert.strictEqual(newUserRateCut.accepted, false, 'Người dùng mới chưa có uy tín không được giảm lãi suất');
  assert.ok(newUserRateCut.reply.includes('Cấp 2') || newUserRateCut.reply.includes('chuỗi'), 'Thông báo điều kiện giảm lãi');

  // Case 5b: User demands 0% interest rate
  const zeroInterestDemand = runDeterministicLoanDebate(
    loan,
    'Cho mình vay lãi suất 0% được không?',
    'user_loyal',
    macro,
    null,
    { level: 3, streak: 10 }
  );
  assert.ok(zeroInterestDemand.newBorrowRate >= 0.015, 'Lãi suất không bao giờ được giảm về 0% (sàn bảo vệ tối thiểu 1.5%/ngày)');

  // Case 5c: Qualified user (streak >= 2) gets fair rate reduction clamped by floor
  const loyalUserRateCut = runDeterministicLoanDebate(
    loan,
    'Mình có chuỗi chăm chỉ tốt, xin giảm lãi suất nhé',
    'user_loyal',
    macro,
    null,
    { level: 2, streak: 5 }
  );
  assert.strictEqual(loyalUserRateCut.accepted, true, 'Người dùng có uy tín được duyệt giảm lãi suất');
  assert.ok(loyalUserRateCut.newBorrowRate < loan.borrowRate, 'Lãi suất mới phải thấp hơn lãi ban đầu');
  assert.ok(loyalUserRateCut.newBorrowRate >= macro.depositFloor, 'Lãi suất không được thấp hơn sàn bảo vệ kho bạc');

  // Case 5d: User requests borrow amount exceeding credit limit
  const excessiveAmount = runDeterministicLoanDebate(
    loan,
    'Cho mình vay 100 Vàng nhé',
    'user_lvl1',
    macro,
    null,
    { level: 1, streak: 0 }
  );
  assert.strictEqual(excessiveAmount.accepted, false, 'Không cho phép vay vượt quá hạn mức tín dụng');
  assert.ok(excessiveAmount.reply.includes('hạn mức'), 'Thông báo vượt hạn mức');

  // Case 5e: User at limit ceiling requests limit increase
  const limitAtCeiling = runDeterministicLoanDebate(
    { ...loan, creditLimit: 50 },
    'Nâng hạn mức vay cho mình với',
    'user_lvl1',
    macro,
    null,
    { level: 1, streak: 1 }
  );
  assert.strictEqual(limitAtCeiling.accepted, false, 'Cấp 1 không được nâng hạn mức vượt trần 50 Vàng');
});

test('6. Option Sanitizers filter out pushover options across all 3 domains', () => {
  // 6a. Quest Sanitizer: strips options keeping time and increasing coins without dual proof
  const dirtyQuestOpts = [
    { id: 1, label: 'Giữ 25 phút, nhận 15 Vàng', newTargetMinutes: 25, newRewardCoins: 15 },
    { id: 2, label: '25 phút nhận 18 Vàng', newTargetMinutes: 25, newRewardCoins: 18 },
    { id: 3, label: '35 phút nhận 16 Vàng', newTargetMinutes: 35, newRewardCoins: 16 }
  ];
  const cleanQuestOpts = sanitizeQuestDebateOptions(dirtyQuestOpts, 25, 12, 'text');
  for (const opt of cleanQuestOpts) {
    if (opt.newTargetMinutes <= 25) {
      assert.ok(opt.newRewardCoins <= 14, 'Không phương án nào <= 25 phút được vượt quá trần 14 Vàng');
    }
  }

  // 6b. Reward Sanitizer: strips price cuts without reducing duration or below floor
  const dirtyRewardOpts = [
    { id: 1, label: '60 phút - 10 Vàng', newTargetMinutes: 60, newPrice: 10 },
    { id: 2, label: 'Miễn phí 0 Vàng', newTargetMinutes: 30, newPrice: 0 },
    { id: 3, label: '30 phút - 25 Vàng', newTargetMinutes: 30, newPrice: 25 }
  ];
  const cleanRewardOpts = sanitizeRewardDebateOptions(dirtyRewardOpts, 50, 60);
  for (const opt of cleanRewardOpts) {
    assert.ok(opt.newPrice >= 5, 'Giá không được nhỏ hơn sàn tối thiểu 5 Vàng');
    if (opt.newPrice < 50) {
      assert.ok(opt.newTargetMinutes < 60, 'Giảm giá bắt buộc phải giảm thời lượng');
    }
  }

  // 6c. Loan Sanitizer: strips below-floor interest or invalid auto-deduct percentages
  const dirtyLoanOpts = [
    { id: 1, label: 'Lãi 0%', newBorrowRate: 0.0, newAutoDeductPercent: 0.5, newCreditLimit: 50 },
    { id: 2, label: 'Trích nợ 10%', newBorrowRate: 0.03, newAutoDeductPercent: 0.10, newCreditLimit: 50 },
    { id: 3, label: 'Nâng hạn mức lên 200', newBorrowRate: 0.03, newAutoDeductPercent: 0.5, newCreditLimit: 200 },
    { id: 4, label: 'Gói an toàn chuẩn', newBorrowRate: 0.03, newAutoDeductPercent: 0.5, newCreditLimit: 60 }
  ];
  const cleanLoanOpts = sanitizeLoanDebateOptions(dirtyLoanOpts, 30, 0.05, 50, 0.5, 0.015);
  for (const opt of cleanLoanOpts) {
    assert.ok(opt.newBorrowRate >= 0.015, 'Lãi suất không được thấp hơn sàn bảo vệ 1.5%');
    assert.ok(opt.newAutoDeductPercent >= 0.30, 'Trích nợ tối thiểu 30%');
    assert.ok(opt.newCreditLimit <= 75, 'Hạn mức không được tăng vọt quá +25 Vàng');
  }
});

test('7. Exact user-reported exploit regression test: cannot escalate 25m focus reward repeatedly', () => {
  const questAt12 = {
    title: 'Tập trung hoàn thành từng bước một',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 12,
    requiresProof: true,
    proofType: 'text'
  };

  // User repeatedly asks for more coins for the same 25m task:
  const exploitAttempt = runDeterministicQuestDebate(
    questAt12,
    'Nhiệm vụ này cần nhiều nỗ lực và thời gian hơn, mình xin tăng thêm một ít Vàng được không?'
  );

  assert.strictEqual(exploitAttempt.accepted, false, 'AI tuyệt đối KHÔNG được duyệt tăng Vàng cho nhiệm vụ 25p đã đạt 12 Vàng');
  assert.ok(Array.isArray(exploitAttempt.options) && exploitAttempt.options.length >= 2);

  // Every suggested option must require more minutes if coins are increased (unless one-time dual proof bonus):
  for (const opt of exploitAttempt.options) {
    if (opt.newRewardCoins > 12) {
      const isDualProof = opt.newProofType === 'both' && opt.newRewardCoins <= 14;
      const isIncreasedTime = opt.newTargetMinutes >= 35;
      assert.ok(isDualProof || isIncreasedTime, 'Tăng Vàng bắt buộc phải nâng thời gian tập trung lên >= 35 phút hoặc nâng cấp bằng chứng kép');
    }
  }

  // And if user has already upgraded to both proof (+2 bonus already claimed):
  const questAtBoth = { ...questAt12, proofType: 'both', rewardCoins: 14 };
  const exploitAttemptBoth = runDeterministicQuestDebate(
    questAtBoth,
    'Nhiệm vụ này cần nhiều nỗ lực và thời gian hơn, mình xin tăng thêm một ít Vàng được không?'
  );
  assert.strictEqual(exploitAttemptBoth.accepted, false);
  for (const opt of exploitAttemptBoth.options) {
    if (opt.newRewardCoins > 14) {
      assert.ok(opt.newTargetMinutes >= 35, 'Khi đã là bằng chứng kép, tăng Vàng bắt buộc phải nâng thời gian');
    }
  }
});
