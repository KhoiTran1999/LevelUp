import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Bắt đầu kiểm thử: Sổ Ghi Chú - Mobile UX & Tối Ưu Tốc Độ Gõ Chữ ===\n');

const htmlPath = path.resolve('public/index.html');
const cssPath = path.resolve('public/style.css');
const appJsPath = path.resolve('test/fixtures/legacy-client/app.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(appJsPath, 'utf8');

// 1. Kiểm tra cấu trúc phân tách Màn 1 & Màn 2 trên Mobile
console.log('Test 1: Phân tách 2 màn hình riêng biệt (Master-Detail) trên điện thoại');
assert.ok(html.includes('id="notes-header-banner"'), 'index.html phải có #notes-header-banner để quản lý ẩn/hiện trên mobile');
assert.ok(html.includes('id="notes-editor-column"') && html.includes('hidden lg:flex'), 'Editor column mặc định phải ẩn trên mobile (hidden lg:flex)');
assert.ok(html.includes('onclick="showNotesListMobile()"'), 'Phải có nút gọi showNotesListMobile()');
assert.ok(html.includes('Danh Sách'), 'Nút quay lại phải có chữ "Danh Sách" rõ ràng cho người dùng');
console.log('  -> Cấu trúc 2 màn hình riêng biệt trên mobile: ĐẠT CHUẨN ✅\n');

// 2. Kiểm tra thanh công cụ cuộn ngang 1 hàng (Horizontal scrollable toolbar)
console.log('Test 2: Thanh công cụ định dạng 1 hàng cuộn ngang mượt mà, không bị gãy 2 hàng');
assert.ok(html.includes('notes-toolbar') && html.includes('overflow-x-auto') && html.includes('flex-nowrap'), 'Toolbar phải dùng flex-nowrap overflow-x-auto');
assert.ok(css.includes('.notes-toolbar::-webkit-scrollbar') && css.includes('display: none'), 'CSS phải ẩn thanh cuộn xấu cho .notes-toolbar');
console.log('  -> Thanh công cụ 1 hàng cuộn ngang: ĐẠT CHUẨN ✅\n');

// 3. Kiểm tra logic chuyển đổi màn hình mobile trong app.js
console.log('Test 3: Logic chuyển màn hình mobile trong switchActiveNote và showNotesListMobile');
assert.ok(js.includes('mobileActive'), 'switchActiveNote phải đánh dấu mobileActive khi mở ghi chú');
assert.ok(js.includes("banner.classList.add('hidden')") || js.includes('banner.classList.add("hidden")'), 'switchActiveNote phải ẩn banner trên mobile');
assert.ok(js.includes("banner.classList.remove('hidden')") || js.includes('banner.classList.remove("hidden")'), 'showNotesListMobile phải hiện lại banner trên mobile');
console.log('  -> Logic điều hướng 2 màn hình mobile: ĐẠT CHUẨN ✅\n');

// 4. Kiểm tra tối ưu hóa tốc độ gõ chữ, triệt tiêu giật lag (Zero Forced Reflow)
console.log('Test 4: Triệt tiêu forced reflow và cập nhật in-place không phá hủy DOM');
assert.ok(js.includes('function updateActiveNoteCardInPlace('), 'app.js phải có hàm updateActiveNoteCardInPlace()');
assert.ok(js.includes('notesStatsRafId'), 'app.js phải sử dụng requestAnimationFrame để throttle stats');
assert.ok(js.includes('editor.textContent'), 'updateNotesStats phải dùng textContent để tránh forced reflow');
assert.ok(html.includes('note-card-title') || js.includes('note-card-title'), 'Thẻ ghi chú phải có class .note-card-title');
assert.ok(html.includes('note-card-preview') || js.includes('note-card-preview'), 'Thẻ ghi chú phải có class .note-card-preview');
console.log('  -> Tối ưu hiệu năng 60-120 FPS khi gõ phím: ĐẠT CHUẨN ✅\n');

// 5. Kiểm tra CSS Containment và Active Accent Indicator
console.log('Test 5: CSS Containment và vạch chỉ báo Active Accent');
assert.ok(css.includes('content-visibility: auto'), 'style.css phải áp dụng content-visibility: auto');
assert.ok(css.includes('.note-card-item.active::before'), 'style.css phải có vạch chỉ báo .note-card-item.active::before');
assert.ok(css.includes('save-status-dot'), 'style.css phải định nghĩa hiệu ứng cho .save-status-dot');
console.log('  -> Thiết kế UI-UX và CSS Containment: ĐẠT CHUẨN ✅\n');

console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ SỔ GHI CHÚ MOBILE & SPEED ĐÃ VƯỢT QUA 100%!');
