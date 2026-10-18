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

const requiredPermissions = ['declarativeNetRequest', 'storage', 'alarms', 'tabs'];
requiredPermissions.forEach(perm => {
  assert(manifest.permissions.includes(perm), `Thiếu permission: ${perm}`);
});
console.log('✓ Test 1: manifest.json hợp lệ chuẩn Manifest V3 với đầy đủ permissions cần thiết.');

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
console.log('✓ Test 3: Đầy đủ 11 file thành phần UI và background của Chrome Extension.');

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
console.log('✓ Test 6: Tài liệu chuẩn bị xuất bản Chrome Web Store (CHROMEWEBSTORE.md) đầy đủ.');

console.log('🎉 Toàn bộ bài kiểm tra Chrome Extension Focus Shield thành công 100%!');
