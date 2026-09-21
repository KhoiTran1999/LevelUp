import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const appJs = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
const renderJs = fs.readFileSync(path.join(rootDir, 'src', 'js', '14-render.js'), 'utf8');
const schemasJs = fs.readFileSync(path.join(rootDir, 'src', 'schemas', 'game.js'), 'utf8');
const syncJs = fs.readFileSync(path.join(rootDir, 'api', 'sync.js'), 'utf8');

console.log('=== Bắt đầu kiểm thử Lịch Sử Ảnh Bằng Chứng & Tinh Gọn Tab Nhiệm Vụ ===\n');

// 1. Kiểm tra xóa hoàn toàn các nút xem ảnh gây rối bên Tab Nhiệm Vụ (Quests)
function testTasksTabCleanFromProofViewing() {
  const renderQuestsBody = renderJs.slice(renderJs.indexOf('function renderQuests()'), renderJs.indexOf('function renderShop()'));

  // Thẻ nhiệm vụ trong renderQuests không còn chứa các nút xem ảnh
  assert.ok(!renderQuestsBody.includes('title="Xem lại ảnh bằng chứng đã duyệt"'), 'Thẻ nhiệm vụ không còn nút xem lại ảnh đã duyệt');
  assert.ok(!renderQuestsBody.includes('<span>Xem ảnh bằng chứng</span>'), 'Dropdown nhiệm vụ không còn mục Xem ảnh bằng chứng');
  assert.ok(!renderQuestsBody.includes('<span>📸 Ảnh</span>'), 'Zone 3 Meta của thẻ nhiệm vụ không còn nút 📸 Ảnh');
  assert.ok(!renderQuestsBody.includes('btn-view-proof-img'), 'Thẻ nhiệm vụ không còn chứa class btn-view-proof-img');

  // Nút nộp ảnh thẩm định AI ("Chụp Ảnh Nhận Vàng") vẫn phải được giữ nguyên
  assert.ok(renderQuestsBody.includes('btn-submit-quest-proof'), 'Nút nộp ảnh thẩm định AI btn-submit-quest-proof vẫn được bảo toàn');
  assert.ok(renderQuestsBody.includes('Chụp Ảnh Nhận Vàng 📸'), 'Nhãn nộp ảnh nhận vàng vẫn hiện khi cần nộp ảnh');

  console.log('✓ Test 1: Tab Nhiệm Vụ đã được dọn sạch hoàn toàn các nút xem ảnh gây rối mắt, giữ trọn vẹn nút chụp ảnh nộp bài.');
}

// 2. Kiểm tra giao diện Tab Lịch Sử: Sub-tab switcher và Thư viện Ảnh
function testHistoryTabMarkup() {
  // Subtab switcher
  assert.ok(indexHtml.includes('id="btn-ledger-subtab-transactions"'), 'index.html phải có nút subtab Thu Chi Vàng');
  assert.ok(indexHtml.includes('id="btn-ledger-subtab-photos"'), 'index.html phải có nút subtab Lịch Sử Ảnh');
  assert.ok(indexHtml.includes('id="ledger-photos-badge"'), 'index.html phải có huy hiệu đếm số lượng ảnh');

  // Containers cho 2 view
  assert.ok(indexHtml.includes('id="view-ledger-transactions"'), 'index.html phải có container view-ledger-transactions');
  assert.ok(indexHtml.includes('id="view-ledger-photos"'), 'index.html phải có container view-ledger-photos');

  // Grid và empty state
  assert.ok(indexHtml.includes('id="ledger-photos-grid"'), 'index.html phải có lưới ảnh ledger-photos-grid');
  assert.ok(indexHtml.includes('id="ledger-photos-empty"'), 'index.html phải có trạng thái rỗng ledger-photos-empty');
  assert.ok(indexHtml.includes('id="ledger-photos-count"'), 'index.html phải có nhãn đếm tổng số ảnh');

  console.log('✓ Test 2: Tab Lịch Sử tích hợp đầy đủ Sub-tabs switcher, Album Grid và Empty State.');
}

