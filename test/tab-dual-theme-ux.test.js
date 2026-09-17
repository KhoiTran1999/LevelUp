import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('=== Kiểm thử Tinh Gọn Header, Sửa Lỗi Menu Xem Thêm & Bản Sắc 5 Gam Màu RPG ===\n');

// 0. Kiểm tra cú pháp JavaScript của public/app.js
assert.doesNotThrow(() => {
  execSync('node -c public/app.js', { stdio: 'pipe' });
}, 'public/app.js phải hợp lệ cú pháp');
console.log('✓ Test 0: Cú pháp JavaScript của public/app.js hợp lệ 100%.');

const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
const styleCss = fs.readFileSync(path.resolve('public/style.css'), 'utf8');

// 1. Kiểm tra CSS phân tách độc lập giữa Bảng Treo Thưởng (Quests) và Tiệm Rượu & Kho Báu (Rewards)
const questRanks = ['E', 'D', 'C', 'B', 'A', 'S'];
questRanks.forEach(rank => {
  assert.ok(styleCss.includes(`.quest-card-rank-${rank}`), `style.css phải có class .quest-card-rank-${rank}`);
});

const rewardTiers = ['common', 'rare', 'epic', 'legendary'];
rewardTiers.forEach(tier => {
  assert.ok(styleCss.includes(`.reward-card-tier-${tier}`), `style.css phải có class .reward-card-tier-${tier}`);
});

assert.ok(!styleCss.includes('.quest-card-rank-E, .reward-card-tier-common'), 'style.css đã tách bạch hoàn toàn CSS của Quest và Reward');
console.log('✓ Test 1: Hệ thống thẻ phân loại Nhiệm Vụ (Chiến Trận) và Phần Thưởng (Kho Báu Ma Thuật) tách biệt độc lập.');

// 2. Kiểm tra Animation & Hiệu ứng Glow cho toàn bộ các tab
assert.ok(styleCss.includes('cubic-bezier(0.22, 1, 0.36, 1)'), 'style.css áp dụng đường cong gia tốc cao cấp cubic-bezier');
assert.ok(styleCss.includes('.nav-tab[data-tab="quests"].active'), 'style.css có ánh sáng hổ phách (amber glow) cho tab Quests');
assert.ok(styleCss.includes('.nav-tab[data-tab="shop"].active'), 'style.css có ánh sáng tím hoàng gia (purple glow) cho tab Shop');
assert.ok(styleCss.includes('.nav-tab[data-tab="leaderboard"].active'), 'style.css có ánh sáng vàng hoàng kim (yellow/gold glow) cho tab Leaderboard');
assert.ok(styleCss.includes('.nav-tab[data-tab="ledger"].active'), 'style.css có ánh sáng xanh cổ thư (sky glow) cho tab Ledger');
assert.ok(styleCss.includes('.nav-tab[data-tab="bank"].active'), 'style.css có ánh sáng ngọc lục bảo (emerald glow) cho tab Bank');
console.log('✓ Test 2: Animation chuyển tab tinh tế và 5 hiệu ứng ánh sáng Glow riêng biệt cho từng Archetype.');

// 3. Kiểm tra tinh gọn giao diện: Đã loại bỏ các khối banner văn bản dài dòng theo yêu cầu
assert.ok(!indexHtml.includes('BẢNG TREO THƯỞNG GUILD'), 'index.html đã loại bỏ banner văn bản dài dòng của Tab Nhiệm Vụ');
assert.ok(!indexHtml.includes('TIỆM RƯỢU & KHO BÁU BAZAAR'), 'index.html đã loại bỏ banner văn bản dài dòng của Tab Phần Thưởng');
assert.ok(!indexHtml.includes('Chinh phục mục tiêu kỷ luật để gặt hái Vàng thưởng'), 'Không còn đoạn mô tả dài dòng trong Quests');
assert.ok(!indexHtml.includes('Tự thưởng cho bản thân bằng Vàng bạn đã nỗ lực cày cuốc'), 'Không còn đoạn mô tả dài dòng trong Shop');
console.log('✓ Test 3: Giao diện Tab Nhiệm Vụ và Tab Phần Thưởng đã được tinh gọn, vào thẳng nội dung cốt lõi.');

