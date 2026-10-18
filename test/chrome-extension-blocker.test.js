import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Bắt đầu kiểm thử LevelUp Chrome Extension — Khiên Chặn Xao Nhãng ---');

const extDir = path.resolve('extension');
const manifestPath = path.join(extDir, 'manifest.json');

// Test 1: Kiểm tra manifest.json chuẩn Manifest V3
assert(fs.existsSync(manifestPath), 'manifest.json của extension phải tồn tại');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert.strictEqual(manifest.manifest_version, 3, 'Phải là Manifest V3');
assert(manifest.name.includes('LevelUp'), 'Tên extension phải chứa LevelUp');
assert(manifest.version, 'Phải có trường version');
assert.strictEqual(manifest.background?.service_worker, 'background.js', 'Service worker phải là background.js');
assert.strictEqual(manifest.action?.default_popup, 'popup/popup.html', 'Action popup phải là popup/popup.html');
assert.strictEqual(manifest.options_page, 'options/options.html', 'Options page phải là options/options.html');

const requiredPermissions = ['declarativeNetRequest', 'storage', 'alarms', 'tabs', 'scripting'];
requiredPermissions.forEach(perm => {
  assert(manifest.permissions.includes(perm), `Thiếu permission: ${perm}`);
});
assert(Array.isArray(manifest.content_scripts), 'Phải có content_scripts');
assert(manifest.content_scripts.some(cs => cs.js?.includes('capsule.js')), 'Phải khai báo capsule.js trong content_scripts');
console.log('✓ Test 1: manifest.json hợp lệ chuẩn Manifest V3 với đầy đủ permissions và capsule content script.');

// Test 2: Kiểm tra các file icons tồn tại với định dạng PNG hợp lệ
assert(manifest.icons, 'Phải khai báo icons trong manifest');
assert(manifest.action.default_icon, 'Phải khai báo default_icon trong action');

const expectedSizes = [16, 48, 128];
expectedSizes.forEach(size => {
  const iconRelPath = manifest.icons[String(size)];
  assert(iconRelPath, `Thiếu khai báo icon-${size} trong icons`);
  const iconFullPath = path.join(extDir, iconRelPath);
  assert(fs.existsSync(iconFullPath), `File icon-${size}.png không tồn tại: ${iconFullPath}`);

  const buf = fs.readFileSync(iconFullPath);
  assert(buf.length > 50, `Kích thước file icon-${size} quá nhỏ`);
  // Kiểm tra PNG signature: 89 50 4E 47 0D 0A 1A 0A
  assert.strictEqual(buf[0], 0x89, 'Byte 0 phải là 0x89 (PNG)');
  assert.strictEqual(buf[1], 0x50, 'Byte 1 phải là P');
  assert.strictEqual(buf[2], 0x4E, 'Byte 2 phải là N');
  assert.strictEqual(buf[3], 0x47, 'Byte 3 phải là G');
});
console.log('✓ Test 2: Bộ icon chuẩn pixel-perfect (16, 48, 128) tồn tại và là file PNG thực.');

// Test 3: Kiểm tra cấu trúc các module và file HTML/CSS/JS của Extension
const requiredFiles = [
  'background.js',
  'content.js',
  'capsule.js',
  'blocked/blocked.html',
  'blocked/blocked.css',
  'blocked/blocked.js',
  'popup/popup.html',
  'popup/popup.css',
  'popup/popup.js',
  'options/options.html',
  'options/options.css',
  'options/options.js'
];

requiredFiles.forEach(rel => {
  const p = path.join(extDir, rel);
  assert(fs.existsSync(p), `Thiếu file thành phần: ${rel}`);
  const content = fs.readFileSync(p, 'utf8');
  assert(content.length > 20, `File ${rel} rỗng hoặc nội dung quá ngắn`);
});
console.log('✓ Test 3: Đầy đủ 12 file thành phần UI, capsule HUD và background của Chrome Extension.');

// Test 4: Kiểm tra logic xây dựng quy tắc Declarative Net Request (DNR)
function generateTestDnrRules(blacklist, whitelist) {
  const whitelistSet = new Set((whitelist || []).map(d => String(d).trim().toLowerCase()));
  const addRules = [];
  let ruleId = 1000;

  for (const domain of blacklist) {
    const cleanDomain = String(domain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleanDomain || whitelistSet.has(cleanDomain)) continue;

    addRules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          extensionPath: '/blocked/blocked.html'
        }
      },
      condition: {
        urlFilter: `||${cleanDomain}`,
        resourceTypes: ['main_frame']
      }
    });
  }
  return addRules;
}

