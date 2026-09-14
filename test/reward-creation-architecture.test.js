import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { signReward, verifyRewardSignature } from '../api/sync.js';

console.log('=== Kiểm thử Kiến Trúc "Thêm Thưởng" Đồng Bộ Theo "Thêm Việc Mới" ===\n');

const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');
const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra cấu trúc phân chia 3 bước (3-Step State Machine) trong modal-reward của public/index.html
assert.ok(indexHtml.includes('id="modal-reward"'), 'modal-reward container phải tồn tại');
assert.ok(indexHtml.includes('id="reward-form-step"'), 'Step 1: reward-form-step phải tồn tại trong modal-reward');
assert.ok(indexHtml.includes('id="reward-evaluating-step"'), 'Step 2: reward-evaluating-step phải tồn tại trong modal-reward');
assert.ok(indexHtml.includes('id="reward-verdict-step"'), 'Step 3: reward-verdict-step phải tồn tại trong modal-reward');
console.log('✓ Test 1: HTML chứa cấu trúc 3 bước phân tách độc lập (form-step -> evaluating-step -> verdict-step).');

// 2. Kiểm tra ô nhập đề xuất giá Vàng (input-reward-estimate) và các trường nhập liệu
assert.ok(indexHtml.includes('id="input-reward-name"'), 'input-reward-name phải tồn tại');
assert.ok(indexHtml.includes('id="input-reward-desc"'), 'input-reward-desc phải tồn tại');
assert.ok(indexHtml.includes('id="input-reward-estimate"'), 'input-reward-estimate phải tồn tại trong reward-form-step');
assert.ok(indexHtml.includes('id="btn-eval-reward"'), 'btn-eval-reward phải tồn tại');
console.log('✓ Test 2: Step 1 tích hợp đầy đủ trường nhập Tên quà, Mô tả và Mức Vàng đề xuất (input-reward-estimate).');

// 3. Kiểm tra màn hình loading giám định với animation sinh động (Step 2)
assert.ok(indexHtml.includes('animate-bounce'), 'Màn hình loading giám định phải có hiệu ứng animate-bounce');
assert.ok(indexHtml.includes('AI Đang Giám Định Phần Thưởng...'), 'Tiêu đề loading giám định phần thưởng phải rõ ràng');
console.log('✓ Test 3: Step 2 hiển thị biểu tượng động và thông báo trạng thái AI đang định giá.');

// 4. Kiểm tra màn hình kết quả AI & Thẻ khóa thông số (Step 3)
assert.ok(indexHtml.includes('id="eval-tier"'), 'eval-tier badge phải tồn tại');
assert.ok(indexHtml.includes('id="eval-category-badge"'), 'eval-category-badge phải tồn tại');
assert.ok(indexHtml.includes('id="eval-price"'), 'eval-price phải tồn tại');
assert.ok(indexHtml.includes('id="eval-verdict"'), 'eval-verdict speech bubble phải tồn tại');
assert.ok(indexHtml.includes('id="eval-advice"'), 'eval-advice phải tồn tại');
assert.ok(indexHtml.includes('id="reward-locked-icon"'), 'reward-locked-icon phải tồn tại');
assert.ok(indexHtml.includes('id="reward-locked-name"'), 'reward-locked-name phải tồn tại');
assert.ok(indexHtml.includes('id="reward-locked-desc"'), 'reward-locked-desc phải tồn tại');
assert.ok(indexHtml.includes('id="reward-locked-tier-label"'), 'reward-locked-tier-label phải tồn tại');
assert.ok(indexHtml.includes('id="reward-locked-price-label"'), 'reward-locked-price-label phải tồn tại');
assert.ok(indexHtml.includes('id="btn-open-reward-debate"'), 'btn-open-reward-debate phải tồn tại');
assert.ok(indexHtml.includes('id="btn-save-reward"'), 'btn-save-reward phải tồn tại');
console.log('✓ Test 4: Step 3 tích hợp đầy đủ thẻ thông số khóa bởi AI, nhận xét AI, lời khuyên và nút lưu.');

// 5. Kiểm tra hàm updateRewardVerdictDisplay() và renderRewardVerdictStep() trong app.js
assert.ok(appJs.includes('function updateRewardVerdictDisplay()'), 'app.js phải có hàm updateRewardVerdictDisplay');
assert.ok(appJs.includes('function renderRewardVerdictStep()'), 'app.js phải có hàm renderRewardVerdictStep');
assert.ok(appJs.includes('updateRewardVerdictDisplay();'), 'renderRewardVerdictStep phải gọi updateRewardVerdictDisplay');
console.log('✓ Test 5: app.js cung cấp hàm cập nhật DOM đồng nhất updateRewardVerdictDisplay() và hàm chuyển bước renderRewardVerdictStep().');