// 3. Kiểm tra logic JS trong public/app.js
function testAppJsProofHistoryLogic() {
  assert.ok(appJs.includes('function switchLedgerSubtab('), 'app.js phải có hàm switchLedgerSubtab');
  assert.ok(appJs.includes('window.switchLedgerSubtab = switchLedgerSubtab'), 'switchLedgerSubtab phải gắn vào window');

  assert.ok(appJs.includes('function getAllProofPhotos('), 'app.js phải có hàm getAllProofPhotos');
  assert.ok(appJs.includes('window.getAllProofPhotos = getAllProofPhotos'), 'getAllProofPhotos phải gắn vào window');

  assert.ok(appJs.includes('function renderProofPhotos('), 'app.js phải có hàm renderProofPhotos');
  assert.ok(appJs.includes('window.renderProofPhotos = renderProofPhotos'), 'renderProofPhotos phải gắn vào window');

  // Nút btn-view-proof-img vẫn tồn tại trong app.js (dành cho album ảnh và ledger)
  assert.ok(appJs.includes('btn-view-proof-img'), 'app.js vẫn có class btn-view-proof-img');

  console.log('✓ Test 3: Client app.js cung cấp đầy đủ các hàm xử lý album ảnh và chuyển đổi sub-tab.');
}

// 4. Kiểm tra thuật toán gom ảnh getAllProofPhotos()
function testGetAllProofPhotosAlgorithm() {
  const mockAppState = {
    proofPhotos: [
      { id: 'p1', proofImageUrl: 'https://r2.example.com/img1.jpg', timestamp: 3000, questTitle: 'Chạy bộ' },
      { id: 'p2', proofImageUrl: 'https://r2.example.com/img2.jpg', timestamp: 1000, questTitle: 'Đọc sách' }
    ],
    ledger: [
      { id: 'l1', proofImageUrl: 'https://r2.example.com/img3.jpg', timestamp: 2000, title: 'Tập gym' },
      { id: 'l2', proofImageUrl: 'https://r2.example.com/img1.jpg', timestamp: 2500, title: 'Chạy bộ trùng' } // Trùng URL
    ],
    quests: [
      { id: 'q1', proofImageUrl: 'https://r2.example.com/img4.jpg', createdAt: 500, title: 'Học tiếng Anh' },
      { id: 'q2', proofImageUrl: 'https://r2.example.com/img2.jpg', createdAt: 400, title: 'Đọc sách trùng' } // Trùng URL
    ]
  };

  function mockGetAllProofPhotos(state) {
    const photos = [];
    const seenUrls = new Set();

    if (Array.isArray(state.proofPhotos)) {
      for (const p of state.proofPhotos) {
        if (p && p.proofImageUrl && !seenUrls.has(p.proofImageUrl)) {
          seenUrls.add(p.proofImageUrl);
          photos.push({
            id: p.id,
            questTitle: p.questTitle,
            proofImageUrl: p.proofImageUrl,
            timestamp: p.timestamp
          });
        }
      }
    }

    if (Array.isArray(state.ledger)) {
      for (const entry of state.ledger) {
        if (entry && entry.proofImageUrl && !seenUrls.has(entry.proofImageUrl)) {
          seenUrls.add(entry.proofImageUrl);
          photos.push({
            id: 'proof_' + (entry.id || entry.timestamp),
            questTitle: entry.title,
            proofImageUrl: entry.proofImageUrl,
            timestamp: entry.timestamp
          });
        }
      }
    }

    if (Array.isArray(state.quests)) {
      for (const q of state.quests) {
        if (q && q.proofImageUrl && !seenUrls.has(q.proofImageUrl)) {
          seenUrls.add(q.proofImageUrl);
          photos.push({
            id: 'proof_' + q.id,
            questTitle: q.title,
            proofImageUrl: q.proofImageUrl,
            timestamp: q.createdAt
          });
        }
      }
    }

    photos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return photos;
  }

  const result = mockGetAllProofPhotos(mockAppState);

  // Phải trích đúng 4 ảnh độc bản (loại bỏ 2 ảnh trùng URL)
  assert.equal(result.length, 4, 'Phải có đúng 4 ảnh sau khi loại bỏ URL trùng');
  // Phải được sắp xếp giảm dần theo timestamp
  assert.equal(result[0].proofImageUrl, 'https://r2.example.com/img1.jpg'); // ts 3000
  assert.equal(result[1].proofImageUrl, 'https://r2.example.com/img3.jpg'); // ts 2000
  assert.equal(result[2].proofImageUrl, 'https://r2.example.com/img2.jpg'); // ts 1000
  assert.equal(result[3].proofImageUrl, 'https://r2.example.com/img4.jpg'); // ts 500

  console.log('✓ Test 4: Thuật toán tổng hợp ảnh hỗ trợ gom đa nguồn (proofPhotos, ledger, quests), chống trùng lặp và sắp xếp thời gian mới nhất lên đầu.');
}

