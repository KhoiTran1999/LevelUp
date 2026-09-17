import assert from 'node:assert';
import handler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  deriveLegitimateBalance,
  signQuest,
  signReward
} from '../api/sync.js';

console.log('=== Bắt đầu kiểm thử: Tối Ưu Hóa Dữ Liệu Lịch Sử & Gia Cố Bảo Mật Hệ Thống ===\n');

// Mock Redis
class MockRedis {
  constructor() {
    this.store = new Map();
    this.sortedSets = new Map();
  }
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
    if (!this.sortedSets.has(key)) this.sortedSets.set(key, new Map());
    this.sortedSets.get(key).set(member, score);
    return 1;
  }
  async zrem(key, member) {
    const s = this.sortedSets.get(key);
    return s ? (s.delete(member) ? 1 : 0) : 0;
  }
  async sadd() { return 1; }
}

const mockRedis = new MockRedis();
setRedisClientForTesting(mockRedis);

setGoogleTokenVerifierForTesting(async (token) => {
  if (token) {
    return {
      sub: 'google_user_' + token,
      email: token + '@gmail.com',
      name: 'HeroTester',
      picture: 'https://avatar.png'
    };
  }
  return null;
});

// 1. Kiểm thử Cửa Sổ Trượt (Rolling Window): Quests và Inventory
{
  const activeQuests = [
    { id: 'q_act_1', title: 'Quest Active 1', type: 'focus', targetMinutes: 25, rewardCoins: 10, status: 'active', signature: signQuest('Quest Active 1', 'focus', 25, 10) },
    { id: 'q_act_2', title: 'Quest Active 2', type: 'bounty', targetMinutes: 0, rewardCoins: 5, status: 'active', signature: signQuest('Quest Active 2', 'bounty', 0, 5) }
  ];

  const completedQuests = [];
  for (let i = 1; i <= 50; i++) {
    completedQuests.push({
      id: `q_comp_${i}`,
      title: `Quest Completed ${i}`,
      type: 'bounty',
      targetMinutes: 0,
      rewardCoins: 5,
      status: 'completed',
      completedAt: 1000 + i,
      signature: signQuest(`Quest Completed ${i}`, 'bounty', 0, 5)
    });
  }

  const unusedItems = [
    { id: 'inv_unused_1', name: 'Unused Coffee', price: 20, tier: 'common', isUsed: false, signature: signReward('Unused Coffee', 20, 'common') }
  ];

  const usedItems = [];
  for (let i = 1; i <= 40; i++) {
    usedItems.push({
      id: `inv_used_${i}`,
      name: `Used Item ${i}`,
      price: 20,
      tier: 'common',
      isUsed: true,
      usedAt: 2000 + i,
      signature: signReward(`Used Item ${i}`, 20, 'common')
    });
  }

  const req = {
    method: 'POST',
    headers: {
      authorization: 'Bearer valid_token_tester_123456'
    },
    body: {
      nickname: 'HeroTester',
      token: 'valid_token_tester_123456',
      state: {
        profile: {
          nickname: 'HeroTester',
          coins: 50,
          totalCoinsEarned: 300,
          level: 2,
          totalCoinsSpent: 800
        },
        quests: [...activeQuests, ...completedQuests],
        inventory: [...unusedItems, ...usedItems],
        ledger: []
      }
    }
  };

  let resData = null;
  const res = {
    setHeader: () => res,
    status: (code) => ({
      json: (data) => {
        resData = { code, data };
        return resData;
      }
    })
  };

  await handler(req, res);
  assert.strictEqual(resData.code, 200, 'Sync phải thành công HTTP 200');

  const savedJson = await mockRedis.get('levelup:user:google:google_user_valid_token_tester_123456');
  assert.ok(savedJson, 'Dữ liệu phải được lưu vào Redis');
  const savedState = JSON.parse(savedJson);

  // Kiểm tra Quests
  const savedActiveQuests = savedState.quests.filter(q => q.status !== 'completed');
  const savedCompletedQuests = savedState.quests.filter(q => q.status === 'completed');
  assert.strictEqual(savedActiveQuests.length, 2, 'Active quests phải được bảo toàn 100%');
  assert.strictEqual(savedCompletedQuests.length, 30, 'Completed quests phải được giới hạn tối đa đúng 30 bản ghi gần nhất');
  assert.strictEqual(savedCompletedQuests[0].id, 'q_comp_50', 'Completed quest mới nhất phải đứng đầu');

  // Kiểm tra Inventory
  const savedUnused = savedState.inventory.filter(i => !i.isUsed);
  const savedUsed = savedState.inventory.filter(i => i.isUsed);
  assert.strictEqual(savedUnused.length, 1, 'Unused inventory phải được bảo toàn 100%');
  assert.strictEqual(savedUsed.length, 20, 'Used inventory phải được giới hạn tối đa đúng 20 bản ghi gần nhất');
  assert.strictEqual(savedUsed[0].id, 'inv_used_40', 'Used item mới nhất phải đứng đầu');

  console.log('✓ Test 1: Rolling window giữ 100% active/unused data và cắt gọn đúng 30 completed quests, 20 used items.');
}

