import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Bắt đầu kiểm thử Lớp Hiển Thị Z-Index Cho Menu Dropdown Thẻ & Chống Bị Đè ===\n');

const css = fs.readFileSync(path.join(process.cwd(), 'public', 'style.css'), 'utf8');
const appJs = fs.readFileSync(path.join(process.cwd(), 'public', 'app.js'), 'utf8');

// =============================================================================
// Test 1: CSS Stacking Context cho .rpg-card & .quest-dropdown-menu
// =============================================================================
function testCardDropdownCss() {
  console.log('Kiểm thử 1: CSS Stacking Context cho thẻ và menu dropdown...');

  // 1. Thẻ .rpg-card phải có position: relative và z-index base
  assert.ok(css.includes('.rpg-card {') && css.includes('position: relative;') && css.includes('z-index: 1;'), 'style.css phải định nghĩa position: relative và z-index: 1 cho .rpg-card');

  // 2. Khi menu dropdown mở, thẻ cha phải được nâng z-index cao hơn các thẻ kế tiếp
  assert.ok(css.includes('.rpg-card.card-menu-open') || css.includes('.rpg-card:has(.quest-dropdown-menu:not(.hidden))'), 'style.css phải có quy tắc nâng z-index khi menu mở');
  assert.ok(css.includes('z-index: 25 !important;'), 'style.css phải nâng z-index lên 25 !important để vượt qua thẻ kế tiếp');

  // 3. Menu .quest-dropdown-menu phải có z-index cao (50) và nền đặc chống xuyên thấu
  assert.ok(css.includes('.quest-dropdown-menu {'), 'style.css phải có class .quest-dropdown-menu');
  assert.ok(css.includes('z-index: 50;'), 'Menu dropdown phải có z-index: 50');
  assert.ok(css.includes('html.dark .quest-dropdown-menu'), 'style.css phải hỗ trợ chế độ dark mode cho menu dropdown');

  console.log('✓ Test 1: style.css định nghĩa chuẩn xác Stacking Context, z-index 25 cho thẻ active và 50 cho menu dropdown.\n');
}

// =============================================================================
// Test 2: JavaScript quản lý đóng mở menu và hạ/nâng z-index
// =============================================================================
function testCardDropdownJs() {
  console.log('Kiểm thử 2: Logic JavaScript quản lý menu dropdown trong app.js...');

  // 1. Hàm closeAllCardDropdowns phải được khai báo
  assert.ok(appJs.includes('function closeAllCardDropdowns()'), 'app.js phải có hàm closeAllCardDropdowns');
  assert.ok(appJs.includes("m.closest('.rpg-card')?.classList.remove('card-menu-open')"), 'closeAllCardDropdowns phải gỡ bỏ class card-menu-open');

  // 2. renderQuests phải quản lý card-menu-open khi bấm nút ⋮
  assert.ok(appJs.includes("card.classList.add('card-menu-open')"), 'renderQuests phải gán class card-menu-open vào thẻ khi mở menu');

  // 3. Khi click ra ngoài, closeAllCardDropdowns phải được gọi
  assert.ok(
    appJs.includes("!e.target.closest('.quest-dropdown-menu')") && appJs.includes('closeAllCardDropdowns()'),
    'Click ngoài phải kích hoạt closeAllCardDropdowns'
  );

  console.log('✓ Test 2: app.js quản lý hoàn hảo vòng đời đóng/mở menu và đồng bộ class card-menu-open.\n');
}

testCardDropdownCss();
testCardDropdownJs();

console.log('🎉 TẤT CẢ CÁC BỘ KIỂM THỬ Z-INDEX STACKING ĐÃ VƯỢT QUA 100%!\n');
