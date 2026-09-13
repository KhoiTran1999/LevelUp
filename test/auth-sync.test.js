import assert from 'node:assert';
import handler, { setRedisClientForTesting } from '../api/sync.js';

// In-memory mock Redis
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
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
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

  async zrevrange(key, start, stop, withScores) {
    const set = this.sortedSets.get(key);
    if (!set) return [];
    const entries = Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
    const sliced = entries.slice(start, stop + 1);
    if (withScores === 'WITHSCORES') {
      const out = [];
      for (const [member, score] of sliced) {
        out.push(member, String(score));
      }
      return out;
    }
    return sliced.map(e => e[0]);
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

async function runAuthTests() {
  const mockRedis = new MockRedis();
  setRedisClientForTesting(mockRedis);

  const tokenA = 'token_user_a_1234567890abcdef';
  const tokenB = 'token_user_b_9876543210fedcba';
  const adminToken = 'token_admin_supersecret123456';
  process.env.ADMIN_TOKEN = adminToken;
  process.env.ADMIN_NICKNAMES = 'admin,guildmaster';

  console.log('--- Bắt đầu kiểm thử phân quyền & chống trùng nickname ---');

  // Test 1: User A đăng ký nickname "hiepsi1"
  {
    const { req, res } = createMockReqRes(
      'POST',
      { nickname: 'hiepsi1', state: { profile: { level: 3, totalCoinsEarned: 50 } } },
      {},
      { authorization: `Bearer ${tokenA}` }
    );
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200, 'User A đăng ký nickname hợp lệ phải thành công (200)');
    assert.strictEqual(res.body.success, true);
    console.log('✓ Test 1 Passed: User A đăng ký nickname "hiepsi1" thành công.');
  }

  // Test 2: User B cố tình dùng lại nickname "hiepsi1" với tokenB -> Bị từ chối 409 Conflict
  {
    const { req, res } = createMockReqRes(
      'POST',
      { nickname: 'hiepsi1', state: { profile: { level: 1, totalCoinsEarned: 0 } } },
      {},
      { authorization: `Bearer ${tokenB}` }
    );
    await handler(req, res);
    assert.strictEqual(res.statusCode, 409, 'User B không được phép chiếm nickname của User A (phải trả về 409 Conflict)');
    assert.match(res.body.error, /đã có người sử dụng/i);
    console.log('✓ Test 2 Passed: Chặn thành công User B cố tình lấy trùng nickname "hiepsi1" (409 Conflict).');
  }

  // Test 3: User B cố tình đổi tên sang "hiepsi1" mà không có tokenA -> Bị từ chối 409 Conflict
  {
    const { req, res } = createMockReqRes(
      'POST',
      { nickname: 'hiepsi1', oldNickname: 'user_b_initial', state: { profile: { level: 1, totalCoinsEarned: 0 } } },
      {},
      { authorization: `Bearer ${tokenB}` }
    );
    await handler(req, res);
    assert.strictEqual(res.statusCode, 409, 'Đổi tên sang nickname đã tồn tại phải bị từ chối (409 Conflict)');
    console.log('✓ Test 3 Passed: Chặn đổi tên sang nickname đã tồn tại.');
  }

  // Test 4: Kiểm tra tính khả dụng check_nickname
  {
    // Với tokenA (chính chủ)
    const { req: req1, res: res1 } = createMockReqRes(
      'GET',
      {},
      { action: 'check_nickname', nickname: 'hiepsi1' },
      { authorization: `Bearer ${tokenA}` }
    );
    await handler(req1, res1);
    assert.strictEqual(res1.body.available, true, 'Chính chủ kiểm tra tên của mình phải báo available: true');
    assert.strictEqual(res1.body.isOwner, true);

    // Với tokenB (người khác)
    const { req: req2, res: res2 } = createMockReqRes(
      'GET',
      {},
      { action: 'check_nickname', nickname: 'hiepsi1' },
      { authorization: `Bearer ${tokenB}` }
    );
    await handler(req2, res2);
    assert.strictEqual(res2.body.available, false, 'Người khác kiểm tra tên đã có chủ phải báo available: false');
    assert.strictEqual(res2.body.isOwner, false);

    console.log('✓ Test 4 Passed: Endpoint check_nickname xác định đúng tính khả dụng và quyền sở hữu.');
  }

  // Test 5: User A đổi tên từ "hiepsi1" sang "hiepsi2" -> Thành công, xóa "hiepsi1"
  {
    const { req, res } = createMockReqRes(
      'POST',
      { nickname: 'hiepsi2', oldNickname: 'hiepsi1', state: { profile: { level: 3, totalCoinsEarned: 50 } } },
      {},
      { authorization: `Bearer ${tokenA}` }
    );
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200, 'User A đổi tên chính chủ phải thành công');
    assert.strictEqual(await mockRedis.get('levelup:user:hiepsi1'), null, 'Key cũ phải bị xóa');
    assert.notStrictEqual(await mockRedis.get('levelup:user:hiepsi2'), null, 'Key mới phải tồn tại');
    console.log('✓ Test 5 Passed: User A đổi tên thành công và key cũ được dọn dẹp sạch sẽ.');
  }

  // Test 6: Nickname cũ "hiepsi1" sau khi User A đổi đã được giải phóng -> User B có thể đăng ký
  {
    const { req, res } = createMockReqRes(
      'POST',
      { nickname: 'hiepsi1', state: { profile: { level: 1, totalCoinsEarned: 10 } } },
      {},
      { authorization: `Bearer ${tokenB}` }
    );
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200, 'User B được phép dùng "hiepsi1" vì User A đã chuyển sang tên mới');
    console.log('✓ Test 6 Passed: Nickname cũ được giải phóng hoàn toàn sau khi đổi tên.');
  }

  // Test 7: Phân quyền Admin - Chỉ Admin thật mới có quyền dọn dẹp user trên Leaderboard
  {
    // User B cố gọi admin_remove với nickname của mình
    const { req: reqFail, res: resFail } = createMockReqRes(
      'POST',
      { nickname: 'hiepsi1', targetNickname: 'hiepsi2' },
      { action: 'admin_remove' },
      { authorization: `Bearer ${tokenB}` }
    );
    await handler(reqFail, resFail);
    assert.strictEqual(resFail.statusCode, 403, 'User thường không được gọi chức năng Admin (403)');

    // User B cố mạo danh nickname "admin" nhưng dùng tokenB giả mạo
    const { req: reqImpersonate, res: resImpersonate } = createMockReqRes(
      'POST',
      { nickname: 'admin', targetNickname: 'hiepsi2' },
      { action: 'admin_remove' },
      { authorization: `Bearer ${tokenB}` }
    );
    await handler(reqImpersonate, resImpersonate);
    assert.strictEqual(resImpersonate.statusCode, 403, 'Mạo danh Admin với sai Token phải bị từ chối 403');

    // Admin thật gọi admin_remove
    const { req: reqAdmin, res: resAdmin } = createMockReqRes(
      'POST',
      { nickname: 'admin', targetNickname: 'hiepsi1' },
      { action: 'admin_remove' },
      { authorization: `Bearer ${adminToken}` }
    );
    await handler(reqAdmin, resAdmin);
    assert.strictEqual(resAdmin.statusCode, 200, 'Admin gọi thành công');
    assert.strictEqual(await mockRedis.get('levelup:user:hiepsi1'), null, 'Target user đã bị Admin xóa');
    console.log('✓ Test 7 Passed: Phân quyền Admin hoạt động chính xác (chặn user thường và chặn mạo danh 403, cho phép Admin thật).');
  }

  // Test 8: Tìm và chuyển tài khoản bằng Token (action: find_by_token)
  {
    // Tìm với tokenA (thuộc về hiepsi2)
    const { req: reqFound, res: resFound } = createMockReqRes(
      'GET',
      {},
      { action: 'find_by_token' },
      { authorization: `Bearer ${tokenA}` }
    );
    await handler(reqFound, resFound);
    assert.strictEqual(resFound.statusCode, 200, 'Tìm bằng tokenA phải thành công');
    assert.strictEqual(resFound.body.found, true);
    assert.strictEqual(resFound.body.nickname, 'hiepsi2');

    // Tìm với token không tồn tại
    const { req: reqNotFound, res: resNotFound } = createMockReqRes(
      'GET',
      {},
      { action: 'find_by_token' },
      { authorization: 'Bearer token_khong_ton_tai_12345678' }
    );
    await handler(reqNotFound, resNotFound);
    assert.strictEqual(resNotFound.statusCode, 404, 'Token không tồn tại phải trả về 404');
    assert.strictEqual(resNotFound.body.found, false);
    console.log('✓ Test 8 Passed: Tìm và chuyển tài khoản tự động bằng Token (find_by_token) hoạt động chính xác.');
  }

  // Test 9: Cách ly dữ liệu cá nhân (Data Isolation & Privacy)
  {
    // User B cố đọc trộm dữ liệu cá nhân của User A (hiepsi2) qua GET /api/sync
    const { req: reqSnoop, res: resSnoop } = createMockReqRes(
      'GET',
      {},
      { nickname: 'hiepsi2' },
      { authorization: `Bearer ${tokenB}` }
    );
    await handler(reqSnoop, resSnoop);
    assert.strictEqual(resSnoop.statusCode, 200);
    assert.strictEqual(resSnoop.body.isOwner, false, 'User B không phải chủ sở hữu');
    assert.strictEqual(resSnoop.body.data, undefined, 'Server TUYỆT ĐỐI không được trả về data bí mật (quests, habits) cho người khác');
    assert.notStrictEqual(resSnoop.body.profile, undefined, 'Chỉ được phép trả về thông tin public profile');
    console.log('✓ Test 9 Passed: Cách ly dữ liệu cá nhân tuyệt đối giữa các người chơi.');
  }

  // Test 10: Chống leo thang đặc quyền (Privilege Escalation Defense)
  {
    // User B cố tự gán role: 'admin' trong payload
    const { req: reqEscalate, res: resEscalate } = createMockReqRes(
      'POST',
      { nickname: 'hiepsi_hacker', state: { profile: { role: 'admin', level: 1 } } },
      {},
      { authorization: `Bearer ${tokenB}` }
    );
    await handler(reqEscalate, resEscalate);
    assert.strictEqual(resEscalate.statusCode, 200);
    assert.strictEqual(resEscalate.body.role, 'adventurer', 'Role phải bị khóa ở adventurer, không thể tự phong Admin');
    console.log('✓ Test 10 Passed: Chặn đứng hành vi tự phong Admin (Privilege Escalation).');
  }

  // Test 11: Bảo vệ biệt danh quản trị (Admin Nickname Defense)
  {
    // User B cố đăng ký tên "admin" bằng token thường
    const { req: reqStealAdmin, res: resStealAdmin } = createMockReqRes(
      'POST',
      { nickname: 'admin', state: { profile: { level: 99 } } },
      {},
      { authorization: `Bearer ${tokenB}` }
    );
    await handler(reqStealAdmin, resStealAdmin);
    assert.strictEqual(resStealAdmin.statusCode, 403, 'Không có ADMIN_TOKEN thì không được chiếm tên admin');

    // Kiểm tra check_nickname cho "admin"
    const { req: reqCheckAdmin, res: resCheckAdmin } = createMockReqRes(
      'GET',
      {},
      { action: 'check_nickname', nickname: 'admin' },
      { authorization: `Bearer ${tokenB}` }
    );
    await handler(reqCheckAdmin, resCheckAdmin);
    assert.strictEqual(resCheckAdmin.body.available, false, 'check_nickname phải báo admin không khả dụng với user thường');
    console.log('✓ Test 11 Passed: Bảo vệ toàn diện biệt danh quản trị viên khỏi bị đăng ký trái phép.');
  }

  console.log('\n🎉 TẤT CẢ 11 TEST PHÂN QUYỀN VÀ BẢO VỆ DỮ LIỆU ĐÃ VƯỢT QUA TOÀN DIỆN!');
}

runAuthTests().catch(err => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
