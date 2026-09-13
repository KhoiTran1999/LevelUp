import assert from 'node:assert';
import fs from 'node:fs';
import handler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  deriveLegitimateBalance,
  verifyIsAdmin
} from '../api/sync.js';

console.log('=== Bắt đầu kiểm thử Toàn diện Hệ Thống Admin Dashboard & Tinh Chỉnh Người Chơi ===\n');

// 1. Mock Redis Store đầy đủ tính năng cho Unit Tests
class MockRedis {
  constructor() {
    this.store = new Map();
    this.sortedSets = new Map();
    this.sets = new Map();
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

  async sadd(key, ...members) {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key);
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) {
        set.add(m);
        added++;
      }
    }
    return added;
  }

  async smembers(key) {
    const set = this.sets.get(key);
    if (!set) return [];
    return Array.from(set);
  }

  async srem(key, ...members) {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const m of members) {
      if (set.delete(m)) removed++;
    }
    return removed;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched = [];
    for (const k of this.store.keys()) {
      if (regex.test(k)) matched.push(k);
    }
    return matched;
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

// Cấu hình môi trường thử nghiệm
process.env.ADMIN_TOKEN = 'secret_admin_token_999';
process.env.ADMIN_EMAILS = 'boss@levelup.rpg,superadmin@levelup.rpg';
process.env.ADMIN_NICKNAMES = 'tong_quan_tri';

const mockRedis = new MockRedis();
setRedisClientForTesting(mockRedis);

setGoogleTokenVerifierForTesting(async (token) => {
  if (token === 'token_admin_boss') {
    return {
      sub: 'google_sub_admin',
      email: 'boss@levelup.rpg',
      name: 'Tổng Quản Trị'
    };
  }
  if (token === 'token_normal_user') {
    return {
      sub: 'google_sub_normal',
      email: 'adventurer@gmail.com',
      name: 'Hiệp Sĩ Tập Sự'
    };
  }
  return null;
});

// =============================================================================
// TEST 1: Bảo mật Phân quyền & RBAC (Chặn truy cập trái phép)
// =============================================================================
async function testAuthorizationSecurity() {
  // 1.1 Người dùng thường hoặc không có token gọi admin_list_users -> 403 Forbidden
  {
    const req = createMockReq({
      method: 'GET',
      query: { action: 'admin_list_users' },
      headers: { authorization: 'Bearer token_normal_user' }
    });
    const res = createMockRes();
    await handler(req, res);
    assert.strictEqual(res.statusCode, 403, 'User thường phải bị từ chối 403 khi gọi admin_list_users');
    assert.ok(res.body.error.includes('Quản trị viên'), 'Thông báo lỗi phải nêu rõ quyền Quản trị viên');
  }

  // 1.2 Người dùng thường gọi admin_update_user -> 403 Forbidden
  {
    const req = createMockReq({
      method: 'POST',
      query: { action: 'admin_update_user' },
      headers: { authorization: 'Bearer token_normal_user' },
      body: { targetSub: 'google_sub_normal', coins: 999999 }
    });
    const res = createMockRes();
    await handler(req, res);
    assert.strictEqual(res.statusCode, 403, 'User thường phải bị từ chối 403 khi gọi admin_update_user');
  }

  // 1.3 Người dùng thường gọi admin_get_user_ledger -> 403 Forbidden
  {
    const req = createMockReq({
      method: 'GET',
      query: { action: 'admin_get_user_ledger', targetSub: 'google_sub_normal' },
      headers: { authorization: 'Bearer token_normal_user' }
    });
    const res = createMockRes();
    await handler(req, res);
    assert.strictEqual(res.statusCode, 403, 'User thường phải bị từ chối 403 khi gọi admin_get_user_ledger');
  }

  // 1.4 Người dùng thường gọi admin_clear_user_ledger -> 403 Forbidden
  {
    const req = createMockReq({
      method: 'POST',
      query: { action: 'admin_clear_user_ledger' },
      headers: { authorization: 'Bearer token_normal_user' },
      body: { targetSub: 'google_sub_normal' }
    });
    const res = createMockRes();
    await handler(req, res);
    assert.strictEqual(res.statusCode, 403, 'User thường phải bị từ chối 403 khi gọi admin_clear_user_ledger');
  }

  // 1.5 Caller sử dụng ADMIN_TOKEN trực tiếp -> verifyIsAdmin trả về true
  {
    const isAdmin = await verifyIsAdmin('secret_admin_token_999', mockRedis, {
      token: 'secret_admin_token_999',
      emails: ['boss@levelup.rpg'],
      nicks: ['tong_quan_tri']
    });
    assert.strictEqual(isAdmin, true, 'ADMIN_TOKEN hợp lệ phải được xác thực là Admin');
  }

  // 1.6 Caller sử dụng Google token của Admin Email -> verifyIsAdmin trả về true
  {
    const isAdmin = await verifyIsAdmin('token_admin_boss', mockRedis, {
      token: 'secret_admin_token_999',
      emails: ['boss@levelup.rpg'],
      nicks: ['tong_quan_tri']
    });
    assert.strictEqual(isAdmin, true, 'Tài khoản có email trong ADMIN_EMAILS phải được xác thực là Admin');
  }

  console.log('✓ Test 1: Bảo mật Phân quyền (RBAC) chặn đứng 100% người dùng không có thẩm quyền (403 Forbidden).');
}

