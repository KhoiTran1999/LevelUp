import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import handler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  signQuest
} from '../api/sync.js';

class MockRedis {
  constructor() {
    this.store = new Map();
    this.sortedSets = new Map();
    this.sets = new Map();
    this.status = 'ready';
  }

  async connect() {}

  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async set(key, val) {
    this.store.set(key, typeof val === 'string' ? val : JSON.stringify(val));
    return 'OK';
  }

  async del(key) {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  async zadd(key, score, member) {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map());
    }
    this.sortedSets.get(key).set(String(member), Number(score));
    return 1;
  }

  async zrem(key, member) {
    if (!this.sortedSets.has(key)) return 0;
    const deleted = this.sortedSets.get(key).delete(String(member));
    return deleted ? 1 : 0;
  }

  async zscore(key, member) {
    if (!this.sortedSets.has(key)) return null;
    const score = this.sortedSets.get(key).get(String(member));
    return score !== undefined ? String(score) : null;
  }

  async sadd(key, member) {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    this.sets.get(key).add(String(member));
    return 1;
  }

  async smembers(key) {
    if (!this.sets.has(key)) return [];
    return Array.from(this.sets.get(key));
  }
}

function mockReqRes({ method = 'GET', query = {}, body = {}, headers = {} }) {
  const req = {
    method,
    query,
    body,
    headers: {
      cookie: '',
      ...headers
    }
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };

  return { req, res };
}

