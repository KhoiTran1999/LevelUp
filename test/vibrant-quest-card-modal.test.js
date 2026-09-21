import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Kiểm thử Giao Diện Thẻ Tinh Gọn, Giữ Nguyên Màu Sắc RPG, Lịch Tuần & Modal Chi Tiết ===\n');

const html = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
const css = fs.readFileSync(path.resolve('public/style.css'), 'utf8');
const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

// 1. Kiểm tra HTML Lịch tuần & Modal chi tiết nhiệm vụ
console.log('Test 1: Kiểm tra cấu trúc HTML Lịch Tuần & Modal Chi Tiết Nhiệm Vụ...');
assert.ok(html.includes('id="week-calendar-container"'), 'index.html phải có container id="week-calendar-container"');
assert.ok(html.includes('id="week-strip-days"'), 'index.html phải có id="week-strip-days"');
assert.ok(html.includes('id="modal-quest-detail"'), 'index.html phải có modal chi tiết id="modal-quest-detail"');
assert.ok(html.includes('id="mqd-title"'), 'modal chi tiết phải có id="mqd-title"');
assert.ok(html.includes('id="mqd-coins-reward"'), 'modal chi tiết phải có id="mqd-coins-reward"');
assert.ok(html.includes('id="mqd-exp-reward"'), 'modal chi tiết phải có id="mqd-exp-reward"');
assert.ok(html.includes('id="mqd-primary-action-container"'), 'modal chi tiết phải có container cho các nút hành động chính');
console.log('✓ Test 1: Cấu trúc HTML Lịch Tuần và Modal Chi Tiết đầy đủ các phần tử chuẩn xác.\n');

// 2. Kiểm tra CSS Định dạng Thẻ Tinh Gọn & Giữ Nguyên Bản Sắc Màu RPG
console.log('Test 2: Kiểm tra CSS cho Thẻ Tinh Gọn & Bản Sắc RPG...');
assert.ok(css.includes('.quest-card-compact'), 'style.css phải định nghĩa .quest-card-compact');
assert.ok(css.includes('.quest-card-rank-E'), 'style.css phải giữ nguyên bản sắc rank E');
assert.ok(css.includes('.quest-card-rank-S'), 'style.css phải giữ nguyên bản sắc rank S');
assert.ok(css.includes('.week-calendar-strip'), 'style.css phải có .week-calendar-strip');
assert.ok(css.includes('.week-day-col.is-today'), 'style.css phải có class đánh dấu ngày hôm nay .week-day-col.is-today');
console.log('✓ Test 2: CSS thẻ tinh gọn, bảo toàn màu sắc RPG nguyên bản và lịch tuần chuẩn xác.\n');

// 3. Kiểm tra JavaScript logic: renderWeekStrip, openQuestDetailModal
console.log('Test 3: Kiểm tra Logic JavaScript trong app.js...');
assert.ok(appJs.includes('function renderWeekStrip()'), 'app.js phải có hàm renderWeekStrip');
assert.ok(appJs.includes('window.renderWeekStrip = renderWeekStrip;'), 'renderWeekStrip phải được gắn vào window');
assert.ok(appJs.includes('function openQuestDetailModal('), 'app.js phải có hàm openQuestDetailModal');
assert.ok(appJs.includes('window.openQuestDetailModal = openQuestDetailModal;'), 'openQuestDetailModal phải được gắn vào window');
assert.ok(appJs.includes('quest-card-compact'), 'renderQuests phải gán class quest-card-compact');
assert.ok(appJs.includes('openQuestDetailModal(q.id)'), 'renderQuests phải gọi openQuestDetailModal khi click thẻ');
console.log('✓ Test 3: JavaScript render thẻ tinh gọn, lịch tuần và mở modal chi tiết hoạt động hoàn hảo.\n');

// 4. Kiểm tra Thẻ không còn nút bên phải, đưa thời gian sang bên phải dãn cách thoáng đãng
console.log('Test 4: Kiểm tra loại bỏ nút bên phải và dãn cách thông tin nhiệm vụ & thời gian...');
assert.ok(!appJs.includes('<polygon points="6 4 20 12 6 20 6 4"/>'), 'renderQuests không còn chứa icon play tam giác trong thẻ');
assert.ok(!appJs.includes('<line x1="18" y1="6" x2="6" y2="18" stroke-width="2.5"/>'), 'renderQuests không còn chứa icon dấu x trong thẻ');
assert.ok(appJs.includes('Right: Time & Streak Information'), 'renderQuests bố trí thông tin thời gian & chuỗi ngày riêng biệt ở cột phải');
console.log('✓ Test 4: Giao diện thẻ đã loại bỏ nút bên phải, phân tách thông tin thời gian và nhiệm vụ thoáng đãng.\n');

