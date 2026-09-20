import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('=== Kiểm thử Tối Ưu Thư Viện, Build CSS & Hiệu Ứng Confetti RPG ===\n');

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');

// 1. Kiểm tra tailwind.config.js tồn tại và cấu hình đúng
const tailwindConfigPath = path.join(rootDir, 'tailwind.config.js');
assert.ok(fs.existsSync(tailwindConfigPath), 'tailwind.config.js phải tồn tại');
const tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf8');
assert.ok(tailwindConfig.includes("darkMode: 'class'"), 'tailwind.config.js phải bật darkMode: class');
assert.ok(tailwindConfig.includes('guild'), 'tailwind.config.js phải có bảng màu custom guild');
assert.ok(tailwindConfig.includes('#f59e0b'), 'guild.gold phải là #f59e0b');
console.log('✓ Test 1: tailwind.config.js cấu hình chuẩn xác với Dark mode và màu RPG hoàng gia.');

// 2. Kiểm tra tailwind.min.css được build thành công
const tailwindCssPath = path.join(publicDir, 'tailwind.min.css');
assert.ok(fs.existsSync(tailwindCssPath), 'public/tailwind.min.css phải tồn tại trên đĩa');
const tailwindCssStat = fs.statSync(tailwindCssPath);
assert.ok(tailwindCssStat.size > 20000, `public/tailwind.min.css phải có kích thước hợp lệ (> 20KB), hiện tại: ${tailwindCssStat.size} bytes`);
const tailwindCssContent = fs.readFileSync(tailwindCssPath, 'utf8');
assert.ok(tailwindCssContent.includes('guild') || tailwindCssContent.includes('#f59e0b'), 'tailwind.min.css phải chứa mã màu custom guild');
console.log(`✓ Test 2: public/tailwind.min.css được biên dịch tĩnh hoàn chỉnh (${(tailwindCssStat.size / 1024).toFixed(1)} KB).`);

// 3. Kiểm tra index.html đã gỡ bỏ hoàn toàn runtime CDN và nhúng file CSS build tĩnh
const htmlPath = path.join(publicDir, 'index.html');
const indexHtml = fs.readFileSync(htmlPath, 'utf8');
assert.ok(!indexHtml.includes('cdn.tailwindcss.com'), 'index.html KHÔNG được chứa script CDN cdn.tailwindcss.com');
assert.ok(indexHtml.includes('href="tailwind.min.css"'), 'index.html phải liên kết trực tiếp href="tailwind.min.css"');
console.log('✓ Test 3: index.html đã loại bỏ 100% CDN runtime, chuyển sang CSS tĩnh phục vụ offline PWA.');

// 4. Kiểm tra thư viện canvas-confetti offline-first trong public/vendor/
const confettiVendorPath = path.join(publicDir, 'vendor', 'confetti.browser.min.js');
assert.ok(fs.existsSync(confettiVendorPath), 'public/vendor/confetti.browser.min.js phải tồn tại');
const confettiStat = fs.statSync(confettiVendorPath);
assert.ok(confettiStat.size > 5000, 'File confetti vendor phải có dung lượng đầy đủ');
assert.ok(indexHtml.includes('src="vendor/confetti.browser.min.js"'), 'index.html phải nhúng vendor/confetti.browser.min.js');
console.log('✓ Test 4: Thư viện canvas-confetti đã được tích hợp offline-first trong public/vendor/.');

// 5. Kiểm tra hàm triggerRpgCelebration trong public/app.js
const appJsPath = path.join(publicDir, 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');
assert.ok(appJsContent.includes('function triggerRpgCelebration'), 'public/app.js phải định nghĩa hàm triggerRpgCelebration');
assert.ok(appJsContent.includes("triggerRpgCelebration('levelup')"), 'addEXP phải gọi triggerRpgCelebration khi lên cấp');
assert.ok(appJsContent.includes("triggerRpgCelebration('s_rank')"), 'completeQuest phải gọi triggerRpgCelebration khi hoàn thành quest S-Rank');

// Kiểm tra cú pháp syntax của app.js
assert.doesNotThrow(() => {
  execSync('node -c public/app.js', { stdio: 'pipe' });
}, 'public/app.js phải hợp lệ cú pháp không lỗi SyntaxError');
console.log('✓ Test 5: Logic hiệu ứng RPG celebration tích hợp an toàn và cú pháp app.js hợp lệ 100%.');

// 6. Kiểm tra package.json scripts
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert.ok(pkg.scripts['build:css'], 'package.json phải có script build:css');
assert.ok(pkg.scripts['watch:css'], 'package.json phải có script watch:css');
assert.ok(pkg.devDependencies['tailwindcss'], 'package.json devDependencies phải có tailwindcss');
console.log('✓ Test 6: package.json đã cấu hình đầy đủ build:css, watch:css và devDependencies.');

console.log('\n🎉 TẤT CẢ KIỂM THỬ TỐI ƯU THƯ VIỆN & BUILD CSS ĐÃ VƯỢT QUA XUẤT SẮC!');
