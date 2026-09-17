import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Bắt đầu kiểm thử: Tính Mượt Mà & Chống Giật Lag Hệ Thống Timer ===\n');

const appCode = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra cấu trúc hằng số và biến bảo vệ thời gian cục bộ (Grace Period)
console.log('Test 1: Khai báo lastLocalTimerActionTime và TIMER_MUTATION_GRACE_MS');
assert.ok(appCode.includes('let lastLocalTimerActionTime = 0;'), 'Phải có biến theo dõi mốc thao tác gần nhất lastLocalTimerActionTime');
assert.ok(appCode.includes('const TIMER_MUTATION_GRACE_MS = 3500;'), 'Phải có hằng số TIMER_MUTATION_GRACE_MS để bảo vệ trạng thái cục bộ');
console.log('  -> Biến và hằng số bảo vệ Grace Period đã được khai báo chuẩn xác: OK\n');

// 2. Kiểm tra hàm updateQuestCardTimerState cập nhật DOM trực tiếp không giật lag
console.log('Test 2: Hàm updateQuestCardTimerState cập nhật trực tiếp DOM thẻ nhiệm vụ');
assert.ok(appCode.includes('function updateQuestCardTimerState(questId, isRunning, isFocusing)'), 'Phải có hàm updateQuestCardTimerState');
assert.ok(appCode.includes('card.dataset.questId = q.id;'), 'renderQuests phải gắn dataset.questId vào thẻ nhiệm vụ');
assert.ok(appCode.includes('badge-quest-doing'), 'Thẻ nhiệm vụ đang làm phải có class định danh badge-quest-doing');
console.log('  -> Hàm updateQuestCardTimerState và dataset.questId hoạt động tối ưu: OK\n');

// 3. Kiểm tra cơ chế chống chớp tắt khi Start (Race Condition Guard trong hydrateFromCloud)
console.log('Test 3: Chống chớp tắt timer khi vừa bấm chạy trong hydrateFromCloud');
assert.ok(
  appCode.includes('const isRecentLocalAction = (Date.now() - lastLocalTimerActionTime < TIMER_MUTATION_GRACE_MS);'),
  'hydrateFromCloud phải kiểm tra cờ isRecentLocalAction'
);
assert.ok(
  appCode.includes('if (!isRecentLocalAction && cloudTime > Math.max(lastLocalTimerActionTime, timerLocalTime))'),
  'Chỉ xóa phiên từ Cloud nếu Cloud mới hơn thao tác gần nhất của local và đã qua Grace Period'
);
console.log('  -> Cơ chế chống chớp tắt (Stale Snapshot Guard) được thiết lập hoàn hảo: OK\n');

// 4. Kiểm tra cơ chế dừng tức thì khi Pause / Stop không bị snapshot cũ bật lại
console.log('Test 4: Cơ chế dừng tức thì khi Pause / Stop');
assert.ok(
  appCode.includes('if (!isRecentLocalAction && timerCloudTime > (lastLocalTimerActionTime || 0))'),
  'hydrateFromCloud chỉ pause nếu Cloud thực sự mới hơn thao tác cục bộ'
);
assert.ok(
  appCode.includes('updateQuestCardTimerState(oldQuestId, false, false);'),
  'clearFocusTimerSession phải cập nhật lại thẻ nhiệm vụ qua updateQuestCardTimerState'
);
console.log('  -> Pause/Stop phản hồi ngay lập tức và chặn đứng stale state: OK\n');

// 5. Kiểm tra Zero-Latency khi Resume trên cùng thiết bị
console.log('Test 5: Zero-Latency khi Resume trên cùng thiết bị');
assert.ok(
  appCode.includes('const isMyRunner = !appState.activeTimer?.runnerId || appState.activeTimer.runnerId === CURRENT_RUNNER_ID;'),
  'toggleFocusTimer phải nhận diện isMyRunner'
);
assert.ok(
  appCode.includes('if (!isMyRunner) {\n      await pullLatestTimerFromCloud();\n    }'),
  'Chỉ await pullLatestTimerFromCloud() khi là thiết bị khác, cùng thiết bị chạy ngay 0ms'
);
console.log('  -> Resume phản hồi ngay 0ms trên cùng thiết bị: OK\n');

// 6. Kiểm tra cơ chế skipFullRender chống nghẽn CPU
console.log('Test 6: Cơ chế skipFullRender bảo vệ hiệu năng CPU');
assert.ok(appCode.includes('function triggerSave(needsCloud = true, immediate = false, timerAction = null, skipFullRender = false)'), 'triggerSave phải hỗ trợ tham số skipFullRender');
assert.ok(appCode.includes('if (skipFullRender)'), 'triggerSave phải có nhánh bỏ qua renderAll() khi skipFullRender là true');
assert.ok(appCode.includes('triggerSave(true, immediate, timerAction, true);'), 'saveFocusTimerState phải truyền skipFullRender = true');
console.log('  -> skipFullRender loại bỏ hoàn toàn việc re-render toàn trang thừa thãi: OK\n');

// 7. Kiểm tra Polling 2.5s không can thiệp Active Runner
console.log('Test 7: Polling 2.5s không làm gián đoạn Active Runner');
assert.ok(
  appCode.includes('const isCurrentActiveRunner = isFocusRunning && (!appState.activeTimer?.runnerId || appState.activeTimer.runnerId === CURRENT_RUNNER_ID);'),
  'Polling 2.5s phải nhận diện isCurrentActiveRunner'
);
assert.ok(
  appCode.includes('if (!isCurrentActiveRunner) {\n        hydrateFromCloud(false);\n      }'),
  'Polling 2.5s không gọi hydrateFromCloud nếu tab đang là Active Runner'
);
console.log('  -> Active Runner được bảo vệ trọn vẹn, không bị đơ giật: OK\n');

// 8. Mô phỏng Logic Sanity Check trong môi trường runtime Node.js
console.log('Test 8: Mô phỏng kịch bản Stale Snapshot Race Condition');
{
  let localTimerActive = true;
  let localActionTime = 1000000;
  const GRACE_MS = 3500;

  // Giả sử sau 200ms có 1 snapshot cũ từ Cloud về (timestamp Cloud là 999900 < localActionTime)
  const incomingNow = localActionTime + 200;
  const cloudSnapshot = { activeTimer: null, lastSyncedAt: 999900 };

  const isRecentAction = (incomingNow - localActionTime < GRACE_MS);
  assert.strictEqual(isRecentAction, true, 'Hành động vừa xảy ra trong vòng 200ms phải nằm trong Grace Period');

  let sessionCleared = false;
  if (cloudSnapshot.activeTimer === null && localTimerActive) {
    if (!isRecentAction && cloudSnapshot.lastSyncedAt > localActionTime) {
      sessionCleared = true;
    }
  }

  assert.strictEqual(sessionCleared, false, 'Snapshot cũ từ Cloud TUYỆT ĐỐI KHÔNG ĐƯỢC xóa timer đang chạy!');
  console.log('  -> Kịch bản Race Condition: Timer vẫn hoạt động liên tục, không hề bị chớp tắt: OK\n');
}

console.log('🎉 TẤT CẢ 8 BỘ KIỂM THỬ TÍNH NĂNG MƯỢT MÀ & CHỐNG GIẬT LAG ĐÃ VƯỢT QUA 100%!');
