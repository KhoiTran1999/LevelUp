import assert from 'node:assert';
import handler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  signQuest
} from '../api/sync.js';

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

  async set(key, value) {
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
    return set ? (set.get(member) || null) : null;
  }
}

function createMockReqRes(method, body = {}, query = {}, headers = {}) {
  const req = { method, body, query, headers };
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end() { return this; }
  };
  return { req, res };
}

async function runTests() {
  console.log('=== Kiểm thử Cookie-based Session & Redis-First State ===\n');

  const redis = new MockRedis();
  setRedisClientForTesting(redis);

  setGoogleTokenVerifierForTesting(async (token) => {
    if (token === 'valid_google_token') {
      return {
        sub: 'google_user_sub_123',
        email: 'player@gmail.com',
        name: 'Player One',
        picture: 'https://example.com/avatar.png'
      };
    }
    return null;
  });

  // 1. Google Auth sets HttpOnly levelup_session cookie
  let sessionCookie = '';
  {
    const { req, res } = createMockReqRes('POST', { idToken: 'valid_google_token' }, { action: 'google_auth' });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    const setCookie = res.headers['Set-Cookie'];
    assert.ok(setCookie, 'Phải có Set-Cookie header');
    assert.ok(setCookie.includes('levelup_session='), 'Cookie phải là levelup_session');
    assert.ok(setCookie.includes('HttpOnly'), 'Cookie phải có cờ HttpOnly');
    assert.ok(setCookie.includes('SameSite=Lax'), 'Cookie phải có cờ SameSite=Lax');

    const match = setCookie.match(/levelup_session=([^;]+)/);
    assert.ok(match, 'Trích xuất được token từ cookie');
    sessionCookie = match[1];
    console.log('✓ Test 1: google_auth cấp cookie HttpOnly levelup_session thành công.');
  }

  // 2. GET /api/sync authenticates via Cookie only (no Authorization header)
  {
    const { req, res } = createMockReqRes('GET', {}, {}, { cookie: `levelup_session=${sessionCookie}` });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.found, true);
    assert.strictEqual(res.body.data.profile.nickname, 'Player One');
    assert.strictEqual(res.body.data.profile.coins, 20);
    console.log('✓ Test 2: GET /api/sync xác thực tự động qua HttpOnly cookie mà không cần Authorization header.');
  }

  // 3. POST /api/sync saves state to Redis via Cookie only
  {
    const updatedState = {
      profile: {
        nickname: 'Player One',
        level: 2,
        exp: 50,
        coins: 40,
        totalCoinsEarned: 40
      },
      quests: [
        { id: 'q1', title: 'Task 1', type: 'focus', targetMinutes: 25, rewardCoins: 20, status: 'completed', completed: true, signature: signQuest('Task 1', 'focus', 25, 20) }
      ],
      ledger: [],
      inventory: [],
      lastModified: Date.now()
    };

    const { req, res } = createMockReqRes('POST', { state: updatedState }, {}, { cookie: `levelup_session=${sessionCookie}` });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.coins, 40);

    // Verify Redis holds updated state
    const savedRaw = await redis.get('levelup:user:google:google_user_sub_123');
    const saved = JSON.parse(savedRaw);
    assert.strictEqual(saved.profile.coins, 40);
    assert.strictEqual(saved.profile.level, 2);
    console.log('✓ Test 3: POST /api/sync lưu trữ trạng thái game trực tiếp vào Redis qua cookie.');
  }

  // 4. Anti-cheat server derivation protects state in Redis
  {
    const tamperedState = {
      profile: {
        nickname: 'Player One',
        level: 2,
        exp: 50,
        coins: 999999, // Tampered in memory
        totalCoinsEarned: 999999
      },
      quests: [
        { id: 'q1', title: 'Task 1', type: 'focus', targetMinutes: 25, rewardCoins: 20, status: 'completed', completed: true, signature: signQuest('Task 1', 'focus', 25, 20) }
      ],
      ledger: [],
      inventory: [],
      lastModified: Date.now() + 100
    };

    const { req, res } = createMockReqRes('POST', { state: tamperedState }, {}, { cookie: `levelup_session=${sessionCookie}` });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.coins, 0, 'Server anti-cheat phải tịch thu số Vàng về 0');

    const savedRaw = await redis.get('levelup:user:google:google_user_sub_123');
    const saved = JSON.parse(savedRaw);
    assert.strictEqual(saved.profile.coins, 0);
    console.log('✓ Test 4: Server Anti-Cheat cưỡng chế tịch thu Vàng gian lận trên Redis.');
  }

  // 5. POST /api/sync?action=logout clears cookie and deletes session
  {
    const { req, res } = createMockReqRes('POST', {}, { action: 'logout' }, { cookie: `levelup_session=${sessionCookie}` });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    const setCookie = res.headers['Set-Cookie'];
    assert.ok(setCookie.includes('Max-Age=0'), 'Cookie phải bị hủy với Max-Age=0');

    // Verify session token deleted in Redis
    const sessionInRedis = await redis.get(`levelup:session:${sessionCookie}`);
    assert.strictEqual(sessionInRedis, null, 'Session trong Redis phải bị xóa');
    console.log('✓ Test 5: Logout xóa session token khỏi Redis và hủy cookie qua Max-Age=0.');
  }

  // 6. Accessing GET /api/sync after logout returns 401 Unauthorized
  {
    const { req, res } = createMockReqRes('GET', {}, {}, { cookie: `levelup_session=${sessionCookie}` });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 401);
    console.log('✓ Test 6: GET /api/sync trả về 401 khi session cookie đã bị hủy.');
  }

  console.log('\n🎉 TẤT CẢ TEST COOKIE-BASED SESSION & REDIS-FIRST ĐÃ VƯỢT QUA!');
}

runTests();
