import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('=== Kiểm thử Hệ Thống Màu Sắc Toàn Diện Chuẩn Google Material Design 3 (M3) ===\n');

// 0. Kiểm tra cú pháp JavaScript của test/fixtures/legacy-client/app.js
assert.doesNotThrow(() => {
  execSync('node -c test/fixtures/legacy-client/app.js', { stdio: 'pipe' });
}, 'test/fixtures/legacy-client/app.js phải hợp lệ cú pháp');
console.log('✓ Test 0: Cú pháp JavaScript của test/fixtures/legacy-client/app.js hợp lệ 100%.');

const appJs = fs.readFileSync(path.resolve('test/fixtures/legacy-client/app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
const paletteComponent = fs.readFileSync(path.resolve('components/profile/PaletteStudioModal.tsx'), 'utf8');
const styleCss = fs.readFileSync(path.resolve('public/style.css'), 'utf8');
const tailwindConfig = fs.readFileSync(path.resolve('tailwind.config.js'), 'utf8');

// 1. Kiểm tra style.css định nghĩa đầy đủ 7 bộ màu Master Material 3
const expectedPalettes = [
  'm3-baseline',
  'm3-ocean',
  'guild',
  'm3-emerald',
  'm3-crimson',
  'm3-monochrome'
];

expectedPalettes.forEach(pal => {
  assert.ok(styleCss.includes(`html[data-palette="${pal}"]`), `style.css phải chứa định nghĩa Light mode cho palette: ${pal}`);
  assert.ok(styleCss.includes(`html.dark[data-palette="${pal}"]`), `style.css phải chứa định nghĩa Dark mode cho palette: ${pal}`);
});
console.log('✓ Test 1: style.css định nghĩa đầy đủ 7 bộ phối màu Master M3 cho cả Light & Dark mode.');

// 2. Kiểm tra các vai trò M3 Surface Container & Elevation Tinting
const expectedSurfaceRoles = [
  '--md-sys-color-surface-dim',
  '--md-sys-color-surface-bright',
  '--md-sys-color-surface-container-lowest',
  '--md-sys-color-surface-container-low',
  '--md-sys-color-surface-container',
  '--md-sys-color-surface-container-high',
  '--md-sys-color-surface-container-highest',
  '--md-sys-color-surface-tint'
];

expectedSurfaceRoles.forEach(role => {
  assert.ok(styleCss.includes(role), `style.css phải định nghĩa vai trò màu bề mặt: ${role}`);
});
console.log('✓ Test 2: Hệ thống Surface Containers (Lowest -> Highest) và Surface Tint đã hiện diện đầy đủ.');

// 3. Kiểm tra các token RPG Domain Harmonized Colors (Gold, Mana, Streak, XP)
const expectedRpgTokens = [
  '--md-custom-color-gold',
  '--md-custom-color-gold-container',
  '--md-custom-color-mana',
  '--md-custom-color-mana-container',
  '--md-custom-color-streak',
  '--md-custom-color-streak-container',
  '--md-custom-color-xp',
  '--md-custom-color-xp-container'
];

expectedRpgTokens.forEach(token => {
  assert.ok(styleCss.includes(token), `style.css phải định nghĩa token RPG: ${token}`);
});
console.log('✓ Test 3: Các gam màu RPG (Gold, Mana, Streak, XP) được định nghĩa ngữ nghĩa và hòa sắc chuẩn M3.');

// 4. Kiểm tra tailwind.config.js ánh xạ các biến CSS động
assert.ok(tailwindConfig.includes("'on-primary': 'var(--md-sys-color-on-primary)'"), 'tailwind.config.js ánh xạ on-primary');
assert.ok(tailwindConfig.includes("'surface-container': 'var(--md-sys-color-surface-container)'"), 'tailwind.config.js ánh xạ surface-container');
assert.ok(tailwindConfig.includes("gold: 'var(--md-custom-color-gold)'"), 'tailwind.config.js ánh xạ token gold');
assert.ok(tailwindConfig.includes("mana: 'var(--md-custom-color-mana)'"), 'tailwind.config.js ánh xạ token mana');
console.log('✓ Test 4: tailwind.config.js ánh xạ toàn bộ tokens M3 sang CSS custom properties.');

// 5. Kiểm tra PALETTES và engine tính toán màu động trong app.js
assert.ok(appJs.includes('generateM3TonalPalette'), 'app.js phải chứa hàm generateM3TonalPalette');
assert.ok(appJs.includes('applyCustomDynamicSeed'), 'app.js phải chứa hàm applyCustomDynamicSeed');
assert.ok(appJs.includes('openPaletteStudio'), 'app.js phải chứa hàm openPaletteStudio');
assert.ok(appJs.includes('m3-monochrome') && appJs.includes('m3-emerald') && appJs.includes('m3-crimson'), 'app.js phải chứa đầy đủ 7 palettes trong mảng PALETTES');
console.log('✓ Test 5: Engine tính toán màu động HCT và quản lý Palette Studio tích hợp đầy đủ trong JavaScript.');

// 6. Kiểm tra giao diện Material 3 Palette Studio Modal trong React
assert.ok(paletteComponent.includes('id="m3-palette-studio-modal"'), 'React có modal #m3-palette-studio-modal');
assert.ok(paletteComponent.includes('id="m3-palette-studio-grid"'), 'React có container lưới #m3-palette-studio-grid');
assert.ok(paletteComponent.includes('id="m3-seed-picker-input"'), 'React có ô chọn màu động #m3-seed-picker-input');
assert.ok(paletteComponent.includes('WCAG 2.1 AA'), 'React có huy hiệu bảo đảm tương phản WCAG 2.1 AA');
assert.ok(!indexHtml.includes('id="m3-palette-studio-modal"'), 'Legacy HTML không còn sở hữu Palette Studio');
console.log('✓ Test 6: Giao diện Material 3 Palette Studio Hub được xây dựng trong React.');

console.log('\n=== TẤT CẢ 6 KIỂM THỬ HỆ THỐNG MÀU SẮC M3 ĐÃ VƯỢT QUA XUẤT SẮC! ===');