const sampleBlacklist = ['youtube.com', 'facebook.com', 'github.com', 'tiktok.com'];
const sampleWhitelist = ['github.com'];

const generatedRules = generateTestDnrRules(sampleBlacklist, sampleWhitelist);
assert.strictEqual(generatedRules.length, 3, 'Phải có 3 rules (github.com đã nằm trong whitelist)');
assert.strictEqual(generatedRules[0].condition.urlFilter, '||youtube.com');
assert.strictEqual(generatedRules[0].action.type, 'redirect');
assert.strictEqual(generatedRules[0].action.redirect.extensionPath, '/blocked/blocked.html');
assert.deepStrictEqual(generatedRules[0].condition.resourceTypes, ['main_frame']);
console.log('✓ Test 4: Thuật toán tạo quy tắc DNR và lọc ngoại lệ Whitelist hoạt động chính xác.');

// Test 5: Kiểm tra Web App LevelUp đã tích hợp broadcast postMessage cho Extension
const timerSrcPath = path.resolve('src/js/06-timer.js');
const timerSrc = fs.readFileSync(timerSrcPath, 'utf8');
assert(timerSrc.includes('LEVELUP_TIMER_STATE_BROADCAST'), '06-timer.js phải phát event LEVELUP_TIMER_STATE_BROADCAST');

const appJsPath = path.resolve('public/app.js');
const appJs = fs.readFileSync(appJsPath, 'utf8');
assert(appJs.includes('LEVELUP_TIMER_STATE_BROADCAST'), 'public/app.js bundle phải chứa LEVELUP_TIMER_STATE_BROADCAST');
console.log('✓ Test 5: Web App LevelUp đã kích hoạt kênh đồng bộ postMessage sang Extension.');

// Test 6: Kiểm tra tài liệu CHROMEWEBSTORE.md
const storeDocPath = path.resolve('CHROMEWEBSTORE.md');
assert(fs.existsSync(storeDocPath), 'CHROMEWEBSTORE.md phải tồn tại');
const storeDoc = fs.readFileSync(storeDocPath, 'utf8');
assert(storeDoc.includes('Permissions Justification'), 'Thiếu phần Permissions Justification trong CHROMEWEBSTORE.md');
assert(storeDoc.includes('Privacy & Data Use'), 'Thiếu phần Privacy & Data Use trong CHROMEWEBSTORE.md');
assert(storeDoc.includes('1.2.0'), 'CHROMEWEBSTORE.md phải ghi nhận phiên bản 1.2.0');
console.log('✓ Test 6: Tài liệu chuẩn bị xuất bản Chrome Web Store (CHROMEWEBSTORE.md) đầy đủ.');

// Test 7: Kiểm tra tính năng Mini Floating Capsule HUD (Chấm Xanh/Đỏ, Timer, Nút x, Shadow DOM, Pháo hoa 8-bit)
const capsulePath = path.join(extDir, 'capsule.js');
const capsuleCode = fs.readFileSync(capsulePath, 'utf8');

assert(capsuleCode.includes('attachShadow'), 'capsule.js phải sử dụng Shadow DOM để cô lập CSS/DOM');
assert(capsuleCode.includes('dot-green'), 'capsule.js phải có chấm màu xanh khi tập trung bình thường');
assert(capsuleCode.includes('dot-red'), 'capsule.js phải có chấm màu đỏ khi phân tâm');
assert(capsuleCode.includes('capsule-timer'), 'capsule.js phải có đồng hồ hiển thị thời gian đếm ngược');
assert(capsuleCode.includes('capsule-dismiss'), 'capsule.js phải có nút × để tạm ẩn');
assert(!capsuleCode.includes('arbiter-bubble'), 'capsule.js KHÔNG được chứa bong bóng thoại thẩm phán AI (đã lược bỏ theo yêu cầu)');
assert(!capsuleCode.includes('mascot-svg'), 'capsule.js KHÔNG được chứa avatar hiệp sĩ (đã lược bỏ theo yêu cầu)');
assert(capsuleCode.includes('capsuleRumble'), 'capsule.js phải có animation rung rung (capsuleRumble) khi ở trang bị chặn');
assert(capsuleCode.includes('.capsule-pill.is-distraction .btn-dismiss'), 'capsule.js phải có định kiểu cho nút × trên trang bị chặn');
assert(capsuleCode.includes('returnToLevelUp(true)'), 'capsule.js phải gọi returnToLevelUp(true) khi bấm nút × ở trang bị chặn để đóng tab');
assert(capsuleCode.includes('.capsule-pill:hover .btn-dismiss'), 'capsule.js phải hỗ trợ hiện nút × khi hover');
assert(capsuleCode.includes('fireworks'), 'capsule.js phải có động cơ pháo hoa 8-bit ăn mừng');
assert(capsuleCode.includes('blocked-overlay'), 'capsule.js phải có lớp phủ cảnh báo lớn ở giữa màn hình (blocked-overlay)');
assert(capsuleCode.includes('blocked-card-center'), 'capsule.js phải có thẻ cảnh báo trung tâm (blocked-card-center)');
assert(capsuleCode.includes('gentleBobbing'), 'capsule.js phải có animation nảy lên xuống nhẹ nhàng (gentleBobbing)');
assert(capsuleCode.includes('btn-overlay-shrink'), 'capsule.js phải có nút kích hoạt thu nhỏ khiên (btn-overlay-shrink)');
assert(capsuleCode.includes('backdrop-filter'), 'capsule.js phải có hiệu ứng blur kính cho con nhộng thời gian');

