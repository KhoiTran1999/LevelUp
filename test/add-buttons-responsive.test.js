import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Kiểm thử Tinh Chỉnh & Tối Ưu Nút "Thêm Nhiệm Vụ" và "Thêm Quà" (Desktop, iPad, iPhone) ===\n');

const html = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8');
const styleCss = fs.readFileSync(path.resolve('public/style.css'), 'utf8');

// 1. Kiểm thử Nút Thêm Nhiệm Vụ (#btn-open-add-quest)
console.log('Kiểm thử 1: Nút Thêm Nhiệm Vụ...');
const questBtnMatch = html.match(/<button[^>]*id="btn-open-add-quest"[^>]*>([\s\S]*?)<\/button>/);
assert.ok(questBtnMatch, 'Phải tồn tại nút #btn-open-add-quest trong HTML');
const questBtnHtml = questBtnMatch[0];

// Kiểm tra loại bỏ lỗi hiển thị "+ mới" trên iPhone
assert.ok(!questBtnHtml.includes('<span>mới</span>'), 'Đã khắc phục hoàn toàn lỗi nhãn cụt "+ mới"');
assert.ok(questBtnHtml.includes('Thêm việc'), 'Trên iPhone (< 640px) phải hiển thị nhãn rõ ràng "Thêm việc"');
assert.ok(questBtnHtml.includes('Thêm Nhiệm Vụ'), 'Trên iPad & Desktop (>= 640px) phải hiển thị "Thêm Nhiệm Vụ"');

// Kiểm tra phím tắt Q chỉ hiển thị trên máy tính (lg:inline-flex), ẩn trên iPad touch
assert.ok(questBtnHtml.includes('hidden lg:inline-flex'), 'Phím tắt Q chỉ hiển thị trên màn hình Desktop (lg:), không chiếm diện tích trên iPad cảm ứng');
assert.ok(questBtnHtml.includes('>Q<'), 'Phải chứa badge phím tắt Q');

// Kiểm tra chiều cao chuẩn công thái học cảm ứng (Apple HIG >= 40-44px) và phản hồi xúc giác
assert.ok(questBtnHtml.includes('h-10 sm:h-10.5'), 'Chiều cao nút phải chuẩn h-10 sm:h-10.5 (40px mobile, 42px ipad/desktop)');
assert.ok(questBtnHtml.includes('touch-manipulation'), 'Nút phải có touch-manipulation để khử 300ms delay trên iOS Safari');
assert.ok(questBtnHtml.includes('active:scale-95'), 'Nút phải có phản hồi nhấn active:scale-95');
assert.ok(questBtnHtml.includes('onclick="window.openQuestModal ? window.openQuestModal() : null"'), 'Phải có onclick trực tiếp để đảm bảo 100% nhận tap/click');
console.log('✓ Test 1: Nút Thêm Nhiệm Vụ đáp ứng hoàn hảo trên Desktop, iPad và iPhone.\n');

// 2. Kiểm thử Nút Thêm Quà (#btn-open-add-reward-nav)
console.log('Kiểm thử 2: Nút Thêm Quà...');
const rewardBtnMatch = html.match(/<button[^>]*id="btn-open-add-reward-nav"[^>]*>([\s\S]*?)<\/button>/);
assert.ok(rewardBtnMatch, 'Phải tồn tại nút #btn-open-add-reward-nav trong HTML');
const rewardBtnHtml = rewardBtnMatch[0];

// Kiểm tra loại bỏ lỗi hiển thị cụt "+ quà" trên iPhone
assert.ok(!rewardBtnHtml.includes('<span>quà</span>'), 'Đã khắc phục hoàn toàn lỗi nhãn đơn điệu "+ quà"');
assert.ok(rewardBtnHtml.includes('Thêm quà'), 'Trên iPhone (< 640px) hiển thị "Thêm quà"');
assert.ok(rewardBtnHtml.includes('Thêm Quà'), 'Trên iPad & Desktop (>= 640px) hiển thị "Thêm Quà"');

// Phím tắt R trên Desktop
assert.ok(rewardBtnHtml.includes('hidden lg:inline-flex'), 'Phím tắt R chỉ hiển thị trên Desktop (lg:)');
assert.ok(rewardBtnHtml.includes('>R<'), 'Phải chứa badge phím tắt R');

// Chiều cao và công thái học
assert.ok(rewardBtnHtml.includes('h-10 sm:h-10.5'), 'Chiều cao nút phải chuẩn h-10 sm:h-10.5');
assert.ok(rewardBtnHtml.includes('touch-manipulation'), 'Nút phải có touch-manipulation');
assert.ok(rewardBtnHtml.includes('active:scale-95'), 'Nút phải có phản hồi nhấn active:scale-95');
assert.ok(rewardBtnHtml.includes('onclick="window.openRewardModal ? window.openRewardModal() : null"'), 'Phải có onclick trực tiếp');
console.log('✓ Test 2: Nút Thêm Quà đáp ứng hoàn hảo trên Desktop, iPad và iPhone.\n');

// 3. Kiểm thử Chiều cao Đồng Bộ của Thanh Ribbon (Filter và Subtabs)
console.log('Kiểm thử 3: Cân bằng chiều cao Ribbon...');
const questRibbonSlice = html.substring(html.indexOf('<!-- Filter and Action Ribbon -->'), html.indexOf('<!-- M3 Daily Quests Group Progress Indicator'));
assert.ok(questRibbonSlice.includes('h-10 sm:h-10.5'), 'Khung bộ lọc nhiệm vụ phải cao đồng bộ h-10 sm:h-10.5 với nút hành động');

const shopRibbonSlice = html.substring(html.indexOf('<!-- Subtabs and Action Ribbon -->'), html.indexOf('<!-- Subtab Pane 1: Shop Items Grid -->'));
assert.ok(shopRibbonSlice.includes('h-10 sm:h-10.5'), 'Khung subtabs cửa hàng phải cao đồng bộ h-10 sm:h-10.5 với nút hành động');
assert.ok(!shopRibbonSlice.includes('flex flex-col sm:flex-row'), 'Subtabs không bị co cụm flex-col méo mó trên di động');

// Kiểm tra hàm switchRewardSubtab trong appJs duy trì cấu trúc ngang h-8 sm:h-8.5
assert.ok(appJs.includes('h-8 sm:h-8.5'), 'switchRewardSubtab duy trì chiều cao và kiểu dáng ngang khi chuyển đổi tab');
console.log('✓ Test 3: Thanh Ribbon cân xứng tuyệt đối, đồng bộ chiều cao và không lệch trục.\n');

// 4. Kiểm thử CSS Hỗ Trợ Cảm Ứng (Touch Optimization)
console.log('Kiểm thử 4: Tối ưu CSS cho màn hình cảm ứng...');
assert.ok(styleCss.includes('touch-action: manipulation;'), 'style.css có thuộc tính touch-action: manipulation');
assert.ok(styleCss.includes('-webkit-tap-highlight-color: transparent;'), 'style.css loại bỏ khung viền xám mặc định khi tap trên iOS');
console.log('✓ Test 4: CSS tối ưu trải nghiệm chạm vuốt trên iPhone và iPad.\n');

console.log('🎉 TẤT CẢ KIỂM THỬ CHO NÚT THÊM NHIỆM VỤ & THÊM QUÀ ĐÃ VƯỢT QUA 100%!');