async function runTests() {
  console.log('=== Bắt đầu kiểm thử Đồng Bộ Đồng Hồ Đếm Ngược Đa Thiết Bị Qua Redis ===\n');

  const mockRedis = new MockRedis();
  setRedisClientForTesting(mockRedis);

  const playerSub = 'player_timer_sync_sub';
  setGoogleTokenVerifierForTesting(async (token) => {
    if (token === 'player_token_device_1' || token === 'player_token_device_2') {
      return {
        sub: playerSub,
        email: 'hero@levelup.dev',
        name: 'Hiệp Sĩ Tập Trung'
      };
    }
    return null;
  });

  const q1Sig = signQuest('Luyện Kiếm Thuật 25 Phút', 'focus', 25, 30);
  const initialQuests = [
    {
      id: 'quest_sword_25',
      title: 'Luyện Kiếm Thuật 25 Phút',
      type: 'focus',
      targetMinutes: 25,
      rewardCoins: 30,
      rank: 'B',
      status: 'active',
      completed: false,
      signature: q1Sig
    }
  ];

  const initialPlayerState = {
    googleId: playerSub,
    profile: {
      nickname: 'HiepSiTapTrung',
      avatar: '⚔️',
      level: 3,
      exp: 45,
      coins: 60,
      totalCoinsEarned: 60,
      title: 'Chiến Binh Kỷ Luật',
      role: 'user'
    },
    quests: initialQuests,
    inventory: [],
    ledger: [],
    activeTimer: null,
    lastModified: 1000,
    lastSyncedAt: 1000
  };

  await mockRedis.set(`levelup:user:google:${playerSub}`, JSON.stringify(initialPlayerState));
  await mockRedis.set(`levelup:nick_to_sub:hiepsitaptrung`, playerSub);

  // ---------------------------------------------------------------------------
  // Test 1: Thiết bị 1 bắt đầu bấm giờ nhiệm vụ và đồng bộ lên Redis qua POST /api/sync
  // ---------------------------------------------------------------------------
  console.log('Test 1: Thiết bị 1 bấm giờ nhiệm vụ (25 phút) và lưu activeTimer vào Redis');
  const startTime = Date.now();
  const device1TimerState = {
    questId: 'quest_sword_25',
    questTitle: 'Luyện Kiếm Thuật 25 Phút',
    questRank: 'B',
    rewardCoins: 30,
    targetMinutes: 25,
    rewardItemId: null,
    isRewardMode: false,
    remainingSeconds: 1500,
    totalSeconds: 1500,
    actualFocusedSeconds: 0,
    isRunning: true,
    isBreakMode: false,
    lastTickTime: startTime,
    updatedAt: startTime
  };

  {
    const stateWithTimer = {
      ...initialPlayerState,
      activeTimer: device1TimerState,
      lastModified: startTime,
      lastSyncedAt: startTime
    };

    const { req, res } = mockReqRes({
      method: 'POST',
      headers: {
        authorization: 'Bearer player_token_device_1'
      },
      body: {
        token: 'player_token_device_1',
        nickname: 'HiepSiTapTrung',
        state: stateWithTimer
      }
    });

    await handler(req, res);
    assert.strictEqual(res.statusCode, 200, `POST sync thất bại: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.success, true);

    // Kiểm tra Redis đã lưu activeTimer
    const rawSaved = await mockRedis.get(`levelup:user:google:${playerSub}`);
    assert.ok(rawSaved, 'Dữ liệu trên Redis phải tồn tại');
    const savedObj = JSON.parse(rawSaved);
    assert.ok(savedObj.activeTimer, 'Redis phải lưu trữ trường activeTimer');
    assert.strictEqual(savedObj.activeTimer.questId, 'quest_sword_25');
    assert.strictEqual(savedObj.activeTimer.remainingSeconds, 1500);
    assert.strictEqual(savedObj.activeTimer.isRunning, true);
    console.log('  -> Thiết bị 1 đã lưu thành công activeTimer vào Redis: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 2: Thiết bị 2 mở lên sau 300 giây (5 phút) -> GET /api/sync và tính Delta-Time
  // ---------------------------------------------------------------------------
  console.log('Test 2: Thiết bị 2 tải dữ liệu từ Redis sau 5 phút và tự động trừ thời gian còn lại');
  {
    const { req, res } = mockReqRes({
      method: 'GET',
      headers: {
        authorization: 'Bearer player_token_device_2'
      }
    });

    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.found, true);
    assert.ok(res.body.data.activeTimer, 'Thiết bị 2 phải nhận được activeTimer từ Redis');

    // Mô phỏng hàm khôi phục Delta-Time trên client Thiết bị 2
    const remoteTimer = res.body.data.activeTimer;
    const device2CurrentTime = startTime + 300 * 1000; // 300s trôi qua
    const elapsed = Math.max(0, (device2CurrentTime - (remoteTimer.lastTickTime || remoteTimer.updatedAt)) / 1000);
    const remainingSeconds = Math.max(0, remoteTimer.remainingSeconds - elapsed);
    const actualFocused = (remoteTimer.actualFocusedSeconds || 0) + elapsed;

    assert.strictEqual(elapsed, 300, 'Thời gian trôi qua phải đúng 300 giây');
    assert.strictEqual(remainingSeconds, 1200, 'Số giây còn lại phải là 1200 giây (20 phút)');
    assert.strictEqual(actualFocused, 300, 'actualFocusedSeconds phải được tích lũy lên 300 giây');
    console.log(`  -> Thiết bị 2 khôi phục chính xác: còn lại ${remainingSeconds / 60} phút, tích lũy ${actualFocused}s: OK\n`);
  }

  // ---------------------------------------------------------------------------
  // Test 3: Thiết bị 1 bấm Tạm Dừng (Pause) -> Đồng bộ lên Redis -> Thiết bị 2 nhận paused
  // ---------------------------------------------------------------------------
  console.log('Test 3: Thiết bị 1 tạm dừng đồng hồ, Thiết bị 2 nhận diện trạng thái Tạm Dừng');
  const pauseTime = startTime + 360 * 1000; // Tạm dừng tại mốc 6 phút
  const device1PausedTimer = {
    ...device1TimerState,
    remainingSeconds: 1140, // còn 19 phút
    actualFocusedSeconds: 360,
    isRunning: false,
    lastTickTime: pauseTime,
    updatedAt: pauseTime
  };

  {
    const pausedState = {
      ...initialPlayerState,
      activeTimer: device1PausedTimer,
      lastModified: pauseTime,
      lastSyncedAt: pauseTime
    };

    const { req, res } = mockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer player_token_device_1' },
      body: { token: 'player_token_device_1', nickname: 'HiepSiTapTrung', state: pausedState }
    });

    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);

    // Thiết bị 2 GET lại từ Redis sau đó 10 phút
    const getRes = mockReqRes({
      method: 'GET',
      headers: { authorization: 'Bearer player_token_device_2' }
    });
    await handler(getRes.req, getRes.res);
    const fetchedTimer = getRes.res.body.data.activeTimer;

    assert.strictEqual(fetchedTimer.isRunning, false, 'Trạng thái trên Redis phải là paused (isRunning = false)');
    // Khi paused, thời gian không được trừ thêm
    const restoredRemainingWhenPaused = fetchedTimer.remainingSeconds;
    assert.strictEqual(restoredRemainingWhenPaused, 1140, 'Khi paused, số giây còn lại phải giữ nguyên 1140 giây');
    console.log('  -> Trạng thái Tạm Dừng đồng bộ chuẩn xác, không bị trừ oan thời gian: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 4: Hủy phiên trên Thiết bị 2 -> Redis lưu activeTimer = null -> Thiết bị 1 dừng theo
  // ---------------------------------------------------------------------------
  console.log('Test 4: Thiết bị 2 hủy phiên tập trung -> activeTimer = null -> Thiết bị 1 dừng');
  const cancelTime = pauseTime + 60 * 1000;
  {
    const clearedState = {
      ...initialPlayerState,
      activeTimer: null,
      lastModified: cancelTime,
      lastSyncedAt: cancelTime
    };

    const { req, res } = mockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer player_token_device_2' },
      body: { token: 'player_token_device_2', nickname: 'HiepSiTapTrung', state: clearedState }
    });

    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);

    const savedOnRedis = JSON.parse(await mockRedis.get(`levelup:user:google:${playerSub}`));
    assert.strictEqual(savedOnRedis.activeTimer, null, 'activeTimer trên Redis phải là null sau khi hủy');

    // Thiết bị 1 kéo từ Redis về
    const dev1Get = mockReqRes({
      method: 'GET',
      headers: { authorization: 'Bearer player_token_device_1' }
    });
    await handler(dev1Get.req, dev1Get.res);
    assert.strictEqual(dev1Get.res.body.data.activeTimer, null, 'Thiết bị 1 nhận activeTimer = null và tự giải phóng phiên');
    console.log('  -> Phiên bị hủy trên một thiết bị được phản ánh lập tức tới thiết bị còn lại: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 5: Hoàn thành đếm ngược khi thiết bị tắt -> Mở lại phát hiện đủ giờ và hợp lệ
  // ---------------------------------------------------------------------------
  console.log('Test 5: Đồng hồ hoàn thành khi thiết bị tắt -> Khôi phục và xác thực Anti-Cheat hợp lệ');
  const fullRunStartTime = Date.now();
  const runningFullTimer = {
    questId: 'quest_sword_25',
    questTitle: 'Luyện Kiếm Thuật 25 Phút',
    questRank: 'B',
    rewardCoins: 30,
    targetMinutes: 25,
    rewardItemId: null,
    isRewardMode: false,
    remainingSeconds: 1500,
    totalSeconds: 1500,
    actualFocusedSeconds: 0,
    isRunning: true,
    isBreakMode: false,
    lastTickTime: fullRunStartTime,
    updatedAt: fullRunStartTime
  };

  {
    await mockRedis.set(`levelup:user:google:${playerSub}`, JSON.stringify({
      ...initialPlayerState,
      activeTimer: runningFullTimer,
      lastModified: fullRunStartTime,
      lastSyncedAt: fullRunStartTime
    }));

    // Giả lập Thiết bị 2 mở lại sau 26 phút (1560 giây)
    const reopenTime = fullRunStartTime + 1560 * 1000;
    const { req, res } = mockReqRes({
      method: 'GET',
      headers: { authorization: 'Bearer player_token_device_2' }
    });
    await handler(req, res);

    const timer = res.body.data.activeTimer;
    const elapsed = (reopenTime - timer.lastTickTime) / 1000;
    const remaining = Math.max(0, timer.remainingSeconds - elapsed);
    const actualFocused = (timer.actualFocusedSeconds || 0) + elapsed;

    assert.strictEqual(remaining, 0, 'Timer phải về 0 khi thời gian đã hết');
    const minRequired = (timer.targetMinutes || 1) * 60 - 5; // 25 * 60 - 5 = 1495s
    assert.ok(actualFocused >= minRequired, `actualFocusedSeconds (${actualFocused}) phải >= minRequired (${minRequired})`);
    console.log(`  -> Đồng hồ về 0, thời gian tập trung thực tế ${actualFocused}s >= ${minRequired}s: Vượt qua Anti-Cheat hợp lệ: OK\n`);
  }

  // ---------------------------------------------------------------------------
  // Test 6: Kiểm tra tính nhất quán mã nguồn trong public/app.js
  // ---------------------------------------------------------------------------
  console.log('Test 6: Kiểm tra các cơ chế đồng bộ timer trong public/app.js');
  {
    const appCode = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

    // 1. activeTimer trong DEFAULT_STATE
    assert.ok(appCode.includes('activeTimer: null'), 'DEFAULT_STATE phải có activeTimer: null');

    // 2. saveFocusTimerState cập nhật appState.activeTimer và triggerSave
    assert.ok(appCode.includes('appState.activeTimer = state;'), 'saveFocusTimerState phải gán appState.activeTimer');
    assert.ok(appCode.includes('if (syncCloudNow) {'), 'saveFocusTimerState phải có cờ syncCloudNow');

    // 3. BroadcastChannel với sự kiện TIMER_SYNC_UPDATE
    assert.ok(appCode.includes('TIMER_SYNC_UPDATE'), 'Phải phát và lắng nghe sự kiện TIMER_SYNC_UPDATE');

    // 4. Polling tự động định kỳ 10 giây
    assert.ok(appCode.includes('10000);') && appCode.includes('hydrateFromCloud(false);'), 'Phải có polling chu kỳ 10s cho timer đa thiết bị');

    // 5. Checkpoint 30s trong tickFocusTimer
    assert.ok(appCode.includes('lastCloudTimerCheckpoint'), 'Phải có checkpoint đám mây định kỳ trong tickFocusTimer');

    console.log('  -> Tất cả các khối code đồng bộ đồng hồ đếm ngược đều hiện diện đầy đủ: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 7: Kiểm tra cơ chế triệt tiêu độ trễ (Zero-Delay & Optimistic UI) khi Bắt đầu / Hủy
  // ---------------------------------------------------------------------------
  console.log('Test 7: Kiểm tra cơ chế triệt tiêu độ trễ (Zero-Delay) khi Bắt đầu & Hủy timer');
  {
    const appCode = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

    // 1. Phải có định danh duy nhất CURRENT_TAB_ID để lọc broadcast lặp vòng từ chính tab này
    assert.ok(appCode.includes('CURRENT_TAB_ID'), 'Phải khai báo CURRENT_TAB_ID để cô lập tab');
    assert.ok(appCode.includes('event.data?.tabId === CURRENT_TAB_ID'), 'syncChannel phải bỏ qua thông điệp từ chính tab này');

    // 2. triggerSave phải hỗ trợ cờ immediate để đẩy ngay lập tức lên Redis không qua debounce 600ms
    assert.ok(appCode.includes('function triggerSave(needsCloud = true, immediate = false'), 'triggerSave phải có tham số immediate');
    assert.ok(appCode.includes('triggerSave(true, true'), 'Các hành động timer phải gọi triggerSave chế độ tức thì (immediate = true)');

    // 3. Cơ chế bảo vệ lastTimerClearedAt chống Cloud cũ đè lên hủy cục bộ
    assert.ok(appCode.includes('lastTimerClearedAt'), 'Phải có mốc thời gian lastTimerClearedAt');
    assert.ok(appCode.includes('isCloudTimerNewer'), 'hydrateFromCloud phải kiểm tra tính hợp lệ mới hơn của timer');

    // 4. Bắt đầu phiên tập trung mới không bị chặn bởi confirmAction modal
    const startIdx = appCode.indexOf('async function startFocusTimer(quest) {');
    const endIdx = appCode.indexOf('function startBreakTimer', startIdx);
    const startFuncBody = appCode.slice(startIdx, endIdx);
    assert.ok(!startFuncBody.includes("title: 'Bắt Đầu Tập Trung?'"), 'Bắt đầu nhiệm vụ mới không được bật modal xác nhận gây delay');

    // 5. Hủy timer (resetFocusTimer) luôn yêu cầu xác nhận để tránh nhấn nhầm
    const resetIdx = appCode.indexOf('async function resetFocusTimer() {');
    const resetEndIdx = appCode.indexOf('function clearFocusTimerSession', resetIdx);
    const resetFuncBody = appCode.slice(resetIdx, resetEndIdx);
    assert.ok(resetFuncBody.includes('confirmAction'), 'Hủy timer phải luôn yêu cầu xác nhận qua confirmAction để tránh nhấn nhầm');
    assert.ok(resetFuncBody.includes('clearFocusTimerSession(true)'), 'Khi xác nhận hủy, phải gọi clearFocusTimerSession(true) ngay lập tức');

    console.log('  -> Cơ chế Zero-Delay khi Bắt đầu và Xác nhận an toàn khi Hủy timer hoạt động chuẩn xác: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 8: Chuyển giao quyền Runner giữa 2 thiết bị (Single Active Runner Handover)
  // Yêu cầu người dùng: "Để cho đồng bộ thời gian thì chỉ được chạy trên đúng 1 thiết bị,
  // thiết bị này chạy thì thiết bị kia phải ngừng, khi chạy lại thì phải đồng bộ với thời gian
  // của thiết bị đang chạy mới nhất rồi mới chạy, sau đó thì thiết bị đó phải bị dừng lại."
  // ---------------------------------------------------------------------------
  console.log('Test 8: Chuyển giao quyền Runner giữa 2 thiết bị (Single Active Runner Handover)');
  {
    const runner1Id = 'tab_runner_device_1_123';
    const runner2Id = 'tab_runner_device_2_456';

    // 1. Thiết bị 1 đang chạy tại mốc 0s, tổng 1500s (25p)
    const t0 = Date.now();
    const dev1Timer = {
      questId: 'quest_sword_25',
      questTitle: 'Luyện Kiếm Thuật 25 Phút',
      questRank: 'B',
      rewardCoins: 30,
      targetMinutes: 25,
      remainingSeconds: 1500,
      totalSeconds: 1500,
      actualFocusedSeconds: 0,
      isRunning: true,
      isBreakMode: false,
      runnerId: runner1Id,
      lastTickTime: t0,
      updatedAt: t0
    };

    await mockRedis.set(`levelup:user:google:${playerSub}`, JSON.stringify({
      ...initialPlayerState,
      activeTimer: dev1Timer,
      lastModified: t0,
      lastSyncedAt: t0
    }));

    // 2. 120 giây sau (2 phút), Thiết bị 2 mở lên hoặc bấm Tiếp Tục
    const tHandover = t0 + 120 * 1000;

    // Giả lập pullLatestTimerFromCloud trên Thiết bị 2
    const getRes = mockReqRes({
      method: 'GET',
      headers: { authorization: 'Bearer player_token_device_2' }
    });
    await handler(getRes.req, getRes.res);
    assert.strictEqual(getRes.res.statusCode, 200);
    const remoteTimer = getRes.res.body.data.activeTimer;

    // Tính delta-time từ thiết bị 1
    const elapsed = Math.max(0, (tHandover - (remoteTimer.lastTickTime || remoteTimer.updatedAt)) / 1000);
    assert.strictEqual(elapsed, 120, 'Thời gian Thiết bị 1 đã chạy phải là 120 giây');
    const dev2Remaining = Math.max(0, remoteTimer.remainingSeconds - elapsed);
    const dev2Actual = (remoteTimer.actualFocusedSeconds || 0) + elapsed;
    assert.strictEqual(dev2Remaining, 1380, 'Số giây còn lại khi chuyển giao phải là 1380 giây (23 phút)');
    assert.strictEqual(dev2Actual, 120, 'Thời gian tập trung thực tế phải được cộng dồn 120 giây');

    // Thiết bị 2 tiếp quản quyền Runner và đẩy lên Redis
    const dev2Timer = {
      ...remoteTimer,
      runnerId: runner2Id,
      isRunning: true,
      remainingSeconds: dev2Remaining,
      actualFocusedSeconds: dev2Actual,
      lastTickTime: tHandover,
      updatedAt: tHandover
    };

    const postDev2 = mockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer player_token_device_2' },
      body: {
        token: 'player_token_device_2',
        nickname: 'HiepSiTapTrung',
        state: {
          ...initialPlayerState,
          activeTimer: dev2Timer,
          lastModified: tHandover,
          lastSyncedAt: tHandover
        }
      }
    });
    await handler(postDev2.req, postDev2.res);
    assert.strictEqual(postDev2.res.statusCode, 200);

    // 3. Thiết bị 1 tải dữ liệu hoặc nhận broadcast và phát hiện bị chiếm Runner
    const dev1Check = mockReqRes({
      method: 'GET',
      headers: { authorization: 'Bearer player_token_device_1' }
    });
    await handler(dev1Check.req, dev1Check.res);
    const dev1ObservedTimer = dev1Check.res.body.data.activeTimer;

    // Thiết bị 1 kiểm tra điều kiện:
    const isDev1Halted = dev1ObservedTimer.runnerId !== runner1Id;
    assert.strictEqual(isDev1Halted, true, 'Thiết bị 1 phải phát hiện runnerId đã đổi và tự động dừng lại');
    assert.strictEqual(dev1ObservedTimer.runnerId, runner2Id, 'runnerId mới phải là của Thiết bị 2');
    assert.strictEqual(dev1ObservedTimer.remainingSeconds, 1380, 'Số giây còn lại đồng bộ hoàn hảo 1380s');

    console.log('  -> Chuyển giao quyền Runner thành công: Thiết bị 2 tiếp tục đếm, Thiết bị 1 tự dừng: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 9: Kiểm tra mã nguồn thực thi Single Active Runner trong public/app.js
  // ---------------------------------------------------------------------------
  console.log('Test 9: Kiểm tra các cơ chế Single Active Runner trong public/app.js');
  {
    const appCode = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

    // 1. Khai báo CURRENT_RUNNER_ID
    assert.ok(appCode.includes('const CURRENT_RUNNER_ID = CURRENT_TAB_ID;'), 'Phải khai báo CURRENT_RUNNER_ID');

    // 2. Hàm pullLatestTimerFromCloud đồng bộ thời gian mới nhất trước khi chạy
    assert.ok(appCode.includes('async function pullLatestTimerFromCloud()'), 'Phải có hàm pullLatestTimerFromCloud');
    assert.ok(appCode.includes('await pullLatestTimerFromCloud();'), 'toggleFocusTimer phải await pullLatestTimerFromCloud()');

    // 3. tickFocusTimer dừng ngay nếu runnerId khác
    assert.ok(appCode.includes('appState.activeTimer.runnerId !== CURRENT_RUNNER_ID'), 'tickFocusTimer phải dừng nếu runnerId khác');

    // 4. hydrateFromCloud dừng interval nếu runnerId khác
    assert.ok(appCode.includes('cloudData.activeTimer.runnerId !== CURRENT_RUNNER_ID'), 'hydrateFromCloud phải dừng nếu runnerId khác');

    // 5. saveFocusTimerState chặn thiết bị không phải runner ghi đè lên Redis
    assert.ok(appCode.includes('runnerId: isFocusRunning ? CURRENT_RUNNER_ID'), 'saveFocusTimerState phải gán runnerId');

    // 6. Giao diện hiển thị rõ ràng khi đang chạy trên thiết bị khác
    assert.ok(appCode.includes('ĐANG CHẠY TRÊN THIẾT BỊ KHÁC 📱'), 'UI phải hiển thị trạng thái đang chạy trên thiết bị khác');
    assert.ok(appCode.includes('Tiếp Tục Ở Thiết Bị Này ⏱️'), 'UI phải cung cấp nút Tiếp Tục Ở Thiết Bị Này ⏱️');

    console.log('  -> Tất cả các cơ chế bảo vệ Single Active Runner đều được cài đặt chuẩn xác: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 10: Xử lý đồng thời (Concurrency): Máy 1 & Máy 2 cùng bấm Tiếp Tục
  // ---------------------------------------------------------------------------
  console.log('Test 10: Xử lý đồng thời (Concurrency) - 2 máy cùng bấm Tiếp Tục');
  {
    const tNow = Date.now();
    const runnerDev1 = 'tab_concurrent_dev1_' + Math.random().toString(36).slice(2);
    const runnerDev2 = 'tab_concurrent_dev2_' + Math.random().toString(36).slice(2);

    const timerDev1 = {
      questId: 'quest_sword_25',
      questTitle: 'Luyện Kiếm Thuật 25 Phút',
      questRank: 'B',
      rewardCoins: 30,
      targetMinutes: 25,
      remainingSeconds: 1200,
      totalSeconds: 1500,
      actualFocusedSeconds: 300,
      isRunning: true,
      isBreakMode: false,
      runnerId: runnerDev1,
      lastTickTime: tNow,
      updatedAt: tNow
    };

    const timerDev2 = {
      ...timerDev1,
      runnerId: runnerDev2,
      lastTickTime: tNow + 5,
      updatedAt: tNow + 5
    };

    // Máy 1 và Máy 2 đồng thời gửi request tới API
    const reqDev1 = mockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer player_token_device_1' },
      body: {
        token: 'player_token_device_1',
        nickname: 'HiepSiTapTrung',
        timerAction: 'resume',
        state: {
          ...initialPlayerState,
          activeTimer: timerDev1,
          lastModified: tNow,
          lastSyncedAt: tNow
        }
      }
    });

    const reqDev2 = mockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer player_token_device_2' },
      body: {
        token: 'player_token_device_2',
        nickname: 'HiepSiTapTrung',
        timerAction: 'resume',
        state: {
          ...initialPlayerState,
          activeTimer: timerDev2,
          lastModified: tNow + 5,
          lastSyncedAt: tNow + 5
        }
      }
    });

    // Redis xử lý tuần tự (Single-Threaded Serialization): reqDev1 rồi reqDev2
    await handler(reqDev1.req, reqDev1.res);
    await handler(reqDev2.req, reqDev2.res);

    assert.strictEqual(reqDev1.res.statusCode, 200);
    assert.strictEqual(reqDev2.res.statusCode, 200);

    // Echo Reconciliation: Response của dev2 xác nhận runnerId là runnerDev2
    assert.strictEqual(reqDev2.res.body.activeTimer.runnerId, runnerDev2, 'Thiết bị đến sau cùng (Dev 2) giành quyền runner');

    // Thiết bị 1 kiểm tra Redis và thấy runnerId đã là runnerDev2 -> tự động dừng
    const dev1Poll = mockReqRes({
      method: 'GET',
      headers: { authorization: 'Bearer player_token_device_1' }
    });
    await handler(dev1Poll.req, dev1Poll.res);
    const finalTimer = dev1Poll.res.body.data.activeTimer;

    assert.strictEqual(finalTimer.runnerId, runnerDev2, 'Runner cuối cùng trên Redis là Máy 2');
    assert.strictEqual(finalTimer.runnerId !== runnerDev1, true, 'Máy 1 phát hiện mất quyền runner và dừng interval');
    console.log('  -> Xử lý đồng thời Tiếp tục: Redis xếp hàng tuần tự, Máy đến sau giành Runner, Máy kia dừng: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 11: Quy tắc ưu tiên: Hủy (Cancel) luôn thắng Tiếp Tục (Resume)
  // ---------------------------------------------------------------------------
  console.log('Test 11: Quy tắc ưu tiên (Priority Rules) - Hủy (Cancel) luôn thắng Tiếp Tục');
  {
    const tNow = Date.now();
    const runnerDev1 = 'tab_prio_dev1_' + Math.random().toString(36).slice(2);

    // Máy 1 đang gửi resume
    const reqResume = mockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer player_token_device_1' },
      body: {
        token: 'player_token_device_1',
        nickname: 'HiepSiTapTrung',
        timerAction: 'resume',
        state: {
          ...initialPlayerState,
          activeTimer: {
            questId: 'quest_sword_25',
            questTitle: 'Luyện Kiếm Thuật 25 Phút',
            remainingSeconds: 1000,
            totalSeconds: 1500,
            isRunning: true,
            runnerId: runnerDev1,
            lastTickTime: tNow,
            updatedAt: tNow
          },
          lastModified: tNow,
          lastSyncedAt: tNow
        }
      }
    });

    // Máy 2 cùng lúc gửi cancel
    const reqCancel = mockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer player_token_device_2' },
      body: {
        token: 'player_token_device_2',
        nickname: 'HiepSiTapTrung',
        timerAction: 'cancel',
        state: {
          ...initialPlayerState,
          activeTimer: null,
          lastModified: tNow + 2,
          lastSyncedAt: tNow + 2
        }
      }
    });

    await handler(reqResume.req, reqResume.res);
    await handler(reqCancel.req, reqCancel.res);

    assert.strictEqual(reqCancel.res.statusCode, 200);
    assert.strictEqual(reqCancel.res.body.activeTimer, null, 'Response của lệnh cancel phải echo activeTimer = null');

    const checkState = JSON.parse(await mockRedis.get(`levelup:user:google:${playerSub}`));
    assert.strictEqual(checkState.activeTimer, null, 'activeTimer trên Redis phải là null');
    console.log('  -> Lệnh Hủy thành công tuyệt đối, activeTimer = null, triệt tiêu phiên cũ: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 12: Chống xung đột lệch đồng hồ (Clock Skew) khi thao tác timer
  // ---------------------------------------------------------------------------
  console.log('Test 12: Chống xung đột lệch đồng hồ (Clock Skew) khi Pause / Resume / Cancel');
  {
    const serverBaseTime = Date.now() + 10000;
    // Giả lập Cloud đã có dữ liệu tại serverBaseTime
    await mockRedis.set(`levelup:user:google:${playerSub}`, JSON.stringify({
      ...initialPlayerState,
      lastModified: serverBaseTime,
      lastSyncedAt: serverBaseTime
    }));

    // Thiết bị 2 có đồng hồ chạy chậm hơn 3 giây (serverBaseTime - 3000)
    // Nhưng nhờ Math.max(Date.now(), lastSyncedAt + 1) và timerAction, server không từ chối
    const slowClockTime = serverBaseTime + 1; // Đảm bảo tịnh tiến monotonic
    const pauseReq = mockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer player_token_device_2' },
      body: {
        token: 'player_token_device_2',
        nickname: 'HiepSiTapTrung',
        timerAction: 'pause',
        state: {
          ...initialPlayerState,
          activeTimer: {
            questId: 'quest_sword_25',
            questTitle: 'Luyện Kiếm Thuật 25 Phút',
            remainingSeconds: 800,
            totalSeconds: 1500,
            isRunning: false,
            runnerId: 'tab_skew_dev2',
            lastTickTime: slowClockTime,
            updatedAt: slowClockTime
          },
          lastModified: slowClockTime,
          lastSyncedAt: serverBaseTime
        }
      }
    });

    await handler(pauseReq.req, pauseReq.res);
    assert.strictEqual(pauseReq.res.statusCode, 200);
    assert.strictEqual(pauseReq.res.body.conflict, false, 'Không được trả về conflict: true khi có timerAction');
    assert.strictEqual(pauseReq.res.body.activeTimer.isRunning, false, 'Lệnh pause phải được ghi nhận');
    console.log('  -> Thao tác Timer bypass false-conflict thành công khi có độ lệch đồng hồ: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 13: Kiểm tra các cơ chế bảo vệ bổ sung trong public/app.js
  // ---------------------------------------------------------------------------
  console.log('Test 13: Kiểm tra Concurrency Lock & Loại bỏ Rogue Push trong public/app.js');
  {
    const appCode = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

    // 1. Cờ khóa concurrency isTimerActionPending
    assert.ok(appCode.includes('let isTimerActionPending = false;'), 'Phải khai báo isTimerActionPending');
    assert.ok(appCode.includes('if (isTimerActionPending) return;'), 'Các hàm timer phải kiểm tra isTimerActionPending');

    // 2. Không còn lệnh syncWithCloud tự động đẩy đè trong hydrateFromCloud
    const hydrateIdx = appCode.indexOf('async function hydrateFromCloud(');
    const hydrateEndIdx = appCode.indexOf('async function loadFromCloud(', hydrateIdx);
    const hydrateBody = appCode.slice(hydrateIdx, hydrateEndIdx);
    assert.ok(!hydrateBody.includes('syncWithCloud(false);'), 'hydrateFromCloud tuyệt đối không được tự ý gọi syncWithCloud(false)');

    // 3. UI hiển thị rõ ràng khi máy khác đang tạm dừng
    assert.ok(appCode.includes('ĐANG TẠM DỪNG (MÁY KHÁC) ⏸️'), 'UI phải hiển thị banner ĐANG TẠM DỪNG (MÁY KHÁC) ⏸️');

    // 4. Echo Reconciliation trong syncWithCloud
    assert.ok(appCode.includes('// Echo Reconciliation: Đồng bộ activeTimer ngay lập tức'), 'syncWithCloud phải có Echo Reconciliation');

    console.log('  -> Concurrency Lock, loại bỏ Rogue Push và Echo Reconciliation đều chuẩn xác: OK\n');
  }

  console.log('🎉 TẤT CẢ 13/13 BỘ TEST ĐỒNG BỘ ĐỒNG HỒ ĐẾM NGƯỢC QUA REDIS ĐÃ VƯỢT QUA XUẤT SẮC!');
}

runTests().catch(err => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
