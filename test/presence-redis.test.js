import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import handler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  updateUserPresence,
  setOfflineUserPresence,
  getOnlineUsersPresence
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

  async zmscore(key, ...members) {
    if (!this.sortedSets.has(key)) return members.map(() => null);
    const set = this.sortedSets.get(key);
    return members.map(m => {
      const s = set.get(String(m));
      return s !== undefined ? String(s) : null;
    });
  }

  async zcount(key, min, max) {
    if (!this.sortedSets.has(key)) return 0;
    const minVal = min === '-inf' ? -Infinity : Number(min);
    const maxVal = max === '+inf' ? Infinity : Number(max);
    let count = 0;
    for (const score of this.sortedSets.get(key).values()) {
      if (score >= minVal && score <= maxVal) {
        count++;
      }
    }
    return count;
  }

  async zrevrange(key, start, stop, withScores) {
    if (!this.sortedSets.has(key)) return [];
    const entries = Array.from(this.sortedSets.get(key).entries());
    entries.sort((a, b) => b[1] - a[1]);
    const sliced = entries.slice(start, stop === -1 ? undefined : stop + 1);
    if (withScores === 'WITHSCORES') {
      const result = [];
      sliced.forEach(([member, score]) => {
        result.push(member, String(score));
      });
      return result;
    }
    return sliced.map(e => e[0]);
  }

  async zrangebyscore(key, min, max) {
    if (!this.sortedSets.has(key)) return [];
    const minVal = min === '-inf' ? -Infinity : Number(min);
    const maxVal = max === '+inf' ? Infinity : Number(max);
    const result = [];
    for (const [member, score] of this.sortedSets.get(key).entries()) {
      if (score >= minVal && score <= maxVal) {
        result.push(member);
      }
    }
    return result;
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
    bodyData: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.bodyData = data;
      return this;
    },
    end() {
      return this;
    }
  };

  return { req, res };
}

