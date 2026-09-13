import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Bắt đầu kiểm thử Web App Logo & PWA Manifest ---');

const publicDir = path.resolve('public');
const manifestPath = path.join(publicDir, 'manifest.json');
const htmlPath = path.join(publicDir, 'index.html');

// Test 1: manifest.json tồn tại và có cấu trúc hợp lệ
assert(fs.existsSync(manifestPath), 'manifest.json phải tồn tại');
const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);

assert.strictEqual(manifest.name, 'LevelUp — Gamify Your Life');
assert.strictEqual(manifest.short_name, 'LevelUp');
assert.strictEqual(manifest.display, 'standalone');
assert.strictEqual(manifest.background_color, '#0f172a');
assert.strictEqual(manifest.theme_color, '#0f172a');
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'Phải có ít nhất 4 icon trong manifest');
console.log('✓ Test 1: manifest.json hợp lệ với chế độ standalone và theme dark slate.');

// Test 2: Tất cả các file icon khai báo trong manifest đều tồn tại trên ổ đĩa
manifest.icons.forEach(icon => {
  const relPath = icon.src.replace(/^\//, '');
  const iconDiskPath = path.join(publicDir, relPath);
  assert(fs.existsSync(iconDiskPath), `File icon ${icon.src} không tồn tại trên đĩa`);
  const stat = fs.statSync(iconDiskPath);
  assert(stat.size > 0, `File icon ${icon.src} rỗng (0 bytes)`);
});
console.log('✓ Test 2: Tất cả các file icon khai báo trong manifest đều tồn tại và hợp lệ.');

// Test 3: Các icon bắt buộc cho iOS và Android PWA tồn tại với dung lượng thực tế
const requiredIcons = [
  { name: 'logo.svg', minSize: 1000 },
  { name: 'apple-touch-icon.png', minSize: 5000 },
  { name: 'icon-192.png', minSize: 5000 },
  { name: 'icon-512.png', minSize: 10000 },
  { name: 'favicon.png', minSize: 100 }
];

requiredIcons.forEach(item => {
  const p = path.join(publicDir, item.name);
  assert(fs.existsSync(p), `Thiếu file ${item.name}`);
  const stat = fs.statSync(p);
  assert(stat.size >= item.minSize, `Kích thước file ${item.name} quá nhỏ: ${stat.size} bytes`);
});
console.log('✓ Test 3: Bộ icon raster PNG và vector SVG đầy đủ chuẩn Apple Touch & Android PWA.');

// Test 4: index.html liên kết đầy đủ thẻ manifest, apple-touch-icon, favicon và PWA meta
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(htmlContent.includes('rel="manifest"'), 'index.html thiếu rel="manifest"');
assert(htmlContent.includes('rel="apple-touch-icon"'), 'index.html thiếu rel="apple-touch-icon"');
assert(htmlContent.includes('href="logo.svg"'), 'index.html thiếu liên kết logo.svg');
assert(htmlContent.includes('href="apple-touch-icon.png"'), 'index.html thiếu liên kết apple-touch-icon.png');
assert(htmlContent.includes('name="apple-mobile-web-app-capable" content="yes"'), 'index.html thiếu apple-mobile-web-app-capable');
assert(htmlContent.includes('name="apple-mobile-web-app-title" content="LevelUp"'), 'index.html thiếu apple-mobile-web-app-title');
assert(htmlContent.includes('name="mobile-web-app-capable" content="yes"'), 'index.html thiếu mobile-web-app-capable');
assert(htmlContent.includes('name="theme-color"'), 'index.html thiếu meta theme-color');
console.log('✓ Test 4: index.html có đầy đủ thẻ head cho iOS Safari và Android Chrome.');

console.log('\n🎉 TẤT CẢ KIỂM THỬ WEB APP LOGO & PWA ĐÃ VƯỢT QUA THÀNH CÔNG!');