// =============================================================================
// TEST 2: Liệt kê Danh Sách Người Chơi (admin_list_users) & KPI Summary
// =============================================================================
async function testAdminListUsers() {
  // Khởi tạo 3 tài khoản trong Mock Redis
  const adminUser = {
    profile: {
      sub: 'google_sub_admin',
      nickname: 'Tổng_Quản_Trị',
      email: 'boss@levelup.rpg',
      role: 'admin',
      level: 25,
      coins: 5000,
      totalCoinsEarned: 10000,
      isCheater: false
    },
    ledger: [{ id: 'tx_1', amount: 100, type: 'earn', title: 'Thưởng đầu' }]
  };

  const normalUser = {
    profile: {
      sub: 'google_sub_normal',
      nickname: 'Hiệp_Sĩ_01',
      email: 'adventurer@gmail.com',
      role: 'adventurer',
      level: 3,
      coins: 45,
      totalCoinsEarned: 80,
      isCheater: false
    },
    ledger: [
      { id: 'tx_2', amount: 15, type: 'earn', title: 'Nhiệm vụ 1' },
      { id: 'tx_3', amount: 10, type: 'spend', title: 'Đổi trà sữa' }
    ]
  };

  const cheaterUser = {
    profile: {
      sub: 'google_sub_cheater',
      nickname: 'Hacker_Fake',
      email: 'hacker@blackhat.com',
      role: 'adventurer',
      level: 99,
      coins: 0,
      totalCoinsEarned: 0,
      isCheater: true,
      title: 'Kẻ Gian Lận ⚠️'
    },
    ledger: []
  };

  await mockRedis.set('levelup:user:google:google_sub_admin', JSON.stringify(adminUser));
  await mockRedis.set('levelup:user:google:google_sub_normal', JSON.stringify(normalUser));
  await mockRedis.set('levelup:user:google:google_sub_cheater', JSON.stringify(cheaterUser));

  await mockRedis.sadd('levelup:all_users', 'google_sub_admin', 'google_sub_normal', 'google_sub_cheater');
  await mockRedis.zadd('levelup:leaderboard', (25 * 1000) + 5000, 'google_sub_admin');
  await mockRedis.zadd('levelup:leaderboard', (3 * 1000) + 45, 'google_sub_normal');
  await mockRedis.zadd('levelup:cheaters', Date.now(), 'google_sub_cheater');

  const req = createMockReq({
    method: 'GET',
    query: { action: 'admin_list_users' },
    headers: { authorization: 'Bearer secret_admin_token_999' }
  });
  const res = createMockRes();
  await handler(req, res);

  assert.strictEqual(res.statusCode, 200, 'Admin lấy danh sách người chơi phải trả về 200');
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.count, 3, 'Danh sách phải chứa đúng 3 người chơi');

  const users = res.body.users;
  // Admin phải được sắp xếp lên vị trí đầu tiên
  assert.strictEqual(users[0].role, 'admin', 'Người dùng có vai trò Admin phải được đưa lên đầu danh sách');
  assert.strictEqual(users[0].nickname, 'Tổng_Quản_Trị');

  // Kiểm tra thuộc tính người chơi bình thường
  const uNormal = users.find(u => u.sub === 'google_sub_normal');
  assert.ok(uNormal, 'Phải tìm thấy người chơi thông thường');
  assert.strictEqual(uNormal.level, 3);
  assert.strictEqual(uNormal.coins, 45);
  assert.strictEqual(uNormal.ledgerCount, 2, 'Số lượng giao dịch ledger phải là 2');

  // Kiểm tra thuộc tính người chơi gian lận
  const uCheater = users.find(u => u.sub === 'google_sub_cheater');
  assert.ok(uCheater, 'Phải tìm thấy người chơi gian lận');
  assert.strictEqual(uCheater.isCheater, true);

  console.log('✓ Test 2: Liệt kê người chơi (admin_list_users) đầy đủ thông tin, đếm chuẩn ledger và sắp xếp admin ưu tiên.');
}

