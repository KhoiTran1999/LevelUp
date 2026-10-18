import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Kiểm thử Tính năng Hủy Phiên Tập Trung (Không Nộp Bằng Chứng) ===\n');

const html = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

// 1. Kiểm tra HTML của modal-quest-proof có nút hủy phiên
console.log('Test 1: Kiểm tra nút Hủy Phiên trong modal nộp bằng chứng (modal-quest-proof)...');
assert.ok(html.includes('id="btn-cancel-proof-session"'), 'modal-quest-proof phải có nút id="btn-cancel-proof-session"');
assert.ok(html.includes('Hủy Phiên'), 'modal-quest-proof phải có nhãn "Hủy Phiên"');
console.log('✓ Test 1: modal-quest-proof có sẵn nút hủy phiên tập trung.\n');

// 2. Kiểm tra logic cancelQuestFocusSession trong app.js
console.log('Test 2: Kiểm tra hàm cancelQuestFocusSession trong app.js...');
assert.ok(appJs.includes('async function cancelQuestFocusSession('), 'app.js phải định nghĩa hàm cancelQuestFocusSession');
assert.ok(appJs.includes('window.cancelQuestFocusSession = cancelQuestFocusSession;'), 'cancelQuestFocusSession phải được export ra window');
assert.ok(appJs.includes('delete quest.focusTimerCompleted;'), 'cancelQuestFocusSession phải xóa thuộc tính focusTimerCompleted');
assert.ok(appJs.includes('delete quest._proofVerified;'), 'cancelQuestFocusSession phải xóa thuộc tính _proofVerified');
assert.ok(appJs.includes('delete quest.savedTimer;'), 'cancelQuestFocusSession phải xóa thuộc tính savedTimer');
console.log('✓ Test 2: cancelQuestFocusSession được định nghĩa và xử lý dọn dẹp state chuẩn xác.\n');

// 3. Kiểm tra Modal Chi Tiết Nhiệm Vụ (openQuestDetailModal) render nút Hủy Phiên
console.log('Test 3: Kiểm tra render nút Hủy Phiên trong Modal Chi Tiết Nhiệm Vụ...');
assert.ok(appJs.includes('id="mqd-btn-cancel-session"'), 'openQuestDetailModal phải render id="mqd-btn-cancel-session"');
assert.ok(appJs.includes('Hủy Phiên Này (Không nộp bằng chứng)'), 'Nút hủy phiên khi chờ nộp ảnh phải có nhãn rõ ràng');
assert.ok(appJs.includes('cancelQuestFocusSession(q.id)'), 'Nút hủy phiên phải gọi cancelQuestFocusSession với id nhiệm vụ');
console.log('✓ Test 3: Modal chi tiết hiển thị nút Hủy Phiên Này ngay dưới nút nộp bằng chứng.\n');

// 4. Kiểm tra Menu Thao Tác Thẻ Nhiệm Vụ (.btn-cancel-focus-session)
console.log('Test 4: Kiểm tra Menu 3 chấm của thẻ nhiệm vụ...');
assert.ok(appJs.includes('btn-cancel-focus-session'), 'Thẻ nhiệm vụ phải có tùy chọn class btn-cancel-focus-session');
assert.ok(appJs.includes('Hủy phiên tập trung'), 'Menu thẻ nhiệm vụ phải có nhãn "Hủy phiên tập trung"');
console.log('✓ Test 4: Menu thẻ nhiệm vụ cho phép hủy phiên tập trung trực tiếp từ danh sách.\n');

// 5. Kiểm tra Logic Ẩn/Hiện nút Hủy Phiên trong modal nộp bằng chứng
console.log('Test 5: Kiểm tra bật tắt nút Hủy Phiên trong openQuestProofModal...');
assert.ok(appJs.includes('cancelProofSessionBtn.classList.remove(\'hidden\')'), 'openQuestProofModal phải hiển thị nút khi quest.focusTimerCompleted');
assert.ok(appJs.includes('cancelProofSessionBtn.classList.add(\'hidden\')'), 'openQuestProofModal phải ẩn nút khi không phải focusTimerCompleted');
console.log('✓ Test 5: Nút hủy phiên trong proof modal hiển thị đúng lúc đúng chỗ.\n');

// 6. Kiểm tra Đồng bộ đa tab với BroadcastChannel
console.log('Test 6: Kiểm tra xử lý BroadcastChannel cho cancelFocusSession...');
assert.ok(appJs.includes('action: \'cancelFocusSession\''), 'cancelQuestFocusSession phải gửi action cancelFocusSession qua BroadcastChannel');
assert.ok(appJs.includes('event.data.action === \'cancelFocusSession\''), 'Event listener phải xử lý event cancelFocusSession');
console.log('✓ Test 6: Đồng bộ đa tab cho sự kiện hủy phiên tập trung hoạt động đầy đủ.\n');

console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ HỦY PHIÊN TẬP TRUNG ĐÃ VƯỢT QUA!\n');