// 2. Kiểm thử Lỗ hổng 1: Chống Hack Hoàn Tiền (Fake Refund Exploit) khi xóa inventory
{
  const stateWithPrunedInventory = {
    profile: {
      coins: 100, // Kẻ gian cố tình gán lại 100 Vàng sau khi đã mua đồ
      totalCoinsEarned: 100,
      totalCoinsSpent: 40 // Đã từng tiêu 40 Vàng cho quà
    },
    quests: [],
    inventory: [], // Kho đồ đã được dọn sạch các món đã dùng (inventory = [])
    ledger: []
  };

  const existingState = {
    profile: {
      coins: 60,
      totalCoinsEarned: 100,
      totalCoinsSpent: 40
    }
  };

  const check = deriveLegitimateBalance(stateWithPrunedInventory, existingState);
  assert.strictEqual(check.tampered, true, 'Phải bắt quả tang hành vi hack số dư khi đã tiêu tiền');
  assert.strictEqual(check.coins, 0, 'Phải bị xử phạt tịch thu Vàng về 0');
  assert.strictEqual(check.title, 'Kẻ Gian Lận ⚠️');

  console.log('✓ Test 2: Chặn đứng hoàn toàn lỗ hổng Hack Hoàn Tiền (Fake Refund) khi inventory bị cắt tỉa.');
}

// 3. Kiểm thử Lỗ hổng 2: Chống Tấn Công Phát Lại (Replay Attack) hoàn thành lại quest 1 lần
{
  const oneTimeQuestSig = signQuest('Nhiệm vụ S-Rank đặc biệt', 'focus', 25, 40);
  const replayedQuest = {
    id: 'q_special_replay',
    title: 'Nhiệm vụ S-Rank đặc biệt',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 40,
    status: 'active', // Kẻ gian cố tình gửi lại quest cũ với status 'active'
    isRepeatable: false,
    signature: oneTimeQuestSig
  };

  const existingState = {
    completedQuestIds: ['q_special_replay'], // Đã từng hoàn thành trong quá khứ
    profile: {
      nickname: 'ReplayHacker',
      coins: 40,
      totalCoinsEarned: 60,
      level: 2
    },
    quests: [],
    inventory: [],
    ledger: []
  };

  const req = {
    method: 'POST',
    headers: {
      authorization: 'Bearer hacker_token_replay_789'
    },
    body: {
      nickname: 'ReplayHacker',
      token: 'hacker_token_replay_789',
      state: {
        profile: {
          nickname: 'ReplayHacker',
          coins: 40,
          totalCoinsEarned: 60,
          level: 2
        },
        quests: [replayedQuest],
        inventory: [],
        ledger: []
      }
    }
  };

  await mockRedis.set('levelup:user:google:google_user_hacker_token_replay_789', JSON.stringify(existingState));

  let resData = null;
  const res = {
    setHeader: () => res,
    status: (code) => ({
      json: (data) => {
        resData = { code, data };
        return resData;
      }
    })
  };

  await handler(req, res);
  const savedJson = await mockRedis.get('levelup:user:google:google_user_hacker_token_replay_789');
  const savedState = JSON.parse(savedJson);

  const questInDb = savedState.quests.find(q => q.id === 'q_special_replay');
  assert.strictEqual(questInDb.status, 'completed', 'Nhiệm vụ 1 lần đã có trong completedQuestIds phải tự động chuyển thành completed');
  console.log('✓ Test 3: Chặn đứng tấn công phát lại (Replay Attack), bảo vệ tính duy nhất của nhiệm vụ 1 lần.');
}

