import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import handler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  deriveLegitimateBalance,
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
  console.log('=== Bắt đầu kiểm thử Đồng Bộ Admin Dashboard với Redis & Các Trang Khác ===\n');

  const mockRedis = new MockRedis();
  setRedisClientForTesting(mockRedis);

  // Setup Admin auth
  process.env.ADMIN_TOKEN = 'secret_admin_token_xyz';
  process.env.ADMIN_NICKS = 'admin,guildmaster,khoitran';
  process.env.ADMIN_EMAILS = 'admin@levelup.dev';

  setGoogleTokenVerifierForTesting(async (token) => {
    if (token === 'admin_google_token') {
      return {
        sub: 'admin_sub_999',
        email: 'admin@levelup.dev',
        name: 'Guild Master'
      };
    }
    if (token === 'player_token_123') {
      return {
        sub: 'player_sub_123',
        email: 'player@example.com',
        name: 'Hiệp Sĩ Quả Cảm'
      };
    }
    return null;
  });

  const q1Sig = signQuest('Nhiệm vụ 1', 'focus', 25, 30);
  const q2Sig = signQuest('Nhiệm vụ 2', 'focus', 25, 20);

  // Setup initial player state in Redis
  const initialPlayerSub = 'player_sub_123';
  const initialPlayerState = {
    googleId: initialPlayerSub,
    profile: {
      nickname: 'HiepSiQuaCam',
      avatar: '🛡️',
      level: 2,
      exp: 10,
      coins: 50,
      totalCoinsEarned: 50,
      title: 'Tân Binh Cấp 2',
      role: 'user'
    },
    quests: [
      { id: 'q1', title: 'Nhiệm vụ 1', type: 'focus', targetMinutes: 25, rewardCoins: 30, completed: true, signature: q1Sig }
    ],
    inventory: [],
    ledger: [
      { id: 'l1', type: 'earn', amount: 30, title: 'Nhiệm vụ 1', timestamp: Date.now() - 10000 }
    ],
    lastModified: 1000,
    lastSyncedAt: 1000
  };
  await mockRedis.set(`levelup:user:google:${initialPlayerSub}`, JSON.stringify(initialPlayerState));
  await mockRedis.set(`levelup:nick_to_sub:hiepsiquacam`, initialPlayerSub);
  await mockRedis.sadd('levelup:all_users', initialPlayerSub);
  await mockRedis.zadd('levelup:leaderboard', 2050, initialPlayerSub);

  // ---------------------------------------------------------------------------
  // Test 1: Admin cập nhật Level = 15, Vàng = 5000 qua admin_update_user
  // ---------------------------------------------------------------------------
  console.log('Test 1: Admin cập nhật Level 15, Vàng 5,000 từ Dashboard vào Redis');
  {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'admin_update_user' },
      headers: {
        authorization: 'Bearer secret_admin_token_xyz'
      },
      body: {
        targetSub: initialPlayerSub,
        coins: 5000,
        level: 15,
        exp: 250,
        isCheater: false,
        reason: 'Thưởng sự kiện hiệp sĩ xuất sắc'
      }
    });

    await handler(req, res);
    assert.strictEqual(res.statusCode, 200, `Admin update failed with status ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.profile.coins, 5000);
    assert.strictEqual(res.body.profile.level, 15);
    assert.strictEqual(res.body.profile.adminAdjusted, true);

    // Kiểm tra trực tiếp dữ liệu được lưu trên Redis
    const savedRaw = await mockRedis.get(`levelup:user:google:${initialPlayerSub}`);
    assert.ok(savedRaw, 'Dữ liệu người chơi phải tồn tại trên Redis');
    const savedData = JSON.parse(savedRaw);
    assert.strictEqual(savedData.profile.coins, 5000, 'Số Vàng trên Redis phải là 5000');
    assert.strictEqual(savedData.profile.level, 15, 'Cấp độ trên Redis phải là 15');
    assert.strictEqual(savedData.profile.adminAdjusted, true, 'Cờ adminAdjusted phải là true trên Redis');
    assert.strictEqual(savedData.profile.totalCoinsEarned, 5000, 'totalCoinsEarned phải nâng lên ít nhất 5000');

    // Kiểm tra Bảng Xếp Hạng trên Redis
    const lbScore = await mockRedis.zscore('levelup:leaderboard', initialPlayerSub);
    // Score = level * 1000 + coins = 15 * 1000 + 5000 = 20000
    assert.strictEqual(Number(lbScore), 20000, `Điểm Leaderboard phải là 20000 nhưng nhận được ${lbScore}`);
    console.log('  -> Dữ liệu đã lưu thành công vào Redis và cập nhật Bảng Xếp Hạng: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 2: Client phía người chơi tải lại trang / đổi thiết bị (GET /api/sync)
  // ---------------------------------------------------------------------------
  console.log('Test 2: Người chơi hoặc trang khác gọi GET /api/sync nhận dữ liệu chuẩn từ Redis');
  {
    const { req, res } = mockReqRes({
      method: 'GET',
      headers: {
        authorization: 'Bearer player_token_123'
      }
    });

    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.found, true);
    assert.strictEqual(res.body.data.profile.coins, 5000);
    assert.strictEqual(res.body.data.profile.level, 15);
    assert.strictEqual(res.body.data.profile.adminAdjusted, true);
    console.log('  -> GET /api/sync trả về đầy đủ Coins 5000, Level 15 và adminAdjusted: true: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 3: Anti-Cheat client (deriveLegitimateBalance) không phạt nhầm adminAdjusted
  // ---------------------------------------------------------------------------
  console.log('Test 3: deriveLegitimateBalance không tịch thu Vàng của tài khoản adminAdjusted');
  {
    const clientAppFile = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

    // Trích xuất hàm deriveLegitimateBalance từ public/app.js để chạy kiểm thử client-side trực tiếp
    const startIdx = clientAppFile.indexOf('function deriveLegitimateBalance(state) {');
    assert.ok(startIdx !== -1, 'Phải tìm thấy hàm deriveLegitimateBalance trong public/app.js');
    const endIdx = clientAppFile.indexOf('async function syncWithCloud', startIdx);
    const clientFuncCode = clientAppFile.slice(startIdx, endIdx);
    const clientDeriveFn = new Function('state', `${clientFuncCode}; return deriveLegitimateBalance(state);`);

    // Dữ liệu người chơi sau khi nhận từ Cloud
    const cloudReceivedState = {
      profile: {
        coins: 5000,
        totalCoinsEarned: 5000,
        adminAdjusted: true,
        level: 15
      },
      quests: [
        { id: 'q1', rewardCoins: 30, completed: true }
      ],
      inventory: [],
      ledger: []
    };

    const clientCheck = clientDeriveFn(cloudReceivedState);
    assert.strictEqual(clientCheck.tampered, false, 'Client Anti-Cheat KHÔNG được coi adminAdjusted là gian lận');
    assert.strictEqual(clientCheck.coins, 5000, `Client phải giữ nguyên 5000 Vàng, nhưng bị đổi thành ${clientCheck.coins}`);
    assert.strictEqual(clientCheck.totalCoinsEarned, 5000, `totalCoinsEarned phải giữ nguyên 5000`);
    assert.strictEqual(clientCheck.fine, 0, 'Tiền phạt phải bằng 0');
    console.log('  -> Client Anti-Cheat giữ nguyên 5000 Vàng và 0 tiền phạt: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 4: Người chơi làm nhiệm vụ trên trang khác và đồng bộ lại lên Cloud (POST /api/sync)
  // ---------------------------------------------------------------------------
  console.log('Test 4: Người chơi làm nhiệm vụ và triggerSave đồng bộ lên Cloud không bị reset Vàng');
  {
    const clientTime = Date.now() + 5000;
    // Người chơi làm thêm 1 nhiệm vụ 20 Vàng -> Vàng tăng lên 5020
    const updatedClientState = {
      googleId: initialPlayerSub,
      profile: {
        nickname: 'HiepSiQuaCam',
        avatar: '🛡️',
        level: 15,
        exp: 260,
        coins: 5020,
        totalCoinsEarned: 5020,
        title: 'Tân Binh Cấp 15',
        adminAdjusted: true,
        role: 'user'
      },
      quests: [
        { id: 'q1', title: 'Nhiệm vụ 1', type: 'focus', targetMinutes: 25, rewardCoins: 30, completed: true, signature: q1Sig },
        { id: 'q2', title: 'Nhiệm vụ 2', type: 'focus', targetMinutes: 25, rewardCoins: 20, completed: true, signature: q2Sig }
      ],
      inventory: [],
      ledger: [
        { id: 'l1', type: 'earn', amount: 30, title: 'Nhiệm vụ 1', timestamp: 1000 },
        { id: 'l2', type: 'earn', amount: 20, title: 'Nhiệm vụ 2', timestamp: clientTime }
      ],
      lastModified: clientTime,
      lastSyncedAt: clientTime
    };

    const { req, res } = mockReqRes({
      method: 'POST',
      headers: {
        authorization: 'Bearer player_token_123'
      },
      body: {
        nickname: 'HiepSiQuaCam',
        token: 'player_token_123',
        state: updatedClientState
      }
    });

    await handler(req, res);
    assert.strictEqual(res.statusCode, 200, `Save sync failed with status ${res.statusCode}`);
    assert.strictEqual(res.body.coins, 5020, `Số Vàng sau khi làm nhiệm vụ phải là 5020, nhận được ${res.body.coins}`);
    assert.strictEqual(res.body.level, 15, `Level phải giữ nguyên 15`);
    assert.strictEqual(res.body.tampered, false, 'Không được đánh dấu tampered');

    // Kiểm tra Redis sau khi người chơi đồng bộ
    const redisAfter = JSON.parse(await mockRedis.get(`levelup:user:google:${initialPlayerSub}`));
    assert.strictEqual(redisAfter.profile.coins, 5020);
    assert.strictEqual(redisAfter.profile.level, 15);
    console.log('  -> Đồng bộ từ client sau khi làm nhiệm vụ bảo toàn số Vàng và Level: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 5: Admin cập nhật theo Nickname hoặc Email
  // ---------------------------------------------------------------------------
  console.log('Test 5: Admin cập nhật bằng Nickname (hoặc email) tra cứu chuẩn và ghi đúng canonicalSub');
  {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'admin_update_user' },
      headers: {
        authorization: 'Bearer secret_admin_token_xyz'
      },
      body: {
        targetSub: 'HiepSiQuaCam', // Truyền Nickname thay vì google sub
        coins: 8000,
        level: 20,
        exp: 0,
        isCheater: false,
        reason: 'Thăng cấp Đại Hiệp Sĩ'
      }
    });

    await handler(req, res);
    assert.strictEqual(res.statusCode, 200, `Admin update by nickname failed: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.profile.coins, 8000);
    assert.strictEqual(res.body.profile.level, 20);

    // Leaderboard phải cập nhật với canonicalSub (player_sub_123) chứ không phải chuỗi 'HiepSiQuaCam'
    const canonicalScore = await mockRedis.zscore('levelup:leaderboard', initialPlayerSub);
    assert.strictEqual(Number(canonicalScore), 28000); // 20 * 1000 + 8000

    const rawNickScore = await mockRedis.zscore('levelup:leaderboard', 'HiepSiQuaCam');
    assert.strictEqual(rawNickScore, null, 'Không được lưu nhầm Nickname vào Leaderboard');
    console.log('  -> Cập nhật theo Nickname tra cứu chuẩn xác và cập nhật canonicalSub: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 6: GET /api/sync fallback tra cứu levelup:user:${targetSub}
  // ---------------------------------------------------------------------------
  console.log('Test 6: GET /api/sync tự động fallback sang key levelup:user:${targetSub} nếu cần');
  {
    const legacySub = 'legacy_user_777';
    await mockRedis.set(`levelup:user:${legacySub}`, JSON.stringify({
      googleId: legacySub,
      profile: {
        nickname: 'LegacyHero',
        level: 5,
        coins: 200
      }
    }));

    setGoogleTokenVerifierForTesting(async (token) => {
      if (token === 'legacy_token') {
        return { sub: legacySub, email: 'legacy@example.com', name: 'Legacy' };
      }
      return null;
    });

    const { req, res } = mockReqRes({
      method: 'GET',
      headers: {
        authorization: 'Bearer legacy_token'
      }
    });

    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.found, true);
    assert.strictEqual(res.body.data.profile.nickname, 'LegacyHero');
    console.log('  -> Fallback tra cứu key levelup:user:${sub} hoạt động hoàn hảo: OK\n');
  }

  // ---------------------------------------------------------------------------
  // Test 7: Kiểm tra cấu trúc DOM và BroadcastChannel trong public/app.js
  // ---------------------------------------------------------------------------
  console.log('Test 7: Kiểm tra mã nguồn BroadcastChannel và isSelf trong public/app.js');
  {
    const clientApp = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

    // Kiểm tra BroadcastChannel listener
    assert.ok(
      clientApp.includes("new BroadcastChannel('levelup_sync_channel')"),
      'Phải có khởi tạo BroadcastChannel(levelup_sync_channel)'
    );
    assert.ok(
      clientApp.includes("ADMIN_SYNC_UPDATE"),
      'Phải có event ADMIN_SYNC_UPDATE để đồng bộ đa tab'
    );
    assert.ok(
      clientApp.includes("hydrateFromCloud(false)"),
      'Khi nhận tín hiệu đa tab phải gọi hydrateFromCloud'
    );
    assert.ok(
      clientApp.includes("isAdminAdjusted"),
      'Hàm deriveLegitimateBalance phải kiểm tra cờ isAdminAdjusted'
    );
    console.log('  -> Cấu trúc BroadcastChannel và Anti-Cheat trên client đầy đủ: OK\n');
  }

  console.log('🎉 TẤT CẢ 7/7 BỘ TEST ĐỒNG BỘ ADMIN REDIS & ĐA TAB ĐÃ VƯỢT QUA XUẤT SẮC!');
}

runTests().catch(err => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
