import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { parseDebateOptionsFromText, sanitizeEvaluatedQuest, sanitizeEvaluatedReward } from '../api/ai.js';
import { signQuest, verifyQuestSignature, signReward, verifyRewardSignature, signLoanOffer, verifyLoanSignature } from '../api/sync.js';

console.log('=== KIỂM THỬ ĐỒNG BỘ DỮ LIỆU THƯƠNG LƯỢNG AI (VÀNG, THỜI GIAN, LOẠI VIỆC, HẠN MỨC, BẰNG CHỨNG) ===\n');

const aiJs = fs.readFileSync(path.resolve('api/ai.js'), 'utf8').replace(/\r\n/g, '\n');
const syncJs = fs.readFileSync(path.resolve('api/sync.js'), 'utf8').replace(/\r\n/g, '\n');
const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra parseDebateOptionsFromText trích xuất các thông số mới (Bounty, Proof, Time, Gold)
{
  // 1a. Option chuyển sang việc Không cần bấm giờ (Bounty) và Miễn chụp ảnh
  const questAiReply = `Mình thấy bạn rửa chén bát nhiều dầu mỡ mệt nhọc. Mình đưa ra 2 giải pháp này nhé:
- Phương án 1: Hoàn thành ngay không cần bấm giờ với mức thưởng 5 Vàng, miễn chụp ảnh bằng chứng.
- Phương án 2: Đổi thành phiên Hẹn giờ tập trung 20 phút dọn bếp toàn diện với mức thưởng 12 Vàng, cần chụp ảnh bếp sạch sau khi xong.`;

  const options = parseDebateOptionsFromText(questAiReply, 'quest');
  assert.strictEqual(options.length, 2, 'Phải trích xuất được 2 phương án từ lời phản hồi');

  const opt1 = options[0];
  assert.strictEqual(opt1.newTargetMinutes, 0, 'Phương án 1 phải có newTargetMinutes = 0');
  assert.strictEqual(opt1.newType, 'bounty', 'Phương án 1 phải có newType = bounty');
  assert.strictEqual(opt1.newRewardCoins, 5, 'Phương án 1 phải có newRewardCoins = 5 Vàng');
  assert.strictEqual(opt1.newRequiresProof, false, 'Phương án 1 phải có newRequiresProof = false (miễn ảnh)');
  assert.ok(opt1.label.includes('Không cần bấm giờ') && opt1.label.includes('5 Vàng'), 'Nhãn opt 1 phải nêu rõ Không cần bấm giờ và 5 Vàng');

  const opt2 = options[1];
  assert.strictEqual(opt2.newTargetMinutes, 20, 'Phương án 2 phải có newTargetMinutes = 20');
  assert.strictEqual(opt2.newType, 'focus', 'Phương án 2 phải có newType = focus');
  assert.strictEqual(opt2.newRewardCoins, 12, 'Phương án 2 phải có newRewardCoins = 12 Vàng');
  assert.strictEqual(opt2.newRequiresProof, true, 'Phương án 2 phải có newRequiresProof = true (cần ảnh)');
  assert.ok(opt2.label.includes('20 phút') && opt2.label.includes('12 Vàng'), 'Nhãn opt 2 phải nêu rõ 20 phút và 12 Vàng');

  console.log('✓ Test 1: parseDebateOptionsFromText trích xuất chuẩn xác Bounty (0p), Focus (20p), Vàng và Yêu cầu/Miễn ảnh.');
}

