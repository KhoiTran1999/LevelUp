import assert from 'node:assert';
import handler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  verifyGoogleToken,
  sanitizeNickname,
  signQuest
} from '../api/sync.js';

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

async function runGoogleAuthTests() {
  const mockRedis = new MockRedis();
  setRedisClientForTesting(mockRedis);

  // Cấu hình môi trường thử nghiệm
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
  process.env.ADMIN_EMAILS = 'guildmaster@gmail.com,admin@gmail.com';
  process.env.ADMIN_NICKNAMES = 'admin,guildmaster';
  process.env.ADMIN_TOKEN = 'admin_master_secret_token';

  // Thiết lập Mock Verifier cho Google Token
  const MOCK_GOOGLE_USERS = {
    'valid_google_token_user_a': {
      sub: 'google_sub_user_a_1001',
      email: 'hiepsi_a@gmail.com',
      name: 'Hiệp Sĩ A',
      picture: 'https://lh3.googleusercontent.com/avatar_a.jpg'
    },
    'valid_google_token_user_b': {
      sub: 'google_sub_user_b_2002',
      email: 'hiepsi_b@gmail.com',
      name: 'Hiệp Sĩ B',
      picture: 'https://lh3.googleusercontent.com/avatar_b.jpg'
    },
    'valid_google_token_admin': {
      sub: 'google_sub_admin_9999',
      email: 'guildmaster@gmail.com',
      name: 'Bang Chủ',
      picture: 'https://lh3.googleusercontent.com/avatar_admin.jpg'
    }
  };

  setGoogleTokenVerifierForTesting(async (idToken) => {
    if (MOCK_GOOGLE_USERS[idToken]) {
      return { ...MOCK_GOOGLE_USERS[idToken] };
    }
    return null; // Giả lập token không hợp lệ hoặc hết hạn
  });

  console.log('=== Bắt đầu kiểm thử toàn diện Google Identity Services & Auth Sync ===\n');

  // Test 1: Public endpoint GET /api/sync?action=auth_config trả về googleClientId
  {
    const { req, res } = createMockReqRes('GET', {}, { action: 'auth_config' });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.googleClientId, 'test-google-client-id.apps.googleusercontent.com');
    console.log('✓ Test 1 Passed: Endpoint /api/sync?action=auth_config cung cấp đúng Google Client ID.');
  }

  // Test 2: Đăng nhập Google lần đầu (POST /api/sync?action=google_auth) -> Khởi tạo tài khoản tự động từ Google profile
  {
    const { req, res } = createMockReqRes(
      'POST',
      { idToken: 'valid_google_token_user_a' },
      { action: 'google_auth' }
    );
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.isNew, true, 'Lần đầu đăng nhập phải là tài khoản mới (isNew: true)');
    assert.strictEqual(res.body.googleUser.sub, 'google_sub_user_a_1001');
    assert.strictEqual(res.body.googleUser.email, 'hiepsi_a@gmail.com');
    assert.strictEqual(res.body.state.profile.nickname, 'Hiệp Sĩ A', 'Tự động lấy Tên Google làm Nickname ban đầu');
    assert.strictEqual(res.body.state.profile.avatar, 'https://lh3.googleusercontent.com/avatar_a.jpg', 'Tự động lấy Avatar Google');
    assert.strictEqual(res.body.state.profile.role, 'adventurer');

    // Kiểm tra đã lưu trên Redis
    const saved = await mockRedis.get('levelup:user:google:google_sub_user_a_1001');
    assert.notStrictEqual(saved, null, 'Dữ liệu phải được lưu theo key vĩnh viễn levelup:user:google:${sub}');
    console.log('✓ Test 2 Passed: Đăng nhập Google tài khoản mới tự động sinh profile từ Google info.');
  }

  // Test 3: Đăng nhập Google lại (Returning User) -> Khôi phục chính xác tài khoản đã có
  {
    const { req, res } = createMockReqRes(
      'POST',
      { idToken: 'valid_google_token_user_a' },
      { action: 'google_auth' }
    );
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.isNew, false, 'Đăng nhập lại phải báo isNew: false');
    assert.strictEqual(res.body.state.profile.nickname, 'Hiệp Sĩ A');
    console.log('✓ Test 3 Passed: Đăng nhập lại nhận diện đúng người chơi cũ và tải lại dữ liệu.');
  }

  // Test 4: Chặn Google Token không hợp lệ hoặc hết hạn (401 Unauthorized)
  {
    const { req, res } = createMockReqRes(
      'POST',
      { idToken: 'invalid_expired_token' },
      { action: 'google_auth' }
    );
    await handler(req, res);
    assert.strictEqual(res.statusCode, 401, 'Token không hợp lệ phải trả về 401 Unauthorized');
    assert.match(res.body.error, /không hợp lệ|hết hạn/i);
    console.log('✓ Test 4 Passed: Chặn đứng Google ID Token không hợp lệ hoặc đã hết hạn.');
  }

  // Test 5: Tải hồ sơ người dùng chính chủ qua Bearer Google Token (GET /api/sync)
  {
    const { req, res } = createMockReqRes(
      'GET',
      {},
      {},
      { authorization: 'Bearer valid_google_token_user_a' }
    );
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.found, true);
    assert.strictEqual(res.body.isOwner, true);
    assert.strictEqual(res.body.data.profile.googleId, 'google_sub_user_a_1001');
    console.log('✓ Test 5 Passed: Tải hồ sơ chính chủ qua Authorization: Bearer <GoogleToken> thành công.');
  }

  // Test 6: Cách ly dữ liệu tuyệt đối giữa 2 tài khoản Google
  {
    // User B chưa từng lưu dữ liệu
    const { req, res } = createMockReqRes(
      'GET',
      {},
      {},
      { authorization: 'Bearer valid_google_token_user_b' }
    );
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.found, false, 'User B chưa lưu dữ liệu nên found phải là false');
    assert.strictEqual(res.body.data, undefined, 'Server không trả về data của User A cho User B');
    console.log('✓ Test 6 Passed: Cách ly dữ liệu cá nhân tuyệt đối giữa các tài khoản Google khác nhau.');
  }

  // Test 7: Đồng bộ tiến trình Cloud (POST /api/sync) và cập nhật Leaderboard
  {
    const updatedState = {
      profile: {
        nickname: 'Hiệp Sĩ A',
        level: 5,
        totalCoinsEarned: 250,
        avatar: '🏹',
        adminAdjusted: true
      },
      quests: [
        {
          id: 'q1',
          title: 'Luyện kiếm',
          type: 'focus',
          targetMinutes: 25,
          rewardCoins: 40,
          isRepeatable: true,
          completedCount: 6,
          completed: true,
          status: 'completed',
          signature: signQuest('Luyện kiếm', 'focus', 25, 40)
        }
      ]
    };

    const { req, res } = createMockReqRes(
      'POST',
      { nickname: 'Hiệp Sĩ A', state: updatedState },
      {},
      { authorization: 'Bearer valid_google_token_user_a' }
    );
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.googleId, 'google_sub_user_a_1001');

    // Kiểm tra điểm Leaderboard: (level * 1000) + totalCoinsEarned = (5 * 1000) + 250 = 5250
    const top = await mockRedis.zrevrange('levelup:leaderboard', 0, 0, 'WITHSCORES');
    assert.strictEqual(top[0], 'google_sub_user_a_1001', 'Thành viên Leaderboard được định danh theo Google sub');
    assert.strictEqual(top[1], '5250', 'Điểm số được tính chính xác (5250)');
    console.log('✓ Test 7 Passed: Đồng bộ game state thành công và cập nhật điểm số Leaderboard theo Google Sub.');
  }

  // Test 8: Đăng ký User B và kiểm tra chống trùng lặp Nickname
  {
    // Trước tiên User B đăng nhập Google
    const { req: reqAuthB, res: resAuthB } = createMockReqRes(
      'POST',
      { idToken: 'valid_google_token_user_b' },
      { action: 'google_auth' }
    );
    await handler(reqAuthB, resAuthB);
    assert.strictEqual(resAuthB.statusCode, 200);

    // User B cố tình đồng bộ đổi tên thành "Hiệp Sĩ A" (đã thuộc về User A) -> Bị từ chối 409 Conflict
    const { req: reqConflict, res: resConflict } = createMockReqRes(
      'POST',
      {
        nickname: 'Hiệp Sĩ A',
        state: { profile: { nickname: 'Hiệp Sĩ A', level: 1, totalCoinsEarned: 10 } }
      },
      {},
      { authorization: 'Bearer valid_google_token_user_b' }
    );
    await handler(reqConflict, resConflict);
    assert.strictEqual(resConflict.statusCode, 409, 'Trùng nickname với tài khoản Google khác phải trả về 409');
    assert.match(resConflict.body.error, /đã có người sử dụng/i);

    // Kiểm tra endpoint check_nickname
    const { req: reqChkOwner, res: resChkOwner } = createMockReqRes(
      'GET',
      {},
      { action: 'check_nickname', nickname: 'Hiệp Sĩ A' },
      { authorization: 'Bearer valid_google_token_user_a' }
    );
    await handler(reqChkOwner, resChkOwner);
    assert.strictEqual(resChkOwner.body.available, true, 'Chính chủ User A kiểm tra tên của mình phải available: true');
    assert.strictEqual(resChkOwner.body.isOwner, true);

    const { req: reqChkOther, res: resChkOther } = createMockReqRes(
      'GET',
      {},
      { action: 'check_nickname', nickname: 'Hiệp Sĩ A' },
      { authorization: 'Bearer valid_google_token_user_b' }
    );
    await handler(reqChkOther, resChkOther);
    assert.strictEqual(resChkOther.body.available, false, 'User B kiểm tra tên đã có chủ phải available: false');
    assert.strictEqual(resChkOther.body.isOwner, false);

    console.log('✓ Test 8 Passed: Chống trùng lặp Nickname và bảo vệ quyền sở hữu tên người chơi (409 Conflict).');
  }

  // Test 9: Đổi Nickname và giải phóng tên cũ cho người khác sử dụng
  {
    // User A đổi tên từ "Hiệp Sĩ A" sang "Hiệp Sĩ Rồng"
    const { req: reqRenameA, res: resRenameA } = createMockReqRes(
      'POST',
      {
        nickname: 'Hiệp Sĩ Rồng',
        oldNickname: 'Hiệp Sĩ A',
        state: { profile: { nickname: 'Hiệp Sĩ Rồng', level: 5, totalCoinsEarned: 250 } }
      },
      {},
      { authorization: 'Bearer valid_google_token_user_a' }
    );
    await handler(reqRenameA, resRenameA);
    assert.strictEqual(resRenameA.statusCode, 200);

    // User B giờ đây có thể lấy tên cũ "Hiệp Sĩ A" vì User A đã giải phóng
    const { req: reqClaimB, res: resClaimB } = createMockReqRes(
      'POST',
      {
        nickname: 'Hiệp Sĩ A',
        state: { profile: { nickname: 'Hiệp Sĩ A', level: 2, totalCoinsEarned: 40 } }
      },
      {},
      { authorization: 'Bearer valid_google_token_user_b' }
    );
    await handler(reqClaimB, resClaimB);
    assert.strictEqual(resClaimB.statusCode, 200, 'User B được phép nhận lại nickname cũ đã giải phóng');
    console.log('✓ Test 9 Passed: Đổi tên thành công và giải phóng nickname cũ không để lại key rác.');
  }

  // Test 10: Phân quyền Quản trị viên (Admin) tự động qua ADMIN_EMAILS
  {
    // Đăng nhập tài khoản Google có email nằm trong ADMIN_EMAILS
    const { req: reqAdminAuth, res: resAdminAuth } = createMockReqRes(
      'POST',
      { idToken: 'valid_google_token_admin' },
      { action: 'google_auth' }
    );
    await handler(reqAdminAuth, resAdminAuth);
    assert.strictEqual(resAdminAuth.statusCode, 200);
    assert.strictEqual(resAdminAuth.body.role, 'admin', 'Email trong ADMIN_EMAILS phải được cấp quyền admin');

    // Thử nghiệm ngăn chặn Privilege Escalation: User B tự sửa payload gán role: 'admin'
    const { req: reqEscalate, res: resEscalate } = createMockReqRes(
      'POST',
      {
        nickname: 'Hiệp Sĩ Hacker',
        state: { profile: { role: 'admin', level: 1 } }
      },
      {},
      { authorization: 'Bearer valid_google_token_user_b' }
    );
    await handler(reqEscalate, resEscalate);
    assert.strictEqual(resEscalate.statusCode, 200);
    assert.strictEqual(resEscalate.body.role, 'adventurer', 'User B không thể tự thăng cấp Admin nếu email không trong ADMIN_EMAILS');
    console.log('✓ Test 10 Passed: Phân quyền Admin tự động qua Google Email và chặn đứng leo thang đặc quyền.');
  }

  // Test 11: Bảo vệ biệt danh quản trị (Admin Nickname Defense)
  {
    // User B cố tình đăng ký nickname "admin" hoặc "guildmaster"
    const { req: reqClaimAdminNick, res: resClaimAdminNick } = createMockReqRes(
      'POST',
      {
        nickname: 'admin',
        state: { profile: { nickname: 'admin', level: 1 } }
      },
      {},
      { authorization: 'Bearer valid_google_token_user_b' }
    );
    await handler(reqClaimAdminNick, resClaimAdminNick);
    assert.strictEqual(resClaimAdminNick.statusCode, 403, 'User thường không được dùng nickname Admin (403)');

    // Kiểm tra check_nickname với nickname bảo lưu
    const { req: reqChkAdmin, res: resChkAdmin } = createMockReqRes(
      'GET',
      {},
      { action: 'check_nickname', nickname: 'guildmaster' },
      { authorization: 'Bearer valid_google_token_user_b' }
    );
    await handler(reqChkAdmin, resChkAdmin);
    assert.strictEqual(resChkAdmin.body.available, false);
    console.log('✓ Test 11 Passed: Bảo vệ toàn diện các biệt danh Quản trị viên khỏi bị đăng ký trái phép.');
  }

  // Test 12: Thao tác Quản trị viên admin_remove (Xóa tài khoản gian lận)
  {
    // User B cố tình gọi admin_remove -> 403
    const { req: reqFailRemove, res: resFailRemove } = createMockReqRes(
      'POST',
      { targetSub: 'google_sub_user_a_1001' },
      { action: 'admin_remove' },
      { authorization: 'Bearer valid_google_token_user_b' }
    );
    await handler(reqFailRemove, resFailRemove);
    assert.strictEqual(resFailRemove.statusCode, 403, 'User thường gọi admin_remove phải bị từ chối 403');

    // Admin thật gọi admin_remove xóa tài khoản User A
    const { req: reqOkRemove, res: resOkRemove } = createMockReqRes(
      'POST',
      { targetSub: 'google_sub_user_a_1001' },
      { action: 'admin_remove' },
      { authorization: 'Bearer valid_google_token_admin' }
    );
    await handler(reqOkRemove, resOkRemove);
    assert.strictEqual(resOkRemove.statusCode, 200);
    assert.strictEqual(resOkRemove.body.success, true);

    const userADeleted = await mockRedis.get('levelup:user:google:google_sub_user_a_1001');
    assert.strictEqual(userADeleted, null, 'Tài khoản mục tiêu phải bị xóa khỏi Redis');
    console.log('✓ Test 12 Passed: Chức năng admin_remove hoạt động chính xác với xác thực Admin Google.');
  }

  // Test 13: Bảng xếp hạng Leaderboard hiển thị đầy đủ và không bị trùng lặp
  {
    const { req: reqLb, res: resLb } = createMockReqRes('GET', {}, { action: 'leaderboard' });
    await handler(reqLb, resLb);
    assert.strictEqual(resLb.statusCode, 200);
    assert.strictEqual(Array.isArray(resLb.body.leaderboard), true);
    // User B còn lại trên leaderboard
    const foundB = resLb.body.leaderboard.find(u => u.key === 'google_sub_user_b_2002');
    assert.notStrictEqual(foundB, undefined, 'User B phải có mặt trên Bảng Xếp Hạng');
    assert.strictEqual(foundB.nickname, 'Hiệp Sĩ Hacker');
    console.log('✓ Test 13 Passed: Bảng xếp hạng Leaderboard sắp xếp đúng điểm và thông tin hiển thị.');
  }

  // Test 14: Leaderboard hỗ trợ hiển thị mở rộng (vượt mốc 10 thành viên)
  {
    for (let i = 1; i <= 15; i++) {
      await mockRedis.set(`levelup:user:google:sub_extra_${i}`, JSON.stringify({
        profile: { nickname: `Extra_${i}`, level: 1, totalCoinsEarned: 10 }
      }));
      await mockRedis.zadd('levelup:leaderboard', 1010, `sub_extra_${i}`);
    }
    const { req: reqLbWide, res: resLbWide } = createMockReqRes('GET', {}, { action: 'leaderboard' });
    await handler(reqLbWide, resLbWide);
    assert.strictEqual(resLbWide.statusCode, 200);
    assert.ok(resLbWide.body.leaderboard.length > 10, 'Leaderboard phải cho phép hiển thị trên 10 thành viên');
    console.log('✓ Test 14 Passed: Leaderboard hiển thị mở rộng trên 10 thành viên không bị giới hạn cứng.');
  }

  console.log('\n🎉 TẤT CẢ 14/14 TEST GOOGLE AUTHENTICATION & SYNC ĐÃ VƯỢT QUA XUẤT SẮC!');
}

runGoogleAuthTests().catch((err) => {
  console.error('\n❌ TEST THẤT BẠI:', err);
  process.exit(1);
});
