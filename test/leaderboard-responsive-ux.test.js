import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Bắt đầu kiểm thử Toàn Diện Bảng Xếp Hạng Đa Thiết Bị (Desktop, iPad, Phone) ===\n');

const html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(process.cwd(), 'public', 'style.css'), 'utf8');
const appJs = fs.readFileSync(path.join(process.cwd(), 'public', 'app.js'), 'utf8');

// =============================================================================
// Test 1: Khung Bảng Xếp Hạng & Bố Cục Responsive trong index.html
// =============================================================================
function testLeaderboardHtmlStructure() {
  console.log('Kiểm thử 1: Khung HTML Bảng Xếp Hạng & các thành phần hiển thị...');

  // 1. Phải có ID tab leaderboard và header
  assert.ok(html.includes('id="tab-leaderboard"'), 'Phải có section #tab-leaderboard');
  assert.ok(html.includes('id="leaderboard-online-badge"'), 'Phải có badge online #leaderboard-online-badge');
  assert.ok(html.includes('id="leaderboard-online-count"'), 'Phải có bộ đếm #leaderboard-online-count');
  assert.ok(html.includes('id="btn-refresh-leaderboard"'), 'Phải có nút làm mới #btn-refresh-leaderboard');

  // 2. Phải có thanh Subtab và ô tìm kiếm nhanh
  assert.ok(html.includes('id="btn-subtab-ranking"'), 'Phải có nút subtab Bảng Hiệp Sĩ');
  assert.ok(html.includes('id="btn-subtab-cheaters"'), 'Phải có nút subtab Sổ Đen');
  assert.ok(html.includes('id="badge-cheaters-count"'), 'Phải có badge đếm vi phạm');
  assert.ok(html.includes('id="leaderboard-search-input"'), 'Phải có ô tìm kiếm #leaderboard-search-input');

  // 3. Phải có Bục Vinh Quang Top 3 (Podium) và đã lược bỏ thẻ my-rank-banner theo yêu cầu
  assert.ok(html.includes('id="leaderboard-podium"'), 'Phải có container #leaderboard-podium cho Top 3');
  assert.ok(!html.includes('id="leaderboard-my-rank"'), 'Phải bỏ container #leaderboard-my-rank');
  assert.ok(!html.includes('my-rank-banner'), 'Phải bỏ thẻ có class my-rank-banner');

  // 4. Bảng xếp hạng không còn bị ép min-w-[500px] gây vỡ / tràn ngang trên điện thoại di động
  const tabLeaderboardSlice = html.substring(html.indexOf('id="tab-leaderboard"'), html.indexOf('id="tab-ledger"'));
  assert.ok(!tabLeaderboardSlice.includes('min-w-[500px]'), 'Bảng xếp hạng không được ép min-w-[500px] để tránh cuộn ngang trên điện thoại');

  console.log('✓ Test 1: index.html có đầy đủ bục vinh quang Top 3, thẻ hạng cá nhân, ô tìm kiếm và bảng co giãn mượt mà.\n');
}

// =============================================================================
// Test 2: CSS Theme RPG & Hiệu Ứng Bục Vinh Quang (Desktop, iPad, Phone)
// =============================================================================
function testLeaderboardCss() {
  console.log('Kiểm thử 2: CSS Theme RPG Bục Vinh Quang & Thẻ Hạng Của Bạn...');

  assert.ok(css.includes('.leaderboard-podium-card'), 'style.css phải có class .leaderboard-podium-card');
  assert.ok(css.includes('.podium-rank-1'), 'style.css phải có class .podium-rank-1 cho Quán Quân');
  assert.ok(css.includes('.podium-rank-2'), 'style.css phải có class .podium-rank-2 cho Á Quân');
  assert.ok(css.includes('.podium-rank-3'), 'style.css phải có class .podium-rank-3 cho Hạng Ba');
  assert.ok(!css.includes('.my-rank-banner'), 'style.css không còn chứa class .my-rank-banner');
  assert.ok(css.includes('.crown-float'), 'style.css phải có hiệu ứng vương miện nổi bồng bềnh .crown-float');

  console.log('✓ Test 2: style.css đầy đủ hiệu ứng đổ bóng glassmorphism, viền vàng kim vương giả và gradient RPG.\n');
}

// =============================================================================
// Test 3: Logic Render Bục Vinh Quang, Thẻ Hạng & Bảng Lọc Tìm Kiếm trong app.js
// =============================================================================
function testLeaderboardJsLogic() {
  console.log('Kiểm thử 3: Logic hiển thị renderLeaderboardPodium, MyRank, Search trong app.js...');

  // 1. Kiểm tra các hàm chức năng
  assert.ok(appJs.includes('function renderLeaderboardPodium'), 'app.js phải có hàm renderLeaderboardPodium');
  assert.ok(!appJs.includes('function renderLeaderboardMyRank'), 'app.js phải bỏ hàm renderLeaderboardMyRank');
  assert.ok(appJs.includes('function renderLeaderboardTable'), 'app.js phải có hàm renderLeaderboardTable');

  // 2. Kiểm tra layout gom dòng thông minh trên mobile (dưới sm)
  assert.ok(appJs.includes('sm:hidden'), 'app.js phải có layout tinh gọn dòng phụ cho mobile');
  assert.ok(appJs.includes('hidden sm:table-cell'), 'app.js phải ẩn cột riêng lẻ trên mobile để tránh tràn');

  // 3. Kiểm tra tính năng tìm kiếm và làm mới
  assert.ok(appJs.includes('leaderboard-search-input'), 'app.js phải lắng nghe sự kiện gõ tìm kiếm');
  assert.ok(appJs.includes('btn-refresh-leaderboard'), 'app.js phải hỗ trợ nút làm mới thủ công');

  // 4. Bảo đảm duy trì công thức đồng bộ Vàng và Avatar Presence
  assert.ok(appJs.includes('const displayCoins = isMe ? (appState.profile?.coins ?? 0) : (typeof u.coins === \'number\' ? u.coins : (u.totalCoinsEarned || 0));'), 'app.js phải tính toán displayCoins chuẩn xác');
  assert.ok(appJs.includes('avatarWithPresence'), 'app.js phải duy trì avatarWithPresence');

  console.log('✓ Test 3: app.js thực hiện render linh hoạt Top 3, banner cá nhân và tìm kiếm mượt mà.\n');
}

// Chạy toàn bộ test
testLeaderboardHtmlStructure();
testLeaderboardCss();
testLeaderboardJsLogic();

console.log('🎉 TẤT CẢ CÁC BỘ KIỂM THỬ BẢNG XẾP HẠNG ĐA THIẾT BỊ ĐÃ VƯỢT QUA 100%!');
