import assert from 'node:assert';
import syncHandler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  deriveLegitimateBalance,
  checkRateLimit,
  getAdminConfig,
  signQuest,
  verifyQuestSignature,
  signReward,
  verifyRewardSignature,
  deriveTitleForLevel
} from '../api/sync.js';
import aiHandler from '../api/ai.js';

// In-Memory Mock Redis
class MockRedis {
  constructor() {
    this.store = new Map();
    this.sortedSets = new Map();
    this.counters = new Map();
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

  async incr(key) {
    const cur = (this.counters.get(key) || 0) + 1;
    this.counters.set(key, cur);
    return cur;
  }

  async expire() {
    return 1;
  }
}

function createMockReqRes(method, body = {}, query = {}, headers = {}) {
  const req = {
    method,
    body,
    query,
    headers: { ...headers },
    socket: { remoteAddress: '127.0.0.1' }
  };
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
  return { req, res };
}

console.log('=== Bắt đầu kiểm thử toàn diện 5 bản vá bảo mật (Security Hardening Tests) ===\n');

const mockRedis = new MockRedis();
setRedisClientForTesting(mockRedis);

// Mock Google Token Verifier
setGoogleTokenVerifierForTesting(async (token) => {
  if (token === 'valid_user_token') {
    return {
      sub: 'google_user_sub_101',
      email: 'user101@gmail.com',
      name: 'Tester An Toàn',
      picture: ''
    };
  }
  if (token === 'valid_admin_token') {
    return {
      sub: 'google_admin_sub_999',
      email: 'admin_official@gmail.com',
      name: 'Admin Chân Chính',
      picture: ''
    };
  }
  return null;
});

// Setup mock session in Redis
await mockRedis.set(
  'levelup:session:valid_session_token_xyz',
  JSON.stringify({
    sub: 'google_user_sub_101',
    email: 'user101@gmail.com',
    name: 'Tester An Toàn'
  })
);

// ============================================================
// 1. Kiểm thử: Khóa /api/ai đối với request chưa đăng nhập
// ============================================================
{
  const { req, res } = createMockReqRes('POST', {
    action: 'evaluate_quest',
    payload: { title: 'Đọc sách' }
  });
  await aiHandler(req, res);
  assert.strictEqual(res.statusCode, 401, 'Request không có token vào /api/ai phải trả về 401 Unauthorized');
  assert.match(res.body.error, /Cần đăng nhập tài khoản/i);
  console.log('✓ Test 1: Khóa /api/ai thành công, chặn đứng kẻ xấu gọi chùa API AI khi chưa đăng nhập (401).');
}

// ============================================================
// 2. Kiểm thử: Cho phép /api/ai khi có Session Token / Google Token
// ============================================================
{
  // Lưu ý: callAI sẽ báo lỗi nếu không có OpenAI API key, nhưng phải qua được lớp xác thực 401
  const { req, res } = createMockReqRes(
    'POST',
    { action: 'unknown_action' },
    {},
    { authorization: 'Bearer valid_session_token_xyz' }
  );
  await aiHandler(req, res);
  assert.notStrictEqual(res.statusCode, 401, 'User có sessionToken hợp lệ phải vượt qua lớp bảo vệ xác thực');
  assert.strictEqual(res.statusCode, 400, 'Action không xác định trả về 400 đúng quy chuẩn');
  console.log('✓ Test 2: Người dùng có phiên đăng nhập hợp lệ được phép truy cập /api/ai bình thường.');
}

// ============================================================
// 3. Kiểm thử: Chống Bypass Admin khi ADMIN_TOKEN chưa cấu hình (Empty String)
// ============================================================
{
  // Giả lập môi trường ADMIN_TOKEN và ADMIN_EMAILS không được set
  delete process.env.ADMIN_TOKEN;
  delete process.env.ADMIN_EMAILS;

  // Kẻ tấn công gọi admin_remove với token rỗng
  const { req, res } = createMockReqRes('POST', { targetSub: 'google_user_sub_101' }, { action: 'admin_remove' });
  await syncHandler(req, res);
  assert.strictEqual(res.statusCode, 403, 'Kẻ tấn công không thể bypass quyền Admin khi ADMIN_TOKEN rỗng (403)');
  assert.match(res.body.error, /Chỉ Quản trị viên/i);
  console.log('✓ Test 3: Khắc phục hoàn toàn lỗi bypass Admin khi ADMIN_TOKEN rỗng, chặn đứng lệnh admin_remove trái phép.');
}

// ============================================================
// 4. Kiểm thử: Anti-Cheat Level - Chặn đứng hành vi hack Level 999,999
// ============================================================
{
  const existingState = {
    profile: { level: 2, totalCoinsEarned: 50, coins: 50 }
  };

  const hackedState = {
    profile: { level: 999999, totalCoinsEarned: 100, coins: 100 },
    quests: [],
    inventory: []
  };

  const balance = deriveLegitimateBalance(hackedState, existingState);
  assert.strictEqual(balance.tampered, true, 'Phải phát hiện can thiệp hack level');
  assert.ok(balance.level <= 4, `Level phải bị giới hạn về mức tăng hợp lý (hiện tại: ${balance.level})`);
  assert.notStrictEqual(balance.level, 999999, 'Level không thể là 999,999');
  console.log(`✓ Test 4: Chặn đứng hack Level 999,999 thành công, cưỡng chế level về mức hợp lệ (${balance.level}).`);
}

// ============================================================
// 5. Kiểm thử: Anti-Cheat Quests - Chặn đứng bơm 1,000 quest giả để farm Vàng
// ============================================================
{
  const existingState = {
    profile: { level: 3, totalCoinsEarned: 100, coins: 50 }
  };

  // Kẻ gian tạo 500 quest giả với 100 Vàng mỗi quest
  const forgedQuests = [];
  for (let i = 0; i < 500; i++) {
    forgedQuests.push({
      id: `fake_${i}`,
      rewardCoins: 100, // Cố tình vượt trần 40
      completed: true
    });
  }

  const hackedState = {
    profile: { level: 3, totalCoinsEarned: 50000, coins: 50000 },
    quests: forgedQuests,
    inventory: []
  };

  const balance = deriveLegitimateBalance(hackedState, existingState);
  assert.strictEqual(balance.tampered, true, 'Phải phát hiện can thiệp Vàng từ quest giả');
  // Với existingTotal = 100, mức tăng tối đa cho phép là existingTotal + 500 = 600
  assert.ok(balance.totalCoinsEarned <= 600, `Tổng Vàng phải bị chặn dưới trần 600 (hiện tại: ${balance.totalCoinsEarned})`);
  console.log(`✓ Test 5: Chặn đứng bơm quest giả, tổng Vàng bị kẹp cứng ở mức trần an toàn (${balance.totalCoinsEarned} Vàng).`);
}

// ============================================================
// 6. Kiểm thử: Rate Limiting
// ============================================================
{
  const rateLimitRedis = new MockRedis();
  let blocked = false;
  // Giới hạn 5 reqs
  for (let i = 0; i < 7; i++) {
    const allowed = await checkRateLimit(rateLimitRedis, 'test_user', 5, 60);
    if (!allowed) {
      blocked = true;
      break;
    }
  }
  assert.strictEqual(blocked, true, 'Hệ thống phải chặn khi vượt quá giới hạn rate limit');
  console.log('✓ Test 6: Bộ lọc Rate Limiting sliding window bảo vệ hệ thống khỏi tấn công dồn dập (DoS).');
}

// ============================================================
// 7. Kiểm thử: Che giấu chi tiết lỗi ở môi trường production
// ============================================================
{
  process.env.NODE_ENV = 'production';
  // Mock Redis bị lỗi
  setRedisClientForTesting({
    status: 'ready',
    async zrevrange() {
      throw new Error('redis://default:supersecretpassword@redis.internal.net:6379 ECONNREFUSED');
    }
  });

  const { req, res } = createMockReqRes('GET', {}, { action: 'leaderboard' });
  await syncHandler(req, res);
  assert.strictEqual(res.statusCode, 500);
  assert.strictEqual(res.body.details, undefined, 'Môi trường production tuyệt đối không được lộ details err.message');
  console.log('✓ Test 7: Che giấu thông tin lỗi nhạy cảm trong môi trường Production thành công.');
  process.env.NODE_ENV = 'test';
  setRedisClientForTesting(mockRedis);
}

// ============================================================
// 8. Kiểm thử: Chữ ký số HMAC cho Nhiệm vụ (Bất khả xâm phạm)
// ============================================================
{
  const questTitle = 'Học Lập Trình TypeScript Chuyên Sâu';
  const validSig = signQuest(questTitle, 'focus', 50, 20);

  // 8.1 Nhiệm vụ có chữ ký hợp lệ -> Được công nhận trọn vẹn
  const legitQuest = {
    id: 'q_genuine',
    title: questTitle,
    type: 'focus',
    targetMinutes: 50,
    rewardCoins: 20,
    status: 'completed',
    signature: validSig
  };
  assert.strictEqual(verifyQuestSignature(legitQuest), true, 'Chữ ký hợp lệ phải được xác thực thành công');

  // 8.2 Người dùng mở DevTools sửa rewardCoins từ 20 lên 100 Vàng
  const hackedCoinsQuest = { ...legitQuest, rewardCoins: 100 };
  assert.strictEqual(verifyQuestSignature(hackedCoinsQuest), false, 'Chữ ký phải bị sai khi sửa rewardCoins');

  // 8.3 Người dùng mở DevTools sửa targetMinutes từ 50 xuống 5 phút
  const hackedMinutesQuest = { ...legitQuest, targetMinutes: 5 };
  assert.strictEqual(verifyQuestSignature(hackedMinutesQuest), false, 'Chữ ký phải bị sai khi sửa targetMinutes');

  // 8.4 deriveLegitimateBalance tịch thu 100% tiền thưởng của nhiệm vụ gian lận
  const hackedState = {
    profile: { level: 1, totalCoinsEarned: 120, coins: 120 },
    quests: [hackedCoinsQuest],
    inventory: []
  };
  const result = deriveLegitimateBalance(hackedState);
  assert.strictEqual(result.tampered, true, 'Hệ thống phải phát hiện gian lận');
  assert.strictEqual(result.totalCoinsEarned, 20, 'Nhiệm vụ bị sửa thưởng bị tước toàn bộ tiền, chỉ còn 20 Vàng khởi đầu tân binh');

  // 8.5 Script tự tạo nhiệm vụ không qua AI (chữ ký rỗng) -> Nhận đúng 0 Vàng
  const unverifiedScriptQuest = {
    id: 'script_fake_quest',
    title: 'Hack Nhiệm Vụ Tự Chế',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 40,
    status: 'completed'
  };
  assert.strictEqual(verifyQuestSignature(unverifiedScriptQuest), false, 'Nhiệm vụ không có chữ ký AI phải bị từ chối');
  const scriptHackedState = {
    profile: { level: 1, totalCoinsEarned: 60, coins: 60 },
    quests: [unverifiedScriptQuest],
    inventory: []
  };
  const scriptResult = deriveLegitimateBalance(scriptHackedState);
  assert.strictEqual(scriptResult.tampered, true);
  assert.strictEqual(scriptResult.totalCoinsEarned, 20, 'Nhiệm vụ tự chế không qua AI không nhận được bất kỳ đồng Vàng nào');
  console.log('✓ Test 8: Chữ ký số HMAC bảo vệ Vàng và Thời gian của Nhiệm vụ 100% bất khả xâm phạm (Zero-Trust).');
}

// ============================================================
// 9. Kiểm thử: Chữ ký số HMAC cho Cửa hàng & Kho đồ (Chống sửa giá 1 Vàng)
// ============================================================
{
  const rewardName = 'Chơi Game 1 Tiếng Thả Ga';
  const validSig = signReward(rewardName, 80, 'epic');

  const legitItem = {
    id: 'shop_epic_game',
    name: rewardName,
    price: 80,
    tier: 'epic',
    signature: validSig
  };
  assert.strictEqual(verifyRewardSignature(legitItem), true);

  // Kẻ gian sửa giá món đồ Epic từ 80 Vàng xuống 1 Vàng trong DevTools
  const hackedItem = { ...legitItem, price: 1 };
  assert.strictEqual(verifyRewardSignature(hackedItem), false, 'Phải phát hiện chữ ký giả khi sửa giá món quà');

  // Khi tính toán số dư, server cưỡng chế giá tối thiểu theo Tier Epic (80 Vàng)
  const stateWithHackedPurchase = {
    profile: { level: 2, totalCoinsEarned: 100, coins: 99 },
    quests: [],
    inventory: [hackedItem]
  };
  const result = deriveLegitimateBalance(stateWithHackedPurchase);
  assert.strictEqual(result.tampered, true);
  // Total earned: 20 (base). Total spent: 80 (restored price). Current coins: max(0, 20 - 80) = 0.
  assert.strictEqual(result.coins, 0, 'Số Vàng phải bị trừ đúng theo giá trị thực của vật phẩm');
  console.log('✓ Test 9: Chữ ký số HMAC bảo vệ Giá Cửa Hàng, chặn đứng thủ đoạn sửa giá quà xuống 1 Vàng.');
}

// ============================================================
// 10. Kiểm thử: Bảo vệ Danh hiệu (Title) & Chống bơm Ledger ảo
// ============================================================
{
  // 10.1 Danh hiệu tính trực tiếp từ Level đã xác thực, không phụ thuộc client
  assert.strictEqual(deriveTitleForLevel(1), 'Tân Binh Cấp 1');
  assert.strictEqual(deriveTitleForLevel(6), 'Chiến Binh Kiên Trì');
  assert.strictEqual(deriveTitleForLevel(10), 'Chuyên Gia Tập Trung');
  assert.strictEqual(deriveTitleForLevel(15), 'Bậc Thầy Năng Suất');
  assert.strictEqual(deriveTitleForLevel(20), 'Huyền Thoại Kỷ Luật');

  // 10.2 Bơm 999,999 Vàng vào Ledger không thể đánh lừa được Server
  const fakeLedgerState = {
    profile: { level: 1, totalCoinsEarned: 999999, coins: 999999, title: 'Huyền Thoại Kỷ Luật' },
    quests: [],
    inventory: [],
    ledger: [
      { id: 'fake_led_1', type: 'earn', amount: 999999, description: 'Hack vàng' }
    ]
  };
  const result = deriveLegitimateBalance(fakeLedgerState);
  assert.strictEqual(result.tampered, true);
  assert.strictEqual(result.totalCoinsEarned, 20, 'Ledger ảo bị loại bỏ hoàn toàn, không thể bơm Vàng');
  assert.strictEqual(result.title, 'Kẻ Gian Lận ⚠️', 'Gian lận ledger ảo phải bị tước danh hiệu thành Kẻ Gian Lận ⚠️');
  console.log('✓ Test 10: Server quản lý độc quyền Danh hiệu và vô hiệu hóa hoàn toàn hành vi bơm Ledger ảo.');
}

// ============================================================
// 11. Kiểm thử: Hệ thống xử phạt gian lận toàn diện (Anti-Cheat Sanctions)
// ============================================================
{
  // Giả lập user đã có trên Leaderboard với điểm cao
  await mockRedis.zadd('levelup:leaderboard', 5000, 'google_user_sub_101');

  // Kẻ gian cố tình gửi payload đã can thiệp Vàng (99,999 Vàng)
  const tamperedHackerState = {
    profile: {
      nickname: 'HackerPro',
      level: 2,
      totalCoinsEarned: 99999,
      coins: 99999,
      title: 'Huyền Thoại Kỷ Luật'
    },
    quests: [],
    inventory: [],
    ledger: []
  };

  const { req, res } = createMockReqRes(
    'POST',
    {
      nickname: 'HackerPro',
      token: 'valid_session_token_xyz',
      state: tamperedHackerState
    },
    {},
    { authorization: 'Bearer valid_session_token_xyz' }
  );

  await syncHandler(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.tampered, true, 'Server phải phát hiện gian lận');
  assert.ok(res.body.fine > 0, 'Server phải phạt trừ Vàng');
  assert.strictEqual(res.body.title, 'Kẻ Gian Lận ⚠️', 'Danh hiệu phải bị đổi thành Kẻ Gian Lận ⚠️');
  assert.match(res.body.penalty, /CẢNH BÁO GIAN LẬN/i, 'Phải gửi thông điệp phạt về cho client');

  // Kiểm tra Redis:
  // 1. Kẻ gian phải bị trục xuất khỏi Bảng Xếp Hạng
  const isStillOnLeaderboard = mockRedis.sortedSets.get('levelup:leaderboard')?.has('google_user_sub_101');
  assert.strictEqual(isStillOnLeaderboard, false, 'Kẻ gian lận phải bị xóa sạch khỏi Bảng Xếp Hạng (zrem)');

  // 2. Dữ liệu lưu trong Redis phải ghi nhận án phạt và gắn cờ gian lận
  const savedRaw = await mockRedis.get('levelup:user:google:google_user_sub_101');
  const savedState = JSON.parse(savedRaw);
  assert.strictEqual(savedState.profile.title, 'Kẻ Gian Lận ⚠️');
  assert.strictEqual(savedState.profile.isCheater, true, 'Phải gắn cờ isCheater');
  assert.strictEqual(savedState.profile.cheatStrikes, 1, 'Số lần vi phạm cheatStrikes phải là 1');

  // 3. Sổ cái (Ledger) phải có bản ghi án phạt
  assert.ok(savedState.ledger.length > 0, 'Phải ghi án phạt vào sổ cái');
  assert.match(savedState.ledger[0].description, /ÁN PHẠT ANTI-CHEAT/i, 'Bản ghi sổ cái phải nêu rõ ÁN PHẠT ANTI-CHEAT');

  console.log('✓ Test 11: Hệ thống trừng phạt gian lận thi hành thành công: Phạt Vàng, tước danh hiệu, đuổi khỏi Leaderboard, ghi sổ cái.');
}

// ============================================================
// 12. Kiểm thử: Hướng A - Thử Thách Chuộc Tội (5 phiên tập trung)
// ============================================================
{
  const focusSig = signQuest('Đọc Sách Lập Trình 25p', 'focus', 25, 10);
  const validFocusQuest = {
    id: 'q_redemption_focus',
    title: 'Đọc Sách Lập Trình 25p',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 10,
    isRepeatable: true,
    completedCount: 2, // Đã làm 2 phiên
    signature: focusSig
  };

  // 12.1 Kẻ gian hoàn thành 2 phiên tập trung -> Tiến trình 2/5, chưa được lên Leaderboard
  const partialRedemptionState = {
    profile: {
      nickname: 'HackerPro',
      level: 1,
      totalCoinsEarned: 40,
      coins: 40
    },
    quests: [validFocusQuest],
    inventory: [],
    ledger: []
  };

  const { req: req1, res: res1 } = createMockReqRes(
    'POST',
    {
      nickname: 'HackerPro',
      token: 'valid_session_token_xyz',
      state: partialRedemptionState
    },
    {},
    { authorization: 'Bearer valid_session_token_xyz' }
  );

  await syncHandler(req1, res1);

  assert.strictEqual(res1.statusCode, 200);
  assert.strictEqual(res1.body.title, 'Đang Chuộc Tội (2/5) ⏳', 'Danh hiệu phải thể hiện tiến độ chuộc tội');
  assert.strictEqual(res1.body.isCheater, true, 'Vẫn còn trong diện cấm');
  assert.strictEqual(mockRedis.sortedSets.get('levelup:leaderboard')?.has('google_user_sub_101'), false, 'Chưa được lên Leaderboard');

  // 12.2 Kẻ gian hoàn thành thêm 3 phiên nữa (Tổng 5 phiên) -> Chuộc tội thành công!
  const fullFocusQuest = { ...validFocusQuest, completedCount: 5 };
  const fullRedemptionState = {
    ...partialRedemptionState,
    profile: {
      ...partialRedemptionState.profile,
      totalCoinsEarned: 70,
      coins: 70
    },
    quests: [fullFocusQuest]
  };

  const { req: req2, res: res2 } = createMockReqRes(
    'POST',
    {
      nickname: 'HackerPro',
      token: 'valid_session_token_xyz',
      state: fullRedemptionState
    },
    {},
    { authorization: 'Bearer valid_session_token_xyz' }
  );

  await syncHandler(req2, res2);

  assert.strictEqual(res2.statusCode, 200);
  assert.strictEqual(res2.body.redeemed, true, 'Phải đánh dấu chuộc tội thành công');
  assert.strictEqual(res2.body.isCheater, false, 'Cờ isCheater phải được gỡ bỏ');
  assert.strictEqual(res2.body.title, 'Tân Binh Cấp 1', 'Danh hiệu hiệp sĩ phải được khôi phục');
  assert.strictEqual(mockRedis.sortedSets.get('levelup:leaderboard')?.has('google_user_sub_101'), true, 'Được đưa trở lại Bảng Xếp Hạng');
  console.log('✓ Test 12: Thử Thách Chuộc Tội (Hướng A) hoạt động hoàn hảo: Hoàn thành 5 phiên tập trung gỡ cờ gian lận, phục hồi Leaderboard.');
}

// ============================================================
// 13. Kiểm thử: Hướng B - Quản Trị Viên Ân Xá (Admin Pardon)
// ============================================================
{
  // 13.1 Giả lập user bị mark kẻ gian lận trở lại
  const userKey = 'levelup:user:google:google_user_sub_101';
  const badState = {
    profile: {
      nickname: 'HackerPro',
      level: 3,
      isCheater: true,
      cheatStrikes: 2,
      title: 'Kẻ Gian Lận ⚠️',
      totalCoinsEarned: 100
    },
    ledger: []
  };
  await mockRedis.set(userKey, JSON.stringify(badState));
  await mockRedis.zrem('levelup:leaderboard', 'google_user_sub_101');

  // 13.2 Người dùng thường cố gọi admin_pardon -> Bị chặn 403
  const { req: nonAdminReq, res: nonAdminRes } = createMockReqRes(
    'POST',
    { targetSub: 'google_user_sub_101' },
    { action: 'admin_pardon' },
    { authorization: 'Bearer valid_session_token_xyz' }
  );
  await syncHandler(nonAdminReq, nonAdminRes);
  assert.strictEqual(nonAdminRes.statusCode, 403, 'User thường không thể tự ân xá cho mình');

  // 13.3 Quản trị viên (Admin) gọi admin_pardon -> Thành công 200
  process.env.ADMIN_EMAILS = 'admin_official@gmail.com';
  const { req: adminReq, res: adminRes } = createMockReqRes(
    'POST',
    { targetSub: 'google_user_sub_101' },
    { action: 'admin_pardon' },
    { authorization: 'Bearer valid_admin_token' }
  );
  await syncHandler(adminReq, adminRes);
  assert.strictEqual(adminRes.statusCode, 200, 'Admin ân xá thành công');
  assert.strictEqual(adminRes.body.success, true);

  // Kiểm tra tài khoản sau khi Admin ân xá
  const pardonedRaw = await mockRedis.get(userKey);
  const pardonedState = JSON.parse(pardonedRaw);
  assert.strictEqual(pardonedState.profile.isCheater, false, 'Cờ gian lận đã được Admin xóa');
  assert.strictEqual(pardonedState.profile.cheatStrikes, 0, 'Điểm vi phạm được xóa về 0');
  assert.strictEqual(pardonedState.profile.title, 'Học Viên Chăm Chỉ', 'Danh hiệu cấp 3 phục hồi');
  assert.strictEqual(mockRedis.sortedSets.get('levelup:leaderboard')?.has('google_user_sub_101'), true, 'Đã được Admin đưa lại Leaderboard');
  console.log('✓ Test 13: Quản Trị Viên Ân Xá (Hướng B) hoạt động chuẩn xác: Phân quyền bảo mật 403, xóa án phạt, phục hồi danh dự ngay lập tức.');
}

console.log('\n🎉 TẤT CẢ 13/13 BẢN VÁ BẢO MẬT & CƠ CHẾ CHUỘC TỘI/ÂN XÁ ĐÃ HOÀN TẤT XUẤT SẮC!\n');