// 4. Kiểm thử Nguy cơ 3: Chống Phạt Oan (False Positive) khi Cold Start / Cache Expired
{
  // User chơi 6 tháng, đã làm 100 quest, tổng kiếm được 2000 Vàng.
  // Quests đã được cắt gọt còn 30 quest (tổng 300 Vàng).
  // Cache Redis bị xóa / hết hạn (existingState = null).
  const completedIds = [];
  for (let i = 1; i <= 100; i++) completedIds.push(`q_old_${i}`);

  const remainingQuests = [];
  for (let i = 1; i <= 30; i++) {
    remainingQuests.push({
      id: `q_old_${i}`,
      title: `Quest Old ${i}`,
      type: 'bounty',
      targetMinutes: 0,
      rewardCoins: 10,
      status: 'completed',
      signature: signQuest(`Quest Old ${i}`, 'bounty', 0, 10)
    });
  }

  const coldStartState = {
    profile: {
      coins: 500,
      totalCoinsEarned: 2000,
      level: 10,
      totalCoinsSpent: 1500
    },
    quests: remainingQuests,
    completedQuestIds: completedIds,
    inventory: [],
    ledger: []
  };

  const check = deriveLegitimateBalance(coldStartState, null);
  assert.strictEqual(check.tampered, false, 'User trung thực sau khi rolling window không được bị phạt oan');
  assert.strictEqual(check.coins, 500, 'Số Vàng hợp lệ được bảo toàn');
  assert.notStrictEqual(check.title, 'Kẻ Gian Lận ⚠️', 'Không bị gán nhãn gian lận');
  console.log('✓ Test 4: Chống phạt oan tuyệt đối khi Cold Start / Cache Expired sau khi cắt gọt lịch sử.');
}

// 5. Kiểm thử Lỗi logic 4: Chuộc tội (Redemption) không bị kẹt khi quest hoàn thành bị dọn dẹp
{
  const cheaterToken = 'cheater_user_redeem_123';
  const cheaterState = {
    profile: {
      nickname: 'CheaterHero',
      isCheater: true,
      cheatStrikes: 1,
      title: 'Kẻ Gian Lận ⚠️',
      redemptionBaseline: 0,
      cheatedAt: Date.now() - 10 * 3600 * 1000, // 10 tiếng trước
      totalFocusSessions: 3, // Đã hoàn thành 3 phiên trước đó
      coins: 0,
      totalCoinsEarned: 100,
      level: 1
    },
    quests: [], // Các quest focus 25p cũ đã bị cắt dọn sạch khỏi mảng quests
    inventory: [],
    ledger: []
  };

  await mockRedis.set(`levelup:user:google:google_user_${cheaterToken}`, JSON.stringify(cheaterState));

  // Giờ user hoàn thành thêm 2 phiên focus 25p nữa (tổng 3 + 2 = 5 phiên -> ĐỦ ĐIỀU KIỆN CHUỘC TỘI)
  const qNew1Sig = signQuest('Focus Session 4', 'focus', 25, 10);
  const qNew2Sig = signQuest('Focus Session 5', 'focus', 25, 10);

  const req = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${cheaterToken}`
    },
    body: {
      nickname: 'CheaterHero',
      token: cheaterToken,
      state: {
        profile: {
          nickname: 'CheaterHero',
          isCheater: true,
          title: 'Đang Chuộc Tội (3/5) ⏳',
          totalFocusSessions: 5,
          coins: 20,
          totalCoinsEarned: 120,
          level: 1
        },
        quests: [
          { id: 'q_f4', title: 'Focus Session 4', type: 'focus', targetMinutes: 25, rewardCoins: 10, status: 'completed', signature: qNew1Sig },
          { id: 'q_f5', title: 'Focus Session 5', type: 'focus', targetMinutes: 25, rewardCoins: 10, status: 'completed', signature: qNew2Sig }
        ],
        inventory: [],
        ledger: []
      }
    }
  };

  let resData = null;
  const res = {
    setHeader: () => res,
    status: (code) => ({
      json: (data) => {
        resData = { code, data };
        return resData;
      }
    })
  };

  await handler(req, res);
  assert.strictEqual(resData.code, 200);
  assert.strictEqual(resData.data.redeemed, true, 'User phải hoàn tất chuộc tội thành công');
  assert.strictEqual(resData.data.isCheater, false, 'Không còn là Kẻ Gian Lận');

  const savedJson = await mockRedis.get(`levelup:user:google:google_user_${cheaterToken}`);
  const savedState = JSON.parse(savedJson);
  assert.strictEqual(savedState.profile.isCheater, false);
  assert.strictEqual(savedState.profile.title, 'Tân Binh Cấp 1');

  console.log('✓ Test 5: Chuộc tội thành công 5/5 phiên, không bị gián đoạn hay kẹt tiến trình khi quest cũ bị dọn dẹp.');
}

console.log('\n🎉 TẤT CẢ 5/5 BỘ KIỂM THỬ TỐI ƯU HÓA & GIA CỐ BẢO MẬT ĐÃ VƯỢT QUA XUẤT SẮC!');