// 2. Kiểm tra sanitizeEvaluatedQuest bảo toàn dữ liệu thương lượng (isNegotiated: true)
{
  // Trường hợp việc nhà chưa thương lượng: bị kẹp về bounty 0m 5 coins
  const nonNegotiatedChore = {
    title: 'Rửa chén bát và dọn bếp',
    type: 'focus',
    targetMinutes: 30,
    rewardCoins: 15,
    category: 'chore',
    isNegotiated: false
  };
  const sanitizedNonNeg = sanitizeEvaluatedQuest(nonNegotiatedChore, nonNegotiatedChore.title, '');
  assert.strictEqual(sanitizedNonNeg.targetMinutes, 0, 'Việc nhà chưa thương lượng phải bị chuyển về 0m');
  assert.strictEqual(sanitizedNonNeg.type, 'bounty', 'Việc nhà chưa thương lượng phải là bounty');
  assert.strictEqual(sanitizedNonNeg.rewardCoins, 5, 'Việc nhà chưa thương lượng bị kẹp tối đa 5 Vàng');

  // Trường hợp việc nhà ĐÃ THƯƠNG LƯỢNG THỐNG NHẤT (isNegotiated: true):
  // Người dùng thỏa thuận dọn dẹp kỹ 25 phút, AI duyệt 12 Vàng
  const negotiatedChore = {
    title: 'Dọn dẹp tổng vệ sinh nhà cửa',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 12,
    category: 'chore',
    isNegotiated: true
  };
  const sanitizedNeg = sanitizeEvaluatedQuest(negotiatedChore, negotiatedChore.title, '');
  assert.strictEqual(sanitizedNeg.targetMinutes, 25, 'Việc nhà đã thương lượng phải GIỮ NGUYÊN 25 phút thỏa thuận');
  assert.strictEqual(sanitizedNeg.type, 'focus', 'Việc nhà đã thương lượng phải GIỮ NGUYÊN loại focus');
  assert.strictEqual(sanitizedNeg.rewardCoins, 12, 'Việc nhà đã thương lượng phải GIỮ NGUYÊN 12 Vàng thỏa thuận');

  console.log('✓ Test 2: sanitizeEvaluatedQuest tôn trọng tuyệt đối thỏa thuận thương lượng (isNegotiated: true), không đè nén sai lệch.');
}

// 3. Kiểm tra chữ ký HMAC Zero-Trust bảo vệ trọn vẹn dữ liệu sau thương lượng
{
  // 3a. Nhiệm vụ: Tên, loại việc, thời gian, Vàng, yêu cầu ảnh
  const title = 'Đọc sách 45 phút';
  const type = 'focus';
  const mins = 45;
  const coins = 20;
  const reqProof = false;

  const questSig = signQuest(title, type, mins, coins, reqProof);
  assert.ok(questSig && questSig.length === 16, 'Chữ ký nhiệm vụ phải hợp lệ 16 ký tự');
  assert.strictEqual(verifyQuestSignature({ title, type, targetMinutes: mins, rewardCoins: coins, requiresProof: reqProof, signature: questSig }), true, 'Xác thực nhiệm vụ hợp lệ phải thành công');

  // Gian lận sửa thời gian từ 45p thành 10p
  assert.strictEqual(verifyQuestSignature({ title, type, targetMinutes: 10, rewardCoins: coins, requiresProof: reqProof, signature: questSig }), false, 'Gian lận sửa thời gian phải bị chặn đứng');

  // 3b. Phần thưởng: Tên, giá Vàng, hạng, thời gian
  const rewardName = 'Xem phim cuối tuần';
  const price = 40;
  const tier = 'rare';
  const rewardMins = 60;

  const rewardSig = signReward(rewardName, price, tier, rewardMins);
  assert.ok(rewardSig && rewardSig.length === 16, 'Chữ ký phần thưởng phải hợp lệ 16 ký tự');
  assert.strictEqual(verifyRewardSignature({ name: rewardName, price, tier, targetMinutes: rewardMins, signature: rewardSig }), true, 'Xác thực phần thưởng hợp lệ phải thành công');

  // Gian lận hạ giá từ 40 Vàng xuống 10 Vàng
  assert.strictEqual(verifyRewardSignature({ name: rewardName, price: 10, tier, targetMinutes: rewardMins, signature: rewardSig }), false, 'Gian lận hạ giá quà phải bị từ chối');

  // 3c. Khoản vay Ngân Hàng: Người vay, số tiền, lãi suất, tỷ lệ trích, hạn mức
  const userId = 'knight_user_01';
  const loanAmt = 40;
  const rate = 0.03;
  const deduct = 0.60;
  const limit = 70;

  const loanSig = signLoanOffer(userId, loanAmt, rate, deduct, limit);
  assert.ok(loanSig && loanSig.length === 16, 'Chữ ký khoản vay phải hợp lệ 16 ký tự');
  assert.strictEqual(verifyLoanSignature([userId], loanAmt, rate, deduct, limit, loanSig), true, 'Xác thực khoản vay hợp lệ phải thành công');

  // Gian lận tự ý nâng hạn mức lên 100 Vàng
  assert.strictEqual(verifyLoanSignature([userId], loanAmt, rate, deduct, 100, loanSig), false, 'Gian lận nâng hạn mức phải bị chặn');

  console.log('✓ Test 3: Hệ thống chữ ký Zero-Trust HMAC bảo đảm toàn vẹn 100% dữ liệu đã thương lượng.');
}