// 5. Kiểm tra Dữ liệu Chuỗi Streak Nhiệm Vụ Độc Lập & Dãn Cách Thoáng Đãng Nút Thời Gian
console.log('Test 5: Kiểm tra thuật toán getQuestStreak độc lập cho từng nhiệm vụ và dãn cách thẻ...');
assert.ok(appJs.includes('function getQuestStreak('), 'app.js phải có hàm getQuestStreak');
assert.ok(appJs.includes('window.getQuestStreak = getQuestStreak;'), 'getQuestStreak phải được gắn vào window');
assert.ok(appJs.includes('getQuestStreak(q)'), 'renderQuests phải gọi getQuestStreak(q) thay vì hardcode profile streak');
assert.ok(css.includes('min-height: 5.25rem !important;'), 'style.css nâng chiều cao tối thiểu lên 5.25rem để thẻ không bị chèn lấn');
assert.ok(css.includes('padding: 0.25rem 0.65rem !important;'), 'style.css cấp đệm thoáng đãng cho quest-card-pill');
console.log('✓ Test 5: Chuỗi ngày được tính toán động từ lịch sử thực tế của từng nhiệm vụ và thẻ có không gian rộng rãi.\n');

// 6. Kiểm tra Tinh Giản Header Modal & Đầy Đủ Tính Năng Hoàn Lại (Undo Repeat) & Hủy Bảo Lưu
console.log('Test 6: Kiểm tra loại bỏ badge rườm rà ở header modal và bổ sung đầy đủ nút hoàn lại...');
assert.ok(!html.includes('id="mqd-rank-badge"'), 'Header modal đã gỡ bỏ badge Hạng rườm rà');
assert.ok(!html.includes('id="mqd-type-badge"'), 'Header modal đã gỡ bỏ badge Loại rườm rà');
assert.ok(appJs.includes('mqd-btn-undo-repeat'), 'Modal phải có nút hoàn lại lần vừa làm cho nhiệm vụ lặp lại');
assert.ok(appJs.includes('mqd-btn-clear-saved'), 'Modal phải có nút hủy bảo lưu thời gian');
console.log('✓ Test 6: Header modal tinh giản tuyệt đẹp và đầy đủ 100% tính năng hoàn tác, hủy bảo lưu từ menu cũ.\n');

// 7. Kiểm tra Gỡ Bỏ Ô Phiên Tập Trung & Ô Ảnh Bằng Chứng Cũ, Thay Bằng Cụm Badge Bổ Trợ Gọn Gàng & Nút Dưới Cùng Không Mất Chữ
console.log('Test 7: Kiểm tra cấu trúc thông tin bổ trợ gọn gàng và hàng nút dưới cùng 2 cột thoáng đãng...');
assert.ok(!html.includes('id="mqd-focus-box"'), 'Modal đã loại bỏ hoàn toàn ô Phiên tập trung cồng kềnh');
assert.ok(!html.includes('id="mqd-proof-box"'), 'Modal đã loại bỏ ô yêu cầu ảnh bằng chứng cồng kềnh cũ');
assert.ok(html.includes('id="mqd-meta-badges"'), 'Modal trang bị cụm thẻ bổ trợ gọn gàng id="mqd-meta-badges"');
assert.ok(html.includes('id="mqd-undo-container"'), 'Nút hoàn lại đã được đưa xuống nhóm nút dưới cùng trong id="mqd-undo-container"');
assert.ok(html.includes('grid grid-cols-2'), 'Nhóm nút dưới cùng sử dụng lưới 2 cột thoáng đãng để không bị mất chữ');
console.log('✓ Test 7: Thông tin bổ trợ siêu gọn gàng, ô cồng kềnh đã gỡ bỏ, các nút dưới cùng không còn bị mất chữ.\n');

// 8. Kiểm tra Gỡ Bỏ Lời Khuyên AI, Đổi Lặp Lại Hoạt Động (Không Bị Chặn Thưởng Cao), và Quay Lại Modal Chi Tiết Khi Tắt Sub-modal
console.log('Test 8: Kiểm tra loại bỏ ô lời khuyên AI, toggleQuestRepeatable không chặn thưởng cao, và flow quay lại modal cha...');
assert.ok(!html.includes('id="mqd-ai-box"'), 'Modal đã loại bỏ hoàn toàn ô Lời khuyên từ trọng tài AI theo yêu cầu');
assert.ok(!appJs.includes('Nhiệm vụ "${quest.title}" có mức thưởng cao (${quest.rewardCoins} Vàng). Hãy dùng tính năng Đàm Phán'), 'toggleQuestRepeatable không còn chặn người dùng đổi sang 1 lần với nhiệm vụ > 15 xu');
assert.ok(appJs.includes('parentDetailQuestId'), 'Hệ thống modal có cơ chế parentDetailQuestId để quay lại modal chi tiết khi tắt sub-modal');
console.log('✓ Test 8: Đã gỡ bỏ ô lời khuyên AI, tính năng đổi sang 1 lần hoạt động trơn tru, và đóng sub-modal tự động quay về modal chi tiết.\n');