// =============================================================================
// TEST 3: Tinh Chỉnh Vàng, Level, EXP & Kỷ Luật (admin_update_user)
// =============================================================================
async function testAdminUpdateUser() {
  // 3.1 Admin tăng Vàng từ 45 lên 1,500 Vàng và Level từ 3 lên 12 cho Hiệp sĩ
  const req = createMockReq({
    method: 'POST',
    query: { action: 'admin_update_user' },
    headers: { authorization: 'Bearer secret_admin_token_999' },
    body: {
      targetSub: 'google_sub_normal',
      coins: 1500,
      level: 12,
      exp: 350,
      reason: 'Admin thưởng sự kiện tháng 9'
    }
  });
  const res = createMockRes();
  await handler(req, res);

  assert.strictEqual(res.statusCode, 200, 'Tinh chỉnh người chơi phải thành công với 200');
  assert.strictEqual(res.body.success, true);

  // Kiểm tra dữ liệu được lưu trong Redis
  const rawUpdated = await mockRedis.get('levelup:user:google:google_sub_normal');
  assert.ok(rawUpdated, 'Phải có dữ liệu người chơi trong Redis');
  const updatedUser = JSON.parse(rawUpdated);

  assert.strictEqual(updatedUser.profile.coins, 1500, 'Số Vàng mới phải là 1,500');
  assert.strictEqual(updatedUser.profile.level, 12, 'Cấp độ mới phải là 12');
  assert.strictEqual(updatedUser.profile.exp, 350, 'EXP mới phải là 350');
  assert.strictEqual(updatedUser.profile.adminAdjusted, true, 'Phải có cờ adminAdjusted: true');

  // Kiểm tra Audit Log trong Ledger
  assert.ok(updatedUser.ledger.length >= 3, 'Ledger phải có thêm bản ghi kiểm toán mới');
  const topEntry = updatedUser.ledger[0];
  assert.strictEqual(topEntry.category, 'admin', 'Category bản ghi kiểm toán phải là admin');
  assert.strictEqual(topEntry.title, '👑 Quản Trị Viên điều chỉnh');
  assert.ok(topEntry.description.includes('Admin thưởng sự kiện tháng 9'), 'Mô tả phải chứa lý do admin nhập');

  // Kiểm tra Leaderboard được đồng bộ: (12 * 1000) + 1500 = 13500
  const newScore = await mockRedis.zscore('levelup:leaderboard', 'google_sub_normal');
  assert.strictEqual(newScore, 13500, 'Điểm số Leaderboard phải được cập nhật tương ứng cấp độ và số vàng mới');

  // 3.2 Admin xử phạt chuyển sang trạng thái gian lận (isCheater: true)
  const reqCheat = createMockReq({
    method: 'POST',
    query: { action: 'admin_update_user' },
    headers: { authorization: 'Bearer secret_admin_token_999' },
    body: {
      targetSub: 'google_sub_normal',
      isCheater: true,
      reason: 'Phát hiện hành vi gian lận giả lập điểm'
    }
  });
  const resCheat = createMockRes();
  await handler(reqCheat, resCheat);

  const rawCheated = await mockRedis.get('levelup:user:google:google_sub_normal');
  const cheatedUser = JSON.parse(rawCheated);
  assert.strictEqual(cheatedUser.profile.isCheater, true);
  assert.strictEqual(cheatedUser.profile.title, 'Kẻ Gian Lận ⚠️');

  const lbScore = await mockRedis.zscore('levelup:leaderboard', 'google_sub_normal');
  assert.strictEqual(lbScore, null, 'Kẻ gian lận phải bị loại khỏi bảng xếp hạng');
  const cheaterScore = await mockRedis.zscore('levelup:cheaters', 'google_sub_normal');
  assert.ok(cheaterScore !== null, 'Kẻ gian lận phải được đưa vào danh sách đen (levelup:cheaters)');

  console.log('✓ Test 3: Tinh chỉnh Vàng, Cấp độ, EXP ghi nhận audit log và đồng bộ Leaderboard/Cheater chuẩn xác.');
}