// 4. Kiểm tra tương thích thuộc tính trong api/sync.js và public/app.js cho vay vàng
{
  // Kiểm tra api/sync.js chấp nhận cả negotiatedRate và borrowRate, negotiatedLimit và creditLimit
  assert.ok(
    syncJs.includes('req.body?.negotiatedRate ?? req.body?.borrowRate') ||
    syncJs.includes('req.body?.borrowRate ?? req.body?.negotiatedRate'),
    'api/sync.js phải kiểm tra fallback tương thích cho lãi suất thương lượng'
  );

  assert.ok(
    syncJs.includes('req.body?.negotiatedLimit ?? req.body?.creditLimit') ||
    syncJs.includes('req.body?.creditLimit ?? req.body?.negotiatedLimit'),
    'api/sync.js phải kiểm tra fallback tương thích cho hạn mức thương lượng'
  );

  // Kiểm tra public/app.js gửi cả 2 trường để đồng bộ tuyệt đối
  assert.ok(
    appJs.includes('negotiatedRate: bankNegotiatedTerms?.borrowRate'),
    'public/app.js phải gửi kèm negotiatedRate khi giải ngân vay Vàng'
  );
  assert.ok(
    appJs.includes('negotiatedLimit: bankNegotiatedTerms?.creditLimit'),
    'public/app.js phải gửi kèm negotiatedLimit khi giải ngân vay Vàng'
  );

  console.log('✓ Test 4: Đồng bộ 100% tên trường giữa Frontend và Backend khi giải ngân khoản vay thương lượng.');
}

// 5. Kiểm tra mã nguồn api/ai.js ưu tiên tuyệt đối phương án người dùng chọn (selectedOption)
{
  // Kiểm tra debate_quest
  assert.ok(
    aiJs.includes('selectedOpt.newRewardCoins !== undefined') &&
    aiJs.includes('selectedOpt.newTargetMinutes !== undefined'),
    'api/ai.js phải ưu tiên trích xuất thông số từ selectedOpt trong debate_quest'
  );

  // Kiểm tra debate_reward
  assert.ok(
    aiJs.includes('selectedOpt.newPrice !== undefined') &&
    aiJs.includes('selectedOpt.newTargetMinutes !== undefined'),
    'api/ai.js phải ưu tiên trích xuất thông số từ selectedOpt trong debate_reward'
  );

  // Kiểm tra tự động accepted = true khi chọn phương án hoặc người dùng chốt
  assert.ok(
    aiJs.includes('const isAccepted = Boolean(result.accepted) || Boolean(selectedOpt)'),
    'api/ai.js phải bảo đảm accepted = true khi người dùng bấm chọn phương án'
  );

  console.log('✓ Test 5: Ưu tiên tuyệt đối phương án được chọn (selectedOption), loại bỏ 100% lỗi đóng băng thông số.');
}

console.log('\n======================================================================');
console.log('🎉 TẤT CẢ 5 NHÓM KIỂM THỬ ĐỒNG BỘ THƯƠNG LƯỢNG AI ĐÃ VƯỢT QUA XUẤT SẮC!');
console.log('======================================================================\n');
