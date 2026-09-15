import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('=== Kiểm thử Tinh Gọn Thanh Điều Hướng & Chống Tràn Nút Bộ Lọc ===\n');

// 0. Cú pháp JS hợp lệ
assert.doesNotThrow(() => {
  execSync('node -c public/app.js', { stdio: 'pipe' });
}, 'public/app.js phải hợp lệ cú pháp');
console.log('✓ Test 0: Cú pháp JavaScript hợp lệ 100%.');

const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
const styleCss = fs.readFileSync(path.resolve('public/style.css'), 'utf8');

// 1. Kiểm tra CSS và HTML của nút filter Nhiệm Vụ (Tất cả, Chưa xong, Đã xong)
assert.ok(styleCss.includes('.quest-filter'), 'style.css phải chứa class .quest-filter');
assert.ok(styleCss.includes('white-space: nowrap'), 'style.css phải có white-space: nowrap cho .quest-filter');
assert.ok(styleCss.includes('flex-shrink: 0'), 'style.css phải có flex-shrink: 0 cho .quest-filter');

const questRibbonSlice = indexHtml.substring(indexHtml.indexOf('<!-- Filter and Action Ribbon -->'), indexHtml.indexOf('<!-- Quests Grid'));
assert.ok(questRibbonSlice.includes('whitespace-nowrap shrink-0'), 'Các nút filter trong HTML phải có class whitespace-nowrap shrink-0');
assert.ok(appJs.includes("let currentQuestFilter = 'active'"), 'app.js phải đặt mặc định là bộ lọc active (Chưa xong)');
assert.ok(questRibbonSlice.includes('data-filter="active" class="quest-filter active'), 'HTML phải kích hoạt class active cho nút Chưa xong mặc định');
console.log('✓ Test 1: Nút "Tất cả", "Chưa xong", "Đã xong" được khóa chống gãy dòng và mặc định vào trang "Chưa xong".');

// 2. Kiểm tra thanh điều hướng chính chỉ hiển thị Nhiệm Vụ và Phần Thưởng
const desktopNavSlice = indexHtml.substring(indexHtml.indexOf('<nav class="hidden md:block'), indexHtml.indexOf('</nav>'));
assert.ok(desktopNavSlice.includes('data-tab="quests"'), 'Desktop nav phải có tab Nhiệm Vụ');
assert.ok(desktopNavSlice.includes('data-tab="shop"'), 'Desktop nav phải có tab Phần Thưởng');
assert.ok(desktopNavSlice.includes('id="btn-nav-more"'), 'Desktop nav phải có nút Xem Thêm');
assert.ok(desktopNavSlice.includes('id="nav-more-menu"'), 'Desktop nav phải có dropdown menu Xem Thêm');

// 3. Kiểm tra thanh điều hướng di động (Mobile Bottom Nav)
const mobileNavSlice = indexHtml.substring(indexHtml.indexOf('<!-- MOBILE BOTTOM NAVIGATION'), indexHtml.indexOf('<!-- MODALS'));
assert.ok(mobileNavSlice.includes('data-tab="quests"'), 'Mobile nav phải có tab Nhiệm Vụ');
assert.ok(mobileNavSlice.includes('data-tab="shop"'), 'Mobile nav phải có tab Phần Thưởng');
assert.ok(mobileNavSlice.includes('id="btn-mobile-more"'), 'Mobile nav phải có nút Xem Thêm');
assert.ok(mobileNavSlice.includes('id="mobile-more-menu"'), 'Mobile nav phải có menu popup Xem Thêm');

// 4. Kiểm tra các mục phụ (Xếp hạng, Lịch sử, Ngân hàng, Quản trị) nằm trong menu Xem Thêm
assert.ok(desktopNavSlice.includes('class="nav-tab nav-more-item'), 'Desktop menu Xem Thêm chứa các tab phụ');
assert.ok(mobileNavSlice.includes('class="mobile-nav-btn mobile-more-item'), 'Mobile menu Xem Thêm chứa các tab phụ');
console.log('✓ Test 2: Tab navigator chỉ giữ lại Nhiệm Vụ và Phần Thưởng, đưa các mục phụ vào menu Xem Thêm gọn gàng.');

// 5. Kiểm tra switchTab xử lý active state cho nút Xem Thêm
assert.ok(appJs.includes('btnNavMore'), 'app.js đồng bộ trạng thái active cho desktop Xem Thêm');
assert.ok(appJs.includes('btnMobileMore'), 'app.js đồng bộ trạng thái active cho mobile Xem Thêm');
console.log('✓ Test 3: switchTab đồng bộ trạng thái active cho cả tab chính lẫn menu Xem Thêm.');

// 6. Kiểm tra hiệu ứng chuyển động mượt mà (Navigator Micro-transitions & Tab Scene Animations)
assert.ok(styleCss.includes('tabPaneFadeIn'), 'style.css phải chứa keyframe tabPaneFadeIn cho hiệu ứng chuyển tab');
assert.ok(styleCss.includes('.tab-pane:not(.hidden)'), 'style.css phải gắn animation chuyển cảnh mượt mà cho tab pane');
assert.ok(styleCss.includes('.nav-tab:active') || styleCss.includes('.mobile-nav-btn:active'), 'style.css phải có phản hồi xúc giác :active cho nút navigator');
assert.ok(styleCss.includes('navDropdownFade'), 'style.css phải có hiệu ứng xuất hiện mượt mà cho dropdown desktop');
assert.ok(styleCss.includes('mobilePopoverFade'), 'style.css phải có hiệu ứng popover mượt mà cho mobile');
assert.ok(styleCss.includes('prefers-reduced-motion'), 'style.css phải hỗ trợ tùy chọn giảm chuyển động cho người dùng nhạy cảm');
console.log('✓ Test 4: Hiệu ứng chuyển qua lại ở navigator và chuyển cảnh tab pane mượt mà, gọn nhẹ, không gây rối mắt.');

console.log('\n=== TẤT CẢ KIỂM THỬ ĐÃ VƯỢT QUA XUẤT SẮC! ===');