// =============================================================================
// TEST 4: Tương Thích Anti-Cheat Engine (deriveLegitimateBalance)
// =============================================================================
function testAntiCheatCompatibility() {
  // Trường hợp 1: Người dùng thường tự sửa coins lên 5,000 trên DevTools không qua Admin
  {
    const stateNormalTamper = {
      profile: {
        coins: 5000,
        totalCoinsEarned: 5000,
        level: 1,
        exp: 0,
        isCheater: false
      },
      quests: [],
      rewards: [],
      ledger: []
    };
    const balance = deriveLegitimateBalance(stateNormalTamper, null);
    assert.strictEqual(balance.tampered, true, 'Tự sửa coins vượt trần phải bị phát hiện tampered');
    assert.strictEqual(balance.coins, 0, 'Tự sửa coins mà không có nhiệm vụ AI duyệt phải bị Anti-Cheat tịch thu về 0');
    assert.strictEqual(balance.title, 'Kẻ Gian Lận ⚠️', 'Phải bị gắn nhãn Kẻ Gian Lận');
  }

  // Trường hợp 2: Người dùng đã được Admin tinh chỉnh (adminAdjusted: true)
  {
    const stateAdminAdjusted = {
      profile: {
        coins: 1500,
        totalCoinsEarned: 1500,
        level: 12,
        exp: 350,
        isCheater: false,
        adminAdjusted: true
      },
      quests: [],
      rewards: [],
      ledger: [
        {
          id: 'admin_adj_1',
          type: 'earn',
          category: 'admin',
          amount: 1455,
          title: '👑 Quản Trị Viên điều chỉnh'
        }
      ]
    };
    const balance = deriveLegitimateBalance(stateAdminAdjusted, null);
    assert.strictEqual(balance.coins, 1500, 'Số Vàng do Admin cấp (adminAdjusted) phải được giữ nguyên 100%');
    assert.strictEqual(balance.totalCoinsEarned, 1500, 'TotalCoinsEarned do Admin cấp phải được giữ nguyên');
  }

  console.log('✓ Test 4: Tương thích Anti-Cheat Engine miễn trừ hợp lệ cho các tài khoản được Admin điều chỉnh.');
}

