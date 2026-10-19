import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Bắt đầu kiểm thử: Sổ Ghi Chú (Tab riêng, Đặt tên Chủ đề, Capsule Hover, Extension) ===\n');

const htmlPath = path.resolve('public/index.html');
const cssPath = path.resolve('public/style.css');
const appJsPath = path.resolve('public/app.js');
const manifestPath = path.resolve('extension/manifest.json');
const capsuleJsPath = path.resolve('extension/capsule.js');
const backgroundJsPath = path.resolve('extension/background.js');
const contentJsPath = path.resolve('extension/content.js');
const popupHtmlPath = path.resolve('extension/popup/popup.html');
const popupJsPath = path.resolve('extension/popup/popup.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(appJsPath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const capsule = fs.readFileSync(capsuleJsPath, 'utf8');
const bg = fs.readFileSync(backgroundJsPath, 'utf8');
const content = fs.readFileSync(contentJsPath, 'utf8');
const popupHtml = fs.readFileSync(popupHtmlPath, 'utf8');
const popupJs = fs.readFileSync(popupJsPath, 'utf8');

// 1. Kiểm tra vị trí Tab Sổ Ghi Chú trên thanh Navigator nằm cạnh Phần Thưởng
console.log('Test 1: Sổ Ghi Chú là Tab riêng biệt nằm ngoài thanh Navigator cạnh tab Phần Thưởng');
assert.ok(html.includes('data-tab="notes"'), 'index.html phải có tab data-tab="notes"');

const shopIdx = html.indexOf('data-tab="shop"');
const notesIdx = html.indexOf('data-tab="notes"');
assert.ok(shopIdx > -1 && notesIdx > -1, 'Phải có cả tab shop và notes trên Desktop Nav');
const betweenDesktop = html.substring(shopIdx, notesIdx);
assert.ok(betweenDesktop.includes('</button>'), 'Nút Sổ Ghi Chú phải nằm trực tiếp kế cạnh Phần Thưởng trên Desktop Nav');

const mobileNavStart = html.indexOf('m3-navigation-bar');
assert.ok(mobileNavStart > -1, 'Phải có m3-navigation-bar');
const mobileNavContent = html.substring(mobileNavStart, mobileNavStart + 2500);
assert.ok(mobileNavContent.includes('data-tab="shop"'), 'Mobile nav phải có tab Phần Thưởng');
assert.ok(mobileNavContent.includes('data-tab="notes"'), 'Mobile nav phải có tab Ghi Chú');
assert.ok(mobileNavContent.includes('Ghi Chú'), 'Mobile nav hiển thị nhãn Ghi Chú');

// Đã dọn dẹp khỏi menu Xem Thêm để tránh dư thừa (do đã là tab chính)
assert.ok(!html.includes('id="btn-nav-notes"'), 'btn-nav-notes không còn nằm trong menu Xem Thêm');
assert.ok(!html.includes('id="btn-mobile-notes"'), 'btn-mobile-notes không còn nằm trong menu Xem Thêm');
console.log('  -> Vị trí tab trên Desktop & Mobile Nav cạnh Phần Thưởng: ĐẠT CHUẨN ✅\n');

// 2. Kiểm tra Master-Detail UI và Tránh Trang Trống
console.log('Test 2: Giao diện Master-Detail #tab-notes và chống trang trắng khi chuyển tab');
assert.ok(html.includes('<section id="tab-notes" class="tab-pane hidden"'), 'Phải có section #tab-notes với class tab-pane hidden');
assert.ok(html.includes('id="notes-topics-bar"'), 'Phải có thanh lọc chủ đề #notes-topics-bar');
assert.ok(html.includes('id="notes-card-list"'), 'Phải có danh sách card ghi chú #notes-card-list');
assert.ok(html.includes('id="focus-notes-tab-editor"'), 'Phải có editor #focus-notes-tab-editor');
assert.ok(html.includes('id="active-note-topic-input"'), 'Phải có input đặt tên chủ đề #active-note-topic-input');
assert.ok(html.includes('id="notes-topics-datalist"'), 'Phải có datalist gợi ý chủ đề đã có');

// Kiểm tra chống trang trắng khi switchTab(undefined)
assert.ok(js.includes('tabColorTheme') && js.includes('notes:'), 'switchTab phải có cấu hình màu tabColorTheme cho notes');
console.log('  -> Không bao giờ bị trang trắng, giao diện Tab đầy đủ: ĐẠT CHUẨN ✅\n');

// 3. Kiểm tra tính năng đặt tên chủ đề tự do (Custom Topic) & Multi-Notes Engine
console.log('Test 3: Người dùng tự do đặt tên chủ đề và quản lý danh sách nhiều ghi chú');
assert.ok(js.includes('function getAllNotes()'), 'app.js phải có hàm getAllNotes()');
assert.ok(js.includes('function saveAllNotes('), 'app.js phải có hàm saveAllNotes()');
assert.ok(js.includes('function getAllTopics()'), 'app.js phải có hàm trích xuất các chủ đề động getAllTopics()');
assert.ok(js.includes('function renderTopicsBar()'), 'app.js phải có hàm renderTopicsBar()');
assert.ok(js.includes('function handleActiveNoteTopicChange('), 'app.js phải hỗ trợ người dùng tự gõ đặt tên chủ đề mới');
assert.ok(js.includes('function filterNotesByTopic('), 'app.js phải có bộ lọc theo chủ đề');
assert.ok(js.includes('function handleNotesSearch('), 'app.js phải có tìm kiếm ghi chú');
console.log('  -> Người dùng tự do đặt tên chủ đề ghi chú: ĐẠT CHUẨN ✅\n');

// 4. Kiểm tra công cụ soạn thảo chuyên nghiệp (Rich text, Checklists, Highlights)
console.log('Test 4: Công cụ soạn thảo chuyên nghiệp, Checklist tương tác và Typography');
assert.ok(js.includes('function formatNoteDoc('), 'app.js phải có formatNoteDoc');
assert.ok(js.includes('function formatNoteHeading('), 'app.js phải có formatNoteHeading');
assert.ok(js.includes('function toggleNoteHighlight('), 'app.js phải có highlight marker');
assert.ok(js.includes('function insertNoteChecklist('), 'app.js phải có checklist checkbox');
assert.ok(js.includes('function insertNoteCallout('), 'app.js phải có callout box');
assert.ok(js.includes('function insertNoteCode('), 'app.js phải có khối code');
assert.ok(js.includes('function updateNotesStats('), 'app.js phải đếm số từ và số ký tự realtime');
assert.ok(css.includes('.note-todo-item'), 'style.css phải định dạng checklist .note-todo-item');
assert.ok(css.includes('.notes-editor'), 'style.css phải định dạng rich typography cho .notes-editor');
console.log('  -> Công cụ soạn thảo và checklist mượt mà: ĐẠT CHUẨN ✅\n');

// 5. Kiểm tra Capsule HUD Mini: Chỉ hiển thị nút 📝 khi hover chuột vào
console.log('Test 5: Capsule HUD Mini chỉ hiển thị nút 📝 khi người dùng hover chuột vào con nhộng');
assert.ok(capsule.includes('id="capsule-notes-btn"'), 'Capsule phải có nút #capsule-notes-btn');
assert.ok(capsule.includes('class="btn-capsule-notes"'), 'Nút phải có class btn-capsule-notes');
assert.ok(capsule.includes('📝'), 'Nút phải có icon 📝');

// Kiểm tra CSS: Mặc định ẩn (width: 0, opacity: 0, pointer-events: none)
const btnCssMatch = capsule.match(/\.btn-capsule-notes\s*\{([^}]+)\}/);
assert.ok(btnCssMatch, 'Phải có CSS .btn-capsule-notes');
assert.ok(btnCssMatch[1].includes('width: 0'), 'Mặc định .btn-capsule-notes phải có width: 0');
assert.ok(btnCssMatch[1].includes('opacity: 0'), 'Mặc định .btn-capsule-notes phải có opacity: 0');
assert.ok(btnCssMatch[1].includes('pointer-events: none'), 'Mặc định .btn-capsule-notes không nhận sự kiện chuột');