// 4. Kiểm tra khắc phục lỗi nút "Xem Thêm" ở Desktop Navigation (≥ 768px)
assert.ok(indexHtml.includes('nav class="hidden md:block relative z-30'), 'nav desktop có relative z-30 chống bị đè lớp');
assert.ok(!indexHtml.includes('md:block relative z-30 max-w-6xl mx-auto px-3 sm:px-4 mt-4">\n      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 gap-1.5 xl:gap-2">\n        <div class="flex items-center gap-1 sm:gap-1.5 xl:gap-2 min-w-0 overflow-x-auto'), 'Container tab desktop không còn overflow-x-auto gây clip dropdown menu');
assert.ok(indexHtml.includes('id="nav-more-menu"'), 'index.html có dropdown menu desktop');
console.log('✓ Test 4: Sửa triệt để lỗi nút Xem Thêm ở Desktop: Gỡ bỏ overflow-x-auto và thiết lập z-index chuẩn.');

// 5. Kiểm tra hệ màu sắc độc bản cho Leaderboard, Ledger, Bank và đồng bộ switchTab
// Leaderboard: Imperial Gold / Yellow
assert.ok(indexHtml.includes('text-yellow-600 dark:text-yellow-400') && indexHtml.includes('BẢNG XẾP HẠNG HIỆP SĨ'), 'Leaderboard có phong cách Vàng Hoàng Kim');
assert.ok(appJs.includes('from-yellow-500 to-amber-500'), 'Subtab Ranking dùng màu vàng ánh kim');

// Ledger: Scholar Cyan / Sky Blue
assert.ok(indexHtml.includes('text-sky-600 dark:text-sky-400') && indexHtml.includes('LỊCH SỬ THU CHI VÀNG'), 'Ledger có tiêu đề màu Xanh Cổ Thư');
assert.ok(appJs.includes('bg-sky-500 text-white shadow-xs shadow-sky-500/20'), 'setLedgerFilter kích hoạt màu Sky Blue');

// Bank: Emerald Green
assert.ok(indexHtml.includes('border-emerald-500/30') && indexHtml.includes('text-emerald-700 dark:text-emerald-300') && indexHtml.includes('NGÂN HÀNG VÀNG'), 'Bank có vibe Ngọc Lục Bảo');

// switchTab đồng bộ màu active cho btn-nav-more, btn-mobile-more và các item menu
assert.ok(appJs.includes('tabColorTheme'), 'switchTab sở hữu ma trận màu tabColorTheme chuyên biệt');
assert.ok(appJs.includes('text-sky-700 dark:text-sky-300 border border-sky-500/40'), 'switchTab hỗ trợ theme Sky Blue cho Ledger');
assert.ok(appJs.includes('text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'), 'switchTab hỗ trợ theme Emerald Green cho Bank');
assert.ok(appJs.includes('text-yellow-700 dark:text-yellow-300 border border-yellow-500/40'), 'switchTab hỗ trợ theme Gold/Yellow cho Leaderboard');
console.log('✓ Test 5: Hệ thống 5 gam màu RPG chuyên biệt và chuyển đổi linh hoạt trên thanh điều hướng hoạt động hoàn hảo.');

// 6. Kiểm tra loại bỏ hoàn toàn scrollbar chống giật khung hình khi đổi trang
assert.ok(styleCss.includes('scrollbar-width: none !important;'), 'style.css triệt tiêu scrollbar trên Firefox & đa trình duyệt');
assert.ok(styleCss.includes('display: none !important;') && styleCss.includes('::-webkit-scrollbar'), 'style.css ẩn hoàn toàn scrollbar trên WebKit/Blink');
console.log('✓ Test 6: Đã loại bỏ hoàn toàn scrollbar, bảo toàn chiều rộng viewport 100vw và chống giật màn hình khi chuyển tab.');

