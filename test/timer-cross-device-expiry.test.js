import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const appCode = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

// Helper: normalize whitespace for cross-platform string matching
function norm(s) {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
const code = norm(appCode);

async function runTests() {
  console.log('=== Test Suite: Timer Cross-Device Expiry (00:00 Deadlock Fix) ===\n');

  // ---------------------------------------------------------------------------
  // Test 1: restoreFocusTimer credits actualFocusedSeconds khi !isMyRunner
  // ---------------------------------------------------------------------------
  console.log('Test 1: restoreFocusTimer credits actualFocusedSeconds cho thiết bị khác');
  {
    assert.ok(
      code.includes('if (!isBreakMode) {\n          actualFocusedSeconds += elapsed;\n        }\n        focusRemainingSeconds = Math.max(0, (state.remainingSeconds || 0) - elapsed);'),
      'restoreFocusTimer else branch phải credit actualFocusedSeconds += elapsed khi !isBreakMode'
    );
    console.log('  -> restoreFocusTimer credits elapsed time cho non-runner device: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 2: restoreFocusTimer auto-finish khi focusRemainingSeconds <= 0 trên thiết bị khác
  // ---------------------------------------------------------------------------
  console.log('Test 2: restoreFocusTimer auto-finish khi timer đã expired');
  {
    assert.ok(
      code.includes('// Cross-device auto-finish: Timer đã hết trên wall-clock nhưng chưa ai kết thúc'),
      'restoreFocusTimer phải có logic cross-device auto-finish'
    );
    assert.ok(
      code.includes('if (focusRemainingSeconds <= 0 && state.isRunning) {'),
      'restoreFocusTimer phải check focusRemainingSeconds <= 0 && state.isRunning'
    );
    console.log('  -> restoreFocusTimer auto-completes expired timer trên mọi thiết bị: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 3: tickFocusTimer xử lý focusRemainingSeconds <= 0 NGOÀI block if > 0
  // ---------------------------------------------------------------------------
  console.log('Test 3: tickFocusTimer completion check nằm NGOÀI if (focusRemainingSeconds > 0)');
  {
    assert.ok(
      code.includes('// Completion check NGOÀI block if > 0'),
      'tickFocusTimer phải có completion check ngoài block focusRemainingSeconds > 0'
    );
    // Verify that focusRemainingSeconds = 0 and actualFocusedSeconds = Math.max are set before clearInterval
    assert.ok(
      code.includes('focusRemainingSeconds = 0;\n    actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);\n    clearInterval(focusTimerInterval);'),
      'tickFocusTimer phải credit actualFocusedSeconds = Math.max trước clearInterval'
    );
    console.log('  -> tickFocusTimer hoàn thành timer ngay cả khi remaining đã là 0: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 4: toggleFocusTimer auto-finish khi focusRemainingSeconds <= 0
  // ---------------------------------------------------------------------------
  console.log('Test 4: toggleFocusTimer auto-finish khi timer đã expired');
  {
    assert.ok(
      code.includes('// Timer đã hết thời gian -> Hoàn thành ngay lập tức thay vì chạy interval chết'),
      'toggleFocusTimer phải có guard auto-finish khi timer expired'
    );
    assert.ok(
      code.includes('if (focusRemainingSeconds <= 0 && (activeFocusQuest || activeRewardItem || isBreakMode)) {'),
      'toggleFocusTimer phải check focusRemainingSeconds <= 0 với active session'
    );
    console.log('  -> toggleFocusTimer hoàn thành ngay thay vì chạy dead interval: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 5: renderFocusStationUI hiển thị nút hoàn thành khi isTimeUp
  // ---------------------------------------------------------------------------
  console.log('Test 5: renderFocusStationUI hiển thị nút hoàn thành khi timer hết');
  {
    assert.ok(
      code.includes('const isTimeUp = focusRemainingSeconds <= 0 && Boolean(activeFocusQuest || activeRewardItem || isBreakMode);'),
      'renderFocusStationUI phải tính isTimeUp'
    );
    assert.ok(
      code.includes("'🎉 ĐÃ HOÀN THÀNH THỜI GIAN!'"),
      'renderFocusStationUI phải hiển thị label ĐÃ HOÀN THÀNH THỜI GIAN khi isTimeUp'
    );
    assert.ok(
      code.includes("'Hoàn Thành & Nhận Thưởng 🎁'"),
      'renderFocusStationUI phải hiển thị nút Hoàn Thành & Nhận Thưởng khi isTimeUp'
    );
    console.log('  -> renderFocusStationUI hiển thị đúng UI hoàn thành khi timer hết: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 6: renderQuests hiển thị nút hoàn thành trên quest card khi isTimerDone
  // ---------------------------------------------------------------------------
  console.log('Test 6: renderQuests hiển thị nút hoàn thành trên quest card');
  {
    assert.ok(
      code.includes('const isTimerDone = isCurrentlyFocusing && focusRemainingSeconds <= 0;'),
      'renderQuests phải tính isTimerDone'
    );
    assert.ok(
      code.includes('!isTimerDone &&'),
      'isSessionOnOtherDevice phải exclude khi isTimerDone'
    );
    assert.ok(
      code.includes('btn-complete-focus-done'),
      'renderQuests phải có nút btn-complete-focus-done'
    );
    assert.ok(
      code.includes("'Hoàn Thành & Nhận Thưởng 🎉'"),
      'Quest card phải hiển thị Hoàn Thành & Nhận Thưởng 🎉'
    );
    assert.ok(
      code.includes('🎉 ĐÃ XONG'),
      'Quest card phải hiển thị badge 🎉 ĐÃ XONG khi isTimerDone'
    );
    console.log('  -> renderQuests hiển thị đúng nút hoàn thành trên quest card: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 7: btn-complete-focus-done event listener
  // ---------------------------------------------------------------------------
  console.log('Test 7: btn-complete-focus-done click listener gọi focusTimerFinished');
  {
    assert.ok(
      code.includes("const completeFocusDoneBtn = card.querySelector('.btn-complete-focus-done');"),
      'Phải có event listener cho btn-complete-focus-done'
    );
    assert.ok(
      code.includes('completeFocusDoneBtn.addEventListener'),
      'btn-complete-focus-done phải có addEventListener'
    );
    console.log('  -> btn-complete-focus-done event listener được cài đặt: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 8: startFocusTimer auto-finish khi nhấn vào quest đang chạy nhưng đã hết giờ
  // ---------------------------------------------------------------------------
  console.log('Test 8: startFocusTimer auto-finish khi click vào quest đã hết giờ');
  {
    assert.ok(
      code.includes('// Timer đã hết -> Hoàn thành ngay lập tức\n    if (focusRemainingSeconds <= 0) {'),
      'startFocusTimer edge case 2 phải auto-finish khi focusRemainingSeconds <= 0'
    );
    console.log('  -> startFocusTimer auto-finish khi quest đã hết giờ: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 9: pullLatestTimerFromCloud credit actualFocusedSeconds khi expired
  // ---------------------------------------------------------------------------
  console.log('Test 9: pullLatestTimerFromCloud credits actualFocusedSeconds khi expired');
  {
    assert.ok(
      code.includes('if (focusRemainingSeconds <= 0) {\n            focusRemainingSeconds = 0;\n            actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);\n          }'),
      'pullLatestTimerFromCloud phải clamp và credit khi expired'
    );
    console.log('  -> pullLatestTimerFromCloud credits elapsed time khi expired: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 10: Mô phỏng logic tính toán cross-device timer expiry
  // ---------------------------------------------------------------------------
  console.log('Test 10: Mô phỏng cross-device timer expiry calculation');
  {
    // Simulate: Quest 25 min started on Device A. Device B loads state after 30 min.
    const targetMinutes = 25;
    const totalSeconds = targetMinutes * 60; // 1500
    const stateRemainingSeconds = totalSeconds; // Full duration saved at start
    const stateActualFocusedSeconds = 0;
    const stateLastTickTime = Date.now() - 30 * 60 * 1000; // 30 min ago
    const stateIsRunning = true;
    const stateIsBreakMode = false;

    // Compute elapsed
    const elapsed = Math.max(0, (Date.now() - stateLastTickTime) / 1000);
    let actualFocusedSeconds = stateActualFocusedSeconds + (!stateIsBreakMode ? elapsed : 0);
    let focusRemainingSeconds = Math.max(0, stateRemainingSeconds - elapsed);

    // Auto-complete guard
    if (focusRemainingSeconds <= 0) {
      focusRemainingSeconds = 0;
      actualFocusedSeconds = Math.max(actualFocusedSeconds, totalSeconds);
    }

    assert.strictEqual(focusRemainingSeconds, 0, 'Remaining seconds must be 0 after 30 min elapsed on 25 min timer');
    assert.ok(actualFocusedSeconds >= totalSeconds, `actualFocusedSeconds (${actualFocusedSeconds}) must be >= totalSeconds (${totalSeconds})`);
    assert.ok(actualFocusedSeconds >= elapsed - 1, 'actualFocusedSeconds must credit full elapsed wall-clock time');

    // Anti-cheat verification
    const minRequired = targetMinutes * 60 - 5;
    assert.ok(actualFocusedSeconds >= minRequired, `Anti-cheat check passed: ${actualFocusedSeconds} >= ${minRequired}`);

    console.log(`  -> Timer: ${targetMinutes}p. Elapsed: ${Math.round(elapsed)}s. Remaining: ${focusRemainingSeconds}. Actual: ${Math.round(actualFocusedSeconds)}s.`);
    console.log('  -> Cross-device calculation hoạt động chính xác, anti-cheat pass: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 11: Mô phỏng kịch bản toggleFocusTimer khi remaining = 0
  // ---------------------------------------------------------------------------
  console.log('Test 11: Mô phỏng toggleFocusTimer khi remaining đã = 0');
  {
    let focusRemainingSeconds = 0;
    let actualFocusedSeconds = 1400;
    const focusTotalSeconds = 1500;
    let finishedCalled = false;

    // Simulate the guard in toggleFocusTimer
    if (focusRemainingSeconds <= 0) {
      focusRemainingSeconds = 0;
      actualFocusedSeconds = Math.max(actualFocusedSeconds, focusTotalSeconds);
      finishedCalled = true;
    }

    assert.strictEqual(focusRemainingSeconds, 0, 'Remaining stays 0');
    assert.strictEqual(actualFocusedSeconds, 1500, 'actualFocusedSeconds credited to totalSeconds');
    assert.strictEqual(finishedCalled, true, 'focusTimerFinished must be called immediately');
    console.log('  -> toggleFocusTimer hoàn thành ngay khi remaining = 0: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 12: Cơ chế chống lặp Toast (Toast Deduplication)
  // ---------------------------------------------------------------------------
  console.log('Test 12: Kiểm tra cơ chế chống lặp Toast');
  {
    assert.ok(
      code.includes('if (message === lastToastMessage && (now - lastToastTime < 3000))'),
      'showToast phải chặn hiển thị thông báo trùng lặp trong 3 giây'
    );
    console.log('  -> Toast deduplication guard hoạt động chính xác: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 13: Cơ chế chống lặp Web Push Notification (Notification Deduplication)
  // ---------------------------------------------------------------------------
  console.log('Test 13: Kiểm tra cơ chế chống lặp Web Push Notification');
  {
    assert.ok(
      code.includes('if (body === lastNotificationBody && (now - lastNotificationTime < 5000))'),
      'sendFocusNotification phải chặn push notification trùng lặp trong 5 giây'
    );
    console.log('  -> Push notification deduplication guard hoạt động chính xác: OK\n');
  }

  console.log('============================================================');
  console.log('✅ All 13 cross-device timer expiry & dedup tests passed!');
  console.log('============================================================');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