// =============================================================================
// TEST 5: Xem & Xóa Lịch Sử Thu Chi (admin_get_user_ledger & admin_clear_user_ledger)
// =============================================================================
async function testLedgerManagement() {
  const userWithLedger = {
    profile: {
      sub: 'google_sub_ledger_test',
      nickname: 'Hiệp_Sĩ_Ledger',
      email: 'ledger@levelup.rpg',
      role: 'adventurer',
      level: 5,
      coins: 200,
      totalCoinsEarned: 300
    },
    ledger: [
      { id: 'tx_a', amount: 50, type: 'earn', title: 'Luyện kiếm buổi sáng' },
      { id: 'tx_b', amount: 20, type: 'spend', title: 'Mua bình máu' },
      { id: 'tx_c', amount: 30, type: 'earn', title: 'Giải đố hang động' }
    ]
  };

  await mockRedis.set('levelup:user:google:google_sub_ledger_test', JSON.stringify(userWithLedger));

  // 5.1 Admin lấy danh sách giao dịch
  {
    const req = createMockReq({
      method: 'GET',
      query: { action: 'admin_get_user_ledger', targetSub: 'google_sub_ledger_test' },
      headers: { authorization: 'Bearer secret_admin_token_999' }
    });
    const res = createMockRes();
    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.ledger.length, 3, 'Phải lấy được đủ 3 giao dịch');
    assert.strictEqual(res.body.ledger[0].id, 'tx_a');
  }

  // 5.2 Admin xóa 1 giao dịch cụ thể (tx_b)
  {
    const req = createMockReq({
      method: 'POST',
      query: { action: 'admin_clear_user_ledger' },
      headers: { authorization: 'Bearer secret_admin_token_999' },
      body: { targetSub: 'google_sub_ledger_test', entryId: 'tx_b' }
    });
    const res = createMockRes();
    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.removedId, 'tx_b');
    assert.strictEqual(res.body.remainingCount, 2);

    const raw = await mockRedis.get('levelup:user:google:google_sub_ledger_test');
    const u = JSON.parse(raw);
    assert.strictEqual(u.ledger.length, 2, 'Số lượng giao dịch trong Redis phải còn 2');
    assert.ok(!u.ledger.some(item => item.id === 'tx_b'), 'Giao dịch tx_b phải không còn tồn tại');
  }

  // 5.2b Admin xóa nhiều giao dịch cùng lúc bằng danh sách tích chọn (entryIds: ['tx_c'])
  {
    const req = createMockReq({
      method: 'POST',
      query: { action: 'admin_clear_user_ledger' },
      headers: { authorization: 'Bearer secret_admin_token_999' },
      body: { targetSub: 'google_sub_ledger_test', entryIds: ['tx_c'] }
    });
    const res = createMockRes();
    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.removedCount, 1);
    assert.strictEqual(res.body.remainingCount, 1);

    const raw = await mockRedis.get('levelup:user:google:google_sub_ledger_test');
    const u = JSON.parse(raw);
    assert.strictEqual(u.ledger.length, 1, 'Số lượng giao dịch trong Redis phải còn 1');
    assert.ok(!u.ledger.some(item => item.id === 'tx_c'), 'Giao dịch tx_c phải không còn tồn tại');
  }

  // 5.3 Admin xóa sạch toàn bộ lịch sử (entryId = 'all')
  {
    const req = createMockReq({
      method: 'POST',
      query: { action: 'admin_clear_user_ledger' },
      headers: { authorization: 'Bearer secret_admin_token_999' },
      body: { targetSub: 'google_sub_ledger_test', entryId: 'all' }
    });
    const res = createMockRes();
    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.clearedAll, true);

    const raw = await mockRedis.get('levelup:user:google:google_sub_ledger_test');
    const u = JSON.parse(raw);
    assert.strictEqual(u.ledger.length, 1, 'Ledger sau khi dọn dẹp chỉ còn 1 bản ghi hệ thống');
    assert.ok(u.ledger[0].description.includes('Quản trị viên dọn dẹp'), 'Bản ghi duy nhất phải là thông báo dọn dẹp của Admin');
  }

  console.log('✓ Test 5: Xem và xóa lịch sử thu chi (xóa từng bản ghi hoặc xóa sạch toàn bộ) hoạt động hoàn hảo.');
}

