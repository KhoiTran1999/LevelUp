import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  runDeterministicQuestDebate,
  runDeterministicRewardDebate,
  runDeterministicLoanDebate,
  sanitizeEvaluatedQuest
} from '../api/ai.js';
import { verifyQuestSignature } from '../api/sync.js';

console.log('=== KIỂM THỬ TIẾN TRÌNH THỜI GIAN THỰC & CHÍNH XÁC THAM SỐ THƯƠNG LƯỢNG AI ===\n');

// -----------------------------------------------------------------------------
// 1. Trích xuất chính xác tham số người dùng đề xuất (Fix lỗi "17 phút / 2 Vàng")
// -----------------------------------------------------------------------------
{
  const yogaQuest = {
    title: 'Yoga giãn cơ nhẹ nhàng',
    description: 'Thư giãn cơ thể sau ngày làm việc',
    targetMinutes: 0,
    rewardCoins: 6,
    type: 'bounty',
    category: 'trivial' // Thử thách: category trivial ban đầu
  };

  const userPrompt = 'Mình muốn đếm thời gian 10 phút và nâng lên 7 vàng do tập yoga cũng mệt';
  const debateRes = runDeterministicQuestDebate(yogaQuest, userPrompt, null);

  assert.strictEqual(debateRes.accepted, true, 'AI phải chấp thuận đề xuất thương lượng');
  assert.strictEqual(debateRes.newTargetMinutes, 10, 'Thời gian phải chuẩn xác 10 phút (không bị ép thành 17 phút hay 0 phút)');
  assert.strictEqual(debateRes.newRewardCoins, 7, 'Mức thưởng phải chuẩn xác 7 Vàng (không bị ép thành 5 Vàng hay 2 Vàng)');
  assert.strictEqual(debateRes.newType, 'focus', 'Phải chuyển sang loại tập trung hẹn giờ (focus)');
  assert.ok(debateRes.reply.includes('10 phút'), 'Lời nhắn phải đề cập 10 phút');
  assert.ok(debateRes.reply.includes('7 Vàng'), 'Lời nhắn phải đề cập 7 Vàng');
  assert.ok(debateRes.signature, 'Phải có chữ ký số HMAC hợp lệ');

  const isValidSig = verifyQuestSignature({
    title: debateRes.newTitle,
    type: debateRes.newType,
    targetMinutes: debateRes.newTargetMinutes,
    rewardCoins: debateRes.newRewardCoins,
    requiresProof: debateRes.newRequiresProof,
    signature: debateRes.signature
  });
  assert.strictEqual(isValidSig, true, 'Chữ ký số HMAC phải tuyệt đối hợp lệ');

  console.log('✓ Test 1: Khắc phục triệt để lỗi ép 17 phút / 2 Vàng: Trích xuất chuẩn xác 10 phút & 7 Vàng kèm chữ ký HMAC.');
}

// -----------------------------------------------------------------------------
// 2. Kiểm tra sanitizeEvaluatedQuest tôn trọng thỏa thuận đã thương lượng (isNegotiated: true)
// -----------------------------------------------------------------------------
{
  const rawNegotiated = {
    title: 'Yoga giãn cơ nhẹ nhàng',
    description: 'Thư giãn cơ thể',
    category: 'trivial',
    type: 'focus',
    targetMinutes: 10,
    rewardCoins: 7,
    isNegotiated: true
  };

  const clean = sanitizeEvaluatedQuest(rawNegotiated, 'Yoga giãn cơ nhẹ nhàng', 'Thư giãn cơ thể');
  assert.strictEqual(clean.targetMinutes, 10, 'TargetMinutes phải giữ nguyên 10 khi isNegotiated: true');
  assert.strictEqual(clean.rewardCoins, 7, 'RewardCoins phải giữ nguyên 7 khi isNegotiated: true');
  assert.strictEqual(clean.type, 'focus', 'Type phải giữ nguyên focus khi isNegotiated: true');

  console.log('✓ Test 2: sanitizeEvaluatedQuest bảo toàn thông số thương lượng, không bị kẹp về 2 Vàng.');
}

// -----------------------------------------------------------------------------
// 3. Kiểm tra trích xuất tham số phần thưởng Cửa Hàng và Khoản Vay
// -----------------------------------------------------------------------------
{
  // 3a. Phần thưởng
  const reward = { name: 'Xem phim Netflix', price: 40, targetMinutes: 60, tier: 'rare' };
  const rewardDebate = runDeterministicRewardDebate(reward, 'Giảm xuống 25 vàng và 30 phút nha bạn', null);
  assert.strictEqual(rewardDebate.accepted, true);
  assert.strictEqual(rewardDebate.newPrice, 25);
  assert.strictEqual(rewardDebate.newTargetMinutes, 30);

  // 3b. Khoản vay
  const loan = { amount: 30, borrowRate: 0.05, autoDeductPercent: 0.50, creditLimit: 60 };
  const loanDebate = runDeterministicLoanDebate(loan, 'Mình muốn vay 45 vàng để mua vật phẩm', 'knight_01', { depositFloor: 0.015, borrowRate: 0.05, liquidityStatus: 'normal' }, null, { level: 2, streak: 3 });
  assert.strictEqual(loanDebate.accepted, true);
  assert.strictEqual(loanDebate.newAmount, 45);

  console.log('✓ Test 3: Trích xuất tham số người dùng đề xuất cho Phần thưởng và Khoản vay hoạt động chuẩn xác.');
}

// -----------------------------------------------------------------------------
// 4. Kiểm tra cấu trúc Cập Nhật Thời Gian Thực trong public/app.js
// -----------------------------------------------------------------------------
{
  const appJsPath = path.join(process.cwd(), 'public', 'app.js');
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  // Kiểm tra hàm createDebateLoadingBubble
  assert.ok(appJs.includes('function createDebateLoadingBubble('), 'Phải có hàm createDebateLoadingBubble');
  assert.ok(appJs.includes('AI Đang Xử Lý Thời Gian Thực'), 'Phải có nhãn hiển thị tiến trình thời gian thực');
  assert.ok(appJs.includes('animate-ping'), 'Phải có chấm tín hiệu pulsing trực tiếp');
  assert.ok(appJs.includes('step-badge'), 'Phải có badge bước thực hiện');
  assert.ok(appJs.includes('step-progress'), 'Phải có thanh tiến trình động');
  assert.ok(appJs.includes('cleanup'), 'Phải có hàm cleanup giải phóng interval');

  // Kiểm tra các phân hệ quest, reward, loan đều gọi và dọn dẹp bubble
  assert.ok(appJs.includes("createDebateLoadingBubble('quest')"), 'sendDebateArgument phải gọi createDebateLoadingBubble("quest")');
  assert.ok(appJs.includes("createDebateLoadingBubble('reward')"), 'sendRewardDebateArgument phải gọi createDebateLoadingBubble("reward")');
  assert.ok(appJs.includes("createDebateLoadingBubble('loan')"), 'sendBankDebateMessage phải gọi createDebateLoadingBubble("loan")');
  assert.ok(appJs.includes('loadingBubble.cleanup()'), 'Phải có lệnh cleanup interval khi hoàn tất hoặc lỗi');

  console.log('✓ Test 4: Toàn bộ giao diện hiển thị tiến trình thời gian thực (Live Real-time Steps & Progress) tích hợp hoàn thiện trong app.js.');
}

console.log('\n======================================================================');
console.log('🎉 TẤT CẢ 4 NHÓM KIỂM THỬ TIẾN TRÌNH THỜI GIAN THỰC ĐÃ HOÀN TẤT XUẤT SẮC!');
console.log('======================================================================\n');