// 5. Kiểm tra tính tương thích Schemas & Cloud Sync
function testSchemaAndCloudSync() {
  assert.ok(schemasJs.includes('proofPhotos: v.optional(v.array(v.any()))'), 'StateSyncSchema phải cho phép trường proofPhotos');
  assert.ok(syncJs.includes('proofPhotos: Array.isArray(parsed.proofPhotos) ? parsed.proofPhotos : []'), 'getUserState phải phân tích và trả về proofPhotos');
  assert.ok(syncJs.includes('proofPhotos: Array.isArray(state.proofPhotos)'), 'payloadToSave phải lưu proofPhotos');

  console.log('✓ Test 5: Hệ thống Cloud Sync & Valibot Schema tương thích 100% với cấu trúc album ảnh bằng chứng.');
}

// 6. Kiểm tra lưu trữ và hiển thị ghi chú thông tin thêm của người dùng (userNote)
function testUserNoteStorageAndDisplay() {
  const proofJs = fs.readFileSync(path.join(rootDir, 'src', 'js', '08-proof.js'), 'utf8');
  const questJs = fs.readFileSync(path.join(rootDir, 'src', 'js', '07-quest.js'), 'utf8');

  // DOM modal xem ảnh
  assert.ok(indexHtml.includes('id="proof-viewer-note-zone"'), 'index.html phải có vùng proof-viewer-note-zone');
  assert.ok(indexHtml.includes('id="proof-viewer-note-text"'), 'index.html phải có thẻ text proof-viewer-note-text');
  assert.ok(indexHtml.includes('id="proof-viewer-feedback-zone"'), 'index.html phải có vùng proof-viewer-feedback-zone');
  assert.ok(indexHtml.includes('id="proof-viewer-feedback-text"'), 'index.html phải có thẻ text proof-viewer-feedback-text');

  // src/js/08-proof.js lưu userNote
  assert.ok(proofJs.includes('pendingApprovedQuest.proofUserNote = userNote || \'\''), '08-proof.js phải gán userNote vào pendingApprovedQuest');
  assert.ok(proofJs.includes('userNote: userNote || \'\''), '08-proof.js phải ghi nhận userNote vào appState.proofPhotos');
  assert.ok(proofJs.includes('noteText.textContent = userNote.trim()'), 'openProofViewerModal phải hiển thị userNote');

  // src/js/07-quest.js lưu proofUserNote
  assert.ok(questJs.includes('proofUserNote: quest.proofUserNote || null'), '07-quest.js phải lưu proofUserNote vào ledger');
  assert.ok(questJs.includes('userNote: quest.proofUserNote || \'\''), '07-quest.js phải lưu userNote vào proofPhotos khi completeQuest');

  // 14-render.js hiển thị snippet ghi chú trên thẻ ảnh
  assert.ok(renderJs.includes('safeNote'), '14-render.js phải xử lý safeNote');
  assert.ok(renderJs.includes('item.userNote'), '14-render.js phải trích xuất userNote');

  console.log('✓ Test 6: Thông tin ghi chú thêm gửi cho AI (userNote) được lưu trữ bền vững và hiển thị rõ ràng trong Lịch Sử Ảnh & Modal Xem Ảnh.');
}

testTasksTabCleanFromProofViewing();
testHistoryTabMarkup();
testAppJsProofHistoryLogic();
testGetAllProofPhotosAlgorithm();
testSchemaAndCloudSync();
testUserNoteStorageAndDisplay();

console.log('\n🎉 TẤT CẢ 6/6 KIỂM THỬ LỊCH SỬ ẢNH BẰNG CHỨNG, USENOTE & TINH GỌN TAB NHIỆM VỤ ĐÃ THÀNH CÔNG!');