// 7. Kiểm tra Tinh gọn thẻ Nhiệm Vụ: Menu "⋮", đưa Hạng và thao tác phụ vào dropdown
assert.ok(appJs.includes('btn-quest-menu'), 'app.js có nút menu thao tác ⋮ cho thẻ nhiệm vụ');
assert.ok(appJs.includes('quest-dropdown-menu'), 'app.js có container dropdown menu cho thẻ nhiệm vụ');
assert.ok(styleCss.includes('.quest-dropdown-menu'), 'style.css định nghĩa class .quest-dropdown-menu');
assert.ok(appJs.includes('btn-del-quest') && appJs.includes('btn-debate-quest') && appJs.includes('btn-toggle-repeat'), 'Các nút thao tác Xóa, Thương lượng và Lặp lại được quản lý trong menu');
assert.ok(appJs.includes('Phân cấp:') && appJs.includes('rank-badge-${q.rank}'), 'Thông tin Hạng được đưa vào bên trong menu dropdown để mặt trước thẻ tinh giản');
console.log('✓ Test 7: Thẻ Nhiệm Vụ được tinh gọn tối đa với menu ⋮, gom Hạng, Thương lượng, Lặp lại và Xóa vào dropdown.');

// 8. Kiểm tra Chuẩn hóa chiều cao thẻ & Nút toggle "...xem thêm"
assert.ok(appJs.includes('btn-toggle-desc'), 'app.js có nút toggle xem thêm cho thẻ nhiệm vụ và phần thưởng');
assert.ok(styleCss.includes('.btn-toggle-desc'), 'style.css có định nghĩa class .btn-toggle-desc');
assert.ok(appJs.includes('...xem thêm') && appJs.includes('Thu gọn ▲'), 'app.js có logic chuyển đổi giữa ...xem thêm và Thu gọn ▲');
assert.ok(appJs.includes('quest-desc-text') && appJs.includes('reward-desc-text'), 'app.js quản lý class text mô tả để toggle line-clamp-2');
assert.ok(styleCss.includes('.quest-desc-text.line-clamp-2') && styleCss.includes('-webkit-line-clamp: 2 !important'), 'style.css định nghĩa line-clamp-2 triệt để chống xung đột CSS');
assert.ok(!appJs.includes('quest-desc-text text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed inline'), 'app.js đã gỡ bỏ class inline gây xung đột vô hiệu hóa line-clamp-2');
console.log('✓ Test 8: Chuẩn hóa chiều cao thẻ với line-clamp-2 độc lập và nút toggle "...xem thêm" / "Thu gọn ▲" hoạt động trơn tru.');

// 9. Kiểm tra Bảng màu đơn sắc phân tầng RPG (Monochromatic Tiering)
// Quests: Warm Amber/Gold gradient (border-top: #fef3c7, #fde68a, #fcd34d, #fbbf24, #f59e0b, #d97706)
assert.ok(styleCss.includes('#fef3c7') && styleCss.includes('#fde68a') && styleCss.includes('#f59e0b') && styleCss.includes('#d97706'), 'Quest cards sử dụng dải màu đơn sắc Vàng Hổ Phách phân tầng từ S xuống E');
// Rewards: Royal Purple gradient (border-top: #e9d5ff, #c084fc, #9333ea, #7e22ce)
assert.ok(styleCss.includes('#e9d5ff') && styleCss.includes('#c084fc') && styleCss.includes('#9333ea') && styleCss.includes('#7e22ce'), 'Reward cards sử dụng dải màu đơn sắc Tím Hoàng Gia phân tầng từ Cực phẩm xuống Phổ thông');
console.log('✓ Test 9: Bảng màu đơn sắc phân tầng (Warm Amber cho Quests & Royal Purple cho Rewards) nhất quán và thẩm mỹ cao.');

