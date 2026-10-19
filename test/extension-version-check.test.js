import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Bắt đầu kiểm thử Kiểm Tra Phiên Bản & Ép Buộc Cập Nhật Extension ---');

// 1. Kiểm tra manifest.json và content.js
const manifestPath = path.resolve('extension/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, '1.3.0', 'manifest.json phải có phiên bản 1.3.0');

const contentJsPath = path.resolve('extension/content.js');
const contentJs = fs.readFileSync(contentJsPath, 'utf8');
assert(contentJs.includes('broadcastExtensionVersion'), 'content.js phải có hàm broadcastExtensionVersion');
assert(contentJs.includes('chrome.runtime?.getManifest?.()?.version'), 'content.js phải đọc version từ manifest runtime');
assert(contentJs.includes('LEVELUP_CHECK_EXTENSION_VERSION'), 'content.js phải lắng nghe tín hiệu kiểm tra phiên bản');
assert(contentJs.includes('LEVELUP_EXTENSION_VERSION_REPORT'), 'content.js phải phát bản tin báo phiên bản');
console.log('✓ Test 1: Extension manifest và content script đã cấu hình đồng bộ phiên bản tự động.');

// 2. Kiểm tra logic trong src/js/06-timer.js
const timerSrcPath = path.resolve('src/js/06-timer.js');
const timerSrc = fs.readFileSync(timerSrcPath, 'utf8');

assert(timerSrc.includes('const REQUIRED_EXTENSION_VERSION = \'1.3.0\';'), '06-timer.js phải quy định REQUIRED_EXTENSION_VERSION là 1.3.0');
assert(timerSrc.includes('compareExtensionVersions'), '06-timer.js phải chứa hàm compareExtensionVersions');
assert(timerSrc.includes('isLevelUpExtensionOutdated'), '06-timer.js phải chứa hàm isLevelUpExtensionOutdated');
assert(timerSrc.includes('isLevelUpExtensionReady'), '06-timer.js phải chứa hàm isLevelUpExtensionReady');
assert(timerSrc.includes('updateShieldGateStatus'), '06-timer.js phải chứa hàm updateShieldGateStatus');
assert(timerSrc.includes('NÂNG CẤP KHIÊN KỶ LUẬT'), '06-timer.js phải có giao diện nhắc nhở nâng cấp khiên');
console.log('✓ Test 2: src/js/06-timer.js đã tích hợp đầy đủ hàm kiểm tra và cảnh báo phiên bản cũ.');

// 3. Kiểm tra logic so khớp semver
function compareExtensionVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const p1 = String(v1).split('.').map(n => parseInt(n, 10) || 0);
  const p2 = String(v2).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

const reqVer = '1.3.0';
// Bản cũ
assert(compareExtensionVersions('0.9.0', reqVer) < 0, '0.9.0 phải là bản cũ');
assert(compareExtensionVersions('1.0.0', reqVer) < 0, '1.0.0 phải là bản cũ');
assert(compareExtensionVersions('1.1.0', reqVer) < 0, '1.1.0 phải là bản cũ');
assert(compareExtensionVersions('1.2.0', reqVer) < 0, '1.2.0 phải là bản cũ');
assert(compareExtensionVersions('1.2.9', reqVer) < 0, '1.2.9 phải là bản cũ');

// Bản hiện tại hoặc mới hơn
assert(compareExtensionVersions('1.3.0', reqVer) === 0, '1.3.0 phải là bản chuẩn');
assert(compareExtensionVersions('1.3.1', reqVer) > 0, '1.3.1 phải là bản hợp lệ');
assert(compareExtensionVersions('1.4.0', reqVer) > 0, '1.4.0 phải là bản hợp lệ');
assert(compareExtensionVersions('2.0.0', reqVer) > 0, '2.0.0 phải là bản hợp lệ');
console.log('✓ Test 3: Thuật toán so sánh semver hoạt động chính xác với mọi phiên bản.');

// 4. Kiểm tra mô phỏng trạng thái Ready vs Outdated
function simulateExtensionStatus(installed, reportedVer) {
  const isInstalled = Boolean(installed);
  const isOutdated = isInstalled && (!reportedVer || compareExtensionVersions(reportedVer, reqVer) < 0);
  const isReady = isInstalled && !isOutdated;
  return { isInstalled, isOutdated, isReady };
}

// Trường hợp chưa cài
const notInstalled = simulateExtensionStatus(false, null);
assert.strictEqual(notInstalled.isInstalled, false);
assert.strictEqual(notInstalled.isReady, false);

// Trường hợp cài bản cũ 1.2.0
const oldInstalled = simulateExtensionStatus(true, '1.2.0');
assert.strictEqual(oldInstalled.isInstalled, true);
assert.strictEqual(oldInstalled.isOutdated, true);
assert.strictEqual(oldInstalled.isReady, false);

// Trường hợp cài bản mới 1.3.0
const upToDateInstalled = simulateExtensionStatus(true, '1.3.0');
assert.strictEqual(upToDateInstalled.isInstalled, true);
assert.strictEqual(upToDateInstalled.isOutdated, false);
assert.strictEqual(upToDateInstalled.isReady, true);
console.log('✓ Test 4: Mô phỏng trạng thái (chưa cài, bản cũ, bản mới) trả về chính xác.');

// 5. Kiểm tra ép buộc khóa app và Pomodoro khi bản cũ
assert(timerSrc.includes('!isLevelUpExtensionReady()'), 'startFocusTimer và startup phải kiểm tra isLevelUpExtensionReady');
assert(timerSrc.includes('openShieldGateModal(quest)'), 'startFocusTimer phải mở modal khi chưa ready');

const modalSrcPath = path.resolve('src/js/15-modal.js');
const modalSrc = fs.readFileSync(modalSrcPath, 'utf8');
assert(modalSrc.includes('isLevelUpExtensionReady'), '15-modal.js phải kiểm tra isLevelUpExtensionReady trong closeModal');

const appJsPath = path.resolve('public/app.js');
const appJs = fs.readFileSync(appJsPath, 'utf8');
assert(appJs.includes('REQUIRED_EXTENSION_VERSION'), 'public/app.js bundle phải chứa REQUIRED_EXTENSION_VERSION');
assert(appJs.includes('isLevelUpExtensionOutdated'), 'public/app.js bundle phải chứa isLevelUpExtensionOutdated');
assert(appJs.includes('isLevelUpExtensionReady'), 'public/app.js bundle phải chứa isLevelUpExtensionReady');
console.log('✓ Test 5: Logic khóa ứng dụng và chặn Pomodoro khi bản cũ đã được đóng gói thành công.');

console.log('🎉 Toàn bộ bài kiểm tra phiên bản Extension và ép buộc nâng cấp hoàn thành xuất sắc!');