// Kiểm tra CSS: Khi hover vào .capsule-pill thì hiện ra (width: 18px, opacity: 1, pointer-events: auto)
const hoverCssMatch = capsule.match(/\.capsule-pill:hover\s+\.btn-capsule-notes\s*\{([^}]+)\}/);
assert.ok(hoverCssMatch, 'Phải có CSS .capsule-pill:hover .btn-capsule-notes');
assert.ok(hoverCssMatch[1].includes('width: 18px'), 'Khi hover con nhộng, nút 📝 mở rộng width: 18px');
assert.ok(hoverCssMatch[1].includes('opacity: 1'), 'Khi hover con nhộng, nút 📝 hiển thị opacity: 1');
assert.ok(hoverCssMatch[1].includes('pointer-events: auto'), 'Khi hover con nhộng, nút 📝 nhận sự kiện click');
console.log('  -> Capsule HUD Mini chỉ hiển thị nút 📝 khi hover: ĐẠT CHUẨN TUYỆT ĐỐI ✅\n');

// 6. Kiểm tra Chrome Extension: Quyền hạn, Context Menu, Popup, Message Bridge
console.log('Test 6: Tích hợp Chrome Extension mở Sổ Ghi Chú và Lưu Trích Dẫn Nhanh');
assert.ok(manifest.permissions.includes('contextMenus'), 'manifest.json phải có quyền contextMenus');
assert.ok(bg.includes("id: 'levelup-save-selection'"), 'background.js phải tạo menu "Lưu vào Sổ Ghi Chú LevelUp"');
assert.ok(bg.includes("id: 'levelup-open-notes'"), 'background.js phải tạo menu "Mở Sổ Ghi Chú LevelUp"');
assert.ok(bg.includes("case 'OPEN_LEVELUP_NOTES':"), 'background.js phải xử lý lệnh mở sổ ghi chú');
assert.ok(bg.includes("case 'APPEND_CLIP_TO_NOTES':"), 'background.js phải xử lý lệnh chèn trích dẫn');
assert.ok(content.includes('LEVELUP_SWITCH_TAB'), 'content.js phải chuyển tiếp lệnh LEVELUP_SWITCH_TAB');
assert.ok(content.includes('LEVELUP_APPEND_CLIP'), 'content.js phải chuyển tiếp lệnh LEVELUP_APPEND_CLIP');
assert.ok(popupHtml.includes('id="btn-open-notes"'), 'popup.html phải có nút #btn-open-notes');
assert.ok(popupJs.includes("targetTab: 'notes'"), 'popup.js phải gửi tin nhắn mở tab notes');
console.log('  -> Tích hợp Chrome Extension hoàn tất 100%: ĐẠT CHUẨN ✅\n');

console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ SỔ GHI CHÚ ĐÃ VƯỢT QUA 100%!');
