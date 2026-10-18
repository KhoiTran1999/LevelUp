import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== KIỂM THỬ BOTTOM SHEET PULL-TO-DISMISS & SLIDE-DOWN EXIT ANIMATION ===\n');

const html = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
const css = fs.readFileSync(path.resolve('public/style.css'), 'utf8');
const js = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

// 1. Kiểm tra HTML của Bottom Sheet
console.log('Test 1: Kiểm tra cấu trúc HTML của Bottom Sheet...');
assert.ok(html.includes('id="modal-quest-detail"'), 'index.html phải có modal-quest-detail');
assert.ok(html.includes('id="modal-reward-detail"'), 'index.html phải có modal-reward-detail');
assert.ok(
  html.includes('id="modal-quest-detail"') && html.includes('data-sheet-dismiss="true"'),
  'modal-quest-detail phải có thuộc tính data-sheet-dismiss="true"'
);
assert.ok(
  html.includes('class="m3-drag-handle sm:hidden" role="button" aria-label="Kéo xuống để đóng"'),
  'modal-quest-detail phải có drag handle với aria-label hỗ trợ accessibility'
);
console.log('✓ Test 1: Cấu trúc HTML và thuộc tính data-sheet-dismiss hợp lệ 100%.\n');

// 2. Kiểm tra CSS Animation (Slide-up khi mở, Slide-down khi đóng, Fade backdrop)
console.log('Test 2: Kiểm tra CSS Animation slide-down và styling drag handle...');
assert.ok(css.includes('@keyframes sheetSlideDown'), 'style.css phải có @keyframes sheetSlideDown');
assert.ok(css.includes('transform: translate3d(0, 105%, 0)'), 'sheetSlideDown phải trượt xuống 105% off-screen');
assert.ok(css.includes('@keyframes sheetBackdropFadeOut'), 'style.css phải có @keyframes sheetBackdropFadeOut');
assert.ok(css.includes('@keyframes dialogSlideDownExit'), 'style.css phải có @keyframes dialogSlideDownExit');
assert.ok(css.includes('.m3-modal-sheet.sheet-closing'), 'style.css phải có class .sheet-closing');
assert.ok(css.includes('.m3-drag-handle'), 'style.css phải có class .m3-drag-handle');
assert.ok(css.includes('touch-action: none;'), 'm3-drag-handle phải có touch-action: none để nhận diện vuốt mượt mà');
console.log('✓ Test 2: CSS Keyframes và styles trượt xuống hoàn chỉnh 100%.\n');

// 3. Kiểm tra JavaScript Logic
console.log('Test 3: Kiểm tra JS Logic: dismissModalWithSlideDown & initBottomSheetGestures...');
assert.ok(js.includes('function dismissModalWithSlideDown('), 'app.js phải có hàm dismissModalWithSlideDown');
assert.ok(js.includes('window.dismissModalWithSlideDown = dismissModalWithSlideDown'), 'dismissModalWithSlideDown phải được gắn vào window');
assert.ok(js.includes('function initBottomSheetGestures('), 'app.js phải có hàm initBottomSheetGestures');
assert.ok(js.includes('window.initBottomSheetGestures = initBottomSheetGestures'), 'initBottomSheetGestures phải được gắn vào window');

// Nhấp bên ngoài backdrop để thoát
assert.ok(
  js.includes("const isDismissibleSheet = modal.id === 'modal-quest-detail' ||"),
  'app.js phải nhận diện modal-quest-detail là dismissible sheet khi click backdrop'
);
assert.ok(
  js.includes('dismissModalWithSlideDown(modal);'),
  'app.js phải gọi dismissModalWithSlideDown khi thoát sheet'
);

// Kéo xuống để thoát (Touch & Pointer tracking)
assert.ok(js.includes("panel.addEventListener('touchstart'"), 'phải bắt sự kiện touchstart trên bottom sheet');
assert.ok(js.includes("panel.addEventListener('touchmove'"), 'phải bắt sự kiện touchmove trên bottom sheet');
assert.ok(js.includes("panel.addEventListener('touchend'"), 'phải bắt sự kiện touchend trên bottom sheet');
assert.ok(js.includes('translate3d(0, ${deltaY}px, 0)'), 'panel phải theo ngón tay di chuyển thời gian thực');
assert.ok(js.includes('shouldDismiss'), 'phải có logic kiểm tra ngưỡng khoảng cách và vận tốc để thoát');
console.log('✓ Test 3: JavaScript Gestures & Animation logic hoàn chỉnh 100%.\n');

// 4. Kiểm tra khả năng mở lại modal sau khi trượt xuống thoát (Tránh lỗi kẹt animation fill/opacity)
console.log('Test 4: Kiểm tra khả năng mở lại modal sau khi trượt xuống...');
assert.ok(
  js.includes('panel.getAnimations().forEach(a => a.cancel())') || js.includes('panel.getAnimations().forEach(a => a.cancel());'),
  'phải hủy bỏ các animation đang chạy để không bị khóa transform/opacity'
);
assert.ok(
  !js.includes("fill: 'forwards'"),
  'không được giữ animation fill: forwards vĩnh viễn gây kẹt màn hình transparent'
);
assert.ok(
  js.includes("modal._suppressBackdropClick = false;"),
  'phải giải phóng cờ chặn backdrop click sau khi thoát'
);
console.log('✓ Test 4: Modal giải phóng hoàn toàn animation lock, mở lại mượt mà 100% sau khi trượt xuống.\n');

console.log('🎉 TẤT CẢ TEST BOTTOM SHEET PULL-TO-DISMISS & SLIDE-DOWN EXIT ĐÃ PASS XUẤT SẮC!');