async function runPresenceTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ: REDIS PRESENCE (ONLINE/OFFLINE & LAST ACTIVE) ---');

  const mockRedis = new MockRedis();
  setRedisClientForTesting(mockRedis);

  const mockUsers = {
    'sub_active_knight': {
      sub: 'sub_active_knight',
      email: 'active_knight@gmail.com',
      name: 'Hiệp Sĩ Xanh',
      picture: '⚔️'
    },
    'sub_offline_ranger': {
      sub: 'sub_offline_ranger',
      email: 'offline_ranger@gmail.com',
      name: 'Xạ Thủ Rừng Xanh',
      picture: '🏹'
    }
  };

  setGoogleTokenVerifierForTesting(async (token) => {
    return mockUsers[token] || null;
  });

  // Test 1: Helper updateUserPresence & getOnlineUsersPresence
  {
    console.log('Test 1: updateUserPresence cập nhật timestamp vào Sorted Set');
    await updateUserPresence(mockRedis, 'sub_active_knight');
    const score = await mockRedis.zscore('levelup:online_users', 'sub_active_knight');
    assert.ok(score, 'User active phải có điểm số timestamp trong levelup:online_users');
    assert.ok(Date.now() - Number(score) < 2000, 'Score phải sát với thời gian hiện tại');
  }

  // Test 2: Helper setOfflineUserPresence đặt score quá ngưỡng 45s
  {
    console.log('Test 2: setOfflineUserPresence đặt score quá ngưỡng để offline ngay lập tức');
    await setOfflineUserPresence(mockRedis, 'sub_offline_ranger');
    const score = await mockRedis.zscore('levelup:online_users', 'sub_offline_ranger');
    assert.ok(score, 'User offline phải có score trong levelup:online_users');
    const diff = Date.now() - Number(score);
    assert.ok(diff >= 45000, 'Score offline phải cách thời điểm hiện tại >= 45s để isOnline = false');
  }

  // Test 3: getOnlineUsersPresence tính toán isOnline và lastActive chính xác
  {
    console.log('Test 3: getOnlineUsersPresence lọc trạng thái online/offline');
    const presence = await getOnlineUsersPresence(mockRedis, ['sub_active_knight', 'sub_offline_ranger', 'sub_never_seen']);
    assert.strictEqual(presence.isOnlineMap.get('sub_active_knight'), true, 'sub_active_knight phải là Online');
    assert.strictEqual(presence.isOnlineMap.get('sub_offline_ranger'), false, 'sub_offline_ranger phải là Offline');
    assert.strictEqual(presence.isOnlineMap.get('sub_never_seen'), undefined, 'sub_never_seen không có trong presence');
    assert.strictEqual(presence.onlineCount, 1, 'Tổng số user online phải là 1');
    assert.ok(presence.lastActiveMap.get('sub_offline_ranger'), 'sub_offline_ranger vẫn giữ mốc lastActive');
  }

  // Test 4: Endpoint action=heartbeat
  {
    console.log('Test 4: Endpoint action=heartbeat làm mới presence');
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'heartbeat' },
      headers: { authorization: 'Bearer sub_active_knight' }
    });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.bodyData.success, true);
    assert.ok(typeof res.bodyData.onlineCount === 'number');
  }

  // Test 5: Endpoint action=offline
  {
    console.log('Test 5: Endpoint action=offline đánh dấu người dùng ngoại tuyến');
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'offline' },
      headers: { authorization: 'Bearer sub_active_knight' }
    });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.bodyData.success, true);

    const presence = await getOnlineUsersPresence(mockRedis, ['sub_active_knight']);
    assert.strictEqual(presence.isOnlineMap.get('sub_active_knight'), false, 'Sau khi gọi offline, user phải thành Offline');
  }

  // Test 6: Endpoint action=leaderboard trả về isOnline, lastActive và onlineCount
  {
    console.log('Test 6: Endpoint action=leaderboard đính kèm isOnline và lastActive cho các thành viên');
    // Chuẩn bị dữ liệu 2 người chơi trong Redis Leaderboard
    const user1State = {
      profile: { nickname: 'Hiệp Sĩ Xanh', level: 10, coins: 500, totalCoinsEarned: 1500, avatar: '⚔️' },
      googleId: 'sub_active_knight',
      lastSyncedAt: Date.now()
    };
    const user2State = {
      profile: { nickname: 'Xạ Thủ Rừng Xanh', level: 8, coins: 300, totalCoinsEarned: 800, avatar: '🏹' },
      googleId: 'sub_offline_ranger',
      lastSyncedAt: Date.now() - 3600000 // 1 giờ trước
    };

    await mockRedis.set('levelup:user:google:sub_active_knight', JSON.stringify(user1State));
    await mockRedis.set('levelup:user:google:sub_offline_ranger', JSON.stringify(user2State));
    await mockRedis.zadd('levelup:leaderboard', 10500, 'sub_active_knight');
    await mockRedis.zadd('levelup:leaderboard', 8300, 'sub_offline_ranger');

    // Đánh dấu user 1 online, user 2 offline
    await updateUserPresence(mockRedis, 'sub_active_knight');
    await setOfflineUserPresence(mockRedis, 'sub_offline_ranger');

    const { req, res } = mockReqRes({
      method: 'GET',
      query: { action: 'leaderboard' }
    });
    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.bodyData.leaderboard), 'Response phải có mảng leaderboard');
    assert.strictEqual(res.bodyData.onlineCount, 1, 'onlineCount phải là 1');

    const knight = res.bodyData.leaderboard.find(u => u.key === 'sub_active_knight');
    const ranger = res.bodyData.leaderboard.find(u => u.key === 'sub_offline_ranger');

    assert.ok(knight, 'Phải tìm thấy hiệp sĩ xanh trên BXH');
    assert.ok(ranger, 'Phải tìm thấy xạ thủ trên BXH');

    assert.strictEqual(knight.isOnline, true, 'Hiệp Sĩ Xanh phải có isOnline: true');
    assert.strictEqual(ranger.isOnline, false, 'Xạ Thủ phải có isOnline: false');
    assert.ok(ranger.lastActive, 'Xạ Thủ phải có trường lastActive');
  }

  // Test 7: Kiểm tra HTML & JS có các phần tử giao diện
  {
    console.log('Test 7: Kiểm tra UI trong public/index.html và public/app.js');
    const html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf-8');
    const appJs = fs.readFileSync(path.join(process.cwd(), 'public', 'app.js'), 'utf-8');

    assert.ok(html.includes('id="leaderboard-online-badge"'), 'index.html phải có #leaderboard-online-badge');
    assert.ok(html.includes('id="leaderboard-online-count"'), 'index.html phải có #leaderboard-online-count');

    assert.ok(appJs.includes('function formatTimeAgo'), 'app.js phải có hàm formatTimeAgo');
    assert.ok(appJs.includes('leaderboard-online-count'), 'app.js phải cập nhật #leaderboard-online-count');
    assert.ok(appJs.includes('avatarWithPresence'), 'app.js phải render avatar có chấm presence');
    assert.ok(appJs.includes('action=offline'), 'app.js phải có cơ chế gửi action=offline khi tắt tab');
  }

  console.log('✅ TẤT CẢ TEST PRESENCE REDIS ĐÃ VƯỢT QUA 100%!');
}

runPresenceTests().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
