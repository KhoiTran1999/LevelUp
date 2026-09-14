import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { signReward, signRewardLegacy, verifyRewardSignature } from '../api/sync.js';
import { sanitizeEvaluatedReward, extractDurationFromText } from '../api/ai.js';

console.log('=== Kiểm thử Tính Năng Thời Gian Tự Thưởng & Đếm Giờ Khi Đổi Quà ===\n');

const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');
const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8').replace(/\r\n/g, '\n');
const aiJs = fs.readFileSync(path.resolve('api/ai.js'), 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra trường nhập liệu thời lượng dự kiến trong Step 1 của modal-reward
assert.ok(indexHtml.includes('id="input-reward-duration"'), 'input-reward-duration phải tồn tại trong public/index.html');
assert.ok(indexHtml.includes('Thời Gian Tận Hưởng Dự Kiến'), 'Nhãn Thời Gian Tận Hưởng Dự Kiến phải tồn tại');
console.log('✓ Test 1: Step 1 (modal-reward) có trường nhập thời lượng dự kiến input-reward-duration.');

// 2. Kiểm tra các trường hiển thị thời lượng do AI chốt trong Step 3
assert.ok(indexHtml.includes('id="eval-target-minutes"'), 'eval-target-minutes phải tồn tại trong Step 3');
assert.ok(indexHtml.includes('id="reward-locked-time-label"'), 'reward-locked-time-label phải tồn tại trong Thẻ khóa AI');
assert.ok(indexHtml.includes('id="reward-locked-time-box"'), 'reward-locked-time-box phải tồn tại');
console.log('✓ Test 2: Step 3 có đầy đủ huy hiệu và thẻ khóa thông số thời lượng (eval-target-minutes & reward-locked-time-label).');

// 3. Kiểm tra các nút gợi ý nhanh liên quan đến thời lượng trong khung thương lượng AI
assert.ok(indexHtml.includes('⏱️ Tăng thời gian'), 'Nút gợi ý tăng thời gian phải tồn tại');
assert.ok(indexHtml.includes('⏱️ Giảm thời gian'), 'Nút gợi ý giảm thời gian phải tồn tại');
assert.ok(indexHtml.includes('⚡ Không cần bấm giờ'), 'Nút gợi ý không cần bấm giờ phải tồn tại');
console.log('✓ Test 3: Khung thương lượng AI có đầy đủ các chip gợi ý điều chỉnh thời lượng (Tăng, Giảm, Không cần bấm giờ).');

// 4. Kiểm tra Zero-Trust HMAC Signature bảo vệ targetMinutes và tương thích ngược (Backward Compatibility)
{
  const name = '30 Phút Chơi Game Tự Thưởng';
  const price = 35;
  const tier = 'rare';
  const targetMinutes = 30;

  // Chữ ký mới có targetMinutes > 0
  const sigWithDuration = signReward(name, price, tier, targetMinutes);
  assert.strictEqual(typeof sigWithDuration, 'string');
  assert.strictEqual(sigWithDuration.length, 16);

  const validTimedReward = { name, price, tier, targetMinutes, signature: sigWithDuration };
  assert.strictEqual(verifyRewardSignature(validTimedReward), true, 'Phần thưởng có thời lượng hợp lệ phải xác thực thành công');

  // Gian lận tăng thời lượng trái phép
  const hackedDurationReward = { name, price, tier, targetMinutes: 120, signature: sigWithDuration };
  assert.strictEqual(verifyRewardSignature(hackedDurationReward), false, 'Gian lận tăng thời lượng phải bị từ chối xác thực');

  // Gian lận giảm giá Vàng
  const hackedPriceReward = { name, price: 5, tier, targetMinutes, signature: sigWithDuration };
  assert.strictEqual(verifyRewardSignature(hackedPriceReward), false, 'Gian lận đổi giá Vàng phải bị từ chối xác thực');

  // Tương thích ngược: phần thưởng cũ không có targetMinutes (hoặc targetMinutes = 0)
  const legacySig = signRewardLegacy(name, price, tier);
  const legacyReward = { name, price, tier, signature: legacySig };
  assert.strictEqual(verifyRewardSignature(legacyReward), true, 'Phần thưởng chuẩn cũ không có targetMinutes phải tương thích ngược 100%');

  const zeroDurationReward = { name, price, tier, targetMinutes: 0, signature: legacySig };
  assert.strictEqual(verifyRewardSignature(zeroDurationReward), true, 'Phần thưởng targetMinutes = 0 với chữ ký legacy phải hợp lệ');
  console.log('✓ Test 4: HMAC Signature bảo vệ trọn vẹn targetMinutes và đảm bảo tương thích ngược 100% với dữ liệu cũ.');
}

// 5. Kiểm tra hàm sanitizeEvaluatedReward trong api/ai.js xử lý targetMinutes
{
  const cleanTimed = sanitizeEvaluatedReward({
    name: 'Uống Trà Sữa Thư Giãn',
    price: 30,
    tier: 'rare',
    targetMinutes: 45
  });
  assert.strictEqual(cleanTimed.targetMinutes, 45, 'targetMinutes hợp lệ phải được giữ nguyên');

  // Clamping vượt ngưỡng (tối đa 360 phút)
  const cleanOver = sanitizeEvaluatedReward({
    name: 'Nghỉ Dưỡng',
    price: 100,
    tier: 'legendary',
    targetMinutes: 999
  });
  assert.strictEqual(cleanOver.targetMinutes, 360, 'targetMinutes > 360 phải được giới hạn về 360 phút');

  // Giá trị âm
  const cleanNegative = sanitizeEvaluatedReward({
    name: 'Ăn Bánh Snack',
    price: 15,
    tier: 'common',
    targetMinutes: -10
  });
  assert.ok(cleanNegative.targetMinutes >= 0, 'targetMinutes không được âm');
  console.log('✓ Test 5: sanitizeEvaluatedReward kiểm soát và chuẩn hóa targetMinutes (0-360 phút) an toàn tuyệt đối.');
}

// 6. Kiểm tra app.js đọc input-reward-duration và gửi userEstimateDuration lên API
assert.ok(appJs.includes("document.getElementById('input-reward-duration')?.value"), 'app.js phải đọc input-reward-duration');
assert.ok(appJs.includes('userEstimateDuration: duration'), 'app.js phải truyền userEstimateDuration lên evaluate_reward');
assert.ok(appJs.includes('targetMinutes: data.targetMinutes !== undefined'), 'app.js phải lưu targetMinutes từ kết quả AI');
console.log('✓ Test 6: evaluateRewardItem trong app.js kết nối tham số thời lượng với AI và lưu vào currentPendingReward.');

// 7. Kiểm tra updateRewardVerdictDisplay cập nhật hiển thị thời lượng
assert.ok(appJs.includes("document.getElementById('eval-target-minutes')"), 'updateRewardVerdictDisplay phải cập nhật eval-target-minutes');
assert.ok(appJs.includes("document.getElementById('reward-locked-time-label')"), 'updateRewardVerdictDisplay phải cập nhật reward-locked-time-label');
console.log('✓ Test 7: updateRewardVerdictDisplay trong app.js cập nhật đồng thời cả 2 vị trí hiển thị thời lượng.');

// 8. Kiểm tra sendRewardDebateArgument hỗ trợ thương lượng newTargetMinutes
assert.ok(appJs.includes('data.newTargetMinutes'), 'sendRewardDebateArgument phải xử lý newTargetMinutes từ AI');
assert.ok(appJs.includes('currentPendingReward.targetMinutes = data.newTargetMinutes'), 'sendRewardDebateArgument phải cập nhật targetMinutes khi AI chấp thuận');
assert.ok(aiJs.includes('newTargetMinutes'), 'api/ai.js phải hỗ trợ newTargetMinutes trong debate_reward');
console.log('✓ Test 8: Thương lượng với AI (debate_reward) cho phép người chơi đàm phán tăng/giảm hoặc bỏ hẹn giờ quà.');

// 9. Kiểm tra hiển thị badge thời lượng trên thẻ phần thưởng trong Cửa Hàng (renderShop)
assert.ok(appJs.includes('const durationMins = extractRewardDuration(item)'), 'renderShop phải tính thời lượng quà qua extractRewardDuration');
assert.ok(appJs.includes('⏱️ ${durationMins}p'), 'renderShop phải hiển thị badge thời lượng ⏱️ Xp trên thẻ quà');
console.log('✓ Test 9: Cửa Hàng (renderShop) hiển thị trực quan huy hiệu thời lượng ⏱️ Xp trên từng thẻ phần thưởng.');

// 10. Kiểm tra buyShopItem tự động kích hoạt phiên đếm giờ useInventoryItem(newInvItem.id, true)
assert.ok(appJs.includes('async function buyShopItem(itemId)'), 'buyShopItem phải tồn tại');
assert.ok(appJs.includes('await useInventoryItem(newInvItem.id, true)'), 'buyShopItem phải tự động gọi useInventoryItem với skipConfirm=true khi quà có thời lượng');
assert.ok(appJs.includes("document.getElementById('active-focus-banner')?.scrollIntoView"), 'buyShopItem phải cuộn màn hình đến active-focus-banner để hiển thị đồng hồ');
console.log('✓ Test 10: Khi đổi quà (buyShopItem), hệ thống tự động kích hoạt phiên đếm ngược Pomodoro/Zen-ring ngay trên màn hình.');

// 11. Kiểm tra Thương lượng giảm giá Vàng và thời gian (isNegotiated bypass sàn cứng giải trí 35 Vàng và tự chỉnh tier)
{
  // Khi người dùng thương lượng giảm game xuống 15 phút và 20 Vàng
  const negotiatedGame = sanitizeEvaluatedReward({
    name: '30 Phút Chơi Game',
    price: 20,
    tier: 'rare',
    targetMinutes: 15,
    category: 'entertainment',
    isNegotiated: true
  }, '30 Phút Chơi Game', '');

  assert.strictEqual(negotiatedGame.price, 20, 'Khi thương lượng thành công (isNegotiated), giá Vàng 20 phải được giữ nguyên (không bị ép về 35 Vàng)');
  assert.strictEqual(negotiatedGame.targetMinutes, 15, 'Thời gian đàm phán 15 phút phải được giữ nguyên');
  assert.strictEqual(negotiatedGame.tier, 'common', 'Hạng quà phải tự động hạ xuống common khi giá giảm < 30 Vàng');

  // Trường hợp thẩm định ban đầu chưa thương lượng (!isNegotiated), sàn 35 Vàng vẫn bảo vệ chống lạm phát
  const initialGame = sanitizeEvaluatedReward({
    name: '30 Phút Chơi Game',
    price: 20,
    tier: 'rare',
    targetMinutes: 30,
    category: 'entertainment',
    isNegotiated: false
  }, '30 Phút Chơi Game', '');
  assert.strictEqual(initialGame.price, 35, 'Thẩm định ban đầu giải trí < 35 Vàng phải được nâng lên 35 Vàng');

  // Thương lượng bỏ hẹn giờ (targetMinutes = 0)
  const zeroTimed = sanitizeEvaluatedReward({
    name: 'Thưởng Thức Bánh Ngọt',
    price: 25,
    targetMinutes: 0,
    isNegotiated: true
  });
  assert.strictEqual(zeroTimed.targetMinutes, 0, 'Thương lượng bỏ đếm giờ (targetMinutes: 0) phải được giữ nguyên 0');
  console.log('✓ Test 11: Cơ chế thương lượng AI (isNegotiated) cho phép giảm giá Vàng và thời lượng linh hoạt, đồng thời tự hiệu chỉnh Tier.');
}

// 12. Tự động trích xuất thời lượng từ Tên hoặc Mô tả khi người dùng không điền ô thời gian ("Xem Youtube 30 phút")
{
  assert.strictEqual(extractDurationFromText('Xem Youtube 30 phút'), 30, 'extractDurationFromText phải trích xuất được 30 phút từ tiêu đề');
  assert.strictEqual(extractDurationFromText('Chơi game 1 tiếng'), 60, 'extractDurationFromText phải trích xuất được 60 phút từ "1 tiếng"');
  assert.strictEqual(extractDurationFromText('Lướt web 45p'), 45, 'extractDurationFromText phải trích xuất được 45 phút từ "45p"');
  assert.strictEqual(extractDurationFromText('Uống 1 ly trà sữa'), 0, 'Quà không có thời gian thì extractDurationFromText trả về 0');

  // Trường hợp người dùng không điền ô thời gian, AI trả về targetMinutes = 0:
  // sanitizeEvaluatedReward phải tự động nhận diện và thiết lập targetMinutes = 30
  const youtubeReward = sanitizeEvaluatedReward({
    name: 'Xem Youtube 30 phút',
    price: 35,
    tier: 'rare',
    targetMinutes: 0, // AI không hiểu hoặc không điền
    category: 'entertainment'
  }, 'Xem Youtube 30 phút', '');
  assert.strictEqual(youtubeReward.targetMinutes, 30, 'Phần thưởng có "30 phút" trong tên phải được tự động chỉnh targetMinutes = 30');

  // Hoạt động giải trí không ghi thời gian: mặc định tối thiểu 30 phút
  const defaultEntertainment = sanitizeEvaluatedReward({
    name: 'Xem phim Netflix',
    price: 40,
    tier: 'rare',
    targetMinutes: 0,
    category: 'entertainment'
  }, 'Xem phim Netflix', '');
  assert.strictEqual(defaultEntertainment.targetMinutes, 30, 'Hoạt động giải trí không ghi rõ thời gian phải mặc định có thời lượng 30 phút');

  // Quà vật phẩm / ăn uống: targetMinutes = 0
  const treatReward = sanitizeEvaluatedReward({
    name: 'Ly trà sữa trân châu',
    price: 25,
    tier: 'common',
    targetMinutes: 0,
    category: 'treat'
  }, 'Ly trà sữa trân châu', '');
  assert.strictEqual(treatReward.targetMinutes, 0, 'Quà ăn uống không có thời gian trong tên phải giữ nguyên targetMinutes = 0');
  console.log('✓ Test 12: Hệ thống tự động trích xuất thời lượng từ tên phần thưởng ("Xem Youtube 30 phút" -> 30p) và mặc định 30p cho giải trí.');
}

// 13. Kiểm tra đếm ngược thời gian phần thưởng: chỉ được trừ xuống, không cho cộng lên
{
  assert.ok(appJs.includes("Thời gian hưởng thụ chỉ được trừ xuống, không thể cộng thêm!"), 'app.js phải chặn hành vi cộng thêm thời gian khi đang hưởng thụ phần thưởng');
  assert.ok(appJs.includes("btn.textContent = isReward ? (idx === 0 ? '-1m' : '-5m')"), 'renderFocusStationUI phải đổi nút nhanh thành -1m và -5m khi đang hưởng thụ');
  assert.ok(appJs.includes("btn.dataset.delta = isReward ? (idx === 0 ? '-60' : '-300')"), 'renderFocusStationUI phải đổi delta thành số âm (-60, -300) khi đang hưởng thụ');
  assert.ok(appJs.includes("if (total > Math.round(focusRemainingSeconds))"), 'saveEditTimer phải chặn lưu thời gian lớn hơn thời gian còn lại khi là phần thưởng');
  console.log('✓ Test 13: Đếm ngược phần thưởng chỉ cho phép trừ xuống (-1m, -5m, chỉnh giảm), chặn đứng mọi hành vi cộng thêm thời gian hưởng thụ.');
}

console.log('\n🎉 TẤT CẢ 13/13 TEST TÍNH NĂNG THỜI GIAN VÀ ĐẾM GIỜ PHẦN THƯỞNG ĐÃ VƯỢT QUA XUẤT SẮC!');