// 6. Kiểm tra evaluateRewardItem() gửi userEstimatePrice và điều phối trạng thái bước
assert.ok(appJs.includes("document.getElementById('input-reward-estimate')?.value"), 'evaluateRewardItem phải đọc input-reward-estimate');
assert.ok(appJs.includes('userEstimatePrice: estimate'), 'evaluateRewardItem phải truyền userEstimatePrice lên API');
assert.ok(appJs.includes("document.getElementById('reward-form-step').classList.add('hidden')"), 'evaluateRewardItem phải ẩn Step 1 khi bắt đầu định giá');
assert.ok(appJs.includes("document.getElementById('reward-evaluating-step').classList.remove('hidden')"), 'evaluateRewardItem phải hiện Step 2 khi bắt đầu định giá');
assert.ok(appJs.includes('renderRewardVerdictStep();'), 'evaluateRewardItem phải gọi renderRewardVerdictStep() khi thành công');
console.log('✓ Test 6: evaluateRewardItem kết nối tham số đề xuất giá Vàng và chuyển giao diện qua Step 2 -> Step 3.');

// 7. Kiểm tra hộp thoại xác nhận confirmAction() trong savePendingReward()
assert.ok(appJs.includes('async function savePendingReward()'), 'savePendingReward phải là hàm async');
assert.ok(appJs.includes('await confirmAction({'), 'savePendingReward phải chờ người dùng xác nhận qua confirmAction()');
assert.ok(appJs.includes('Xác Nhận Thêm Phần Thưởng?'), 'confirmAction phải có tiêu đề rõ ràng khi thêm mới');
assert.ok(appJs.includes('Xác Nhận Cập Nhật Phần Thưởng?'), 'confirmAction phải có tiêu đề rõ ràng khi cập nhật');
assert.ok(appJs.includes('renderShop();'), 'savePendingReward phải render lại Cửa Hàng ngay lập tức');
console.log('✓ Test 7: savePendingReward tích hợp hộp thoại xác nhận an toàn RPG confirmAction và đồng bộ ngay giao diện Cửa Hàng.');

// 8. Kiểm tra openRewardHandler() thiết lập lại đúng trạng thái 3 bước khi mở modal tạo mới
assert.ok(appJs.includes("document.getElementById('reward-form-step').classList.remove('hidden')"), 'openRewardHandler phải hiển thị Step 1');
assert.ok(appJs.includes("document.getElementById('reward-evaluating-step').classList.add('hidden')"), 'openRewardHandler phải ẩn Step 2');
assert.ok(appJs.includes("document.getElementById('reward-verdict-step').classList.add('hidden')"), 'openRewardHandler phải ẩn Step 3');
assert.ok(appJs.includes("estimateInput.value = ''"), 'openRewardHandler phải reset ô input-reward-estimate');
console.log('✓ Test 8: openRewardHandler reset chuẩn xác cả 3 bước và làm sạch mọi ô nhập liệu.');

// 9. Kiểm tra openRewardRenegotiateModal() mở trực tiếp Step 3 và cập nhật hiển thị
assert.ok(appJs.includes("document.getElementById('reward-verdict-step').classList.remove('hidden')"), 'openRewardRenegotiateModal phải hiển thị Step 3');
assert.ok(appJs.includes('updateRewardVerdictDisplay();'), 'openRewardRenegotiateModal phải gọi updateRewardVerdictDisplay');
console.log('✓ Test 9: openRewardRenegotiateModal chuyển thẳng vào Step 3 và kích hoạt giao diện thương lượng.');

// 10. Kiểm thử Zero-Trust Anti-Cheat HMAC cho phần thưởng tạo mới
{
  const rewardName = '1 Giờ Đọc Sách Thư Giãn';
  const price = 40;
  const tier = 'rare';
  const signature = signReward(rewardName, price, tier);

  const validReward = { name: rewardName, price, tier, signature };
  assert.strictEqual(verifyRewardSignature(validReward), true, 'Phần thưởng hợp lệ phải có chữ ký HMAC hợp lệ');

  const tamperedReward = { name: rewardName, price: 5, tier, signature };
  assert.strictEqual(verifyRewardSignature(tamperedReward), false, 'Phần thưởng bị chỉnh sửa giá trái phép phải bị từ chối');
  console.log('✓ Test 10: Cơ chế Zero-Trust Anti-Cheat bảo vệ phần thưởng tạo mới qua chữ ký HMAC thành công.');
}

console.log('\n🎉 TẤT CẢ 10/10 TEST KIẾN TRÚC TÍNH NĂNG "THÊM THƯỞNG" ĐÃ VƯỢT QUA XUẤT SẮC!');