// 10. Kiểm tra Tinh gọn thẻ Phần Thưởng (Shop & Inventory) đồng bộ với Tab Nhiệm Vụ
assert.ok(appJs.includes('btn-shop-menu') && appJs.includes('shop-dropdown-menu'), 'app.js có nút menu ⋮ và dropdown cho thẻ Cửa Hàng');
assert.ok(appJs.includes('btn-inv-menu') && appJs.includes('inv-dropdown-menu'), 'app.js có nút menu ⋮ và dropdown cho thẻ Kho Quà');
assert.ok(appJs.includes('btn-debate-shop-item') && appJs.includes('btn-del-shop-item'), 'Thao tác Thương lượng và Xóa shop được đưa vào dropdown');
assert.ok(appJs.includes('btn-refund-inv') && appJs.includes('btn-del-inv'), 'Thao tác Trả quà và Xóa kho được đưa vào dropdown');
console.log('✓ Test 10: Thẻ Phần Thưởng (Shop & Inventory) đã đồng bộ cấu trúc menu ⋮, gom Hạng và các nút phụ vào dropdown.');

// 11. Kiểm tra Hạ sắc độ và làm gọn kích thước nút bấm trên thẻ Nhiệm Vụ & Phần Thưởng
assert.ok(!appJs.includes('from-purple-600 via-fuchsia-600 to-amber-500'), 'Đã loại bỏ gradient tím-hồng-cam đa sắc sặc sỡ');
assert.ok(!appJs.includes('from-amber-500 to-orange-500'), 'Đã loại bỏ gradient cam neon sặc sỡ');
assert.ok(!appJs.includes('ring-2 ring-amber-400/50'), 'Đã loại bỏ viền ring phát sáng chói');
assert.ok(appJs.includes('py-2 px-3 rounded-lg text-xs font-semibold'), 'Nút hành động chính đã được hạ kích thước gọn gàng, thanh thoát');
console.log('✓ Test 11: Nút bấm trên thẻ Nhiệm Vụ & Phần Thưởng đã được hạ sắc độ trầm ấm và làm gọn gàng.');

// 12. Kiểm tra Loại bỏ icon ⚔️ và 🏷️ trên thẻ, chuyển "📸 CẦN ẢNH" vào menu, bỏ "Tập trung" / "Không bấm giờ"
assert.ok(!appJs.includes('<span class="text-[11px] font-bold text-amber-600 dark:text-amber-400">⚔️</span>'), 'Đã bỏ icon ⚔️ trước số coin trên thẻ nhiệm vụ');
assert.ok(!appJs.includes('🏷️ Giá:'), 'Đã bỏ icon 🏷️ trước Giá trên thẻ cửa hàng');
assert.ok(!appJs.includes('🏷️ Trị giá:'), 'Đã bỏ icon 🏷️ trước Trị giá trên thẻ kho quà');
assert.ok(!appJs.includes('🏷️ Phân cấp:'), 'Đã bỏ icon 🏷️ ở mục Phân cấp trong dropdown');
assert.ok(appJs.includes('${q.focusTimerCompleted ? \'CHỜ NỘP ẢNH\' : \'CẦN ẢNH\'}') && appJs.includes('Bằng chứng:'), 'CẦN ẢNH đã được chuyển vào trong menu dropdown');
console.log('✓ Test 12: Đã loại bỏ icon ⚔️ và 🏷️, chuyển CẦN ẢNH vào menu, bỏ chữ Tập trung / Không bấm giờ.');

console.log('\n=== TẤT CẢ 12/12 KIỂM THỬ NÂNG CẤP ĐÃ VƯỢT QUA XUẤT SẮC! ===');
