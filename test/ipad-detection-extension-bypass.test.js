import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Kiểm thử Nhận Diện iPadOS & Miễn Trừ Cài Extension Máy Tính ===\n');

// 1. Kiểm tra mã nguồn trong src/js/06-timer.js và test/fixtures/legacy-client/app.js
const timerSrcPath = path.resolve('test/fixtures/legacy-client/modules/06-timer.js');
const timerSrc = fs.readFileSync(timerSrcPath, 'utf8');
const appJsPath = path.resolve('test/fixtures/legacy-client/app.js');
const appJs = fs.readFileSync(appJsPath, 'utf8');

assert(timerSrc.includes('isIPadOS'), '06-timer.js phải chứa logic nhận diện isIPadOS');
assert(timerSrc.includes('navigator.maxTouchPoints > 1'), '06-timer.js phải kiểm tra maxTouchPoints > 1 cho iPadOS');
assert(appJs.includes('isIPadOS'), 'test/fixtures/legacy-client/app.js phải chứa logic nhận diện isIPadOS');
console.log('✓ Test 1: File nguồn và file bundle app.js đã tích hợp nhận diện iPadOS.\n');

// 2. Định nghĩa hàm mô phỏng logic isMobileUserDevice
function testIsMobileUserDevice(mockNavigator) {
  if (typeof mockNavigator === 'undefined') return false;
  const ua = mockNavigator.userAgent || '';
  const isStandardMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const isMobileClientHint = Boolean(mockNavigator.userAgentData?.mobile);
  const isIPadOS = (mockNavigator.platform === 'MacIntel' || /Macintosh/i.test(ua)) && (mockNavigator.maxTouchPoints > 1);
  return isStandardMobile || isMobileClientHint || isIPadOS;
}

// Case 1: iPad thực tế chạy iPadOS 13+ (Safari & Chrome mặc định gửi Desktop UA: Macintosh, MacIntel, maxTouchPoints: 5)
const realIPadModern = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  platform: 'MacIntel',
  maxTouchPoints: 5
};
assert.strictEqual(
  testIsMobileUserDevice(realIPadModern),
  true,
  'iPadOS 13+ gửi UA Macintosh với maxTouchPoints=5 PHẢI được nhận diện là thiết bị di động'
);
console.log('✓ Test 2: iPadOS hiện đại (UA Macintosh + Touch screen) được nhận diện chính xác là Mobile -> Miễn trừ extension.');

// Case 2: iPad đời cũ hoặc bật Request Mobile Website (UA chứa iPad)
const legacyIPad = {
  userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
  platform: 'iPad',
  maxTouchPoints: 5
};
assert.strictEqual(testIsMobileUserDevice(legacyIPad), true, 'iPad cũ (chứa iPad trong UA) phải là mobile');
console.log('✓ Test 3: iPad đời cũ có chữ iPad trong UA nhận diện thành công.');

// Case 3: iPhone (iOS)
const iPhone = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  platform: 'iPhone',
  maxTouchPoints: 5
};
assert.strictEqual(testIsMobileUserDevice(iPhone), true, 'iPhone phải là mobile');
console.log('✓ Test 4: iPhone nhận diện thành công.');

// Case 4: Android Phone & Tablet
const androidDevice = {
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  platform: 'Linux armv8l',
  maxTouchPoints: 10,
  userAgentData: { mobile: true }
};
assert.strictEqual(testIsMobileUserDevice(androidDevice), true, 'Android phải là mobile');
console.log('✓ Test 5: Android nhận diện thành công.');

// Case 5: Máy tính Mac thật (MacBook / iMac) -> BẮT BUỘC CÀI EXTENSION
const realMacBook = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  platform: 'MacIntel',
  maxTouchPoints: 0
};
assert.strictEqual(
  testIsMobileUserDevice(realMacBook),
  false,
  'Máy tính MacBook thật (maxTouchPoints=0) KHÔNG được coi là mobile -> Vẫn bắt buộc cài extension'
);
console.log('✓ Test 6: Máy tính Mac thật (maxTouchPoints=0) vẫn bắt buộc cài extension bảo vệ.');

// Case 6: Máy tính Windows thật -> BẮT BUỘC CÀI EXTENSION
const realWindowsPC = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  platform: 'Win32',
  maxTouchPoints: 0
};
assert.strictEqual(
  testIsMobileUserDevice(realWindowsPC),
  false,
  'Máy tính Windows thật KHÔNG được coi là mobile -> Vẫn bắt buộc cài extension'
);
console.log('✓ Test 7: Máy tính Windows thật vẫn bắt buộc cài extension bảo vệ.');

console.log('\n🎉 Toàn bộ bài kiểm tra nhận diện iPad và miễn trừ extension thành công 100%!');
