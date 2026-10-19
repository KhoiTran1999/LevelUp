import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Chrome Extension — Focus Shield & Streamlined Extension Architecture', () => {
  const rootDir = process.cwd();
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'extension/manifest.json'), 'utf-8'));
  const popupHtml = fs.readFileSync(path.join(rootDir, 'extension/popup/popup.html'), 'utf-8');
  const popupCss = fs.readFileSync(path.join(rootDir, 'extension/popup/popup.css'), 'utf-8');
  const popupJs = fs.readFileSync(path.join(rootDir, 'extension/popup/popup.js'), 'utf-8');
  const bgJs = fs.readFileSync(path.join(rootDir, 'extension/background.js'), 'utf-8');
  const contentJs = fs.readFileSync(path.join(rootDir, 'extension/content.js'), 'utf-8');
  const capsuleJs = fs.readFileSync(path.join(rootDir, 'extension/capsule.js'), 'utf-8');

  it('1. Mặc định mở extension hiển thị trực tiếp giao diện Khiên Tập Trung (Focus Shield)', () => {
    // 1. View panel Shield đang active trực tiếp
    assert.ok(popupHtml.includes('id="view-shield" class="view-panel active"'), 'popup.html phải đặt #view-shield là panel active trực tiếp');

    // 2. Các thành phần Khiên & Pomodoro HUD hiển thị đầy đủ
    assert.ok(popupHtml.includes('id="status-card"'), 'popup.html phải có thẻ #status-card');
    assert.ok(popupHtml.includes('id="status-badge"'), 'popup.html phải có #status-badge');
    assert.ok(popupHtml.includes('id="shield-toggle"'), 'popup.html phải có công tắc #shield-toggle');
    assert.ok(popupHtml.includes('id="mascot-toggle"'), 'popup.html phải có công tắc #mascot-toggle');
    assert.ok(popupHtml.includes('id="quest-hud"'), 'popup.html phải có #quest-hud');
    assert.ok(popupHtml.includes('id="popup-countdown"'), 'popup.html phải có #popup-countdown');
    assert.ok(popupHtml.includes('id="blacklist-chips"'), 'popup.html phải có danh sách chặn #blacklist-chips');
    assert.ok(popupHtml.includes('id="form-quick-add"'), 'popup.html phải có form thêm nhanh web chặn');
    assert.ok(popupHtml.includes('id="btn-restore-capsule"'), 'popup.html phải có nút phục hồi capsule #btn-restore-capsule');
  });

  it('2. Đã loại bỏ hoàn toàn các thành phần ghi chú thừa trong popup để đơn giản hóa giao diện', () => {
    // Đã loại bỏ các view ghi chú Google Keep
    assert.ok(!popupHtml.includes('id="view-notes"'), 'popup.html đã loại bỏ view ghi chú #view-notes');
    assert.ok(!popupHtml.includes('id="keep-webpage-card"'), 'popup.html đã loại bỏ thẻ trích dẫn #keep-webpage-card');
    assert.ok(!popupHtml.includes('id="keep-topic-select"'), 'popup.html đã loại bỏ dropdown chọn chủ đề #keep-topic-select');
    assert.ok(!popupHtml.includes('id="keep-note-title"'), 'popup.html đã loại bỏ ô nhập tiêu đề ghi chú #keep-note-title');
    assert.ok(!popupHtml.includes('id="keep-note-body"'), 'popup.html đã loại bỏ ô soạn thảo nội dung #keep-note-body');
    assert.ok(!popupHtml.includes('id="btn-save-keep-note"'), 'popup.html đã loại bỏ nút lưu ghi chú #btn-save-keep-note');
    assert.ok(!popupHtml.includes('id="btn-toggle-settings"'), 'popup.html đã loại bỏ nút bánh răng chuyển view #btn-toggle-settings');
  });

  it('3. popup.js tinh gọn, trực tiếp nạp trạng thái Khiên và danh sách chặn', () => {
    assert.ok(popupJs.includes('renderPopup()'), 'popup.js phải có hàm renderPopup()');
    assert.ok(popupJs.includes('renderBlacklistChips()'), 'popup.js phải có hàm renderBlacklistChips()');
    assert.ok(popupJs.includes('cleanDomainInput('), 'popup.js phải có hàm cleanDomainInput');
    assert.ok(!popupJs.includes('initKeepNoteView'), 'popup.js không còn hàm initKeepNoteView');
    assert.ok(!popupJs.includes('handleSaveKeepNote'), 'popup.js không còn hàm handleSaveKeepNote');
  });

  it('4. Quyền hạn và cấu trúc Extension tối giản, loại bỏ hoàn toàn contextMenus và note sync', () => {
    // Manifest không còn quyền contextMenus
    assert.ok(!manifest.permissions.includes('contextMenus'), 'manifest.json không còn quyền contextMenus');

    // Background không còn các tác vụ ghi chú
    assert.ok(!bgJs.includes('setupContextMenus'), 'background.js không còn setupContextMenus');
    assert.ok(!bgJs.includes('handleSaveClip'), 'background.js không còn handleSaveClip');
    assert.ok(!bgJs.includes('handleSaveExtensionNote'), 'background.js không còn handleSaveExtensionNote');
    assert.ok(!bgJs.includes('OPEN_LEVELUP_NOTES'), 'background.js không còn case OPEN_LEVELUP_NOTES');
    assert.ok(!bgJs.includes('APPEND_CLIP_TO_NOTES'), 'background.js không còn case APPEND_CLIP_TO_NOTES');

    // Content script không còn chèn hoặc sync notes
    assert.ok(!contentJs.includes('APPEND_CLIP'), 'content.js không còn lắng nghe APPEND_CLIP');
    assert.ok(!contentJs.includes('syncTopicsToExtension'), 'content.js không còn syncTopicsToExtension');

    // Capsule không còn nút ghi chú 📝
    assert.ok(!capsuleJs.includes('id="capsule-notes-btn"'), 'capsule.js không còn nút #capsule-notes-btn');
  });

  it('5. Popup CSS gọn gàng, kích thước 350px tối ưu cho Focus Shield', () => {
    assert.ok(popupCss.includes('width: 350px'), 'popup.css phải đặt chiều rộng 350px gọn gàng');
    assert.ok(!popupCss.includes('.keep-card'), 'popup.css không còn class .keep-card');
    assert.ok(!popupCss.includes('.keep-topic-select'), 'popup.css không còn class .keep-topic-select');
    assert.ok(!popupCss.includes('.keep-input-title'), 'popup.css không còn class .keep-input-title');
    assert.ok(!popupCss.includes('.keep-save-toast'), 'popup.css không còn class .keep-save-toast');
  });
});
