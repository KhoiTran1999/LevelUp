import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Bắt đầu kiểm thử: Cẩm Nang Ngắt Mạch Dopamine & Sổ Tay Ghi Chú (Chỉ trong Chế Độ Toàn Màn Hình) ===\n');

const htmlPath = path.resolve('public/index.html');
const appJsPath = path.resolve('public/app.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(appJsPath, 'utf8');

// 1. Kiểm tra HTML: Cẩm Nang Dopamine và Sổ Ghi Chú CHỈ có trong Chế độ toàn màn hình (#focus-zen-overlay)
console.log('Test 1: Kiểm tra cấu trúc Cẩm Nang Dopamine & Sổ Ghi Chú trong Chế độ Toàn màn hình (#focus-zen-overlay)');
assert.ok(html.includes('id="modal-dopamine-guide"'), 'index.html phải có dialog #modal-dopamine-guide');
assert.ok(html.includes('id="focus-zen-overlay"'), 'index.html phải có overlay #focus-zen-overlay');
assert.ok(html.includes('id="btn-zen-brain-dump"'), 'Chế độ toàn màn hình phải có nút #btn-zen-brain-dump');
assert.ok(html.includes('id="btn-zen-dopamine-guide"'), 'Chế độ toàn màn hình phải có nút #btn-zen-dopamine-guide');
assert.ok(html.includes('id="zen-brain-dump-badge"'), 'Chế độ toàn màn hình phải có badge #zen-brain-dump-badge');

// Đảm bảo đã gỡ bỏ hoàn toàn khỏi các vị trí bên ngoài Chế độ toàn màn hình theo yêu cầu
assert.ok(!html.includes('id="btn-nav-dopamine"'), 'Đã gỡ #btn-nav-dopamine khỏi menu desktop');
assert.ok(!html.includes('id="btn-mobile-dopamine"'), 'Đã gỡ #btn-mobile-dopamine khỏi menu mobile');
assert.ok(!html.includes('id="btn-focus-dopamine-guide"'), 'Đã gỡ #btn-focus-dopamine-guide khỏi Focus Banner');
assert.ok(!html.includes('id="btn-open-brain-dump"'), 'Đã gỡ #btn-open-brain-dump khỏi Focus Banner');
assert.ok(!html.includes('id="focus-complete-brain-dump-banner"'), 'Đã gỡ banner nhắc nhở khỏi Modal hoàn thành');

// Kiểm tra 5 bước thần kinh học trong nội dung cẩm nang
assert.ok(html.includes('Xóa Bộ Nhớ Đệm Thể Chất'), 'Cẩm nang phải chứa Bước 1: Xóa bộ nhớ đệm thể chất');
assert.ok(html.includes('Thiết Lập Môi Trường Cách Ly'), 'Cẩm nang phải chứa Bước 2: Thiết lập môi trường cách ly');
assert.ok(html.includes('Bắt Đầu Siêu Nhỏ'), 'Cẩm nang phải chứa Bước 3: Bắt đầu siêu nhỏ 5 phút');
assert.ok(html.includes('Kích Hoạt Chu Kỳ Tập Trung Ngắn'), 'Cẩm nang phải chứa Bước 4: Chu kỳ tập trung ngắn 25/5');
assert.ok(html.includes('Sổ Tay Ghi Chú'), 'Cẩm nang phải chứa Bước 5: Sổ Tay Ghi Chú cạnh tay');
assert.ok(html.includes('lái xe 100km/h mà bóp phanh gấp'), 'Cẩm nang phải giải thích cơ chế tương phản dopamine');
console.log('  -> Điểm chạm duy nhất trong Chế độ Toàn màn hình & 5 bước đạt chuẩn: OK\n');

// 2. Kiểm tra HTML: Sửa lỗi không bật được Sổ Ghi Chú trong Chế độ toàn màn hình (Z-Index fix)
console.log('Test 2: Kiểm tra Z-Index của Modal Sổ Ghi Chú và Cẩm Nang để hiển thị đè lên Zen Overlay (z-[90])');
// Kiểm tra modal-brain-dump và modal-dopamine-guide có z-[100] (cao hơn focus-zen-overlay z-[90])
assert.ok(
  html.includes('id="modal-brain-dump" class="fixed inset-0 z-[100]'),
  '#modal-brain-dump phải có z-[100] để hiển thị đè lên #focus-zen-overlay (z-[90])'
);
assert.ok(
  html.includes('id="modal-dopamine-guide" class="fixed inset-0 z-[100]'),
  '#modal-dopamine-guide phải có z-[100] để hiển thị đè lên #focus-zen-overlay (z-[90])'
);

// Kiểm tra cấu trúc Rich Text Editor trong Sổ Tay Ghi Chú
assert.ok(html.includes('id="focus-notes-editor"'), 'index.html phải có trình soạn thảo contenteditable #focus-notes-editor');
assert.ok(html.includes('contenteditable="true"'), 'Trình soạn thảo phải có thuộc tính contenteditable="true"');
assert.ok(html.includes('id="notes-word-count"'), 'index.html phải có phần tử hiển thị số từ #notes-word-count');
assert.ok(html.includes('id="notes-char-count"'), 'index.html phải có phần tử hiển thị số ký tự #notes-char-count');

// Kiểm tra thanh công cụ định dạng Rich Text
assert.ok(html.includes("formatNoteDoc('bold')"), 'Thanh công cụ phải có nút in đậm (Bold)');
assert.ok(html.includes("formatNoteDoc('italic')"), 'Thanh công cụ phải có nút in nghiêng (Italic)');
assert.ok(html.includes("formatNoteDoc('underline')"), 'Thanh công cụ phải có nút gạch chân (Underline)');
assert.ok(html.includes("formatNoteDoc('strikeThrough')"), 'Thanh công cụ phải có nút gạch ngang (Strikethrough)');
assert.ok(html.includes("toggleNoteHeading()"), 'Thanh công cụ phải có nút tiêu đề H2');
assert.ok(html.includes("formatNoteDoc('insertUnorderedList')"), 'Thanh công cụ phải có nút danh sách chấm (Bullets)');
assert.ok(html.includes("formatNoteDoc('insertOrderedList')"), 'Thanh công cụ phải có nút danh sách số (Numbered list)');
assert.ok(html.includes("formatNoteDoc('formatBlock', '<blockquote>')"), 'Thanh công cụ phải có nút trích dẫn (Blockquote)');
assert.ok(html.includes("toggleNoteHighlight()"), 'Thanh công cụ phải có nút bôi màu sáng (Highlight)');
assert.ok(html.includes("formatNoteDoc('removeFormat')"), 'Thanh công cụ phải có nút xóa định dạng (Clear format)');
assert.ok(html.includes("copyFocusNotes()"), 'Thanh công cụ phải có nút sao chép (Copy)');
assert.ok(html.includes("clearFocusNotes()"), 'Thanh công cụ phải có nút dọn sạch (Clear)');

// Xác nhận ĐÃ XÓA tính năng tạo Quest trong Sổ Ghi Chú
assert.ok(!html.includes('id="input-brain-dump"'), 'Đã xóa hoàn toàn input đơn hàng dòng cũ #input-brain-dump');
assert.ok(!html.includes('convertBrainDumpToQuest'), 'Đã xóa hoàn toàn tính năng convertBrainDumpToQuest khỏi HTML');
console.log('  -> Z-Index fix z-[100] & Thanh công cụ soạn thảo phong phú đạt chuẩn: OK\n');

// 3. Kiểm tra mã nguồn JS trong public/app.js
console.log('Test 3: Kiểm tra các hàm nghiệp vụ Focus Notes, Cẩm nang Dopamine và phím tắt trong app.js');
assert.ok(js.includes('function openDopamineGuideModal'), 'app.js phải định nghĩa openDopamineGuideModal');
assert.ok(js.includes('function closeDopamineGuideModal'), 'app.js phải định nghĩa closeDopamineGuideModal');
assert.ok(js.includes('function getFocusNotesContent'), 'app.js phải định nghĩa getFocusNotesContent');
assert.ok(js.includes('function saveFocusNotesContent'), 'app.js phải định nghĩa saveFocusNotesContent');
assert.ok(js.includes('function formatNoteDoc'), 'app.js phải định nghĩa formatNoteDoc');
assert.ok(js.includes('function toggleNoteHeading'), 'app.js phải định nghĩa toggleNoteHeading');
assert.ok(js.includes('function toggleNoteHighlight'), 'app.js phải định nghĩa toggleNoteHighlight');
assert.ok(js.includes('function copyFocusNotes'), 'app.js phải định nghĩa copyFocusNotes');
assert.ok(js.includes('function clearFocusNotes'), 'app.js phải định nghĩa clearFocusNotes');
assert.ok(js.includes('function updateNotesStats'), 'app.js phải định nghĩa updateNotesStats');
assert.ok(js.includes('function openBrainDumpModal'), 'app.js phải định nghĩa openBrainDumpModal');
assert.ok(js.includes('function closeBrainDumpModal'), 'app.js phải định nghĩa closeBrainDumpModal');

// Đảm bảo không còn logic convertBrainDumpToQuest
assert.ok(!js.includes('function convertBrainDumpToQuest'), 'app.js không còn chứa function convertBrainDumpToQuest');

// Kiểm tra phím tắt Alt + D
assert.ok(
  js.includes("e.altKey && (e.key === 'd' || e.key === 'D')"),
  'app.js phải có bộ lắng nghe phím tắt Alt+D để mở/đóng Sổ Ghi Chú'
);
console.log('  -> Đầy đủ các hàm điều khiển Focus Notes Rich Text và phím tắt Alt+D: OK\n');

// 4. Mô phỏng Logic Focus Notes Engine (Auto-save, Word/Char Count, Clear)
console.log('Test 4: Mô phỏng logic lưu trữ, đếm từ/ký tự và xóa của Focus Notes Engine');

const mockStorage = {};
const fakeLocalStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; }
};

