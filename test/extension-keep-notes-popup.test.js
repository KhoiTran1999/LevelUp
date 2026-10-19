import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Chrome Extension — Google Keep Style Note Taker & Settings Toggle', () => {
  const rootDir = process.cwd();
  const popupHtml = fs.readFileSync(path.join(rootDir, 'extension/popup/popup.html'), 'utf-8');
  const popupCss = fs.readFileSync(path.join(rootDir, 'extension/popup/popup.css'), 'utf-8');
  const popupJs = fs.readFileSync(path.join(rootDir, 'extension/popup/popup.js'), 'utf-8');
  const bgJs = fs.readFileSync(path.join(rootDir, 'extension/background.js'), 'utf-8');
  const contentJs = fs.readFileSync(path.join(rootDir, 'extension/content.js'), 'utf-8');
  const appJs = fs.readFileSync(path.join(rootDir, 'public/app.js'), 'utf-8');

  it('1. Mặc định mở extension hiển thị ngay giao diện Sổ Ghi Chú phong cách Google Keep (Đã bỏ tag, chỉ giữ Title & Nội dung)', () => {
    // 1. View panel Note đang active mặc định
    assert.ok(popupHtml.includes('id="view-notes" class="view-panel active"'), 'popup.html phải đặt #view-notes là panel active mặc định');
    assert.ok(popupHtml.includes('id="view-shield-settings" class="view-panel hidden"'), 'popup.html phải ẩn #view-shield-settings mặc định');

    // 2. Webpage Citation Card (thẻ trích dẫn trang web đang duyệt)
    assert.ok(popupHtml.includes('id="keep-webpage-card"'), 'popup.html phải có thẻ trích dẫn web #keep-webpage-card');
    assert.ok(popupHtml.includes('id="keep-web-title"'), 'popup.html phải có tiêu đề trang web #keep-web-title');
    assert.ok(popupHtml.includes('id="keep-web-domain"'), 'popup.html phải có tên miền trang web #keep-web-domain');
    assert.ok(popupHtml.includes('id="keep-web-link"'), 'popup.html phải có link trỏ về trang web #keep-web-link');

    // 3. Keep Note Card (Chỉ giữ lại Title và Thân ghi chú, đã loại bỏ hoàn toàn hệ thống tag rườm rà)
    assert.ok(popupHtml.includes('id="keep-note-title"'), 'popup.html phải có ô nhập tiêu đề #keep-note-title');
    assert.ok(popupHtml.includes('id="keep-note-body"'), 'popup.html phải có ô soạn thảo nội dung #keep-note-body');
    assert.ok(!popupHtml.includes('id="keep-active-tag"'), 'popup.html đã loại bỏ chip tag #keep-active-tag');
    assert.ok(!popupHtml.includes('keep-preset-chips'), 'popup.html đã loại bỏ hệ thống chip tag preset');
    assert.ok(!popupHtml.includes('custom-topic-box'), 'popup.html đã loại bỏ custom topic box');

    // 4. Action buttons
    assert.ok(popupHtml.includes('id="btn-open-notes"'), 'popup.html phải có nút #btn-open-notes');
    assert.ok(popupHtml.includes('id="btn-cancel-keep-note"'), 'popup.html phải có nút #btn-cancel-keep-note để Hủy');
    assert.ok(popupHtml.includes('id="btn-save-keep-note"'), 'popup.html phải có nút #btn-save-keep-note để Lưu Ghi Chú');
  });

  it('2. Nút Settings (⚙️) cho phép chuyển đổi mượt mà giữa Sổ Ghi Chú và Cài Đặt Khiên Pomodoro', () => {
    // Nút bánh răng ⚙️ trên header
    assert.ok(popupHtml.includes('id="btn-toggle-settings"'), 'Header phải có nút #btn-toggle-settings');
    assert.ok(popupHtml.includes('id="btn-back-to-notes"'), 'Giao diện cài đặt phải có nút #btn-back-to-notes');

    // Logic chuyển đổi view trong popup.js
    assert.ok(popupJs.includes('function switchView('), 'popup.js phải có hàm switchView');
    assert.ok(popupJs.includes("currentActiveView = 'notes'"), 'popup.js mặc định activeView là notes');
    assert.ok(popupJs.includes("switchView('settings')"), 'popup.js chuyển sang settings khi bấm bánh răng');
    assert.ok(popupJs.includes("switchView('notes')"), 'popup.js quay về notes khi bấm quay lại hoặc bấm bánh răng lần nữa');

    // Các thành phần Khiên & Pomodoro vẫn được bảo toàn đầy đủ
    assert.ok(popupHtml.includes('id="status-card"'), 'popup.html phải bảo toàn thẻ #status-card');
    assert.ok(popupHtml.includes('id="shield-toggle"'), 'popup.html phải bảo toàn công tắc #shield-toggle');
    assert.ok(popupHtml.includes('id="mascot-toggle"'), 'popup.html phải bảo toàn công tắc #mascot-toggle');
    assert.ok(popupHtml.includes('id="blacklist-chips"'), 'popup.html phải bảo toàn danh sách chặn #blacklist-chips');
    assert.ok(popupHtml.includes('id="form-quick-add"'), 'popup.html phải bảo toàn form thêm nhanh web chặn');
  });

  it('3. Tự động thu thập thông tin trang web đang xem và đoạn văn bản được bôi đen (Selection Auto-Capture)', () => {
    // popup.js tự động truy vấn tab hiện tại
    assert.ok(popupJs.includes('chrome.tabs.query({ active: true, currentWindow: true })'), 'popup.js phải query tab hiện tại');
    assert.ok(popupJs.includes('window.getSelection().toString()'), 'popup.js phải tự động bắt đoạn text đang bôi đen trên trang');
    assert.ok(popupJs.includes('extractDomain('), 'popup.js phải trích xuất hostname/domain sạch');
    assert.ok(popupJs.includes('autoResizeTextarea('), 'popup.js phải tự động co giãn textarea');
  });

  it('4. Lưu Ghi Chú gửi thông điệp CREATE_EXTENSION_NOTE tới Background và chuyển tiếp tới Web App LevelUp', () => {
    // popup.js gửi thông điệp
    assert.ok(popupJs.includes("type: 'CREATE_EXTENSION_NOTE'"), 'popup.js phải gửi CREATE_EXTENSION_NOTE');
    assert.ok(popupJs.includes('handleSaveKeepNote'), 'popup.js phải có hàm handleSaveKeepNote');

    // background.js tiếp nhận và xử lý
    assert.ok(bgJs.includes("case 'CREATE_EXTENSION_NOTE':"), 'background.js phải tiếp nhận CREATE_EXTENSION_NOTE');
    assert.ok(bgJs.includes('handleSaveExtensionNote'), 'background.js phải có hàm handleSaveExtensionNote');
    assert.ok(bgJs.includes('pendingNotes'), 'background.js phải lưu pendingNotes nếu web app chưa mở');

    // content.js làm cầu nối nhận và chuyển tiếp
    assert.ok(contentJs.includes("message.type === 'CREATE_NOTE'"), 'content.js phải nhận message CREATE_NOTE');
    assert.ok(contentJs.includes("type: 'LEVELUP_CREATE_NOTE'"), 'content.js phải dispatch LEVELUP_CREATE_NOTE');
    assert.ok(contentJs.includes('pendingNotes'), 'content.js phải tự động xả hàng đợi pendingNotes khi vào app');

    // app.js (Web App) xử lý và lưu vào Sổ Ghi Chú
    assert.ok(appJs.includes('LEVELUP_CREATE_NOTE'), 'app.js phải lắng nghe sự kiện LEVELUP_CREATE_NOTE');
    assert.ok(appJs.includes('createNoteFromExtension'), 'app.js phải có hàm createNoteFromExtension');
  });

  it('5. Trải nghiệm người dùng đạt chuẩn Google Keep (CSS gọn gàng, không còn tag, checkmark animation)', () => {
    assert.ok(popupCss.includes('width: 380px'), 'popup.css phải đặt chiều rộng 380px thoáng đẹp');
    assert.ok(popupCss.includes('.keep-card'), 'popup.css phải có class .keep-card');
    assert.ok(popupCss.includes('.keep-input-title'), 'popup.css phải có class .keep-input-title');
    assert.ok(popupCss.includes('.keep-input-body'), 'popup.css phải có class .keep-input-body');
    assert.ok(!popupCss.includes('.keep-tag-section'), 'popup.css đã dọn dẹp các class tag thừa');
    assert.ok(popupCss.includes('.btn-keep-primary.saved'), 'popup.css phải có animation checkmark xanh khi lưu thành công');
    assert.ok(popupCss.includes('.keep-save-toast'), 'popup.css phải có toast thông báo lưu');
  });
});
