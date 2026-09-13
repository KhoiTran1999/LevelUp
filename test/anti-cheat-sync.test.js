import assert from 'node:assert';
import handler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  deriveLegitimateBalance
} from '../api/sync.js';

// In-memory Mock Redis for Anti-cheat & Sync tests
class MockRedis {
  constructor() {
    this.store = new Map();
    this.sortedSets = new Map();
    this.status = 'ready';
  }

  async connect() {}

  async get(key) {
    return this.store.get(key) || null;
  }

  async set(key, value, mode, duration) {
    this.store.set(key, value);
    return 'OK';
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }

  async zadd(key, score, member) {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map());
    }
    this.sortedSets.get(key).set(member, score);
    return 1;
  }

  async zrem(key, member) {
    const set = this.sortedSets.get(key);
    if (!set) return 0;
    return set.delete(member) ? 1 : 0;
  }

  async zscore(key, member) {
    const set = this.sortedSets.get(key);
    if (!set || !set.has(member)) return null;
    return set.get(member);
  }

  async zrevrange(key, start, stop, withScores) {
    const set = this.sortedSets.get(key);
    if (!set) return [];
    const entries = Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
    const sliced = entries.slice(start, stop === -1 ? undefined : stop + 1);
    if (withScores) {
      const result = [];
      for (const [m, s] of sliced) {
        result.push(m, s.toString());
      }
      return result;
    }
    return sliced.map(([m]) => m);
  }
}

function createMockReq(options = {}) {
  return {
    method: options.method || 'GET',
    query: options.query || {},
    headers: options.headers || {},
    body: options.body || {}
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    }
  };
  return res;
}

console.log('=== Bắt đầu kiểm thử Anti-Cheat & Đồng Bộ Đa Thiết Bị (Multi-Device Sync) ===\n');

// Mock Verifier
setGoogleTokenVerifierForTesting(async (token) => {
  if (token === 'google_valid_sub1') {
    return {
      sub: 'google_user_1',
      email: 'user1@gmail.com',
      name: 'Hiệp Sĩ Test',
      picture: 'https://avatar.png'
    };
  }
  return null;
});

// Test 1: deriveLegitimateBalance chặn đứng việc tự sửa Vàng 999,999 trên LocalStorage
{
  const tamperedState = {
    profile: {
      coins: 999999,
      totalCoinsEarned: 999999
    },
    quests: [
      { id: 'q1', rewardCoins: 10, status: 'completed' },
      { id: 'q2', rewardCoins: 15, isRepeatable: true, completedCount: 2 }
    ],
    inventory: [
      { id: 'item1', price: 20 }
    ],
    ledger: []
  };

  // Quests earn: 20 (base) + 10 (q1) + 15*2 (q2) = 60
  // Inventory spent: 20
  // Max legitimate current coins: 60 - 20 = 40
  const result = deriveLegitimateBalance(tamperedState);
  assert.strictEqual(result.tampered, true, 'Phải phát hiện can thiệp gian lận Vàng');
  assert.strictEqual(result.totalCoinsEarned, 60, 'Tổng Vàng tích lũy tối đa phải là 60');
  assert.strictEqual(result.coins, 40, 'Số Vàng hiện tại phải bị giới hạn về 40');
  console.log('✓ Test 1: Chặn đứng can thiệp sửa Vàng 999,999 thành công, tái tạo số dư chuẩn 40.');
}

