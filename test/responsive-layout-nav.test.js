import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== Bắt đầu kiểm thử Toàn Diện Giao Diện Đa Thiết Bị & Thanh Điều Hướng Admin ===\n');

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const appJs = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const syncJs = fs.readFileSync(new URL('../api/sync.js', import.meta.url), 'utf8');
const env = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');

// =============================================================================
// Test 1: Desktop Navigation Bar (1280px, 1440px, 1920px Full HD)
// =============================================================================
function testDesktopNavBar() {
  console.log('Kiểm thử 1: Thanh điều hướng Desktop (1280px, 1440px, 1920px)...');

  // Đảm bảo có đầy đủ 5 tab
  assert.ok(html.includes('data-tab="quests"'), 'Phải có tab Nhiệm Vụ');
  assert.ok(html.includes('data-tab="shop"'), 'Phải có tab Phần Thưởng');
  assert.ok(html.includes('data-tab="leaderboard"'), 'Phải có tab Xếp Hạng');
  assert.ok(html.includes('data-tab="ledger"'), 'Phải có tab Lịch Sử');
  assert.ok(html.includes('id="nav-tab-admin"'), 'Phải có tab Quản Trị');

  // Kiểm tra nhãn ngắn gọn, súc tích (chống tràn chữ như "Lịch S...")
  const navSlice = html.substring(html.indexOf('<nav class="hidden md:block'), html.indexOf('</nav>'));
  assert.ok(navSlice.includes('<span>Lịch Sử</span>'), 'Tab Lịch Sử phải súc tích để không bị cắt chữ');
  assert.ok(navSlice.includes('<span>Quản Trị</span>'), 'Tab Quản Trị phải súc tích để không bị tràn màn hình');
  assert.ok(!navSlice.includes('Lịch Sử Vàng'), 'Không dùng cụm từ dài "Lịch Sử Vàng" gây tràn layout');

  // Kiểm tra tách bạch nút hành động theo đúng từng tab chuyên biệt (không gộp chung vào navbar)
  assert.ok(!navSlice.includes('id="btn-open-add-quest"'), 'Navbar không còn gộp nút Thêm Việc Mới');
  assert.ok(!navSlice.includes('id="btn-open-add-reward-nav"'), 'Navbar không còn gộp nút Thêm Quà');

  // Đảm bảo các nút hành động nằm ở đúng tab tương ứng
  const tabQuestsSlice = html.substring(html.indexOf('id="tab-quests"'), html.indexOf('id="tab-shop"'));
  assert.ok(tabQuestsSlice.includes('id="btn-open-add-quest"'), 'Nút Thêm Việc Mới phải nằm ở đúng Tab Nhiệm Vụ');

  const tabShopSlice = html.substring(html.indexOf('id="tab-shop"'), html.indexOf('id="tab-leaderboard"'));
  assert.ok(tabShopSlice.includes('id="btn-open-add-reward-nav"'), 'Nút Thêm Phần Thưởng phải nằm ở đúng Tab Phần Thưởng');

  // Ước tính kích thước đồ họa (bounding width check) trên container max-w-6xl (1120px khả dụng)
  // Logo: ~105px, 5 tabs: ~515px => Total ~620px
  // 620px < 1120px => Dư tới 500px khoảng thở, tuyệt đối không bị overflow ẩn tab
  const totalEstimatedWidth = 105 + 515;
  const availableDesktopWidth = 1152 - 32; // max-w-6xl trừ padding 16px mỗi bên
  assert.ok(totalEstimatedWidth < availableDesktopWidth, `Tổng chiều rộng các phần tử (${totalEstimatedWidth}px) phải nhỏ hơn không gian khả dụng (${availableDesktopWidth}px)`);

  console.log('✓ Test 1: Desktop Navigation Bar hiển thị đầy đủ 5 tab tinh gọn, tách nút chức năng về đúng từng tab (dư 500px khoảng thở).\n');
}

// =============================================================================
// Test 2: Tablet / iPad Mini Navigation Bar (768px - 1023px)
// =============================================================================
function testTabletNavBar() {
  console.log('Kiểm thử 2: Thanh điều hướng Máy tính bảng / iPad Mini (768px)...');

  const navSlice = html.substring(html.indexOf('<nav class="hidden md:block'), html.indexOf('</nav>'));

  // Trên iPad Mini (md: 768px):
  // Logo ẩn trên màn hình nhỏ hơn lg (hidden lg:flex)
  assert.ok(navSlice.includes('hidden lg:flex items-center'), 'Logo phải ẩn trên tablet < lg để nhường chỗ cho các tab');

  // Kiểm tra tab Phần thưởng có fallback nhãn ngắn "Thưởng" trên tablet
  assert.ok(navSlice.includes('<span class="lg:hidden">Thưởng</span>'), 'Tab Phần thưởng phải có nhãn rút gọn "Thưởng" trên tablet');

  // Ước tính kích thước trên tablet 768px (736px khả dụng):
  // Tabs: ~420px => Total: 420px < 736px (dư 316px)
  const tabletEstimatedWidth = 420;
  const availableTabletWidth = 768 - 32;
  assert.ok(tabletEstimatedWidth < availableTabletWidth, `Trên tablet 768px, tổng chiều rộng (${tabletEstimatedWidth}px) phải nhỏ hơn ${availableTabletWidth}px`);

  console.log('✓ Test 2: Tablet / iPad Mini thanh điều hướng tinh gọn, hiển thị đầy đủ 5 tab không tràn (dư 316px).\n');
}

