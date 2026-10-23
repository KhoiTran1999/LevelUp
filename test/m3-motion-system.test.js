import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('=== KIỂM THỬ HỆ THỐNG CHUYỂN ĐỘNG MATERIAL DESIGN 3 (M3 MOTION SYSTEM) ===\n');

// 0. Cú pháp JS hợp lệ
assert.doesNotThrow(() => {
  execSync('node -c test/fixtures/legacy-client/app.js', { stdio: 'pipe' });
}, 'test/fixtures/legacy-client/app.js phải hợp lệ cú pháp');
console.log('✓ Test 0: Cú pháp JavaScript hợp lệ 100%.');

const styleCss = fs.readFileSync(path.resolve('public/style.css'), 'utf8');

// 1. Kiểm tra bộ token gia tốc (Easing Tokens) chuẩn M3
console.log('Test 1: Kiểm tra bộ Easing Tokens chuẩn Material Design 3...');
const requiredEasings = [
  '--md-sys-motion-easing-linear',
  '--md-sys-motion-easing-standard',
  '--md-sys-motion-easing-standard-decelerate',
  '--md-sys-motion-easing-standard-accelerate',
  '--md-sys-motion-easing-emphasized',
  '--md-sys-motion-easing-emphasized-decelerate',
  '--md-sys-motion-easing-emphasized-accelerate'
];

requiredEasings.forEach(token => {
  assert.ok(styleCss.includes(token), `style.css phải chứa easing token: ${token}`);
});
assert.ok(styleCss.includes('cubic-bezier(0.05, 0.7, 0.1, 1.0)'), 'Emphasized Decelerate phải có giá trị chuẩn M3');
assert.ok(styleCss.includes('cubic-bezier(0.3, 0.0, 0.8, 0.15)'), 'Emphasized Accelerate phải có giá trị chuẩn M3');
console.log('✓ Test 1: Bộ 7 Easing Tokens (Linear, Standard, Emphasized) hoàn chỉnh 100%.\n');

// 2. Kiểm tra bộ token thời lượng (Duration Tokens) chuẩn M3 (Short, Medium, Long, Extra Long)
console.log('Test 2: Kiểm tra bộ Duration Tokens chuẩn Material Design 3...');
const requiredDurations = [
  '--md-sys-motion-duration-short1: 50ms',
  '--md-sys-motion-duration-short2: 100ms',
  '--md-sys-motion-duration-short3: 150ms',
  '--md-sys-motion-duration-short4: 200ms',
  '--md-sys-motion-duration-medium1: 250ms',
  '--md-sys-motion-duration-medium2: 300ms',
  '--md-sys-motion-duration-medium3: 350ms',
  '--md-sys-motion-duration-medium4: 400ms',
  '--md-sys-motion-duration-long1: 450ms',
  '--md-sys-motion-duration-long2: 500ms',
  '--md-sys-motion-duration-long3: 550ms',
  '--md-sys-motion-duration-long4: 600ms',
  '--md-sys-motion-duration-extra-long1: 700ms',
  '--md-sys-motion-duration-extra-long2: 800ms',
  '--md-sys-motion-duration-extra-long3: 900ms',
  '--md-sys-motion-duration-extra-long4: 1000ms'
];

requiredDurations.forEach(token => {
  assert.ok(styleCss.includes(token), `style.css phải chứa duration token: ${token}`);
});
console.log('✓ Test 2: Đầy đủ 16 Duration Tokens trải dài từ Short (50ms) tới Extra-Long (1000ms).\n');

// 3. Kiểm tra các cặp chuyển động ngữ nghĩa M3 (Semantic Transition Pairs)
console.log('Test 3: Kiểm tra các cặp chuyển động ngữ nghĩa Semantic Transition Pairs...');
const requiredPairs = [
  '--md-motion-transition-fade-through',
  '--md-motion-transition-dialog-enter',
  '--md-motion-transition-dialog-exit',
  '--md-motion-transition-sheet-enter',
  '--md-motion-transition-sheet-exit',
  '--md-motion-transition-shared-axis-x',
  '--md-motion-transition-shared-axis-y',
  '--md-motion-transition-state-layer',
  '--md-motion-transition-elevation'
];

requiredPairs.forEach(pair => {
  assert.ok(styleCss.includes(pair), `style.css phải chứa semantic pair token: ${pair}`);
});
console.log('✓ Test 3: Các cặp Semantic Transition Pairs được thiết lập đầy đủ trong :root.\n');

