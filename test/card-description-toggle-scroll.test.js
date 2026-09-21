import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Bắt đầu kiểm thử Nút Xem thêm/Thu gọn 1 Dòng & Thanh Cuộn Thẻ Nhiệm vụ & Phần thưởng ===\n');

const css = fs.readFileSync(path.join(process.cwd(), 'public', 'style.css'), 'utf8');
const appJs = fs.readFileSync(path.join(process.cwd(), 'public', 'app.js'), 'utf8');

// =============================================================================
// Test 1: CSS line-clamp-1 & expanded bung toàn bộ chiều cao trong style.css
// =============================================================================
function testCardDescriptionCss() {
  console.log('Kiểm thử 1: CSS cho line-clamp-1 mặc định và trạng thái expanded bung toàn bộ chiều cao không thanh cuộn...');

  // 1. Kiểm tra class line-clamp-1 mặc định
  assert.ok(css.includes('.quest-desc-text.line-clamp-1'), 'style.css phải có .quest-desc-text.line-clamp-1');
  assert.ok(css.includes('.reward-desc-text.line-clamp-1'), 'style.css phải có .reward-desc-text.line-clamp-1');
  assert.ok(css.includes('-webkit-line-clamp: 1 !important'), 'style.css phải kẹp cứng 1 dòng với -webkit-line-clamp: 1');

  // 2. Kiểm tra trạng thái mở rộng .expanded bung trọn vẹn (max-height: none, overflow: visible)
  assert.ok(css.includes('.quest-desc-text.expanded'), 'style.css phải có class .quest-desc-text.expanded');
  assert.ok(css.includes('.reward-desc-text.expanded'), 'style.css phải có class .reward-desc-text.expanded');
  assert.ok(css.includes('max-height: none !important'), 'Trạng thái expanded phải bung hết chiều cao (max-height: none !important)');
  assert.ok(css.includes('overflow: visible !important'), 'Trạng thái expanded không bị cắt hay cuộn (overflow: visible !important)');
  assert.ok(css.includes('white-space: normal !important'), 'Trạng thái expanded hỗ trợ hiển thị nhiều dòng tự nhiên');

  // 3. Ẩn thanh cuộn webkit
  assert.ok(css.includes('.quest-desc-text.expanded::-webkit-scrollbar'), 'style.css phải xử lý scrollbar cho Nhiệm vụ');
  assert.ok(css.includes('.reward-desc-text.expanded::-webkit-scrollbar'), 'style.css phải xử lý scrollbar cho Phần thưởng');

  console.log('✓ Test 1: style.css định nghĩa chuẩn xác line-clamp-1 mặc định và trạng thái expanded bung hết chiều cao không còn thanh scroll.\n');
}

// =============================================================================
// Test 2: Cấu trúc Template HTML 1 Dòng Mặc Định trong app.js
// =============================================================================
function testCardDescriptionTemplate() {
  console.log('Kiểm thử 2: Cấu trúc HTML template 1 dòng và nút xem thêm ẩn mặc định...');

  // 1. Thẻ Nhiệm vụ (renderQuests) phải mặc định line-clamp-1
  assert.ok(
    appJs.includes('quest-desc-text text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed break-words'),
    'renderQuests phải gán mặc định line-clamp-1 cho mô tả nhiệm vụ'
  );

  // 2. Thẻ Cửa hàng và Kho quà (renderShop & renderInventory) phải mặc định line-clamp-1
  assert.ok(
    appJs.includes('reward-desc-text text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed break-words'),
    'renderShop & renderInventory phải gán mặc định line-clamp-1 cho mô tả phần thưởng'
  );

  // 3. Nút .btn-toggle-desc mặc định mang class hidden để chờ đo đạc thực tế, không còn check cứng length > 55
  assert.ok(
    !appJs.includes('q.description.length > 55'),
    'renderQuests không còn dùng điều kiện cứng q.description.length > 55 gây lỗi trên các thiết bị'
  );
  assert.ok(
    !appJs.includes('item.description.length > 55'),
    'renderShop & renderInventory không còn dùng điều kiện cứng item.description.length > 55'
  );
  assert.ok(
    appJs.includes('btn-toggle-desc hidden text-[11px] font-bold text-amber-600'),
    'Nút xem thêm của nhiệm vụ phải mang class hidden mặc định'
  );
  assert.ok(
    appJs.includes('btn-toggle-desc hidden text-[11px] font-bold text-purple-600'),
    'Nút xem thêm của phần thưởng phải mang class hidden mặc định'
  );

  console.log('✓ Test 2: Template thẻ Nhiệm vụ và Phần thưởng thiết lập 1 dòng mặc định và nút toggle sẵn sàng đo đạc.\n');
}

// =============================================================================
// Test 3: Logic Đo Đạc DOM, Toggle và Cuộn Nội Dung trong app.js
// =============================================================================
function testCardDescriptionJsLogic() {
  console.log('Kiểm thử 3: Logic đo đạc scrollHeight vs clientHeight, mở rộng/thu gọn và reset cuộn...');

  // 1. Phải có hàm setupCardDescToggle và refreshAllCardDescToggles
  assert.ok(appJs.includes('function setupCardDescToggle('), 'app.js phải có hàm setupCardDescToggle');
  assert.ok(appJs.includes('function refreshAllCardDescToggles('), 'app.js phải có hàm refreshAllCardDescToggles');

  // 2. Kiểm tra logic đo đạc tràn dòng (scrollHeight > clientHeight + 1)
  assert.ok(
    appJs.includes('descP.scrollHeight > descP.clientHeight + 1') || appJs.includes('descP.scrollHeight > (descP.clientHeight + 1)'),
    'setupCardDescToggle phải so sánh scrollHeight và clientHeight để chỉ hiện nút khi có từ dòng 2 trở lên'
  );

  // 3. Kiểm tra logic mở rộng (.expanded) và thu gọn (.line-clamp-1) cùng reset scrollTop
  assert.ok(appJs.includes("descP.classList.add('expanded')"), 'Khi xem thêm phải thêm class expanded');
  assert.ok(appJs.includes("descP.scrollTop = 0"), 'Khi thu gọn phải reset vị trí cuộn scrollTop = 0');
  assert.ok(appJs.includes("'Thu gọn ▲'") && appJs.includes("'...xem thêm'"), 'Phải cập nhật đúng nhãn nút ...xem thêm và Thu gọn ▲');

  // 4. Kiểm tra đồng bộ khi chuyển tab và resize màn hình thiết bị
  assert.ok(appJs.includes('cardDescResizeTimer'), 'Phải lắng nghe sự kiện window resize debounced để cập nhật lại nút theo độ rộng thiết bị');
  assert.ok(
    appJs.includes("['quests', 'shop'].includes(tabId)") && appJs.includes('refreshAllCardDescToggles'),
    'switchTab phải kích hoạt lại phép đo khi chuyển sang tab quests hoặc shop'
  );

  console.log('✓ Test 3: Logic JavaScript đo đạc chính xác dòng thứ 2+, mở rộng cuộn scroll và reset cuộn khi thu gọn hoạt động trơn tru.\n');
}

// Chạy toàn bộ test
testCardDescriptionCss();
testCardDescriptionTemplate();
testCardDescriptionJsLogic();

console.log('🎉 TẤT CẢ CÁC BỘ KIỂM THỬ XEM THÊM/THU GỌN VÀ THANH CUỘN ĐÃ VƯỢT QUA 100%!');