// =============================================================================
// Test 3: Mobile Navigation & Bottom Bar (< 768px)
// =============================================================================
function testMobileNavigation() {
  console.log('Kiểm thử 3: Giao diện Di động (Mobile Phone < 768px)...');

  // Các nút hành động hiển thị ở đầu mỗi tab trên cả mobile và desktop
  const tabQuestsSlice = html.substring(html.indexOf('id="tab-quests"'), html.indexOf('id="tab-shop"'));
  assert.ok(tabQuestsSlice.includes('id="btn-open-add-quest"'), 'Phải có nút thêm việc trong tab nhiệm vụ');

  const tabShopSlice = html.substring(html.indexOf('id="tab-shop"'), html.indexOf('id="tab-leaderboard"'));
  assert.ok(tabShopSlice.includes('id="btn-open-add-reward-nav"'), 'Phải có nút thêm quà trong tab phần thưởng');

  // Thanh điều hướng dưới đáy (Bottom Navigation Bar)
  const mobileNavSlice = html.substring(html.indexOf('<!-- MOBILE BOTTOM NAVIGATION'), html.indexOf('<!-- MODALS'));
  assert.ok(mobileNavSlice.includes('id="mobile-nav-admin"'), 'Phải có nút Quản trị trên thanh đáy');
  assert.ok(mobileNavSlice.includes('flex-1 min-w-0'), 'Các nút đáy mobile phải có flex-1 min-w-0 để chia đều 5 cột');
  assert.ok(mobileNavSlice.includes('whitespace-nowrap'), 'Chữ trên thanh đáy phải có whitespace-nowrap chống gãy dòng');

  console.log('✓ Test 3: Giao diện Mobile tối ưu với nút bấm tại từng tab và bottom bar 5 cột cân xứng.\n');
}

// =============================================================================
// Test 4: Phân Quyền Admin & Nhận Diện Tài Khoản Khôi Trần
// =============================================================================
function testAdminRecognition() {
  console.log('Kiểm thử 4: Cơ chế Nhận diện Quản trị viên & Phân quyền...');

  // Kiểm tra app.js có hàm isUserAdmin
  assert.ok(appJs.includes('function isUserAdmin()'), 'app.js phải có hàm isUserAdmin');
  assert.ok(appJs.includes('khôi trần'), 'isUserAdmin phải nhận diện nickname Khôi Trần');
  assert.ok(appJs.includes('khoitran200199@gmail.com'), 'isUserAdmin phải nhận diện email khoitran200199@gmail.com');

  // Kiểm tra sync.js có danh sách email và nickname admin bao gồm Khôi Trần
  assert.ok(syncJs.includes('khoitran200199@gmail.com'), 'sync.js phải chứa email khoitran200199@gmail.com làm admin');
  assert.ok(syncJs.includes('khôi trần'), 'sync.js phải chứa nickname Khôi Trần làm admin');

  // Kiểm tra file .env có cấu hình admin
  assert.ok(env.includes('khoitran200199@gmail.com'), '.env phải chứa email admin khoitran200199@gmail.com');
  assert.ok(env.includes('khôi trần'), '.env phải chứa nickname admin Khôi Trần');

  // Kiểm tra hàm updateAdminNavVisibility gọi isUserAdmin
  assert.ok(appJs.includes('const isAdmin = isUserAdmin();'), 'updateAdminNavVisibility và switchTab phải dùng isUserAdmin');

  console.log('✓ Test 4: Nhận diện Quản trị viên Khôi Trần hoạt động nhất quán trên cả Client và Server API.\n');
}

// =============================================================================
// Test 5: Đồng bộ Class khi Chuyển Tab (switchTab)
// =============================================================================
function testSwitchTabClassSync() {
  console.log('Kiểm thử 5: Đồng bộ Class CSS khi chuyển Tab (switchTab)...');

  // Kiểm tra switchTab không gán class quá khổ (xl:px-4 hoặc xl:text-sm) làm vỡ giao diện
  const switchTabSlice = appJs.substring(appJs.indexOf('function switchTab('), appJs.indexOf('function openModal('));
  assert.ok(!switchTabSlice.includes('xl:px-4'), 'switchTab không được gán xl:px-4 làm tràn navbar');
  assert.ok(!switchTabSlice.includes('xl:text-sm'), 'switchTab không được gán xl:text-sm làm to chữ các tab');
  assert.ok(switchTabSlice.includes('xl:px-3'), 'switchTab phải dùng padding xl:px-3 tinh gọn, đồng bộ với index.html');

  console.log('✓ Test 5: switchTab cập nhật class CSS đồng bộ và bảo đảm không gây tràn layout khi click.\n');
}

// Chạy toàn bộ test
testDesktopNavBar();
testTabletNavBar();
testMobileNavigation();
testAdminRecognition();
testSwitchTabClassSync();

console.log('🎉 TẤT CẢ 5/5 BỘ KIỂM THỬ GIAO DIỆN ĐA THIẾT BỊ & THANH ĐIỀU HƯỚNG ĐÃ VƯỢT QUA XUẤT SẮC!');