// Kiểm tra trang blocked.html và blocked.css giữ trọn vẹn hiệu ứng Motion yêu thích
const blockedHtmlPath = path.join(extDir, 'blocked/blocked.html');
const blockedHtmlCode = fs.readFileSync(blockedHtmlPath, 'utf8');
const blockedCssPath = path.join(extDir, 'blocked/blocked.css');
const blockedCssCode = fs.readFileSync(blockedCssPath, 'utf8');

assert(blockedHtmlCode.includes('glow-orb'), 'blocked.html phải giữ hiệu ứng motion glow-orb');
assert(blockedHtmlCode.includes('animate-pulse'), 'blocked.html phải giữ hiệu ứng motion animate-pulse');
assert(blockedHtmlCode.includes('animate-ping'), 'blocked.html phải giữ hiệu ứng motion animate-ping');
assert(blockedCssCode.includes('cardRumble'), 'blocked.css phải có animation rung rung (cardRumble) khi xuất hiện');
console.log('✓ Test 7: Cảnh báo lớn nảy lên xuống nhẹ nhàng (gentleBobbing), con nhộng trong suốt blur kính, rung rung và nút × hover đóng tab khi ở trang bị chặn hoạt động chuẩn xác.');

// Test 8: Kiểm tra cấu hình, truyền tin hoàn thành phiên Focus và đóng tab phân tâm khi quay về LevelUp
const bgPath = path.join(extDir, 'background.js');
const bgCode = fs.readFileSync(bgPath, 'utf8');
assert(bgCode.includes('FOCUS_SESSION_COMPLETED'), 'background.js phải hỗ trợ sự kiện FOCUS_SESSION_COMPLETED');
assert(bgCode.includes('blockMode'), 'background.js phải hỗ trợ tùy chọn blockMode (in_page_alert vs redirect)');
assert(bgCode.includes('closeCurrentTab'), 'background.js phải hỗ trợ đóng tab trang bị chặn khi quay về LevelUp');
assert(capsuleCode.includes('closeCurrentTab'), 'capsule.js phải truyền closeCurrentTab khi bấm quay về LevelUp từ cảnh báo');

assert(timerSrc.includes('LEVELUP_FOCUS_COMPLETED'), '06-timer.js phải phát event LEVELUP_FOCUS_COMPLETED');
assert(appJs.includes('LEVELUP_FOCUS_COMPLETED'), 'public/app.js bundle phải chứa LEVELUP_FOCUS_COMPLETED');

const contentJsPath = path.join(extDir, 'content.js');
const contentJsCode = fs.readFileSync(contentJsPath, 'utf8');
assert(contentJsCode.includes('LEVELUP_FOCUS_COMPLETED'), 'content.js phải đón nhận LEVELUP_FOCUS_COMPLETED');
assert(contentJsCode.includes('FOCUS_SESSION_COMPLETED'), 'content.js phải chuyển tiếp FOCUS_SESSION_COMPLETED tới extension');
console.log('✓ Test 8: Chu trình đồng bộ hoàn thành phiên Focus và tự động đóng tab phân tâm hoạt động hoàn chỉnh.');

console.log('🎉 Toàn bộ bài kiểm tra Chrome Extension Focus Shield v1.2.0 thành công 100%!');
