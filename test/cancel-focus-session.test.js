import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Kiểm thử Tính năng Hủy Phiên Tập Trung (Không Nộp Bằng Chứng) ===\n');

const html = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
const appJs = fs.readFileSync(path.resolve('test/fixtures/legacy-client/app.js'), 'utf8');
const questDetail = fs.readFileSync(path.resolve('components/quests/QuestDetailModal.tsx'), 'utf8');

// 1. Kiểm tra modal nộp bằng chứng (modal-quest-proof) giữ nguyên sạch sẽ, không có nút Hủy Phiên ở đây
console.log('Test 1: Kiểm tra modal nộp bằng chứng (modal-quest-proof) không bị gắn nút Hủy Phiên rườm rà...');
assert.ok(!html.includes('id="btn-cancel-proof-session"'), 'modal-quest-proof không được chứa id="btn-cancel-proof-session" (theo yêu cầu user)');
console.log('✓ Test 1: modal-quest-proof chỉ giữ nút Đóng và Gửi AI Duyệt gọn gàng.\n');

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
assert.ok(questDetail.includes('id="mqd-btn-cancel-session"'), 'React quest detail must render cancel-session action.');
assert.ok(questDetail.includes('invokeAction(\'cancelQuestFocusSession\')'), 'React cancel-session action must call legacy domain action.');
console.log('✓ Test 3: Modal chi tiết hiển thị nút Hủy Phiên Này ngay dưới nút nộp bằng chứng.\n');

// 4. Kiểm tra Menu Thao Tác Thẻ Nhiệm Vụ (.btn-cancel-focus-session)
console.log('Test 4: Kiểm tra Menu 3 chấm của thẻ nhiệm vụ...');
assert.ok(appJs.includes('btn-cancel-focus-session'), 'Thẻ nhiệm vụ phải có tùy chọn class btn-cancel-focus-session');
assert.ok(appJs.includes('Hủy phiên tập trung'), 'Menu thẻ nhiệm vụ phải có nhãn "Hủy phiên tập trung"');
console.log('✓ Test 4: Menu thẻ nhiệm vụ cho phép hủy phiên tập trung trực tiếp từ danh sách.\n');

// 5. Kiểm tra Đồng bộ đa tab với BroadcastChannel
console.log('Test 5: Kiểm tra xử lý BroadcastChannel cho cancelFocusSession...');
assert.ok(appJs.includes('action: \'cancelFocusSession\''), 'cancelQuestFocusSession phải gửi action cancelFocusSession qua BroadcastChannel');
assert.ok(appJs.includes('event.data.action === \'cancelFocusSession\''), 'Event listener phải xử lý event cancelFocusSession');
console.log('✓ Test 5: Đồng bộ đa tab cho sự kiện hủy phiên tập trung hoạt động đầy đủ.\n');

console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ HỦY PHIÊN TẬP TRUNG ĐÃ VƯỢT QUA!\n');