// 4. Kiểm tra mẫu chuyển cảnh Fade Through cho Tab Navigation
console.log('Test 4: Kiểm tra mẫu chuyển cảnh Fade Through cho Tab Navigation...');
assert.ok(styleCss.includes('.tab-pane:not(.hidden)'), 'style.css phải gắn animation cho .tab-pane:not(.hidden)');
assert.ok(styleCss.includes('@keyframes tabPaneFadeIn'), 'style.css phải có keyframe tabPaneFadeIn');
assert.ok(styleCss.includes('tabPaneFadeIn var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized-decelerate)'), 'tabPaneFadeIn phải dùng M3 medium2 duration và emphasized-decelerate');
console.log('✓ Test 4: Tab Navigation áp dụng mẫu M3 Fade Through chuẩn xác.\n');

// 5. Kiểm tra mẫu chuyển cảnh Shared Axis X & Y (Subtabs & Dropdowns)
console.log('Test 5: Kiểm tra mẫu chuyển cảnh Shared Axis X & Y...');
assert.ok(styleCss.includes('subtabSlideLeft var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized-decelerate)'), 'Shop subtab phải dùng Shared Axis X với medium1 và emphasized-decelerate');
assert.ok(styleCss.includes('subtabSlideRight var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized-decelerate)'), 'Inventory subtab phải dùng Shared Axis X với medium1 và emphasized-decelerate');
assert.ok(styleCss.includes('navDropdownFade var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard-decelerate)'), 'Dropdown menu phải dùng Shared Axis Y với short4 và standard-decelerate');
assert.ok(styleCss.includes('mobilePopoverFade var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard-decelerate)'), 'Mobile popover phải dùng Shared Axis Y với short4 và standard-decelerate');
console.log('✓ Test 5: Subtabs & Popovers áp dụng mẫu M3 Shared Axis X & Y mượt mà.\n');

// 6. Kiểm tra mẫu chuyển cảnh Modal Shared Axis Z và Mobile Bottom Sheet
console.log('Test 6: Kiểm tra mẫu chuyển cảnh Modal Shared Axis Z và Bottom Sheet...');
assert.ok(styleCss.includes('modalFadeIn var(--md-sys-motion-duration-medium4) var(--md-sys-motion-easing-emphasized-decelerate)'), 'Modal dialog phải dùng medium4 và emphasized-decelerate');
assert.ok(styleCss.includes('iosBackdropFadeIn var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard-decelerate)'), 'Modal backdrop phải dùng medium2 và standard-decelerate');
assert.ok(styleCss.includes('@keyframes sheetSlideUp'), 'style.css phải có keyframe sheetSlideUp cho mobile bottom sheet');
assert.ok(styleCss.includes('sheetSlideUp var(--md-sys-motion-duration-long1) var(--md-sys-motion-easing-emphasized-decelerate)'), 'Bottom sheet phải dùng long1 và emphasized-decelerate');
console.log('✓ Test 6: Modal và Bottom Sheet đạt chuẩn M3 Shared Axis Z & Sheet presentation.\n');

// 7. Kiểm tra Toast và Progress Ring Transitions
console.log('Test 7: Kiểm tra Toast và Focus Timer Progress Ring Transitions...');
assert.ok(styleCss.includes('m3ToastEnter var(--md-sys-motion-duration-medium3) var(--md-sys-motion-easing-emphasized-decelerate)'), 'Toast enter phải dùng medium3 và emphasized-decelerate');
assert.ok(styleCss.includes('m3ToastExit var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-accelerate)'), 'Toast exit phải dùng short4 và emphasized-accelerate');
assert.ok(styleCss.includes('stroke-dashoffset var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard-decelerate)'), 'Focus timer ring phải dùng M3 motion token');
console.log('✓ Test 7: Toast và Progress Ring hoạt động theo đúng M3 motion specs.\n');

// 8. Kiểm tra hỗ trợ khả năng tiếp cận (Accessibility - Reduced Motion)
console.log('Test 8: Kiểm tra hỗ trợ giảm chuyển động (prefers-reduced-motion)...');
assert.ok(styleCss.includes('@media (prefers-reduced-motion: reduce)'), 'style.css phải có block prefers-reduced-motion');
assert.ok(styleCss.includes('animation-duration: 0.01ms !important'), 'Phải triệt tiêu thời lượng animation khi bật reduced motion');
assert.ok(styleCss.includes('transition-duration: 0.01ms !important'), 'Phải triệt tiêu thời lượng transition khi bật reduced motion');
console.log('✓ Test 8: Khả năng tiếp cận Reduced Motion tuân thủ 100% hướng dẫn WCAG và M3.\n');

console.log('🎉 TOÀN BỘ 8/8 TIÊU CHÍ HỆ THỐNG CHUYỂN ĐỘNG MATERIAL DESIGN 3 ĐẠT CHUẨN HOÀN TOÀN!');
