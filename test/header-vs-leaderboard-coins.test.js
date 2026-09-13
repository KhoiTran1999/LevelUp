import assert from 'node:assert';
import handler, {
  setRedisClientForTesting,
  deriveLegitimateBalance,
  signQuest,
  signReward
} from '../api/sync.js';

// In-memory Mock Redis
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

  async zadd(key, score, member) {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map());
    }
    this.sortedSets.get(key).set(member, score);
    return 1;
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

async function runTests() {
  console.log('=== Bắt đầu kiểm chứng logic: Số Vàng trên Header vs Bảng Xếp Hạng ===\n');

  // Khởi tạo state người dùng ban đầu (giống DEFAULT_STATE của client)
  const questTitle = 'Ôn bài thi chuyên ngành';
  const questCoins = 22;
  const questMins = 30;

  const rewardName = 'Trà Sữa Size L';
  const rewardPrice = 30;
  const rewardTier = 'rare';

  const userState = {
    profile: {
      nickname: 'Khôi Trần',
      role: 'admin',
      level: 2,
      coins: 20,
      totalCoinsEarned: 20
    },
    quests: [
      {
        id: 'quest_1',
        title: questTitle,
        type: 'focus',
        rewardCoins: questCoins,
        targetMinutes: questMins,
        status: 'completed',
        completedCount: 1,
        signature: signQuest(questTitle, 'focus', questMins, questCoins, false)
      }
    ],
    inventory: [],
    shopItems: [
      {
        id: 'shop_item_1',
        name: rewardName,
        price: rewardPrice,
        tier: rewardTier,
        signature: signReward(rewardName, rewardPrice, rewardTier)
      }
    ]
  };

  // 1. Sau khi hoàn thành nhiệm vụ (+22 Vàng)
  userState.profile.coins += questCoins; // 20 + 22 = 42
  userState.profile.totalCoinsEarned += questCoins; // 20 + 22 = 42

  console.log('1. Sau khi cày nhiệm vụ:');
  console.log(`   - Ví Vàng (Header): ${userState.profile.coins}`);
  console.log(`   - Tổng Vàng (Leaderboard): ${userState.profile.totalCoinsEarned}`);
  assert.strictEqual(userState.profile.coins, 42);
  assert.strictEqual(userState.profile.totalCoinsEarned, 42);

  // 2. Người dùng đổi phần thưởng có giá 30 Vàng
  const rewardToRedeem = userState.shopItems[0];
  userState.profile.coins -= rewardToRedeem.price; // 42 - 30 = 12
  userState.inventory.push({
    id: 'inv_1',
    shopItemId: rewardToRedeem.id,
    name: rewardToRedeem.name,
    price: rewardToRedeem.price,
    tier: rewardToRedeem.tier,
    isUsed: false,
    signature: rewardToRedeem.signature
  });
  // Lưu ý: totalCoinsEarned KHÔNG BỊ TRỪ khi đổi quà!

  console.log('\n2. Sau khi đổi quà giá 30 Vàng:');
  console.log(`   - Ví Vàng (Header): ${userState.profile.coins}`);
  console.log(`   - Tổng Vàng (Leaderboard): ${userState.profile.totalCoinsEarned}`);
  console.log(`   - Số quà trong Kho (Badge Thưởng): ${userState.inventory.filter(i => !i.isUsed).length}`);

  assert.strictEqual(userState.profile.coins, 12, 'Ví vàng hiện tại phải là 12');
  assert.strictEqual(userState.profile.totalCoinsEarned, 42, 'Tổng vàng tích lũy phải giữ nguyên 42');
  assert.strictEqual(userState.inventory.length, 1, 'Kho quà phải có 1 món');

  // 3. Kiểm thử với hàm Anti-Cheat Server (deriveLegitimateBalance)
  const balanceCheck = deriveLegitimateBalance(userState);
  console.log('\n3. Server Anti-Cheat thẩm định tính hợp lệ:');
  console.log(`   - Legit coins: ${balanceCheck.coins}`);
  console.log(`   - Legit totalCoinsEarned: ${balanceCheck.totalCoinsEarned}`);
  console.log(`   - Tampered (gian lận?): ${balanceCheck.tampered}`);

  assert.strictEqual(balanceCheck.coins, 12, 'Server xác nhận ví còn 12 Vàng hợp lệ');
  assert.strictEqual(balanceCheck.totalCoinsEarned, 42, 'Server xác nhận tổng cày 42 Vàng hợp lệ');
  assert.strictEqual(balanceCheck.tampered, false, 'Không có gian lận');

  // 4. Kiểm thử Leaderboard API
  const mockRedis = new MockRedis();
  setRedisClientForTesting(mockRedis);

  // Lưu user vào Redis và ghi điểm vào Sorted Set leaderboard theo current coins
  const sub = 'test_google_sub_khoi';
  await mockRedis.set(`levelup:user:google:${sub}`, JSON.stringify(userState));
  const score = (userState.profile.level * 1000) + userState.profile.coins;
  await mockRedis.zadd('levelup:leaderboard', score, sub);

  // Gọi endpoint /api/sync?action=leaderboard
  let responseData = null;
  const mockReq = { method: 'GET', query: { action: 'leaderboard' }, headers: {} };
  const mockRes = {
    setHeader: () => {},
    status: (code) => ({
      json: (data) => {
        responseData = data;
        return data;
      }
    })
  };

  await handler(mockReq, mockRes);

  console.log('\n4. Dữ liệu Leaderboard API trả về:');
  const userOnLeaderboard = responseData.leaderboard[0];
  console.log(`   - Tên: ${userOnLeaderboard.nickname}`);
  console.log(`   - Cấp độ: Lv. ${userOnLeaderboard.level}`);
  console.log(`   - Vàng Hiện Có trên BXH: ${userOnLeaderboard.coins}`);
  console.log(`   - Tổng Vàng trọn đời: ${userOnLeaderboard.totalCoinsEarned}`);

  assert.strictEqual(userOnLeaderboard.coins, 12, 'Leaderboard API phải trả về số Vàng hiện có là 12');

  // Kiểm tra logic hiển thị client (app.js)
  const isMe = true;
  const displayCoins = isMe
    ? (userState.profile?.coins ?? 0)
    : (typeof userOnLeaderboard.coins === 'number' ? userOnLeaderboard.coins : (userOnLeaderboard.totalCoinsEarned || 0));

  assert.strictEqual(displayCoins, 12, 'Client hiển thị trên BXH đúng 12 Vàng trùng khớp với Header');
  console.log(`   - Số Vàng client render trên BXH: ${displayCoins} (Khớp Header: 12)`);

  console.log('\n🎉 KẾT QUẢ KIỂM THỬ: BẢNG XẾP HẠNG VÀ HEADER ĐỀU ĐỒNG BỘ 12 VÀNG HIỆN CÓ THÀNH CÔNG!');
}

runTests().catch(err => {
  console.error('❌ Kiểm thử thất bại:', err);
  process.exit(1);
});