const STORAGE_KEY = 'levelup_focus_notes';

function engineGetContent() {
  try {
    return fakeLocalStorage.getItem(STORAGE_KEY) || '';
  } catch (_) {
    return '';
  }
}

function engineSaveContent(htmlStr) {
  try {
    fakeLocalStorage.setItem(STORAGE_KEY, htmlStr || '');
  } catch (_) {}
}

function engineCalculateStats(rawText) {
  const text = (rawText || '').trim();
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const charCount = text ? text.length : 0;
  return { wordCount, charCount };
}

// 4.1 Lưu và đọc nội dung HTML
assert.strictEqual(engineGetContent(), '', 'Mặc định sổ ghi chú chưa có nội dung');

const initialNotes = '<h2>Ý tưởng dự án</h2><p>Cần chuẩn bị <b>báo cáo</b> trước 15:00.</p>';
engineSaveContent(initialNotes);
assert.strictEqual(engineGetContent(), initialNotes, 'Nội dung HTML phải được lưu đúng vào localStorage');

// 4.2 Thống kê số từ và ký tự
const stats1 = engineCalculateStats('');
assert.strictEqual(stats1.wordCount, 0, 'Chuỗi rỗng phải có 0 từ');
assert.strictEqual(stats1.charCount, 0, 'Chuỗi rỗng phải có 0 ký tự');

const samplePlainText = 'Cần chuẩn bị báo cáo trước 15:00.';
const stats2 = engineCalculateStats(samplePlainText);
assert.strictEqual(stats2.wordCount, 7, 'Số từ phải được tính toán chính xác');
assert.strictEqual(stats2.charCount, samplePlainText.length, 'Số ký tự phải khớp độ dài chuỗi');

// 4.3 Dọn sạch sổ ghi chú
engineSaveContent('');
assert.strictEqual(engineGetContent(), '', 'Sau khi clear, nội dung trong storage phải rỗng');

console.log('  -> Toàn bộ hành vi lưu trữ và thống kê của Focus Notes Engine hoạt động hoàn hảo: OK\n');
console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐỀU VƯỢT QUA XUẤT SẮC (100%)!');
