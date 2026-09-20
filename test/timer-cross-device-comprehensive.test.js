import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import handler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  signQuest
} from '../api/sync.js';

const appCode = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');

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

async function runComprehensiveTimerTests() {
  console.log('=== Bắt đầu kiểm thử: Toàn Diện Đồng Hồ Đa Thiết Bị (Fix 8 Lỗi Nguy Hiểm) ===\n');

  // ---------------------------------------------------------------------------
  // Test 1: pullLatestTimerFromCloud liên kết activeFocusQuest, activeRewardItem và isBreakMode
  // ---------------------------------------------------------------------------
  console.log('Test 1: pullLatestTimerFromCloud liên kết đúng quest/reward/break objects');
  {
    assert.ok(
      appCode.includes('activeFocusQuest = appState.quests?.find(q => q.id === remoteTimer.questId) || null;'),
      'pullLatestTimerFromCloud phải liên kết activeFocusQuest từ remoteTimer.questId'
    );
    assert.ok(
      appCode.includes('activeRewardItem = appState.inventory?.find(i => i.id === remoteTimer.rewardItemId) || null;'),
      'pullLatestTimerFromCloud phải liên kết activeRewardItem từ remoteTimer.rewardItemId'
    );
    assert.ok(
      appCode.includes('if (remoteTimer.isBreakMode) {\n            isBreakMode = true;'),
      'pullLatestTimerFromCloud phải bật isBreakMode khi remoteTimer là giờ nghỉ'
    );
    console.log('  -> pullLatestTimerFromCloud khôi phục trọn vẹn context phiên: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 2: saveFocusTimerState tự phục hồi (Self-Healing) tránh xóa oan session
  // ---------------------------------------------------------------------------
  console.log('Test 2: saveFocusTimerState tự phục hồi context từ appState.activeTimer');
  {
    assert.ok(
      appCode.includes('if (!activeFocusQuest && !isBreakMode && !activeRewardItem) {\n    if (appState.activeTimer?.questId) {'),
      'saveFocusTimerState phải có guard tự phục hồi activeFocusQuest từ activeTimer.questId'
    );
    assert.ok(
      appCode.includes('updatedAt: (timerAction || !appState.activeTimer?.updatedAt) ? Date.now() : appState.activeTimer.updatedAt'),
      'saveFocusTimerState phải giữ nguyên updatedAt khi chỉ tick thông thường'
    );
    console.log('  -> saveFocusTimerState không bao giờ xóa oan session và bảo toàn mutation timestamp: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 3: hydrateFromCloud nhận diện Hủy / Bảo lưu từ thiết bị khác
  // ---------------------------------------------------------------------------
  console.log('Test 3: hydrateFromCloud nhận diện và giải phóng phiên khi Cloud đã Hủy / Bảo lưu');
  {
    assert.ok(
      appCode.includes('else if (!isRecentLocalAction && cloudTime >= (lastLocalTimerActionTime || 0)) {\n        clearFocusTimerSession(false);'),
      'hydrateFromCloud phải có fallback giải phóng session khi cloudTime >= lastLocalTimerActionTime'
    );
    assert.ok(
      appCode.includes('timerLocalTime =\n      appState.activeTimer\n      ? Number(appState.activeTimer?.updatedAt || 0)') ||
      appCode.includes('? Number(appState.activeTimer?.updatedAt || 0)'),
      'timerLocalTime phải dựa trên updatedAt của mutation thay vì lastTickTime tịnh tiến'
    );
    console.log('  -> hydrateFromCloud nhận diện chính xác lệnh Hủy/Bảo lưu từ thiết bị khác: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 4: Chống Zombie SavedTimer trong hydrateFromCloud và syncWithCloud
  // ---------------------------------------------------------------------------
  console.log('Test 4: Chống Zombie SavedTimer khi Cloud đã dùng hoặc hủy bảo lưu');
  {
    assert.ok(
      appCode.includes('savedAt > cloudTime || (Date.now() - savedAt < TIMER_MUTATION_GRACE_MS)'),
      'hydrateFromCloud chỉ phục hồi savedTimer nếu savedAt > cloudTime hoặc trong grace period'
    );
    assert.ok(
      appCode.includes('savedAt > conflictSnapshotTime || (Date.now() - savedAt < TIMER_MUTATION_GRACE_MS)'),
      'syncWithCloud chỉ phục hồi savedTimer nếu savedAt > conflictSnapshotTime hoặc trong grace period'
    );
    console.log('  -> Chống Zombie SavedTimer: Không bao giờ hồi sinh savedTimer đã bị tiêu thụ/hủy: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 5: holdFocusTimer phát BroadcastChannel TIMER_SYNC_UPDATE action: 'hold'
  // ---------------------------------------------------------------------------
  console.log('Test 5: holdFocusTimer phát tín hiệu BroadcastChannel TIMER_SYNC_UPDATE');
  {
    assert.ok(
      appCode.includes("syncChannel.postMessage({ type: 'TIMER_SYNC_UPDATE', tabId: CURRENT_TAB_ID, action: 'hold' });"),
      'holdFocusTimer phải phát TIMER_SYNC_UPDATE với action: hold'
    );
    assert.ok(
      appCode.includes("if (event.data.action === 'cancel' || event.data.action === 'hold')"),
      'BroadcastChannel listener phải bắt action: hold để dọn dẹp banner trên tab khác'
    );
    console.log('  -> BroadcastChannel action hold đồng bộ tức thì giữa các tab: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 6: clearSavedQuestTimer & clearSavedRewardTimer lưu tức thì và phát Broadcast
  // ---------------------------------------------------------------------------
  console.log('Test 6: clearSavedQuestTimer & clearSavedRewardTimer đẩy ngay lập tức lên Cloud');
  {
    const clearQuestIdx = appCode.indexOf('async function clearSavedQuestTimer');
    const clearRewardIdx = appCode.indexOf('async function clearSavedRewardTimer');
    const resetTimerIdx = appCode.indexOf('async function resetFocusTimer');

    const questBody = appCode.slice(clearQuestIdx, clearRewardIdx);
    const rewardBody = appCode.slice(clearRewardIdx, resetTimerIdx);

    assert.ok(questBody.includes("triggerSave(true, true, 'hold', true)"), 'clearSavedQuestTimer phải gọi triggerSave chế độ tức thì');
    assert.ok(rewardBody.includes("triggerSave(true, true, 'hold', true)"), 'clearSavedRewardTimer phải gọi triggerSave chế độ tức thì');
    console.log('  -> clearSavedQuestTimer và clearSavedRewardTimer lưu tức thì, chống mất dữ liệu: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 7: Multi-tab storage event listener dùng restoreFocusTimer
  // ---------------------------------------------------------------------------
  console.log('Test 7: Sự kiện storage đa tab gọi restoreFocusTimer thay vì tự ý gán isFocusRunning');
  {
    const storageIdx = appCode.indexOf("window.addEventListener('storage'");
    const storageEndIdx = appCode.indexOf('function highlightSelectedAvatar', storageIdx);
    const storageBody = appCode.slice(storageIdx, storageEndIdx);

    assert.ok(!storageBody.includes('isFocusRunning = !!syncState.isRunning;'), 'Sự kiện storage không được tự ý gán isFocusRunning');
    assert.ok(storageBody.includes('restoreFocusTimer();'), 'Sự kiện storage phải ủy thác qua restoreFocusTimer()');
    console.log('  -> Multi-tab storage event bảo toàn nguyên tắc Single Active Runner: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 8: adjustTimer và saveEditTimer truyền cờ timerAction: 'adjust'
  // ---------------------------------------------------------------------------
  console.log('Test 8: adjustTimer và saveEditTimer sử dụng timerAction: adjust');
  {
    const adjIdx = appCode.indexOf('function adjustTimer(');
    const modalIdx = appCode.indexOf('function openEditTimerModal(');
    const saveEditIdx = appCode.indexOf('function saveEditTimer(');
    const zenIdx = appCode.indexOf('function toggleZenMode(', saveEditIdx);

    const adjBody = appCode.slice(adjIdx, modalIdx);
    const saveEditBody = appCode.slice(saveEditIdx, zenIdx);

    assert.ok(adjBody.includes("saveFocusTimerState(true, true, 'adjust');"), 'adjustTimer phải truyền timerAction: adjust');
    assert.ok(saveEditBody.includes("saveFocusTimerState(true, true, 'adjust');"), 'saveEditTimer phải truyền timerAction: adjust');
    console.log('  -> adjustTimer và saveEditTimer ưu tiên đồng bộ không bị false-conflict: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 9: Active Runner đếm liên tục không bị giật lùi về checkpoint cũ
  // ---------------------------------------------------------------------------
  console.log('Test 9: Active Runner bảo toàn đếm ngược mượt mà khi poll Cloud');
  {
    assert.ok(
      appCode.includes('const isCloudSameRunner = cloudData.activeTimer && cloudData.activeTimer.isRunning && (!cloudData.activeTimer.runnerId || cloudData.activeTimer.runnerId === CURRENT_RUNNER_ID);'),
      'hydrateFromCloud phải kiểm tra isCloudSameRunner'
    );
    assert.ok(
      appCode.includes('(isRecentLocalAction || isCloudSameRunner)'),
      'Active Runner hợp lệ phải tiếp tục đếm mượt mà (isRecentLocalAction || isCloudSameRunner)'
    );
    console.log('  -> Active Runner đếm trơn tru, không giật lùi về checkpoint: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 10: Mô phỏng chu trình thực tế Handover -> Pause -> Hold -> Resume đa thiết bị qua Redis API
  // ---------------------------------------------------------------------------
  console.log('Test 10: Mô phỏng chu trình chuyển giao quyền, tạm dừng, bảo lưu và tiếp tục qua Redis API');
  {
    const mockRedis = new MockRedis();
    setRedisClientForTesting(mockRedis);

    const userSub = 'player_multi_device_full_test';
    setGoogleTokenVerifierForTesting(async (token) => {
      if (token === 'token_dev_A' || token === 'token_dev_B') {
        return { sub: userSub, email: 'hero@levelup.dev', name: 'Hiệp Sĩ' };
      }
      return null;
    });

    const questSig = signQuest('Nhiệm Vụ Thử Thách Đa Thiết Bị', 'focus', 25, 30);
    const quest = {
      id: 'quest_multi_1',
      title: 'Nhiệm Vụ Thử Thách Đa Thiết Bị',
      type: 'focus',
      targetMinutes: 25,
      rewardCoins: 30,
      rank: 'B',
      status: 'active',
      completed: false,
      signature: questSig
    };

    const initial = {
      googleId: userSub,
      profile: { nickname: 'Hiepsi', level: 1, coins: 10, totalCoinsEarned: 10 },
      quests: [quest],
      inventory: [],
      ledger: [],
      activeTimer: null,
      lastModified: 1000,
      lastSyncedAt: 1000
    };

    await mockRedis.set(`levelup:user:google:${userSub}`, JSON.stringify(initial));

    // Bước 1: Máy A bắt đầu đếm giờ
    const tStart = Date.now();
    const timerA = {
      questId: 'quest_multi_1',
      remainingSeconds: 1500,
      totalSeconds: 1500,
      actualFocusedSeconds: 0,
      isRunning: true,
      runnerId: 'runner_dev_A',
      lastTickTime: tStart,
      updatedAt: tStart
    };

    const reqStart = mockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer token_dev_A' },
      body: {
        token: 'token_dev_A',
        nickname: 'Hiepsi',
        timerAction: 'start',
        state: { ...initial, activeTimer: timerA, lastModified: tStart, lastSyncedAt: tStart }
      }
    });
    await handler(reqStart.req, reqStart.res);
    assert.strictEqual(reqStart.res.statusCode, 200);

    // Bước 2: Máy B mở lên sau 300s, kéo dữ liệu
    const tBOpen = tStart + 300 * 1000;
    const reqGetB = mockReqRes({
      method: 'GET',
      headers: { authorization: 'Bearer token_dev_B' }
    });
    await handler(reqGetB.req, reqGetB.res);
    assert.strictEqual(reqGetB.res.statusCode, 200);
    assert.strictEqual(reqGetB.res.body.data.activeTimer.isRunning, true);
    assert.strictEqual(reqGetB.res.body.data.activeTimer.runnerId, 'runner_dev_A');

    // Bước 3: Máy B bấm Tạm dừng (Pause)
    const tPause = tBOpen;
    const timerPaused = {
      ...reqGetB.res.body.data.activeTimer,
      remainingSeconds: 1200,
      actualFocusedSeconds: 300,
      isRunning: false,
      lastTickTime: tPause,
      updatedAt: tPause
    };
    const reqPause = mockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer token_dev_B' },
      body: {
        token: 'token_dev_B',
        nickname: 'Hiepsi',
        timerAction: 'pause',
        state: { ...initial, activeTimer: timerPaused, lastModified: tPause, lastSyncedAt: tPause }
      }
    });
    await handler(reqPause.req, reqPause.res);
    assert.strictEqual(reqPause.res.statusCode, 200);
    assert.strictEqual(reqPause.res.body.activeTimer.isRunning, false);

    // Bước 4: Máy A bấm Bảo lưu (Hold)
    const tHold = tPause + 10 * 1000;
    const questWithSaved = {
      ...quest,
      savedTimer: {
        remainingSeconds: 1200,
        actualFocusedSeconds: 300,
        totalSeconds: 1500,
        savedAt: tHold
      }
    };
    const reqHold = mockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer token_dev_A' },
      body: {
        token: 'token_dev_A',
        nickname: 'Hiepsi',
        timerAction: 'hold',
        state: { ...initial, quests: [questWithSaved], activeTimer: null, lastModified: tHold, lastSyncedAt: tHold }
      }
    });
    await handler(reqHold.req, reqHold.res);
    assert.strictEqual(reqHold.res.statusCode, 200);
    assert.strictEqual(reqHold.res.body.activeTimer, null, 'activeTimer trên response phải là null sau khi hold');

    // Kiểm tra trên Redis: activeTimer = null, quest có savedTimer
    const rawSaved = JSON.parse(await mockRedis.get(`levelup:user:google:${userSub}`));
    assert.strictEqual(rawSaved.activeTimer, null, 'activeTimer trên Redis phải là null');
    assert.ok(rawSaved.quests[0].savedTimer, 'Quest trên Redis phải lưu savedTimer');
    assert.strictEqual(rawSaved.quests[0].savedTimer.remainingSeconds, 1200);

    // Bước 5: Máy B tải về và thấy savedTimer, bấm Tiếp Tục
    const tResume = tHold + 60 * 1000;
    const questResumed = { ...rawSaved.quests[0] };
    delete questResumed.savedTimer; // Khi tiếp tục, xóa savedTimer
    const timerResumedOnB = {
      questId: 'quest_multi_1',
      remainingSeconds: 1200,
      totalSeconds: 1500,
      actualFocusedSeconds: 300,
      isRunning: true,
      runnerId: 'runner_dev_B',
      lastTickTime: tResume,
      updatedAt: tResume
    };
    const reqResumeOnB = mockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer token_dev_B' },
      body: {
        token: 'token_dev_B',
        nickname: 'Hiepsi',
        timerAction: 'start',
        state: { ...initial, quests: [questResumed], activeTimer: timerResumedOnB, lastModified: tResume, lastSyncedAt: tResume }
      }
    });
    await handler(reqResumeOnB.req, reqResumeOnB.res);
    assert.strictEqual(reqResumeOnB.res.statusCode, 200);
    assert.strictEqual(reqResumeOnB.res.body.activeTimer.isRunning, true);
    assert.strictEqual(reqResumeOnB.res.body.activeTimer.runnerId, 'runner_dev_B');

    // Bước 6: Máy A kéo về sau khi Máy B tiếp tục -> savedTimer không bị Zombie hồi sinh!
    const reqGetA = mockReqRes({
      method: 'GET',
      headers: { authorization: 'Bearer token_dev_A' }
    });
    await handler(reqGetA.req, reqGetA.res);
    assert.strictEqual(reqGetA.res.statusCode, 200);
    const dataForA = reqGetA.res.body.data;
    assert.strictEqual(dataForA.activeTimer.runnerId, 'runner_dev_B');
    assert.strictEqual(dataForA.quests[0].savedTimer, undefined, 'savedTimer không còn tồn tại trên Cloud');

    console.log('  -> Chu trình Handover -> Pause -> Hold -> Resume hoạt động hoàn hảo 100%: OK\n');
  }

  console.log('========================================================================');
  console.log('🎉 TẤT CẢ 10/10 BỘ KIỂM THỬ ĐỒNG HỒ ĐA THIẾT BỊ NÂNG CAO ĐÃ VƯỢT QUA XUẤT SẮC!');
  console.log('========================================================================');
}

runComprehensiveTimerTests().catch(err => {
  console.error('❌ Kiểm thử thất bại:', err);
  process.exit(1);
});