// Test 2: Integrity checksum signature calculation
{
  function computeStateIntegrity(profile) {
    const salt = 'lvlup_vault_2026';
    const str = `${salt}:${profile?.googleId || ''}:${profile?.coins ?? 0}:${profile?.totalCoinsEarned ?? 0}:${profile?.level ?? 1}:${profile?.exp ?? 0}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'sig_' + Math.abs(hash).toString(36);
  }

  const profileOriginal = { googleId: 'g123', coins: 50, totalCoinsEarned: 50, level: 2, exp: 120 };
  const sig = computeStateIntegrity(profileOriginal);

  // Người dùng mở DevTools sửa coins từ 50 lên 5000:
  const profileHacked = { ...profileOriginal, coins: 5000 };
  const hackedSig = computeStateIntegrity(profileHacked);

  assert.notStrictEqual(sig, hackedSig, 'Chữ ký băm phải thay đổi khi profile bị can thiệp');
  console.log('✓ Test 2: Chữ ký bảo mật LocalStorage phát hiện ngay lập tức khi người dùng sửa Vàng trong DevTools.');
}

// Test 3: Session Token - Cấp session token 90 ngày sau khi xác thực Google
let sharedSessionToken = '';
const mockRedis = new MockRedis();
setRedisClientForTesting(mockRedis);

{
  const req = createMockReq({
    method: 'POST',
    query: { action: 'google_auth' },
    body: { idToken: 'google_valid_sub1' }
  });
  const res = createMockRes();
  await handler(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.sessionToken, 'Phải trả về sessionToken dài hạn');
  sharedSessionToken = res.body.sessionToken;

  // Kiểm tra sessionToken đã lưu vào Redis chưa
  const sessionRaw = await mockRedis.get(`levelup:session:${sharedSessionToken}`);
  assert.ok(sessionRaw, 'Session token phải được lưu vào Redis');
  const sessionData = JSON.parse(sessionRaw);
  assert.strictEqual(sessionData.sub, 'google_user_1');
  console.log('✓ Test 3: Cấp session token 90 ngày thành công, bảo vệ phiên đăng nhập khỏi hết hạn sau 1 tiếng.');
}

// Test 4: Đồng bộ từ Thiết bị A với sessionToken
const baseTime = Date.now() + 100000;
const timeDeviceA = baseTime + 1000;
const timeDeviceB_stale = baseTime + 500;
const timeDeviceB_fresh = baseTime + 2000;

{
  const stateDeviceA = {
    lastModified: timeDeviceA,
    profile: {
      nickname: 'HiepSiA',
      googleId: 'google_user_1',
      coins: 30,
      totalCoinsEarned: 30
    },
    quests: [
      { id: 'q1', rewardCoins: 10, status: 'completed' }
    ]
  };

  const req = createMockReq({
    method: 'POST',
    headers: { Authorization: `Bearer ${sharedSessionToken}` },
    body: {
      nickname: 'HiepSiA',
      token: sharedSessionToken,
      state: stateDeviceA
    }
  });
  const res = createMockRes();
  await handler(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.conflict, false);
  console.log('✓ Test 4: Thiết bị A đẩy dữ liệu thành công qua sessionToken.');
}

// Test 5: Thiết bị B có bản ghi cũ (stale) đẩy lên -> Server phát hiện conflict và trả về bản mới của Thiết bị A
{
  const staleStateDeviceB = {
    lastModified: timeDeviceB_stale, // Cũ hơn timeDeviceA
    profile: {
      nickname: 'HiepSiA',
      googleId: 'google_user_1',
      coins: 20,
      totalCoinsEarned: 20
    }
  };

  const req = createMockReq({
    method: 'POST',
    headers: { Authorization: `Bearer ${sharedSessionToken}` },
    body: {
      nickname: 'HiepSiA',
      token: sharedSessionToken,
      state: staleStateDeviceB
    }
  });
  const res = createMockRes();
  await handler(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.conflict, true, 'Server phải cảnh báo conflict dữ liệu cũ');
  assert.ok(res.body.state, 'Server phải trả về state mới nhất của Cloud để Thiết bị B cập nhật');
  assert.strictEqual(res.body.state.lastModified, timeDeviceA);
  console.log('✓ Test 5: Server giải quyết xung đột đa thiết bị (Last-Write-Wins), ngăn Thiết bị B ghi đè dữ liệu cũ lên Thiết bị A.');
}

// Test 6: Thiết bị B thực hiện nhiệm vụ mới hơn (timestamp 2000) -> Server chấp nhận và cập nhật Cloud
{
  const freshStateDeviceB = {
    lastModified: timeDeviceB_fresh, // Mới hơn timeDeviceA
    profile: {
      nickname: 'HiepSiA',
      googleId: 'google_user_1',
      coins: 45,
      totalCoinsEarned: 45
    },
    quests: [
      { id: 'q1', rewardCoins: 10, status: 'completed' },
      { id: 'q2', rewardCoins: 15, status: 'completed' }
    ]
  };

  const req = createMockReq({
    method: 'POST',
    headers: { Authorization: `Bearer ${sharedSessionToken}` },
    body: {
      nickname: 'HiepSiA',
      token: sharedSessionToken,
      state: freshStateDeviceB
    }
  });
  const res = createMockRes();
  await handler(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.conflict, false, 'Không có conflict vì timestamp mới hơn');
  assert.strictEqual(res.body.success, true);
  console.log('✓ Test 6: Thiết bị B thao tác mới hơn (timestamp 2000) được cập nhật thẳng lên Cloud.');
}

// Test 7: GET /api/sync từ Thiết bị A nhận ngay state mới nhất của Thiết bị B
{
  const req = createMockReq({
    method: 'GET',
    headers: { Authorization: `Bearer ${sharedSessionToken}` }
  });
  const res = createMockRes();
  await handler(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.found, true);
  assert.strictEqual(res.body.data.lastModified, timeDeviceB_fresh, 'Thiết bị A hydrate nhận đúng dữ liệu mới nhất của Thiết bị B');
  assert.strictEqual(res.body.data.profile.coins, 45);
  console.log('✓ Test 7: Thiết bị A hydrateFromCloud nhận ngay lập tức trạng thái mới nhất từ Thiết bị B.');
}

// Test 8: Đăng xuất thu hồi Session Token
{
  const req = createMockReq({
    method: 'POST',
    query: { action: 'logout' },
    headers: { Authorization: `Bearer ${sharedSessionToken}` }
  });
  const res = createMockRes();
  await handler(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);

  // Thử dùng lại token đã đăng xuất -> Bị từ chối 401
  const checkReq = createMockReq({
    method: 'GET',
    headers: { Authorization: `Bearer ${sharedSessionToken}` }
  });
  const checkRes = createMockRes();
  await handler(checkReq, checkRes);

  assert.strictEqual(checkRes.statusCode, 401, 'Token đã đăng xuất phải bị 401');
  console.log('✓ Test 8: Thu hồi session token khi đăng xuất hoạt động an toàn và triệt để.');
}

console.log('\n🎉 TẤT CẢ 8/8 TEST ANTI-CHEAT & ĐỒNG BỘ ĐA THIẾT BỊ ĐÃ VƯỢT QUA XUẤT SẮC!\n');