// =============================================================================
// TEST 6: Kiểm Tra Phần Tử Giao Diện HTML & Các Hàm Client Javascript
// =============================================================================
function testFrontendDomAndClientFunctions() {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const appJs = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

  // Kiểm tra HTML các nút Navbar & Tab Admin
  assert.ok(html.includes('id="nav-tab-admin"'), 'Phải có nút Tab Admin trên Desktop Navbar');
  assert.ok(html.includes('id="mobile-nav-admin"'), 'Phải có nút Tab Admin trên Mobile Bottom Bar');
  assert.ok(html.includes('id="tab-admin"'), 'Phải có section #tab-admin');

  // Kiểm tra 4 thẻ KPI Stats
  assert.ok(html.includes('id="admin-stat-total-users"'), 'Phải có thẻ KPI tổng người chơi');
  assert.ok(html.includes('id="admin-stat-total-coins"'), 'Phải có thẻ KPI tổng vàng');
  assert.ok(html.includes('id="admin-stat-avg-level"'), 'Phải có thẻ KPI cấp độ trung bình');
  assert.ok(html.includes('id="admin-stat-cheaters-count"'), 'Phải có thẻ KPI số kẻ gian lận');

  // Kiểm tra bảng danh sách & tìm kiếm (Bảng cho Desktop/iPad và Thẻ Cards cho Mobile)
  assert.ok(html.includes('id="admin-search-users"'), 'Phải có ô tìm kiếm người chơi');
  assert.ok(html.includes('id="admin-users-tbody"'), 'Phải có tbody danh sách người chơi cho Desktop/iPad');
  assert.ok(html.includes('id="admin-users-cards"'), 'Phải có container dạng thẻ (Cards) tối ưu cho Mobile');
  assert.ok(appJs.includes('cardsContainer'), 'renderAdminDashboard phải hỗ trợ render dạng thẻ cho thiết bị di động');

  // Kiểm tra Modal tinh chỉnh người chơi
  assert.ok(html.includes('id="modal-admin-edit-user"'), 'Phải có modal tinh chỉnh người chơi');
  assert.ok(html.includes('id="admin-edit-coins"'), 'Phải có input chỉnh sửa Vàng');
  assert.ok(html.includes('id="admin-edit-level"'), 'Phải có input chỉnh sửa Level');
  assert.ok(html.includes('id="admin-edit-reason"'), 'Phải có input nhập lý do điều chỉnh');

  // Kiểm tra Modal lịch sử thu chi & Tính năng tích chọn hàng loạt
  assert.ok(html.includes('id="modal-admin-user-ledger"'), 'Phải có modal xem và xóa lịch sử thu chi');
  assert.ok(html.includes('id="admin-ledger-container"'), 'Phải có container chứa các dòng giao dịch');
  assert.ok(html.includes('id="btn-admin-purge-ledger"'), 'Phải có nút xóa sạch toàn bộ lịch sử');
  assert.ok(html.includes('id="admin-ledger-select-all"'), 'Phải có checkbox chọn tất cả giao dịch');
  assert.ok(html.includes('id="admin-ledger-bulk-bar"'), 'Phải có thanh tác vụ hàng loạt khi tích chọn');
  assert.ok(html.includes('id="btn-admin-delete-selected"'), 'Phải có nút xóa các mục đã chọn');

  // Kiểm tra không có nút Đóng bị trùng lặp trong modal lịch sử
  const ledgerModalSlice = html.substring(html.indexOf('id="modal-admin-user-ledger"'), html.indexOf('id="toast-container"'));
  const closeBtnMatches = ledgerModalSlice.match(/Đóng/g) || [];
  assert.strictEqual(closeBtnMatches.length, 1, 'Modal lịch sử thu chi chỉ được có đúng 1 nút Đóng');

  // Kiểm tra Javascript functions trong app.js
  assert.ok(appJs.includes('function updateAdminNavVisibility()'), 'Phải có hàm updateAdminNavVisibility');
  assert.ok(appJs.includes("mobileNavAdmin.classList.toggle('flex', isAdmin)"), 'updateAdminNavVisibility phải toggle class flex để nút không bị nằm ngang trên mobile');
  assert.ok(appJs.includes('async function fetchAdminUsers()'), 'Phải có hàm fetchAdminUsers');
  assert.ok(appJs.includes('function renderAdminDashboard()'), 'Phải có hàm renderAdminDashboard');
  assert.ok(appJs.includes('function openAdminEditUserModal('), 'Phải có hàm openAdminEditUserModal');
  assert.ok(appJs.includes('async function submitAdminUserEdit()'), 'Phải có hàm submitAdminUserEdit');
  assert.ok(appJs.includes('async function openAdminUserLedgerModal('), 'Phải có hàm openAdminUserLedgerModal');
  assert.ok(appJs.includes('function toggleAdminLedgerSelectAll('), 'Phải có hàm toggleAdminLedgerSelectAll');
  assert.ok(appJs.includes('function onAdminLedgerItemCheck('), 'Phải có hàm onAdminLedgerItemCheck');
  assert.ok(appJs.includes('function clearAdminLedgerSelection('), 'Phải có hàm clearAdminLedgerSelection');
  assert.ok(appJs.includes('async function adminDeleteSelectedLedgerEntries('), 'Phải có hàm adminDeleteSelectedLedgerEntries');
  assert.ok(appJs.includes('async function adminDeleteLedgerEntry('), 'Phải có hàm adminDeleteLedgerEntry');
  assert.ok(appJs.includes('async function adminPurgeUserLedger()'), 'Phải có hàm adminPurgeUserLedger');
  assert.ok(appJs.includes('async function adminDeleteUser('), 'Phải có hàm adminDeleteUser');

  // Kiểm tra liên kết vào switchTab
  assert.ok(appJs.includes("tabId === 'admin'"), 'switchTab phải xử lý trường hợp tabId admin');

  console.log('✓ Test 6: Kiểm tra cấu trúc DOM HTML và các hàm xử lý Javascript phía Client đầy đủ 100%.');
}

// Chạy toàn bộ các bài kiểm thử
await testAuthorizationSecurity();
await testAdminListUsers();
await testAdminUpdateUser();
testAntiCheatCompatibility();
await testLedgerManagement();
testFrontendDomAndClientFunctions();

console.log('\n🎉 TẤT CẢ 6/6 BỘ KIỂM THỬ ADMIN DASHBOARD & TINH CHỈNH VÀNG/LEVEL ĐÃ VƯỢT QUA XUẤT SẮC!');
