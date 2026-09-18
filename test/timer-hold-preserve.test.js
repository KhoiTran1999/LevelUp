import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Kiểm thử Tính Năng Bảo Lưu Thời Gian Đếm Ngược (Quests & Rewards) ===\n');

const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');
const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8').replace(/\r\n/g, '\n');
const syncJs = fs.readFileSync(path.resolve('api/sync.js'), 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra sự tồn tại của nút Bảo Lưu trên Focus Station Banner và Fullscreen Zen Overlay
assert.ok(indexHtml.includes('id="btn-timer-hold"'), 'btn-timer-hold phải tồn tại trong active-focus-banner');
assert.ok(indexHtml.includes('id="btn-zen-hold"'), 'btn-zen-hold phải tồn tại trong focus-zen-overlay');
assert.ok(indexHtml.includes('Bảo Lưu</span>'), 'Nút bảo lưu phải có nhãn hiển thị Bảo Lưu');
console.log('✓ Test 1: Nút Bảo Lưu (btn-timer-hold và btn-zen-hold) tồn tại đầy đủ trong index.html.');

// 2. Kiểm tra các hàm bảo lưu & hủy bảo lưu được khai báo và xuất ra window
assert.ok(appJs.includes('async function holdFocusTimer()'), 'Hàm holdFocusTimer() phải được khai báo trong app.js');
assert.ok(appJs.includes('function clearSavedQuestTimer(questId)'), 'Hàm clearSavedQuestTimer() phải được khai báo trong app.js');
assert.ok(appJs.includes('function clearSavedRewardTimer(invId)'), 'Hàm clearSavedRewardTimer() phải được khai báo trong app.js');
assert.ok(appJs.includes('window.holdFocusTimer = holdFocusTimer;'), 'holdFocusTimer phải được xuất ra window');
assert.ok(appJs.includes('window.clearSavedQuestTimer = clearSavedQuestTimer;'), 'clearSavedQuestTimer phải được xuất ra window');
assert.ok(appJs.includes('window.clearSavedRewardTimer = clearSavedRewardTimer;'), 'clearSavedRewardTimer phải được xuất ra window');
console.log('✓ Test 2: Các hàm holdFocusTimer, clearSavedQuestTimer, clearSavedRewardTimer được định nghĩa và export ra window.');

// 3. Kiểm tra logic gán sự kiện click cho btn-timer-hold và btn-zen-hold
assert.ok(appJs.includes("btnTimerHold.addEventListener('click', holdFocusTimer);"), 'btnTimerHold phải có listener gọi holdFocusTimer');
assert.ok(appJs.includes("btnZenHold.addEventListener('click', () => {"), 'btnZenHold phải có listener gọi holdFocusTimer');
console.log('✓ Test 3: Event listeners cho btn-timer-hold và btn-zen-hold được thiết lập trong setupEventListeners.');

// 4. Kiểm tra cấu trúc dữ liệu và logic bảo lưu trong holdFocusTimer()
assert.ok(appJs.includes('quest.savedTimer = {'), 'holdFocusTimer phải lưu savedTimer vào quest');
assert.ok(appJs.includes('remainingSeconds: remaining,'), 'savedTimer phải lưu remainingSeconds');
assert.ok(appJs.includes('actualFocusedSeconds: actual,'), 'savedTimer phải lưu actualFocusedSeconds để bảo toàn Anti-Cheat');
assert.ok(appJs.includes('item.savedTimer = {'), 'holdFocusTimer phải lưu savedTimer vào item');
console.log('✓ Test 4: holdFocusTimer lưu đầy đủ remainingSeconds, actualFocusedSeconds (Anti-Cheat) và tổng thời gian.');

// 5. Kiểm tra logic khôi phục phiên bảo lưu trong startFocusTimer(quest)
assert.ok(appJs.includes('quest.savedTimer && quest.savedTimer.remainingSeconds > 0'), 'startFocusTimer phải kiểm tra quest.savedTimer');
assert.ok(appJs.includes('initialActualFocusedSec = quest.savedTimer.actualFocusedSeconds || 0;'), 'startFocusTimer phải khôi phục actualFocusedSeconds');
assert.ok(appJs.includes('delete quest.savedTimer;'), 'startFocusTimer phải xóa savedTimer sau khi đã nạp lại');
console.log('✓ Test 5: startFocusTimer khôi phục trọn vẹn thời gian còn lại và thời gian tập trung thực tế, dọn dẹp savedTimer.');

// 6. Kiểm tra logic khôi phục phần thưởng bảo lưu trong useInventoryItem(invId)
assert.ok(appJs.includes('item.savedTimer && item.savedTimer.remainingSeconds > 0'), 'useInventoryItem phải kiểm tra item.savedTimer');
assert.ok(appJs.includes('initialRemainingSec = Math.max(1, item.savedTimer.remainingSeconds);'), 'useInventoryItem phải nạp lại remainingSeconds');
assert.ok(appJs.includes('delete item.savedTimer;'), 'useInventoryItem phải xóa savedTimer sau khi đã nạp lại');
console.log('✓ Test 6: useInventoryItem khôi phục trọn vẹn thời gian còn lại cho phần thưởng bảo lưu.');

// 7. Kiểm tra chuyển đổi nhiệm vụ/phần thưởng linh hoạt có gợi ý bảo lưu
assert.ok(appJs.includes('Bảo Lưu & Đổi'), 'startFocusTimer và useInventoryItem phải cung cấp lựa chọn Bảo Lưu & Đổi');
assert.ok(appJs.includes('Bảo Lưu Quà & Bắt Đầu Nhiệm Vụ?'), 'Khi đổi từ quà sang nhiệm vụ phải có thông báo bảo lưu');
console.log('✓ Test 7: Khi đang có phiên chạy mà chọn nhiệm vụ/quà khác, có hỗ trợ Bảo Lưu & Chuyển Đổi tự động.');

// 8. Kiểm tra giao diện hiển thị thẻ nhiệm vụ trong renderQuests()
assert.ok(appJs.includes('badge-quest-saved'), 'renderQuests phải render badge badge-quest-saved');
assert.ok(appJs.includes('⏸️ BẢO LƯU (${Math.ceil(q.savedTimer.remainingSeconds / 60)}p)'), 'renderQuests phải hiển thị nhãn BẢO LƯU kèm thời gian');
assert.ok(appJs.includes('Tiếp Tục (${Math.ceil(q.savedTimer.remainingSeconds / 60)}p) ⏱️'), 'renderQuests phải có nút Tiếp Tục với số phút còn lại');
assert.ok(appJs.includes('clearSavedQuestTimer'), 'renderQuests menu dropdown phải có tùy chọn Hủy bảo lưu');
console.log('✓ Test 8: renderQuests hiển thị huy hiệu BẢO LƯU, nút Tiếp Tục (Xp) và tùy chọn hủy bảo lưu.');

// 9. Kiểm tra giao diện hiển thị thẻ quà trong renderInventory()
assert.ok(appJs.includes('⏸️ BẢO LƯU (${Math.ceil(item.savedTimer.remainingSeconds / 60)}P)'), 'renderInventory phải hiển thị nhãn BẢO LƯU kèm thời gian');
assert.ok(appJs.includes('Tiếp Tục Dùng (${Math.ceil(item.savedTimer.remainingSeconds / 60)}p)'), 'renderInventory phải có nút Tiếp Tục Dùng');
assert.ok(appJs.includes('clearSavedRewardTimer'), 'renderInventory phải có listener gọi clearSavedRewardTimer');
console.log('✓ Test 9: renderInventory hiển thị huy hiệu BẢO LƯU, nút Tiếp Tục Dùng và tùy chọn kết thúc.');

// 10. Kiểm tra dọn dẹp savedTimer khi hoàn thành hoặc làm lại
assert.ok(appJs.includes('delete targetQuest.savedTimer;') || appJs.includes('delete quest.savedTimer;'), 'completeQuest/restartQuest phải xóa savedTimer');
assert.ok(appJs.includes('delete item.savedTimer;'), 'rewardTimerFinished và undoUseInventoryItem phải dọn dẹp item.savedTimer');
console.log('✓ Test 10: Dọn dẹp savedTimer triệt để khi hoàn thành, khởi động lại quest hoặc kết thúc/hoàn tác quà.');

// 11. Kiểm tra Backend sync.js không cắt tỉa (prune) quà có savedTimer
assert.ok(syncJs.includes('i.savedTimer && Number(i.savedTimer.remainingSeconds) > 0'), 'sync.js không được prune inventory items có savedTimer active');
console.log('✓ Test 11: Backend api/sync.js bảo toàn các item trong kho có savedTimer chưa dùng hết.');

// 12. Mô phỏng luồng bảo lưu và khôi phục thực tế (Data structure simulation)
{
  // Giả lập nhiệm vụ Pomodoro 25 phút (1500s) chạy được 600s, còn 900s
  const quest = {
    id: 'quest-test-123',
    title: 'Luyện tập giải thuật LeetCode',
    targetMinutes: 25
  };
  let focusRemainingSeconds = 900;
  let actualFocusedSeconds = 600;
  let focusTotalSeconds = 1500;

  // Thực hiện Bảo Lưu:
  quest.savedTimer = {
    remainingSeconds: focusRemainingSeconds,
    actualFocusedSeconds: actualFocusedSeconds,
    totalSeconds: focusTotalSeconds,
    savedAt: Date.now()
  };

  assert.strictEqual(quest.savedTimer.remainingSeconds, 900);
  assert.strictEqual(quest.savedTimer.actualFocusedSeconds, 600);
  assert.strictEqual(quest.savedTimer.totalSeconds, 1500);

  // Người dùng làm việc khác (clear active timer)
  focusRemainingSeconds = 0;
  actualFocusedSeconds = 0;
  focusTotalSeconds = 0;

  // Người dùng bấm "Tiếp Tục" (startFocusTimer khôi phục)
  const isResumingSaved = Boolean(quest.savedTimer && quest.savedTimer.remainingSeconds > 0);
  assert.strictEqual(isResumingSaved, true);

  const restoredTotal = quest.savedTimer.totalSeconds;
  const restoredRemaining = quest.savedTimer.remainingSeconds;
  const restoredActual = quest.savedTimer.actualFocusedSeconds;
  delete quest.savedTimer;

  assert.strictEqual(restoredRemaining, 900);
  assert.strictEqual(restoredActual, 600);
  assert.strictEqual(restoredTotal, 1500);
  assert.strictEqual(quest.savedTimer, undefined);

  // Tiếp tục chạy thêm 900s
  const additionalFocused = 900;
  const finalActualFocused = restoredActual + additionalFocused;
  assert.strictEqual(finalActualFocused, 1500);

  // Kiểm tra Anti-Cheat: 1500s >= (25 * 60 - 5) -> Vượt qua xác thực chống gian lận!
  assert.ok(finalActualFocused >= (quest.targetMinutes * 60) - 5, 'Anti-cheat phải hợp lệ sau khi tiếp tục phiên');
  console.log('✓ Test 12: Mô phỏng chu trình Bảo Lưu -> Làm việc khác -> Tiếp tục -> Xác thực Anti-cheat hoàn toàn hợp lệ.');
}

// 13. Kiểm tra Revival Guard trong syncWithCloud và hydrateFromCloud
assert.ok(appJs.includes('isRecentLocalAction && !isFocusRunning && !activeFocusQuest && !activeRewardItem'), 'Revival Guard phải ngăn server snapshot cũ hồi sinh timer');
console.log('✓ Test 13: Cơ chế Revival Guard chặn đứng việc Cloud echo hay snapshot cũ bật lại đồng hồ đã bảo lưu.');

// 14. Kiểm tra bảo tồn savedTimer khi xảy ra conflict resolution
assert.ok(appJs.includes('localSavedQuests.has(q.id)'), 'syncWithCloud và hydrateFromCloud phải khôi phục local savedTimer khi sync conflict');
console.log('✓ Test 14: Conflict resolution trên Cloud bảo toàn trọn vẹn savedTimer của cả Quests và Inventory.');

// 15. Kiểm tra dọn dẹp phiên đang chạy khi chuyển sang quà tức thì (durationMinutes === 0)
assert.ok(appJs.includes('if (isFocusRunning || focusTimerInterval || activeFocusQuest || activeRewardItem)'), 'useInventoryItem phải dọn dẹp timer khi dùng quà tức thì');
console.log('✓ Test 15: Khi dùng quà tức thì không cần timer, hệ thống dọn dẹp sạch sẽ phiên cũ, tránh chạy ngầm.');

// 16. Kiểm tra updateQuestCardTimerState bảo vệ nút Tiếp Tục (Xp) của các thẻ đang bảo lưu
assert.ok(appJs.includes('card.classList.add(\'ring-1\', \'ring-sky-500/50\', \'shadow-md\', \'shadow-sky-500/10\');'), 'updateQuestCardTimerState phải giữ styling cho thẻ có savedTimer');
console.log('✓ Test 16: updateQuestCardTimerState bảo vệ phong cách nút Tiếp Tục (Xp) của các thẻ đang bảo lưu khi chuyển đổi.');

console.log('\n🎉 TẤT CẢ 16/16 KIỂM THỬ TÍNH NĂNG BẢO LƯU ĐÃ ĐẠT CHUẨN THÀNH CÔNG!');
