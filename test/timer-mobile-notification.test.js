import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const appCode = fs.readFileSync(path.resolve('public/app.js'), 'utf8');
const swCode = fs.readFileSync(path.resolve('public/sw.js'), 'utf8');

function norm(s) {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

const code = norm(appCode);
const sw = norm(swCode);

async function runTests() {
  console.log('=== Test Suite: Mobile Timer Notifications & Keep-Alive ===\n');

  // Test 1: Vibration API is called independently without blocking on Notification permissions
  console.log('Test 1: navigator.vibrate is independent of Notification.permission');
  {
    assert.ok(
      code.includes("if ('vibrate' in navigator && typeof navigator.vibrate === 'function')"),
      'sendFocusNotification must check navigator.vibrate'
    );
    assert.ok(
      code.includes('navigator.vibrate([500, 200, 500, 200, 800]);'),
      'sendFocusNotification must trigger rhythmic vibration pattern'
    );
    console.log('  -> Vibration pattern verified: OK\n');
  }

  // Test 2: Service Worker Notification is preferred for Android Chrome compatibility
  console.log('Test 2: ServiceWorkerRegistration.showNotification is used for mobile/Android PWA');
  {
    assert.ok(
      code.includes('navigator.serviceWorker.ready.then(reg => {'),
      'sendFocusNotification must use navigator.serviceWorker.ready for mobile push'
    );
    assert.ok(
      code.includes('return reg.showNotification(title, notifOptions);'),
      'sendFocusNotification must call reg.showNotification'
    );
    console.log('  -> ServiceWorker showNotification verified: OK\n');
  }

  // Test 3: Standard PNG icons are used for Android system tray compatibility
  console.log('Test 3: Notification options use standard PNG icons for mobile OS rendering');
  {
    assert.ok(
      code.includes("icon: '/icon-192.png'"),
      'Notification options must specify /icon-192.png for Android system tray'
    );
    assert.ok(
      code.includes("badge: '/favicon.png'"),
      'Notification options must specify /favicon.png for Android badge'
    );
    console.log('  -> Notification PNG icons verified: OK\n');
  }

  // Test 4: Audio Keep-Alive engine prevents mobile background sleep/suspension
  console.log('Test 4: Web Audio keep-alive loop exists to keep mobile session awake');
  {
    assert.ok(
      code.includes('function startTimerKeepAlive() {'),
      '06-timer.js must define startTimerKeepAlive'
    );
    assert.ok(
      code.includes('function stopTimerKeepAlive() {'),
      '06-timer.js must define stopTimerKeepAlive'
    );
    assert.ok(
      code.includes('timerAudioKeepAlive'),
      'timerAudioKeepAlive variable must be managed'
    );
    console.log('  -> Web Audio keep-alive helpers verified: OK\n');
  }

  // Test 5: Notification permission requested on user gesture
  console.log('Test 5: Notification permission helper requests permission on user gesture');
  {
    assert.ok(
      code.includes('function requestTimerNotificationPermission() {'),
      '06-timer.js must define requestTimerNotificationPermission'
    );
    assert.ok(
      code.includes('Notification.requestPermission()'),
      'requestTimerNotificationPermission must call Notification.requestPermission'
    );
    console.log('  -> Permission request verified: OK\n');
  }

  // Test 6: Mobile wake-up listeners (visibilitychange, pageshow, focus) catch up delta-time
  console.log('Test 6: Mobile screen-on / tab focus events catch up delta-time');
  {
    assert.ok(
      code.includes("document.addEventListener('visibilitychange', () => {"),
      'visibilitychange listener must be registered'
    );
    assert.ok(
      code.includes("window.addEventListener('pageshow', () => {"),
      'pageshow listener must be registered for mobile tab resume'
    );
    assert.ok(
      code.includes("window.addEventListener('focus', () => {"),
      'focus listener must be registered'
    );
    console.log('  -> Mobile resume listeners verified: OK\n');
  }

  // Test 7: Service Worker notificationclick handler
  console.log('Test 7: Service Worker handles notificationclick on mobile tap');
  {
    assert.ok(
      sw.includes("self.addEventListener('notificationclick'"),
      'sw.js must register notificationclick handler'
    );
    assert.ok(
      sw.includes('event.notification.close()'),
      'notificationclick handler must close notification'
    );
    assert.ok(
      sw.includes('client.focus()'),
      'notificationclick handler must focus app window'
    );
    console.log('  -> Service Worker notificationclick verified: OK\n');
  }

  // Test 8: Guaranteed In-App Toast on completion
  console.log('Test 8: In-App Toasts trigger on quest timer completion');
  {
    assert.ok(
      code.includes("showToast(`🎉 HOÀN THÀNH TẬP TRUNG: \"${quest.title}\"! +${quest.rewardCoins} Vàng`, 'gold');"),
      'focusTimerFinished must trigger in-app gold toast'
    );
    console.log('  -> In-App completion toast verified: OK\n');
  }

  console.log('============================================================');
  console.log('✅ All 8 mobile timer notification tests passed!');
  console.log('============================================================');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