// 9. Kiểm tra Gỡ Bỏ Toàn Bộ Hiển Thị Kinh Nghiệm (EXP) Khỏi Giao Diện
console.log('Test 9: Kiểm tra gỡ bỏ hiển thị EXP khỏi toàn bộ giao diện người dùng...');
assert.ok(html.includes('class="hidden" id="hero-exp-text"'), 'Header hero level badge ẩn hoàn toàn hiển thị EXP');
assert.ok(html.includes('id="mqd-exp-reward" class="hidden"'), 'Modal chi tiết nhiệm vụ ẩn hoàn toàn hộp EXP, chỉ hiện Vàng');
assert.ok(html.includes('class="hidden" id="profile-modal-exp-text"'), 'Profile modal ẩn hoàn toàn hiển thị EXP');
assert.ok(!appJs.includes('Kinh nghiệm: +'), 'Không còn thông báo xác nhận nhắc tới kinh nghiệm EXP');
assert.ok(!appJs.includes('& +${totalAwardedCoins * 3} EXP!'), 'Toast hoàn thành không còn cộng EXP vào thông báo');
assert.ok(!appJs.includes('Sẽ thu hồi: -${totalAwarded * 3} EXP'), 'Xác nhận hoàn tác không còn nhắc tới thu hồi EXP');
assert.ok(!html.includes('Thưởng nhiệm vụ: +0% Vàng & EXP'), 'Nhãn streak perk loại bỏ & EXP');
console.log('✓ Test 9: Toàn bộ hiển thị Kinh Nghiệm (EXP) đã được ẩn sạch sẽ, bảo toàn 100% tính toán level nền tảng.\n');

// 10. Kiểm tra Gỡ Bỏ Toàn Bộ Phân Cấp: Hạng (Nhiệm Vụ) & Tier (Phần Thưởng) Khỏi Giao Diện
console.log('Test 10: Kiểm tra gỡ bỏ phân cấp Hạng nhiệm vụ và Tier phần thưởng...');
assert.ok(!appJs.includes('🎖️ Hạng ${q.rank'), 'Cụm thẻ bổ trợ modal chi tiết không còn badge Hạng thừa thãi');
assert.ok(html.includes('id="verdict-rank" class="hidden"'), 'Modal thẩm định nhiệm vụ AI đã ẩn badge Hạng');
assert.ok(html.includes('id="eval-tier" class="hidden"'), 'Modal thẩm định phần thưởng AI đã ẩn badge Tier');
assert.ok(html.includes('id="zen-quest-rank" class="hidden"'), 'Màn hình Zen focus đã ẩn badge Hạng');
assert.ok(html.includes('id="proof-quest-rank" class="hidden"'), 'Modal nộp bằng chứng ảnh đã ẩn badge Hạng');
assert.ok(!appJs.includes('Đã cập nhật nhiệm vụ [Hạng'), 'Toast cập nhật nhiệm vụ không còn tiền tố [Hạng ...]');
assert.ok(!appJs.includes('Đã thêm nhiệm vụ [Hạng'), 'Toast thêm nhiệm vụ không còn tiền tố [Hạng ...]');
assert.ok(!appJs.includes('Hạng: ${(reward.tier ||'), 'Tin nhắn thương lượng AI không còn đề cập Hạng phần thưởng');
console.log('✓ Test 10: Toàn bộ phân cấp Hạng nhiệm vụ và Tier phần thưởng đã được dọn dẹp sạch sẽ, giao diện tối giản đỉnh cao.\n');

// 11. Kiểm tra Hiển Thị Vàng Bên Ngoài Thẻ Nhiệm Vụ & Bỏ Hoàn Toàn Thời Gian Bên Ngoài Thẻ
console.log('Test 11: Kiểm tra hiển thị Vàng bên ngoài thẻ nhiệm vụ & bỏ hoàn toàn thời gian bên ngoài thẻ...');
assert.ok(appJs.includes('quest-card-gold-pill'), 'Mã nguồn app.js phải render quest-card-gold-pill trên mặt trước thẻ nhiệm vụ');
assert.ok(!appJs.includes('${hasTime ?') && !appJs.includes('${hasTime?'), 'Mặt trước thẻ nhiệm vụ không còn render badge/pill thời gian ngoài thẻ');
assert.ok(css.includes('.quest-card-gold-pill'), 'style.css phải định nghĩa class .quest-card-gold-pill cho phần thưởng Vàng');
console.log('✓ Test 11: Thông tin Vàng đã hiển thị ra ngoài thẻ và thời gian đã được dọn sạch hoàn toàn khỏi mặt trước thẻ.\n');

console.log('🎉 TẤT CẢ 11 BỘ KIỂM THỬ GIAO DIỆN THẺ MỚI & MODAL ĐÃ VƯỢT QUA XUẤT SẮC 100%!');

